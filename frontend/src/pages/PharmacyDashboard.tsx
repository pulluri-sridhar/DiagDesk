import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import PrescriptionQueue  from './pharmacy/PrescriptionQueue';
import MedicineInventory  from './pharmacy/MedicineInventory';
import RefillCenter       from './pharmacy/RefillCenter';
import DeliveryManagement from './pharmacy/DeliveryManagement';

type Tab = 'overview' | 'prescriptions' | 'inventory' | 'refills' | 'deliveries';

const TABS: { id: Tab; label: string; icon: string; badge?: number }[] = [
  { id: 'overview',      label: 'Overview',      icon: 'dashboard'        },
  { id: 'prescriptions', label: 'Prescriptions', icon: 'description',   badge: 3 },
  { id: 'inventory',     label: 'Inventory',     icon: 'inventory_2',   badge: 2 },
  { id: 'refills',       label: 'Refill Center', icon: 'autorenew',     badge: 4 },
  { id: 'deliveries',    label: 'Deliveries',    icon: 'local_shipping', badge: 1 },
];

const OVERVIEW_STATS = [
  { icon: 'description',   label: 'Pending Rx',        value: '3',  color: '#0891B2', bg: '#E0F4F9' },
  { icon: 'autorenew',     label: 'Refill Requests',   value: '4',  color: '#7C3AED', bg: '#EDE9FE' },
  { icon: 'warning',       label: 'Low Stock Items',   value: '2',  color: '#D97706', bg: '#FEF3C7' },
  { icon: 'local_shipping',label: 'Active Deliveries', value: '3',  color: '#17A077', bg: '#D1FAE5' },
];

const RECENT_ACTIVITY = [
  { icon: 'check_circle',  text: 'RX-004 dispensed to Arjun Reddy',                           time: '10 min ago',  color: '#17A077' },
  { icon: 'autorenew',     text: 'Refill request from Meera Iyer sent to Dr. Sharma',          time: '25 min ago',  color: '#7C3AED' },
  { icon: 'warning',       text: 'Salbutamol Inhaler stock below minimum (12 left)',            time: '1 hr ago',    color: '#D97706' },
  { icon: 'local_shipping',text: 'DEL-002 out for delivery — Meera Iyer',                      time: '1.5 hr ago',  color: '#0891B2' },
  { icon: 'payments',      text: 'Payment received for DEL-003 — Suresh Menon ₹135',          time: '2 hr ago',    color: '#059669' },
];

const PHARMACY_TYPES = [
  { icon: 'local_hospital', label: 'Affiliated Pharmacy', desc: 'Hospital-attached · Prescriptions auto-received from doctors',   color: '#17A077', bg: '#D1FAE5' },
  { icon: 'storefront',     label: 'Non-Affiliated',       desc: 'External · Patient brings or uploads prescription',              color: '#0891B2', bg: '#E0F4F9' },
];

const AFFILIATED_FEATURES = [
  'Doctor prescribes → Auto-routed to pharmacy queue',
  'Track medicine quantity in real time',
  'Auto refill reminders to patients',
  'Doctor approval workflow for refills',
];

const NON_AFFILIATED_FEATURES = [
  'Patient brings/uploads prescription',
  'Verify doctor credentials before dispensing',
  'Same refill & delivery workflow',
  'Inventory shared with affiliated pharmacy',
];

export default function PharmacyDashboard() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden ml-64">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-0 flex-shrink-0">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-[18px] font-black text-gray-900">Pharmacy Hub</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">Manage prescriptions, inventory, refills and deliveries</p>
            </div>
            <div className="flex items-center gap-2">
              {PHARMACY_TYPES.map(t => (
                <div key={t.label} className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                  style={{ background: t.bg, border: `1px solid ${t.color}30` }}>
                  <span className="material-symbols-outlined text-[14px]" style={{ color: t.color }}>{t.icon}</span>
                  <span className="text-[10px] font-bold" style={{ color: t.color }}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-0">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-[12px] font-bold border-b-2 transition-all ${
                  tab === t.id ? 'border-green-500 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}>
                <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                {t.label}
                {t.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${tab === t.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {tab === 'overview' && (
            <div className="max-w-5xl mx-auto">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {OVERVIEW_STATS.map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: s.bg }}>
                      <span className="material-symbols-outlined text-[20px]" style={{ color: s.color }}>{s.icon}</span>
                    </div>
                    <div>
                      <p className="text-[24px] font-black text-gray-900 leading-none">{s.value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Recent activity */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="text-[13px] font-black text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {RECENT_ACTIVITY.map((a, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${a.color}15` }}>
                          <span className="material-symbols-outlined text-[13px]" style={{ color: a.color }}>{a.icon}</span>
                        </div>
                        <div>
                          <p className="text-[11px] text-gray-700 leading-snug">{a.text}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{a.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pharmacy types */}
                <div className="space-y-4">
                  {PHARMACY_TYPES.map(t => {
                    const features = t.icon === 'local_hospital' ? AFFILIATED_FEATURES : NON_AFFILIATED_FEATURES;
                    return (
                      <div key={t.label} className="bg-white rounded-2xl border border-gray-100 p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: t.bg }}>
                            <span className="material-symbols-outlined text-[20px]" style={{ color: t.color }}>{t.icon}</span>
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-gray-900">{t.label}</p>
                            <p className="text-[10px] text-gray-400">{t.desc}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {features.map(item => (
                            <div key={item} className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[12px]" style={{ color: t.color }}>check_small</span>
                              <p className="text-[11px] text-gray-600">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'prescriptions' && <PrescriptionQueue />}
          {tab === 'inventory'     && <MedicineInventory />}
          {tab === 'refills'       && <RefillCenter />}
          {tab === 'deliveries'    && <DeliveryManagement />}
        </div>
      </div>
    </div>
  );
}
