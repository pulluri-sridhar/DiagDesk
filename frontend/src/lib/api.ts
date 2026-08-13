import { supabase, TENANT_ID } from './supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrderItem {
  test_id: string;
  test_name: string;
  department: string;
  price: number;
  status: string;
  result: { values: { analyte: string; value: string; unit: string; flag: string }[] } | null;
  resulted_at?: string;
}

export interface Order {
  id: string;
  patient_id: string;
  assigned_to: string | null;
  doctor_id: string | null;
  status: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_mode: string | null;
  payment_status: string;
  notes: string | null;
  ordered_at: string;
  // joined fields
  patient_name?: string;
  patient_phone?: string;
  patient_age?: number;
  patient_sex?: string;
  doctor_name?: string;
  phlebotomist_name?: string;
}

export interface Patient {
  id: string;
  mpi_no: string;
  name: string;
  age: number | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Test {
  id: string;
  code: string;
  name: string;
  department: string;
  price: number;
  tat_hours: number;
  active: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  qty_on_hand: number;
  reorder_threshold: number;
  batch_no: string | null;
  expiry: string | null;
  supplier: string | null;
}

export interface Report {
  id: string;
  order_id: string;
  patient_id: string;
  status: string;
  pdf_url: string | null;
  content: Record<string, unknown>;
  version: number;
  created_at: string;
  patient_name?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Supabase RLS requires service role for now; anon key passes through PostgREST
// which accepts the new sb_publishable_ key format via the JS client.

// ── Queries ───────────────────────────────────────────────────────────────────

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .eq('tenant_id', TENANT_ID);
  if (error) throw error;
}

export async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, patient_id, assigned_to, doctor_id, status,
      items, subtotal, discount, total,
      payment_mode, payment_status, notes, ordered_at,
      patients!patient_id (name, phone, age, sex),
      doctor:users!doctor_id (name),
      phlebotomist:users!assigned_to (name)
    `)
    .eq('tenant_id', TENANT_ID)
    .order('ordered_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    ...r,
    patient_name:       r.patients?.name,
    patient_phone:      r.patients?.phone,
    patient_age:        r.patients?.age,
    patient_sex:        r.patients?.sex,
    doctor_name:        r.doctor?.name,
    phlebotomist_name:  r.phlebotomist?.name,
  }));
}

export async function fetchOrdersByPhlebotomist(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, patient_id, assigned_to, status,
      items, total, payment_status, ordered_at, notes,
      patients!patient_id (name, phone, age, sex)
    `)
    .eq('tenant_id', TENANT_ID)
    .eq('assigned_to', userId)
    .order('ordered_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    patient_name:  r.patients?.name,
    patient_phone: r.patients?.phone,
    patient_age:   r.patients?.age,
    patient_sex:   r.patients?.sex,
  }));
}

export async function fetchOrderStats(): Promise<{
  total: number; today: number; revenue: number; pending: number;
}> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total, ordered_at')
    .eq('tenant_id', TENANT_ID);

  if (error) throw error;
  const rows = data ?? [];
  const todayStr = new Date().toISOString().slice(0, 10);
  return {
    total:   rows.length,
    today:   rows.filter(r => r.ordered_at?.startsWith(todayStr)).length,
    revenue: rows.reduce((s, r) => s + (r.total ?? 0), 0),
    pending: rows.filter(r => ['registered', 'sample_collected', 'processing'].includes(r.status)).length,
  };
}

export async function fetchPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('id, mpi_no, name, age, sex, phone, email, address, created_at')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPatientOrders(patientId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, items, total, payment_status, ordered_at')
    .eq('tenant_id', TENANT_ID)
    .eq('patient_id', patientId)
    .order('ordered_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export interface NewInventoryItem {
  name: string;
  category: string;
  unit: string;
  qty_on_hand: number;
  reorder_threshold: number;
  batch_no: string | null;
  expiry: string | null;
  supplier: string | null;
}

export async function addInventoryItem(item: NewInventoryItem): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory')
    .insert({ tenant_id: TENANT_ID, ...item })
    .select('id, name, category, unit, qty_on_hand, reorder_threshold, batch_no, expiry, supplier')
    .single();
  if (error) throw error;
  return data;
}

export async function updateInventoryBatch(
  id: string,
  batchNo: string,
  qtyReceived: number,
  expiry: string | null,
): Promise<InventoryItem> {
  const { data: cur, error: fetchErr } = await supabase
    .from('inventory')
    .select('qty_on_hand')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  const { data, error } = await supabase
    .from('inventory')
    .update({ batch_no: batchNo, qty_on_hand: (cur.qty_on_hand ?? 0) + qtyReceived, expiry: expiry ?? null })
    .eq('id', id)
    .select('id, name, category, unit, qty_on_hand, reorder_threshold, batch_no, expiry, supplier')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('id, name, category, unit, qty_on_hand, reorder_threshold, batch_no, expiry, supplier')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function fetchReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      id, order_id, patient_id, status, pdf_url, content, version, created_at,
      patients!patient_id (name)
    `)
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    patient_name: r.patients?.name,
  }));
}

export interface PurchaseRequisitionItem {
  inventory_id: string;
  name: string;
  supplier: string | null;
  unit: string;
  qty_on_hand: number;
  reorder_threshold: number;
  qty_to_order: number;
}

export interface PurchaseRequisition {
  id: string;
  req_number: string;
  status: string;
  notes: string | null;
  items: PurchaseRequisitionItem[];
  created_at: string;
}

export async function createPurchaseRequisition(
  items: PurchaseRequisitionItem[],
  notes: string,
  createdBy: string | null = null
): Promise<PurchaseRequisition> {
  const seq = Date.now().toString().slice(-5);
  const req_number = `PR-${new Date().getFullYear()}-${seq}`;

  const { data, error } = await supabase
    .from('purchase_requisitions')
    .insert({
      tenant_id:  TENANT_ID,
      req_number,
      status:     'submitted',
      notes:      notes || null,
      items,
      created_by: createdBy,
    })
    .select('id, req_number, status, notes, items, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function recordStockIssue(
  id: string,
  qty: number,
): Promise<InventoryItem> {
  const { data: cur, error: fetchErr } = await supabase
    .from('inventory')
    .select('qty_on_hand')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  const newQty = Math.max(0, (cur.qty_on_hand ?? 0) - qty);

  const { data, error } = await supabase
    .from('inventory')
    .update({ qty_on_hand: newQty })
    .eq('id', id)
    .select('id, name, category, unit, qty_on_hand, reorder_threshold, batch_no, expiry, supplier')
    .single();
  if (error) throw error;
  return data;
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<Pick<InventoryItem, 'reorder_threshold' | 'supplier' | 'name' | 'category' | 'unit'>>,
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from('inventory')
    .update(updates)
    .eq('id', id)
    .select('id, name, category, unit, qty_on_hand, reorder_threshold, batch_no, expiry, supplier')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Saves the generated barcode string to the orders table.
 * Requires ALTER TABLE orders ADD COLUMN IF NOT EXISTS barcode text;
 * Fails silently if the column doesn't exist yet.
 */
export async function saveOrderBarcode(orderId: string, barcode: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ barcode } as any)
    .eq('id', orderId)
    .eq('tenant_id', TENANT_ID);
  if (error) console.warn('saveOrderBarcode skipped (column may not exist):', error.message);
}

export async function fetchTests(): Promise<Test[]> {
  const { data, error } = await supabase
    .from('tests')
    .select('id, code, name, department, price, tat_hours, active')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

// ── Doctors ───────────────────────────────────────────────────────────────────

export interface Doctor {
  id: string;
  name: string;
  specialization?: string | null;
}

export async function fetchDoctors(query?: string): Promise<Doctor[]> {
  let q = supabase
    .from('users')
    .select('id, name')
    .eq('tenant_id', TENANT_ID)
    .eq('role', 'doctor')
    .order('name')
    .limit(20);
  if (query?.trim()) q = q.ilike('name', `%${query.trim()}%`);
  const { data } = await q;
  return data ?? [];
}

// ── Registration ──────────────────────────────────────────────────────────────

export interface NewPatient {
  name: string;
  age: number | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  mpi_no: string;
}

export async function searchPatients(query: string): Promise<Patient[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('patients')
    .select('id, mpi_no, name, age, sex, phone, email, address, created_at')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%,mpi_no.ilike.%${q}%`)
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export async function createPatient(data: NewPatient): Promise<Patient> {
  const { data: row, error } = await supabase
    .from('patients')
    .insert({ tenant_id: TENANT_ID, ...data })
    .select('id, mpi_no, name, age, sex, phone, email, address, created_at')
    .single();
  if (error) throw error;
  return row;
}

export interface NewOrder {
  patient_id: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_mode: string;
  payment_status: string;
  notes: string | null;
  collection_type: 'walk_in' | 'home_collection';
  collection_address?: string | null;
  collection_date?: string | null;
  collection_slot?: string | null;
  assigned_to?: string | null;
  doctor_id?: string | null;
}

export async function createOrder(data: NewOrder): Promise<Order> {
  const payload: Record<string, unknown> = {
    tenant_id:     TENANT_ID,
    patient_id:    data.patient_id,
    items:         data.items,
    subtotal:      data.subtotal,
    discount:      data.discount,
    total:         data.total,
    payment_mode:  data.payment_mode,
    payment_status:data.payment_status,
    notes:         data.notes,
    status:        'registered',
    assigned_to:   data.assigned_to ?? null,
    doctor_id:     data.doctor_id  ?? null,
  };
  // Persist collection metadata in notes if no dedicated column
  if (data.collection_type === 'home_collection') {
    const meta = `[HOME COLLECTION] Date: ${data.collection_date ?? '—'}, Slot: ${data.collection_slot ?? '—'}, Address: ${data.collection_address ?? '—'}`;
    payload.notes = [data.notes, meta].filter(Boolean).join(' | ');
    payload.status = 'registered';
  }
  const { data: row, error } = await supabase
    .from('orders')
    .insert(payload)
    .select('id, patient_id, assigned_to, doctor_id, status, items, subtotal, discount, total, payment_mode, payment_status, notes, ordered_at')
    .single();
  if (error) throw error;
  return row as Order;
}

// ── Reports ────────────────────────────────────────────────────────────────────

export async function fetchAllReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      id, order_id, patient_id, status, pdf_url, content, version, created_at,
      patients!patient_id (name)
    `)
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, patient_name: r.patients?.name }));
}

export async function fetchReportsByOrderId(orderId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('id, order_id, patient_id, status, pdf_url, content, version, created_at')
    .eq('tenant_id', TENANT_ID)
    .eq('order_id', orderId);
  if (error) throw error;
  return data ?? [];
}

export async function createReportDraft(orderId: string, patientId: string, content: Record<string, unknown>): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      tenant_id:  TENANT_ID,
      order_id:   orderId,
      patient_id: patientId,
      status:     'draft',
      content,
      version:    1,
    })
    .select('id, order_id, patient_id, status, pdf_url, content, version, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function updateReportContent(
  id: string,
  content: Record<string, unknown>,
  status: 'draft' | 'in_review',
): Promise<Report> {
  const { data, error } = await supabase
    .from('reports')
    .update({ content, status })
    .eq('id', id)
    .select('id, order_id, patient_id, status, pdf_url, content, version, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function signReport(
  id: string,
  signatureDataUrl: string,
  pathologistName: string,
  notes: string,
): Promise<Report> {
  const { data: cur, error: fetchErr } = await supabase
    .from('reports')
    .select('content, version')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  const updatedContent = {
    ...(cur.content as Record<string, unknown>),
    pathologistSignature: signatureDataUrl,
    pathologistName,
    pathologistNotes: notes,
    signedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('reports')
    .update({ content: updatedContent, status: 'final', version: (cur.version ?? 1) + 1 })
    .eq('id', id)
    .select('id, order_id, patient_id, status, pdf_url, content, version, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function uploadSignedReportHtml(reportId: string, htmlContent: string): Promise<string | null> {
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const path = `${reportId}/signed-report.html`;
  const { error } = await supabase.storage
    .from('signed-reports')
    .upload(path, blob, { contentType: 'text/html', upsert: true });
  if (error) {
    console.warn('Storage upload failed (bucket may not exist):', error.message);
    return null;
  }
  const { data } = supabase.storage.from('signed-reports').getPublicUrl(path);
  // Persist pdf_url on the report record
  await supabase.from('reports').update({ pdf_url: data.publicUrl }).eq('id', reportId);
  return data.publicUrl;
}

export async function rejectReport(id: string, reason: string): Promise<Report> {
  const { data: cur } = await supabase.from('reports').select('content').eq('id', id).single();
  const content = { ...(cur?.content as Record<string, unknown> ?? {}), rejectionReason: reason };
  const { data, error } = await supabase
    .from('reports')
    .update({ content, status: 'draft' })
    .eq('id', id)
    .select('id, order_id, patient_id, status, pdf_url, content, version, created_at')
    .single();
  if (error) throw error;
  return data;
}
