import { useState } from 'react';
import Sidebar from '../components/Sidebar';

// ── Types ────────────────────────────────────────────────────────────────────

type PrescriptionSource = 'doctor_tieup' | 'whatsapp';
type RxStatus = 'incoming' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed';
type DeliveryType = 'pickup' | 'delivery';

interface RxItem {
  medicine: string;
  dosage: string;
  qty: number;
  frequency: string;
}

interface Prescription {
  id: string;
  patientName: string;
  patientPhone: string;
  patientAddress: string;
  doctorName?: string;
  source: PrescriptionSource;
  items: RxItem[];
  status: RxStatus;
  deliveryType: DeliveryType | null;
  receivedAt: string;
  notes: string;
  refillDays?: number;
  refillDue?: string;
  refillStatus?: 'pending_reminder' | 'reminded' | 'approved' | 'rejected' | 'filling';
}

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK: Prescription[] = [
  {
    id: 'RX-001',
    patientName: 'Meera Iyer',
    patientPhone: '+91 98765 43210',
    patientAddress: '12, MG Road, Koramangala, Bengaluru - 560095',
    doctorName: 'Dr. Anita Sharma',
    source: 'doctor_tieup',
    items: [
      { medicine: 'Metformin 500mg', dosage: '500mg', qty: 30, frequency: 'Twice daily after meals' },
      { medicine: 'Atorvastatin', dosage: '10mg', qty: 30, frequency: 'Once daily at night' },
    ],
    status: 'incoming',
    deliveryType: null,
    receivedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    notes: 'Patient is diabetic, check BP before dispensing',
    refillDays: 30,
  },
  {
    id: 'RX-002',
    patientName: 'Rajesh Kumar',
    patientPhone: '+91 91234 56789',
    patientAddress: '5A, Indiranagar, Bengaluru - 560038',
    source: 'whatsapp',
    items: [
      { medicine: 'Paracetamol 500mg', dosage: '500mg', qty: 20, frequency: 'Thrice daily as needed' },
      { medicine: 'Amoxicillin 250mg', dosage: '250mg', qty: 21, frequency: 'Thrice daily for 7 days' },
      { medicine: 'Pantoprazole 40mg', dosage: '40mg', qty: 10, frequency: 'Once daily before breakfast' },
    ],
    status: 'preparing',
    deliveryType: 'delivery',
    receivedAt: new Date(Date.now() - 90 * 60000).toISOString(),
    notes: '',
    refillDays: 7,
  },
  {
    id: 'RX-003',
    patientName: 'Sridhar Rao',
    patientPhone: '+91 99887 76655',
    patientAddress: '7, Jayanagar 4th Block, Bengaluru - 560041',
    doctorName: 'Dr. Ravi Prasad',
    source: 'doctor_tieup',
    items: [
      { medicine: 'Amlodipine 5mg', dosage: '5mg', qty: 30, frequency: 'Once daily morning' },
      { medicine: 'Telmisartan 40mg', dosage: '40mg', qty: 30, frequency: 'Once daily morning' },
    ],
    status: 'ready',
    deliveryType: 'pickup',
    receivedAt: new Date(Date.now() - 180 * 60000).toISOString(),
    notes: 'BP medication — priority',
    refillDays: 30,
    refillDue: new Date(Date.now() + 25 * 24 * 3600000).toISOString().slice(0, 10),
    refillStatus: 'pending_reminder',
  },
  {
    id: 'RX-004',
    patientName: 'Priya Nair',
    patientPhone: '+91 88776 65544',
    patientAddress: '22, HSR Layout, Bengaluru - 560102',
    source: 'whatsapp',
    items: [
      { medicine: 'Levothyroxine 50mcg', dosage: '50mcg', qty: 30, frequency: 'Once daily empty stomach' },
    ],
    status: 'out_for_delivery',
    deliveryType: 'delivery',
    receivedAt: new Date(Date.now() - 300 * 60000).toISOString(),
    notes: '',
    refillDays: 30,
    refillDue: new Date(Date.now() + 5 * 24 * 3600000).toISOString().slice(0, 10),
    refillStatus: 'reminded',
  },
  {
    id: 'RX-005',
    patientName: 'Kavya Reddy',
    patientPhone: '+91 77665 54433',
    patientAddress: '3, Whitefield, Bengaluru - 560066',
    doctorName: 'Dr. Anita Sharma',
    source: 'doctor_tieup',
    items: [
      { medicine: 'Montelukast 10mg', dosage: '10mg', qty: 30, frequency: 'Once daily at bedtime' },
      { medicine: 'Budesonide Inhaler', dosage: '200mcg', qty: 1, frequency: '2 puffs twice daily' },
    ],
    status: 'completed',
    deliveryType: 'delivery',
    receivedAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    notes: '',
    refillDays: 30,
    refillDue: new Date(Date.now() - 5 * 24 * 3600000).toISOString().slice(0, 10),
    refillStatus: 'approved',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RxStatus, { label: string; color: string; icon: string }> = {
  incoming:         { label: 'Incoming',        color: 'bg-blue-100 text-blue-700',   icon: 'inbox'            },
  preparing:        { label: 'Preparing',       color: 'bg-amber-100 text-amber-700', icon: 'medication'       },
  ready:            { label: 'Ready',           color: 'bg-green-100 text-green-700', icon: 'check_circle'     },
  out_for_delivery: { label: 'Out for Delivery',color: 'bg-purple-100 text-purple-700',icon: 'local_shipping'  },
  completed:        { label: 'Completed',       color: 'bg-gray-100 text-gray-600',   icon: 'task_alt'         },
};

const REFILL_CONFIG: Record<string, { label: string; color: string }> = {
  pending_reminder: { label: 'Reminder Due',  color: 'bg-amber-100 text-amber-700'  },
  reminded:         { label: 'Reminded',       color: 'bg-blue-100 text-blue-700'    },
  approved:         { label: 'Approved ✓',    color: 'bg-green-100 text-green-700'  },
  rejected:         { label: 'Rejected',       color: 'bg-red-100 text-red-600'      },
  filling:          { label: 'Filling',        color: 'bg-purple-100 text-purple-700'},
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TABS = [
  { key: 'incoming',         label: 'Incoming',     icon: 'inbox',          statuses: ['incoming'] as RxStatus[]           },
  { key: 'preparing',        label: 'Preparing',    icon: 'medication',     statuses: ['preparing'] as RxStatus[]          },
  { key: 'ready',            label: 'Ready',        icon: 'storefront',     statuses: ['ready', 'out_for_delivery'] as RxStatus[] },
  { key: 'refills',          label: 'Refills',      icon: 'autorenew',      statuses: [] as RxStatus[]                     },
  { key: 'completed',        label: 'Completed',    icon: 'task_alt',       statuses: ['completed'] as RxStatus[]          },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: PrescriptionSource }) {
  return source === 'doctor_tieup' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold border border-teal-200">
      <span className="material-symbols-outlined text-[13px]">local_hospital</span>
      Doctor Rx
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-semibold border border-green-200">
      <span className="material-symbols-outlined text-[13px]">chat</span>
      WhatsApp
    </span>
  );
}

function DeliveryBadge({ type }: { type: DeliveryType | null }) {
  if (!type) return null;
  return type === 'pickup' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
      <span className="material-symbols-outlined text-[13px]">storefront</span>
      Pickup
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[11px] font-semibold">
      <span className="material-symbols-outlined text-[13px]">local_shipping</span>
      Home Delivery
    </span>
  );
}

interface RxCardProps {
  rx: Prescription;
  onAction: (id: string, action: string, payload?: unknown) => void;
}

function RxCard({ rx, onAction }: RxCardProps) {
  const [showItems, setShowItems] = useState(false);
  const sc = STATUS_CONFIG[rx.status];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-gray-900 text-[15px]">{rx.patientName}</span>
            <SourceBadge source={rx.source} />
            <DeliveryBadge type={rx.deliveryType} />
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sc.color}`}>
              <span className="material-symbols-outlined text-[13px]">{sc.icon}</span>
              {sc.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[12px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">phone</span>
              {rx.patientPhone}
            </span>
            <span>·</span>
            <span>{rx.id}</span>
            <span>·</span>
            <span>{timeAgo(rx.receivedAt)}</span>
            {rx.doctorName && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">stethoscope</span>
                  {rx.doctorName}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowItems(v => !v)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
          title="Toggle medicines"
        >
          <span className="material-symbols-outlined">{showItems ? 'expand_less' : 'expand_more'}</span>
        </button>
      </div>

      {/* Medicines summary */}
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[16px] text-gray-400">medication</span>
        <span className="text-[13px] text-gray-600">
          {rx.items.slice(0, 2).map(i => i.medicine).join(', ')}
          {rx.items.length > 2 && ` +${rx.items.length - 2} more`}
        </span>
        <span className="ml-auto text-[12px] text-gray-400">{rx.items.length} item{rx.items.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Expanded medicine list */}
      {showItems && (
        <div className="mb-3 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
          <table className="w-full text-[12px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Medicine</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-600">Qty</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Frequency</th>
              </tr>
            </thead>
            <tbody>
              {rx.items.map((item, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{item.medicine}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{item.qty}</td>
                  <td className="px-3 py-2 text-gray-500">{item.frequency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Address (for delivery) */}
      {rx.deliveryType === 'delivery' && (
        <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-orange-50 border border-orange-100">
          <span className="material-symbols-outlined text-[16px] text-orange-500 mt-0.5">location_on</span>
          <span className="text-[12px] text-orange-800">{rx.patientAddress}</span>
        </div>
      )}

      {/* Notes */}
      {rx.notes && (
        <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-amber-50 border border-amber-100">
          <span className="material-symbols-outlined text-[16px] text-amber-500 mt-0.5">info</span>
          <span className="text-[12px] text-amber-800">{rx.notes}</span>
        </div>
      )}

      {/* Actions by status */}
      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
        {rx.status === 'incoming' && (
          <>
            {!rx.deliveryType && (
              <>
                <button
                  onClick={() => onAction(rx.id, 'set_delivery', 'pickup')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 text-[12px] font-semibold hover:bg-indigo-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">storefront</span>
                  Pickup
                </button>
                <button
                  onClick={() => onAction(rx.id, 'set_delivery', 'delivery')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-orange-200 text-orange-700 text-[12px] font-semibold hover:bg-orange-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                  Home Delivery
                </button>
              </>
            )}
            <button
              disabled={!rx.deliveryType}
              onClick={() => onAction(rx.id, 'start_preparing')}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#17A077] text-white text-[12px] font-semibold hover:bg-[#0D9460] disabled:opacity-40 disabled:cursor-not-allowed transition-colors ml-auto"
            >
              <span className="material-symbols-outlined text-[14px]">play_arrow</span>
              Start Preparing
            </button>
          </>
        )}

        {rx.status === 'preparing' && (
          <button
            onClick={() => onAction(rx.id, 'mark_ready')}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-green-600 text-white text-[12px] font-semibold hover:bg-green-700 transition-colors ml-auto"
          >
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Mark Ready
          </button>
        )}

        {rx.status === 'ready' && rx.deliveryType === 'pickup' && (
          <>
            <span className="text-[12px] text-gray-500 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">notifications</span>
              Patient notified for pickup
            </span>
            <button
              onClick={() => onAction(rx.id, 'mark_picked_up')}
              className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#17A077] text-white text-[12px] font-semibold hover:bg-[#0D9460] transition-colors ml-auto"
            >
              <span className="material-symbols-outlined text-[14px]">done_all</span>
              Confirm Picked Up
            </button>
          </>
        )}

        {rx.status === 'ready' && rx.deliveryType === 'delivery' && (
          <button
            onClick={() => onAction(rx.id, 'dispatch_delivery')}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-purple-600 text-white text-[12px] font-semibold hover:bg-purple-700 transition-colors ml-auto"
          >
            <span className="material-symbols-outlined text-[14px]">local_shipping</span>
            Dispatch for Delivery
          </button>
        )}

        {rx.status === 'out_for_delivery' && (
          <button
            onClick={() => onAction(rx.id, 'mark_delivered')}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#17A077] text-white text-[12px] font-semibold hover:bg-[#0D9460] transition-colors ml-auto"
          >
            <span className="material-symbols-outlined text-[14px]">done_all</span>
            Confirm Delivered
          </button>
        )}

        {/* Refill setup (after marking ready) */}
        {(rx.status === 'ready' || rx.status === 'out_for_delivery') && rx.refillDays && !rx.refillDue && (
          <button
            onClick={() => onAction(rx.id, 'schedule_refill')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#17A077] text-[#17A077] text-[12px] font-semibold hover:bg-[#17A077]/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">autorenew</span>
            Schedule Refill ({rx.refillDays}d)
          </button>
        )}

        {rx.status === 'completed' && rx.refillStatus && (
          <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${REFILL_CONFIG[rx.refillStatus]?.color ?? ''}`}>
            Refill: {REFILL_CONFIG[rx.refillStatus]?.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Refill Card ──────────────────────────────────────────────────────────────

function RefillCard({ rx, onAction }: { rx: Prescription; onAction: (id: string, action: string) => void }) {
  if (!rx.refillDue) return null;
  const daysLeft = Math.ceil((new Date(rx.refillDue).getTime() - Date.now()) / 86400000);
  const isOverdue = daysLeft < 0;
  const isDueSoon = daysLeft <= 3 && daysLeft >= 0;

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 ${isOverdue ? 'border-red-200' : isDueSoon ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900">{rx.patientName}</span>
            <SourceBadge source={rx.source} />
            {rx.refillStatus && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${REFILL_CONFIG[rx.refillStatus]?.color ?? ''}`}>
                {REFILL_CONFIG[rx.refillStatus]?.label}
              </span>
            )}
          </div>
          <div className="text-[12px] text-gray-500">{rx.id} · {rx.patientPhone}</div>
        </div>
        <div className={`text-right text-[12px] font-semibold ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-gray-500'}`}>
          {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `Due in ${daysLeft}d`}
          <div className="font-normal text-gray-400">{rx.refillDue}</div>
        </div>
      </div>

      <div className="text-[13px] text-gray-600 mb-3">
        {rx.items.map(i => i.medicine).join(', ')}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        {rx.refillStatus === 'pending_reminder' && (
          <button
            onClick={() => onAction(rx.id, 'send_reminder')}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#17A077] text-white text-[12px] font-semibold hover:bg-[#0D9460] transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">notifications</span>
            Send Reminder to Patient
          </button>
        )}
        {rx.refillStatus === 'approved' && (
          <button
            onClick={() => onAction(rx.id, 'start_refill')}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-purple-600 text-white text-[12px] font-semibold hover:bg-purple-700 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">autorenew</span>
            Start Filling Refill
          </button>
        )}
        {rx.refillStatus === 'reminded' && (
          <span className="text-[12px] text-blue-600 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            Waiting for patient approval…
          </span>
        )}
        {rx.refillStatus === 'filling' && (
          <span className="text-[12px] text-purple-600 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">medication</span>
            Refill being prepared…
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function PharmacyDashboard() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(MOCK);
  const [activeTab, setActiveTab] = useState('incoming');
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleAction(id: string, action: string, payload?: unknown) {
    setPrescriptions(prev => prev.map(rx => {
      if (rx.id !== id) return rx;
      switch (action) {
        case 'set_delivery':
          return { ...rx, deliveryType: payload as DeliveryType };
        case 'start_preparing':
          showToast(`${rx.patientName}'s prescription moved to Preparing`);
          return { ...rx, status: 'preparing' };
        case 'mark_ready':
          showToast(`${rx.patientName}'s medicines are ready!`);
          return { ...rx, status: 'ready' };
        case 'dispatch_delivery':
          showToast(`Out for delivery to ${rx.patientName}`);
          return { ...rx, status: 'out_for_delivery' };
        case 'mark_picked_up':
        case 'mark_delivered':
          showToast(`Order completed for ${rx.patientName}`);
          return { ...rx, status: 'completed' };
        case 'schedule_refill': {
          const due = new Date(Date.now() + (rx.refillDays ?? 30) * 86400000).toISOString().slice(0, 10);
          showToast(`Refill scheduled for ${rx.patientName} on ${due}`);
          return { ...rx, refillDue: due, refillStatus: 'pending_reminder' };
        }
        case 'send_reminder':
          showToast(`Refill reminder sent to ${rx.patientName} via WhatsApp`);
          return { ...rx, refillStatus: 'reminded' };
        case 'start_refill':
          showToast(`Starting refill for ${rx.patientName}`);
          return { ...rx, refillStatus: 'filling', status: 'preparing' };
        default:
          return rx;
      }
    }));
  }

  const counts = {
    incoming:  prescriptions.filter(r => r.status === 'incoming').length,
    preparing: prescriptions.filter(r => r.status === 'preparing').length,
    ready:     prescriptions.filter(r => r.status === 'ready' || r.status === 'out_for_delivery').length,
    refills:   prescriptions.filter(r => r.refillDue && r.refillStatus && r.refillStatus !== 'filling').length,
    completed: prescriptions.filter(r => r.status === 'completed').length,
  };

  const visibleRx = TABS.find(t => t.key === activeTab)?.statuses.length
    ? prescriptions.filter(rx => (TABS.find(t => t.key === activeTab)?.statuses ?? []).includes(rx.status))
    : [];

  const refillRx = prescriptions.filter(rx => rx.refillDue);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#17A077]">local_pharmacy</span>
                Pharmacy Hub
              </h1>
              <p className="text-[12px] text-gray-500 mt-0.5">Tie-up Partner: Lumina Diagnostics · Bengaluru</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] text-gray-400 uppercase tracking-wider">Today</div>
                <div className="text-[13px] font-semibold text-gray-700">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {TABS.map(tab => {
              const count = counts[tab.key as keyof typeof counts];
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[#17A077] text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">{tab.icon}</span>
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-4">
          {activeTab === 'refills' ? (
            refillRx.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <span className="material-symbols-outlined text-5xl mb-3 block">autorenew</span>
                <p className="text-[14px]">No refills scheduled yet</p>
              </div>
            ) : (
              refillRx.map(rx => (
                <RefillCard key={rx.id} rx={rx} onAction={handleAction} />
              ))
            )
          ) : (
            visibleRx.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <span className="material-symbols-outlined text-5xl mb-3 block">inbox</span>
                <p className="text-[14px]">No prescriptions in this category</p>
              </div>
            ) : (
              visibleRx.map(rx => (
                <RxCard key={rx.id} rx={rx} onAction={handleAction} />
              ))
            )
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-[13px] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50 animate-fade-in">
          <span className="material-symbols-outlined text-[#17A077] text-[16px]">check_circle</span>
          {toast}
        </div>
      )}
    </div>
  );
}
