import { useState } from 'react';

type DeliveryStatus = 'payment_pending' | 'payment_received' | 'packed' | 'out_for_delivery' | 'delivered' | 'failed';

interface DeliveryOrder {
  id: string; patientName: string; patientPhone: string; address: string;
  medicine: string; amount: number; status: DeliveryStatus;
  orderTime: string; deliveryAgent?: string; estimatedTime?: string;
  failReason?: string;
}

const MOCK_ORDERS: DeliveryOrder[] = [
  { id: 'DEL-001', patientName: 'Kavitha Rao', patientPhone: '+91 97654 32100', address: '12, MG Road, Koramangala, Bengaluru - 560001', medicine: 'Atorvastatin 10mg ×30', amount: 150, status: 'payment_pending', orderTime: '2026-11-01T10:30:00' },
  { id: 'DEL-002', patientName: 'Meera Iyer', patientPhone: '+91 98765 43210', address: '5A, Indiranagar, Bengaluru - 560038', medicine: 'Metformin 500mg ×60 + Atorvastatin 10mg ×30', amount: 300, status: 'out_for_delivery', orderTime: '2026-11-01T09:00:00', deliveryAgent: 'Ramu (DL-101)', estimatedTime: '11:30 AM' },
  { id: 'DEL-003', patientName: 'Suresh Menon', patientPhone: '+91 99001 22334', address: '22, Whitefield, Bengaluru - 560066', medicine: 'Aspirin 75mg ×30 + Amlodipine 5mg ×30', amount: 135, status: 'packed', orderTime: '2026-11-01T08:45:00', deliveryAgent: 'Kiran (DL-102)' },
  { id: 'DEL-004', patientName: 'Ananya Reddy', patientPhone: '+91 90000 55678', address: '8, HSR Layout, Bengaluru - 560102', medicine: 'Montelukast 10mg ×30', amount: 240, status: 'delivered', orderTime: '2026-10-31T14:00:00', deliveryAgent: 'Ramu (DL-101)' },
  { id: 'DEL-005', patientName: 'Vikram Sharma', patientPhone: '+91 98123 45678', address: '3, JP Nagar, Bengaluru - 560078', medicine: 'Levothyroxine 50mcg ×30', amount: 135, status: 'failed', orderTime: '2026-10-31T11:00:00', failReason: 'Patient not available at address' },
];

const STATUS_META: Record<DeliveryStatus, { label: string; color: string; bg: string; icon: string }> = {
  payment_pending:  { label: 'Payment Pending',  color: '#D97706', bg: '#FEF3C7', icon: 'payments'       },
  payment_received: { label: 'Payment Received', color: '#0891B2', bg: '#E0F4F9', icon: 'check_circle'   },
  packed:           { label: 'Packed',           color: '#7C3AED', bg: '#EDE9FE', icon: 'inventory_2'    },
  out_for_delivery: { label: 'Out for Delivery', color: '#17A077', bg: '#D1FAE5', icon: 'local_shipping' },
  delivered:        { label: 'Delivered',        color: '#6B7280', bg: '#F3F4F6', icon: 'task_alt'       },
  failed:           { label: 'Failed',           color: '#EF4444', bg: '#FEF2F2', icon: 'cancel'         },
};

export default function DeliveryManagement() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [filter, setFilter] = useState<DeliveryStatus | 'all'>('all');

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  const stats = {
    pending: orders.filter(o => o.status === 'payment_pending').length,
    active:  orders.filter(o => ['payment_received','packed','out_for_delivery'].includes(o.status)).length,
    done:    orders.filter(o => o.status === 'delivered').length,
    failed:  orders.filter(o => o.status === 'failed').length,
  };

  function advance(id: string) {
    const flow: DeliveryStatus[] = ['payment_pending', 'payment_received', 'packed', 'out_for_delivery', 'delivered'];
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const idx = flow.indexOf(o.status);
      return idx >= 0 && idx < flow.length - 1 ? { ...o, status: flow[idx + 1] } : o;
    }));
  }

  function retry(id: string) {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'packed', failReason: undefined } : o));
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Payment Pending', value: stats.pending, color: '#D97706', bg: '#FEF3C7', icon: 'payments' },
          { label: 'Active Deliveries', value: stats.active, color: '#17A077', bg: '#D1FAE5', icon: 'local_shipping' },
          { label: 'Delivered Today', value: stats.done, color: '#6B7280', bg: '#F3F4F6', icon: 'task_alt' },
          { label: 'Failed', value: stats.failed, color: '#EF4444', bg: '#FEF2F2', icon: 'cancel' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl border flex items-center gap-3"
            style={{ background: s.bg, borderColor: `${s.color}30` }}>
            <span className="material-symbols-outlined text-[22px]" style={{ color: s.color }}>{s.icon}</span>
            <div>
              <p className="text-[22px] font-black leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: s.color }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
          All ({orders.length})
        </button>
        {Object.entries(STATUS_META).map(([status, meta]) => {
          const count = orders.filter(o => o.status === status).length;
          if (count === 0) return null;
          return (
            <button key={status} onClick={() => setFilter(status as DeliveryStatus)}
              className="px-3 py-1 rounded-xl text-[10px] font-bold transition-all"
              style={filter === status ? { background: meta.color, color: '#fff' } : { background: meta.bg, color: meta.color }}>
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.map(o => {
          const meta = STATUS_META[o.status];
          return (
            <div key={o.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[13px] font-black text-gray-900">{o.patientName}</p>
                    <span className="text-[9px] font-bold text-gray-400">{o.id}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">{o.patientPhone}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1"
                    style={{ background: meta.bg, color: meta.color }}>
                    <span className="material-symbols-outlined text-[10px]">{meta.icon}</span>
                    {meta.label}
                  </span>
                  <p className="text-[10px] font-bold text-gray-900">₹{o.amount}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-gray-50">
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Medicine</p>
                  <p className="text-[11px] font-semibold text-gray-900">{o.medicine}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50">
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Delivery Address</p>
                  <p className="text-[10px] text-gray-700 leading-snug">{o.address}</p>
                </div>
              </div>

              {o.deliveryAgent && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[14px] text-blue-400">delivery_truck_speed</span>
                  <p className="text-[10px] text-gray-600">Agent: <strong>{o.deliveryAgent}</strong></p>
                  {o.estimatedTime && <p className="text-[10px] text-gray-400">ETA: {o.estimatedTime}</p>}
                </div>
              )}

              {o.failReason && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100">
                  <p className="text-[10px] text-red-600"><strong>Reason:</strong> {o.failReason}</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400">Ordered: {fmt(o.orderTime)}</p>
                <div className="flex gap-2">
                  {!['delivered', 'failed'].includes(o.status) && (
                    <button onClick={() => advance(o.id)}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-white"
                      style={{ background: '#17A077' }}>
                      {o.status === 'payment_pending' ? 'Confirm Payment' :
                       o.status === 'payment_received' ? 'Pack Order' :
                       o.status === 'packed' ? 'Dispatch' :
                       'Mark Delivered'}
                    </button>
                  )}
                  {o.status === 'failed' && (
                    <button onClick={() => retry(o.id)}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-white"
                      style={{ background: '#0891B2' }}>
                      Retry Delivery
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
