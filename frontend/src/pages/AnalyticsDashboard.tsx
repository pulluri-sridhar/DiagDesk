import { useState, useEffect, useMemo } from 'react';
import { fetchOrders, fetchInventory, fetchPatients, type Order, type InventoryItem, type Patient } from '../lib/api';
import Sidebar from '../components/Sidebar';

function extractArea(address: string | null | undefined): string {
  if (!address?.trim()) return 'Unknown';
  return address.split(',')[0].trim() || 'Unknown';
}

type Period = '7d' | '30d' | 'all';

const TEAL = '#17A077';
const DEEP = '#0D9460';

const DISEASE_MAP: [string, string][] = [
  ['HbA1c', 'Diabetes'], ['Glucose', 'Diabetes'],
  ['Lipid', 'Cardiovascular'], ['Cholesterol', 'Cardiovascular'],
  ['TSH', 'Thyroid'], ['T3', 'Thyroid'], ['T4', 'Thyroid'],
  ['CBC', 'Hematology'], ['Haemoglobin', 'Hematology'],
  ['LFT', 'Hepatology'], ['Liver', 'Hepatology'], ['Bilirubin', 'Hepatology'],
  ['KFT', 'Nephrology'], ['Creatinine', 'Nephrology'], ['Urea', 'Nephrology'],
  ['Dengue', 'Infectious'], ['Malaria', 'Infectious'], ['Typhoid', 'Infectious'],
  ['Urine', 'Urological'], ['Culture', 'Microbiology'],
];
function diseaseOf(testName: string): string {
  const lower = (testName ?? '').toLowerCase();
  for (const [key, cat] of DISEASE_MAP) {
    if (lower.includes(key.toLowerCase())) return cat;
  }
  return 'Other';
}

const DEPT_COLORS: Record<string, string> = {
  Hematology: '#17A077', Biochemistry: '#0D9460', Microbiology: '#1A7260',
  Immunology: '#2A9174', Radiology: '#5BAAA0', Pathology: '#94C5BE',
  Urine: '#64B3AA', Other: '#737685', Unknown: '#c3c6d6',
};
function deptColor(dept: string) { return DEPT_COLORS[dept] ?? DEPT_COLORS.Unknown; }

const DISEASE_COLORS: Record<string, string> = {
  Hematology: TEAL, Diabetes: '#F59E0B', Cardiovascular: '#ba1a1a',
  Thyroid: DEEP, Hepatology: '#1A7260', Nephrology: '#2A9174',
  Infectious: '#E57373', Urological: '#5BAAA0', Microbiology: '#94C5BE', Other: '#737685',
};

// ── Shared UI components ─────────────────────────────────────────────────────

function Bar({ label, value, max, color = TEAL, prefix = '', suffix = '' }:
  { label: string; value: number; max: number; color?: string; prefix?: string; suffix?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-sm">
      <div className="w-28 text-[11px] text-on-surface-variant truncate flex-shrink-0" title={label}>{label}</div>
      <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-16 text-right text-[11px] font-bold text-on-surface flex-shrink-0">
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}{suffix}
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-[10px] border border-outline-variant rounded-md px-xs py-[2px] bg-white text-on-surface outline-none focus:border-[#17A077] cursor-pointer h-6"
    >
      {children}
    </select>
  );
}

function ToggleGroup({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center bg-surface-container-low rounded-lg p-0.5 gap-0.5">
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className="px-xs py-[2px] rounded-md text-[10px] font-bold transition-all whitespace-nowrap"
          style={value === o.value ? { background: TEAL, color: '#fff' } : { color: '#737685' }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Card({ title, icon, children, filters }: {
  title: string; icon: string; children: React.ReactNode; filters?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div className="px-md py-sm border-b border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center justify-between gap-sm flex-wrap">
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-base" style={{ color: TEAL }}>{icon}</span>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">{title}</h3>
          </div>
          {filters && <div className="flex items-center gap-xs flex-wrap">{filters}</div>}
        </div>
      </div>
      <div className="p-md">{children}</div>
    </div>
  );
}

// ── KPI mini-chart components ───────────────────────────────────────────────

function MiniBar({ data, color }: { data: { value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const n   = data.length;
  return (
    <svg viewBox={`0 0 ${n * 10} 48`} preserveAspectRatio="none" className="w-full" style={{ height: 48 }}>
      {data.map((d, i) => {
        const h = Math.max(2, (d.value / max) * 44);
        return <rect key={i} x={i * 10 + 1} y={48 - h} width={8} height={h} rx={2}
          fill={color} opacity={d.value ? 0.85 : 0.15} />;
      })}
    </svg>
  );
}

function MiniLine({ data, color, id }: { data: { value: number }[]; color: string; id: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 200, H = 48;
  const pts = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * W : W / 2;
    const y = H - 4 - (d.value / max) * (H - 10);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const areaPoints = `0,${H} ${pts.join(' ')} ${W},${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 48 }}>
      <defs>
        <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${id})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function MiniDonut({ segments, total, center }: {
  segments: { value: number; color: string; label: string }[];
  total: number; center?: string;
}) {
  const R = 26, innerR = 16, cx = 36, cy = 36;
  let angle = -Math.PI / 2; // 12 o'clock
  const arcs = segments.filter(s => s.value > 0).map(s => {
    const slice = total > 0 ? (s.value / total) * 2 * Math.PI : 0;
    const end   = angle + slice;
    const x1 = cx + R * Math.cos(angle),     y1 = cy + R * Math.sin(angle);
    const x2 = cx + R * Math.cos(end),       y2 = cy + R * Math.sin(end);
    const ix1 = cx + innerR * Math.cos(end), iy1 = cy + innerR * Math.sin(end);
    const ix2 = cx + innerR * Math.cos(angle), iy2 = cy + innerR * Math.sin(angle);
    const large = slice > Math.PI ? 1 : 0;
    const d = `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L${ix1.toFixed(2)} ${iy1.toFixed(2)} A${innerR} ${innerR} 0 ${large} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)}Z`;
    angle = end;
    return { d, color: s.color, label: s.label, value: s.value };
  });
  return (
    <div className="flex items-center gap-sm">
      <svg viewBox="0 0 72 72" style={{ width: 64, height: 64, flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="#f1f3f4" />
        {arcs.length === 0
          ? <circle cx={cx} cy={cy} r={R} fill="#e1e2ec" />
          : arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} />)
        }
        {center && (
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
            fontSize="9" fontWeight="bold" fill="#1C1B1F">{center}</text>
        )}
      </svg>
      <div className="space-y-xs flex-1 min-w-0">
        {segments.filter(s => s.value > 0).map(s => (
          <div key={s.label} className="flex items-center justify-between gap-xs">
            <div className="flex items-center gap-xs min-w-0">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[10px] text-on-surface-variant truncate">{s.label}</span>
            </div>
            <span className="text-[10px] font-bold text-on-surface flex-shrink-0 ml-xs">
              {total > 0 ? `${Math.round(s.value / total * 100)}%` : '0%'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CHART_OPTS = [
  { value: 'number', label: 'Number' },
  { value: 'bar',    label: 'Bar'    },
  { value: 'line',   label: 'Line'   },
  { value: 'donut',  label: 'Donut'  },
];

function KpiCard({ id, label, value, sub, icon, color, chartType, onChartChange, loading, trendData, donutSegments, donutTotal, donutCenter }: {
  id: string; label: string; value: string; sub: string; icon: string; color: string;
  chartType: string; onChartChange: (v: string) => void; loading?: boolean;
  trendData: { value: number }[];
  donutSegments: { value: number; color: string; label: string }[];
  donutTotal: number; donutCenter?: string;
}) {
  const hasChart = chartType !== 'number';
  return (
    <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div className="px-md pt-md pb-sm">
        <div className="flex justify-between items-start mb-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant leading-tight pr-xs">{label}</p>
          <div className="flex items-center gap-xs flex-shrink-0">
            <span className="material-symbols-outlined text-xl" style={{ color }}>{icon}</span>
            <select value={chartType} onChange={e => onChartChange(e.target.value)}
              className="text-[9px] border border-outline-variant rounded px-xs py-[1px] bg-white outline-none cursor-pointer text-on-surface-variant h-5">
              {CHART_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <p className={`font-black tracking-tighter mb-xs ${hasChart ? 'text-xl' : 'text-3xl'}`} style={{ color }}>
          {loading ? '…' : value}
        </p>
        <p className="text-[10px] text-on-surface-variant leading-snug">{sub}</p>
      </div>
      {chartType === 'bar' && (
        <div className="px-sm pb-sm pt-xs border-t border-outline-variant">
          <MiniBar data={trendData} color={color} />
          <p className="text-[8px] text-on-surface-variant text-center mt-xs">Last 14 days</p>
        </div>
      )}
      {chartType === 'line' && (
        <div className="px-sm pb-sm pt-xs border-t border-outline-variant">
          <MiniLine data={trendData} color={color} id={id} />
          <p className="text-[8px] text-on-surface-variant text-center mt-xs">Last 14 days</p>
        </div>
      )}
      {chartType === 'donut' && (
        <div className="px-md pb-md pt-xs border-t border-outline-variant">
          <MiniDonut segments={donutSegments} total={donutTotal} center={donutCenter} />
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [orders, setOrders]       = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [loading, setLoading]     = useState(true);
  const [period, setPeriod]       = useState<Period>('30d');
  const [kpiCharts, setKpiCharts] = useState<Record<string, string>>({
    revenue: 'number', orders: 'number', patients: 'number', collection: 'number',
  });

  // ── Panel-level filter states ──
  const [demoGender, setDemoGender] = useState('all');
  const [demoAge, setDemoAge]       = useState('all');
  const [demoRegion, setDemoRegion] = useState('all');

  const [testSort, setTestSort]   = useState<'volume' | 'revenue'>('volume');
  const [testDept, setTestDept]   = useState('all');

  const [deptView, setDeptView]   = useState<'revenue' | 'volume'>('revenue');

  const [payStatus, setPayStatus] = useState('all');

  const [funnelDept, setFunnelDept] = useState('all');

  const [peakDayType, setPeakDayType] = useState('all');

  const [docSort, setDocSort]     = useState<'count' | 'revenue'>('count');

  const [disGender, setDisGender] = useState('all');
  const [disAge, setDisAge]       = useState('all');

  const [invSev, setInvSev]       = useState('all');
  const [invCat, setInvCat]       = useState('all');
  const [catView, setCatView]     = useState<'skus' | 'qty' | 'alerts'>('skus');

  useEffect(() => {
    Promise.all([fetchOrders(), fetchInventory(), fetchPatients()])
      .then(([o, inv, p]) => { setOrders(o); setInventory(inv); setPatients(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Period filter ──
  const filtered = useMemo(() => {
    if (period === 'all') return orders;
    const days = period === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return orders.filter(o => new Date(o.ordered_at) >= cutoff);
  }, [orders, period]);

  // ── Patient area map ──
  const patientAreaMap = useMemo(() => {
    const map: Record<string, string> = {};
    patients.forEach(p => { map[p.id] = extractArea(p.address); });
    return map;
  }, [patients]);

  // ── Available regions for demographics dropdown ──
  const availableRegions = useMemo(() => {
    const regions = new Set<string>();
    filtered.forEach(o => regions.add(patientAreaMap[o.patient_id] ?? 'Unknown'));
    return ['all', ...Array.from(regions).filter(r => r !== 'Unknown').sort(), 'Unknown'];
  }, [filtered, patientAreaMap]);

  // ── Available departments (from test items) ──
  const availableDepts = useMemo(() => {
    const depts = new Set<string>();
    filtered.forEach(o => (o.items ?? []).forEach((it: any) => { if (it.department) depts.add(it.department); }));
    return ['all', ...Array.from(depts).sort()];
  }, [filtered]);

  // ── Available inventory categories ──
  const invCategories = useMemo(() =>
    ['all', ...Array.from(new Set(inventory.map(i => i.category))).sort()],
  [inventory]);

  // ── Demographics-filtered (gender / age / region) ──
  const demoFiltered = useMemo(() => {
    return filtered.filter(o => {
      if (demoGender !== 'all' && o.patient_sex !== demoGender) return false;
      if (demoAge !== 'all') {
        const a = o.patient_age ?? -1;
        if (demoAge === 'pediatric' && (a < 0 || a >= 18))  return false;
        if (demoAge === 'young'     && (a < 18 || a >= 45)) return false;
        if (demoAge === 'middle'    && (a < 45 || a >= 60)) return false;
        if (demoAge === 'senior'    && a < 60)               return false;
      }
      if (demoRegion !== 'all') {
        if ((patientAreaMap[o.patient_id] ?? 'Unknown') !== demoRegion) return false;
      }
      return true;
    });
  }, [filtered, demoGender, demoAge, demoRegion, patientAreaMap]);

  // ── KPIs ──
  const totalRevenue     = filtered.reduce((s, o) => s + (o.total ?? 0), 0);
  const collectedRevenue = filtered.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total ?? 0), 0);
  const pendingRevenue   = totalRevenue - collectedRevenue;
  const avgOrderValue    = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;
  const collectionRate   = totalRevenue > 0 ? collectedRevenue / totalRevenue * 100 : 0;
  const uniquePatients   = new Set(filtered.map(o => o.patient_id)).size;
  const todayStr         = new Date().toISOString().slice(0, 10);
  const todayCount       = orders.filter(o => o.ordered_at?.startsWith(todayStr)).length;
  const cancelledCount   = filtered.filter(o => o.status === 'cancelled').length;

  // ── Revenue trend (fixed 14-day window) ──
  const trendDays  = 14;
  const trendDates = Array.from({ length: trendDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (trendDays - 1 - i));
    return d.toISOString().slice(0, 10);
  });
  const trendData = trendDates.map(day => {
    const dayOrders = orders.filter(o => o.ordered_at?.startsWith(day));
    const revenue   = dayOrders.reduce((s, o) => s + (o.total ?? 0), 0);
    const collected = dayOrders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + (o.total ?? 0), 0);
    return {
      label:    new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      revenue,
      count:    dayOrders.length,
      patients: new Set(dayOrders.map(o => o.patient_id)).size,
      rate:     revenue > 0 ? Math.round(collected / revenue * 100) : 0,
    };
  });
  const maxTrend = Math.max(...trendData.map(d => d.revenue), 1);

  // ── Top tests — filtered by dept, sorted by volume or revenue ──
  const testCounts: Record<string, number> = {};
  const testRevMap: Record<string, number> = {};
  filtered.forEach(o => (o.items ?? []).forEach((it: any) => {
    if (testDept !== 'all' && it.department !== testDept) return;
    testCounts[it.test_name] = (testCounts[it.test_name] ?? 0) + 1;
    testRevMap[it.test_name] = (testRevMap[it.test_name] ?? 0) + (it.price ?? 0);
  }));
  const topTests = Object.keys(testCounts)
    .map(name => ({ name, count: testCounts[name], revenue: testRevMap[name] ?? 0 }))
    .sort((a, b) => testSort === 'volume' ? b.count - a.count : b.revenue - a.revenue)
    .slice(0, 7);
  const maxTest = Math.max(...topTests.map(t => testSort === 'volume' ? t.count : t.revenue), 1);

  // ── Department revenue / volume ──
  const deptRev: Record<string, number> = {};
  const deptCnt: Record<string, number> = {};
  filtered.forEach(o => (o.items ?? []).forEach((it: any) => {
    const d = it.department ?? 'Other';
    deptRev[d] = (deptRev[d] ?? 0) + (it.price ?? 0);
    deptCnt[d] = (deptCnt[d] ?? 0) + 1;
  }));
  const deptSource   = deptView === 'revenue' ? deptRev : deptCnt;
  const topDepts     = Object.entries(deptSource).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxDeptVal   = Math.max(...topDepts.map(d => d[1]), 1);
  const totalTestVol = Object.values(deptCnt).reduce((a, b) => a + b, 0) || 1;

  // ── Payment analytics — filtered by payment status ──
  const payFiltered = payStatus === 'all' ? filtered
    : filtered.filter(o => o.payment_status === (payStatus === 'paid' ? 'paid' : 'pending'));
  const payModes: Record<string, number> = {};
  payFiltered.forEach(o => {
    const m = o.payment_mode;
    if (!m) return;
    payModes[m] = (payModes[m] ?? 0) + 1;
  });
  const topPayModes = Object.entries(payModes).sort((a, b) => b[1] - a[1]);
  const maxPayMode  = Math.max(...topPayModes.map(p => p[1]), 1);
  const payTotal    = topPayModes.reduce((s, [, c]) => s + c, 0) || 1;

  // ── Demographics charts ──
  const gM     = demoFiltered.filter(o => o.patient_sex === 'M').length;
  const gF     = demoFiltered.filter(o => o.patient_sex === 'F').length;
  const gO     = demoFiltered.length - gM - gF;
  const gTotal = demoFiltered.length || 1;
  const ageGroups = [
    { label: '0–17  Pediatric',   count: demoFiltered.filter(o => { const a = o.patient_age ?? -1; return a >= 0 && a < 18; }).length },
    { label: '18–44 Young Adult', count: demoFiltered.filter(o => { const a = o.patient_age ?? -1; return a >= 18 && a < 45; }).length },
    { label: '45–59 Middle-aged', count: demoFiltered.filter(o => { const a = o.patient_age ?? -1; return a >= 45 && a < 60; }).length },
    { label: '60+   Senior',      count: demoFiltered.filter(o => (o.patient_age ?? -1) >= 60).length },
  ];
  const maxAge = Math.max(...ageGroups.map(a => a.count), 1);
  const regionCounts: Record<string, number> = {};
  demoFiltered.forEach(o => {
    const area = patientAreaMap[o.patient_id] ?? 'Unknown';
    regionCounts[area] = (regionCounts[area] ?? 0) + 1;
  });
  const topRegions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxRegion  = Math.max(...topRegions.map(r => r[1]), 1);

  // ── Order journey funnel — filtered by department ──
  const funnelOrders = funnelDept === 'all' ? filtered
    : filtered.filter(o => (o.items ?? []).some((it: any) => it.department === funnelDept));
  const funnel = [
    { label: 'Registered',       key: 'registered',       color: '#737685' },
    { label: 'Sample Collected', key: 'sample_collected', color: '#2A9174' },
    { label: 'Processing',       key: 'processing',       color: '#F59E0B' },
    { label: 'Resulted',         key: 'resulted',         color: TEAL },
    { label: 'Reported',         key: 'reported',         color: DEEP },
    { label: 'Delivered',        key: 'delivered',        color: '#0D4A3E' },
    { label: 'Cancelled',        key: 'cancelled',        color: '#ba1a1a' },
  ].map(f => ({ ...f, count: funnelOrders.filter(o => o.status === f.key).length }));
  const maxFunnel = Math.max(...funnel.map(f => f.count), 1);

  // ── Peak visit analysis — always uses ALL orders (full year, 24/7 lab) ──
  const peakBase   = peakDayType === 'all' ? orders
    : orders.filter(o => {
        if (!o.ordered_at) return false;
        const day = new Date(o.ordered_at).getDay();
        return peakDayType === 'weekend' ? (day === 0 || day === 6) : (day >= 1 && day <= 5);
      });
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_FULL   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayVol = Array(7).fill(0);
  peakBase.forEach(o => { if (o.ordered_at) dayVol[new Date(o.ordered_at).getDay()]++; });
  const maxDay     = Math.max(...dayVol, 1);
  const peakDayIdx = dayVol.indexOf(Math.max(...dayVol));
  const hourVol    = Array(24).fill(0);
  peakBase.forEach(o => { if (o.ordered_at) hourVol[new Date(o.ordered_at).getHours()]++; });
  // Full 24-hour coverage — 6 equal 4-hour bands
  const TIME_SLOTS = [
    { label: 'Midnight',      sub: '12am – 4am', start: 0,  end: 4  },
    { label: 'Early Morning', sub: '4am – 8am',  start: 4,  end: 8  },
    { label: 'Morning',       sub: '8am – 12pm', start: 8,  end: 12 },
    { label: 'Afternoon',     sub: '12pm – 4pm', start: 12, end: 16 },
    { label: 'Evening',       sub: '4pm – 8pm',  start: 16, end: 20 },
    { label: 'Night',         sub: '8pm – 12am', start: 20, end: 24 },
  ];
  const slotVol  = TIME_SLOTS.map(s => ({ ...s, count: hourVol.slice(s.start, s.end).reduce((a: number, b: number) => a + b, 0) }));
  const maxSlot  = Math.max(...slotVol.map(s => s.count), 1);
  const peakSlot = slotVol.reduce((a, b) => (a.count >= b.count ? a : b));

  // ── Doctor referrals — sortable by count or revenue ──
  const docMap: Record<string, { count: number; revenue: number }> = {};
  filtered.forEach(o => {
    const doc = o.doctor_name ?? 'Walk-in / Direct';
    if (!docMap[doc]) docMap[doc] = { count: 0, revenue: 0 };
    docMap[doc].count++;
    docMap[doc].revenue += o.total ?? 0;
  });
  const topDocs = Object.entries(docMap)
    .sort((a, b) => docSort === 'count' ? b[1].count - a[1].count : b[1].revenue - a[1].revenue)
    .slice(0, 6);
  const maxDoc = Math.max(...topDocs.map(d => docSort === 'count' ? d[1].count : d[1].revenue), 1);

  // ── Disease patterns — filtered by gender and age ──
  const diseaseFiltered = filtered.filter(o => {
    if (disGender !== 'all' && o.patient_sex !== disGender) return false;
    if (disAge !== 'all') {
      const a = o.patient_age ?? -1;
      if (disAge === 'pediatric' && (a < 0 || a >= 18))  return false;
      if (disAge === 'young'     && (a < 18 || a >= 45)) return false;
      if (disAge === 'middle'    && (a < 45 || a >= 60)) return false;
      if (disAge === 'senior'    && a < 60)               return false;
    }
    return true;
  });
  const diseaseMap: Record<string, number> = {};
  diseaseFiltered.forEach(o => (o.items ?? []).forEach((it: any) => {
    const d = diseaseOf(it.test_name ?? '');
    diseaseMap[d] = (diseaseMap[d] ?? 0) + 1;
  }));
  const topDiseases = Object.entries(diseaseMap).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const maxDisease  = Math.max(...topDiseases.map(d => d[1]), 1);

  // ── Inventory — filtered by severity and category ──
  const lowStock  = inventory.filter(i => i.qty_on_hand <= i.reorder_threshold && i.qty_on_hand > 0);
  const outOfStock = inventory.filter(i => i.qty_on_hand <= 0);
  const allAlerts = [...outOfStock.map(i => ({ ...i, sev: 'out' as const })), ...lowStock.map(i => ({ ...i, sev: 'low' as const }))];
  const invDisplay = allAlerts.filter(i => {
    if (invSev !== 'all' && i.sev !== invSev) return false;
    if (invCat !== 'all' && i.category !== invCat) return false;
    return true;
  });
  const catMap    = {} as Record<string, number>;
  const catQty    = {} as Record<string, number>;
  const catAlerts = {} as Record<string, number>;
  inventory.forEach(i => {
    catMap[i.category] = (catMap[i.category] ?? 0) + 1;
    catQty[i.category] = (catQty[i.category] ?? 0) + i.qty_on_hand;
  });
  allAlerts.forEach(i => { catAlerts[i.category] = (catAlerts[i.category] ?? 0) + 1; });
  const catSource = catView === 'skus' ? catMap : catView === 'qty' ? catQty : catAlerts;
  const topCats   = Object.entries(catSource).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const maxCat    = Math.max(...topCats.map(c => c[1]), 1);
  const catSuffix = catView === 'skus' ? ' SKUs' : catView === 'qty' ? ' units' : ' alerts';
  const catColor  = (cat: string) => catView === 'alerts' && (catAlerts[cat] ?? 0) > 0
    ? (outOfStock.some(i => i.category === cat) ? '#ba1a1a' : '#F59E0B')
    : TEAL;

  // ── Donut segment data for KPI cards ──
  const completedCount  = filtered.filter(o => ['resulted', 'reported', 'delivered'].includes(o.status)).length;
  const inProgressCount = filtered.filter(o => ['registered', 'sample_collected', 'processing'].includes(o.status)).length;
  const kpiPatM = filtered.filter(o => o.patient_sex === 'M').length;
  const kpiPatF = filtered.filter(o => o.patient_sex === 'F').length;
  const kpiPatO = filtered.length - kpiPatM - kpiPatF;

  return (
    <div className="min-h-screen text-on-surface font-sans" style={{ background: '#F0F4F7' }}>
      <Sidebar />

      {/* Header */}
      <header className="fixed top-0 right-0 left-64 h-16 bg-white/90 backdrop-blur-md border-b border-outline-variant flex items-center justify-between px-lg z-40">
        <div>
          <h1 className="text-base font-bold text-on-surface">Analytics</h1>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Business Intelligence · Lumina Diagnostics</p>
        </div>
        <div className="flex items-center gap-xs bg-surface-container-low rounded-xl p-1">
          {(['7d', '30d', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-md py-xs rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all"
              style={period === p ? { background: TEAL, color: '#fff', boxShadow: '0 2px 8px rgba(23,160,119,0.3)' } : { color: '#737685' }}>
              {p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </header>

      <main className="ml-64 mt-16 p-lg pb-16 space-y-lg">

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-4 gap-md">
          <KpiCard
            id="revenue" label="Total Revenue" icon="payments" color={TEAL}
            value={`₹${(totalRevenue / 1000).toFixed(1)}K`}
            sub={`₹${(pendingRevenue / 1000).toFixed(1)}K pending`}
            chartType={kpiCharts.revenue}
            onChartChange={v => setKpiCharts(c => ({ ...c, revenue: v }))}
            loading={loading}
            trendData={trendData.map(d => ({ value: d.revenue }))}
            donutSegments={[
              { value: collectedRevenue, color: TEAL,      label: 'Collected' },
              { value: pendingRevenue,   color: '#F59E0B', label: 'Pending'   },
            ]}
            donutTotal={totalRevenue}
            donutCenter={`${collectionRate.toFixed(0)}%`}
          />
          <KpiCard
            id="orders" label="Orders Processed" icon="receipt_long" color={DEEP}
            value={`${filtered.length}`}
            sub={`${todayCount} today · ${cancelledCount} cancelled`}
            chartType={kpiCharts.orders}
            onChartChange={v => setKpiCharts(c => ({ ...c, orders: v }))}
            loading={loading}
            trendData={trendData.map(d => ({ value: d.count }))}
            donutSegments={[
              { value: completedCount,  color: TEAL,      label: 'Completed'   },
              { value: inProgressCount, color: '#F59E0B', label: 'In Progress' },
              { value: cancelledCount,  color: '#ba1a1a', label: 'Cancelled'   },
            ]}
            donutTotal={filtered.length}
            donutCenter={`${filtered.length}`}
          />
          <KpiCard
            id="patients" label="Unique Patients" icon="group" color="#1A7260"
            value={`${uniquePatients}`}
            sub={`Avg ₹${avgOrderValue.toLocaleString('en-IN')} per order`}
            chartType={kpiCharts.patients}
            onChartChange={v => setKpiCharts(c => ({ ...c, patients: v }))}
            loading={loading}
            trendData={trendData.map(d => ({ value: d.patients }))}
            donutSegments={[
              { value: kpiPatM, color: TEAL,      label: 'Male'   },
              { value: kpiPatF, color: '#5BAAA0', label: 'Female' },
              ...(kpiPatO > 0 ? [{ value: kpiPatO, color: '#c3c6d6', label: 'Other' }] : []),
            ]}
            donutTotal={filtered.length}
            donutCenter={`${uniquePatients}`}
          />
          <KpiCard
            id="collection" label="Collection Rate" icon="account_balance_wallet"
            color={collectionRate >= 80 ? TEAL : '#F59E0B'}
            value={`${collectionRate.toFixed(1)}%`}
            sub={`₹${(collectedRevenue / 1000).toFixed(1)}K of ₹${(totalRevenue / 1000).toFixed(1)}K`}
            chartType={kpiCharts.collection}
            onChartChange={v => setKpiCharts(c => ({ ...c, collection: v }))}
            loading={loading}
            trendData={trendData.map(d => ({ value: d.rate }))}
            donutSegments={[
              { value: collectedRevenue, color: TEAL,      label: 'Collected' },
              { value: pendingRevenue,   color: '#F59E0B', label: 'Pending'   },
            ]}
            donutTotal={totalRevenue}
            donutCenter={`${collectionRate.toFixed(0)}%`}
          />
        </div>

        {/* ── Revenue Trend ── */}
        <Card title="Revenue Trend · Last 14 Days" icon="trending_up">
          {loading ? <div className="h-32 flex items-center justify-center text-on-surface-variant text-sm">Loading…</div> : (
            <div className="flex gap-1 items-end h-32">
              {trendData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] text-on-surface-variant font-bold">
                    {d.revenue > 0 ? `₹${(d.revenue / 1000).toFixed(1)}K` : ''}
                  </span>
                  <div className="w-full rounded-t-sm transition-all relative group"
                    style={{ height: `${Math.max(4, (d.revenue / maxTrend) * 80)}px`, background: d.revenue > 0 ? TEAL : '#e1e2ec' }}>
                    {d.count > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {d.count} order{d.count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] text-on-surface-variant">{d.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Row: Top Tests + Department Mix ── */}
        <div className="grid grid-cols-12 gap-md">
          <div className="col-span-7">
            <Card title="Top Tests" icon="science"
              filters={<>
                <ToggleGroup value={testSort} onChange={v => setTestSort(v as 'volume' | 'revenue')}
                  options={[{ value: 'volume', label: 'By Volume' }, { value: 'revenue', label: 'By Revenue' }]} />
                <FilterSelect value={testDept} onChange={setTestDept}>
                  {availableDepts.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
                </FilterSelect>
              </>}>
              {topTests.length === 0
                ? <p className="text-sm text-on-surface-variant text-center py-4">No data for this period</p>
                : <div className="space-y-sm">
                    {topTests.map(t => (
                      <Bar key={t.name} label={t.name}
                        value={testSort === 'volume' ? t.count : t.revenue}
                        max={maxTest}
                        prefix={testSort === 'revenue' ? '₹' : ''}
                        suffix={testSort === 'volume'
                          ? ` · ₹${(t.revenue / 1000).toFixed(1)}K`
                          : ` · ${t.count} tests`} />
                    ))}
                  </div>
              }
            </Card>
          </div>

          <div className="col-span-5">
            <Card title="Revenue by Department" icon="category"
              filters={
                <ToggleGroup value={deptView} onChange={v => setDeptView(v as 'revenue' | 'volume')}
                  options={[{ value: 'revenue', label: 'Revenue' }, { value: 'volume', label: 'Volume' }]} />
              }>
              <div className="space-y-sm">
                {topDepts.map(([dept, val]) => (
                  <div key={dept}>
                    <Bar label={dept} value={val} max={maxDeptVal} color={deptColor(dept)}
                      prefix={deptView === 'revenue' ? '₹' : ''}
                      suffix={deptView === 'volume' ? ' tests' : ''} />
                    {deptView === 'revenue' && (
                      <p className="text-[9px] text-on-surface-variant text-right mt-0.5">
                        {Math.round((deptCnt[dept] ?? 0) / totalTestVol * 100)}% of test volume
                      </p>
                    )}
                  </div>
                ))}
                {topDepts.length === 0 && <p className="text-sm text-on-surface-variant text-center py-4">No data</p>}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Row: Demographics + Payment Analytics ── */}
        <div className="grid grid-cols-2 gap-md">

          {/* Demographics — custom header for 3 filter dropdowns */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="px-md py-sm border-b border-outline-variant bg-surface-container-lowest">
              <div className="flex items-center justify-between gap-sm flex-wrap">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-base" style={{ color: TEAL }}>person_search</span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Patient Demographics</span>
                  {(demoGender !== 'all' || demoAge !== 'all' || demoRegion !== 'all') && (
                    <span className="text-[10px] bg-[#17A077]/10 text-[#17A077] font-bold px-2 py-0.5 rounded-full">
                      {demoFiltered.length} patients
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-xs flex-wrap">
                  <FilterSelect value={demoGender} onChange={setDemoGender}>
                    <option value="all">All Genders</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </FilterSelect>
                  <FilterSelect value={demoAge} onChange={setDemoAge}>
                    <option value="all">All Ages</option>
                    <option value="pediatric">Pediatric (0–17)</option>
                    <option value="young">Young Adult (18–44)</option>
                    <option value="middle">Middle-aged (45–59)</option>
                    <option value="senior">Senior (60+)</option>
                  </FilterSelect>
                  <FilterSelect value={demoRegion} onChange={setDemoRegion}>
                    {availableRegions.map(r => <option key={r} value={r}>{r === 'all' ? 'All Regions' : r}</option>)}
                  </FilterSelect>
                  {(demoGender !== 'all' || demoAge !== 'all' || demoRegion !== 'all') && (
                    <button onClick={() => { setDemoGender('all'); setDemoAge('all'); setDemoRegion('all'); }}
                      className="text-[10px] text-on-surface-variant hover:text-error flex items-center gap-xs transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>close</span>
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-md space-y-md">
              {demoFiltered.length === 0 ? (
                <div className="text-center py-6 text-on-surface-variant text-sm">No patients match the selected filters</div>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-sm">Gender Split</p>
                    <div className="flex items-center gap-xs h-4 rounded-full overflow-hidden mb-xs">
                      {gM > 0 && <div style={{ width: `${gM / gTotal * 100}%`, background: TEAL }} className="h-full rounded-l-full" />}
                      {gF > 0 && <div style={{ width: `${gF / gTotal * 100}%`, background: '#5BAAA0' }} className="h-full" />}
                      {gO > 0 && <div style={{ width: `${gO / gTotal * 100}%`, background: '#c3c6d6' }} className="h-full rounded-r-full" />}
                    </div>
                    <div className="flex flex-wrap gap-md text-[10px]">
                      <span className="flex items-center gap-xs"><span className="w-2 h-2 rounded-full inline-block" style={{ background: TEAL }} /> Male — {gM} ({Math.round(gM / gTotal * 100)}%)</span>
                      <span className="flex items-center gap-xs"><span className="w-2 h-2 rounded-full inline-block" style={{ background: '#5BAAA0' }} /> Female — {gF} ({Math.round(gF / gTotal * 100)}%)</span>
                      {gO > 0 && <span className="flex items-center gap-xs"><span className="w-2 h-2 rounded-full inline-block bg-outline-variant" /> Other — {gO}</span>}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-sm">Age Distribution</p>
                    <div className="space-y-sm">
                      {ageGroups.map(g => <Bar key={g.label} label={g.label} value={g.count} max={maxAge} />)}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-sm">
                      Region / Locality
                      {topRegions.length === 0 || (topRegions.length === 1 && topRegions[0][0] === 'Unknown')
                        ? <span className="ml-sm text-[9px] normal-case font-normal">(add patient addresses to unlock)</span>
                        : ''}
                    </p>
                    {topRegions.length === 0
                      ? <p className="text-[11px] text-on-surface-variant">No address data available</p>
                      : <div className="space-y-sm">
                          {topRegions.map(([region, count], i) => (
                            <Bar key={region} label={region} value={count} max={maxRegion}
                              color={`rgba(23,160,119,${1 - i * 0.1})`} />
                          ))}
                        </div>
                    }
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Analytics */}
          <Card title="Payment Analytics" icon="account_balance_wallet"
            filters={
              <ToggleGroup value={payStatus} onChange={setPayStatus}
                options={[{ value: 'all', label: 'All' }, { value: 'paid', label: 'Collected' }, { value: 'pending', label: 'Pending' }]} />
            }>
            <div className="space-y-md">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-sm">Collection Status</p>
                <div className="grid grid-cols-2 gap-sm">
                  {[
                    { label: 'Collected', value: collectedRevenue, color: TEAL },
                    { label: 'Pending',   value: pendingRevenue,   color: '#F59E0B' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-md text-center" style={{ background: `${s.color}12` }}>
                      <p className="text-xl font-black" style={{ color: s.color }}>₹{(s.value / 1000).toFixed(1)}K</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-sm">
                  Payment Mode Breakdown
                  {payStatus !== 'all' && <span className="ml-xs text-[9px] normal-case font-normal text-[#17A077]">· {payStatus === 'paid' ? 'Collected only' : 'Pending only'}</span>}
                </p>
                <div className="space-y-sm">
                  {topPayModes.length === 0
                    ? <p className="text-sm text-on-surface-variant">No payment mode data</p>
                    : topPayModes.map(([mode, count]) => (
                        <Bar key={mode} label={mode.replace('_', ' ').toUpperCase()} value={count} max={maxPayMode}
                          suffix={` (${Math.round(count / payTotal * 100)}%)`} />
                      ))
                  }
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Row: Status Funnel + Peak Visit ── */}
        <div className="grid grid-cols-12 gap-md">
          <div className="col-span-5">
            <Card title="Order Journey Funnel" icon="conversion_path"
              filters={
                <FilterSelect value={funnelDept} onChange={setFunnelDept}>
                  {availableDepts.map(d => <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>)}
                </FilterSelect>
              }>
              <div className="space-y-sm">
                {funnel.map(f => <Bar key={f.key} label={f.label} value={f.count} max={maxFunnel} color={f.color} />)}
              </div>
              <div className="mt-md pt-sm border-t border-outline-variant flex justify-between text-[10px] text-on-surface-variant">
                <span>Completion rate {funnelDept !== 'all' ? `· ${funnelDept}` : ''}</span>
                <span className="font-bold" style={{ color: TEAL }}>
                  {funnelOrders.length > 0
                    ? `${Math.round(funnel.filter(f => ['resulted', 'reported', 'delivered'].includes(f.key)).reduce((s, f) => s + f.count, 0) / funnelOrders.length * 100)}%`
                    : '—'}
                </span>
              </div>
            </Card>
          </div>

          <div className="col-span-7">
            <Card title="Peak Visit Analysis · All-Time · 24 / 7" icon="calendar_month"
              filters={
                <ToggleGroup value={peakDayType} onChange={setPeakDayType}
                  options={[{ value: 'all', label: 'All Days' }, { value: 'weekday', label: 'Weekdays' }, { value: 'weekend', label: 'Weekends' }]} />
              }>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-sm">Orders by Day of Week</p>
              <div className="flex items-end gap-sm h-24">
                {DAY_LABELS.map((day, i) => {
                  const isPeak = i === peakDayIdx;
                  const isGrayed = peakDayType === 'weekday' ? (i === 0 || i === 6) : peakDayType === 'weekend' ? (i >= 1 && i <= 5) : false;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-xs">
                      <span className="text-[9px] font-bold" style={{ color: isPeak ? TEAL : '#9CA3AF' }}>{dayVol[i] || ''}</span>
                      <div className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${Math.max(5, (dayVol[i] / maxDay) * 72)}px`,
                          background: isGrayed ? '#e1e2ec' : isPeak ? TEAL : `rgba(23,160,119,${0.15 + (dayVol[i] / maxDay) * 0.5})`,
                          opacity: isGrayed ? 0.35 : 1,
                        }} />
                      <span className="text-[10px] font-bold" style={{ color: isPeak ? TEAL : '#9CA3AF' }}>{day}</span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-sm mt-md">Patient Footfall by Time of Day</p>
              <div className="space-y-xs">
                {slotVol.map(s => {
                  const pct = Math.max(4, Math.round((s.count / maxSlot) * 100));
                  const isPeakSlot = s.label === peakSlot.label;
                  return (
                    <div key={s.label} className="flex items-center gap-sm">
                      <div className="w-28 flex-shrink-0">
                        <p className="text-[10px] font-bold text-on-surface leading-none">{s.label}</p>
                        <p className="text-[9px] text-on-surface-variant">{s.sub}</p>
                      </div>
                      <div className="flex-1 h-5 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="h-full rounded-full flex items-center pl-xs transition-all"
                          style={{ width: `${pct}%`, background: isPeakSlot ? TEAL : 'rgba(23,160,119,0.35)' }}>
                          {s.count > 0 && <span className="text-[9px] font-black text-white leading-none">{s.count}</span>}
                        </div>
                      </div>
                      {isPeakSlot && <span className="text-[9px] font-bold flex-shrink-0" style={{ color: TEAL }}>Peak</span>}
                    </div>
                  );
                })}
              </div>

              <div className="mt-md pt-sm border-t border-outline-variant rounded-xl bg-surface-container-lowest px-sm py-xs">
                <p className="text-[10px] text-on-surface-variant leading-snug">
                  <span className="material-symbols-outlined align-middle text-[13px] mr-xs" style={{ color: TEAL }}>insights</span>
                  Busiest: <strong style={{ color: TEAL }}>{DAY_FULL[peakDayIdx]}</strong>
                  {' '}during <strong style={{ color: TEAL }}>{peakSlot.sub}</strong>
                  {' '}· <span className="italic">Based on all recorded visits across the full year</span>
                  {' '}— schedule additional cover on this window
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* ── Row: Doctor Referrals + Disease Patterns ── */}
        <div className="grid grid-cols-2 gap-md">
          <Card title="Doctor Referral Leaderboard" icon="stethoscope"
            filters={
              <ToggleGroup value={docSort} onChange={v => setDocSort(v as 'count' | 'revenue')}
                options={[{ value: 'count', label: 'By Referrals' }, { value: 'revenue', label: 'By Revenue' }]} />
            }>
            <div className="space-y-sm">
              {topDocs.length === 0
                ? <p className="text-sm text-on-surface-variant text-center py-4">No referral data</p>
                : topDocs.map(([doc, data], idx) => (
                    <div key={doc} className="flex items-center gap-sm">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0"
                        style={{ background: idx === 0 ? TEAL : idx === 1 ? DEEP : '#737685' }}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[11px] font-bold text-on-surface truncate">{doc}</span>
                          <span className="text-[10px] text-on-surface-variant flex-shrink-0 ml-sm">
                            {docSort === 'revenue' ? `₹${(data.revenue / 1000).toFixed(1)}K` : `${data.count} refs`}
                          </span>
                        </div>
                        <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${((docSort === 'count' ? data.count : data.revenue) / maxDoc) * 100}%`, background: idx === 0 ? TEAL : `rgba(23,160,119,${0.5 - idx * 0.07})` }} />
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-on-surface w-10 text-right flex-shrink-0">
                        {docSort === 'count' ? data.count : `₹${(data.revenue / 1000).toFixed(1)}K`}
                      </span>
                    </div>
                  ))
              }
            </div>
            <p className="text-[10px] text-on-surface-variant mt-md pt-sm border-t border-outline-variant">
              Walk-in vs referred: {docMap['Walk-in / Direct']?.count ?? 0} direct · {filtered.length - (docMap['Walk-in / Direct']?.count ?? 0)} referred
            </p>
          </Card>

          <Card title="Disease Pattern Distribution" icon="biotech"
            filters={<>
              <FilterSelect value={disGender} onChange={setDisGender}>
                <option value="all">All Genders</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </FilterSelect>
              <FilterSelect value={disAge} onChange={setDisAge}>
                <option value="all">All Ages</option>
                <option value="pediatric">Pediatric (0–17)</option>
                <option value="young">Young Adult (18–44)</option>
                <option value="middle">Middle-aged (45–59)</option>
                <option value="senior">Senior (60+)</option>
              </FilterSelect>
            </>}>
            <div className="space-y-sm">
              {topDiseases.length === 0
                ? <p className="text-sm text-on-surface-variant text-center py-4">No test data</p>
                : topDiseases.map(([disease, count]) => (
                    <Bar key={disease} label={disease} value={count} max={maxDisease}
                      color={DISEASE_COLORS[disease] ?? TEAL}
                      suffix={` (${Math.round(count / maxDisease * 100)}%)`} />
                  ))
              }
            </div>
            <p className="text-[10px] text-on-surface-variant mt-md pt-sm border-t border-outline-variant">
              Based on test categories ordered — useful for stocking reagents and staffing
              {(disGender !== 'all' || disAge !== 'all') && (
                <button onClick={() => { setDisGender('all'); setDisAge('all'); }}
                  className="ml-sm text-[#17A077] hover:underline">Clear filters</button>
              )}
            </p>
          </Card>
        </div>

        {/* ── Inventory Health ── */}
        <div className="grid grid-cols-12 gap-md">
          <div className="col-span-8">
            <Card title="Inventory Health · Low Stock & Out of Stock" icon="inventory_2"
              filters={<>
                <ToggleGroup value={invSev} onChange={setInvSev}
                  options={[{ value: 'all', label: 'All' }, { value: 'out', label: 'Out of Stock' }, { value: 'low', label: 'Low Stock' }]} />
                <FilterSelect value={invCat} onChange={setInvCat}>
                  {invCategories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
                </FilterSelect>
              </>}>
              {allAlerts.length === 0
                ? <p className="text-sm text-on-surface-variant text-center py-4">All items adequately stocked</p>
                : invDisplay.length === 0
                  ? <p className="text-sm text-on-surface-variant text-center py-4">No items match the selected filters</p>
                  : <div className="space-y-xs">
                      {invDisplay.map(item => (
                        <div key={item.id} className="flex items-center gap-md px-sm py-sm rounded-lg"
                          style={{ background: item.sev === 'out' ? '#ffdad612' : '#FEF3C712' }}>
                          <span className="material-symbols-outlined text-base"
                            style={{ color: item.sev === 'out' ? '#ba1a1a' : '#F59E0B', fontVariationSettings: "'FILL' 1" }}>
                            {item.sev === 'out' ? 'cancel' : 'warning'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-bold text-on-surface truncate">{item.name}</p>
                            <p className="text-[10px] text-on-surface-variant">{item.category} · {item.supplier ?? 'No supplier'}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[12px] font-black" style={{ color: item.sev === 'out' ? '#ba1a1a' : '#F59E0B' }}>
                              {item.qty_on_hand} {item.unit}
                            </p>
                            <p className="text-[10px] text-on-surface-variant">threshold: {item.reorder_threshold}</p>
                          </div>
                        </div>
                      ))}
                    </div>
              }
            </Card>
          </div>

          <div className="col-span-4">
            <Card title="Stock by Category" icon="category"
              filters={
                <ToggleGroup value={catView} onChange={v => setCatView(v as 'skus' | 'qty' | 'alerts')}
                  options={[
                    { value: 'skus',   label: 'SKUs'   },
                    { value: 'qty',    label: 'Qty'    },
                    { value: 'alerts', label: 'Alerts' },
                  ]} />
              }>
              <div className="space-y-sm">
                {topCats.length === 0
                  ? <p className="text-sm text-on-surface-variant text-center py-4">
                      {catView === 'alerts' ? 'No stock alerts — all items adequately stocked' : 'No inventory data'}
                    </p>
                  : topCats.map(([cat, val]) => (
                      <Bar key={cat} label={cat} value={val} max={maxCat}
                        color={catColor(cat)} suffix={catSuffix} />
                    ))
                }
              </div>
              <div className="mt-md pt-sm border-t border-outline-variant grid grid-cols-3 gap-sm text-center">
                {[
                  { label: 'Total SKUs',   value: inventory.length,  color: TEAL },
                  { label: 'Low Stock',    value: lowStock.length,   color: '#F59E0B' },
                  { label: 'Out of Stock', value: outOfStock.length, color: '#ba1a1a' },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

      </main>
    </div>
  );
}
