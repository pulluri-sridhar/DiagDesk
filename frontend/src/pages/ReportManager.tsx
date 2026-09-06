import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fetchOrders, fetchAllReports, fetchPatients, createReportDraft,
  updateReportContent, generateReport, uploadSignedReportHtml,
  type Order, type Report, type Patient,
} from '../lib/api';
import {
  findTemplate, renderReportHTML, type ReportTemplate,
} from '../lib/reportTemplates';
import { useAuth } from '../lib/auth';
import Sidebar from '../components/Sidebar';

const TEAL     = '#17A077';
const PURPLE   = '#7C3AED';
const LAB_INFO = {
  name:    'DiagDesk Diagnostics',
  address: '12, Health Hub, Koramangala 6th Block, Bangalore — 560095',
  phone:   '+91 80 4567 8900',
  regNo:   'KA/MED/LAB/2019/00142',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function reportNo(reportId: string): string {
  let h = 5381;
  for (const c of reportId) h = ((h << 5) + h) ^ c.charCodeAt(0);
  return `RPT-${new Date().getFullYear()}-${((h >>> 0) % 99999).toString().padStart(5, '0')}`;
}

function statusChip(status: string) {
  const cfg: Record<string, { bg: string; label: string }> = {
    draft:       { bg: '#9CA3AF', label: 'Draft' },
    in_review:   { bg: '#F59E0B', label: 'Pending Review' },
    preliminary: { bg: '#6366F1', label: 'Preliminary' },
    final:       { bg: TEAL,     label: 'Signed ✓' },
    rejected:    { bg: '#EF4444', label: 'Rejected' },
  };
  const c = cfg[status] ?? cfg.draft;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: c.bg }}>
      {c.label}
    </span>
  );
}

// ── Result Entry Form ─────────────────────────────────────────────────────────

function ResultEntryForm({
  order: _order, patient, template, existingResults, onSave,
}: {
  order: Order; patient: Patient | undefined; template: ReportTemplate;
  existingResults: Record<string, string>; onSave: (results: Record<string, string>, submit: boolean) => Promise<void>;
}) {
  const [results, setResults] = useState<Record<string, string>>(existingResults);
  const [saving,  setSaving]  = useState(false);

  async function handleSave(submit: boolean) {
    setSaving(true);
    try { await onSave(results, submit); }
    finally { setSaving(false); }
  }

  const categories = Array.from(new Set(template.analytes.map(a => a.category ?? 'Results')));
  const filled = template.analytes.filter(a => results[a.id]?.trim()).length;
  const progress = Math.round((filled / template.analytes.length) * 100);

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Results entry progress</span>
          <span>{filled}/{template.analytes.length} analytes</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: TEAL }}></div>
        </div>
      </div>

      {/* Specimen info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
        <span className="font-bold">Specimen:</span> {template.specimenType} &nbsp;|&nbsp;
        <span className="font-bold">Methodology:</span> {template.methodology}
      </div>

      {/* Analyte fields by category */}
      {categories.map(cat => (
        <div key={cat}>
          <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-3 py-1.5 rounded-lg mb-2">{cat}</div>
          <div className="space-y-2">
            {template.analytes.filter(a => (a.category ?? 'Results') === cat).map(a => {
              const val   = results[a.id] ?? '';
              const refStr = patient?.sex === 'M' && a.refRangeM ? a.refRangeM
                : patient?.sex === 'F' && a.refRangeF ? a.refRangeF
                : a.refRange;
              const num   = parseFloat(val);
              const rangeM = refStr.match(/([\d.]+)\s*[–\-]\s*([\d.]+)/);
              let flag: 'H' | 'L' | 'N' | '' = '';
              if (rangeM && !isNaN(num)) {
                flag = num > parseFloat(rangeM[2]) ? 'H' : num < parseFloat(rangeM[1]) ? 'L' : 'N';
              }
              return (
                <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-200 hover:border-gray-300 bg-white">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800">{a.label}</div>
                    <div className="text-xs text-gray-400">Ref: {refStr} &nbsp;{a.unit !== '—' ? `| Unit: ${a.unit}` : ''}</div>
                  </div>
                  <input
                    value={val}
                    onChange={e => setResults(prev => ({ ...prev, [a.id]: e.target.value }))}
                    placeholder="Enter value"
                    className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#17A077]"
                  />
                  <div className="w-6 text-center">
                    {flag === 'H' && <span className="text-xs font-bold text-red-600">H</span>}
                    {flag === 'L' && <span className="text-xs font-bold text-blue-600">L</span>}
                    {flag === 'N' && <span className="text-xs text-green-600">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <button onClick={() => handleSave(false)} disabled={saving}
          className="flex-1 py-2.5 rounded-xl border-2 text-sm font-bold disabled:opacity-40"
          style={{ borderColor: TEAL, color: TEAL }}>
          {saving ? 'Saving…' : 'Save Draft'}
        </button>
        <button onClick={() => handleSave(true)} disabled={saving || filled < Math.ceil(template.analytes.length * 0.5)}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40"
          style={{ background: TEAL }}>
          {saving ? 'Submitting…' : 'Submit for Pathologist Review'}
        </button>
      </div>
    </div>
  );
}

// ── Signed Report Actions ─────────────────────────────────────────────────────

function SignedReportActions({ report, order, patient }: { report: Report; order: Order | undefined; patient: Patient | undefined }) {
  const { user } = useAuth();
  const [uploading, setUploading]           = useState(false);
  const [storageUrl, setStorageUrl]         = useState(report.pdf_url ?? '');
  const [notifSent, setNotifSent]           = useState<'email' | 'whatsapp' | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [reportDownloaded, setReportDownloaded] = useState(false);

  const content   = report.content as Record<string, unknown>;
  const results   = (content.results as Record<string, string>) ?? {};
  const template  = order ? findTemplate((order.items ?? [])[0]?.test_name ?? '', (order.items ?? [])[0]?.department ?? '') : null;

  // ── Message content (shared by email and WhatsApp) ────────────────────────
  const patientName = patient?.name ?? 'Patient';
  const testNames   = (order?.items ?? []).map(i => i.test_name).join(', ') || 'Lab Tests';
  const signedBy    = (content.pathologistName as string) ?? 'Pathologist';
  const signedDate  = content.signedAt
    ? new Date(content.signedAt as string).toLocaleString('en-IN')
    : new Date().toLocaleString('en-IN');
  const rptNo       = reportNo(report.id);

  const emailSubject = `Lab Report Ready — ${rptNo} | DiagDesk Diagnostics`;

  // Body differs: if we have a cloud link the patient can click it; otherwise tell them to open the attachment.
  const emailBody = storageUrl
    ? [
        `Dear ${patientName},`,
        '',
        'Your lab report from DiagDesk Diagnostics is ready. Click the link below to view and download it.',
        '',
        `🔗 Download Report: ${storageUrl}`,
        '',
        `Report No  : ${rptNo}`,
        `Tests      : ${testNames}`,
        `Signed by  : ${signedBy}`,
        `Date       : ${signedDate}`,
        '',
        `For queries: ${LAB_INFO.phone}  |  ${LAB_INFO.address}`,
        '',
        'Regards,',
        'DiagDesk Diagnostics Team',
      ].join('\n')
    : [
        `Dear ${patientName},`,
        '',
        'Your lab report from DiagDesk Diagnostics is ready. Please find it attached to this email.',
        '',
        `Report No  : ${rptNo}`,
        `Tests      : ${testNames}`,
        `Signed by  : ${signedBy}`,
        `Date       : ${signedDate}`,
        '',
        `For queries: ${LAB_INFO.phone}  |  ${LAB_INFO.address}`,
        '',
        'Regards,',
        'DiagDesk Diagnostics Team',
      ].join('\n');

  const waMessage = [
    `Dear ${patientName},`,
    '',
    'Your lab report from DiagDesk Diagnostics is ready. 🔬',
    '',
    `📋 Report No: ${rptNo}`,
    `🧪 Tests: ${testNames}`,
    `✅ Signed by: ${signedBy}`,
    `📅 Date: ${signedDate}`,
    storageUrl ? `🔗 View Report: ${storageUrl}` : '',
    '',
    `For queries, call: ${LAB_INFO.phone}`,
    '',
    'DiagDesk Diagnostics, Koramangala, Bangalore',
  ].filter(l => l !== undefined).join('\n');

  function buildReportHtml(): string {
    if (!template || !patient || !order) return '';
    return renderReportHTML({
      template, results,
      patient: { name: patient.name, age: patient.age, sex: patient.sex, phone: patient.phone, mpi_no: patient.mpi_no },
      order:   { id: order.id, ordered_at: order.ordered_at, doctor_name: order.doctor_name, notes: order.notes },
      labInfo: LAB_INFO,
      reportNo: rptNo,
      signatureDataUrl: content.pathologistSignature as string | undefined,
      pathologistName:  (content.pathologistName as string | undefined) ?? user?.name,
      pathologistQualification: 'MD Pathology, DNB',
      signedAt: content.signedAt as string | undefined,
    });
  }

  function openReport() {
    const html = buildReportHtml(); if (!html) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html); win.document.close();
  }

  function printReport() {
    const html = buildReportHtml(); if (!html) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html); win.document.close();
    setTimeout(() => win.print(), 400);
  }

  function downloadReport(): string {
    const html = buildReportHtml(); if (!html) return '';
    const filename = `${rptNo}-${patientName.replace(/\s+/g, '-')}.html`;
    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setReportDownloaded(true);
    return filename;
  }

  async function saveToStorage() {
    const html = buildReportHtml(); if (!html) return;
    setUploading(true);
    try {
      const url = await uploadSignedReportHtml(report.id, html);
      if (url) setStorageUrl(url);
      else alert('Upload failed — please create a Supabase Storage bucket named "signed-reports" with public access.');
    } finally {
      setUploading(false);
    }
  }

  function sendWhatsApp() {
    const raw = patient?.phone?.replace(/\D/g, '') ?? '';
    if (!raw) {
      alert(`No phone number on file for ${patientName}. Please update patient details first.`);
      return;
    }
    // Ensure international format for India
    const intl = raw.startsWith('91') && raw.length === 12 ? raw : `91${raw.slice(-10)}`;
    const url = `https://wa.me/${intl}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, '_blank', 'noopener');
    setNotifSent('whatsapp');
    setTimeout(() => setNotifSent(null), 5000);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(storageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function openEmailClient() {
    const a = document.createElement('a');
    a.href = `mailto:${patient?.email ?? ''}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    a.click();
    setNotifSent('email');
    setTimeout(() => setNotifSent(null), 5000);
    setShowEmailModal(false);
  }

  function handleDownloadThenEmail() {
    const filename = downloadReport();
    if (!filename) return;
    // Give the browser a moment to start the download, then open email client
    setTimeout(() => openEmailClient(), 400);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
        <span className="material-symbols-outlined text-base">verified_user</span>
        <span className="text-sm font-bold">Report signed by {(content.pathologistName as string) ?? 'Pathologist'}</span>
        {!!content.signedAt && <span className="text-xs text-green-600 ml-auto">{new Date(content.signedAt as string).toLocaleString('en-IN')}</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={openReport} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-indigo-300 text-indigo-700 text-sm font-bold hover:bg-indigo-50">
          <span className="material-symbols-outlined text-base">preview</span>View
        </button>
        <button onClick={printReport} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold hover:bg-gray-50" style={{ borderColor: TEAL, color: TEAL }}>
          <span className="material-symbols-outlined text-base">print</span>Print / PDF
        </button>
        <button onClick={() => setShowEmailModal(true)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-blue-300 text-blue-700 text-sm font-bold hover:bg-blue-50">
          <span className="material-symbols-outlined text-base">email</span>
          {notifSent === 'email' ? 'Email Sent ✓' : 'Email Patient'}
        </button>
        <button onClick={sendWhatsApp}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-green-400 text-green-700 text-sm font-bold hover:bg-green-50">
          <span className="material-symbols-outlined text-base">chat</span>
          {notifSent === 'whatsapp' ? 'Opened WhatsApp ✓' : 'WhatsApp'}
        </button>
      </div>

      {/* ── Email compose modal ── */}
      {showEmailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setShowEmailModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-base">email</span>
                Email Report to Patient
              </div>
              <button onClick={() => setShowEmailModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">

              {/* To / Subject */}
              <div className="space-y-2">
                <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm ${patient?.email ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  <span className="material-symbols-outlined text-sm flex-shrink-0">{patient?.email ? 'check_circle' : 'warning'}</span>
                  <span><span className="font-bold">To:</span> {patient?.email ?? 'No email on file — enter manually in your email client'}</span>
                </div>
                <div className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-700">
                  <span className="font-bold">Subject:</span> {emailSubject}
                </div>
              </div>

              {storageUrl ? (
                /* ── Path A: report already in cloud storage — just send the link ── */
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 flex items-start gap-2">
                    <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">cloud_done</span>
                    <div>
                      <div className="font-bold mb-0.5">Report saved to cloud storage</div>
                      <div className="text-xs break-all">{storageUrl}</div>
                    </div>
                    <button onClick={copyLink} className="ml-auto text-green-700 hover:text-green-900 flex-shrink-0 flex items-center gap-1 text-xs font-bold">
                      <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    The email will include a direct download link. The patient can click it to view and save the report.
                  </p>
                </div>
              ) : (
                /* ── Path B: no cloud link — download file then attach ── */
                <div className="space-y-3">
                  <div className={`border-2 rounded-xl p-4 transition-colors ${reportDownloaded ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-gray-800">
                          {reportDownloaded ? '✓ Report file downloaded' : 'Step 1 — Download the report file'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {reportDownloaded
                            ? `${rptNo}-${patientName.replace(/\s+/g, '-')}.html — ready to attach`
                            : 'Saves the signed report as an HTML file to your device'}
                        </div>
                      </div>
                      <button
                        onClick={downloadReport}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${reportDownloaded ? 'border border-green-300 text-green-700 bg-white hover:bg-green-50' : 'text-white'}`}
                        style={reportDownloaded ? {} : { background: '#374151' }}>
                        <span className="material-symbols-outlined text-sm">{reportDownloaded ? 'check' : 'download'}</span>
                        {reportDownloaded ? 'Re-download' : 'Download Report'}
                      </button>
                    </div>
                  </div>

                  <div className={`border-2 rounded-xl p-4 transition-all ${reportDownloaded ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50 opacity-50'}`}>
                    <div className="text-sm font-bold text-gray-800 mb-1">Step 2 — Open your email client &amp; attach</div>
                    <div className="text-xs text-gray-500 leading-relaxed">
                      Your email will open pre-filled with the subject and message. Attach the downloaded file before sending.
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700 flex items-start gap-2">
                    <span className="material-symbols-outlined text-sm flex-shrink-0 mt-0.5">info</span>
                    Tip: Save the report to Object Storage (below the action buttons) first to send a clickable link instead of an attachment.
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
              {storageUrl ? (
                <button
                  onClick={openEmailClient}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold"
                  style={{ background: '#2563EB' }}>
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Open Email Client (with link)
                </button>
              ) : (
                <>
                  <button
                    onClick={downloadReport}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">
                    <span className="material-symbols-outlined text-sm">download</span>
                    Download
                  </button>
                  <button
                    onClick={handleDownloadThenEmail}
                    disabled={false}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold"
                    style={{ background: '#2563EB' }}>
                    <span className="material-symbols-outlined text-sm">attach_email</span>
                    Download + Open Email Client
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Object storage */}
      <div className="border border-dashed border-gray-300 rounded-xl p-3">
        <div className="text-xs font-bold text-gray-500 mb-2">Object Storage (Supabase)</div>
        {storageUrl
          ? <a href={storageUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline break-all">{storageUrl}</a>
          : (
            <button onClick={saveToStorage} disabled={uploading}
              className="w-full py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40 flex items-center justify-center gap-1.5"
              style={{ background: '#374151' }}>
              <span className="material-symbols-outlined text-sm">{uploading ? 'sync' : 'cloud_upload'}</span>
              {uploading ? 'Uploading…' : 'Save to Object Storage'}
            </button>
          )
        }
      </div>
    </div>
  );
}

// ── Report Card (module-level so React sees a stable component type) ──────────

interface ReportCardProps {
  report: Report;
  orderMap: Map<string, Order>;
  patientMap: Map<string, Patient>;
  selectedId: string | null;
  onOpen: (r: Report) => void;
}

function ReportCard({ report, orderMap, patientMap, selectedId, onOpen }: ReportCardProps) {
  const order   = orderMap.get(report.order_id);
  const patient = patientMap.get(report.patient_id);
  const tests   = (order?.items ?? []).map(i => i.test_name).join(', ');
  const isOpen  = selectedId === report.id;
  const effectiveStatus = report.status === 'draft' && (report.content as any)?.rejectionReason
    ? 'rejected' : report.status;

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-sm border-2 cursor-pointer transition-all"
      style={{ borderColor: isOpen ? TEAL : '#E5E7EB' }}
      onClick={() => onOpen(report)}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-black text-gray-900 text-sm">{patient?.name ?? report.patient_name ?? '—'}</div>
          <div className="text-xs text-gray-500 mt-0.5">{patient?.age}Y {patient?.sex} · {reportNo(report.id)}</div>
        </div>
        {statusChip(effectiveStatus)}
      </div>
      <div className="text-xs text-gray-500 truncate">{tests || 'No tests'}</div>
      <div className="text-xs text-gray-400 mt-1">{new Date(report.created_at).toLocaleDateString('en-IN')}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ReportManager() {
  const { role } = useAuth();
  const isLabTech = role === 'lab_tech' || role === 'admin';

  const [orders,   setOrders]   = useState<Order[]>([]);
  const [reports,  setReports]  = useState<Report[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading,  setLoading]  = useState(true);

  const [activeTab, setActiveTab] = useState<'pending_results' | 'final'>('pending_results');
  const [selected, setSelected]  = useState<{ report: Report; order: Order | undefined; patient: Patient | undefined } | null>(null);
  const [creating, setCreating]  = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchOrders(), fetchAllReports(), fetchPatients()])
      .then(([o, r, p]) => { setOrders(o); setReports(r); setPatients(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const reload = useCallback(async () => {
    const [o, r, p] = await Promise.all([fetchOrders(), fetchAllReports(), fetchPatients()]);
    setOrders(o); setReports(r); setPatients(p);
  }, []);

  const patientMap = useMemo(() => new Map(patients.map(p => [p.id, p])), [patients]);
  const orderMap   = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);
  const reportByOrder = useMemo(() => {
    const m = new Map<string, Report[]>();
    reports.forEach(r => { if (!m.has(r.order_id)) m.set(r.order_id, []); m.get(r.order_id)!.push(r); });
    return m;
  }, [reports]);

  // Any order (registered, collected, or processing) that doesn't have a non-rejected report yet
  const REPORTABLE_STATUSES = ['registered', 'sample_collected', 'processing', 'pending', 'collected'];
  const ordersNeedingReport = useMemo(() =>
    orders.filter(o =>
      REPORTABLE_STATUSES.includes(o.status) &&
      !(reportByOrder.get(o.id) ?? []).some(r => r.status === 'in_review' || r.status === 'final')
    ), [orders, reportByOrder]);

  const pending = reports.filter(r => r.status === 'draft');
  const pendingReview = reports.filter(r => r.status === 'in_review');
  const signed = reports.filter(r => r.status === 'final');

  // ── Create draft report ───────────────────────────────────────────────────

  async function handleCreateDraft(order: Order) {
    setCreating(order.id);
    setCreateError(null);
    try {
      const draft = await createReportDraft(order.id, order.patient_id, { results: {} });
      // Notify reporting-service concurrently (best-effort — may fail if order unknown there)
      generateReport(order.id).catch(() => {});
      await reload();
      const p = patientMap.get(order.patient_id);
      setSelected({ report: draft, order, patient: p });
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to create report draft';
      setCreateError(
        msg.includes('security') || msg.includes('policy') || msg.includes('401')
          ? 'Database permission denied. Run: ALTER TABLE reports DISABLE ROW LEVEL SECURITY; in your Supabase SQL Editor.'
          : msg
      );
    } finally { setCreating(null); }
  }

  // ── Save results ──────────────────────────────────────────────────────────

  async function handleSaveResults(reportId: string, results: Record<string, string>, submit: boolean) {
    const status = submit ? 'in_review' : 'draft';
    const updated = await updateReportContent(reportId, { results }, status);
    await reload();
    if (submit) {
      // Report moves to in_review — no longer visible in this page's lists
      setSelected(null);
    } else {
      setSelected(prev => prev ? { ...prev, report: updated } : null);
    }
  }

  // ── Resolve selected ───────────────────────────────────────────────────────

  function openReport(report: Report) {
    const order   = orderMap.get(report.order_id);
    const patient = patientMap.get(report.patient_id);
    setSelected({ report, order, patient });
  }

  // Auto-select first signed report when switching to the Signed tab
  useEffect(() => {
    if (activeTab === 'final' && signed.length > 0 && !selected) {
      openReport(signed[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, signed.length]);

  // ── Detail panel ──────────────────────────────────────────────────────────

  const content  = selected?.report.content as Record<string, unknown> | undefined;
  const results  = (content?.results as Record<string, string>) ?? {};
  const template = selected?.order
    ? findTemplate((selected.order.items ?? [])[0]?.test_name ?? '', (selected.order.items ?? [])[0]?.department ?? '')
    : null;

  return (
    <div className="min-h-screen" style={{ background: '#EEF3F7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Sidebar />
      <div className="ml-64">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="text-xl font-black text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">Lab results · report dispatch</p>
          </div>
          <div className="flex items-center gap-3">
            {pendingReview.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full">
                {pendingReview.length} with pathologist
              </span>
            )}
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Needs Results',  value: pending.length + ordersNeedingReport.length, color: '#F59E0B' },
              { label: 'Pending Review', value: pendingReview.length,                         color: PURPLE },
              { label: 'Signed',         value: signed.length,                                color: TEAL },
              { label: 'Total Reports',  value: reports.length,                               color: '#374151' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{k.label}</div>
                <div className="text-2xl font-black" style={{ color: k.color }}>{loading ? '…' : k.value}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-6">

            {/* ── LEFT: list ── */}
            <div className="w-80 flex-shrink-0 space-y-3">
              {/* Tabs */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {([
                  ['pending_results', 'Edit Results', pending.length + ordersNeedingReport.length, '#F59E0B'],
                  ['final',          'Signed',        signed.length,                               TEAL],
                ] as const).map(([k, label, count, color]) => (
                  <button key={k} onClick={() => setActiveTab(k)}
                    className="w-full flex items-center justify-between px-4 py-3 border-b last:border-0 text-sm font-bold transition-colors"
                    style={{ background: activeTab === k ? `${color}10` : 'transparent', color: activeTab === k ? color : '#9CA3AF' }}>
                    <span>{label}</span>
                    {count > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full text-white" style={{ background: color }}>{count}</span>}
                  </button>
                ))}
              </div>

              {/* Error banner */}
              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-red-700 flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-400 text-base flex-shrink-0 mt-0.5">error</span>
                  <div>
                    <div className="font-bold mb-0.5">Could not create report</div>
                    <div className="leading-relaxed">{createError}</div>
                  </div>
                  <button onClick={() => setCreateError(null)} className="ml-auto text-red-300 hover:text-red-500 flex-shrink-0">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              )}

              {/* Orders needing reports (pending_results tab) */}
              {activeTab === 'pending_results' && (
                <>
                  {ordersNeedingReport.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">Start New Report</div>
                      {ordersNeedingReport.map(o => (
                        <div key={o.id}
                          className="bg-white rounded-2xl p-4 shadow-sm border border-dashed border-amber-300 mb-2 cursor-pointer hover:border-amber-400 transition-colors"
                          onClick={() => !creating && handleCreateDraft(o)}>
                          <div className="flex items-start justify-between mb-1">
                            <div className="font-bold text-sm text-gray-900">{o.patient_name ?? '—'}</div>
                            <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Awaiting results</span>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">{(o.items ?? []).map(i => i.test_name).join(' · ')}</div>
                          <button onClick={e => { e.stopPropagation(); handleCreateDraft(o); }}
                            disabled={creating === o.id}
                            className="w-full py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-98"
                            style={{ background: '#F59E0B' }}>
                            <span className="material-symbols-outlined text-sm" style={{ animation: creating === o.id ? 'spin 1s linear infinite' : 'none' }}>
                              {creating === o.id ? 'sync' : 'edit_note'}
                            </span>
                            {creating === o.id ? 'Creating report…' : 'Start Results Entry'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    {pending.length > 0 && <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-2 mt-1">In Progress</div>}
                    {pending.map(r => <ReportCard key={r.id} report={r} orderMap={orderMap} patientMap={patientMap} selectedId={selected?.report.id ?? null} onOpen={openReport} />)}
                  </div>
                  {ordersNeedingReport.length === 0 && pending.length === 0 && (
                    <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm border border-gray-200">
                      <span className="material-symbols-outlined text-3xl opacity-30 block mb-2">check_circle</span>
                      All caught up — no pending results
                    </div>
                  )}
                </>
              )}

              {activeTab === 'final' && (
                <div className="space-y-2">
                  {signed.length === 0
                    ? <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-sm">No signed reports yet</div>
                    : signed.map(r => <ReportCard key={r.id} report={r} orderMap={orderMap} patientMap={patientMap} selectedId={selected?.report.id ?? null} onOpen={openReport} />)
                  }
                </div>
              )}
            </div>

            {/* ── RIGHT: detail panel ── */}
            <div className="flex-1 min-w-0">
              {!selected ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-10 min-h-[400px]">
                  <span className="material-symbols-outlined text-6xl mb-4" style={{ color: '#D1D5DB' }}>lab_profile</span>
                  <h3 className="text-base font-black text-gray-400 mb-2">No report selected</h3>
                  {activeTab === 'pending_results' && ordersNeedingReport.length > 0 && (
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                      Click <span className="font-bold text-amber-500">Start Results Entry</span> on any order in the left panel to begin entering test results.
                    </p>
                  )}
                  {activeTab === 'pending_results' && pending.length > 0 && ordersNeedingReport.length === 0 && (
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                      Click a report card on the left to continue entering results.
                    </p>
                  )}
                  {activeTab === 'final' && signed.length > 0 && (
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                      Select a signed report to download, print, or send to the patient.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  {/* Panel header */}
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-gray-900">{selected.patient?.name ?? '—'}</span>
                        {statusChip(
                          selected.report.status === 'draft' && (selected.report.content as any)?.rejectionReason
                            ? 'rejected' : selected.report.status
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {reportNo(selected.report.id)} &nbsp;·&nbsp;
                        {(selected.order?.items ?? []).map(i => i.test_name).join(', ')}
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <div className="p-6">
                    {/* Template info */}
                    {template && (
                      <div className="mb-4 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500 text-base">description</span>
                        <span className="text-xs font-bold text-indigo-700">{template.title}</span>
                        <span className="text-xs text-indigo-500 ml-auto">{template.department}</span>
                      </div>
                    )}

                    {/* Rejection notice */}
                    {selected.report.status === 'draft' && (selected.report.content as any)?.rejectionReason && (
                      <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                        <span className="material-symbols-outlined text-red-400 text-base flex-shrink-0 mt-0.5">cancel</span>
                        <div><span className="font-bold">Rejected by pathologist: </span>{(selected.report.content as any).rejectionReason}</div>
                      </div>
                    )}

                    {/* Results entry */}
                    {selected.report.status === 'draft' && isLabTech && template && (
                      <ResultEntryForm
                        order={selected.order!}
                        patient={selected.patient}
                        template={template}
                        existingResults={results}
                        onSave={(res, submit) => handleSaveResults(selected.report.id, res, submit)}
                      />
                    )}

                    {/* Submitted — awaiting pathologist */}
                    {selected.report.status === 'in_review' && (
                      <div className="text-center py-10 text-gray-500">
                        <span className="material-symbols-outlined text-5xl opacity-30 block mb-3">hourglass_top</span>
                        <div className="font-bold text-gray-600 mb-1">Submitted for pathologist review</div>
                        <p className="text-sm text-gray-400">The pathologist will sign this report from the Review Queue.</p>
                      </div>
                    )}

                    {/* Signed report */}
                    {selected.report.status === 'final' && (
                      <SignedReportActions
                        report={selected.report}
                        order={selected.order}
                        patient={selected.patient}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
