import { useState, useEffect, useRef, useMemo } from 'react';
import {
  fetchInventory, createPurchaseRequisition, updateInventoryBatch, addInventoryItem,
  recordStockIssue, updateInventoryItem,
  type InventoryItem, type PurchaseRequisitionItem, type NewInventoryItem,
} from '../lib/api';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface MovementEntry {
  id: string;
  ts: string;
  type: 'in' | 'out';
  item_name: string;
  qty: number;
  unit: string;
  batch?: string;
  reason?: string;
}

interface ParsedItem {
  raw_name: string;
  quantity: number;
  unit?: string;
  matched: InventoryItem | null;
  apply: boolean;
}

interface BulkRow {
  idx: number;
  name: string;
  category: string;
  unit: string;
  qty: number;
  threshold: number;
  supplier: string;
  batch_no: string;
  expiry: string;
  errors: string[];
  existing: InventoryItem | null;
  include: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stockStatus(item: InventoryItem): { label: string; color: string; dot: string } {
  if (item.qty_on_hand <= 0)
    return { label: 'OUT OF STOCK', color: 'text-error', dot: 'bg-error' };
  if (item.qty_on_hand <= item.reorder_threshold)
    return { label: 'LOW STOCK', color: 'text-orange-600', dot: 'bg-orange-500 animate-pulse' };
  return { label: 'OPTIMAL', color: 'text-[#0D9460]', dot: 'bg-[#17A077]' };
}

function expiryBadge(expiry: string | null): { text: string; cls: string } {
  if (!expiry) return { text: '—', cls: 'text-on-surface-variant' };
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { text: expiry, cls: 'bg-error text-on-error px-2 py-0.5 rounded-full text-[10px] font-bold' };
  if (days < 90) return { text: expiry, cls: 'bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold' };
  return { text: expiry, cls: 'text-on-surface-variant' };
}

function fuzzyMatch(raw: string, items: InventoryItem[]): InventoryItem | null {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const rawN = norm(raw);
  const exact = items.find(i => norm(i.name) === rawN);
  if (exact) return exact;
  const contains = items.find(i => { const n = norm(i.name); return rawN.includes(n) || n.includes(rawN); });
  if (contains) return contains;
  const rawWords = rawN.split(/\s+/).filter(w => w.length > 2);
  let best: InventoryItem | null = null;
  let bestScore = 0;
  for (const i of items) {
    const iWords = norm(i.name).split(/\s+/).filter(w => w.length > 2);
    const overlap = rawWords.filter(w => iWords.includes(w)).length;
    const score = overlap / Math.max(rawWords.length, iWords.length, 1);
    if (score > bestScore && score >= 0.4) { bestScore = score; best = i; }
  }
  return best;
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function toCSV(items: InventoryItem[]): string {
  const header = 'Name,Category,Unit,Qty On Hand,Reorder Threshold,Batch No,Expiry,Supplier,Status';
  const rows = items.map(i => {
    const st = stockStatus(i).label;
    return [i.name, i.category, i.unit, i.qty_on_hand, i.reorder_threshold,
      i.batch_no ?? '', i.expiry ?? '', i.supplier ?? '', st]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
  });
  return [header, ...rows].join('\n');
}

const VALID_CATEGORIES = ['Reagent','Consumable','Equipment','PPE','Chemical','Control','Calibrator','Other'];

const BULK_TEMPLATE_CSV = [
  'name,category,unit,qty_on_hand,reorder_threshold,supplier,batch_no,expiry',
  'CBC Reagent Kit,Reagent,kits,10,5,Sysmex India Pvt Ltd,LOT-2025A,2026-12-31',
  'Dengue NS1 Rapid Strips,Reagent,strips,50,20,J. Mitra & Co.,BATCH-2025B,2026-06-30',
  'Disposable Gloves (L),PPE,pairs,200,50,Ansell Healthcare,,',
  'Haematology Control (Normal),Control,vials,6,3,Bio-Rad Laboratories,CTL-N-2025,2025-11-30',
  'Ethyl Alcohol 70%,Chemical,litres,10,5,Merck India,,',
  'Micropipette Tips 1000uL,Consumable,boxes,30,10,Tarsons Products,,',
  'Urine Dipstick 10-Parameter,Reagent,strips,100,25,Erba Mannheim,,2026-09-30',
].join('\n');

function parseCSVLine(line: string): string[] {
  const vals: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  vals.push(cur.trim());
  return vals;
}

function parseBulkCSVText(text: string, existingItems: InventoryItem[]): BulkRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];

  const raw_headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'));

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  function matchExisting(name: string): InventoryItem | null {
    const n = norm(name);
    return existingItems.find(i => norm(i.name) === n) ?? null;
  }

  return lines.slice(1).filter(l => l.trim()).map((line, idx) => {
    const vals = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));
    const get = (key: string) => (vals[raw_headers.indexOf(key)] ?? '').trim();

    const name      = get('name');
    const category  = get('category') || 'Reagent';
    const unit      = get('unit');
    const qtyRaw    = get('qty_on_hand');
    const thrRaw    = get('reorder_threshold');
    const supplier  = get('supplier');
    const batch_no  = get('batch_no');
    const expiry    = get('expiry');

    const qty       = parseFloat(qtyRaw);
    const threshold = parseFloat(thrRaw);

    const errors: string[] = [];
    if (!name)                         errors.push('Name is required');
    if (!unit)                         errors.push('Unit is required');
    if (qtyRaw && isNaN(qty))          errors.push('qty_on_hand must be a number');
    if (thrRaw && isNaN(threshold))    errors.push('reorder_threshold must be a number');
    if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) errors.push('Expiry must be YYYY-MM-DD');
    if (category && !VALID_CATEGORIES.includes(category)) errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);

    return {
      idx,
      name,
      category: VALID_CATEGORIES.includes(category) ? category : 'Reagent',
      unit,
      qty: isNaN(qty) ? 0 : Math.max(0, qty),
      threshold: isNaN(threshold) ? 10 : Math.max(0, threshold),
      supplier,
      batch_no,
      expiry,
      errors,
      existing: name ? matchExisting(name) : null,
      include: errors.length === 0,
    } as BulkRow;
  });
}

const BLANK_ITEM: NewInventoryItem = {
  name: '', category: 'Reagent', unit: 'units', qty_on_hand: 0,
  reorder_threshold: 10, batch_no: '', expiry: '', supplier: '',
};

const ISSUE_REASONS = [
  { value: 'consumption', label: 'Test Consumption' },
  { value: 'damage',      label: 'Damaged / Broken' },
  { value: 'expired',     label: 'Expired — Disposed' },
  { value: 'spillage',    label: 'Spillage / Wastage' },
  { value: 'qc',          label: 'QC Run' },
  { value: 'other',       label: 'Other' },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function InventoryManager() {
  const { user } = useAuth();

  // core data
  const [items, setItems]     = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // search / filter
  const [search, setSearch]             = useState('');
  const [catFilter, setCatFilter]       = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all'|'optimal'|'low'|'out'>('all');

  // toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  // in-memory movement log
  const movementLog = useRef<MovementEntry[]>([]);
  const [logVersion, setLogVersion] = useState(0);
  const [showLog, setShowLog]       = useState(false);

  function pushMovement(entry: Omit<MovementEntry, 'id' | 'ts'>) {
    movementLog.current.unshift({ ...entry, id: crypto.randomUUID(), ts: new Date().toISOString() });
    setLogVersion(v => v + 1);
  }

  // add item modal
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState<NewInventoryItem>(BLANK_ITEM);
  const [addBusy, setAddBusy]   = useState(false);

  // scan batch modal
  const [showScan, setShowScan]       = useState(false);
  const [scanItemId, setScanItemId]   = useState('');
  const [scanBatchNo, setScanBatchNo] = useState('');
  const [scanQty, setScanQty]         = useState(1);
  const [scanExpiry, setScanExpiry]   = useState('');
  const [scanBusy, setScanBusy]       = useState(false);

  // purchase order modal
  const [showOrder, setShowOrder]   = useState(false);
  const [orderItems, setOrderItems] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // record issue modal
  const [showIssue, setShowIssue]     = useState(false);
  const [issueItemId, setIssueItemId] = useState('');
  const [issueQty, setIssueQty]       = useState(1);
  const [issueReason, setIssueReason] = useState('consumption');
  const [issueNotes, setIssueNotes]   = useState('');
  const [issueBusy, setIssueBusy]     = useState(false);

  // invoice upload modal
  const [showInvoice, setShowInvoice]             = useState(false);
  const [invoiceFile, setInvoiceFile]             = useState<File | null>(null);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);
  const [invoiceParsing, setInvoiceParsing]       = useState(false);
  const [invoiceError, setInvoiceError]           = useState<string | null>(null);
  const [invoiceParsed, setInvoiceParsed]         = useState<ParsedItem[]>([]);
  const [invoiceApplying, setInvoiceApplying]     = useState(false);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

  // bulk upload modal
  const [showBulk, setShowBulk]           = useState(false);
  const [bulkRows, setBulkRows]           = useState<BulkRow[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress]   = useState(0);
  const [bulkResult, setBulkResult]       = useState<{ created: number; updated: number; failed: number } | null>(null);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // inline threshold edit
  const [editingThresh, setEditingThresh] = useState<{ id: string; val: string } | null>(null);
  const [threshBusy, setThreshBusy]       = useState(false);

  // load inventory
  useEffect(() => {
    fetchInventory()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // derived
  const categories = useMemo(
    () => ['all', ...Array.from(new Set(items.map(i => i.category))).sort()],
    [items],
  );

  const filtered = useMemo(() => {
    let r = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        (i.supplier ?? '').toLowerCase().includes(q) ||
        (i.batch_no ?? '').toLowerCase().includes(q),
      );
    }
    if (catFilter !== 'all') r = r.filter(i => i.category === catFilter);
    if (statusFilter === 'out')         r = r.filter(i => i.qty_on_hand <= 0);
    else if (statusFilter === 'low')    r = r.filter(i => i.qty_on_hand > 0 && i.qty_on_hand <= i.reorder_threshold);
    else if (statusFilter === 'optimal') r = r.filter(i => i.qty_on_hand > i.reorder_threshold);
    return r;
  }, [items, search, catFilter, statusFilter]);

  const lowStock     = items.filter(i => i.qty_on_hand > 0 && i.qty_on_hand <= i.reorder_threshold).length;
  const outOfStock   = items.filter(i => i.qty_on_hand <= 0).length;
  const expiringSoon = items.filter(i => {
    if (!i.expiry) return false;
    const d = (new Date(i.expiry).getTime() - Date.now()) / 86_400_000;
    return d >= 0 && d < 90;
  }).length;

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function submitAddItem() {
    if (!addForm.name.trim() || !addForm.unit.trim()) return;
    setAddBusy(true);
    try {
      const created = await addInventoryItem({
        ...addForm,
        batch_no: addForm.batch_no || null,
        expiry:   addForm.expiry   || null,
        supplier: addForm.supplier || null,
      });
      setItems(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
      setAddForm(BLANK_ITEM);
      showToast(`"${created.name}" added to inventory`);
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, false);
    } finally {
      setAddBusy(false);
    }
  }

  function openScanModal() {
    setScanItemId(items[0]?.id ?? '');
    setScanBatchNo(`BATCH-${Date.now().toString().slice(-6)}`);
    setScanQty(1);
    setScanExpiry('');
    setShowScan(true);
  }

  async function submitScan() {
    if (!scanItemId || !scanBatchNo || scanQty < 1) return;
    setScanBusy(true);
    try {
      const updated = await updateInventoryBatch(scanItemId, scanBatchNo, scanQty, scanExpiry || null);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      pushMovement({ type: 'in', item_name: updated.name, qty: scanQty, unit: updated.unit, batch: scanBatchNo });
      setShowScan(false);
      showToast(`Batch recorded — ${updated.name} now has ${updated.qty_on_hand} ${updated.unit}`);
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, false);
    } finally {
      setScanBusy(false);
    }
  }

  function openOrderModal() {
    const defaults: Record<string, number> = {};
    items.filter(i => i.qty_on_hand <= i.reorder_threshold).forEach(i => {
      defaults[i.id] = Math.max(1, i.reorder_threshold * 2 - i.qty_on_hand);
    });
    setOrderItems(defaults);
    setOrderNotes('');
    setShowOrder(true);
  }

  async function submitOrder() {
    const lineItems: PurchaseRequisitionItem[] = Object.entries(orderItems)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = items.find(i => i.id === id)!;
        return {
          inventory_id: item.id, name: item.name, supplier: item.supplier,
          unit: item.unit, qty_on_hand: item.qty_on_hand,
          reorder_threshold: item.reorder_threshold, qty_to_order: qty,
        };
      });
    if (lineItems.length === 0) return;
    setSubmitting(true);
    try {
      const pr = await createPurchaseRequisition(lineItems, orderNotes, user?.userId ?? null);
      setShowOrder(false);
      showToast(`Purchase requisition submitted — ${pr.req_number}`);
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, false);
    } finally {
      setSubmitting(false);
    }
  }

  function openIssueModal(itemId?: string) {
    setIssueItemId(itemId ?? (items[0]?.id ?? ''));
    setIssueQty(1);
    setIssueReason('consumption');
    setIssueNotes('');
    setShowIssue(true);
  }

  async function submitIssue() {
    if (!issueItemId || issueQty < 1) return;
    setIssueBusy(true);
    try {
      const updated = await recordStockIssue(issueItemId, issueQty);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      const reasonLabel = ISSUE_REASONS.find(r => r.value === issueReason)?.label ?? issueReason;
      pushMovement({ type: 'out', item_name: updated.name, qty: issueQty, unit: updated.unit, reason: reasonLabel });
      setShowIssue(false);
      showToast(`Issued ${issueQty} ${updated.unit} of ${updated.name}`);
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, false);
    } finally {
      setIssueBusy(false);
    }
  }

  function handleInvoiceFileSelect(file: File | null) {
    if (!file) return;
    setInvoiceFile(file);
    setInvoiceParsed([]);
    setInvoiceError(null);
    if (file.type.startsWith('image/')) {
      setInvoicePreviewUrl(URL.createObjectURL(file));
    } else {
      setInvoicePreviewUrl(null);
    }
  }

  async function parseInvoice() {
    if (!invoiceFile) return;
    setInvoiceParsing(true);
    setInvoiceError(null);
    try {
      const bytes = await invoiceFile.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));

      const { data, error } = await supabase.functions.invoke('parse-invoice', {
        body: { file_base64: b64, file_type: invoiceFile.type },
      });

      if (error) throw new Error(error.message ?? String(error));
      if (data?.error) throw new Error(data.error as string);

      const rawItems = (data?.items ?? []) as Array<{ name: string; quantity: number; unit?: string }>;
      const parsed: ParsedItem[] = rawItems.map(r => ({
        raw_name: r.name,
        quantity: r.quantity,
        unit: r.unit,
        matched: fuzzyMatch(r.name, items),
        apply: true,
      }));
      setInvoiceParsed(parsed);
    } catch (e: unknown) {
      setInvoiceError((e as Error).message);
    } finally {
      setInvoiceParsing(false);
    }
  }

  async function confirmInvoiceUpdate() {
    const toApply = invoiceParsed.filter(p => p.apply && p.matched);
    if (toApply.length === 0) return;
    setInvoiceApplying(true);
    try {
      const updates = await Promise.all(
        toApply.map(p => updateInventoryBatch(p.matched!.id, `INV-${Date.now()}`, p.quantity, null)),
      );
      setItems(prev => {
        const map = new Map(prev.map(i => [i.id, i]));
        updates.forEach(u => map.set(u.id, u));
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      });
      toApply.forEach(p => {
        pushMovement({ type: 'in', item_name: p.matched!.name, qty: p.quantity, unit: p.matched!.unit, reason: 'Invoice import' });
      });
      setShowInvoice(false);
      setInvoiceFile(null);
      setInvoiceParsed([]);
      showToast(`Updated ${toApply.length} item${toApply.length > 1 ? 's' : ''} from invoice`);
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, false);
    } finally {
      setInvoiceApplying(false);
    }
  }

  async function saveThreshold() {
    if (!editingThresh) return;
    const val = parseInt(editingThresh.val);
    if (isNaN(val) || val < 0) { setEditingThresh(null); return; }
    setThreshBusy(true);
    try {
      const updated = await updateInventoryItem(editingThresh.id, { reorder_threshold: val });
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      setEditingThresh(null);
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`, false);
    } finally {
      setThreshBusy(false);
    }
  }

  function downloadTemplate() {
    const blob = new Blob([BULK_TEMPLATE_CSV], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventory-bulk-upload-template.csv';
    a.click();
  }

  function openBulkModal() {
    setBulkRows([]);
    setBulkResult(null);
    setBulkProgress(0);
    setShowBulk(true);
  }

  function handleBulkFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const text = (e.target?.result as string) ?? '';
      setBulkRows(parseBulkCSVText(text, items));
      setBulkResult(null);
    };
    reader.readAsText(file);
  }

  async function submitBulkUpload() {
    const toProcess = bulkRows.filter(r => r.include && r.errors.length === 0);
    if (toProcess.length === 0) return;
    setBulkUploading(true);
    setBulkProgress(0);
    let created = 0, updated = 0, failed = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const row = toProcess[i];
      try {
        if (row.existing) {
          const up = await updateInventoryBatch(
            row.existing.id,
            row.batch_no || `BULK-${Date.now()}`,
            row.qty,
            row.expiry || null,
          );
          setItems(prev => prev.map(it => it.id === up.id ? up : it));
          pushMovement({ type: 'in', item_name: up.name, qty: row.qty, unit: up.unit, reason: 'Bulk import' });
          updated++;
        } else {
          const created_ = await addInventoryItem({
            name:              row.name,
            category:          row.category,
            unit:              row.unit,
            qty_on_hand:       row.qty,
            reorder_threshold: row.threshold,
            supplier:          row.supplier  || null,
            batch_no:          row.batch_no  || null,
            expiry:            row.expiry    || null,
          });
          setItems(prev => [...prev, created_].sort((a, b) => a.name.localeCompare(b.name)));
          pushMovement({ type: 'in', item_name: created_.name, qty: row.qty, unit: created_.unit, reason: 'Bulk import' });
          created++;
        }
      } catch {
        failed++;
      }
      setBulkProgress(Math.round(((i + 1) / toProcess.length) * 100));
    }

    setBulkResult({ created, updated, failed });
    setBulkUploading(false);
    if (failed === 0) showToast(`Bulk upload done — ${created} created, ${updated} updated`);
    else showToast(`Bulk upload done — ${failed} row(s) failed`, false);
  }

  function exportCSV() {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const logEntries = movementLog.current; // reference used in JSX; logVersion triggers re-render

  return (
    <div className="min-h-screen text-on-surface font-body-md overflow-x-hidden" style={{ background: '#F0F4F7' }}>
      <Sidebar />

      {/* Top App Bar */}
      <header className="fixed top-0 right-0 left-64 h-16 bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant flex items-center justify-between px-lg z-40">
        <div className="flex items-center flex-grow max-w-lg gap-sm">
          <div className="relative flex-grow">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-lg py-1.5 pl-9 pr-md font-body-sm text-on-surface focus:ring-1 focus:ring-[#17A077] focus:border-[#17A077] transition-all outline-none"
              placeholder="Search items, category, supplier…"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-md">
          <button onClick={() => setShowLog(true)}
            className="flex items-center gap-xs px-sm py-1 rounded-lg text-xs text-on-surface-variant border border-outline-variant hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-sm">history</span>
            Movement Log
            {logVersion > 0 && (
              <span className="bg-[#17A077] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{movementLog.current.length}</span>
            )}
          </button>
          <div className="relative">
            <span className="material-symbols-outlined text-on-surface-variant hover:text-[#17A077] cursor-pointer">notifications</span>
            {(lowStock + outOfStock) > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-surface-container-lowest"></span>}
          </div>
          <div className="flex items-center gap-sm border-l border-outline-variant pl-lg">
            <button
              onClick={() => { localStorage.removeItem('diagdesk_session'); window.location.href = '/login'; }}
              className="flex items-center gap-xs px-sm py-xs rounded-lg border border-outline-variant text-on-surface-variant hover:text-error hover:border-error transition-colors text-xs font-medium">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="ml-64 pt-16 pb-8 px-lg">

        {/* Action Bar */}
        <section className="py-lg flex items-end justify-between gap-md flex-wrap">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-surface leading-none">Inventory Matrix</h2>
            <div className="flex items-center gap-md mt-sm">
              <div className="flex items-center gap-xs font-label-md text-[#17A077]">
                <span className="material-symbols-outlined text-xs">sensors</span>
                Live Sync
              </div>
              <div className="h-1 w-1 bg-outline-variant rounded-full"></div>
              <div className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} IST
              </div>
            </div>
          </div>
          <div className="flex gap-sm flex-wrap">
            <button onClick={exportCSV}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface-variant font-label-md px-md py-sm hover:bg-surface-container-low transition-all flex items-center gap-sm rounded-lg text-xs">
              <span className="material-symbols-outlined text-sm">download</span>Export CSV
            </button>
            <button onClick={openBulkModal}
              className="bg-surface-container-lowest border border-purple-400 text-purple-600 font-label-md px-md py-sm hover:bg-purple-50 transition-all flex items-center gap-sm rounded-lg text-xs">
              <span className="material-symbols-outlined text-sm">table_view</span>Bulk Upload
            </button>
            <button onClick={() => { setAddForm(BLANK_ITEM); setShowAdd(true); }}
              className="bg-surface-container-lowest border border-outline-variant text-on-surface-variant font-label-md px-md py-sm hover:bg-surface-container-low transition-all flex items-center gap-sm rounded-lg text-xs">
              <span className="material-symbols-outlined text-sm">add_circle</span>Add Item
            </button>
            <button onClick={() => { setShowInvoice(true); setInvoiceFile(null); setInvoiceParsed([]); setInvoiceError(null); setInvoicePreviewUrl(null); }}
              className="bg-surface-container-lowest border border-[#17A077] text-[#17A077] font-label-md px-md py-sm hover:bg-[#17A077]/5 transition-all flex items-center gap-sm rounded-lg text-xs">
              <span className="material-symbols-outlined text-sm">upload_file</span>Upload Invoice
            </button>
            <button onClick={openScanModal}
              className="bg-surface-container-lowest border border-[#17A077] text-[#17A077] font-label-md px-md py-sm hover:bg-[#17A077]/5 transition-all flex items-center gap-sm rounded-lg text-xs">
              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>Scan Batch
            </button>
            <button onClick={() => openIssueModal()}
              className="bg-surface-container-lowest border border-orange-400 text-orange-600 font-label-md px-md py-sm hover:bg-orange-50 transition-all flex items-center gap-sm rounded-lg text-xs">
              <span className="material-symbols-outlined text-sm">remove_circle</span>Record Issue
            </button>
            <button onClick={openOrderModal}
              className="font-label-md px-md py-sm transition-all flex items-center gap-sm rounded-lg shadow-lg text-white text-xs"
              style={{ background: '#17A077', boxShadow: '0 4px 14px rgba(23,160,119,0.35)' }}>
              <span className="material-symbols-outlined text-sm">shopping_cart_checkout</span>Generate Order
            </button>
          </div>
        </section>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-md mb-md">
          {([
            { label: 'Active SKUs',    value: items.length,   icon: 'inventory',    color: '#17A077', sub: `${items.filter(i => i.category === 'Reagent' || i.category === 'reagent').length} reagent kits`, filter: null as 'all'|'optimal'|'low'|'out'|null },
            { label: 'Low Stock',      value: lowStock,       icon: 'warning',      color: '#EA8C00', sub: 'Below reorder threshold', filter: 'low' as const },
            { label: 'Out of Stock',   value: outOfStock,     icon: 'block',        color: '#B00020', sub: 'Zero quantity items',     filter: 'out' as const },
            { label: 'Expiring < 90d', value: expiringSoon,   icon: 'timer',        color: '#B00020', sub: 'Require immediate action', filter: null as null },
          ] as const).map(card => (
            <div key={card.label}
              className={`glass-panel p-md relative overflow-hidden rounded-xl ${card.filter ? 'cursor-pointer hover:ring-2 hover:ring-[#17A077]/30' : ''}`}
              onClick={() => card.filter && setStatusFilter(card.filter)}>
              <div className="absolute top-0 left-0 w-full h-1" style={{ background: card.color }}></div>
              <div className="flex justify-between items-start mb-sm">
                <span className="font-label-caps text-[10px] text-on-surface-variant">{card.label}</span>
                <span className="material-symbols-outlined" style={{ color: card.color }}>{card.icon}</span>
              </div>
              <div className="font-stat-lg text-stat-lg text-on-surface">{loading ? '…' : card.value}</div>
              <div className="text-[10px] text-on-surface-variant mt-xs">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-sm mb-md flex-wrap">
          <span className="text-[10px] font-label-caps text-on-surface-variant">FILTER:</span>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="border border-outline-variant rounded-lg px-sm py-1 text-xs text-on-surface bg-white outline-none focus:border-[#17A077]">
            {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
          </select>
          {(['all', 'optimal', 'low', 'out'] as const).map(s => (
            <button key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-sm py-1 rounded-lg text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-[#17A077] text-white border-[#17A077]' : 'bg-white border-outline-variant text-on-surface-variant hover:border-[#17A077]'}`}>
              {s === 'all' ? 'All Status' : s === 'optimal' ? 'Optimal' : s === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
          {(search || catFilter !== 'all' || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setCatFilter('all'); setStatusFilter('all'); }}
              className="px-sm py-1 rounded-lg text-xs text-on-surface-variant hover:text-error border border-outline-variant flex items-center gap-xs transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list_off</span>Clear
            </button>
          )}
          <span className="ml-auto text-[10px] text-on-surface-variant font-label-caps">
            {filtered.length} of {items.length} items
          </span>
        </div>

        {/* Inventory Table */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-md border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
            <h3 className="font-label-md text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-[#17A077]">list_alt</span>
              Inventory Ledger
            </h3>
            <span className="text-[10px] text-on-surface-variant font-label-caps">Click threshold value to edit inline</span>
          </div>
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left font-body-sm">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  {['Item Name', 'Category', 'Batch / Lot', 'Expiry', 'Qty on Hand', 'Reorder Min', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-md py-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {loading ? (
                  <tr><td colSpan={8} className="px-md py-8 text-center text-on-surface-variant">Loading inventory…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-md py-8 text-center text-on-surface-variant">No items match your filters.</td></tr>
                ) : filtered.map((item, idx) => {
                  const { label, color, dot } = stockStatus(item);
                  const { text: expText, cls: expCls } = expiryBadge(item.expiry);
                  const isEditing = editingThresh?.id === item.id;
                  return (
                    <tr key={item.id}
                      className={`hover:bg-[#17A077]/5 transition-colors ${idx % 2 === 1 ? 'bg-surface-container-low/20' : 'bg-white'}`}>
                      <td className="px-md py-3 font-body-bold text-sm text-on-surface">
                        <div>{item.name}</div>
                        {item.supplier && <div className="text-[10px] text-on-surface-variant">{item.supplier}</div>}
                      </td>
                      <td className="px-md py-3 text-on-surface-variant font-label-caps capitalize text-xs">{item.category}</td>
                      <td className="px-md py-3 text-on-surface-variant font-label-caps text-xs">{item.batch_no ?? '—'}</td>
                      <td className="px-md py-3"><span className={expCls}>{expText}</span></td>
                      <td className="px-md py-3 text-on-surface font-bold text-sm">
                        {item.qty_on_hand} <span className="text-on-surface-variant font-normal text-[10px]">{item.unit}</span>
                      </td>
                      <td className="px-md py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number" min={0}
                              value={editingThresh.val}
                              onChange={e => setEditingThresh({ id: item.id, val: e.target.value })}
                              onKeyDown={e => { if (e.key === 'Enter') saveThreshold(); if (e.key === 'Escape') setEditingThresh(null); }}
                              className="w-16 border border-[#17A077] rounded px-1 py-0.5 text-sm outline-none"
                              autoFocus
                            />
                            <button onClick={saveThreshold} disabled={threshBusy} className="text-[#17A077] hover:opacity-70">
                              <span className="material-symbols-outlined text-sm">{threshBusy ? 'progress_activity' : 'check'}</span>
                            </button>
                            <button onClick={() => setEditingThresh(null)} className="text-on-surface-variant hover:text-on-surface">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingThresh({ id: item.id, val: String(item.reorder_threshold) })}
                            className="flex items-center gap-1 text-sm text-on-surface group/thresh">
                            {item.reorder_threshold}
                            <span className="material-symbols-outlined text-[12px] text-on-surface-variant opacity-0 group-hover/thresh:opacity-100 transition-opacity">edit</span>
                          </button>
                        )}
                      </td>
                      <td className="px-md py-3">
                        <div className={`flex items-center gap-1.5 font-bold ${color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${dot}`}></div>
                          <span className="text-[10px]">{label}</span>
                        </div>
                      </td>
                      <td className="px-md py-3">
                        <button
                          onClick={() => openIssueModal(item.id)}
                          title="Record Issue"
                          className="p-1 rounded hover:bg-orange-50 text-orange-400 hover:text-orange-600 transition-colors">
                          <span className="material-symbols-outlined text-sm">remove_circle</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* ── MODAL: Add Inventory Item ─────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-[#17A077]">add_circle</span>
                <span className="font-bold text-base text-on-surface">Add Inventory Item</span>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="px-lg py-md flex flex-col gap-md">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Item Name <span className="text-error">*</span></label>
                <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. CBC Reagent Kit"
                  className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]" />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Category</label>
                  <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]">
                    {['Reagent','Consumable','Equipment','PPE','Chemical','Control','Calibrator','Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Unit <span className="text-error">*</span></label>
                  <input value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))}
                    placeholder="kits, bottles, pairs…"
                    className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Opening Stock</label>
                  <input type="number" min={0} value={addForm.qty_on_hand}
                    onChange={e => setAddForm(f => ({ ...f, qty_on_hand: Number(e.target.value) }))}
                    className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Reorder Threshold</label>
                  <input type="number" min={0} value={addForm.reorder_threshold}
                    onChange={e => setAddForm(f => ({ ...f, reorder_threshold: Number(e.target.value) }))}
                    className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Supplier <span className="text-on-surface-variant/50 normal-case font-normal">(optional)</span></label>
                <input value={addForm.supplier ?? ''} onChange={e => setAddForm(f => ({ ...f, supplier: e.target.value }))}
                  placeholder="e.g. Sysmex India Pvt Ltd"
                  className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]" />
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Batch / Lot No. <span className="text-on-surface-variant/50 normal-case font-normal">(optional)</span></label>
                  <input value={addForm.batch_no ?? ''} onChange={e => setAddForm(f => ({ ...f, batch_no: e.target.value }))}
                    placeholder="e.g. LOT-2025A"
                    className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Expiry Date <span className="text-on-surface-variant/50 normal-case font-normal">(optional)</span></label>
                  <input type="date" value={addForm.expiry ?? ''} onChange={e => setAddForm(f => ({ ...f, expiry: e.target.value }))}
                    className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-sm px-lg py-md border-t border-outline-variant sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setShowAdd(false)} className="px-lg py-sm rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container-low transition-colors">Cancel</button>
              <button onClick={submitAddItem} disabled={addBusy || !addForm.name.trim() || !addForm.unit.trim()}
                className="px-lg py-sm rounded-xl text-white text-sm font-bold flex items-center gap-sm disabled:opacity-60 transition-opacity" style={{ background: '#17A077' }}>
                {addBusy ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Saving…</> : <><span className="material-symbols-outlined text-sm">check_circle</span>Add to Inventory</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Scan New Batch ─────────────────────────────────────────── */}
      {showScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant" style={{ background: '#17A077' }}>
              <div className="flex items-center gap-sm text-white">
                <span className="material-symbols-outlined">qr_code_scanner</span>
                <span className="font-bold text-base">Scan New Batch</span>
              </div>
              <button onClick={() => setShowScan(false)} className="text-white/70 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex justify-center py-md" style={{ background: '#F0F4F7' }}>
              <div className="w-40 h-24 border-2 border-dashed border-[#17A077] rounded-xl flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#17A077]/60 animate-bounce" style={{ animationDuration: '1.4s' }}></div>
                <span className="material-symbols-outlined text-4xl text-[#17A077]/40">qr_code</span>
                <span className="text-[10px] text-[#17A077] font-bold uppercase tracking-widest">Ready to Scan</span>
              </div>
            </div>
            <div className="px-lg py-md flex flex-col gap-md">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Inventory Item</label>
                <select value={scanItemId} onChange={e => setScanItemId(e.target.value)}
                  className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]">
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} — {i.qty_on_hand} {i.unit} on hand</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Batch / Lot No.</label>
                  <input value={scanBatchNo} onChange={e => setScanBatchNo(e.target.value)}
                    className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Qty Received</label>
                  <input type="number" min={1} value={scanQty} onChange={e => setScanQty(Number(e.target.value))}
                    className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Expiry Date <span className="text-on-surface-variant/50 normal-case font-normal">(optional)</span></label>
                <input type="date" value={scanExpiry} onChange={e => setScanExpiry(e.target.value)}
                  className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-[#17A077]" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-sm px-lg py-md border-t border-outline-variant">
              <button onClick={() => setShowScan(false)} className="px-lg py-sm rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container-low transition-colors">Cancel</button>
              <button onClick={submitScan} disabled={scanBusy || !scanItemId || !scanBatchNo || scanQty < 1}
                className="px-lg py-sm rounded-xl text-white text-sm font-bold flex items-center gap-sm disabled:opacity-60 transition-opacity" style={{ background: '#17A077' }}>
                {scanBusy ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Saving…</> : <><span className="material-symbols-outlined text-sm">check_circle</span>Record Batch</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Record Issue ───────────────────────────────────────────── */}
      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant" style={{ background: '#EA8C00' }}>
              <div className="flex items-center gap-sm text-white">
                <span className="material-symbols-outlined">remove_circle</span>
                <span className="font-bold text-base">Record Stock Issue</span>
              </div>
              <button onClick={() => setShowIssue(false)} className="text-white/70 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="px-lg py-md flex flex-col gap-md">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Item</label>
                <select value={issueItemId} onChange={e => setIssueItemId(e.target.value)}
                  className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-orange-400">
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} — {i.qty_on_hand} {i.unit} available</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Quantity to Issue</label>
                  <input type="number" min={1} value={issueQty} onChange={e => setIssueQty(Number(e.target.value))}
                    className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Reason</label>
                  <select value={issueReason} onChange={e => setIssueReason(e.target.value)}
                    className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-orange-400">
                    {ISSUE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Notes <span className="text-on-surface-variant/50 normal-case font-normal">(optional)</span></label>
                <textarea rows={2} value={issueNotes} onChange={e => setIssueNotes(e.target.value)}
                  placeholder="e.g. QC run batch 2025-07"
                  className="w-full border border-outline-variant rounded-xl px-md py-sm text-sm text-on-surface bg-white outline-none focus:border-orange-400 resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-sm px-lg py-md border-t border-outline-variant">
              <button onClick={() => setShowIssue(false)} className="px-lg py-sm rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container-low transition-colors">Cancel</button>
              <button onClick={submitIssue} disabled={issueBusy || !issueItemId || issueQty < 1}
                className="px-lg py-sm rounded-xl text-white text-sm font-bold flex items-center gap-sm disabled:opacity-60 bg-orange-500 hover:bg-orange-600 transition-colors">
                {issueBusy ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Saving…</> : <><span className="material-symbols-outlined text-sm">check_circle</span>Record Issue</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Upload Invoice ─────────────────────────────────────────── */}
      {showInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant" style={{ background: '#17A077' }}>
              <div className="flex items-center gap-sm text-white">
                <span className="material-symbols-outlined">upload_file</span>
                <div>
                  <div className="font-bold text-base">Upload Supplier Invoice</div>
                  <div className="text-white/70 text-[10px]">PDF or image → AI extracts items → updates stock</div>
                </div>
              </div>
              <button onClick={() => setShowInvoice(false)} className="text-white/70 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>

            <div className="flex-1 overflow-y-auto px-lg py-md flex flex-col gap-md">
              {!invoiceFile ? (
                <div
                  className="border-2 border-dashed border-[#17A077] rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#17A077]/5 transition-colors"
                  onClick={() => invoiceInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleInvoiceFileSelect(e.dataTransfer.files[0] ?? null); }}>
                  <span className="material-symbols-outlined text-5xl text-[#17A077]/50">upload_file</span>
                  <div className="text-center">
                    <p className="font-bold text-on-surface">Drop your invoice here or click to browse</p>
                    <p className="text-xs text-on-surface-variant mt-1">Supports PDF and images (JPG, PNG, WEBP) — max 10 MB</p>
                  </div>
                  <input
                    ref={invoiceInputRef}
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => handleInvoiceFileSelect(e.target.files?.[0] ?? null)}
                  />
                </div>
              ) : (
                <div className="flex gap-md">
                  <div className="flex-shrink-0 w-40">
                    {invoicePreviewUrl ? (
                      <img src={invoicePreviewUrl} alt="Invoice preview" className="w-full rounded-lg border border-outline-variant object-contain max-h-48" />
                    ) : (
                      <div className="w-full h-36 bg-surface-container-low rounded-lg border border-outline-variant flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-on-surface-variant">picture_as_pdf</span>
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase">{invoiceFile.name.split('.').pop()?.toUpperCase()}</span>
                      </div>
                    )}
                    <p className="text-[10px] text-on-surface-variant mt-1 truncate text-center">{invoiceFile.name}</p>
                    <button onClick={() => { setInvoiceFile(null); setInvoiceParsed([]); setInvoiceError(null); setInvoicePreviewUrl(null); }}
                      className="mt-2 w-full text-[10px] text-error border border-error rounded-lg py-1 hover:bg-red-50 transition-colors">
                      Remove file
                    </button>
                  </div>

                  <div className="flex-1">
                    {invoiceParsed.length === 0 && !invoiceError && (
                      <div className="h-full flex flex-col items-center justify-center gap-3 text-on-surface-variant py-4">
                        <span className="material-symbols-outlined text-4xl text-[#17A077]/40">auto_awesome</span>
                        <p className="text-sm text-center">Click <strong className="text-on-surface">"Parse with AI"</strong> to extract items and quantities from this invoice.</p>
                        <p className="text-[10px] text-center opacity-60">Requires the parse-invoice edge function deployed with ANTHROPIC_API_KEY.</p>
                      </div>
                    )}
                    {invoiceError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-md flex gap-sm">
                        <span className="material-symbols-outlined text-error flex-shrink-0">error</span>
                        <div>
                          <p className="text-sm font-bold text-error">Parsing failed</p>
                          <p className="text-xs text-red-600 mt-1">{invoiceError}</p>
                          {invoiceError.includes('ANTHROPIC_API_KEY') && (
                            <p className="text-[10px] text-red-500 mt-2 font-mono bg-red-100 p-1 rounded">
                              supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {invoiceParsed.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-on-surface mb-sm">
                          {invoiceParsed.length} items found — review and toggle before applying:
                        </p>
                        <div className="overflow-auto max-h-52 rounded-lg border border-outline-variant">
                          <table className="w-full text-xs">
                            <thead className="bg-surface-container-low sticky top-0">
                              <tr>
                                <th className="px-sm py-2 text-left font-bold text-on-surface-variant text-[10px] uppercase">Invoice Item</th>
                                <th className="px-sm py-2 text-left font-bold text-on-surface-variant text-[10px] uppercase">Matched</th>
                                <th className="px-sm py-2 text-center font-bold text-on-surface-variant text-[10px] uppercase">Qty</th>
                                <th className="px-sm py-2 text-center font-bold text-on-surface-variant text-[10px] uppercase">Apply</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/40">
                              {invoiceParsed.map((p, i) => (
                                <tr key={i} className="hover:bg-surface-container-low/30">
                                  <td className="px-sm py-2 text-on-surface">{p.raw_name}</td>
                                  <td className="px-sm py-2">
                                    {p.matched
                                      ? <span className="text-[#0D9460] font-bold">{p.matched.name}</span>
                                      : <span className="text-on-surface-variant italic">No match</span>}
                                  </td>
                                  <td className="px-sm py-2 text-center font-bold">{p.quantity}</td>
                                  <td className="px-sm py-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={p.apply && !!p.matched}
                                      disabled={!p.matched}
                                      onChange={e => setInvoiceParsed(prev =>
                                        prev.map((x, j) => j === i ? { ...x, apply: e.target.checked } : x)
                                      )}
                                      className="w-4 h-4 accent-[#17A077]"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[10px] text-on-surface-variant mt-sm">
                          {invoiceParsed.filter(p => p.apply && p.matched).length} of {invoiceParsed.length} items will be updated
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-sm px-lg py-md border-t border-outline-variant">
              <button onClick={() => setShowInvoice(false)} className="px-lg py-sm rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container-low transition-colors">Cancel</button>
              <div className="flex gap-sm">
                {invoiceFile && invoiceParsed.length === 0 && (
                  <button onClick={parseInvoice} disabled={invoiceParsing}
                    className="px-lg py-sm rounded-xl text-white text-sm font-bold flex items-center gap-sm disabled:opacity-60" style={{ background: '#17A077' }}>
                    {invoiceParsing
                      ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Parsing…</>
                      : <><span className="material-symbols-outlined text-sm">auto_awesome</span>Parse with AI</>}
                  </button>
                )}
                {invoiceParsed.length > 0 && (
                  <>
                    <button onClick={parseInvoice} disabled={invoiceParsing}
                      className="px-md py-sm rounded-xl text-sm border border-[#17A077] text-[#17A077] flex items-center gap-xs disabled:opacity-60">
                      {invoiceParsing
                        ? <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        : <span className="material-symbols-outlined text-sm">refresh</span>}
                      Re-parse
                    </button>
                    <button onClick={confirmInvoiceUpdate}
                      disabled={invoiceApplying || invoiceParsed.filter(p => p.apply && p.matched).length === 0}
                      className="px-lg py-sm rounded-xl text-white text-sm font-bold flex items-center gap-sm disabled:opacity-60" style={{ background: '#17A077' }}>
                      {invoiceApplying
                        ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Updating…</>
                        : <><span className="material-symbols-outlined text-sm">check_circle</span>Update {invoiceParsed.filter(p => p.apply && p.matched).length} Items</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Movement Log ───────────────────────────────────────────── */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-[#17A077]">history</span>
                <span className="font-bold text-base text-on-surface">Movement Log</span>
                <span className="text-[10px] text-on-surface-variant font-label-caps">(session only)</span>
              </div>
              <button onClick={() => setShowLog(false)} className="text-on-surface-variant hover:text-on-surface"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto px-lg py-md">
              {logEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl opacity-30">history</span>
                  <p className="text-sm">No movements recorded yet this session.</p>
                  <p className="text-xs opacity-70">Scan Batch, Record Issue, or Upload Invoice to log movements.</p>
                </div>
              ) : (
                <div className="space-y-sm">
                  {logEntries.map(m => (
                    <div key={m.id} className="flex items-start gap-md p-sm border border-outline-variant rounded-xl hover:bg-surface-container-low/30 transition-colors">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${m.type === 'in' ? 'bg-[#17A077]/10' : 'bg-orange-50'}`}>
                        <span className={`material-symbols-outlined text-sm ${m.type === 'in' ? 'text-[#17A077]' : 'text-orange-500'}`}>
                          {m.type === 'in' ? 'add_circle' : 'remove_circle'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-sm">
                          <span className="font-bold text-sm text-on-surface truncate">{m.item_name}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${m.type === 'in' ? 'bg-[#17A077]/10 text-[#17A077]' : 'bg-orange-100 text-orange-600'}`}>
                            {m.type === 'in' ? '+' : '−'}{m.qty} {m.unit}
                          </span>
                        </div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5 flex items-center gap-sm flex-wrap">
                          <span>{relativeTime(m.ts)}</span>
                          {m.batch && <><span>·</span><span>Batch: {m.batch}</span></>}
                          {m.reason && <><span>·</span><span>{m.reason}</span></>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Generate Purchase Order ────────────────────────────────── */}
      {showOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant" style={{ background: '#17A077' }}>
              <div>
                <h2 className="font-bold text-white text-lg">Generate Purchase Order</h2>
                <p className="text-white/70 text-[11px] font-label-caps mt-0.5">→ POST /v1/inventory/purchase-requisitions</p>
              </div>
              <button onClick={() => setShowOrder(false)} className="text-white/80 hover:text-white"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="overflow-y-auto flex-1 px-lg py-md">
              {items.filter(i => i.qty_on_hand <= i.reorder_threshold).length === 0 ? (
                <p className="text-center text-on-surface-variant py-8">All items are above reorder threshold — no restock needed.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-[10px] text-on-surface-variant uppercase font-bold">
                      <th className="text-left pb-2">Item</th>
                      <th className="text-center pb-2">On Hand</th>
                      <th className="text-center pb-2">Threshold</th>
                      <th className="text-center pb-2">Qty to Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {items.filter(i => i.qty_on_hand <= i.reorder_threshold).map(item => (
                      <tr key={item.id}>
                        <td className="py-3 pr-md">
                          <p className="font-bold text-on-surface">{item.name}</p>
                          {item.supplier && <p className="text-[10px] text-on-surface-variant">{item.supplier}</p>}
                        </td>
                        <td className="text-center"><span className="text-orange-600 font-bold">{item.qty_on_hand} {item.unit}</span></td>
                        <td className="text-center text-on-surface-variant">{item.reorder_threshold}</td>
                        <td className="text-center">
                          <input type="number" min={1}
                            value={orderItems[item.id] ?? 0}
                            onChange={e => setOrderItems(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                            className="w-20 text-center border border-outline-variant rounded-lg py-1 px-2 font-bold focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="mt-md">
                <label className="text-[11px] font-label-caps text-on-surface-variant block mb-1">Notes (optional)</label>
                <textarea rows={2} value={orderNotes} onChange={e => setOrderNotes(e.target.value)}
                  placeholder="e.g. Urgent restock — dengue season spike"
                  className="w-full border border-outline-variant rounded-lg px-md py-sm text-sm text-on-surface focus:outline-none resize-none" />
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant flex justify-end gap-md bg-surface-container-low">
              <button onClick={() => setShowOrder(false)} className="px-lg py-sm rounded-lg border border-outline-variant text-on-surface-variant font-label-md hover:bg-surface-container transition-colors">Cancel</button>
              <button onClick={submitOrder}
                disabled={submitting || Object.values(orderItems).every(q => q <= 0)}
                className="px-lg py-sm rounded-lg text-white font-label-md flex items-center gap-sm disabled:opacity-50 transition-opacity" style={{ background: '#17A077' }}>
                {submitting
                  ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Submitting…</>
                  : <><span className="material-symbols-outlined text-sm">send</span>Submit Requisition</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Bulk Upload ────────────────────────────────────────────── */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[92vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant" style={{ background: 'linear-gradient(135deg,#4C1D95,#7C3AED)' }}>
              <div className="flex items-center gap-sm text-white">
                <span className="material-symbols-outlined">table_view</span>
                <div>
                  <div className="font-bold text-base">Bulk Inventory Upload</div>
                  <div className="text-white/70 text-[10px]">Upload a CSV file to create or update multiple items at once</div>
                </div>
              </div>
              <div className="flex items-center gap-sm">
                <button onClick={downloadTemplate}
                  className="flex items-center gap-xs px-md py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors border border-white/30">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download Template
                </button>
                <button onClick={() => setShowBulk(false)} className="text-white/70 hover:text-white ml-sm">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-lg py-md flex flex-col gap-md">

              {/* Instructions */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-md">
                <div className="flex items-start gap-sm">
                  <span className="material-symbols-outlined text-purple-600 flex-shrink-0">info</span>
                  <div className="text-xs text-purple-800">
                    <p className="font-bold mb-1">How it works</p>
                    <ul className="space-y-0.5 list-disc list-inside">
                      <li>Download the template CSV, fill it in, then upload it here.</li>
                      <li><strong>New items</strong> (name not found) will be <span className="text-[#17A077] font-bold">created</span> in inventory.</li>
                      <li><strong>Existing items</strong> (name matches) will have the CSV quantity <span className="text-amber-700 font-bold">added</span> to their current stock.</li>
                      <li>Required columns: <code className="bg-purple-100 px-1 rounded">name</code>, <code className="bg-purple-100 px-1 rounded">unit</code>. All others are optional.</li>
                      <li>Category must be one of: {VALID_CATEGORIES.join(', ')}.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Upload area / file picker */}
              {bulkRows.length === 0 && !bulkResult && (
                <div
                  className="border-2 border-dashed border-purple-300 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-purple-50 transition-colors"
                  onClick={() => bulkInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleBulkFile(e.dataTransfer.files[0] ?? null); }}>
                  <span className="material-symbols-outlined text-5xl text-purple-300">upload_file</span>
                  <div className="text-center">
                    <p className="font-bold text-on-surface">Drop your CSV here or click to browse</p>
                    <p className="text-xs text-on-surface-variant mt-1">Only .csv files are accepted</p>
                  </div>
                  <input
                    ref={bulkInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={e => handleBulkFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}

              {/* Result summary after upload */}
              {bulkResult && (
                <div className="grid grid-cols-3 gap-md">
                  {[
                    { label: 'Created', value: bulkResult.created, color: 'text-[#0D9460]', bg: 'bg-[#17A077]/10', icon: 'add_circle' },
                    { label: 'Updated (qty added)', value: bulkResult.updated, color: 'text-amber-700', bg: 'bg-amber-50', icon: 'update' },
                    { label: 'Failed', value: bulkResult.failed, color: 'text-error', bg: 'bg-red-50', icon: 'error' },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-md flex items-center gap-md`}>
                      <span className={`material-symbols-outlined text-3xl ${s.color}`}>{s.icon}</span>
                      <div>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-on-surface-variant">{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview table */}
              {bulkRows.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-sm">
                    <div className="flex items-center gap-sm">
                      <p className="text-sm font-bold text-on-surface">{bulkRows.length} rows parsed</p>
                      <span className="text-[10px] bg-[#17A077]/10 text-[#17A077] font-bold px-2 py-0.5 rounded-full">
                        {bulkRows.filter(r => r.include && r.errors.length === 0).length} will be imported
                      </span>
                      {bulkRows.some(r => r.errors.length > 0) && (
                        <span className="text-[10px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                          {bulkRows.filter(r => r.errors.length > 0).length} with errors
                        </span>
                      )}
                      {bulkRows.some(r => r.existing) && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                          {bulkRows.filter(r => r.existing).length} will update existing
                        </span>
                      )}
                    </div>
                    <button onClick={() => bulkInputRef.current?.click()}
                      className="text-xs text-purple-600 border border-purple-300 rounded-lg px-sm py-1 hover:bg-purple-50 transition-colors flex items-center gap-xs">
                      <span className="material-symbols-outlined text-sm">refresh</span>Change file
                    </button>
                    <input ref={bulkInputRef} type="file" accept=".csv,text/csv" className="hidden"
                      onChange={e => handleBulkFile(e.target.files?.[0] ?? null)} />
                  </div>

                  <div className="overflow-auto max-h-[340px] rounded-xl border border-outline-variant">
                    <table className="w-full text-xs">
                      <thead className="bg-surface-container-low sticky top-0 z-10">
                        <tr>
                          <th className="px-sm py-2 text-center text-[10px] text-on-surface-variant font-bold uppercase w-10">✓</th>
                          <th className="px-sm py-2 text-left text-[10px] text-on-surface-variant font-bold uppercase">Name</th>
                          <th className="px-sm py-2 text-left text-[10px] text-on-surface-variant font-bold uppercase">Category</th>
                          <th className="px-sm py-2 text-left text-[10px] text-on-surface-variant font-bold uppercase">Unit</th>
                          <th className="px-sm py-2 text-center text-[10px] text-on-surface-variant font-bold uppercase">Qty</th>
                          <th className="px-sm py-2 text-center text-[10px] text-on-surface-variant font-bold uppercase">Reorder Min</th>
                          <th className="px-sm py-2 text-left text-[10px] text-on-surface-variant font-bold uppercase">Supplier</th>
                          <th className="px-sm py-2 text-center text-[10px] text-on-surface-variant font-bold uppercase">Action</th>
                          <th className="px-sm py-2 text-left text-[10px] text-on-surface-variant font-bold uppercase">Issues</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {bulkRows.map((row, i) => {
                          const hasErr = row.errors.length > 0;
                          return (
                            <tr key={row.idx}
                              className={`transition-colors ${hasErr ? 'bg-red-50' : row.existing ? 'bg-amber-50/40' : i % 2 === 1 ? 'bg-surface-container-low/20' : 'bg-white'}`}>
                              <td className="px-sm py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={row.include}
                                  disabled={hasErr}
                                  onChange={e => setBulkRows(prev => prev.map((r, j) => j === i ? { ...r, include: e.target.checked } : r))}
                                  className="w-3.5 h-3.5 accent-purple-600"
                                />
                              </td>
                              <td className="px-sm py-2 font-medium text-on-surface">{row.name || <span className="text-error italic">missing</span>}</td>
                              <td className="px-sm py-2 text-on-surface-variant">{row.category}</td>
                              <td className="px-sm py-2 text-on-surface-variant">{row.unit || <span className="text-error italic">missing</span>}</td>
                              <td className="px-sm py-2 text-center font-bold text-on-surface">{row.qty}</td>
                              <td className="px-sm py-2 text-center text-on-surface-variant">{row.threshold}</td>
                              <td className="px-sm py-2 text-on-surface-variant truncate max-w-[120px]">{row.supplier || '—'}</td>
                              <td className="px-sm py-2 text-center">
                                {hasErr ? (
                                  <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">ERROR</span>
                                ) : row.existing ? (
                                  <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">UPDATE</span>
                                ) : (
                                  <span className="text-[9px] bg-[#17A077]/10 text-[#0D9460] font-bold px-1.5 py-0.5 rounded-full">CREATE</span>
                                )}
                              </td>
                              <td className="px-sm py-2">
                                {hasErr ? (
                                  <div className="text-[9px] text-red-600 space-y-0.5">
                                    {row.errors.map((e, ei) => <div key={ei}>• {e}</div>)}
                                  </div>
                                ) : row.existing ? (
                                  <span className="text-[9px] text-amber-600">→ adds to "{row.existing.name}"</span>
                                ) : (
                                  <span className="text-[9px] text-[#0D9460]">New item</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Progress bar during upload */}
              {bulkUploading && (
                <div>
                  <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1">
                    <span>Uploading…</span>
                    <span>{bulkProgress}%</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 rounded-full transition-all duration-300" style={{ width: `${bulkProgress}%` }}></div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-sm px-lg py-md border-t border-outline-variant">
              <div className="flex items-center gap-sm">
                <button onClick={downloadTemplate}
                  className="flex items-center gap-xs px-md py-sm rounded-xl text-xs font-bold text-purple-600 border border-purple-300 hover:bg-purple-50 transition-colors">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Download Template CSV
                </button>
                <span className="text-[10px] text-on-surface-variant">Fill it in, then upload above</span>
              </div>
              <div className="flex items-center gap-sm">
                <button onClick={() => setShowBulk(false)}
                  className="px-lg py-sm rounded-xl border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container-low transition-colors">
                  {bulkResult ? 'Close' : 'Cancel'}
                </button>
                {bulkRows.length > 0 && !bulkResult && (
                  <button
                    onClick={submitBulkUpload}
                    disabled={bulkUploading || bulkRows.filter(r => r.include && r.errors.length === 0).length === 0}
                    className="px-lg py-sm rounded-xl text-white text-sm font-bold flex items-center gap-sm disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#4C1D95,#7C3AED)' }}>
                    {bulkUploading
                      ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>Uploading…</>
                      : <><span className="material-symbols-outlined text-sm">check_circle</span>Import {bulkRows.filter(r => r.include && r.errors.length === 0).length} Items</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-12 right-6 z-50 flex items-center gap-md px-lg py-md rounded-xl shadow-2xl text-white text-sm font-medium"
          style={{ background: toast.ok ? '#17A077' : '#B00020' }}>
          <span className="material-symbols-outlined">{toast.ok ? 'check_circle' : 'error'}</span>
          <p>{toast.msg}</p>
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 right-0 left-64 h-8 bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between px-md z-40">
        <div className="flex items-center gap-lg">
          <span className="font-label-caps text-[10px] font-bold text-on-surface">DiagDesk v2.4.0-stable</span>
          <div className="flex gap-md">
            <span className="font-label-caps text-[10px] text-on-surface-variant">Env: Production</span>
            <span className="font-label-caps text-[10px] text-[#17A077] flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 bg-[#17A077] rounded-full"></span>Latency: 24ms
            </span>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <span className="font-label-caps text-[10px] text-on-surface-variant hover:text-[#17A077] transition-colors cursor-pointer">Security Protocols Active</span>
          <span className="material-symbols-outlined text-sm text-[#17A077]">encrypted</span>
        </div>
      </footer>
    </div>
  );
}
