import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchPatients, fetchPatientOrders, fetchAllReports, fetchPatientByIdHttp,
  type Patient, type Order, type Report,
} from '../lib/api';
import { findTemplate, renderReportHTML } from '../lib/reportTemplates';
import Sidebar from '../components/Sidebar';

const TEAL   = '#17A077';
const PURPLE = '#7C3AED';
const LAB_INFO = {
  name:    'DiagDesk Diagnostics',
  address: '12, Health Hub, Koramangala 6th Block, Bangalore — 560095',
  phone:   '+91 80 4567 8900',
  regNo:   'KA/MED/LAB/2019/00142',
};

function reportNo(id: string): string {
  let h = 5381;
  for (const c of id) h = ((h << 5) + h) ^ c.charCodeAt(0);
  return `RPT-${new Date().getFullYear()}-${((h >>> 0) % 99999).toString().padStart(5, '0')}`;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function orderStatusChip(status: string) {
  const cfg: Record<string, { label: string; bg: string }> = {
    registered:       { label: 'Registered',    bg: '#9CA3AF' },
    sample_collected: { label: 'Sample Taken',  bg: '#6366F1' },
    processing:       { label: 'Processing',    bg: '#F59E0B' },
    pending:          { label: 'Pending',        bg: '#F59E0B' },
    collected:        { label: 'Collected',      bg: '#6366F1' },
    resulted:         { label: 'Completed',      bg: TEAL },
    reported:         { label: 'Completed',      bg: TEAL },
    delivered:        { label: 'Delivered',      bg: TEAL },
    in_review:        { label: 'With Pathologist', bg: PURPLE },
  };
  const c = cfg[status] ?? { label: status, bg: '#9CA3AF' };
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white whitespace-nowrap" style={{ background: c.bg }}>
      {c.label}
    </span>
  );
}

// ── Report Actions Panel ──────────────────────────────────────────────────────

function ReportActions({
  report, patient, order,
}: { report: Report; patient: Patient; order: Order | undefined }) {
  const [notif, setNotif] = useState<'email' | 'wa' | null>(null);

  const content  = report.content as Record<string, unknown>;
  const results  = (content.results as Record<string, string>) ?? {};
  const template = order
    ? findTemplate((order.items ?? [])[0]?.test_name ?? '', (order.items ?? [])[0]?.department ?? '')
    : null;
  const tests    = (order?.items ?? []).map(i => i.test_name).join(', ') || 'Lab Report';
  const signedBy = (content.pathologistName as string) ?? 'Pathologist';
  const signedAt = content.signedAt
    ? new Date(content.signedAt as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const rptNo    = reportNo(report.id);

  function buildHtml() {
    if (!template || !order) return '';
    return renderReportHTML({
      template, results,
      patient: { name: patient.name, age: patient.age, sex: patient.sex, phone: patient.phone, mpi_no: patient.mpi_no },
      order:   { id: order.id, ordered_at: order.ordered_at, doctor_name: order.doctor_name, notes: order.notes },
      labInfo: LAB_INFO,
      reportNo: rptNo,
      signatureDataUrl: content.pathologistSignature as string | undefined,
      pathologistName:  signedBy,
      pathologistQualification: 'MD Pathology, DNB',
      signedAt: content.signedAt as string | undefined,
    });
  }

  function openReport() {
    const html = buildHtml();
    if (!html) { alert('No template for this test — preview unavailable.'); return; }
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  function printReport() {
    const html = buildHtml();
    if (!html) { alert('No template for this test — print unavailable.'); return; }
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html); win.document.close();
    setTimeout(() => win.print(), 400);
  }

  function emailPatient() {
    const subject  = `Lab Report Ready — ${rptNo} | DiagDesk Diagnostics`;
    const body     = [
      `Dear ${patient.name},`,
      '',
      'Your lab report from DiagDesk Diagnostics is ready.',
      `Report No: ${rptNo}`,
      `Tests: ${tests}`,
      `Signed by: ${signedBy}  |  Date: ${signedAt}`,
      '',
      `For queries: ${LAB_INFO.phone}`,
      'DiagDesk Diagnostics Team',
    ].join('\n');
    const a = document.createElement('a');
    a.href = `mailto:${patient.email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    a.click();
    setNotif('email');
    setTimeout(() => setNotif(null), 4000);
  }

  function whatsApp() {
    const raw = patient.phone?.replace(/\D/g, '') ?? '';
    if (!raw) { alert(`No phone number on file for ${patient.name}.`); return; }
    const intl = raw.startsWith('91') && raw.length === 12 ? raw : `91${raw.slice(-10)}`;
    const msg  = [
      `Dear ${patient.name},`,
      '',
      'Your lab report is ready. 🔬',
      `Report No: ${rptNo}`,
      `Tests: ${tests}`,
      `✅ Signed by: ${signedBy}`,
      `📅 Date: ${signedAt}`,
      '',
      `Queries: ${LAB_INFO.phone}`,
      'DiagDesk Diagnostics, Koramangala, Bangalore',
    ].join('\n');
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    setNotif('wa');
    setTimeout(() => setNotif(null), 4000);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: `${TEAL}15` }}>
          <span className="material-symbols-outlined text-xl" style={{ color: TEAL }}>lab_profile</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 truncate">{tests}</div>
          <div className="text-xs text-gray-500 mt-0.5">{rptNo} &nbsp;·&nbsp; {signedAt}</div>
          <div className="text-xs text-gray-400">By {signedBy}</div>
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: TEAL }}>
          Signed ✓
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 px-5 pb-4 border-t border-gray-100 pt-3">
        <button onClick={openReport}
          className="flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50">
          <span className="material-symbols-outlined text-base">preview</span>View
        </button>
        <button onClick={printReport}
          className="flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-bold border-gray-200 text-gray-600 hover:bg-gray-50">
          <span className="material-symbols-outlined text-base">print</span>Print
        </button>
        <button onClick={emailPatient}
          className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-bold transition-colors ${
            notif === 'email' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-blue-200 text-blue-600 hover:bg-blue-50'
          }`}>
          <span className="material-symbols-outlined text-base">email</span>
          {notif === 'email' ? 'Sent ✓' : 'Email'}
        </button>
        <button onClick={whatsApp}
          className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-bold transition-colors ${
            notif === 'wa' ? 'bg-green-50 border-green-300 text-green-700' : 'border-green-200 text-green-600 hover:bg-green-50'
          }`}>
          <span className="material-symbols-outlined text-base">chat</span>
          {notif === 'wa' ? 'Sent ✓' : 'WhatsApp'}
        </button>
      </div>
    </div>
  );
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }
function todayStr()         { return toDateStr(new Date()); }
function weekStartStr() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return toDateStr(d);
}
function monthStartStr() {
  const d = new Date();
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}

// ── Main ──────────────────────────────────────────────────────────────────────

type DetailTab = 'orders' | 'reports';
type SortKey   = 'newest' | 'oldest' | 'name_asc' | 'name_desc' | 'age_asc' | 'age_desc';

export default function PatientRecords() {
  const [patients,      setPatients]      = useState<Patient[]>([]);
  const [allReports,    setAllReports]    = useState<Report[]>([]);
  const [selected,      setSelected]      = useState<Patient | null>(null);
  const [orders,        setOrders]        = useState<Order[]>([]);
  const [search,        setSearch]        = useState('');
  const [activeTab,     setActiveTab]     = useState<DetailTab>('orders');
  const [loading,       setLoading]       = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [sexFilter,  setSexFilter]  = useState<'all' | 'M' | 'F' | 'O'>('all');
  const [ageFrom,    setAgeFrom]    = useState('');
  const [ageTo,      setAgeTo]      = useState('');
  const [sortBy,     setSortBy]     = useState<SortKey>('newest');
  const [showFilters,setShowFilters]= useState(false);

  useEffect(() => {
    Promise.all([fetchPatients(), fetchAllReports()])
      .then(([p, r]) => { setPatients(p); setAllReports(r); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectPatient = useCallback(async (p: Patient) => {
    setSelected(p);
    setOrders([]);
    setOrdersLoading(true);
    setActiveTab('orders');
    const [o, full] = await Promise.all([
      fetchPatientOrders(p.id),
      // Enrich with email/address when loaded from Java summary (which omits those fields)
      p.email == null ? fetchPatientByIdHttp(p.id) : Promise.resolve(null),
    ]);
    setOrders(o);
    if (full) setSelected(full);
    setOrdersLoading(false);
  }, []);

  function clearFilters() {
    setDateFrom(''); setDateTo(''); setSexFilter('all');
    setAgeFrom(''); setAgeTo(''); setSortBy('newest');
  }

  function applyPreset(preset: 'today' | 'week' | 'month' | 'all') {
    if (preset === 'all') { setDateFrom(''); setDateTo(''); return; }
    const from = preset === 'today' ? todayStr() : preset === 'week' ? weekStartStr() : monthStartStr();
    setDateFrom(from); setDateTo(todayStr());
  }

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (dateFrom)            n++;
    if (dateTo)              n++;
    if (sexFilter !== 'all') n++;
    if (ageFrom)             n++;
    if (ageTo)               n++;
    if (sortBy !== 'newest') n++;
    return n;
  }, [dateFrom, dateTo, sexFilter, ageFrom, ageTo, sortBy]);

  const filtered = useMemo(() => {
    const q       = search.trim().toLowerCase();
    const fromMs  = dateFrom ? new Date(dateFrom).getTime() : null;
    const toMs    = dateTo   ? new Date(dateTo + 'T23:59:59').getTime() : null;
    const minAge  = ageFrom  ? parseInt(ageFrom, 10) : null;
    const maxAge  = ageTo    ? parseInt(ageTo,   10) : null;

    let list = patients.filter(p => {
      if (q && !(
        p.name.toLowerCase().includes(q) ||
        p.mpi_no.toLowerCase().includes(q) ||
        (p.phone ?? '').includes(q) ||
        (p.email ?? '').toLowerCase().includes(q)
      )) return false;

      if (fromMs || toMs) {
        const regMs = new Date(p.created_at).getTime();
        if (fromMs && regMs < fromMs) return false;
        if (toMs   && regMs > toMs)   return false;
      }

      if (sexFilter !== 'all' && p.sex !== sexFilter) return false;

      if (minAge !== null && (p.age ?? 0) < minAge) return false;
      if (maxAge !== null && (p.age ?? 999) > maxAge) return false;

      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name_asc':  return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'age_asc':   return (a.age ?? 0) - (b.age ?? 0);
        case 'age_desc':  return (b.age ?? 0) - (a.age ?? 0);
        default:          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return list;
  }, [patients, search, dateFrom, dateTo, sexFilter, ageFrom, ageTo, sortBy]);

  const orderMap   = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);
  const patientReports = useMemo(() =>
    allReports.filter(r => r.patient_id === selected?.id && r.status === 'final'),
    [allReports, selected]
  );
  const totalSpent = orders.reduce((s, o) => s + (o.total ?? 0), 0);
  const pendingPayment = orders
    .filter(o => o.payment_status !== 'paid')
    .reduce((s, o) => s + (o.total ?? 0), 0);

  // Header height: 73px header + optional filter panel (56px collapsed / 112px expanded)
  const filterBarH = showFilters ? 113 : 57;
  const bodyH = `calc(100vh - 73px - ${filterBarH}px)`;

  return (
    <div className="min-h-screen" style={{ background: '#EEF3F7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar />
      <div className="ml-64">

        {/* ── Header ── */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-30">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900">Patient Records</h1>
            <p className="text-sm text-gray-500">
              {loading ? 'Loading…' : (
                filtered.length < patients.length
                  ? <span><strong>{filtered.length}</strong> of {patients.length} patients</span>
                  : <span>{patients.length} patients registered</span>
              )}
            </p>
          </div>

          {/* Search */}
          <div className="relative w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name · Phone · MPI · Email"
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-colors relative"
            style={{
              borderColor: activeFilterCount > 0 ? TEAL : '#E5E7EB',
              color:       activeFilterCount > 0 ? TEAL : '#374151',
              background:  activeFilterCount > 0 ? `${TEAL}08` : 'white',
            }}>
            <span className="material-symbols-outlined text-base">tune</span>
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center"
                style={{ background: TEAL }}>
                {activeFilterCount}
              </span>
            )}
            <span className="material-symbols-outlined text-sm">{showFilters ? 'expand_less' : 'expand_more'}</span>
          </button>
        </header>

        {/* ── Filter bar ── */}
        <div className="bg-white border-b border-gray-200 sticky z-20" style={{ top: 73 }}>
          {/* Quick presets — always visible */}
          <div className="px-6 py-2 flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Quick:</span>
            {([
              ['today', 'Today'],
              ['week',  'This Week'],
              ['month', 'This Month'],
              ['all',   'All Time'],
            ] as const).map(([preset, label]) => {
              const active =
                preset === 'today' ? dateFrom === todayStr() && dateTo === todayStr() :
                preset === 'week'  ? dateFrom === weekStartStr() && dateTo === todayStr() :
                preset === 'month' ? dateFrom === monthStartStr() && dateTo === todayStr() :
                !dateFrom && !dateTo;
              return (
                <button key={preset} onClick={() => applyPreset(preset)}
                  className="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                  style={{
                    background: active ? TEAL : '#F3F4F6',
                    color:      active ? 'white' : '#6B7280',
                  }}>
                  {label}
                </button>
              );
            })}

            {activeFilterCount > 0 && (
              <button onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700">
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                Clear all ({activeFilterCount})
              </button>
            )}
          </div>

          {/* Expanded filter row */}
          {showFilters && (
            <div className="px-6 pb-3 pt-1 border-t border-gray-100 flex flex-wrap items-end gap-4">

              {/* Registration date range */}
              <div className="flex items-end gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Registered From
                  </label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                <span className="text-gray-400 mb-2">—</span>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    min={dateFrom || undefined}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
              </div>

              {/* Sex */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Sex</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  {(['all', 'M', 'F', 'O'] as const).map(s => (
                    <button key={s}
                      onClick={() => setSexFilter(s)}
                      className="px-3 py-1.5 text-xs font-bold transition-colors border-r last:border-r-0 border-gray-200"
                      style={{
                        background: sexFilter === s ? TEAL : 'white',
                        color:      sexFilter === s ? 'white' : '#6B7280',
                      }}>
                      {s === 'all' ? 'All' : s === 'M' ? 'Male' : s === 'F' ? 'Female' : 'Other'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age range */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Age Range (yrs)
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" value={ageFrom} onChange={e => setAgeFrom(e.target.value)}
                    placeholder="Min" min={0} max={150}
                    className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <span className="text-gray-400">—</span>
                  <input type="number" value={ageTo} onChange={e => setAgeTo(e.target.value)}
                    placeholder="Max" min={0} max={150}
                    className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                  <option value="newest">Newest registered</option>
                  <option value="oldest">Oldest registered</option>
                  <option value="name_asc">Name A → Z</option>
                  <option value="name_desc">Name Z → A</option>
                  <option value="age_asc">Age (youngest first)</option>
                  <option value="age_desc">Age (oldest first)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── Active filter chips ── */}
        {activeFilterCount > 0 && (
          <div className="bg-teal-50 border-b border-teal-100 px-6 py-1.5 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-teal-600">Active filters:</span>
            {(dateFrom || dateTo) && (
              <span className="text-xs bg-white border border-teal-200 text-teal-700 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">calendar_today</span>
                {dateFrom || '—'} → {dateTo || '—'}
                <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="ml-1 text-teal-400 hover:text-teal-600">×</button>
              </span>
            )}
            {sexFilter !== 'all' && (
              <span className="text-xs bg-white border border-teal-200 text-teal-700 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                Sex: {sexFilter === 'M' ? 'Male' : sexFilter === 'F' ? 'Female' : 'Other'}
                <button onClick={() => setSexFilter('all')} className="ml-1 text-teal-400 hover:text-teal-600">×</button>
              </span>
            )}
            {(ageFrom || ageTo) && (
              <span className="text-xs bg-white border border-teal-200 text-teal-700 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                Age: {ageFrom || '0'}–{ageTo || '∞'} yrs
                <button onClick={() => { setAgeFrom(''); setAgeTo(''); }} className="ml-1 text-teal-400 hover:text-teal-600">×</button>
              </span>
            )}
            {sortBy !== 'newest' && (
              <span className="text-xs bg-white border border-teal-200 text-teal-700 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                Sort: {sortBy.replace('_', ' ')}
                <button onClick={() => setSortBy('newest')} className="ml-1 text-teal-400 hover:text-teal-600">×</button>
              </span>
            )}
          </div>
        )}

        <div className="flex" style={{ height: bodyH }}>

          {/* ── LEFT: Patient list ── */}
          <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <span className="material-symbols-outlined animate-spin mr-2">sync</span>Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm px-4">
                <span className="material-symbols-outlined text-4xl mb-2 block opacity-30">person_search</span>
                <div className="font-bold mb-1">No patients found</div>
                {(search || activeFilterCount > 0) && (
                  <button onClick={() => { setSearch(''); clearFilters(); }}
                    className="text-xs text-teal-600 hover:underline font-bold">
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {filtered.map(p => {
                  const pReports   = allReports.filter(r => r.patient_id === p.id && r.status === 'final');
                  const isSelected = selected?.id === p.id;
                  const regDate    = new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                  return (
                    <button key={p.id}
                      onClick={() => selectPatient(p)}
                      className="w-full text-left rounded-xl px-3.5 py-3 transition-all border-2"
                      style={{
                        background:  isSelected ? `${TEAL}08` : 'transparent',
                        borderColor: isSelected ? TEAL : 'transparent',
                      }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                          style={{ background: TEAL }}>
                          {initials(p.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 text-sm truncate">{p.name}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{p.mpi_no}</div>
                        </div>
                        {pReports.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                            style={{ background: TEAL }}>
                            {pReports.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 pl-10 flex-wrap">
                        {p.age  && <span className="text-[10px] text-gray-400">{p.age}Y</span>}
                        {p.sex  && <span className="text-[10px] text-gray-400">· {p.sex === 'M' ? 'Male' : p.sex === 'F' ? 'Female' : 'Other'}</span>}
                        {p.phone && <span className="text-[10px] text-gray-400">· {p.phone}</span>}
                        <span className="text-[10px] text-gray-300 ml-auto">{regDate}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── RIGHT: Patient detail ── */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: `${TEAL}15` }}>
                  <span className="material-symbols-outlined text-4xl" style={{ color: TEAL }}>person_search</span>
                </div>
                <h3 className="text-lg font-black text-gray-400 mb-2">Select a Patient</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Choose a patient from the list to view their profile, order history, and reports.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-5 max-w-3xl">

                {/* Profile card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 flex items-start gap-5"
                    style={{ background: `linear-gradient(135deg, ${TEAL}08, ${TEAL}04)` }}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                      style={{ background: TEAL }}>
                      {initials(selected.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-black text-gray-900">{selected.name}</h2>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-600">
                        {selected.age  && <span>{selected.age} yrs</span>}
                        {selected.sex  && <span>· {selected.sex}</span>}
                        {selected.phone && (
                          <a href={`tel:${selected.phone}`} className="flex items-center gap-1 hover:text-teal-600">
                            <span className="material-symbols-outlined text-sm">phone</span>{selected.phone}
                          </a>
                        )}
                        {selected.email && (
                          <a href={`mailto:${selected.email}`} className="flex items-center gap-1 hover:text-teal-600 truncate">
                            <span className="material-symbols-outlined text-sm">email</span>{selected.email}
                          </a>
                        )}
                      </div>
                      {selected.address && (
                        <div className="text-xs text-gray-400 mt-1 flex items-start gap-1">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          {selected.address}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">MPI No.</div>
                      <div className="font-mono font-bold text-gray-700 text-sm">{selected.mpi_no}</div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-4 divide-x divide-gray-100 border-t border-gray-100">
                    {[
                      { label: 'Total Orders',  value: orders.length,           color: '#374151' },
                      { label: 'Total Spent',   value: `₹${totalSpent.toLocaleString('en-IN')}`, color: TEAL },
                      { label: 'Reports Ready', value: patientReports.length,   color: TEAL },
                      { label: 'Pending Amt',   value: pendingPayment > 0 ? `₹${pendingPayment.toLocaleString('en-IN')}` : '—', color: pendingPayment > 0 ? '#EF4444' : '#9CA3AF' },
                    ].map(s => (
                      <div key={s.label} className="px-4 py-3 text-center">
                        <div className="text-lg font-black" style={{ color: s.color }}>{ordersLoading ? '…' : s.value}</div>
                        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => selected.phone && window.open(`tel:${selected.phone}`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                    <span className="material-symbols-outlined text-sm">phone</span>Call
                  </button>
                  <button
                    onClick={() => {
                      if (!selected.phone) { alert('No phone on file.'); return; }
                      const raw = selected.phone.replace(/\D/g, '');
                      const intl = raw.startsWith('91') && raw.length === 12 ? raw : `91${raw.slice(-10)}`;
                      window.open(`https://wa.me/${intl}`, '_blank', 'noopener');
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-200 text-sm font-bold text-green-700 hover:bg-green-50">
                    <span className="material-symbols-outlined text-sm">chat</span>WhatsApp
                  </button>
                  <button
                    onClick={() => selected.email && window.open(`mailto:${selected.email}`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-200 text-sm font-bold text-blue-700 hover:bg-blue-50">
                    <span className="material-symbols-outlined text-sm">email</span>Email
                  </button>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="flex border-b border-gray-200">
                    {([
                      ['orders',  'Order History', orders.length,         '#374151'],
                      ['reports', 'Reports',       patientReports.length, TEAL],
                    ] as const).map(([k, label, count, color]) => (
                      <button key={k}
                        onClick={() => setActiveTab(k)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold border-b-2 transition-colors"
                        style={{
                          borderBottomColor: activeTab === k ? color : 'transparent',
                          color: activeTab === k ? color : '#9CA3AF',
                        }}>
                        {label}
                        {count > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ background: color }}>
                            {count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="p-4">
                    {ordersLoading ? (
                      <div className="text-center py-8 text-gray-400">
                        <span className="material-symbols-outlined animate-spin block mb-2">sync</span>
                        Loading records…
                      </div>
                    ) : activeTab === 'orders' ? (
                      orders.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">No orders found for this patient.</div>
                      ) : (
                        <div className="space-y-2">
                          {orders.map(o => {
                            const tests  = (o.items ?? []).map(i => i.test_name).join(' · ');
                            const rpt    = allReports.find(r => r.order_id === o.id && r.status === 'final');
                            const hasRpt = !!rpt;
                            return (
                              <div key={o.id}
                                className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: hasRpt ? `${TEAL}15` : '#F3F4F6' }}>
                                  <span className="material-symbols-outlined text-xl" style={{ color: hasRpt ? TEAL : '#9CA3AF' }}>
                                    {hasRpt ? 'lab_profile' : 'science'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-gray-900 text-sm truncate">{tests}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {new Date(o.ordered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    {o.doctor_name && ` · Dr. ${o.doctor_name}`}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                      o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {o.payment_status === 'paid' ? 'Paid' : 'Unpaid'} · ₹{o.total?.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                  {orderStatusChip(rpt ? 'resulted' : o.status)}
                                  {hasRpt && (
                                    <button
                                      onClick={() => setActiveTab('reports')}
                                      className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-0.5">
                                      <span className="material-symbols-outlined text-xs">lab_profile</span>
                                      View Report
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      /* Reports tab */
                      patientReports.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          <span className="material-symbols-outlined text-3xl mb-2 block opacity-30">lab_profile</span>
                          No signed reports yet for this patient.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {patientReports.map(r => (
                            <ReportActions
                              key={r.id}
                              report={r}
                              patient={selected}
                              order={orderMap.get(r.order_id)}
                            />
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
