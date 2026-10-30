import { useState } from 'react';
import Sidebar from '../../components/Sidebar';

// ── Types ────────────────────────────────────────────────────────────────────

type VisitType = 'first' | 'follow_up' | 'emergency';
type QueueStatus = 'waiting' | 'in_consultation' | 'done' | 'no_show';

interface VitalSigns {
  bp: string;
  pulse: string;
  temp: string;
  weight: string;
  spo2: string;
}

interface QueueEntry {
  id: string;
  token: number;
  patientName: string;
  patientId: string;
  phone: string;
  age: number;
  sex: 'M' | 'F';
  doctor: string;
  visitType: VisitType;
  status: QueueStatus;
  arrivedAt: string;
  calledAt?: string;
  doneAt?: string;
  vitals?: VitalSigns;
  chiefComplaint: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────

const DOCTORS = ['Dr. Anita Sharma', 'Dr. Ravi Prasad', 'Dr. Meena Joshi', 'Dr. Suresh Mehta'];

const MOCK_QUEUE: QueueEntry[] = [
  {
    id: 'q1', token: 1, patientName: 'Meera Iyer', patientId: 'DD-00123', phone: '+91 98765 43210',
    age: 34, sex: 'F', doctor: 'Dr. Anita Sharma', visitType: 'first', status: 'in_consultation',
    arrivedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    calledAt: new Date(Date.now() - 10 * 60000).toISOString(),
    chiefComplaint: 'Fever and headache for 3 days',
    vitals: { bp: '120/80', pulse: '88', temp: '38.2', weight: '58', spo2: '98' },
  },
  {
    id: 'q2', token: 2, patientName: 'Rajesh Kumar', patientId: 'DD-00456', phone: '+91 91234 56789',
    age: 52, sex: 'M', doctor: 'Dr. Anita Sharma', visitType: 'follow_up', status: 'waiting',
    arrivedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    chiefComplaint: 'Diabetes follow-up',
    vitals: { bp: '140/90', pulse: '76', temp: '36.8', weight: '78', spo2: '97' },
  },
  {
    id: 'q3', token: 3, patientName: 'Priya Nair', patientId: 'DD-00789', phone: '+91 88776 65544',
    age: 28, sex: 'F', doctor: 'Dr. Ravi Prasad', visitType: 'first', status: 'waiting',
    arrivedAt: new Date(Date.now() - 10 * 60000).toISOString(),
    chiefComplaint: 'Back pain for 1 week',
  },
  {
    id: 'q4', token: 4, patientName: 'Suresh Babu', patientId: 'DD-00321', phone: '+91 77665 54433',
    age: 65, sex: 'M', doctor: 'Dr. Ravi Prasad', visitType: 'emergency', status: 'waiting',
    arrivedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    chiefComplaint: 'Chest pain - acute onset',
  },
  {
    id: 'q5', token: 0, patientName: 'Kavya Reddy', patientId: 'DD-00654', phone: '+91 99887 76655',
    age: 41, sex: 'F', doctor: 'Dr. Meena Joshi', visitType: 'follow_up', status: 'done',
    arrivedAt: new Date(Date.now() - 90 * 60000).toISOString(),
    calledAt: new Date(Date.now() - 75 * 60000).toISOString(),
    doneAt: new Date(Date.now() - 50 * 60000).toISOString(),
    chiefComplaint: 'Thyroid follow-up',
    vitals: { bp: '110/70', pulse: '68', temp: '36.6', weight: '62', spo2: '99' },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const VISIT_CHIP: Record<VisitType, string> = {
  first:     'bg-blue-100 text-blue-700',
  follow_up: 'bg-teal-100 text-teal-700',
  emergency: 'bg-red-100 text-red-700',
};
const VISIT_LABEL: Record<VisitType, string> = {
  first: 'First Visit', follow_up: 'Follow-up', emergency: 'Emergency',
};

// ── Vitals Modal ─────────────────────────────────────────────────────────────

function VitalsModal({ entry, onSave, onClose }: {
  entry: QueueEntry;
  onSave: (id: string, vitals: VitalSigns) => void;
  onClose: () => void;
}) {
  const [vitals, setVitals] = useState<VitalSigns>(
    entry.vitals ?? { bp: '', pulse: '', temp: '', weight: '', spo2: '' }
  );
  const set = (k: keyof VitalSigns, v: string) => setVitals(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">Vital Signs — {entry.patientName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {[
            { key: 'bp',     label: 'Blood Pressure', unit: 'mmHg', placeholder: '120/80' },
            { key: 'pulse',  label: 'Pulse',          unit: 'bpm',  placeholder: '72' },
            { key: 'temp',   label: 'Temperature',    unit: '°C',   placeholder: '37.0' },
            { key: 'weight', label: 'Weight',         unit: 'kg',   placeholder: '65' },
            { key: 'spo2',   label: 'SpO2',           unit: '%',    placeholder: '98' },
          ].map(f => (
            <div key={f.key} className={f.key === 'bp' ? 'col-span-2' : ''}>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                {f.label} <span className="text-gray-400 font-normal">({f.unit})</span>
              </label>
              <input
                type="text"
                value={vitals[f.key as keyof VitalSigns]}
                onChange={e => set(f.key as keyof VitalSigns, e.target.value)}
                placeholder={f.placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => { onSave(entry.id, vitals); onClose(); }}
            className="flex-1 py-2 bg-[#17A077] text-white rounded-lg text-[13px] font-semibold hover:bg-[#0D9460]"
          >
            Save Vitals
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Walk-in Modal ─────────────────────────────────────────────────────────────

function WalkInModal({ nextToken, onAdd, onClose }: {
  nextToken: number;
  onAdd: (entry: Omit<QueueEntry, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    patientName: '', patientId: '', phone: '', age: '', sex: 'M' as 'M' | 'F',
    doctor: DOCTORS[0], visitType: 'first' as VisitType, chiefComplaint: '',
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function submit() {
    if (!form.patientName || !form.chiefComplaint) return;
    onAdd({
      token: nextToken,
      patientName: form.patientName,
      patientId: form.patientId || `WALK-${nextToken}`,
      phone: form.phone,
      age: parseInt(form.age) || 0,
      sex: form.sex,
      doctor: form.doctor,
      visitType: form.visitType,
      status: 'waiting',
      arrivedAt: new Date().toISOString(),
      chiefComplaint: form.chiefComplaint,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-bold text-gray-900">Walk-in Registration</h3>
            <p className="text-[12px] text-gray-500">Token #{nextToken} will be assigned</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Patient Name *</label>
            <input value={form.patientName} onChange={e => set('patientName', e.target.value)} placeholder="Full name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Patient ID / MRN</label>
            <input value={form.patientId} onChange={e => set('patientId', e.target.value)} placeholder="DD-00xxx"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 …"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Age</label>
            <input type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="Years"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Sex</label>
            <select value={form.sex} onChange={e => set('sex', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30">
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Doctor</label>
            <select value={form.doctor} onChange={e => set('doctor', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30">
              {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
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
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Chief Complaint *</label>
            <input value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)}
              placeholder="Brief reason for visit"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit}
            className="flex-1 py-2 bg-[#17A077] text-white rounded-lg text-[13px] font-semibold hover:bg-[#0D9460]">
            Issue Token #{nextToken}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Queue Card ───────────────────────────────────────────────────────────────

function QueueCard({ entry, onAction }: {
  entry: QueueEntry;
  onAction: (id: string, action: string) => void;
}) {
  const waitMins = Math.floor((Date.now() - new Date(entry.arrivedAt).getTime()) / 60000);
  const isLongWait = waitMins > 30 && entry.status === 'waiting';

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${entry.status === 'in_consultation' ? 'border-[#17A077] ring-1 ring-[#17A077]/20' : entry.visitType === 'emergency' ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3">
        {/* Token */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0 ${
          entry.status === 'in_consultation' ? 'bg-[#17A077] text-white' :
          entry.status === 'done' ? 'bg-gray-100 text-gray-400' :
          entry.visitType === 'emergency' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'
        }`}>
          {entry.status === 'done' ? <span className="material-symbols-outlined text-[20px]">done</span> : entry.token}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-bold text-gray-900 text-[14px]">{entry.patientName}</span>
            <span className="text-[11px] text-gray-400">{entry.age}y/{entry.sex}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${VISIT_CHIP[entry.visitType]}`}>
              {VISIT_LABEL[entry.visitType]}
            </span>
            {entry.visitType === 'emergency' && (
              <span className="material-symbols-outlined text-red-500 text-[16px]">warning</span>
            )}
          </div>
          <div className="text-[12px] text-gray-500 mb-1">
            {entry.patientId} · {entry.doctor}
          </div>
          <div className="text-[12px] text-gray-600 italic">"{entry.chiefComplaint}"</div>
        </div>

        {/* Wait time */}
        <div className="text-right flex-shrink-0">
          <div className={`text-[13px] font-bold ${isLongWait ? 'text-amber-600' : 'text-gray-500'}`}>
            {timeAgo(entry.arrivedAt)}
          </div>
          <div className="text-[10px] text-gray-400">waiting</div>
        </div>
      </div>

      {/* Vitals strip */}
      {entry.vitals && (
        <div className="mt-3 flex flex-wrap gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 text-[11px]">
          {[
            { label: 'BP', value: entry.vitals.bp, unit: 'mmHg' },
            { label: 'Pulse', value: entry.vitals.pulse, unit: 'bpm' },
            { label: 'Temp', value: entry.vitals.temp, unit: '°C' },
            { label: 'Wt', value: entry.vitals.weight, unit: 'kg' },
            { label: 'SpO₂', value: entry.vitals.spo2, unit: '%' },
          ].map(v => (
            <span key={v.label} className="flex items-center gap-1">
              <span className="text-gray-400 font-semibold">{v.label}:</span>
              <span className="font-bold text-gray-700">{v.value}</span>
              <span className="text-gray-400">{v.unit}</span>
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2 flex-wrap">
        {entry.status === 'waiting' && (
          <>
            {!entry.vitals && (
              <button onClick={() => onAction(entry.id, 'vitals')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-semibold hover:bg-gray-50">
                <span className="material-symbols-outlined text-[13px]">monitor_heart</span>
                Record Vitals
              </button>
            )}
            <button onClick={() => onAction(entry.id, 'call_in')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#17A077] text-white text-[11px] font-semibold hover:bg-[#0D9460] ml-auto">
              <span className="material-symbols-outlined text-[13px]">call</span>
              Call In
            </button>
            <button onClick={() => onAction(entry.id, 'no_show')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-[11px] font-semibold hover:bg-red-50">
              No Show
            </button>
          </>
        )}
        {entry.status === 'in_consultation' && (
          <>
            <span className="flex items-center gap-1 text-[11px] text-[#17A077] font-semibold">
              <span className="material-symbols-outlined text-[14px]">stethoscope</span>
              In consultation — {entry.calledAt ? timeAgo(entry.calledAt) : '—'}
            </span>
            <button onClick={() => onAction(entry.id, 'done')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-semibold hover:bg-green-700 ml-auto">
              <span className="material-symbols-outlined text-[13px]">done_all</span>
              Mark Done
            </button>
          </>
        )}
        {entry.status === 'done' && (
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">task_alt</span>
            Completed · {entry.doneAt ? timeAgo(entry.doneAt) + ' ago' : '—'}
          </span>
        )}
        {entry.status === 'no_show' && (
          <span className="text-[11px] text-red-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">person_off</span>
            No Show
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OPDQueue() {
  const [queue, setQueue] = useState<QueueEntry[]>(MOCK_QUEUE);
  const [filterDoctor, setFilterDoctor] = useState('all');
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [vitalsEntry, setVitalsEntry] = useState<QueueEntry | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'done'>('active');

  const nextToken = Math.max(0, ...queue.map(q => q.token)) + 1;

  function handleAction(id: string, action: string) {
    if (action === 'vitals') {
      setVitalsEntry(queue.find(q => q.id === id) ?? null);
      return;
    }
    setQueue(prev => prev.map(q => {
      if (q.id !== id) return q;
      if (action === 'call_in') return { ...q, status: 'in_consultation', calledAt: new Date().toISOString() };
      if (action === 'done')    return { ...q, status: 'done',            doneAt:   new Date().toISOString() };
      if (action === 'no_show') return { ...q, status: 'no_show' };
      return q;
    }));
  }

  function saveVitals(id: string, vitals: VitalSigns) {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, vitals } : q));
  }

  function addWalkIn(entry: Omit<QueueEntry, 'id'>) {
    setQueue(prev => [...prev, { ...entry, id: `q${Date.now()}` }]);
  }

  const filtered = queue.filter(q =>
    (filterDoctor === 'all' || q.doctor === filterDoctor) &&
    (activeTab === 'active' ? ['waiting', 'in_consultation'].includes(q.status) : ['done', 'no_show'].includes(q.status))
  );

  const counts = {
    waiting: queue.filter(q => q.status === 'waiting').length,
    consulting: queue.filter(q => q.status === 'in_consultation').length,
    done: queue.filter(q => q.status === 'done').length,
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#17A077]">queue</span>
                OPD Queue
              </h1>
              <p className="text-[12px] text-gray-500">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => setShowWalkIn(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#17A077] text-white rounded-xl font-semibold text-[13px] hover:bg-[#0D9460]"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Walk-in
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Waiting',        count: counts.waiting,   color: 'text-amber-600',  bg: 'bg-amber-50', icon: 'schedule' },
              { label: 'In Consultation',count: counts.consulting, color: 'text-[#17A077]', bg: 'bg-green-50', icon: 'stethoscope' },
              { label: 'Done Today',     count: counts.done,       color: 'text-gray-600',  bg: 'bg-gray-50',  icon: 'task_alt' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3 flex items-center gap-3`}>
                <span className={`material-symbols-outlined ${s.color} text-[22px]`}>{s.icon}</span>
                <div>
                  <div className={`text-2xl font-black ${s.color}`}>{s.count}</div>
                  <div className="text-[11px] text-gray-500 font-medium">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('active')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold ${activeTab === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                Active Queue ({counts.waiting + counts.consulting})
              </button>
              <button onClick={() => setActiveTab('done')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold ${activeTab === 'done' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                Completed ({counts.done})
              </button>
            </div>
            <select value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30 ml-auto">
              <option value="all">All Doctors</option>
              {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Queue list */}
        <div className="px-8 py-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <span className="material-symbols-outlined text-5xl mb-3 block">queue</span>
              <p className="text-[14px]">{activeTab === 'active' ? 'Queue is empty — no patients waiting' : 'No completed visits yet'}</p>
            </div>
          ) : (
            filtered
              .sort((a, b) => {
                if (a.status === 'in_consultation') return -1;
                if (b.status === 'in_consultation') return 1;
                if (a.visitType === 'emergency') return -1;
                if (b.visitType === 'emergency') return 1;
                return a.token - b.token;
              })
              .map(entry => (
                <QueueCard key={entry.id} entry={entry} onAction={handleAction} />
              ))
          )}
        </div>
      </main>

      {showWalkIn && <WalkInModal nextToken={nextToken} onAdd={addWalkIn} onClose={() => setShowWalkIn(false)} />}
      {vitalsEntry && <VitalsModal entry={vitalsEntry} onSave={saveVitals} onClose={() => setVitalsEntry(null)} />}
    </div>
  );
}
