import { useState } from 'react';
import Sidebar from '../../components/Sidebar';

type HistoryType = 'allergy' | 'chronic' | 'surgery' | 'vaccination' | 'family';

interface HistoryEntry {
  id: string; patientName: string; patientId: string; type: HistoryType;
  title: string; detail: string; severity?: 'mild' | 'moderate' | 'severe';
  date?: string; recordedBy: string; recordedAt: string; notes: string;
}

const TYPE_CONFIG: Record<HistoryType, { label: string; icon: string; color: string }> = {
  allergy:     { label: 'Allergy',       icon: 'warning',          color: 'bg-red-100 text-red-700'     },
  chronic:     { label: 'Chronic Condition', icon: 'monitor_heart', color: 'bg-amber-100 text-amber-700' },
  surgery:     { label: 'Surgery / Op',  icon: 'surgical',         color: 'bg-purple-100 text-purple-700'},
  vaccination: { label: 'Vaccination',   icon: 'vaccines',         color: 'bg-green-100 text-green-700' },
  family:      { label: 'Family History',icon: 'family_history',   color: 'bg-blue-100 text-blue-700'   },
};

const SEVERITY_COLOR = { mild: 'bg-yellow-100 text-yellow-700', moderate: 'bg-orange-100 text-orange-700', severe: 'bg-red-100 text-red-700' };

const MOCK: HistoryEntry[] = [
  { id: 'h1', patientName: 'Meera Iyer', patientId: 'DD-00123', type: 'allergy', title: 'Penicillin', detail: 'Anaphylaxis on exposure', severity: 'severe', recordedBy: 'Dr. Anita Sharma', recordedAt: new Date(Date.now() - 30 * 86400000).toISOString(), notes: 'Patient carries epi-pen. Avoid all beta-lactam antibiotics.' },
  { id: 'h2', patientName: 'Meera Iyer', patientId: 'DD-00123', type: 'chronic', title: 'Type 2 Diabetes Mellitus', detail: 'Diagnosed 2019, on Metformin 500mg BD', recordedBy: 'Dr. Anita Sharma', recordedAt: new Date(Date.now() - 60 * 86400000).toISOString(), notes: 'HbA1c 7.2% (last checked 3 months ago)' },
  { id: 'h3', patientName: 'Rajesh Kumar', patientId: 'DD-00456', type: 'surgery', title: 'Appendectomy', detail: 'Emergency appendectomy 2018', date: '2018-06-15', recordedBy: 'Dr. Ravi Prasad', recordedAt: new Date(Date.now() - 10 * 86400000).toISOString(), notes: 'Uneventful recovery, no complications' },
  { id: 'h4', patientName: 'Rajesh Kumar', patientId: 'DD-00456', type: 'allergy', title: 'Aspirin (NSAIDs)', detail: 'Gastric bleeding episode', severity: 'moderate', recordedBy: 'Dr. Ravi Prasad', recordedAt: new Date(Date.now() - 10 * 86400000).toISOString(), notes: 'Use paracetamol for pain relief instead' },
  { id: 'h5', patientName: 'Priya Nair', patientId: 'DD-00789', type: 'vaccination', title: 'Hepatitis B', detail: 'Full 3-dose series completed', date: '2022-01-10', recordedBy: 'Dr. Meena Joshi', recordedAt: new Date(Date.now() - 5 * 86400000).toISOString(), notes: '' },
  { id: 'h6', patientName: 'Priya Nair', patientId: 'DD-00789', type: 'family', title: 'Hypertension (Father)', detail: 'Father diagnosed with HTN at 45, on medication', recordedBy: 'Dr. Meena Joshi', recordedAt: new Date(Date.now() - 5 * 86400000).toISOString(), notes: 'Monitor BP regularly' },
  { id: 'h7', patientName: 'Suresh Babu', patientId: 'DD-00321', type: 'chronic', title: 'Hypertension', detail: 'Controlled on Amlodipine 5mg + Telmisartan 40mg', recordedBy: 'Dr. Ravi Prasad', recordedAt: new Date(Date.now() - 90 * 86400000).toISOString(), notes: 'BP target <130/80' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── New Entry Modal ───────────────────────────────────────────────────────────

function NewEntryModal({ onAdd, onClose }: { onAdd: (e: Omit<HistoryEntry, 'id'>) => void; onClose: () => void }) {
  const [form, setForm] = useState({ patientName: '', patientId: '', type: 'allergy' as HistoryType, title: '', detail: '', severity: '' as '' | 'mild' | 'moderate' | 'severe', date: '', notes: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function submit() {
    if (!form.patientName || !form.title) return;
    onAdd({ patientName: form.patientName, patientId: form.patientId, type: form.type, title: form.title, detail: form.detail, severity: form.severity || undefined, date: form.date || undefined, recordedBy: 'Admin User', recordedAt: new Date().toISOString(), notes: form.notes });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">Add Medical History Entry</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
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
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30">
              {(Object.keys(TYPE_CONFIG) as HistoryType[]).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
            </select>
          </div>
          {form.type === 'allergy' && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Severity</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30">
                <option value="">Select…</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>
          )}
          <div className={form.type === 'allergy' ? '' : 'col-span-2'}>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Title / Name *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder={form.type === 'allergy' ? 'e.g. Penicillin' : form.type === 'chronic' ? 'e.g. Type 2 Diabetes' : 'e.g. Appendectomy 2018'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Details</label>
            <input value={form.detail} onChange={e => set('detail', e.target.value)} placeholder="Description, medication, dose…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          {(form.type === 'surgery' || form.type === 'vaccination') && (
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
            </div>
          )}
          <div className={(form.type === 'surgery' || form.type === 'vaccination') ? '' : 'col-span-2'}>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Notes</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Clinical notes…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} className="flex-1 py-2 bg-[#17A077] text-white rounded-lg text-[13px] font-semibold hover:bg-[#0D9460]">Save Entry</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MedicalHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(MOCK);
  const [showNew, setShowNew] = useState(false);
  const [filterType, setFilterType] = useState<HistoryType | 'all'>('all');
  const [search, setSearch] = useState('');

  function addEntry(e: Omit<HistoryEntry, 'id'>) {
    setEntries(prev => [{ ...e, id: `h${Date.now()}` }, ...prev]);
  }

  function deleteEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  const filtered = entries.filter(e =>
    (filterType === 'all' || e.type === filterType) &&
    (search === '' || e.patientName.toLowerCase().includes(search.toLowerCase()) || e.title.toLowerCase().includes(search.toLowerCase()))
  );

  // Group by patient
  const byPatient = filtered.reduce<Record<string, HistoryEntry[]>>((acc, e) => {
    const key = e.patientId || e.patientName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#17A077]">history_edu</span>
              Medical History
            </h1>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#17A077] text-white rounded-xl font-semibold text-[13px] hover:bg-[#0D9460]">
              <span className="material-symbols-outlined text-[16px]">add</span>
              Add Entry
            </button>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or condition…"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold ${filterType === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                All
              </button>
              {(Object.keys(TYPE_CONFIG) as HistoryType[]).map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-semibold ${filterType === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                  {TYPE_CONFIG[t].label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {Object.entries(byPatient).map(([patientKey, patientEntries]) => {
            const first = patientEntries[0];
            return (
              <div key={patientKey} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#17A077] flex items-center justify-center text-white text-sm font-bold">
                    {first.patientName.charAt(0)}
                  </div>
                  <div>
                    <span className="font-bold text-gray-900 text-[14px]">{first.patientName}</span>
                    <span className="text-[12px] text-gray-400 ml-2">{first.patientId}</span>
                  </div>
                  <span className="ml-auto text-[12px] text-gray-400">{patientEntries.length} record{patientEntries.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {patientEntries.map(entry => {
                    const tc = TYPE_CONFIG[entry.type];
                    return (
                      <div key={entry.id} className="px-5 py-4 flex items-start gap-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold flex-shrink-0 ${tc.color}`}>
                          <span className="material-symbols-outlined text-[13px]">{tc.icon}</span>
                          {tc.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-gray-900 text-[13px]">{entry.title}</span>
                            {entry.severity && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${SEVERITY_COLOR[entry.severity]}`}>
                                {entry.severity}
                              </span>
                            )}
                            {entry.date && <span className="text-[11px] text-gray-400">{entry.date}</span>}
                          </div>
                          {entry.detail && <div className="text-[12px] text-gray-600">{entry.detail}</div>}
                          {entry.notes && <div className="text-[12px] text-gray-400 italic mt-0.5">{entry.notes}</div>}
                          <div className="text-[11px] text-gray-400 mt-1">Recorded by {entry.recordedBy} · {formatDate(entry.recordedAt)}</div>
                        </div>
                        <button onClick={() => deleteEntry(entry.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {Object.keys(byPatient).length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <span className="material-symbols-outlined text-5xl mb-3 block">history_edu</span>
              <p className="text-[14px]">No medical history records found</p>
            </div>
          )}
        </div>
      </main>
      {showNew && <NewEntryModal onAdd={addEntry} onClose={() => setShowNew(false)} />}
    </div>
  );
}
