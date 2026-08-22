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

async function fetchPatientsHttp(): Promise<Patient[]> {
  const res = await fetch('/v1/patients?size=200', {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  if (!res.ok) return [];
  const body = await res.json();
  const rows: any[] = body.data ?? [];
  return rows.map(r => {
    const genderMap: Record<string, string> = { male: 'M', female: 'F', other: 'O' };
    return {
      id:         r.patientId,
      mpi_no:     r.uhid,
      name:       r.name,
      age:        r.dob ? Math.floor((Date.now() - new Date(r.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null,
      sex:        genderMap[r.gender ?? ''] ?? null,
      phone:      r.phone ?? null,
      email:      null,
      address:    null,
      created_at: r.createdAt ?? '',
    };
  });
}

export async function fetchPatients(): Promise<Patient[]> {
  try {
    const patients = await fetchPatientsHttp();
    if (patients.length > 0) return patients;
  } catch { /* fall through */ }
  const { data, error } = await supabase
    .from('patients')
    .select('id, mpi_no, name, age, sex, phone, email, address, created_at')
    .eq('tenant_id', TENANT_ID)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

async function fetchPatientOrdersHttp(patientId: string): Promise<Order[]> {
  const res = await fetch(`/v1/orders?patient_id=${encodeURIComponent(patientId)}&size=100`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  if (!res.ok) return [];
  const body = await res.json();
  const rows: any[] = body.data ?? [];
  const testMap = new Map(LOCAL_TESTS.map(t => [t.id, t]));
  return rows.map(r => {
    const items = (r.items ?? []).map((i: any) => {
      const test = testMap.get(i.testId);
      return {
        test_id:    i.testId,
        test_name:  test?.name ?? i.testId,
        department: test?.department ?? '—',
        price:      test?.price ?? 0,
        status:     i.status,
        result:     null,
      };
    });
    const subtotal = items.reduce((s: number, t: any) => s + t.price, 0);
    return {
      id:               r.orderId,
      patient_id:       r.patientId,
      assigned_to:      null,
      doctor_id:        null,
      status:           r.status,
      items,
      subtotal,
      discount:         0,
      total:            subtotal,
      payment_mode:     null,
      payment_status:   'pending',
      notes:            r.clinicalNotes ?? null,
      ordered_at:       r.createdAt,
      patient_name:     null,
      doctor_name:      r.referredByDoctorId ?? null,
      phlebotomist_name: null,
    } as Order;
  });
}

export async function fetchPatientOrders(patientId: string): Promise<Order[]> {
  try {
    const orders = await fetchPatientOrdersHttp(patientId);
    if (orders.length > 0) return orders;
  } catch { /* fall through */ }
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

// Fallback when catalog-service is unreachable.
const LOCAL_TESTS: Test[] = [
  { id: 'CBC-001',  code: 'CBC',    name: 'Complete Blood Count (CBC)',         department: 'Hematology',     price: 250,  tat_hours: 4,  active: true },
  { id: 'ESR-001',  code: 'ESR',    name: 'ESR (Erythrocyte Sedimentation Rate)', department: 'Hematology',   price: 80,   tat_hours: 2,  active: true },
  { id: 'LFT-001',  code: 'LFT',    name: 'Liver Function Tests (LFT)',         department: 'Biochemistry',   price: 350,  tat_hours: 12, active: true },
  { id: 'KFT-001',  code: 'KFT',    name: 'Kidney Function Tests (KFT)',        department: 'Biochemistry',   price: 300,  tat_hours: 8,  active: true },
  { id: 'FBS-001',  code: 'FBS',    name: 'Blood Glucose — Fasting',            department: 'Biochemistry',   price: 80,   tat_hours: 2,  active: true },
  { id: 'HBA-001',  code: 'HBA1C',  name: 'HbA1c (Glycated Haemoglobin)',       department: 'Biochemistry',   price: 350,  tat_hours: 8,  active: true },
  { id: 'LIP-001',  code: 'LIPID',  name: 'Lipid Profile',                      department: 'Biochemistry',   price: 300,  tat_hours: 12, active: true },
  { id: 'ELC-001',  code: 'ELEC',   name: 'Serum Electrolytes (Na, K, Cl)',     department: 'Biochemistry',   price: 200,  tat_hours: 6,  active: true },
  { id: 'CRP-001',  code: 'CRP',    name: 'CRP (C-Reactive Protein)',           department: 'Biochemistry',   price: 300,  tat_hours: 6,  active: true },
  { id: 'VIT-D01',  code: 'VITD',   name: 'Vitamin D (25-OH)',                  department: 'Endocrinology',  price: 800,  tat_hours: 24, active: true },
  { id: 'B12-001',  code: 'B12',    name: 'Vitamin B12',                        department: 'Biochemistry',   price: 600,  tat_hours: 24, active: true },
  { id: 'TSH-001',  code: 'TSH',    name: 'Thyroid Panel (TSH, T3, T4)',        department: 'Endocrinology',  price: 450,  tat_hours: 24, active: true },
  { id: 'COA-001',  code: 'COAG',   name: 'Coagulation Profile (PT/INR, APTT)', department: 'Coagulation',   price: 500,  tat_hours: 6,  active: true },
  { id: 'DDM-001',  code: 'DDIMER', name: 'D-Dimer',                            department: 'Coagulation',    price: 700,  tat_hours: 4,  active: true },
  { id: 'BCU-001',  code: 'BCUL',   name: 'Blood Culture',                      department: 'Microbiology',   price: 800,  tat_hours: 48, active: true },
  { id: 'WID-001',  code: 'WIDAL',  name: 'Widal Test',                         department: 'Microbiology',   price: 150,  tat_hours: 4,  active: true },
  { id: 'DEN-001',  code: 'DENGUE', name: 'Dengue NS1 Antigen',                 department: 'Immunology',     price: 600,  tat_hours: 6,  active: true },
  { id: 'MAL-001',  code: 'MAL',    name: 'Malaria Antigen Test',               department: 'Immunology',     price: 300,  tat_hours: 2,  active: true },
  { id: 'HBS-001',  code: 'HBSAG',  name: 'HBsAg (Hepatitis B Surface Antigen)', department: 'Immunology',   price: 200,  tat_hours: 4,  active: true },
  { id: 'HIV-001',  code: 'HIV',    name: 'HIV 1 & 2 Antibody',                 department: 'Immunology',     price: 400,  tat_hours: 4,  active: true },
  { id: 'TRP-001',  code: 'TROP',   name: 'Troponin I (Cardiac)',               department: 'Biochemistry',   price: 800,  tat_hours: 2,  active: true },
  { id: 'PSA-001',  code: 'PSA',    name: 'PSA (Prostate Specific Antigen)',     department: 'Immunology',     price: 600,  tat_hours: 24, active: true },
  { id: 'IRN-001',  code: 'IRON',   name: 'Iron Studies (Serum Iron, TIBC, Ferritin)', department: 'Biochemistry', price: 400, tat_hours: 8, active: true },
  { id: 'PCT-001',  code: 'PCT',    name: 'Procalcitonin (PCT)',                 department: 'Biochemistry',   price: 1200, tat_hours: 8,  active: true },
  { id: 'URN-001',  code: 'URINE',  name: 'Urine Routine & Microscopy',         department: 'Biochemistry',   price: 100,  tat_hours: 4,  active: true },
];

export async function fetchTests(): Promise<Test[]> {
  // Try catalog-service first (real data with live prices).
  try {
    const res = await fetch('/v1/tests?size=100', {
      headers: { 'X-Tenant-Id': TENANT_ID },
    });
    if (res.ok) {
      const body = await res.json();
      const items: any[] = body.data ?? body;
      if (items.length > 0) {
        return items.map((t: any) => ({
          id:        t.testId,
          code:      t.code,
          name:      t.name,
          department: t.department ?? '',
          price:     Number(t.price ?? 0),
          tat_hours: t.tatHours ?? 0,
          active:    true,
        }));
      }
    }
  } catch {
    // catalog-service unreachable — fall through
  }
  // Supabase fallback
  try {
    const { data, error } = await supabase
      .from('tests')
      .select('id, code, name, department, price, tat_hours, active')
      .eq('tenant_id', TENANT_ID)
      .eq('active', true)
      .order('name');
    if (error) throw error;
    if (data && data.length > 0) return data;
  } catch {
    // Supabase unreachable — fall through to local seed
  }
  return LOCAL_TESTS;
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

// ── Java service calls (via Vite proxy → patient-service:8081, order-service:8083) ──

const DEFAULT_BRANCH_ID = '00000000-0000-0000-0000-000000000001';

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return raw.trim();
}

export interface RegisterPatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;  // YYYY-MM-DD
  gender: string;       // "male" | "female" | "other"
  phone: string;
  email?: string | null;
  address?: string | null;
}

export async function registerPatient(input: RegisterPatientInput): Promise<Patient> {
  const body: Record<string, unknown> = {
    firstName:   input.firstName,
    lastName:    input.lastName || '.',
    dateOfBirth: input.dateOfBirth,
    gender:      input.gender,
    phone:       normalizePhone(input.phone),
  };
  if (input.email?.trim())   body.email = input.email.trim();
  if (input.address?.trim()) body.address = { line1: input.address.trim() };

  const res = await fetch('/v1/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const details = err.error?.details?.map((d: any) => `${d.field}: ${d.message}`).join('; ');
    throw new Error(details ?? err.error?.message ?? err.message ?? `Patient registration failed (HTTP ${res.status})`);
  }
  const data = await res.json();
  return {
    id:         data.patientId,
    mpi_no:     data.uhid,
    name:       [input.firstName, input.lastName].filter(Boolean).join(' '),
    age:        null,
    sex:        null,
    phone:      input.phone,
    email:      input.email ?? null,
    address:    input.address ?? null,
    created_at: data.createdAt ?? new Date().toISOString(),
  };
}

export async function searchPatientsHttp(query: string): Promise<Patient[]> {
  if (!query.trim()) return [];
  const res = await fetch(`/v1/patients?q=${encodeURIComponent(query)}&size=10`);
  if (!res.ok) return [];
  const data = await res.json();
  const rows: any[] = data.data ?? [];
  return rows.map(r => ({
    id:         r.patientId,
    mpi_no:     r.uhid,
    name:       r.name,
    age:        r.dob ? Math.floor((Date.now() - new Date(r.dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : null,
    sex:        null,
    phone:      r.phone ?? null,
    email:      null,
    address:    null,
    created_at: '',
  }));
}

export interface PlaceOrderResult {
  id: string;
  orderNumber: string;
  accessionNumber: string;
}

export async function placeOrder(data: {
  patientId: string;
  tests: { testId: string }[];
  collectionType: string;
  clinicalNotes?: string | null;
}): Promise<PlaceOrderResult> {
  const res = await fetch('/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify({
      patientId:      data.patientId,
      branchId:       DEFAULT_BRANCH_ID,
      tests:          data.tests,
      collectionType: data.collectionType,
      clinicalNotes:  data.clinicalNotes ?? null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? err.error ?? `Order creation failed (HTTP ${res.status})`);
  }
  const resp = await res.json();
  return {
    id:              resp.orderId,
    orderNumber:     resp.orderNumber,
    accessionNumber: resp.accessionNumbers?.[0] ?? '',
  };
}

export async function fetchOrdersHttp(): Promise<Order[]> {
  const res = await fetch('/v1/orders?page=0&size=100');
  if (!res.ok) return [];
  const data = await res.json();
  const rows: any[] = data.data ?? [];
  const testMap = new Map(LOCAL_TESTS.map(t => [t.id, t]));
  return rows.map(r => {
    const items = (r.items ?? []).map((i: any) => {
      const test = testMap.get(i.testId);
      return {
        test_id:    i.testId,
        test_name:  test?.name  ?? i.testId,
        department: test?.department ?? '—',
        price:      test?.price ?? 0,
        status:     i.status,
        result:     null,
      };
    });
    const subtotal = items.reduce((s: number, t: any) => s + t.price, 0);
    return {
      id:               r.orderId,
      patient_id:       r.patientId,
      assigned_to:      null,
      doctor_id:        null,
      status:           r.status,
      items,
      subtotal,
      discount:         0,
      total:            subtotal,
      payment_mode:     null,
      payment_status:   'pending',
      notes:            r.clinicalNotes ?? null,
      ordered_at:       r.createdAt,
      patient_name:     null,
      patient_phone:    null,
      patient_age:      null,
      patient_sex:      null,
      doctor_name:      null,
      phlebotomist_name: null,
    } as Order;
  });
}

export async function fetchPatientByIdHttp(patientId: string): Promise<Patient | null> {
  const res = await fetch(`/v1/patients/${patientId}`);
  if (!res.ok) return null;
  const r = await res.json();
  const name = [r.firstName, r.lastName].filter((s: string) => s && s !== '.').join(' ');
  const age  = r.dateOfBirth
    ? Math.floor((Date.now() - new Date(r.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  return {
    id:         r.patientId,
    mpi_no:     r.uhid,
    name,
    age,
    sex:        r.gender === 'male' ? 'M' : r.gender === 'female' ? 'F' : 'Other',
    phone:      r.phone ?? null,
    email:      r.email ?? null,
    address:    r.address?.line1 ?? null,
    created_at: r.createdAt ?? '',
  };
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
