import { useState, useEffect, useMemo } from 'react';
import { fetchOrders, fetchPatients, fetchOrdersHttp, fetchPatientByIdHttp, type Order, type Patient } from '../lib/api';
import { accessionNumber } from '../lib/barcode';
import { useAuth } from '../lib/auth';
import Sidebar from '../components/Sidebar';

const TEAL = '#17A077';

const LAB_INFO = {
  name:    'DiagDesk Diagnostics',
  address: '12, Health Hub, Koramangala 6th Block, Bangalore — 560095',
  phone:   '+91 80 4567 8900',
  gstin:   '29AABCD1234E1Z5',
  regNo:   'KA/MED/LAB/2019/00142',
};

const STATUS_COLOR: Record<string, string> = {
  registered:       '#737685',
  sample_collected: '#0D9460',
  processing:       '#F59E0B',
  resulted:         '#17A077',
  reported:         '#17A077',
  delivered:        '#1A7260',
  cancelled:        '#ba1a1a',
};

// ── Invoice number generator ─────────────────────────────────────────────────

function invoiceNo(orderId: string): string {
  let h = 5381;
  for (const c of orderId) h = ((h << 5) + h) ^ c.charCodeAt(0);
  return `INV-${new Date().getFullYear()}-${((h >>> 0) % 99999).toString().padStart(5, '0')}`;
}

// ── Print invoice ─────────────────────────────────────────────────────────────

function printInvoice(order: Order, patient: Patient | undefined) {
  const items = order.items ?? [];
  const rows = items.map(i => `
    <tr>
      <td style="padding:8px 12px;font-size:12px;">${i.test_name}</td>
      <td style="padding:8px 12px;font-size:12px;color:#6B7280;">${i.department}</td>
      <td style="padding:8px 12px;font-size:12px;text-align:right;">₹${i.price.toLocaleString('en-IN')}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Invoice — ${invoiceNo(order.id)}</title>
<style>
  @page { margin: 15mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; background: #fff; font-size: 13px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  table { width: 100%; border-collapse: collapse; }
</style>
</head>
<body>
<table style="margin-bottom:16px;">
  <tr>
    <td>
      <div style="font-size:24px;font-weight:900;color:#17A077;">${LAB_INFO.name}</div>
      <div style="font-size:11px;color:#6B7280;margin-top:2px;">${LAB_INFO.address}</div>
      <div style="font-size:11px;color:#6B7280;">Tel: ${LAB_INFO.phone}</div>
      <div style="font-size:10px;color:#9CA3AF;margin-top:2px;">GSTIN: ${LAB_INFO.gstin} &nbsp;|&nbsp; Reg: ${LAB_INFO.regNo}</div>
    </td>
    <td style="text-align:right;vertical-align:top;">
      <div style="font-size:22px;font-weight:900;color:#17A077;">INVOICE</div>
      <div style="font-size:13px;font-weight:700;font-family:monospace;margin-top:4px;">${invoiceNo(order.id)}</div>
      <div style="font-size:10px;color:#9CA3AF;margin-top:4px;">Accession: ${accessionNumber(order.id)}</div>
      <div style="font-size:11px;color:#6B7280;margin-top:2px;">Date: ${new Date(order.ordered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </td>
  </tr>
</table>
<hr style="border:none;border-top:2px solid #17A077;margin-bottom:14px;">
<table style="margin-bottom:16px;">
  <tr>
    <td style="width:50%;vertical-align:top;">
      <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;margin-bottom:4px;">Bill To</div>
      <div style="font-size:14px;font-weight:700;">${patient?.name ?? order.patient_name ?? 'Unknown'}</div>
      <div style="font-size:12px;color:#6B7280;margin-top:2px;">MPI No: ${patient?.mpi_no ?? '—'}</div>
      <div style="font-size:12px;color:#6B7280;">${patient?.age ?? '—'}Y / ${patient?.sex ?? '—'}</div>
      <div style="font-size:12px;color:#6B7280;">Phone: ${patient?.phone ?? order.patient_phone ?? '—'}</div>
      ${patient?.address ? `<div style="font-size:11px;color:#9CA3AF;margin-top:2px;">${patient.address}</div>` : ''}
    </td>
    <td style="width:50%;vertical-align:top;padding-left:20px;border-left:1px solid #E5E7EB;">
      <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;margin-bottom:4px;">Payment Info</div>
      <div style="font-size:12px;">Mode: <strong>${order.payment_mode ?? 'Cash'}</strong></div>
      <div style="font-size:12px;margin-top:2px;">Status: <strong style="color:${order.payment_status === 'paid' ? '#17A077' : '#F59E0B'};">${(order.payment_status ?? 'pending').toUpperCase()}</strong></div>
      ${order.doctor_name ? `<div style="font-size:12px;margin-top:2px;">Referred by: ${order.doctor_name}</div>` : ''}
      ${order.notes ? `<div style="font-size:11px;color:#9CA3AF;margin-top:4px;">Notes: ${order.notes}</div>` : ''}
    </td>
  </tr>
</table>
<table style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:16px;">
  <thead>
    <tr style="background:#17A077;">
      <th style="padding:9px 12px;text-align:left;font-size:11px;color:#fff;font-weight:700;text-transform:uppercase;">Test Name</th>
      <th style="padding:9px 12px;text-align:left;font-size:11px;color:#fff;font-weight:700;text-transform:uppercase;">Department</th>
      <th style="padding:9px 12px;text-align:right;font-size:11px;color:#fff;font-weight:700;text-transform:uppercase;">Amount</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<table style="margin-left:auto;width:260px;margin-bottom:20px;">
  <tr><td style="padding:4px 0;color:#6B7280;">Subtotal</td><td style="text-align:right;font-weight:600;">₹${order.subtotal.toLocaleString('en-IN')}</td></tr>
  ${order.discount > 0 ? `<tr><td style="padding:4px 0;color:#16A34A;">Discount</td><td style="text-align:right;font-weight:600;color:#16A34A;">-₹${order.discount.toLocaleString('en-IN')}</td></tr>` : ''}
  <tr style="border-top:2px solid #17A077;"><td style="padding:8px 0;font-weight:900;font-size:15px;">TOTAL</td><td style="text-align:right;font-weight:900;font-size:15px;color:#17A077;">₹${order.total.toLocaleString('en-IN')}</td></tr>
</table>
<div style="text-align:center;font-size:10px;color:#9CA3AF;border-top:1px solid #E5E7EB;padding-top:8px;">
  Thank you for choosing ${LAB_INFO.name}. This is a computer-generated invoice. &nbsp;|&nbsp; Report at: diagdesk.in
</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=800,height=700');
  if (!win) { alert('Allow popups to print invoices'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InvoiceManager() {
  const { role } = useAuth();
  const isAdmin  = role === 'admin';

  const [orders, setOrders]     = useState<Order[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [searchQ, setSearchQ]       = useState('');
  const [statusF, setStatusF]       = useState('');
  const [payF, setPayF]             = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');

  // Detail view
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [o, p] = await Promise.all([fetchOrders(), fetchPatients()]);
        if (o.length > 0 || p.length > 0) { setOrders(o); setPatients(p); return; }
        throw new Error('empty');
      } catch {
        // Supabase unreachable or empty — fall back to Java services
        try {
          const orders = await fetchOrdersHttp();
          setOrders(orders);
          const uniqueIds = [...new Set(orders.map(o => o.patient_id))];
          const fetched = await Promise.all(uniqueIds.map(id => fetchPatientByIdHttp(id)));
          setPatients(fetched.filter(Boolean) as Patient[]);
        } catch (e) {
          console.error('Could not load orders:', e);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const patientMap = useMemo(() => new Map(patients.map(p => [p.id, p])), [patients]);

  const filtered = useMemo(() => {
    const q = searchQ.toLowerCase();
    return orders.filter(o => {
      if (q && !o.patient_name?.toLowerCase().includes(q) &&
               !invoiceNo(o.id).toLowerCase().includes(q) &&
               !o.patient_phone?.includes(q)) return false;
      if (statusF && o.status !== statusF) return false;
      if (payF && o.payment_status !== payF) return false;
      if (dateFrom && o.ordered_at < dateFrom) return false;
      if (dateTo && o.ordered_at > dateTo + 'T23:59:59') return false;
      return true;
    });
  }, [orders, searchQ, statusF, payF, dateFrom, dateTo]);

  const totalRevenue = filtered.reduce((s, o) => s + (o.payment_status === 'paid' ? o.total : 0), 0);
  const pending = filtered.filter(o => o.payment_status === 'pending' || o.payment_status === 'partial').length;

  const selectedPatient = selected ? patientMap.get(selected.patient_id) : undefined;

  // ── Detail panel ─────────────────────────────────────────────────────────────

  function DetailPanel() {
    if (!selected) return null;
    const p = selectedPatient;
    const items = selected.items ?? [];
    return (
      <div className="fixed inset-0 z-50 flex" style={{ background: 'rgba(0,0,0,0.45)' }}>
        <div className="flex-1" onClick={() => setSelected(null)}></div>
        <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">
          {/* Panel header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between" style={{ background: TEAL }}>
            <div className="text-white">
              <div className="font-black text-lg">{invoiceNo(selected.id)}</div>
              <div className="text-white/70 text-sm">{p?.name ?? selected.patient_name}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => printInvoice(selected, p)}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                <span className="material-symbols-outlined text-base">print</span>
                Print
              </button>
              <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Patient + payment info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Patient Details</div>
                <div className="font-bold text-gray-900 text-base">{p?.name ?? selected.patient_name ?? '—'}</div>
                <div className="text-sm text-gray-600 mt-1">MPI: {p?.mpi_no ?? '—'}</div>
                <div className="text-sm text-gray-600">{p?.age ?? '—'}Y / {p?.sex ?? '—'}</div>
                <div className="text-sm text-gray-600">{p?.phone ?? selected.patient_phone ?? '—'}</div>
                {p?.email && <div className="text-sm text-gray-500">{p.email}</div>}
                {p?.address && <div className="text-xs text-gray-400 mt-1">{p.address}</div>}
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Invoice Details</div>
                <div className="font-mono font-bold text-gray-900 text-sm">{invoiceNo(selected.id)}</div>
                <div className="text-xs text-gray-500 mt-1">Accession: {accessionNumber(selected.id)}</div>
                <div className="text-sm text-gray-600 mt-2">Date: {new Date(selected.ordered_at).toLocaleDateString('en-IN')}</div>
                <div className="text-sm text-gray-600">Mode: {selected.payment_mode ?? 'Cash'}</div>
                <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ background: selected.payment_status === 'paid' ? TEAL : '#F59E0B' }}>
                  {(selected.payment_status ?? 'pending').toUpperCase()}
                </span>
                {selected.doctor_name && <div className="text-xs text-gray-500 mt-2">Referred by: {selected.doctor_name}</div>}
              </div>
            </div>

            {/* Order status */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ background: STATUS_COLOR[selected.status] ?? '#737685' }}>
                {selected.status.replace(/_/g, ' ').toUpperCase()}
              </span>
              {selected.notes && <span className="text-xs text-gray-500 italic">{selected.notes}</span>}
            </div>

            {/* Tests table */}
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tests Ordered</div>
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2 text-xs font-bold text-gray-500 uppercase">Test</th>
                      <th className="text-left px-4 py-2 text-xs font-bold text-gray-500 uppercase">Department</th>
                      <th className="text-right px-4 py-2 text-xs font-bold text-gray-500 uppercase">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm font-semibold text-gray-800">{item.test_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{item.department}</td>
                        <td className="px-4 py-2 text-sm font-bold text-right">₹{item.price.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-end gap-1.5">
              <div className="flex justify-between w-48 text-sm text-gray-600">
                <span>Subtotal</span><span>₹{selected.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {selected.discount > 0 && (
                <div className="flex justify-between w-48 text-sm text-green-600">
                  <span>Discount</span><span>-₹{selected.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between w-48 font-black text-base border-t pt-2 mt-1">
                <span>Total</span><span style={{ color: TEAL }}>₹{selected.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => printInvoice(selected, p)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: TEAL }}>
                <span className="material-symbols-outlined text-base">print</span>
                Print Invoice
              </button>
              <a href="/reports" className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-2"
                style={{ borderColor: '#7C3AED', color: '#7C3AED' }}>
                <span className="material-symbols-outlined text-base">lab_profile</span>
                View Reports
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: '#EEF3F7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {isAdmin && <Sidebar />}
      <div className={isAdmin ? 'ml-64' : ''}>

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-black text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-0.5">All orders · patient billing</p>
          </div>
          <a href="/registration" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: TEAL }}>
            <span className="material-symbols-outlined text-base">add</span>
            New Registration
          </a>
        </header>

        <div className="p-8 max-w-7xl mx-auto">

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Invoices', value: filtered.length,                            color: '#374151' },
              { label: 'Revenue Collected', value: `₹${(totalRevenue/1000).toFixed(1)}K`,  color: TEAL },
              { label: 'Pending Payment',   value: pending,                                 color: '#F59E0B' },
              { label: 'Avg Invoice',       value: filtered.length ? `₹${Math.round(filtered.reduce((s,o) => s+o.total,0)/filtered.length).toLocaleString('en-IN')}` : '—', color: '#7C3AED' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{k.label}</div>
                <div className="text-2xl font-black" style={{ color: k.color }}>{loading ? '…' : k.value}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 mb-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">search</span>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search patient, invoice no, phone…"
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
            </div>
            <select value={statusF} onChange={e => setStatusF(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]">
              <option value="">All Statuses</option>
              {['registered','sample_collected','processing','resulted','reported','delivered','cancelled'].map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select value={payF} onChange={e => setPayF(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]">
              <option value="">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
            {(searchQ || statusF || payF || dateFrom || dateTo) && (
              <button onClick={() => { setSearchQ(''); setStatusF(''); setPayF(''); setDateFrom(''); setDateTo(''); }}
                className="text-sm text-gray-500 hover:text-red-500 font-semibold">Clear</button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['Invoice #', 'Patient', 'Tests', 'Date', 'Amount', 'Payment', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">Loading invoices…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-400">No invoices match filters</td></tr>
                ) : filtered.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(o)}>
                    <td className="px-5 py-3 font-mono text-xs font-bold" style={{ color: TEAL }}>{invoiceNo(o.id)}</td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-sm text-gray-900">{o.patient_name ?? '—'}</div>
                      <div className="text-xs text-gray-500">{o.patient_age}Y {o.patient_sex} · {o.patient_phone}</div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600 max-w-[160px] truncate">
                      {(o.items ?? []).map(i => i.test_name).join(', ')}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">
                      {new Date(o.ordered_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3 font-bold text-sm">₹{o.total.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ background: o.payment_status === 'paid' ? TEAL : o.payment_status === 'partial' ? '#F59E0B' : '#9CA3AF' }}>
                        {o.payment_status ?? 'pending'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                        style={{ background: STATUS_COLOR[o.status] ?? '#737685' }}>
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <button onClick={e => { e.stopPropagation(); printInvoice(o, patientMap.get(o.patient_id)); }}
                        className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                        style={{ borderColor: TEAL, color: TEAL }}>
                        <span className="material-symbols-outlined text-sm">print</span>
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
                Showing {filtered.length} of {orders.length} invoices
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && <DetailPanel />}
    </div>
  );
}
