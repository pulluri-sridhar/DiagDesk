import { useState, useEffect, useRef, useMemo } from 'react';
import {
  searchPatientsHttp, registerPatient, placeOrder, fetchTests, fetchDoctors,
  type Patient, type Test, type Doctor,
} from '../lib/api';
import { accessionNumber } from '../lib/barcode';
import { useAuth } from '../lib/auth';
import Sidebar from '../components/Sidebar';

const TEAL = '#17A077';
const SLOTS = [
  '06:00 – 07:00', '07:00 – 08:00', '08:00 – 09:00', '09:00 – 10:00',
  '10:00 – 11:00', '14:00 – 15:00', '15:00 – 16:00', '16:00 – 17:00',
];
// Values must match the DB check constraint: ('cash','upi','card','credit','partial')
const PAYMENT_MODES: { value: string; label: string }[] = [
  { value: 'cash',    label: 'Cash' },
  { value: 'upi',     label: 'UPI' },
  { value: 'card',    label: 'Card / Net Banking' },
  { value: 'credit',  label: 'Credit / Insurance' },
  { value: 'partial', label: 'Partial Payment' },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

// ── Doctor Search (Google-style) ──────────────────────────────────────────────

const SPECIALIZATIONS: Record<string, string> = {
  'General Physician':    'stethoscope',
  'Cardiologist':         'favorite',
  'Neurologist':          'neurology',
  'Orthopedic':           'accessibility',
  'Gynecologist':         'pregnant_woman',
  'Pediatrician':         'child_care',
  'Dermatologist':        'dermatology',
  'Endocrinologist':      'bloodtype',
  'Gastroenterologist':   'gastroenterology',
  'Pulmonologist':        'pulmonology',
  'Nephrologist':         'waterfall_chart',
  'Oncologist':           'health_and_safety',
  'Psychiatrist':         'psychology',
  'Ophthalmologist':      'visibility',
  'ENT':                  'hearing',
};

function DoctorSearch({
  allDoctors, value, onChange,
}: {
  allDoctors: Doctor[];
  value: string;
  onChange: (label: string, doctor: Doctor | null) => void;
}) {
  const [query,    setQuery]    = useState(value);
  const [open,     setOpen]     = useState(false);
  const [focused,  setFocused]  = useState(-1);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);
  const timer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allDoctors.slice(0, 8);
    return allDoctors
      .filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.specialization ?? '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, allDoctors]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    setFocused(-1);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v, null), 200);
  }

  function pick(d: Doctor) {
    setQuery(d.name);
    setOpen(false);
    setFocused(-1);
    onChange(d.name, d);
  }

  function pickFreeText() {
    setOpen(false);
    onChange(query, null);
  }

  function handleKey(e: React.KeyboardEvent) {
    const total = results.length + (query.trim() ? 1 : 0); // +1 for free-text row
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(f => Math.min(f + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused(f => Math.max(f - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focused >= 0 && focused < results.length) pick(results[focused]);
      else if (focused === results.length) pickFreeText();
      else setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focused < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${focused}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [focused]);

  const specIcon = (spec?: string | null) =>
    SPECIALIZATIONS[spec ?? ''] ?? 'person';

  return (
    <div className="relative">
      {/* Search box */}
      <div
        className="flex items-center gap-2 border-2 rounded-2xl px-4 py-3 transition-all bg-white"
        style={{ borderColor: open ? TEAL : '#E5E7EB', boxShadow: open ? `0 0 0 3px ${TEAL}18` : 'none' }}>
        <span className="material-symbols-outlined text-gray-400 flex-shrink-0" style={{ fontSize: 20, color: open ? TEAL : '#9CA3AF' }}>
          search
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}
          onKeyDown={handleKey}
          placeholder="Search doctor name, hospital, or specialization…"
          className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder:text-gray-400"
          autoComplete="off"
        />
        {query && (
          <button
            onMouseDown={e => { e.preventDefault(); setQuery(''); onChange('', null); inputRef.current?.focus(); setOpen(true); }}
            className="text-gray-300 hover:text-gray-500 flex-shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          style={{ maxHeight: 320, overflowY: 'auto' }}>

          {/* Registered Doctors section */}
          {results.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Registered Doctors</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              {results.map((d, i) => (
                <button
                  key={d.id}
                  data-idx={i}
                  onMouseDown={() => pick(d)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{ background: focused === i ? `${TEAL}0D` : 'transparent' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: focused === i ? TEAL : '#F3F4F6' }}>
                    <span className="material-symbols-outlined"
                      style={{ fontSize: 18, color: focused === i ? 'white' : '#6B7280' }}>
                      {specIcon(d.specialization)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{d.name}</div>
                    {d.specialization && (
                      <div className="text-xs text-gray-400">{d.specialization}</div>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-gray-200 text-base flex-shrink-0">north_west</span>
                </button>
              ))}
            </>
          )}

          {/* No match in DB — free text option */}
          {results.length === 0 && query.trim() && (
            <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No doctors found</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          )}

          {/* Free-text / external option */}
          {query.trim() && (
            <button
              data-idx={results.length}
              onMouseDown={pickFreeText}
              className="w-full flex items-center gap-3 px-4 py-3 text-left border-t border-gray-100 transition-colors"
              style={{ background: focused === results.length ? '#F9FAFB' : 'transparent' }}>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-indigo-500" style={{ fontSize: 18 }}>add_circle</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-700">Use "<span className="text-indigo-600">{query}</span>"</div>
                <div className="text-xs text-gray-400">Save as external referral</div>
              </div>
            </button>
          )}

          {/* Empty state */}
          {!query.trim() && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">stethoscope</span>
              No doctors registered yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface CartTest extends Test { cartId: string }
interface SuccessInfo {
  orderId: string; invoiceNo: string; accNum: string;
  patientName: string; total: number; collectionType: string;
}

// ── Dept color dot ────────────────────────────────────────────────────────────
const DEPT_COLOR: Record<string, string> = {
  Hematology: '#9333EA', Biochemistry: '#EAB308', Endocrinology: '#EAB308',
  Coagulation: '#3B82F6', Microbiology: '#EF4444', Immunology: '#F97316',
  Glucose: '#6B7280', BloodGas: '#22C55E',
};
function deptColor(dept: string) { return DEPT_COLOR[dept] ?? '#9CA3AF'; }

function toApiGender(sex: string): 'male' | 'female' | 'other' {
  return sex === 'M' ? 'male' : sex === 'F' ? 'female' : 'other';
}

function computeDob(dob: string, age: string): string {
  if (dob) return dob;
  return `${new Date().getFullYear() - parseInt(age, 10)}-01-01`;
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = ['Patient Details', 'Tests', 'Payment'];
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((label, i) => {
        const n = i + 1;
        const done    = step > n;
        const current = step === n;
        return (
          <div key={n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${done ? 'bg-[#17A077] text-white' : current ? 'bg-[#17A077] text-white ring-4 ring-[#17A077]/20' : 'bg-gray-200 text-gray-500'}`}>
                {done ? <span className="material-symbols-outlined text-sm">check</span> : n}
              </div>
              <span className={`text-xs font-bold ${current ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-3 ${step > n ? 'bg-[#17A077]' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PatientRegistration() {
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'lab_tech';

  const [tab, setTab] = useState<'walk_in' | 'home_collection'>('walk_in');
  const [step, setStep] = useState(1);

  // ── Step 1: Patient ───────────────────────────────────────────────────────
  const [searchQ,        setSearchQ]        = useState('');
  const [searchResults,  setSearchResults]  = useState<Patient[]>([]);
  const [searching,      setSearching]      = useState(false);
  const [selectedPatient,setSelectedPatient]= useState<Patient | null>(null);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New patient fields
  const [pFirst, setPFirst] = useState('');
  const [pLast,  setPLast]  = useState('');
  const [pDob,   setPDob]   = useState('');
  const [pAge,   setPAge]   = useState('');
  const [pSex,   setPSex]   = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pAddr,  setPAddr]  = useState('');
  const [pRef,   setPRef]   = useState('');  // referring doctor label (free text fallback)
  const [isNewPatient, setIsNewPatient] = useState(false);

  // ── Doctor search ─────────────────────────────────────────────────────────
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const pName = [pFirst.trim(), pLast.trim()].filter(Boolean).join(' ');

  // ── Step 2: Tests ─────────────────────────────────────────────────────────
  const [tests,      setTests]      = useState<Test[]>([]);
  const [testSearch, setTestSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [cart,       setCart]       = useState<CartTest[]>([]);

  // ── Step 3: Payment + Home collection ─────────────────────────────────────
  const [payMode,    setPayMode]    = useState('cash');
  const [payStatus,  setPayStatus]  = useState<'paid'|'pending'|'partial'>('paid');
  const [discount,   setDiscount]   = useState('0');
  const [orderNotes, setOrderNotes] = useState('');
  const [collAddr,   setCollAddr]   = useState('');
  const [collDate,   setCollDate]   = useState(todayStr());
  const [collSlot,   setCollSlot]   = useState(SLOTS[2]);

  // ── Submit state ──────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState<SuccessInfo | null>(null);

  useEffect(() => { fetchTests().then(setTests).catch(console.error); }, []);

  useEffect(() => {
    fetchDoctors().then(setDoctors).catch(() => setDoctors([]));
  }, []);

  // Debounced patient search
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!searchQ.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    searchRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchPatientsHttp(searchQ);
        setSearchResults(res);
        setShowDropdown(true);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [searchQ]);

  // Compute age from DOB
  useEffect(() => {
    if (!pDob) return;
    const diff = Date.now() - new Date(pDob).getTime();
    setPAge(String(Math.floor(diff / (365.25 * 24 * 3600 * 1000))));
  }, [pDob]);

  const departments = useMemo(() => ['All', ...Array.from(new Set(tests.map(t => t.department))).sort()], [tests]);
  const filteredTests = useMemo(() => {
    const q = testSearch.toLowerCase();
    return tests.filter(t => {
      const deptOk = deptFilter === 'All' || t.department === deptFilter;
      const nameOk = !q || t.name.toLowerCase().includes(q) || t.department.toLowerCase().includes(q);
      return deptOk && nameOk;
    });
  }, [tests, testSearch, deptFilter]);

  const subtotal    = cart.reduce((s, t) => s + t.price, 0);
  const discountAmt = Math.round(subtotal * (parseFloat(discount) || 0) / 100);
  const total       = subtotal - discountAmt;

  // ── Patient actions ───────────────────────────────────────────────────────

  function selectExistingPatient(p: Patient) {
    setSelectedPatient(p);
    setIsNewPatient(false);
    setSearchQ(p.name);
    setShowDropdown(false);
    if (tab === 'home_collection') setCollAddr(p.address ?? '');
  }

  function startNewPatient() {
    setSelectedPatient(null);
    setIsNewPatient(true);
    setShowDropdown(false);
    // Pre-fill first name from whatever was typed in search
    const parts = searchQ.trim().split(' ');
    setPFirst(parts[0] ?? '');
    setPLast(parts.slice(1).join(' '));
    setSearchQ('');
  }

  function clearPatient() {
    setSelectedPatient(null);
    setIsNewPatient(false);
    setSearchQ('');
    setPFirst(''); setPLast(''); setPDob(''); setPAge(''); setPSex('');
    setPPhone(''); setPEmail(''); setPAddr(''); setPRef('');
  }

  function clearDoctor() {
    setPRef('');
  }

  // ── Step navigation ───────────────────────────────────────────────────────

  // True when the inline new-patient form is in use (either explicitly via search→"Register" or just by filling name)
  const registeringNew = isNewPatient || (!selectedPatient && pFirst.trim() !== '');

  function validateStep1(): string | null {
    if (!registeringNew && !selectedPatient) return 'Please search for an existing patient or fill in the patient details below.';
    if (registeringNew) {
      if (!pFirst.trim()) return 'First name is required.';
      if (!pPhone.trim()) return 'Phone number is required.';
      const digits = pPhone.replace(/\D/g, '');
      const norm = digits.length === 10 ? `+91${digits}`
                 : digits.length === 11 && digits.startsWith('0') ? `+91${digits.slice(1)}`
                 : digits.length === 12 && digits.startsWith('91') ? `+${digits}`
                 : pPhone;
      if (!/^\+91[6-9][0-9]{9}$/.test(norm))
        return 'Phone must be a 10-digit Indian mobile number starting with 6–9 (e.g. 9876543210).';
      if (!pSex) return 'Gender is required.';
      if (!pDob && !pAge.trim()) return 'Date of birth or age is required.';
    }
    return null;
  }

  function validateStep2(): string | null {
    if (cart.length === 0) return 'Please add at least one test.';
    return null;
  }

  function validateStep3(): string | null {
    if (tab === 'home_collection') {
      if (!collAddr.trim()) return 'Collection address is required for home visits.';
    }
    return null;
  }

  function next() {
    const err = step === 1 ? validateStep1() : step === 2 ? validateStep2() : null;
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  }

  async function handleSubmit() {
    const err = validateStep3();
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);
    try {
      let patient = selectedPatient;
      if (registeringNew) {
        patient = await registerPatient({
          firstName:   pFirst.trim(),
          lastName:    pLast.trim(),
          dateOfBirth: computeDob(pDob, pAge),
          gender:      toApiGender(pSex),
          phone:       pPhone.trim(),
          email:       pEmail.trim() || null,
          address:     pAddr.trim() || null,
        });
      }
      const placed = await placeOrder({
        patientId:     patient!.id,
        tests:         cart.map(t => ({ testId: t.id })),
        collectionType: tab,
        clinicalNotes: [orderNotes, pRef ? `Ref: ${pRef}` : ''].filter(Boolean).join(' | ') || null,
      });
      const invNo = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
      setSuccess({
        orderId:        placed.id,
        invoiceNo:      invNo,
        accNum:         placed.accessionNumber || accessionNumber(placed.id),
        patientName:    patient!.name,
        total,
        collectionType: tab,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSuccess(null); clearPatient(); clearDoctor(); setCart([]);
    setDiscount('0'); setOrderNotes('');
    setPayMode('cash'); setPayStatus('paid');
    setCollAddr(''); setCollDate(todayStr()); setCollSlot(SLOTS[2]);
    setStep(1); setError('');
  }

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen" style={{ background: '#EEF3F7', fontFamily: 'Inter, system-ui, sans-serif' }}>
        {isAdmin && <Sidebar />}
        <div className={isAdmin ? 'ml-64' : ''}>
          <div className="flex items-center justify-center min-h-screen p-8">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${TEAL}15` }}>
                  <span className="material-symbols-outlined text-4xl" style={{ color: TEAL }}>check_circle</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900">
                  {success.collectionType === 'home_collection' ? 'Home Collection Booked!' : 'Registration Complete!'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {success.collectionType === 'home_collection' ? 'A phlebotomist will visit as scheduled.' : 'Patient can proceed to the sample collection counter.'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl divide-y divide-gray-200 mb-6">
                {[
                  ['Patient', success.patientName],
                  ['Invoice No', success.invoiceNo],
                  ['Accession No', success.accNum],
                  ['Collection', success.collectionType === 'home_collection' ? 'Home Collection' : 'Walk-in'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{k}</span>
                    <span className="text-sm font-bold text-gray-800">{v}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total Amount</span>
                  <span className="text-lg font-black" style={{ color: TEAL }}>₹{success.total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <a href="/invoices" className="py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-1.5" style={{ background: TEAL }}>
                  <span className="material-symbols-outlined text-base">receipt_long</span>View Invoice
                </a>
                <a href="/reports" className="py-3 rounded-xl text-sm font-bold border-2 flex items-center justify-center gap-1.5" style={{ borderColor: TEAL, color: TEAL }}>
                  <span className="material-symbols-outlined text-base">lab_profile</span>Open Reports
                </a>
              </div>
              <button onClick={resetForm}
                className="w-full py-3 rounded-xl text-sm font-bold text-gray-600 border border-gray-200 flex items-center justify-center gap-1.5 hover:bg-gray-50">
                <span className="material-symbols-outlined text-base">person_add</span>Register Another Patient
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────

  const patientLabel = selectedPatient?.name ?? (registeringNew && pName ? pName : null);

  return (
    <div className="min-h-screen" style={{ background: '#EEF3F7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {isAdmin && <Sidebar />}

      <div className={isAdmin ? 'ml-64' : ''}>

        {/* ── Header ── */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div>
              <h1 className="text-xl font-black text-gray-900">Patient Registration</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            {/* Walk-in / Home Collection toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {([
                ['walk_in',         'storefront', 'Walk-in'] ,
                ['home_collection', 'home',       'Home Collection'],
              ] as const).map(([k, icon, label]) => (
                <button key={k} onClick={() => { setTab(k); setError(''); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                  style={{ background: tab === k ? TEAL : 'transparent', color: tab === k ? '#fff' : '#6B7280' }}>
                  <span className="material-symbols-outlined text-base">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto">
          <StepBar step={step} />

          <div className="flex gap-6">

            {/* ── MAIN PANEL ── */}
            <div className="flex-1 min-w-0">

              {/* ═══ STEP 1: Patient Details ═══ */}
              {step === 1 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2 rounded-t-2xl">
                    <span className="material-symbols-outlined text-lg" style={{ color: TEAL }}>person</span>
                    <span className="font-black text-gray-900">Patient Details</span>
                  </div>
                  <div className="p-6">

                    {/* Search existing patient */}
                    {!isNewPatient && !selectedPatient && (
                      <div className="mb-5">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Search Existing Patient</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-lg">search</span>
                          <input
                            value={searchQ}
                            onChange={e => setSearchQ(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                            placeholder="Search by name, phone or MPI…"
                            className="w-full border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]"
                          />
                          {searching && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-sm animate-spin">sync</span>
                          )}
                          {showDropdown && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 z-50 overflow-hidden">
                              {searchResults.map(p => (
                                <button key={p.id} onClick={() => selectExistingPatient(p)}
                                  className="w-full text-left px-4 py-3 hover:bg-[#17A077]/5 flex items-center gap-3 border-b border-gray-100 last:border-0">
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0" style={{ background: TEAL }}>
                                    {p.name[0]}
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm text-gray-900">{p.name}</div>
                                    <div className="text-xs text-gray-400">{p.mpi_no} · {p.age ? `${p.age}Y` : '—'} {p.sex ?? ''} · {p.phone}</div>
                                  </div>
                                  <span className="ml-auto material-symbols-outlined text-gray-300 text-base">arrow_forward_ios</span>
                                </button>
                              ))}
                              <button onClick={startNewPatient}
                                className="w-full text-left px-4 py-3 hover:bg-indigo-50 flex items-center gap-2 text-indigo-600 font-semibold text-sm bg-indigo-50/50 border-t border-indigo-100">
                                <span className="material-symbols-outlined text-base">person_add</span>
                                Register "{searchQ}" as new patient
                              </button>
                            </div>
                          )}
                        </div>
                        {searchQ && !searching && searchResults.length === 0 && (
                          <p className="text-xs text-gray-400 mt-1.5 ml-1">No existing patient found.</p>
                        )}
                      </div>
                    )}

                    {/* Selected existing patient */}
                    {selectedPatient && (
                      <div className="mb-5 flex items-center gap-4 p-4 rounded-2xl border-2" style={{ borderColor: TEAL, background: `${TEAL}08` }}>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-lg flex-shrink-0" style={{ background: TEAL }}>
                          {selectedPatient.name[0]}
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-gray-900 text-base">{selectedPatient.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{selectedPatient.mpi_no} &nbsp;·&nbsp; {selectedPatient.age ? `${selectedPatient.age}Y` : '—'} {selectedPatient.sex ?? ''} &nbsp;·&nbsp; {selectedPatient.phone}</div>
                          {selectedPatient.address && <div className="text-xs text-gray-400 mt-0.5 truncate">{selectedPatient.address}</div>}
                        </div>
                        <button onClick={clearPatient}
                          className="text-xs font-bold text-gray-500 hover:text-red-500 flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">edit</span>Change
                        </button>
                      </div>
                    )}

                    {/* New patient form */}
                    {(isNewPatient || (!selectedPatient && !searchQ)) && (
                      <>
                        {isNewPatient && (
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-indigo-500">person_add</span>
                              <span className="font-bold text-indigo-600">New Patient Registration</span>
                            </div>
                            <button onClick={clearPatient} className="text-xs text-gray-400 hover:text-red-500">Cancel</button>
                          </div>
                        )}
                        {!isNewPatient && !searchQ && (
                          <div className="mb-4 flex items-center gap-2">
                            <div className="flex-1 h-px bg-gray-200"></div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Or register new patient</span>
                            <div className="flex-1 h-px bg-gray-200"></div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">First Name <span className="text-red-400">*</span></label>
                            <input value={pFirst} onChange={e => setPFirst(e.target.value)} placeholder="e.g. Arun"
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Last Name</label>
                            <input value={pLast} onChange={e => setPLast(e.target.value)} placeholder="e.g. Krishnamurthy"
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                            <input
                              type="date"
                              value={pDob}
                              min="1900-01-01"
                              max={todayStr()}
                              onChange={e => setPDob(e.target.value)}
                              style={{ colorScheme: 'light' }}
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077] cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                              Age (years) {pDob && <span className="text-[#17A077] normal-case font-normal">auto-filled</span>}
                            </label>
                            <input
                              type="number"
                              value={pAge}
                              min="0" max="150"
                              onChange={e => setPAge(e.target.value)}
                              placeholder="or enter directly"
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sex</label>
                            <div className="flex gap-2 mt-1">
                              {['M', 'F', 'Other'].map(s => (
                                <button key={s} onClick={() => setPSex(s)}
                                  className="flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all"
                                  style={{ borderColor: pSex === s ? TEAL : '#E5E7EB', background: pSex === s ? `${TEAL}10` : 'white', color: pSex === s ? TEAL : '#6B7280' }}>
                                  {s === 'M' ? 'Male' : s === 'F' ? 'Female' : 'Other'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Phone <span className="text-red-400">*</span></label>
                            <input value={pPhone} onChange={e => setPPhone(e.target.value)} placeholder="+91 98765 43210"
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Email</label>
                            <input type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} placeholder="patient@example.com"
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Address</label>
                            <textarea value={pAddr} onChange={e => setPAddr(e.target.value)} placeholder="House No., Street, Area, City — PIN"
                              rows={2} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077] resize-none" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                              Referred By (Doctor / Hospital)
                            </label>
                            <DoctorSearch
                              allDoctors={doctors}
                              value={pRef}
                              onChange={(label, _doc) => setPRef(label)}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ═══ STEP 2: Test Selection ═══ */}
              {step === 2 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between rounded-t-2xl">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg text-purple-500">science</span>
                      <span className="font-black text-gray-900">Test Catalog</span>
                    </div>
                    {cart.length > 0 && (
                      <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2.5 py-1 rounded-full">{cart.length} selected</span>
                    )}
                  </div>

                  {/* Filters */}
                  <div className="px-6 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[180px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">search</span>
                      <input value={testSearch} onChange={e => setTestSearch(e.target.value)}
                        placeholder="Search tests…"
                        className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {departments.slice(0, 6).map(d => (
                        <button key={d} onClick={() => setDeptFilter(d)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all"
                          style={{
                            background: deptFilter === d ? deptColor(d) : 'white',
                            borderColor: deptFilter === d ? deptColor(d) : '#E5E7EB',
                            color: deptFilter === d ? 'white' : '#6B7280',
                          }}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Test list */}
                  <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
                    {filteredTests.length === 0
                      ? <div className="py-10 text-center text-gray-400 text-sm">No tests found</div>
                      : filteredTests.map(t => {
                        const inCart = !!cart.find(c => c.id === t.id);
                        return (
                          <div key={t.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: deptColor(t.department) }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                              <div className="text-xs text-gray-400">{t.department} · {t.tat_hours}h TAT</div>
                            </div>
                            <span className="text-sm font-bold text-gray-700 flex-shrink-0">₹{t.price.toLocaleString('en-IN')}</span>
                            <button onClick={() => inCart ? setCart(prev => prev.filter(c => c.id !== t.id)) : setCart(prev => [...prev, { ...t, cartId: crypto.randomUUID() }])}
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ background: inCart ? `${TEAL}15` : '#F3F4F6', color: inCart ? TEAL : '#9CA3AF' }}>
                              <span className="material-symbols-outlined text-base">{inCart ? 'check' : 'add'}</span>
                            </button>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              )}

              {/* ═══ STEP 3: Payment & Collection ═══ */}
              {step === 3 && (
                <div className="flex flex-col gap-4">

                  {/* Payment */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg text-green-500">payments</span>
                      <span className="font-black text-gray-900">Payment</span>
                    </div>
                    <div className="p-6 grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mode</label>
                        <select value={payMode} onChange={e => setPayMode(e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]">
                          {PAYMENT_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Status</label>
                        <select value={payStatus} onChange={e => setPayStatus(e.target.value as 'paid'|'pending'|'partial')}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]">
                          <option value="paid">Paid ✓</option>
                          <option value="pending">Pending</option>
                          <option value="partial">Partial</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Discount %</label>
                        <input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(e.target.value)}
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
                      </div>
                      <div className="col-span-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Remarks / Referring Doctor</label>
                        <input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="e.g. Dr. Ramesh referred, fasting confirmed"
                          className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
                      </div>
                    </div>
                  </div>

                  {/* Home collection details */}
                  {tab === 'home_collection' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-blue-500">home</span>
                        <span className="font-black text-gray-900">Home Collection Details</span>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Collection Address <span className="text-red-400">*</span></label>
                          <textarea value={collAddr} onChange={e => setCollAddr(e.target.value)}
                            placeholder="Full address with landmarks"
                            rows={3} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077] resize-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Collection Date</label>
                            <input type="date" value={collDate} min={todayStr()} onChange={e => setCollDate(e.target.value)}
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Time Slot</label>
                            <select value={collSlot} onChange={e => setCollSlot(e.target.value)}
                              className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#17A077]">
                              {SLOTS.map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-400 text-base">error</span>{error}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-3 mt-4">
                {step > 1 && (
                  <button onClick={() => { setStep(s => s - 1); setError(''); }}
                    className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                    ← Back
                  </button>
                )}
                <div className="flex-1" />
                {step < 3 ? (
                  <button onClick={next}
                    className="px-8 py-2.5 rounded-xl text-white text-sm font-black flex items-center gap-2"
                    style={{ background: TEAL }}>
                    Next →
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting}
                    className="px-8 py-2.5 rounded-xl text-white text-sm font-black flex items-center gap-2 disabled:opacity-60"
                    style={{ background: TEAL }}>
                    {submitting
                      ? <><span className="material-symbols-outlined text-base animate-spin">sync</span>Processing…</>
                      : <><span className="material-symbols-outlined text-base">{tab === 'walk_in' ? 'receipt_long' : 'home'}</span>
                          {tab === 'walk_in' ? 'Register & Generate Invoice' : 'Confirm Home Collection'}</>
                    }
                  </button>
                )}
              </div>
            </div>

            {/* ── SUMMARY SIDEBAR ── */}
            <div className="w-72 flex-shrink-0 space-y-4">

              {/* Patient card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Patient</div>
                {patientLabel ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white flex-shrink-0" style={{ background: TEAL }}>
                      {patientLabel[0]}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{patientLabel}</div>
                      {selectedPatient && <div className="text-xs text-gray-400">{selectedPatient.mpi_no}</div>}
                      {isNewPatient && pPhone && <div className="text-xs text-gray-400">{pPhone}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">Not selected yet</div>
                )}
              </div>

              {/* Tests summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Tests {cart.length > 0 && <span className="text-orange-500">({cart.length})</span>}
                </div>
                {cart.length === 0
                  ? <div className="text-sm text-gray-400 italic">No tests added</div>
                  : <div className="space-y-1.5">
                    {cart.map(t => (
                      <div key={t.cartId} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: deptColor(t.department) }} />
                          <span className="text-xs text-gray-700 truncate">{t.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-500 flex-shrink-0">₹{t.price}</span>
                      </div>
                    ))}
                  </div>
                }
                {cart.length > 0 && (
                  <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
                    {discountAmt > 0 && (
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Discount</span><span>-₹{discountAmt}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black">
                      <span>Total</span>
                      <span style={{ color: TEAL }}>₹{total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Collection type */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Collection</div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base" style={{ color: tab === 'walk_in' ? TEAL : '#3B82F6' }}>
                    {tab === 'walk_in' ? 'storefront' : 'home'}
                  </span>
                  <span className="text-sm font-bold text-gray-700">
                    {tab === 'walk_in' ? 'Walk-in (Counter)' : 'Home Collection'}
                  </span>
                </div>
                {tab === 'home_collection' && collAddr && (
                  <div className="text-xs text-gray-400 mt-1.5 leading-relaxed">{collDate} · {collSlot}</div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
