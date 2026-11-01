import { useState } from 'react';

type RefillStatus =
  | 'reminder_sent'
  | 'patient_requested'
  | 'awaiting_doctor'
  | 'doctor_approved'
  | 'doctor_rejected'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'picked_up';

type DeliveryPref = 'pickup' | 'delivery' | null;

interface RefillRequest {
  id: string; patientName: string; patientPhone: string;
  medicine: string; doctorName: string; department: string;
  daysLeft: number; lastFilled: string;
  status: RefillStatus; deliveryPref: DeliveryPref;
  address?: string; paymentStatus?: 'pending' | 'paid';
  notes?: string;
}

const MOCK_REFILLS: RefillRequest[] = [
  { id: 'REF-001', patientName: 'Meera Iyer', patientPhone: '+91 98765 43210', medicine: 'Metformin 500mg (×60)', doctorName: 'Dr. Anita Sharma', department: 'Endocrinology', daysLeft: 5, lastFilled: '2026-10-02', status: 'patient_requested', deliveryPref: null },
  { id: 'REF-002', patientName: 'Sunita Verma', patientPhone: '+91 91234 56789', medicine: 'Levothyroxine 50mcg (×30)', doctorName: 'Dr. Anita Sharma', department: 'Endocrinology', daysLeft: 3, lastFilled: '2026-10-01', status: 'awaiting_doctor', deliveryPref: null },
  { id: 'REF-003', patientName: 'Rajesh Kumar', patientPhone: '+91 99876 54321', medicine: 'Amlodipine 5mg (×30) + Aspirin 75mg (×30)', doctorName: 'Dr. Sanjay Rao', department: 'Cardiology', daysLeft: 7, lastFilled: '2026-10-01', status: 'doctor_approved', deliveryPref: null },
  { id: 'REF-004', patientName: 'Arjun Reddy', patientPhone: '+91 98001 23456', medicine: 'Montelukast 10mg (×30)', doctorName: 'Dr. Rekha Menon', department: 'Pulmonology', daysLeft: 12, lastFilled: '2026-09-30', status: 'reminder_sent', deliveryPref: null },
  { id: 'REF-005', patientName: 'Kavitha Rao', patientPhone: '+91 97654 32100', medicine: 'Atorvastatin 10mg (×30)', doctorName: 'Dr. Sanjay Rao', department: 'Cardiology', daysLeft: 0, lastFilled: '2026-09-01', status: 'ready', deliveryPref: 'delivery', paymentStatus: 'pending', address: '12, MG Road, Bengaluru - 560001' },
  { id: 'REF-006', patientName: 'Priya Nair', patientPhone: '+91 90000 11111', medicine: 'Salbutamol Inhaler (×1)', doctorName: 'Dr. Rekha Menon', department: 'Pulmonology', daysLeft: 0, lastFilled: '2026-09-15', status: 'delivered', deliveryPref: 'delivery', paymentStatus: 'paid' },
];

const WORKFLOW: { status: RefillStatus; label: string; color: string; bg: string; icon: string; desc: string }[] = [
  { status: 'reminder_sent',    label: 'Reminder Sent',     color: '#0891B2', bg: '#E0F4F9', icon: 'notifications',    desc: 'Refill reminder sent to patient' },
  { status: 'patient_requested',label: 'Patient Requested', color: '#D97706', bg: '#FEF3C7', icon: 'person',           desc: 'Patient has requested a refill' },
  { status: 'awaiting_doctor',  label: 'Awaiting Doctor',   color: '#7C3AED', bg: '#EDE9FE', icon: 'stethoscope',      desc: 'Refill request sent to doctor' },
  { status: 'doctor_approved',  label: 'Doctor Approved',   color: '#059669', bg: '#D1FAE5', icon: 'thumb_up',         desc: 'Doctor has approved the refill' },
  { status: 'doctor_rejected',  label: 'Doctor Rejected',   color: '#EF4444', bg: '#FEF2F2', icon: 'thumb_down',       desc: 'Doctor rejected the refill request' },
  { status: 'preparing',        label: 'Preparing',         color: '#D97706', bg: '#FEF3C7', icon: 'science',          desc: 'Pharmacy is preparing medicines' },
  { status: 'ready',            label: 'Ready',             color: '#17A077', bg: '#D1FAE5', icon: 'check_circle',     desc: 'Medicines ready for pickup/delivery' },
  { status: 'delivered',        label: 'Delivered',         color: '#6B7280', bg: '#F3F4F6', icon: 'local_shipping',   desc: 'Medicines delivered to patient' },
  { status: 'picked_up',        label: 'Picked Up',         color: '#6B7280', bg: '#F3F4F6', icon: 'shopping_bag',     desc: 'Patient collected medicines' },
];

function getMeta(status: RefillStatus) {
  return WORKFLOW.find(w => w.status === status)!;
}

export default function RefillCenter() {
  const [refills, setRefills] = useState(MOCK_REFILLS);
  const [selected, setSelected] = useState<RefillRequest | null>(null);
  const [filter, setFilter] = useState<RefillStatus | 'all'>('all');
  const [deliveryModal, setDeliveryModal] = useState<string | null>(null);
  const [deliveryChoice, setDeliveryChoice] = useState<DeliveryPref>(null);

  const filtered = filter === 'all' ? refills : refills.filter(r => r.status === filter);

  function advance(id: string, next: RefillStatus) {
    setRefills(prev => prev.map(r => r.id === id ? { ...r, status: next } : r));
    setSelected(prev => prev?.id === id ? { ...prev, status: next } : prev);
  }

  function setDelivery(id: string, pref: DeliveryPref) {
    setRefills(prev => prev.map(r => r.id === id ? { ...r, deliveryPref: pref, status: 'preparing' } : r));
    setSelected(prev => prev?.id === id ? { ...prev, deliveryPref: pref, status: 'preparing' } : prev);
    setDeliveryModal(null);
    setDeliveryChoice(null);
  }

  function collectPayment(id: string) {
    setRefills(prev => prev.map(r => r.id === id ? { ...r, paymentStatus: 'paid', status: 'delivered' } : r));
    setSelected(prev => prev?.id === id ? { ...prev, paymentStatus: 'paid', status: 'delivered' } : prev);
  }

  const urgentCount = refills.filter(r => r.daysLeft <= 5 && !['delivered', 'picked_up'].includes(r.status)).length;

  return (
    <div className="flex gap-5 h-full">
      {/* Left list */}
      <div className="flex-1 flex flex-col min-w-0">
        {urgentCount > 0 && (
          <div className="mb-4 p-3 rounded-2xl flex items-center gap-2 text-[11px] font-bold text-amber-800"
            style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
            <span className="material-symbols-outlined text-amber-500 text-[16px]">warning</span>
            {urgentCount} patient{urgentCount > 1 ? 's' : ''} running low — refill action needed urgently
          </div>
        )}

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
            All ({refills.length})
          </button>
          {['patient_requested', 'awaiting_doctor', 'doctor_approved', 'ready'].map(s => {
            const meta = getMeta(s as RefillStatus);
            const count = refills.filter(r => r.status === s).length;
            if (count === 0) return null;
            return (
              <button key={s} onClick={() => setFilter(s as RefillStatus)}
                className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all`}
                style={filter === s ? { background: meta.color, color: '#fff' } : { background: meta.bg, color: meta.color }}>
                {meta.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="space-y-3 overflow-auto flex-1">
          {filtered.map(r => {
            const meta = getMeta(r.status);
            return (
              <div key={r.id} onClick={() => setSelected(r)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md ${selected?.id === r.id ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-black text-gray-900">{r.patientName}</p>
                      {r.daysLeft <= 5 && !['delivered','picked_up'].includes(r.status) && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-600">
                          {r.daysLeft === 0 ? 'Overdue' : `${r.daysLeft}d left`}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{r.medicine}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0"
                    style={{ background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">{r.doctorName} · {r.department}</p>

                {/* Quick actions */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {r.status === 'patient_requested' && (
                    <button onClick={e => { e.stopPropagation(); advance(r.id, 'awaiting_doctor'); }}
                      className="px-3 py-1 rounded-xl text-[10px] font-bold text-white" style={{ background: '#7C3AED' }}>
                      Send to Doctor
                    </button>
                  )}
                  {r.status === 'doctor_approved' && (
                    <button onClick={e => { e.stopPropagation(); setDeliveryModal(r.id); }}
                      className="px-3 py-1 rounded-xl text-[10px] font-bold text-white" style={{ background: '#17A077' }}>
                      Notify Patient
                    </button>
                  )}
                  {r.status === 'preparing' && (
                    <button onClick={e => { e.stopPropagation(); advance(r.id, 'ready'); }}
                      className="px-3 py-1 rounded-xl text-[10px] font-bold text-white" style={{ background: '#17A077' }}>
                      Mark Ready
                    </button>
                  )}
                  {r.status === 'ready' && r.deliveryPref === 'delivery' && r.paymentStatus !== 'paid' && (
                    <button onClick={e => { e.stopPropagation(); collectPayment(r.id); }}
                      className="px-3 py-1 rounded-xl text-[10px] font-bold text-white" style={{ background: '#059669' }}>
                      Collect Payment & Deliver
                    </button>
                  )}
                  {r.status === 'ready' && r.deliveryPref === 'pickup' && (
                    <button onClick={e => { e.stopPropagation(); advance(r.id, 'picked_up'); }}
                      className="px-3 py-1 rounded-xl text-[10px] font-bold text-white" style={{ background: '#6B7280' }}>
                      Mark Picked Up
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-gray-100 p-5 overflow-auto shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-black text-gray-900">Refill Detail</p>
            <button onClick={() => setSelected(null)} className="text-gray-400">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Workflow timeline */}
          <div className="mb-5">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Workflow</p>
            <div className="space-y-2">
              {WORKFLOW.filter(w => !['doctor_rejected','delivered','picked_up'].includes(w.status) || w.status === selected.status).map((w, i, arr) => {
                const statusIndex = WORKFLOW.findIndex(x => x.status === selected.status);
                const thisIndex = WORKFLOW.findIndex(x => x.status === w.status);
                const done = thisIndex < statusIndex;
                const current = w.status === selected.status;
                return (
                  <div key={w.status} className="flex items-start gap-2">
                    <div className="flex flex-col items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500' : current ? '' : 'bg-gray-100'}`}
                        style={current ? { background: w.color } : {}}>
                        <span className="material-symbols-outlined text-[10px] text-white">
                          {done ? 'check' : w.icon}
                        </span>
                      </div>
                      {i < arr.length - 1 && <div className={`w-px h-4 mt-0.5 ${done ? 'bg-green-300' : 'bg-gray-100'}`} />}
                    </div>
                    <p className={`text-[10px] mt-0.5 font-${current ? 'bold' : 'medium'}`}
                      style={{ color: current ? w.color : done ? '#6B7280' : '#D1D5DB' }}>
                      {w.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 text-[11px]">
            <div><p className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">Patient</p><p className="font-bold text-gray-900">{selected.patientName}</p><p className="text-gray-400">{selected.patientPhone}</p></div>
            <div><p className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">Medicine</p><p className="font-bold text-gray-900">{selected.medicine}</p></div>
            <div><p className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">Doctor</p><p className="font-bold text-gray-900">{selected.doctorName}</p><p className="text-gray-400">{selected.department}</p></div>
            {selected.deliveryPref && <div><p className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">Delivery</p><p className="font-bold text-gray-900 capitalize">{selected.deliveryPref}</p>{selected.address && <p className="text-gray-400 text-[10px]">{selected.address}</p>}</div>}
            {selected.paymentStatus && <div><p className="text-[9px] text-gray-400 uppercase tracking-widest mb-0.5">Payment</p><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${selected.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{selected.paymentStatus === 'paid' ? 'Paid' : 'Pending'}</span></div>}
          </div>
        </div>
      )}

      {/* Delivery preference modal */}
      {deliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-3xl p-6 w-80 shadow-2xl">
            <h3 className="text-[15px] font-black text-gray-900 mb-1">Notify Patient</h3>
            <p className="text-[11px] text-gray-400 mb-5">Medicines are ready. How will the patient receive them?</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {(['pickup', 'delivery'] as DeliveryPref[]).map(p => (
                <button key={p!} onClick={() => setDeliveryChoice(p)}
                  className={`p-4 rounded-2xl border-2 text-center transition-all ${deliveryChoice === p ? 'border-green-400 bg-green-50' : 'border-gray-100 hover:border-gray-300'}`}>
                  <span className="material-symbols-outlined text-[24px] block mb-1 text-gray-600">{p === 'pickup' ? 'shopping_bag' : 'local_shipping'}</span>
                  <p className="text-[11px] font-bold text-gray-900 capitalize">{p}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{p === 'pickup' ? 'Patient collects' : 'Home delivery'}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeliveryModal(null)} className="flex-1 py-2 rounded-xl text-[12px] font-bold text-gray-500 border border-gray-200">Cancel</button>
              <button onClick={() => deliveryChoice && setDelivery(deliveryModal, deliveryChoice)}
                disabled={!deliveryChoice}
                className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white disabled:opacity-40"
                style={{ background: '#17A077' }}>
                Confirm & Notify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
