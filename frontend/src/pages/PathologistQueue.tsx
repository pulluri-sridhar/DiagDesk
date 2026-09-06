import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  fetchOrders, fetchAllReports, fetchPatients,
  signReport, signoffReport, rejectReport,
  type Order, type Report, type Patient,
} from '../lib/api';
import { findTemplate, renderReportHTML } from '../lib/reportTemplates';
import { useAuth } from '../lib/auth';
import Sidebar from '../components/Sidebar';

const PURPLE   = '#7C3AED';
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

function timeAgo(isoStr: string): string {
  const mins = Math.floor((Date.now() - new Date(isoStr).getTime()) / 60000);
  if (mins < 60)  return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

// ── Signature Pad ──────────────────────────────────────────────────────────────

function SignaturePad({ onSave, onClear }: { onSave: (url: string) => void; onClear: () => void }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const drawing    = useRef(false);
  const hasStrokes = useRef(false);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const src  = 'touches' in e ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault(); drawing.current = true; hasStrokes.current = true;
    const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;
    ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y);
  }
  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault(); if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return;
    const p = getPos(e); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 2.5;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function stopDraw() { drawing.current = false; }
  function clear() {
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    hasStrokes.current = false; onClear();
  }
  function save() {
    if (!hasStrokes.current) { alert('Please draw your signature first.'); return; }
    onSave(canvasRef.current!.toDataURL('image/png'));
  }

  return (
    <div>
      <div className="border-2 border-dashed border-purple-300 rounded-xl overflow-hidden bg-white relative">
        <div className="absolute top-2 left-3 text-xs text-gray-400 pointer-events-none">Draw your signature here →</div>
        <canvas ref={canvasRef} width={560} height={120}
          className="touch-none w-full cursor-crosshair block"
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
      </div>
      <div className="flex gap-2 mt-2">
        <button onClick={clear} className="px-4 py-1.5 rounded-lg border text-xs font-bold text-gray-600 hover:bg-gray-50">
          Clear
        </button>
        <button onClick={save} className="px-4 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: PURPLE }}>
          Apply Signature
        </button>
      </div>
    </div>
  );
}

// ── Review Panel ───────────────────────────────────────────────────────────────

function ReviewPanel({
  report, order, patient,
  onSign, onReject,
}: {
  report: Report; order: Order | undefined; patient: Patient | undefined;
  onSign: (sig: string, name: string, notes: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const [sig,          setSig]         = useState('');
  const [pathNotes,    setPathNotes]   = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject,   setShowReject]   = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [previewHtml,  setPreviewHtml]  = useState('');

  const content  = report.content as Record<string, unknown>;
  const results  = (content.results as Record<string, string>) ?? {};
  const template = order
    ? findTemplate((order.items ?? [])[0]?.test_name ?? '', (order.items ?? [])[0]?.department ?? '')
    : null;

  useEffect(() => {
    setSig(''); setPathNotes(''); setRejectReason(''); setShowReject(false); setShowPreview(false);
  }, [report.id]);

  useEffect(() => {
    if (!template || !patient || !order) return;
    setPreviewHtml(renderReportHTML({
      template, results,
      patient: { name: patient.name, age: patient.age, sex: patient.sex, phone: patient.phone, mpi_no: patient.mpi_no },
      order:   { id: order.id, ordered_at: order.ordered_at, doctor_name: order.doctor_name, notes: order.notes },
      labInfo: LAB_INFO,
      reportNo: reportNo(report.id),
      signatureDataUrl: sig || undefined,
      pathologistName:  user?.name ?? 'Dr. Pathologist',
      pathologistQualification: 'MD Pathology, DNB',
    }));
  }, [template, patient, order, results, sig, user, report.id]);

  async function handleSign() {
    if (!sig) { alert('Please draw and apply your signature first.'); return; }
    setSaving(true);
    try { await onSign(sig, user?.name ?? 'Pathologist', pathNotes); }
    finally { setSaving(false); }
  }

  async function handleReject() {
    if (!rejectReason.trim()) { alert('Please state the rejection reason.'); return; }
    setSaving(true);
    try { await onReject(rejectReason); setShowReject(false); }
    finally { setSaving(false); }
  }

  const tests = (order?.items ?? []).map(i => i.test_name).join(', ');

  return (
    <div className="space-y-4">
      {/* Patient info strip */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center gap-4 text-sm">
        <div>
          <span className="font-black text-indigo-900">{patient?.name ?? '—'}</span>
          <span className="text-indigo-500 ml-2">{patient?.age}Y · {patient?.sex}</span>
        </div>
        <div className="text-indigo-500">|</div>
        <div className="text-indigo-700 font-medium">{tests || 'No tests'}</div>
        <div className="ml-auto text-xs text-indigo-400">{reportNo(report.id)}</div>
      </div>

      {/* Signature */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-purple-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">draw</span>
            Digital Signature — {user?.name ?? 'Pathologist'}
          </div>
          {sig && (
            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check_circle</span> Captured
            </span>
          )}
        </div>
        {sig ? (
          <div className="flex items-center gap-3 bg-white border border-purple-200 rounded-xl px-4 py-3">
            <img src={sig} alt="Signature" className="h-12 object-contain flex-1" />
            <button onClick={() => setSig('')}
              className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 flex-shrink-0">
              <span className="material-symbols-outlined text-sm">delete</span> Clear & Redo
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-purple-600 mb-2">Draw in the box, then click <strong>Apply Signature</strong>.</p>
            <SignaturePad onSave={setSig} onClear={() => setSig('')} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={() => setShowReject(v => !v)} disabled={saving}
          className="px-5 py-2.5 rounded-xl border-2 border-red-300 text-red-600 text-sm font-bold disabled:opacity-40 hover:bg-red-50">
          Reject
        </button>
        <button onClick={handleSign} disabled={saving || !sig}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-black disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: sig ? PURPLE : '#C4B5FD' }}>
          <span className="material-symbols-outlined text-base">verified_user</span>
          {saving ? 'Signing…' : sig ? 'Sign & Publish Report' : 'Apply signature first'}
        </button>
      </div>

      {/* Reject form */}
      {showReject && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
          <label className="text-xs font-bold text-red-600 uppercase tracking-wider">Rejection Reason</label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="Incorrect values, missing analytes, insufficient specimen…"
            rows={2} className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setShowReject(false)} className="px-4 py-1.5 rounded-lg border text-xs font-bold text-gray-600">Cancel</button>
            <button onClick={handleReject} disabled={saving} className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500 disabled:opacity-40">
              {saving ? 'Sending back…' : 'Confirm Reject'}
            </button>
          </div>
        </div>
      )}

      {/* Pathologist notes */}
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pathologist Notes (optional)</label>
        <textarea value={pathNotes} onChange={e => setPathNotes(e.target.value)}
          placeholder="Clinical observations, correlation notes, follow-up recommendations…"
          rows={2} className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none" />
      </div>

      {/* Collapsible report preview */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <div
          onClick={() => setShowPreview(v => !v)}
          className="w-full bg-gray-50 px-4 py-2.5 flex items-center justify-between hover:bg-gray-100 transition-colors cursor-pointer">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">description</span>
            Report Preview
          </span>
          <div className="flex items-center gap-2">
            {previewHtml && (
              <button onClick={e => {
                e.stopPropagation();
                const win = window.open('', '_blank'); if (!win) return;
                win.document.write(previewHtml); win.document.close();
              }} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">open_in_new</span>Full screen
              </button>
            )}
            <span className="material-symbols-outlined text-gray-400 text-base">
              {showPreview ? 'expand_less' : 'expand_more'}
            </span>
          </div>
        </div>
        {showPreview && (
          previewHtml
            ? <iframe srcDoc={previewHtml} className="w-full" style={{ height: 400, border: 'none' }} title="Report Preview" />
            : <div className="p-6 text-center text-gray-400 text-sm">No template available for this test.</div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PathologistQueue() {
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [reports,  setReports]  = useState<Report[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<{ report: Report; order: Order | undefined; patient: Patient | undefined } | null>(null);

  const patientMap = useMemo(() => new Map(patients.map(p => [p.id, p])), [patients]);
  const orderMap   = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);

  const queue = useMemo(() => reports.filter(r => r.status === 'in_review'), [reports]);
  const signedToday = useMemo(() => reports.filter(r => {
    if (r.status !== 'final') return false;
    const at = (r.content as any)?.signedAt;
    return at && new Date(at).toDateString() === new Date().toDateString();
  }), [reports]);

  const load = useCallback(async () => {
    const [o, r, p] = await Promise.all([fetchOrders(), fetchAllReports(), fetchPatients()]);
    setOrders(o); setReports(r); setPatients(p);
  }, []);

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, [load]);

  // Auto-select first queued report on load or after queue changes
  useEffect(() => {
    if (queue.length > 0 && !selected) {
      const r = queue[0];
      setSelected({ report: r, order: orderMap.get(r.order_id), patient: patientMap.get(r.patient_id) });
    }
    if (queue.length === 0) setSelected(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  const currentIdx = selected ? queue.findIndex(r => r.id === selected.report.id) : -1;

  function selectReport(r: Report) {
    setSelected({ report: r, order: orderMap.get(r.order_id), patient: patientMap.get(r.patient_id) });
  }

  function goNext() {
    if (currentIdx < queue.length - 1) selectReport(queue[currentIdx + 1]);
  }
  function goPrev() {
    if (currentIdx > 0) selectReport(queue[currentIdx - 1]);
  }

  async function handleSign(sig: string, name: string, notes: string) {
    if (!selected) return;
    // Notify reporting-service (best-effort — may 404 if report only in Supabase)
    signoffReport(selected.report.id, name, notes).catch(() => {});
    await signReport(selected.report.id, sig, name, notes);
    await load();
    // Auto-advance to next in queue
    const nextIdx = Math.min(currentIdx, queue.length - 2);
    if (nextIdx >= 0 && queue[nextIdx + 1]) {
      selectReport(queue[nextIdx + 1]);
    } else if (nextIdx >= 0 && queue[nextIdx]) {
      selectReport(queue[nextIdx]);
    }
  }

  async function handleReject(reason: string) {
    if (!selected) return;
    await rejectReport(selected.report.id, reason);
    await load();
    const nextIdx = Math.min(currentIdx, queue.length - 2);
    if (nextIdx >= 0 && queue[nextIdx + 1]) {
      selectReport(queue[nextIdx + 1]);
    } else if (nextIdx >= 0 && queue[nextIdx]) {
      selectReport(queue[nextIdx]);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#EEF3F7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar />
      <div className="ml-64">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-black text-gray-900">Pathologist Review Queue</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? 'Loading…' : `${queue.length} pending · ${signedToday.length} signed today`}
            </p>
          </div>

          {/* Prev / Next navigation */}
          {queue.length > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={goPrev} disabled={currentIdx <= 0}
                className="p-2 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <span className="material-symbols-outlined text-gray-600">chevron_left</span>
              </button>
              <span className="text-sm font-bold text-gray-600 min-w-[60px] text-center">
                {currentIdx + 1} / {queue.length}
              </span>
              <button onClick={goNext} disabled={currentIdx >= queue.length - 1}
                className="p-2 rounded-xl border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <span className="material-symbols-outlined text-gray-600">chevron_right</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            {queue.length > 0 && (
              <span className="text-xs bg-purple-100 text-purple-700 font-bold px-3 py-1 rounded-full">
                {queue.length} awaiting review
              </span>
            )}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">

          {/* Signed-today strip */}
          {signedToday.length > 0 && (
            <div className="mb-5 bg-green-50 border border-green-200 rounded-2xl px-5 py-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-green-600">verified_user</span>
              <span className="text-sm font-bold text-green-800">
                {signedToday.length} report{signedToday.length > 1 ? 's' : ''} signed today
              </span>
              <div className="flex gap-2 ml-2 overflow-x-auto">
                {signedToday.map(r => {
                  const p = patientMap.get(r.patient_id);
                  return (
                    <span key={r.id} className="text-xs bg-white border border-green-200 text-green-700 px-2.5 py-1 rounded-full whitespace-nowrap font-medium">
                      {p?.name ?? '—'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-4xl animate-spin mr-3">sync</span> Loading queue…
            </div>
          ) : queue.length === 0 ? (
            /* ── Empty queue ── */
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-16">
              <span className="material-symbols-outlined text-7xl mb-4" style={{ color: '#D1D5DB' }}>inbox</span>
              <h3 className="text-lg font-black text-gray-400 mb-2">Queue is clear</h3>
              <p className="text-sm text-gray-400 max-w-xs">
                No reports are waiting for pathologist review.
                {signedToday.length > 0 && ` You've signed ${signedToday.length} report${signedToday.length > 1 ? 's' : ''} today.`}
              </p>
            </div>
          ) : (
            <div className="flex gap-6">

              {/* ── LEFT: Queue list ── */}
              <div className="w-72 flex-shrink-0 space-y-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-3">
                  Pending Review ({queue.length})
                </div>
                {queue.map((r, idx) => {
                  const p = patientMap.get(r.patient_id);
                  const o = orderMap.get(r.order_id);
                  const tests = (o?.items ?? []).map(i => i.test_name).join(', ');
                  const isOpen = selected?.report.id === r.id;
                  return (
                    <div key={r.id}
                      className="bg-white rounded-2xl p-4 shadow-sm border-2 cursor-pointer transition-all"
                      style={{ borderColor: isOpen ? PURPLE : '#E5E7EB' }}
                      onClick={() => selectReport(r)}>
                      <div className="flex items-start justify-between mb-1.5">
                        <div>
                          <div className="font-black text-gray-900 text-sm">{p?.name ?? '—'}</div>
                          <div className="text-xs text-gray-500">{p?.age}Y · {p?.sex}</div>
                        </div>
                        {isOpen && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: PURPLE }}>
                            Reviewing
                          </span>
                        )}
                        {!isOpen && (
                          <span className="text-[10px] font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
                            #{idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate mb-1">{tests || 'No tests'}</div>
                      <div className="text-xs text-gray-400">{timeAgo(r.created_at)}</div>
                    </div>
                  );
                })}
              </div>

              {/* ── RIGHT: Review panel ── */}
              <div className="flex-1 min-w-0">
                {selected ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Panel header */}
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between"
                      style={{ background: '#FAF5FF' }}>
                      <div>
                        <div className="font-black text-gray-900">{selected.patient?.name ?? '—'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{reportNo(selected.report.id)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={goPrev} disabled={currentIdx <= 0}
                          className="p-1.5 rounded-lg border border-purple-200 disabled:opacity-30 hover:bg-purple-50 text-purple-600">
                          <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <span className="text-xs font-bold text-purple-600">{currentIdx + 1}/{queue.length}</span>
                        <button onClick={goNext} disabled={currentIdx >= queue.length - 1}
                          className="p-1.5 rounded-lg border border-purple-200 disabled:opacity-30 hover:bg-purple-50 text-purple-600">
                          <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <ReviewPanel
                        report={selected.report}
                        order={selected.order}
                        patient={selected.patient}
                        onSign={handleSign}
                        onReject={handleReject}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-12 text-center">
                    <span className="material-symbols-outlined text-5xl mb-3" style={{ color: '#D1D5DB' }}>lab_profile</span>
                    <p className="text-sm text-gray-400">Select a report from the queue to review</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
