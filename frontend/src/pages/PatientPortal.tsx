import { useState, useEffect, useMemo } from 'react';
import {
  fetchPatients, fetchPatientOrders, fetchAllReports,
  type Patient, type Order, type Report,
} from '../lib/api';
import { findTemplate, renderReportHTML } from '../lib/reportTemplates';
import { useAuth } from '../lib/auth';
import Sidebar from '../components/Sidebar';

const TEAL = '#17A077';
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

function statusLabel(status: string) {
  const map: Record<string, { label: string; bg: string }> = {
    registered:       { label: 'Registered',    bg: '#9CA3AF' },
    sample_collected: { label: 'Sample Taken',  bg: '#6366F1' },
    processing:       { label: 'Processing',    bg: '#F59E0B' },
    pending:          { label: 'Pending',        bg: '#F59E0B' },
    collected:        { label: 'Collected',      bg: '#6366F1' },
    resulted:         { label: 'Completed',      bg: TEAL },
    reported:         { label: 'Completed',      bg: TEAL },
    delivered:        { label: 'Delivered',      bg: TEAL },
    in_review:        { label: 'With Pathologist', bg: '#7C3AED' },
  };
  const c = map[status] ?? { label: status, bg: '#9CA3AF' };
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: c.bg }}>
      {c.label}
    </span>
  );
}

// ── Signed Report Card ────────────────────────────────────────────────────────

function ReportCard({ report, patient, order }: { report: Report; patient: Patient; order: Order | undefined }) {
  const content  = report.content as Record<string, unknown>;
  const results  = (content.results as Record<string, string>) ?? {};
  const template = order
    ? findTemplate((order.items ?? [])[0]?.test_name ?? '', (order.items ?? [])[0]?.department ?? '')
    : null;
  const tests     = (order?.items ?? []).map(i => i.test_name).join(', ') || 'Lab Report';
  const signedBy  = (content.pathologistName as string) ?? 'Pathologist';
  const signedAt  = content.signedAt
    ? new Date(content.signedAt as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const rptNo = reportNo(report.id);

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
    const html = buildHtml(); if (!html) { alert('Preview not available for this test.'); return; }
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  function downloadReport() {
    const html = buildHtml(); if (!html) { alert('Download not available for this test.'); return; }
    const name = `${rptNo}-${patient.name.replace(/\s+/g, '-')}.html`;
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  function shareWhatsApp() {
    const message = [
      `Hello, this is to share your lab report from DiagDesk Diagnostics.`,
      `Report No: ${rptNo}`,
      `Tests: ${tests}`,
      `Signed by: ${signedBy}`,
      `Date: ${signedAt}`,
      `Contact: ${LAB_INFO.phone}`,
    ].join('\n');
    const raw = patient.phone?.replace(/\D/g, '') ?? '';
    if (!raw) { alert('No phone number on file.'); return; }
    const intl = raw.startsWith('91') && raw.length === 12 ? raw : `91${raw.slice(-10)}`;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}15` }}>
            <span className="material-symbols-outlined text-xl" style={{ color: TEAL }}>lab_profile</span>
          </div>
          <div>
            <div className="font-bold text-gray-900">{tests}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {rptNo} &nbsp;·&nbsp; Signed {signedAt}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">By {signedBy}</div>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white flex-shrink-0" style={{ background: TEAL }}>
          Signed ✓
        </span>
      </div>

      <div className="flex gap-2 px-5 pb-4 border-t border-gray-100 pt-3">
        <button onClick={openReport}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-sm font-bold transition-colors hover:bg-indigo-50"
          style={{ borderColor: '#6366F1', color: '#6366F1' }}>
          <span className="material-symbols-outlined text-sm">preview</span> View
        </button>
        <button onClick={downloadReport}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-sm font-bold transition-colors hover:bg-teal-50"
          style={{ borderColor: TEAL, color: TEAL }}>
          <span className="material-symbols-outlined text-sm">download</span> Download
        </button>
        <button onClick={shareWhatsApp}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border-2 border-green-400 text-green-700 text-sm font-bold hover:bg-green-50">
          <span className="material-symbols-outlined text-sm">chat</span>
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PatientPortal() {
  const { user } = useAuth();
  const [patient,  setPatient]  = useState<Patient | null>(null);
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [reports,  setReports]  = useState<Report[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      const [allPatients, allReports] = await Promise.all([fetchPatients(), fetchAllReports()]);
      // Find by email match (patient records have an email field)
      const matched = allPatients.find(p => p.email?.toLowerCase() === user?.email?.toLowerCase())
        ?? allPatients[0]; // demo fallback
      if (!matched) { setLoading(false); return; }
      setPatient(matched);
      const patientOrders = await fetchPatientOrders(matched.id);
      setOrders(patientOrders);
      setReports(allReports.filter(r => r.patient_id === matched.id));
    }
    load().catch(console.error).finally(() => setLoading(false));
  }, [user?.email]);

  const orderMap    = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);
  const signedReports = reports.filter(r => r.status === 'final');
  const activeOrders  = orders.filter(o =>
    !['resulted', 'reported', 'delivered'].includes(o.status) &&
    !reports.some(r => r.order_id === o.id && r.status === 'final')
  );
  const completedOrders = orders.filter(o =>
    reports.some(r => r.order_id === o.id && r.status === 'final')
  );

  const firstName = patient?.name?.split(' ')[0] ?? user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="min-h-screen" style={{ background: '#EEF3F7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar />
      <div className="ml-64">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-30">
          <h1 className="text-xl font-black text-gray-900">My Health Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">{LAB_INFO.name}</p>
        </header>

        <div className="p-8 max-w-5xl mx-auto space-y-6">

          {/* Greeting card */}
          <div className="rounded-2xl px-8 py-6 flex items-center justify-between"
            style={{ background: `linear-gradient(135deg, ${TEAL}, #0D9460)` }}>
            <div>
              <div className="text-white/70 text-sm font-medium mb-1">Welcome back</div>
              <h2 className="text-2xl font-black text-white">Hello, {firstName}! 👋</h2>
              {patient && (
                <div className="text-white/80 text-sm mt-1 flex items-center gap-3">
                  <span>{patient.age}Y · {patient.sex}</span>
                  <span>·</span>
                  <span className="font-mono">{patient.mpi_no}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-white/70 text-xs mb-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-white">favorite</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          {!loading && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Orders',   value: orders.length,        icon: 'receipt_long',  color: '#6366F1' },
                { label: 'Active Orders',  value: activeOrders.length,  icon: 'hourglass_top', color: '#F59E0B' },
                { label: 'Reports Ready',  value: signedReports.length, icon: 'lab_profile',   color: TEAL     },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${s.color}15` }}>
                    <span className="material-symbols-outlined text-xl" style={{ color: s.color }}>{s.icon}</span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500 font-medium">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2 block" style={{ animation: 'spin 1s linear infinite', color: TEAL }}>sync</span>
              Loading your records…
            </div>
          ) : (
            <>
              {/* Reports ready */}
              {signedReports.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-base font-black text-gray-900">Reports Ready</h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: TEAL }}>
                      {signedReports.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {signedReports.map(r => (
                      <ReportCard key={r.id} report={r} patient={patient!} order={orderMap.get(r.order_id)} />
                    ))}
                  </div>
                </section>
              )}

              {/* Active orders */}
              {activeOrders.length > 0 && (
                <section>
                  <h3 className="text-base font-black text-gray-900 mb-3">Active Orders</h3>
                  <div className="space-y-3">
                    {activeOrders.map(o => {
                      const tests = (o.items ?? []).map(i => i.test_name).join(' · ');
                      const report = reports.find(r => r.order_id === o.id);
                      return (
                        <div key={o.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-50">
                            <span className="material-symbols-outlined text-xl text-amber-500">science</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 truncate">{tests}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {new Date(o.ordered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              {o.doctor_name && ` · Dr. ${o.doctor_name}`}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {report ? statusLabel(report.status) : statusLabel(o.status)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Completed orders */}
              {completedOrders.length > 0 && (
                <section>
                  <h3 className="text-base font-black text-gray-900 mb-3">Past Orders</h3>
                  <div className="space-y-2">
                    {completedOrders.map(o => {
                      const tests = (o.items ?? []).map(i => i.test_name).join(' · ');
                      return (
                        <div key={o.id} className="bg-white rounded-xl border border-gray-100 px-5 py-3.5 flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-800 truncate">{tests}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {new Date(o.ordered_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-700">₹{o.total.toLocaleString('en-IN')}</span>
                            {statusLabel('resulted')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {orders.length === 0 && (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
                  <span className="material-symbols-outlined text-5xl mb-3 block" style={{ color: '#D1D5DB' }}>science</span>
                  <p className="text-gray-400 text-sm">No orders found yet.</p>
                  <p className="text-gray-300 text-xs mt-1">Your test history will appear here.</p>
                </div>
              )}
            </>
          )}

          {/* Lab info footer */}
          <div className="text-center text-xs text-gray-400 pb-4">
            {LAB_INFO.name} &nbsp;·&nbsp; {LAB_INFO.phone} &nbsp;·&nbsp; Reg: {LAB_INFO.regNo}
          </div>
        </div>
      </div>
    </div>
  );
}
