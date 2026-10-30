import { useState } from 'react';
import Sidebar from '../../components/Sidebar';

interface SOAPNote {
  id: string; patientName: string; patientId: string;
  doctorName: string; visitDate: string; visitType: 'first' | 'follow_up' | 'emergency';
  subjective: string; objective: string; assessment: string; plan: string;
  followUpDays?: number; status: 'draft' | 'final';
  createdAt: string;
}

const MOCK_NOTES: SOAPNote[] = [
  {
    id: 'n1', patientName: 'Meera Iyer', patientId: 'DD-00123',
    doctorName: 'Dr. Anita Sharma', visitDate: '2026-10-25', visitType: 'follow_up',
    subjective: 'Patient complains of persistent fatigue for 2 weeks. Slightly increased thirst. No fever or pain.',
    objective: 'BP: 128/82 mmHg, Pulse: 78 bpm, Wt: 68 kg. FBS today: 168 mg/dL. Mild bilateral pitting pedal edema.',
    assessment: 'Type 2 DM — suboptimal glycaemic control. Rule out early nephropathy.',
    plan: 'Increase Metformin to 1000mg BD. Add Empagliflozin 10mg OD. Order HbA1c, Urine ACR, RFT. Review in 6 weeks.',
    followUpDays: 42, status: 'final', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'n2', patientName: 'Rajesh Kumar', patientId: 'DD-00456',
    doctorName: 'Dr. Ravi Prasad', visitDate: '2026-10-26', visitType: 'first',
    subjective: 'Central chest discomfort on exertion for 3 days. Radiates to left arm. Relieved at rest. Mild dyspnea.',
    objective: 'BP 142/90, HR 88, SpO2 97%. ECG: ST depression V4-V6. Troponin-I: 0.04 ng/mL (borderline).',
    assessment: 'Unstable angina, NSTEMI cannot be excluded. High-risk features present.',
    plan: 'Admit for monitoring. Dual antiplatelet (Aspirin + Clopidogrel), Atorvastatin 80mg, LMWH. Cardiology consult. Serial troponin, Echo.',
    status: 'final', createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'n3', patientName: 'Priya Nair', patientId: 'DD-00789',
    doctorName: 'Dr. Meena Joshi', visitDate: '2026-10-27', visitType: 'first',
    subjective: 'Cough with yellow sputum for 5 days. Low-grade fever 99.2°F. Mild sore throat. No shortness of breath.',
    objective: 'Temp 37.8°C, HR 82, RR 16, SpO2 99%. Mild pharyngeal congestion. Chest clear on auscultation.',
    assessment: 'Acute bacterial tonsillitis / upper respiratory tract infection.',
    plan: 'Amoxicillin 500mg TDS for 5 days. Tab. Paracetamol 500mg SOS. Throat lozenges. Warm saline gargles. Return if worsens.',
    followUpDays: 5, status: 'draft', createdAt: new Date().toISOString(),
  },
];

const VISIT_LABEL = { first: 'First Visit', follow_up: 'Follow-up', emergency: 'Emergency' };
const VISIT_COLOR = { first: 'bg-blue-100 text-blue-700', follow_up: 'bg-green-100 text-green-700', emergency: 'bg-red-100 text-red-700' };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── New Note Modal ────────────────────────────────────────────────────────────

function NewNoteModal({ onSave, onClose }: { onSave: (n: Omit<SOAPNote, 'id' | 'createdAt'>) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    patientName: '', patientId: '', doctorName: '', visitDate: new Date().toISOString().split('T')[0],
    visitType: 'first' as SOAPNote['visitType'],
    subjective: '', objective: '', assessment: '', plan: '',
    followUpDays: '', status: 'draft' as SOAPNote['status'],
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function save(status: 'draft' | 'final') {
    if (!form.patientName || !form.doctorName) return;
    onSave({ ...form, status, followUpDays: form.followUpDays ? Number(form.followUpDays) : undefined });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <h3 className="font-bold text-gray-900">New Consultation Note (SOAP)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Patient Name *</label>
            <input value={form.patientName} onChange={e => set('patientName', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Patient ID</label>
            <input value={form.patientId} onChange={e => set('patientId', e.target.value)} placeholder="DD-xxxxx"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Doctor Name *</label>
            <input value={form.doctorName} onChange={e => set('doctorName', e.target.value)} placeholder="Dr. …"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Visit Date</label>
            <input type="date" value={form.visitDate} onChange={e => set('visitDate', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Visit Type</label>
            <select value={form.visitType} onChange={e => set('visitType', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30">
              <option value="first">First Visit</option>
              <option value="follow_up">Follow-up</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Follow-up After (days)</label>
            <input type="number" value={form.followUpDays} onChange={e => set('followUpDays', e.target.value)} placeholder="e.g. 14"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          {[
            { key: 'subjective', label: 'S — Subjective', placeholder: "Patient's complaints, history, symptoms…" },
            { key: 'objective',  label: 'O — Objective',  placeholder: 'Vitals, examination findings, test results…' },
            { key: 'assessment', label: 'A — Assessment', placeholder: 'Diagnosis, differential diagnoses…' },
            { key: 'plan',       label: 'P — Plan',       placeholder: 'Treatment, medications, referrals, investigations…' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="col-span-2">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">{label}</label>
              <textarea value={(form as unknown as Record<string, string>)[key]} onChange={e => set(key, e.target.value)}
                rows={3} placeholder={placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30 resize-none" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => save('draft')} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-[13px] font-semibold hover:bg-gray-200">Save as Draft</button>
          <button onClick={() => save('final')} className="flex-1 py-2 bg-[#17A077] text-white rounded-lg text-[13px] font-semibold hover:bg-[#0D9460]">Finalise</button>
        </div>
      </div>
    </div>
  );
}

// ── SOAP Note Card ────────────────────────────────────────────────────────────

function NoteCard({ note, onFinalize, onDelete }: { note: SOAPNote; onFinalize: (id: string) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${note.status === 'draft' ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="px-5 py-4 flex items-start gap-4 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="w-10 h-10 rounded-lg bg-[#17A077]/10 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[#17A077] text-[18px]">clinical_notes</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900 text-[14px]">{note.patientName}</span>
            <span className="text-[12px] text-gray-400">{note.patientId}</span>
            <span className={`ml-auto px-2 py-0.5 rounded-lg text-[10px] font-bold ${VISIT_COLOR[note.visitType]}`}>{VISIT_LABEL[note.visitType]}</span>
            {note.status === 'draft' && <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-700">Draft</span>}
          </div>
          <div className="text-[12px] text-gray-500">
            {note.doctorName} · {formatDate(note.visitDate)}
            {note.followUpDays && <span className="ml-3 text-[#17A077] font-semibold">Follow-up in {note.followUpDays}d</span>}
          </div>
          <div className="text-[12px] text-gray-600 mt-1 line-clamp-1">{note.assessment}</div>
        </div>
        <span className="material-symbols-outlined text-gray-400 text-[18px] flex-shrink-0">{expanded ? 'expand_less' : 'expand_more'}</span>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100">
          <div className="grid grid-cols-1 gap-4">
            {[
              { key: 'subjective', letter: 'S', label: 'Subjective', color: 'bg-blue-50 border-blue-200' },
              { key: 'objective',  letter: 'O', label: 'Objective',  color: 'bg-green-50 border-green-200' },
              { key: 'assessment', letter: 'A', label: 'Assessment', color: 'bg-purple-50 border-purple-200' },
              { key: 'plan',       letter: 'P', label: 'Plan',       color: 'bg-amber-50 border-amber-200' },
            ].map(({ key, letter, label, color }) => (
              <div key={key} className={`rounded-lg border p-4 ${color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-white border border-current flex items-center justify-center text-[11px] font-black">{letter}</span>
                  <span className="text-[12px] font-semibold text-gray-700">{label}</span>
                </div>
                <p className="text-[13px] text-gray-800 whitespace-pre-wrap">{(note as unknown as Record<string, string>)[key] || '—'}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            {note.status === 'draft' && (
              <button onClick={() => onFinalize(note.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#17A077] text-white rounded-lg text-[12px] font-semibold hover:bg-[#0D9460]">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                Finalise Note
              </button>
            )}
            <button onClick={() => onDelete(note.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-[12px] hover:bg-red-50 ml-auto">
              <span className="material-symbols-outlined text-[14px]">delete</span>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ConsultationNotes() {
  const [notes, setNotes] = useState<SOAPNote[]>(MOCK_NOTES);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'final'>('all');
  const [search, setSearch] = useState('');

  function addNote(n: Omit<SOAPNote, 'id' | 'createdAt'>) {
    setNotes(prev => [{ ...n, id: `n${Date.now()}`, createdAt: new Date().toISOString() }, ...prev]);
  }
  function finalizeNote(id: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, status: 'final' } : n));
  }
  function deleteNote(id: string) {
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  const filtered = notes.filter(n =>
    (filter === 'all' || n.status === filter) &&
    (search === '' || n.patientName.toLowerCase().includes(search.toLowerCase()) ||
      n.doctorName.toLowerCase().includes(search.toLowerCase()) ||
      n.assessment.toLowerCase().includes(search.toLowerCase()))
  );

  const draftCount = notes.filter(n => n.status === 'draft').length;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#17A077]">clinical_notes</span>
                Consultation Notes
              </h1>
              {draftCount > 0 && (
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[11px] font-bold">
                  {draftCount} draft{draftCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#17A077] text-white rounded-xl font-semibold text-[13px] hover:bg-[#0D9460]">
              <span className="material-symbols-outlined text-[16px]">add</span>
              New SOAP Note
            </button>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, doctor, diagnosis…"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(['all', 'draft', 'final'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-semibold capitalize ${filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-4">
          {filtered.map(note => (
            <NoteCard key={note.id} note={note} onFinalize={finalizeNote} onDelete={deleteNote} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <span className="material-symbols-outlined text-5xl mb-3 block">clinical_notes</span>
              <p className="text-[14px]">No consultation notes found</p>
            </div>
          )}
        </div>
      </main>
      {showNew && <NewNoteModal onSave={addNote} onClose={() => setShowNew(false)} />}
    </div>
  );
}
