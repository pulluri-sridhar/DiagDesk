import { useState, useEffect } from 'react';
import { fetchOrderStats, fetchOrders, saveOrderBarcode, type Order } from '../lib/api';
import { barcodeValue } from '../lib/barcode';
import Sidebar from '../components/Sidebar';
import BarcodeLabelModal from '../components/BarcodeLabelModal';

interface Stats { total: number; today: number; revenue: number; pending: number; }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, revenue: 0, pending: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [labelOrder, setLabelOrder] = useState<Order | null>(null);

  useEffect(() => {
    Promise.all([fetchOrderStats(), fetchOrders()])
      .then(([s, o]) => {
        setStats(s);
        setOrders(o);
        o.forEach(ord => saveOrderBarcode(ord.id, barcodeValue(ord.id)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Health-check order-service (replaces Supabase ping)
    fetch('/v1/orders?page=0&size=1', { headers: { 'X-Tenant-Id': '00000000-0000-0000-0000-000000000001' } })
      .then(r => setDbStatus(r.ok ? 'online' : 'offline'))
      .catch(() => setDbStatus('offline'));
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-IN');
  const fmtRupee = (n: number) => `₹${(n / 1000).toFixed(1)}K`;

  // Ingestion health = % of orders that are NOT cancelled
  const cancelled = orders.filter(o => o.status === 'cancelled').length;
  const ingestionPct = stats.total > 0
    ? ((stats.total - cancelled) / stats.total * 100).toFixed(2)
    : '—';

  // Sparkline: order counts for each of the last 5 days
  const last5Days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (4 - i));
    return d.toISOString().slice(0, 10);
  });
  const dayCounts = last5Days.map(day =>
    orders.filter(o => o.ordered_at?.startsWith(day)).length
  );
  const maxCount = Math.max(...dayCounts, 1);

  return (
    <div className="min-h-screen text-on-surface font-sans" style={{background: '#F0F4F7'}}>
<Sidebar />
{/* TopAppBar Anchor */}
<header className="fixed top-0 right-0 left-64 h-16 bg-white/80 backdrop-blur-md border-b border-outline-variant flex items-center justify-between px-lg z-40">
<div className="flex items-center gap-xl">
<div className="relative">
<span className="absolute left-md top-1/2 -translate-y-1/2 text-on-surface-variant material-symbols-outlined">search</span>
<input className="bg-surface-container-low border border-outline-variant rounded-full pl-xl pr-lg py-xs text-sm w-80 focus:ring-1 focus:ring-[#17A077] focus:outline-none font-medium placeholder:text-on-surface-variant/50" placeholder="CMD + K to search diagnostics..." type="text"/>
</div>
</div>
<div className="flex items-center gap-lg">
<div className="flex items-center gap-md text-on-surface-variant">
<span className="material-symbols-outlined cursor-pointer hover:text-[#17A077] transition-colors">sync</span>
<span className="material-symbols-outlined cursor-pointer hover:text-[#17A077] transition-colors" style={{fontVariationSettings: '\'FILL\' 1'}}>cloud_done</span>
<div className="relative">
<span className="material-symbols-outlined cursor-pointer hover:text-[#17A077] transition-colors">notifications</span>
<span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full"></span>
</div>
</div>
<div className="h-8 w-[1px] bg-outline-variant mx-sm"></div>
<div className="flex items-center gap-sm">
<button
  onClick={() => { localStorage.removeItem('diagdesk_session'); window.location.href = '/login'; }}
  className="flex items-center gap-xs px-sm py-xs rounded-lg border border-outline-variant text-on-surface-variant hover:text-error hover:border-error transition-colors text-xs font-medium"
>
  <span className="material-symbols-outlined" style={{fontSize:16}}>logout</span>
  Sign Out
</button>
</div>
</div>
</header>
{/* Main Content Canvas */}
<main className="ml-64 mt-16 p-lg pb-12 min-h-screen">
{/* Anomaly Alert Bar */}
{stats.pending > 0 && (
<div className="lumina-alert flex items-center justify-between px-md py-sm mb-lg">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-[18px]" style={{fontVariationSettings: "'FILL' 1"}}>warning</span>
<span className="text-[13px] font-semibold">{stats.pending} order{stats.pending !== 1 ? 's' : ''} pending processing</span>
</div>
<a href="#" className="text-[13px] font-bold flex items-center gap-1 hover:underline" style={{color: '#DC2626'}}>View Queue →</a>
</div>
)}
{/* Hero Section: System Pulse */}
<section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-lg">
{/* Total Orders */}
<div className="glass-panel p-lg relative overflow-hidden group border-l-4 border-l-primary">
<div className="scanline"></div>
<div className="flex justify-between items-start mb-md">
<div>
<p className="font-label-caps text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-xs">Total Orders</p>
<h2 className="font-stat-lg text-4xl text-[#17A077] font-bold tracking-tighter">
  {loading ? '—' : fmt(stats.total)}
</h2>
</div>
<div className="p-sm bg-[#17A077]/10 rounded-lg">
<span className="material-symbols-outlined text-[#17A077]">biotech</span>
</div>
</div>
<div className="flex items-center gap-sm">
<span className="text-xs font-bold" style={{color: '#17A077'}}>+{stats.today} today</span>
<div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
<div className="h-full bg-[#17A077]" style={{width: `${Math.min(100, (stats.today / Math.max(1, stats.total)) * 100 * 5)}%`}}></div>
</div>
</div>
</div>
{/* Revenue */}
<div className="glass-panel p-lg relative overflow-hidden border-l-4 border-l-secondary">
<div className="flex justify-between items-start mb-md">
<div className="">
<p className="font-label-caps text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-xs">Total Revenue</p>
<h2 className="font-stat-lg text-4xl text-on-surface font-bold tracking-tighter">
  {loading ? '—' : fmtRupee(stats.revenue)}
</h2>
</div>
<div className="p-sm bg-[#17A077]/10 rounded-lg">
<span className="material-symbols-outlined text-[#0D9460]">payments</span>
</div>
</div>
<div className="flex -space-x-2">
<div className="h-8 w-8 rounded-full border-2 border-white bg-surface-container-highest"></div>
<div className="h-8 w-8 rounded-full border-2 border-white bg-surface-container-highest"></div>
<div className="h-8 w-8 rounded-full border-2 border-white bg-surface-container-highest"></div>
<div className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center bg-surface-container-high text-[10px] font-bold text-on-surface-variant">
  {loading ? '…' : `${stats.pending} open`}
</div>
</div>
</div>
{/* Ingestion Health */}
<div className="glass-panel p-lg relative overflow-hidden border-l-4" style={{borderLeftColor: dbStatus === 'offline' ? '#ba1a1a' : '#17A077'}}>
<div className="flex justify-between items-start mb-xs">
<div>
  <p className="font-label-caps text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-xs">Ingestion Health</p>
  <h2 className="font-stat-lg text-4xl font-bold tracking-tighter" style={{color: dbStatus === 'offline' ? '#ba1a1a' : '#17A077'}}>
    {loading ? '…' : `${ingestionPct}%`}
  </h2>
  <p className="text-[10px] text-on-surface-variant mt-1">
    {loading ? '' : `${stats.total - cancelled} of ${stats.total} orders processed successfully${cancelled > 0 ? ` · ${cancelled} cancelled` : ''}`}
  </p>
</div>
<div className="flex flex-col items-end gap-1">
  {/* DB connectivity badge */}
  <div className="flex items-center gap-xs">
    <div className="w-2.5 h-2.5 rounded-full"
      style={{
        background: dbStatus === 'checking' ? '#F59E0B' : dbStatus === 'online' ? '#17A077' : '#ba1a1a',
        boxShadow: dbStatus === 'online' ? '0 0 8px rgba(23,160,119,0.5)' : 'none',
        animation: dbStatus === 'checking' ? 'pulse 1s infinite' : dbStatus === 'online' ? 'pulse-dot 2s infinite' : 'none',
      }}
    ></div>
    <span className="font-label-caps text-[10px] font-bold uppercase"
      style={{color: dbStatus === 'checking' ? '#F59E0B' : dbStatus === 'online' ? '#17A077' : '#ba1a1a'}}>
      {dbStatus === 'checking' ? 'Connecting…' : dbStatus === 'online' ? 'DB Connected' : 'DB Offline'}
    </span>
  </div>
  {/* Orders today */}
  <span className="text-[10px] text-on-surface-variant">{stats.today} orders today</span>
</div>
</div>
{/* Live sparkline — last 5 days order volume */}
<div className="mt-md">
  <p className="text-[9px] text-on-surface-variant uppercase tracking-wider mb-1">Orders · Last 5 Days</p>
  <div className="flex items-end gap-1.5 h-10">
    {dayCounts.map((count, i) => (
      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
        <div
          className="w-full rounded-t-sm transition-all"
          style={{
            height: `${Math.max(4, (count / maxCount) * 36)}px`,
            background: i === 4 ? '#17A077' : `rgba(23,160,119,${0.15 + (count / maxCount) * 0.5})`,
          }}
        ></div>
        <span className="text-[8px] text-on-surface-variant">{last5Days[i].slice(5)}</span>
      </div>
    ))}
  </div>
</div>
</div>
</section>
{/* Central Visualization & Recent Orders */}
<div className="grid grid-cols-12 gap-gutter">
{/* Recent Orders Table (8 Cols) */}
<div className="col-span-12 lg:col-span-8 glass-panel p-lg">
<div className="flex justify-between items-center mb-lg">
<div>
<h3 className="text-xl font-bold text-on-surface tracking-tight">Recent Orders</h3>
<p className="font-label-caps text-[10px] text-on-surface-variant font-medium">Live from Supabase</p>
</div>
</div>
{loading ? (
  <div className="flex items-center justify-center h-40 text-on-surface-variant">Loading…</div>
) : (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-outline-variant text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
          <th className="text-left pb-sm pr-md">Patient</th>
          <th className="text-left pb-sm pr-md">Tests</th>
          <th className="text-left pb-sm pr-md">Status</th>
          <th className="text-right pb-sm pr-md">Total</th>
          <th className="text-center pb-sm">Label</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-outline-variant/40">
        {orders.slice(0, 8).map(o => {
          const testNames = (o.items ?? []).map((i: any) => i.test_name).join(', ');
          const statusColor: Record<string, string> = {
            registered: '#737685', sample_collected: '#0D9460', processing: '#F59E0B',
            resulted: '#17A077', reported: '#17A077', delivered: '#1A7260', cancelled: '#ba1a1a',
          };
          return (
            <tr key={o.id} className="hover:bg-surface-container-low transition-colors">
              <td className="py-sm pr-md">
                <div className="font-medium text-on-surface">{o.patient_name ?? 'Unknown'}</div>
                <div className="text-[10px] text-on-surface-variant">{new Date(o.ordered_at).toLocaleDateString('en-IN')}</div>
              </td>
              <td className="py-sm pr-md text-on-surface-variant max-w-[160px] truncate">{testNames}</td>
              <td className="py-sm pr-md">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{background: statusColor[o.status] ?? '#737685'}}>
                  {o.status.replace('_', ' ').toUpperCase()}
                </span>
              </td>
              <td className="py-sm pr-md text-right font-bold text-on-surface">₹{o.total.toLocaleString('en-IN')}</td>
              <td className="py-sm text-center">
                <button
                  onClick={() => setLabelOrder(o)}
                  title="Print sample label"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-colors hover:bg-indigo-50"
                  style={{borderColor: '#6366F1', color: '#6366F1'}}>
                  <span className="material-symbols-outlined" style={{fontSize: 14}}>label</span>
                  Print
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
)}
</div>
{/* Critical Alerts Widget (4 Cols) */}
<div className="col-span-12 lg:col-span-4 glass-panel flex flex-col">
<div className="p-lg border-b border-outline-variant bg-surface-container-low/50 rounded-t-lg">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-error font-bold" style={{fontVariationSettings: '\'FILL\' 1'}}>warning</span>
<h3 className="text-lg font-bold text-on-surface">Critical Alerts</h3>
</div>
</div>
<div className="flex-1 overflow-y-auto custom-scrollbar p-md space-y-md max-h-[400px]">
<div className="p-md rounded-lg border border-outline-variant border-l-4 border-l-error bg-white hover:shadow-md transition-shadow cursor-pointer group">
<div className="flex justify-between items-start mb-xs">
<span className="font-label-caps text-[10px] text-error uppercase font-black tracking-widest">Inventory Alert</span>
<span className="text-[10px] text-on-surface-variant font-bold font-label-caps">Now</span>
</div>
<p className="text-sm font-bold text-on-surface mb-sm">Dengue NS1 Test Kit: 3 strips left (threshold: 10)</p>
<div className="flex gap-sm">
<button className="text-[10px] font-bold font-label-caps px-sm py-1.5 border border-outline-variant rounded hover:bg-surface-container transition-colors bg-surface-container-low">REORDER</button>
</div>
</div>
<div className="p-md rounded-lg border border-outline-variant border-l-4 border-l-amber-500 bg-white hover:shadow-md transition-shadow cursor-pointer group">
<div className="flex justify-between items-start mb-xs">
<span className="font-label-caps text-[10px] text-amber-600 uppercase font-black tracking-widest">Orders Pending</span>
<span className="text-[10px] text-on-surface-variant font-bold font-label-caps">Live</span>
</div>
<p className="text-sm font-bold text-on-surface mb-sm">{stats.pending} order{stats.pending !== 1 ? 's' : ''} awaiting processing</p>
<div className="flex gap-sm">
<button className="text-[10px] font-bold font-label-caps px-sm py-1.5 border border-outline-variant rounded hover:bg-surface-container transition-colors bg-surface-container-low">VIEW QUEUE</button>
</div>
</div>
</div>
</div>
</div>
{/* System Health Grid */}
<section className="mt-lg">
<h3 className="font-label-caps text-[11px] text-on-surface-variant font-black uppercase tracking-[0.25em] mb-md ml-1">Infrastructure Telemetry</h3>
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
<div className="glass-panel p-md flex items-center gap-lg hover:border-[#17A077]/50 transition-colors">
<div className="h-12 w-12 flex items-center justify-center rounded-lg bg-[#17A077]/5 text-[#17A077]">
<span className="material-symbols-outlined text-2xl font-bold">database</span>
</div>
<div>
<p className="font-label-caps text-[11px] text-on-surface-variant font-bold uppercase">Supabase DB</p>
<div className="flex items-center gap-sm">
<span className="text-sm font-black text-on-surface">ONLINE</span>
<div className="w-2.5 h-2.5 rounded-full bg-[#17A077] shadow-[0_0_8px_rgba(23,160,119,0.35)]"></div>
</div>
</div>
</div>
<div className="glass-panel p-md flex items-center gap-lg hover:border-[#17A077]/50 transition-colors">
<div className="h-12 w-12 flex items-center justify-center rounded-lg bg-[#17A077]/5 text-[#17A077]">
<span className="material-symbols-outlined text-2xl font-bold">hub</span>
</div>
<div>
<p className="font-label-caps text-[11px] text-on-surface-variant font-bold uppercase">Kong Gateway</p>
<div className="flex items-center gap-sm">
<span className="text-sm font-black text-on-surface">ONLINE</span>
<div className="w-2.5 h-2.5 rounded-full bg-[#17A077] shadow-[0_0_8px_rgba(23,160,119,0.35)]"></div>
</div>
</div>
</div>
<div className="glass-panel p-md flex items-center gap-lg hover:border-[#17A077]/50 transition-colors">
<div className="h-12 w-12 flex items-center justify-center rounded-lg bg-[#17A077]/5 text-[#17A077]">
<span className="material-symbols-outlined text-2xl font-bold">grid_view</span>
</div>
<div>
<p className="font-label-caps text-[11px] text-on-surface-variant font-bold uppercase">K8s Clusters</p>
<div className="flex items-center gap-sm">
<span className="text-sm font-black text-on-surface">12/12 NODES</span>
<div className="w-2.5 h-2.5 rounded-full bg-[#17A077] shadow-[0_0_8px_rgba(23,160,119,0.35)]"></div>
</div>
</div>
</div>
<div className="glass-panel p-md flex items-center gap-lg hover:border-amber-500/50 transition-colors">
<div className="h-12 w-12 flex items-center justify-center rounded-lg bg-amber-50 text-amber-600">
<span className="material-symbols-outlined text-2xl font-bold">memory</span>
</div>
<div>
<p className="font-label-caps text-[11px] text-on-surface-variant font-bold uppercase">Redis Cache</p>
<div className="flex items-center gap-sm">
<span className="text-sm font-black text-on-surface">STRESSED</span>
<div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)] pulse-dot"></div>
</div>
</div>
</div>
</div>
</section>
{/* Command Bar CLI */}
<div className="fixed bottom-12 right-lg left-[calc(16rem+1.5rem)] glass-panel bg-white/95 border-[#17A077]/20 p-xs flex items-center gap-md shadow-2xl">
<span className="font-label-caps text-[#17A077] text-xs ml-md select-none font-black tracking-widest">DIAGDESK&gt;</span>
<input className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface font-label-caps text-xs py-2 placeholder:text-on-surface-variant/30 font-medium" placeholder="Enter clinical protocol command (e.g. /reboot-hplc-04) or '?'..." type="text"/>
<div className="flex gap-xs pr-sm">
<kbd className="px-2 py-1 rounded bg-surface-container border border-outline-variant text-[9px] text-on-surface-variant font-bold font-label-caps shadow-sm">CTRL</kbd>
<kbd className="px-2 py-1 rounded bg-surface-container border border-outline-variant text-[9px] text-on-surface-variant font-bold font-label-caps shadow-sm">ENTER</kbd>
</div>
</div>
</main>
{/* Footer Anchor */}
<footer className="fixed bottom-0 right-0 left-64 h-8 bg-white border-t border-outline-variant flex items-center justify-between px-md w-full z-40">
<div className="flex items-center gap-lg">
<span className="text-[#17A077] text-[10px] font-label-caps font-black tracking-wider uppercase">DiagDesk v2.4.0-stable</span>
<div className="flex items-center gap-md text-on-surface-variant text-[9px] font-bold font-label-caps uppercase tracking-widest">
<span className="flex items-center gap-xs"><span className="w-1.5 h-1.5 rounded-full bg-[#17A077]"></span> Branch: Central Hub</span>
<span className="flex items-center gap-xs"><span className="w-1.5 h-1.5 rounded-full bg-[#17A077]"></span> Env: Production</span>
</div>
</div>
<div className="flex items-center gap-lg text-[9px] text-on-surface-variant font-bold font-label-caps uppercase tracking-widest">
<span className="hover:text-[#17A077] cursor-pointer transition-colors">Latency: 24ms</span>
<span className="hover:text-[#17A077] cursor-pointer transition-colors">Uptime: 99.9%</span>
</div>
</footer>

      {/* Barcode Label Modal — walk-in patients */}
      {labelOrder && (
        <BarcodeLabelModal
          order={labelOrder}
          collectorName="Lab Staff"
          onClose={() => setLabelOrder(null)}
        />
      )}
    </div>
  );
}
