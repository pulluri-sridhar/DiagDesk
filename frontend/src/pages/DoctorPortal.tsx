import { useState, useEffect, useMemo } from 'react';
import { fetchOrders, fetchPatients, type Order, type Patient } from '../lib/api';
import Sidebar from '../components/Sidebar';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, string> = {
  registered:       'bg-blue-100 text-blue-700',
  sample_collected: 'bg-blue-100 text-blue-700',
  processing:       'bg-amber-100 text-amber-700',
  resulted:         'bg-[#17A077]/10 text-[#0D9460]',
  reported:         'bg-[#17A077]/10 text-[#0D9460]',
  delivered:        'bg-[#17A077]/20 text-[#0D9460]',
  cancelled:        'bg-red-100 text-red-600',
};

const STATUS_LABEL: Record<string, string> = {
  registered: 'Registered', sample_collected: 'Collecting',
  processing: 'Processing', resulted: 'Resulted',
  reported: 'Reported', delivered: 'Delivered', cancelled: 'Cancelled',
};

const PAY_STATUS_CHIP: Record<string, string> = {
  paid:    'bg-[#17A077]/10 text-[#0D9460]',
  pending: 'bg-amber-100 text-amber-700',
  partial: 'bg-orange-100 text-orange-600',
};

function extractRegion(address: string | null | undefined): string {
  if (!address) return 'Unknown';
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[1];
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || 'Unknown';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toCSV(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = rows.map(r =>
    headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DoctorPortal() {
  const [orders, setOrders]     = useState<Order[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading]   = useState(true);

  // filters
  const [search, setSearch]           = useState('');
  const [filterDoctor, setFilterDoctor]     = useState('all');
  const [filterRegion, setFilterRegion]     = useState('all');
  const [filterDept, setFilterDept]         = useState('all');
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterPayStatus, setFilterPayStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  // load
  useEffect(() => {
    Promise.all([fetchOrders(), fetchPatients()])
      .then(([ords, pats]) => { setOrders(ords); setPatients(pats); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // patient lookup map for address / demographic enrichment
  const patientMap = useMemo(() => {
    const m = new Map<string, Patient>();
    patients.forEach(p => m.set(p.id, p));
    return m;
  }, [patients]);

  // filter option lists
  const doctors = useMemo(() =>
    ['all', ...Array.from(new Set(orders.map(o => o.doctor_name).filter(Boolean))).sort() as string[]],
    [orders]);

  const departments = useMemo(() =>
    ['all', ...Array.from(new Set(orders.flatMap(o => (o.items ?? []).map(i => i.department)).filter(Boolean))).sort()],
    [orders]);

  const regions = useMemo(() => {
    const s = new Set<string>();
    patients.forEach(p => { if (p.address) s.add(extractRegion(p.address)); });
    // also check orders that have patients not yet fetched
    return ['all', ...Array.from(s).sort()];
  }, [patients]);

  // date preset helper
  function applyPreset(preset: 'week' | 'month' | 'quarter' | 'year') {
    const to = new Date();
    const from = new Date();
    if (preset === 'week')    from.setDate(from.getDate() - 7);
    else if (preset === 'month')   from.setMonth(from.getMonth() - 1);
    else if (preset === 'quarter') from.setMonth(from.getMonth() - 3);
    else from.setFullYear(from.getFullYear() - 1);
    setDateFrom(isoDate(from));
    setDateTo(isoDate(to));
  }

  function clearFilters() {
    setSearch(''); setFilterDoctor('all'); setFilterRegion('all');
    setFilterDept('all'); setFilterStatus('all'); setFilterPayStatus('all');
    setDateFrom(''); setDateTo('');
  }

  const hasFilters = search || filterDoctor !== 'all' || filterRegion !== 'all' ||
    filterDept !== 'all' || filterStatus !== 'all' || filterPayStatus !== 'all' ||
    dateFrom || dateTo;

  // filtered results
  const filtered = useMemo(() => {
    return orders.filter(o => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const hit = (o.patient_name ?? '').toLowerCase().includes(q) ||
          (o.doctor_name ?? '').toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          (o.items ?? []).some(i => i.test_name.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (filterDoctor !== 'all' && o.doctor_name !== filterDoctor) return false;
      if (filterDept !== 'all') {
        if (!(o.items ?? []).some(i => i.department === filterDept)) return false;
      }
      if (filterStatus !== 'all') {
        if (filterStatus === 'pending' && !['registered','sample_collected','processing'].includes(o.status)) return false;
        else if (filterStatus === 'completed' && !['resulted','reported','delivered'].includes(o.status)) return false;
        else if (!['pending','completed'].includes(filterStatus) && o.status !== filterStatus) return false;
      }
      if (filterPayStatus !== 'all' && o.payment_status !== filterPayStatus) return false;
      if (filterRegion !== 'all') {
        const p = patientMap.get(o.patient_id);
        if (extractRegion(p?.address) !== filterRegion) return false;
      }
      if (dateFrom && o.ordered_at.slice(0, 10) < dateFrom) return false;
      if (dateTo   && o.ordered_at.slice(0, 10) > dateTo)   return false;
      return true;
    });
  }, [orders, search, filterDoctor, filterRegion, filterDept, filterStatus, filterPayStatus, dateFrom, dateTo, patientMap]);

  // summary stats from filtered set
  const stats = useMemo(() => {
    const pending   = filtered.filter(o => ['registered','sample_collected','processing'].includes(o.status)).length;
    const completed = filtered.filter(o => ['resulted','reported','delivered'].includes(o.status)).length;
    const revenue   = filtered.reduce((s, o) => s + (o.total ?? 0), 0);
    const uniqueDocs = new Set(filtered.map(o => o.doctor_name).filter(Boolean)).size;
    return { pending, completed, revenue, uniqueDocs };
  }, [filtered]);

  // CSV download
  function downloadCSV() {
    const rows = filtered.map(o => {
      const p = patientMap.get(o.patient_id);
      const depts = [...new Set((o.items ?? []).map(i => i.department).filter(Boolean))].join('; ');
      const tests  = (o.items ?? []).map(i => i.test_name).join('; ');
      const age    = o.patient_age ?? p?.age ?? '';
      const sex    = o.patient_sex ?? p?.sex ?? '';
      const phone  = o.patient_phone ?? p?.phone ?? '';
      const location = extractRegion(p?.address);
      return {
        'Order ID':       o.id.slice(0, 8).toUpperCase(),
        'Patient Name':   o.patient_name ?? '',
        'Age':            age,
        'Sex':            sex,
        'Phone':          phone,
        'Referred By':    o.doctor_name ?? 'Direct',
        'Date':           formatDate(o.ordered_at),
        'Time':           formatTime(o.ordered_at),
        'Tests':          tests,
        'Department(s)':  depts,
        'Location':       location,
        'Status':         STATUS_LABEL[o.status] ?? o.status,
        'Payment Mode':   o.payment_mode ?? '',
        'Payment Status': o.payment_status ?? '',
        'Amount (₹)':     o.total,
        'Discount (₹)':   o.discount ?? 0,
        'Notes':          o.notes ?? '',
      } as Record<string, string | number>;
    });
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen text-on-surface font-sans" style={{ background: '#F0F4F7' }}>
      <Sidebar />

      {/* Top App Bar */}
      <header className="fixed top-0 right-0 left-64 h-16 glass-header z-40">
        <div className="flex items-center justify-between px-lg h-full">
          <div className="flex items-center flex-1 max-w-xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-full border-none focus:ring-2 focus:ring-[#17A077] text-body-sm font-body-sm outline-none"
                placeholder="Search patient name, doctor, test…"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-md ml-lg">
            <button
              onClick={downloadCSV}
              className="flex items-center gap-xs px-md py-1.5 rounded-lg border border-[#17A077] text-[#17A077] text-xs font-bold hover:bg-[#17A077]/5 transition-colors">
              <span className="material-symbols-outlined text-sm">download</span>
              Download CSV
            </button>
            <div className="flex items-center space-x-sm border-l border-outline-variant pl-md">
              <span className="material-symbols-outlined text-outline cursor-pointer hover:text-[#17A077]">sync</span>
              <span className="material-symbols-outlined text-outline cursor-pointer hover:text-[#17A077]">cloud_done</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="ml-64 mt-16 p-md min-h-[calc(100vh-64px)] pb-12">

        {/* Hero Banner */}
        <section className="relative rounded-xl overflow-hidden mb-md flex items-center px-lg py-6">
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0D4A3E 0%, #1A7260 30%, #2A9174 60%, #5BAAA0 85%, #94C5BE 100%)' }}></div>
          <div className="relative z-10 flex-1">
            <h1 className="font-headline-lg text-headline-lg text-white mb-1">Referral Analytics</h1>
            <p className="text-white/70 font-body-sm">
              {hasFilters
                ? `Showing ${filtered.length} of ${orders.length} referrals matching your filters`
                : 'Track referred patients, orders, and outcomes across all doctors and regions'}
            </p>
          </div>
          <div className="relative z-10 flex gap-md flex-wrap">
            {([
              { label: 'Total Referrals', value: filtered.length,        icon: 'people' },
              { label: 'Referring Docs',  value: stats.uniqueDocs,       icon: 'stethoscope' },
              { label: 'Pending',         value: stats.pending,          icon: 'pending' },
              { label: 'Revenue',         value: `₹${stats.revenue.toLocaleString('en-IN')}`, icon: 'currency_rupee' },
            ] as const).map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-md border border-white/20 p-md rounded-xl min-w-[130px]">
                <div className="flex items-center gap-xs text-white/60 text-[10px] font-bold uppercase mb-1">
                  <span className="material-symbols-outlined text-sm">{s.icon}</span>
                  {s.label}
                </div>
                <div className="text-white font-bold text-xl">{loading ? '…' : s.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Filter Panel */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm mb-md p-md space-y-sm">
          {/* Row 1: Dropdowns */}
          <div className="flex flex-wrap items-center gap-sm">
            <div className="flex items-center gap-xs text-outline">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Filters</span>
            </div>

            {/* Doctor */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant pl-1">Referring Doctor</label>
              <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-lg text-xs px-sm py-1.5 outline-none focus:border-[#17A077] min-w-[160px]">
                <option value="all">All Doctors</option>
                <option value="">— No referral —</option>
                {doctors.filter(d => d !== 'all').map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Region */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant pl-1">Region / Area</label>
              <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-lg text-xs px-sm py-1.5 outline-none focus:border-[#17A077] min-w-[140px]">
                {regions.map(r => <option key={r} value={r}>{r === 'all' ? 'All Regions' : r}</option>)}
              </select>
            </div>

            {/* Department */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant pl-1">Department</label>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-lg text-xs px-sm py-1.5 outline-none focus:border-[#17A077] min-w-[140px]">
                {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
              </select>
            </div>

            {/* Order Status */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant pl-1">Order Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-lg text-xs px-sm py-1.5 outline-none focus:border-[#17A077] min-w-[140px]">
                <option value="all">All Statuses</option>
                <option value="pending">Pending (in-progress)</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Payment Status */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant pl-1">Payment</label>
              <select value={filterPayStatus} onChange={e => setFilterPayStatus(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-lg text-xs px-sm py-1.5 outline-none focus:border-[#17A077] min-w-[120px]">
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
              </select>
            </div>

            {hasFilters && (
              <button onClick={clearFilters}
                className="ml-auto flex items-center gap-xs text-xs text-on-surface-variant border border-outline-variant rounded-lg px-sm py-1.5 hover:text-error hover:border-error transition-colors">
                <span className="material-symbols-outlined text-sm">filter_list_off</span>Clear all
              </button>
            )}
          </div>

          {/* Row 2: Date range */}
          <div className="flex flex-wrap items-end gap-sm pt-xs border-t border-outline-variant/40">
            <div className="flex items-center gap-xs text-[9px] font-bold uppercase tracking-wider text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              Date Range
            </div>

            {/* Presets */}
            {(['week','month','quarter','year'] as const).map(p => (
              <button key={p}
                onClick={() => applyPreset(p)}
                className={`px-sm py-1 rounded-lg text-xs font-medium border transition-colors
                  ${dateFrom || dateTo ? 'border-outline-variant text-on-surface-variant hover:border-[#17A077]' : 'border-outline-variant text-on-surface-variant hover:border-[#17A077]'}`}>
                {p === 'week' ? 'Last 7 days' : p === 'month' ? 'Last Month' : p === 'quarter' ? 'Last Quarter' : 'This Year'}
              </button>
            ))}

            <div className="flex items-center gap-xs">
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant pl-1">From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant rounded-lg text-xs px-sm py-1.5 outline-none focus:border-[#17A077]" />
              </div>
              <span className="text-on-surface-variant mt-4">—</span>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant pl-1">To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant rounded-lg text-xs px-sm py-1.5 outline-none focus:border-[#17A077]" />
              </div>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="mt-4 text-on-surface-variant hover:text-error">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            <div className="ml-auto flex items-center gap-sm mt-auto">
              <span className="text-xs text-on-surface-variant font-medium">
                {filtered.length} of {orders.length} records
              </span>
              <button onClick={downloadCSV}
                className="flex items-center gap-xs px-md py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                style={{ background: '#17A077' }}>
                <span className="material-symbols-outlined text-sm">download</span>
                Export {filtered.length} rows
              </button>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
          <div className="p-md border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
            <h2 className="font-label-md text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-[#17A077]">receipt_long</span>
              Referred Patient Records
            </h2>
            <div className="flex items-center gap-md">
              {filterDoctor !== 'all' && filterDoctor && (
                <span className="text-xs bg-[#17A077]/10 text-[#17A077] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">stethoscope</span>
                  {filterDoctor}
                </span>
              )}
              <span className="text-xs text-on-surface-variant font-medium">
                {loading ? 'Loading…' : `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-md py-3 text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Patient</th>
                  <th className="px-md py-3 text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Referred By</th>
                  <th className="px-md py-3 text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Date & Time</th>
                  <th className="px-md py-3 text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Tests / Department</th>
                  <th className="px-md py-3 text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Location</th>
                  <th className="px-md py-3 text-[10px] text-on-surface-variant uppercase tracking-wider font-bold text-center">Status</th>
                  <th className="px-md py-3 text-[10px] text-on-surface-variant uppercase tracking-wider font-bold text-right">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {loading ? (
                  <tr><td colSpan={7} className="px-md py-10 text-center text-on-surface-variant">Loading referral records…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-md py-10 text-center">
                      <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-3xl opacity-30">search_off</span>
                        <p className="text-sm">No records match your filters.</p>
                        {hasFilters && <button onClick={clearFilters} className="text-xs text-[#17A077] underline">Clear all filters</button>}
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((o, idx) => {
                  const pat = patientMap.get(o.patient_id);
                  const age = o.patient_age ?? pat?.age;
                  const sex = o.patient_sex ?? pat?.sex;
                  const phone = o.patient_phone ?? pat?.phone;
                  const depts = [...new Set((o.items ?? []).map(i => i.department).filter(Boolean))];
                  const tests = (o.items ?? []).map(i => i.test_name);
                  const location = extractRegion(pat?.address);
                  const isCompleted = ['resulted','reported','delivered'].includes(o.status);

                  return (
                    <tr key={o.id}
                      className={`hover:bg-[#17A077]/5 transition-colors ${idx % 2 === 1 ? 'bg-surface-container-low/20' : 'bg-white'}`}>

                      {/* Patient */}
                      <td className="px-md py-3">
                        <div className="font-bold text-on-surface">{o.patient_name ?? '—'}</div>
                        <div className="text-[10px] text-on-surface-variant flex items-center gap-xs mt-0.5 flex-wrap">
                          {age && <span className="bg-surface-container rounded px-1">{age}y</span>}
                          {sex && <span className="bg-surface-container rounded px-1 capitalize">{sex}</span>}
                          {phone && (
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined" style={{ fontSize: 10 }}>phone</span>
                              {phone}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-on-surface-variant/50 font-mono">{o.id.slice(0, 8).toUpperCase()}</div>
                      </td>

                      {/* Referred By */}
                      <td className="px-md py-3">
                        {o.doctor_name ? (
                          <div className="flex items-center gap-xs">
                            <div className="w-7 h-7 rounded-full bg-[#17A077]/10 border border-[#17A077]/20 flex items-center justify-center text-[10px] font-bold text-[#17A077] flex-shrink-0">
                              {o.doctor_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                              <div className="font-bold text-on-surface text-xs">{o.doctor_name}</div>
                              <div className="text-[10px] text-on-surface-variant">Referral</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-on-surface-variant italic">Direct / Walk-in</span>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="px-md py-3 text-xs text-on-surface-variant whitespace-nowrap">
                        <div className="font-medium text-on-surface">{formatDate(o.ordered_at)}</div>
                        <div className="text-[10px]">{formatTime(o.ordered_at)}</div>
                        {isCompleted && (
                          <div className="text-[10px] text-[#0D9460] flex items-center gap-0.5 mt-0.5">
                            <span className="material-symbols-outlined" style={{ fontSize: 10 }}>check_circle</span>
                            Completed
                          </div>
                        )}
                      </td>

                      {/* Tests / Department */}
                      <td className="px-md py-3 max-w-[220px]">
                        <div className="text-xs text-on-surface truncate" title={tests.join(', ')}>{tests.join(', ')}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {depts.map(d => (
                            <span key={d} className="text-[9px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">{d}</span>
                          ))}
                        </div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5">{tests.length} test{tests.length !== 1 ? 's' : ''}</div>
                      </td>

                      {/* Location */}
                      <td className="px-md py-3">
                        <div className="flex items-center gap-xs text-xs text-on-surface">
                          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>location_on</span>
                          <span className="font-medium">{location}</span>
                        </div>
                        {pat?.address && (
                          <div className="text-[10px] text-on-surface-variant mt-0.5 max-w-[130px] truncate" title={pat.address}>
                            {pat.address}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-md py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CHIP[o.status] ?? 'bg-surface-container text-on-surface-variant'}`}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>

                      {/* Payment */}
                      <td className="px-md py-3 text-right">
                        <div className="font-bold text-on-surface">₹{o.total.toLocaleString('en-IN')}</div>
                        {o.discount > 0 && (
                          <div className="text-[10px] text-on-surface-variant">Disc: ₹{o.discount.toLocaleString('en-IN')}</div>
                        )}
                        <div className="flex items-center justify-end gap-xs mt-0.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PAY_STATUS_CHIP[o.payment_status] ?? 'bg-surface-container text-on-surface-variant'}`}>
                            {(o.payment_status ?? 'unknown').toUpperCase()}
                          </span>
                          {o.payment_mode && (
                            <span className="text-[9px] text-on-surface-variant capitalize">{o.payment_mode}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-md py-sm bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
            <div className="text-xs text-on-surface-variant">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              {hasFilters && ` (filtered from ${orders.length} total)`}
            </div>
            <div className="flex items-center gap-md text-xs text-on-surface-variant">
              <span>Pending: <strong className="text-amber-600">{stats.pending}</strong></span>
              <span>Completed: <strong className="text-[#0D9460]">{stats.completed}</strong></span>
              <span>Revenue: <strong className="text-on-surface">₹{stats.revenue.toLocaleString('en-IN')}</strong></span>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 right-0 left-64 h-8 flex items-center justify-between px-md z-40 bg-surface-container-lowest border-t border-outline-variant">
        <div className="font-label-caps text-[10px] font-bold text-[#17A077]">DiagDesk v2.4.0-stable</div>
        <div className="flex items-center space-x-md text-[10px] text-on-surface-variant">
          <span>Branch: Central Hub</span>
          <span>Env: Production</span>
          <span className="text-[#17A077] font-bold">Latency: 24ms</span>
        </div>
      </footer>
    </div>
  );
}
