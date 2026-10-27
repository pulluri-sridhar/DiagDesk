import { useState } from 'react';
import Sidebar from '../../components/Sidebar';

type Modality = 'xray' | 'ultrasound' | 'ct' | 'mri' | 'mammography';
type OrderStatus = 'ordered' | 'scheduled' | 'done' | 'reported' | 'cancelled';

interface RadExam { id: string; name: string; modality: Modality; rate: number; }
interface RadOrder {
  id: string; patientName: string; patientId: string; doctorName: string; examName: string;
  modality: Modality; urgent: boolean; clinicalNotes: string; status: OrderStatus;
  orderedAt: string; findings?: string; impression?: string; reportedBy?: string; reportedAt?: string;
}

const MODALITY_CONFIG: Record<Modality, { label: string; color: string; icon: string }> = {
  xray:        { label: 'X-Ray',        color: 'text-gray-700  bg-gray-100',    icon: 'radiology'        },
  ultrasound:  { label: 'Ultrasound',   color: 'text-blue-700  bg-blue-100',    icon: 'sensors'          },
  ct:          { label: 'CT Scan',      color: 'text-purple-700 bg-purple-100', icon: 'biotech'          },
  mri:         { label: 'MRI',          color: 'text-indigo-700 bg-indigo-100', icon: 'hub'              },
  mammography: { label: 'Mammography',  color: 'text-pink-700  bg-pink-100',    icon: 'favorite'         },
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  ordered:   { label: 'Ordered',   color: 'bg-blue-100 text-blue-700'     },
  scheduled: { label: 'Scheduled', color: 'bg-amber-100 text-amber-700'   },
  done:      { label: 'Done',      color: 'bg-teal-100 text-teal-700'     },
  reported:  { label: 'Reported',  color: 'bg-green-100 text-green-700'   },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-600'       },
};

const EXAMS: RadExam[] = [
  { id: 'e1',  name: 'Chest X-Ray (PA view)',        modality: 'xray',       rate: 300  },
  { id: 'e2',  name: 'Abdomen X-Ray',                modality: 'xray',       rate: 350  },
  { id: 'e3',  name: 'Spine X-Ray (Lumbar)',          modality: 'xray',       rate: 450  },
  { id: 'e4',  name: 'Abdomen Ultrasound',            modality: 'ultrasound', rate: 600  },
  { id: 'e5',  name: 'Pelvis Ultrasound',             modality: 'ultrasound', rate: 700  },
  { id: 'e6',  name: 'Thyroid Ultrasound',            modality: 'ultrasound', rate: 800  },
  { id: 'e7',  name: 'CT Head Plain',                 modality: 'ct',         rate: 3500 },
  { id: 'e8',  name: 'CT Chest with Contrast',        modality: 'ct',         rate: 5000 },
  { id: 'e9',  name: 'CT Abdomen & Pelvis',           modality: 'ct',         rate: 6000 },
  { id: 'e10', name: 'MRI Brain with Contrast',       modality: 'mri',        rate: 8000 },
  { id: 'e11', name: 'MRI Spine (Lumbar)',             modality: 'mri',        rate: 7500 },
  { id: 'e12', name: 'Mammography Bilateral',         modality: 'mammography',rate: 1200 },
];

const MOCK_ORDERS: RadOrder[] = [
  { id: 'r1', patientName: 'Meera Iyer', patientId: 'DD-00123', doctorName: 'Dr. Anita Sharma', examName: 'Chest X-Ray (PA view)', modality: 'xray', urgent: false, clinicalNotes: 'Cough 2 weeks, rule out pneumonia', status: 'reported', orderedAt: new Date(Date.now() - 3 * 86400000).toISOString(), findings: 'Bilateral lower zone haziness. No pleural effusion. Cardiomegaly absent.', impression: 'Features consistent with early bronchopneumonia. Clinical correlation advised.', reportedBy: 'Dr. Suresh Mehta', reportedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: 'r2', patientName: 'Rajesh Kumar', patientId: 'DD-00456', doctorName: 'Dr. Ravi Prasad', examName: 'Abdomen Ultrasound', modality: 'ultrasound', urgent: false, clinicalNotes: 'RUQ pain, rule out cholelithiasis', status: 'done', orderedAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'r3', patientName: 'Suresh Babu', patientId: 'DD-00321', doctorName: 'Dr. Ravi Prasad', examName: 'CT Head Plain', modality: 'ct', urgent: true, clinicalNotes: 'Acute onset headache, rule out bleed', status: 'ordered', orderedAt: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: 'r4', patientName: 'Kavya Reddy', patientId: 'DD-00654', doctorName: 'Dr. Meena Joshi', examName: 'MRI Brain with Contrast', modality: 'mri', urgent: false, clinicalNotes: 'Recurrent seizures, lesion on EEG', status: 'scheduled', orderedAt: new Date(Date.now() - 2 * 86400000).toISOString() },
];

const DOCTORS = ['Dr. Anita Sharma', 'Dr. Ravi Prasad', 'Dr. Meena Joshi', 'Dr. Suresh Mehta'];

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Order Form ────────────────────────────────────────────────────────────────

function NewOrderModal({ onAdd, onClose }: { onAdd: (o: Omit<RadOrder, 'id'>) => void; onClose: () => void }) {
  const [form, setForm] = useState({ patientName: '', patientId: '', doctorName: DOCTORS[0], examId: EXAMS[0].id, urgent: false, clinicalNotes: '' });
  const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));
  const exam = EXAMS.find(e => e.id === form.examId)!;

  function submit() {
    if (!form.patientName) return;
    onAdd({ patientName: form.patientName, patientId: form.patientId || 'WALK-IN', doctorName: form.doctorName, examName: exam.name, modality: exam.modality, urgent: form.urgent, clinicalNotes: form.clinicalNotes, status: 'ordered', orderedAt: new Date().toISOString() });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">New Radiology Order</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Patient Name *</label>
            <input value={form.patientName} onChange={e => set('patientName', e.target.value)} placeholder="Full name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Patient ID</label>
            <input value={form.patientId} onChange={e => set('patientId', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Referring Doctor</label>
            <select value={form.doctorName} onChange={e => set('doctorName', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30">
              {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Examination</label>
            <select value={form.examId} onChange={e => set('examId', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30">
              {EXAMS.map(e => <option key={e.id} value={e.id}>{e.name} — ₹{e.rate.toLocaleString()}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Clinical Notes / Indication</label>
            <textarea value={form.clinicalNotes} onChange={e => set('clinicalNotes', e.target.value)} rows={2}
              placeholder="Reason for exam, relevant history…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30 resize-none" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="urgent" checked={form.urgent} onChange={e => set('urgent', e.target.checked)} className="w-4 h-4 accent-red-500" />
            <label htmlFor="urgent" className="text-[13px] font-semibold text-red-600">Mark as Urgent</label>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} className="flex-1 py-2 bg-[#17A077] text-white rounded-lg text-[13px] font-semibold hover:bg-[#0D9460]">Create Order</button>
        </div>
      </div>
    </div>
  );
}

// ── Report Modal ──────────────────────────────────────────────────────────────

function ReportModal({ order, onSave, onClose }: { order: RadOrder; onSave: (id: string, findings: string, impression: string) => void; onClose: () => void }) {
  const [findings, setFindings] = useState(order.findings ?? '');
  const [impression, setImpression] = useState(order.impression ?? '');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-bold text-gray-900">Radiology Report</h3>
            <p className="text-[12px] text-gray-500">{order.examName} · {order.patientName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {order.clinicalNotes && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-[12px]">
              <span className="font-semibold text-amber-700">Clinical notes: </span>
              <span className="text-amber-800">{order.clinicalNotes}</span>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Findings</label>
            <textarea rows={4} value={findings} onChange={e => setFindings(e.target.value)}
              placeholder="Describe what is seen on the images…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30 resize-none" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Impression / Conclusion</label>
            <textarea rows={3} value={impression} onChange={e => setImpression(e.target.value)}
              placeholder="Radiologist's conclusion and recommendation…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onSave(order.id, findings, impression); onClose(); }}
            className="flex-1 py-2 bg-[#17A077] text-white rounded-lg text-[13px] font-semibold hover:bg-[#0D9460]">Submit Report</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RadiologyModule() {
  const [orders, setOrders] = useState<RadOrder[]>(MOCK_ORDERS);
  const [showNew, setShowNew] = useState(false);
  const [reportOrder, setReportOrder] = useState<RadOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [filterModality, setFilterModality] = useState<Modality | 'all'>('all');

  function addOrder(o: Omit<RadOrder, 'id'>) {
    setOrders(prev => [{ ...o, id: `r${Date.now()}` }, ...prev]);
  }

  function advanceStatus(id: string) {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const next: Record<OrderStatus, OrderStatus> = { ordered: 'scheduled', scheduled: 'done', done: 'done', reported: 'reported', cancelled: 'cancelled' };
      return { ...o, status: next[o.status] };
    }));
  }

  function saveReport(id: string, findings: string, impression: string) {
    setOrders(prev => prev.map(o => o.id !== id ? o : { ...o, findings, impression, status: 'reported', reportedBy: 'Dr. Suresh Mehta', reportedAt: new Date().toISOString() }));
  }

  const filtered = orders.filter(o =>
    (filterStatus === 'all' || o.status === filterStatus) &&
    (filterModality === 'all' || o.modality === filterModality)
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#17A077]">radiology</span>
              Radiology
            </h1>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#17A077] text-white rounded-xl font-semibold text-[13px] hover:bg-[#0D9460]">
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Order
            </button>
          </div>
          <div className="flex gap-3">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as OrderStatus | 'all')}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30">
              <option value="all">All Statuses</option>
              {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
            <select value={filterModality} onChange={e => setFilterModality(e.target.value as Modality | 'all')}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30">
              <option value="all">All Modalities</option>
              {(Object.keys(MODALITY_CONFIG) as Modality[]).map(m => <option key={m} value={m}>{MODALITY_CONFIG[m].label}</option>)}
            </select>
          </div>
        </div>

        <div className="px-8 py-6 space-y-3">
          {filtered.map(order => {
            const mc = MODALITY_CONFIG[order.modality];
            const sc = STATUS_CONFIG[order.status];
            return (
              <div key={order.id} className={`bg-white rounded-xl border shadow-sm p-5 ${order.urgent ? 'border-red-300' : 'border-gray-200'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mc.color}`}>
                    <span className="material-symbols-outlined text-[18px]">{mc.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-900">{order.patientName}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${mc.color}`}>{mc.label}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${sc.color}`}>{sc.label}</span>
                      {order.urgent && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">URGENT</span>}
                    </div>
                    <div className="text-[13px] font-semibold text-gray-700 mb-1">{order.examName}</div>
                    <div className="text-[12px] text-gray-500">{order.patientId} · {order.doctorName} · {timeAgo(order.orderedAt)}</div>
                    {order.clinicalNotes && <div className="text-[12px] text-gray-500 italic mt-1">"{order.clinicalNotes}"</div>}
                    {order.status === 'reported' && order.impression && (
                      <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-100 text-[12px] text-green-800">
                        <span className="font-semibold">Impression: </span>{order.impression}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {order.status === 'ordered' && (
                      <button onClick={() => advanceStatus(order.id)}
                        className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-[11px] font-semibold hover:bg-amber-200">
                        Schedule
                      </button>
                    )}
                    {order.status === 'scheduled' && (
                      <button onClick={() => advanceStatus(order.id)}
                        className="px-3 py-1.5 rounded-lg bg-teal-100 text-teal-700 text-[11px] font-semibold hover:bg-teal-200">
                        Mark Done
                      </button>
                    )}
                    {order.status === 'done' && (
                      <button onClick={() => setReportOrder(order)}
                        className="px-3 py-1.5 rounded-lg bg-[#17A077] text-white text-[11px] font-semibold hover:bg-[#0D9460]">
                        Write Report
                      </button>
                    )}
                    {order.status === 'reported' && (
                      <button onClick={() => setReportOrder(order)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-semibold hover:bg-gray-50">
                        View Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <span className="material-symbols-outlined text-5xl mb-3 block">radiology</span>
              <p className="text-[14px]">No radiology orders found</p>
            </div>
          )}
        </div>
      </main>
      {showNew && <NewOrderModal onAdd={addOrder} onClose={() => setShowNew(false)} />}
      {reportOrder && <ReportModal order={reportOrder} onSave={saveReport} onClose={() => setReportOrder(null)} />}
    </div>
  );
}
