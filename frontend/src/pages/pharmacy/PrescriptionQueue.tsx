import { useState } from 'react';

type PharmacyType = 'affiliated' | 'non_affiliated';
type RxStatus = 'incoming' | 'preparing' | 'ready' | 'dispensed';

interface RxItem { name: string; dosage: string; qty: number; frequency: string }
interface Prescription {
  id: string; patientName: string; patientId: string; doctorName: string;
  department: string; date: string; items: RxItem[];
  status: RxStatus; type: PharmacyType; notes: string;
}

const MOCK_RX: Prescription[] = [
  { id: 'RX-001', patientName: 'Meera Iyer', patientId: 'PAT-001', doctorName: 'Dr. Anita Sharma', department: 'Endocrinology', date: '2026-11-01T09:30:00', type: 'affiliated',
    items: [{ name: 'Metformin 500mg', dosage: '500mg', qty: 60, frequency: 'Twice daily after meals' }, { name: 'Atorvastatin 10mg', dosage: '10mg', qty: 30, frequency: 'Once daily at night' }],
    status: 'incoming', notes: 'Patient is diabetic. Check BP before dispensing.' },
  { id: 'RX-002', patientName: 'Rajesh Kumar', patientId: 'PAT-002', doctorName: 'Dr. Sanjay Rao', department: 'Cardiology', date: '2026-11-01T10:15:00', type: 'affiliated',
    items: [{ name: 'Amlodipine 5mg', dosage: '5mg', qty: 30, frequency: 'Once daily morning' }, { name: 'Aspirin 75mg', dosage: '75mg', qty: 30, frequency: 'Once daily after food' }],
    status: 'preparing', notes: '' },
  { id: 'RX-003', patientName: 'Priya Nair', patientId: 'PAT-003', doctorName: 'Dr. Rekha Menon', department: 'Pulmonology', date: '2026-11-01T11:00:00', type: 'non_affiliated',
    items: [{ name: 'Montelukast 10mg', dosage: '10mg', qty: 30, frequency: 'Once daily at night' }, { name: 'Salbutamol Inhaler', dosage: '100mcg', qty: 1, frequency: 'As needed' }],
    status: 'incoming', notes: 'Brought physical prescription.' },
  { id: 'RX-004', patientName: 'Arjun Reddy', patientId: 'PAT-004', doctorName: 'Dr. Vikram Das', department: 'Orthopedics', date: '2026-11-01T08:45:00', type: 'non_affiliated',
    items: [{ name: 'Diclofenac 50mg', dosage: '50mg', qty: 10, frequency: 'Twice daily after food' }, { name: 'Pantoprazole 40mg', dosage: '40mg', qty: 10, frequency: 'Once daily before breakfast' }],
    status: 'ready', notes: '' },
  { id: 'RX-005', patientName: 'Sunita Verma', patientId: 'PAT-005', doctorName: 'Dr. Anita Sharma', department: 'Endocrinology', date: '2026-10-31T16:30:00', type: 'affiliated',
    items: [{ name: 'Levothyroxine 50mcg', dosage: '50mcg', qty: 30, frequency: 'Once daily empty stomach' }],
    status: 'dispensed', notes: '' },
];

const STATUS_META: Record<RxStatus, { label: string; color: string; bg: string; icon: string; next?: RxStatus; nextLabel?: string }> = {
  incoming:  { label: 'Incoming',  color: '#0891B2', bg: '#E0F4F9', icon: 'inbox',         next: 'preparing', nextLabel: 'Start Preparing' },
  preparing: { label: 'Preparing', color: '#D97706', bg: '#FEF3C7', icon: 'science',        next: 'ready',     nextLabel: 'Mark Ready' },
  ready:     { label: 'Ready',     color: '#17A077', bg: '#D1FAE5', icon: 'check_circle',   next: 'dispensed', nextLabel: 'Dispense' },
  dispensed: { label: 'Dispensed', color: '#6B7280', bg: '#F3F4F6', icon: 'task_alt' },
};

export default function PrescriptionQueue() {
  const [tab, setTab] = useState<PharmacyType>('affiliated');
  const [rxList, setRxList] = useState(MOCK_RX);
  const [selected, setSelected] = useState<Prescription | null>(null);

  const filtered = rxList.filter(r => r.type === tab);

  function advance(id: string) {
    setRxList(prev => prev.map(r => {
      if (r.id !== id) return r;
      const meta = STATUS_META[r.status];
      return meta.next ? { ...r, status: meta.next } : r;
    }));
    if (selected?.id === id) {
      const updated = rxList.find(r => r.id === id);
      if (updated) {
        const meta = STATUS_META[updated.status];
        if (meta.next) setSelected({ ...updated, status: meta.next });
      }
    }
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return (
    <div className="flex gap-5 h-full">
      {/* List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100 mb-4 w-fit">
          {(['affiliated', 'non_affiliated'] as PharmacyType[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
              {t === 'affiliated' ? '🏥 Affiliated (Hospital)' : '🏪 Non-Affiliated (External)'}
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                style={{ background: tab === t ? '#F1F5F9' : 'transparent', color: tab === t ? '#64748B' : '#9CA3AF' }}>
                {rxList.filter(r => r.type === t).length}
              </span>
            </button>
          ))}
        </div>

        {/* Info banner */}
        <div className="mb-4 p-3 rounded-xl text-[11px] font-medium flex items-start gap-2"
          style={{ background: tab === 'affiliated' ? '#F0FDF4' : '#FFF7ED', border: `1px solid ${tab === 'affiliated' ? '#BBF7D0' : '#FED7AA'}`, color: tab === 'affiliated' ? '#166534' : '#9A3412' }}>
          <span className="material-symbols-outlined text-[14px]">{tab === 'affiliated' ? 'local_hospital' : 'storefront'}</span>
          {tab === 'affiliated'
            ? 'Prescriptions auto-received from hospital doctors. Medicines go directly to dispensing queue.'
            : 'External prescriptions brought in by patients or uploaded via app. Verify doctor credentials before dispensing.'}
        </div>

        {/* Prescription cards */}
        <div className="space-y-3 overflow-auto flex-1">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <span className="material-symbols-outlined text-[40px] block mb-2">inbox</span>
              <p className="text-[13px]">No prescriptions in this queue</p>
            </div>
          )}
          {filtered.map(rx => {
            const meta = STATUS_META[rx.status];
            return (
              <div key={rx.id} onClick={() => setSelected(rx)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md ${selected?.id === rx.id ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-black text-gray-900">{rx.patientName}</p>
                      <span className="text-[9px] font-bold text-gray-400">{rx.id}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{rx.doctorName} · {rx.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-gray-400">{fmt(rx.date)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {rx.items.map(i => (
                    <span key={i.name} className="px-2 py-0.5 rounded-full text-[10px] bg-gray-50 text-gray-600 border border-gray-100">
                      {i.name} × {i.qty}
                    </span>
                  ))}
                </div>
                {meta.next && (
                  <button onClick={e => { e.stopPropagation(); advance(rx.id); }}
                    className="mt-3 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-all"
                    style={{ background: '#17A077' }}>
                    {meta.nextLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-100 p-5 overflow-auto shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-black text-gray-900">Prescription Detail</p>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Patient</p>
              <p className="text-[13px] font-bold text-gray-900">{selected.patientName}</p>
              <p className="text-[10px] text-gray-400">{selected.patientId}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Prescribed by</p>
              <p className="text-[12px] font-bold text-gray-900">{selected.doctorName}</p>
              <p className="text-[10px] text-gray-400">{selected.department}</p>
            </div>
            <div>
              <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-2">Medicines</p>
              <div className="space-y-2">
                {selected.items.map(i => (
                  <div key={i.name} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <p className="text-[11px] font-bold text-gray-900">{i.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{i.frequency} · Qty: {i.qty}</p>
                  </div>
                ))}
              </div>
            </div>
            {selected.notes && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mb-1">Notes</p>
                <p className="text-[11px] text-amber-800">{selected.notes}</p>
              </div>
            )}
            {STATUS_META[selected.status].next && (
              <button onClick={() => advance(selected.id)}
                className="w-full py-2.5 rounded-xl text-white font-bold text-[12px] flex items-center justify-center gap-2"
                style={{ background: '#17A077' }}>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                {STATUS_META[selected.status].nextLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
