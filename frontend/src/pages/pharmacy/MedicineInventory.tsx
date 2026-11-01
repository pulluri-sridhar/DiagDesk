import { useState } from 'react';

interface Medicine {
  id: string; name: string; category: string; brand: string;
  qty: number; unit: string; minQty: number;
  batchNo: string; expiryDate: string; unitPrice: number;
}

const MEDICINES: Medicine[] = [
  { id: 'M001', name: 'Metformin 500mg', category: 'Antidiabetic', brand: 'Glucophage', qty: 450, unit: 'tablets', minQty: 100, batchNo: 'BT-2024-001', expiryDate: '2026-03-31', unitPrice: 2.5 },
  { id: 'M002', name: 'Atorvastatin 10mg', category: 'Cardiovascular', brand: 'Lipitor', qty: 38, unit: 'tablets', minQty: 50, batchNo: 'BT-2024-002', expiryDate: '2026-06-30', unitPrice: 5.0 },
  { id: 'M003', name: 'Amlodipine 5mg', category: 'Cardiovascular', brand: 'Norvasc', qty: 210, unit: 'tablets', minQty: 60, batchNo: 'BT-2024-003', expiryDate: '2026-09-30', unitPrice: 3.0 },
  { id: 'M004', name: 'Salbutamol Inhaler', category: 'Respiratory', brand: 'Ventolin', qty: 12, unit: 'pcs', minQty: 20, batchNo: 'BT-2024-004', expiryDate: '2025-12-31', unitPrice: 180 },
  { id: 'M005', name: 'Montelukast 10mg', category: 'Respiratory', brand: 'Singulair', qty: 90, unit: 'tablets', minQty: 30, batchNo: 'BT-2024-005', expiryDate: '2026-05-31', unitPrice: 8.0 },
  { id: 'M006', name: 'Levothyroxine 50mcg', category: 'Thyroid', brand: 'Eltroxin', qty: 5, unit: 'tablets', minQty: 30, batchNo: 'BT-2024-006', expiryDate: '2026-01-31', unitPrice: 4.5 },
  { id: 'M007', name: 'Pantoprazole 40mg', category: 'Gastrointestinal', brand: 'Pantocid', qty: 300, unit: 'tablets', minQty: 60, batchNo: 'BT-2024-007', expiryDate: '2027-02-28', unitPrice: 6.0 },
  { id: 'M008', name: 'Diclofenac 50mg', category: 'Pain Relief', brand: 'Voveran', qty: 0, unit: 'tablets', minQty: 40, batchNo: 'BT-2024-008', expiryDate: '2026-04-30', unitPrice: 3.5 },
  { id: 'M009', name: 'Aspirin 75mg', category: 'Cardiovascular', brand: 'Ecosprin', qty: 500, unit: 'tablets', minQty: 100, batchNo: 'BT-2024-009', expiryDate: '2026-11-30', unitPrice: 1.5 },
  { id: 'M010', name: 'Amoxicillin 500mg', category: 'Antibiotic', brand: 'Mox', qty: 22, unit: 'capsules', minQty: 50, batchNo: 'BT-2024-010', expiryDate: '2025-11-30', unitPrice: 7.0 },
];

const CATEGORIES = ['All', ...Array.from(new Set(MEDICINES.map(m => m.category)))];

export default function MedicineInventory() {
  const [medicines, setMedicines] = useState(MEDICINES);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState('');

  const filtered = medicines.filter(m =>
    (category === 'All' || m.category === category) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || m.brand.toLowerCase().includes(search.toLowerCase()))
  );

  const lowStock = medicines.filter(m => m.qty > 0 && m.qty <= m.minQty).length;
  const outOfStock = medicines.filter(m => m.qty === 0).length;
  const expiringSoon = medicines.filter(m => {
    const days = (new Date(m.expiryDate).getTime() - Date.now()) / 86400000;
    return days < 60;
  }).length;

  function getStockStatus(m: Medicine) {
    if (m.qty === 0) return { label: 'Out of Stock', color: '#EF4444', bg: '#FEF2F2' };
    if (m.qty <= m.minQty) return { label: 'Low Stock', color: '#D97706', bg: '#FEF3C7' };
    return { label: 'In Stock', color: '#17A077', bg: '#D1FAE5' };
  }

  function isExpiringSoon(expiryDate: string) {
    return (new Date(expiryDate).getTime() - Date.now()) / 86400000 < 60;
  }

  function handleRestock() {
    if (!restockId || !restockQty) return;
    const qty = parseInt(restockQty);
    if (isNaN(qty) || qty <= 0) return;
    setMedicines(prev => prev.map(m => m.id === restockId ? { ...m, qty: m.qty + qty } : m));
    setRestockId(null);
    setRestockQty('');
  }

  return (
    <div>
      {/* Alerts */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: 'warning', label: 'Low Stock', value: lowStock, color: '#D97706', bg: '#FEF3C7' },
          { icon: 'block', label: 'Out of Stock', value: outOfStock, color: '#EF4444', bg: '#FEF2F2' },
          { icon: 'schedule', label: 'Expiring < 60 days', value: expiringSoon, color: '#7C3AED', bg: '#EDE9FE' },
        ].map(a => (
          <div key={a.label} className="flex items-center gap-3 p-3 rounded-2xl border"
            style={{ background: a.bg, borderColor: `${a.color}30` }}>
            <span className="material-symbols-outlined text-[22px]" style={{ color: a.color }}>{a.icon}</span>
            <div>
              <p className="text-[20px] font-black leading-none" style={{ color: a.color }}>{a.value}</p>
              <p className="text-[10px] font-semibold mt-0.5" style={{ color: a.color }}>{a.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[16px]">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search medicine or brand…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-100 bg-white text-[12px] text-gray-900 outline-none" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-100 bg-white text-[12px] text-gray-700 outline-none">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {['Medicine', 'Category', 'Stock', 'Batch / Expiry', 'Price', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[9px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const st = getStockStatus(m);
              const expiring = isExpiringSoon(m.expiryDate);
              return (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[12px] font-bold text-gray-900">{m.name}</p>
                    <p className="text-[10px] text-gray-400">{m.brand}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-gray-100 text-gray-600">{m.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-black text-gray-900">{m.qty} <span className="text-[10px] font-normal text-gray-400">{m.unit}</span></p>
                    <p className="text-[9px] text-gray-400">Min: {m.minQty}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[10px] text-gray-600">{m.batchNo}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${expiring ? 'text-red-500' : 'text-gray-400'}`}>
                      {expiring && '⚠ '}Exp: {new Date(m.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[12px] font-bold text-gray-900">₹{m.unitPrice}</p>
                    <p className="text-[9px] text-gray-400">per {m.unit.replace('s', '')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    {restockId === m.id ? (
                      <div className="flex items-center gap-1.5">
                        <input type="number" value={restockQty} onChange={e => setRestockQty(e.target.value)}
                          placeholder="Qty" className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-[11px] outline-none" />
                        <button onClick={handleRestock} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white" style={{ background: '#17A077' }}>Add</button>
                        <button onClick={() => setRestockId(null)} className="text-gray-400"><span className="material-symbols-outlined text-[14px]">close</span></button>
                      </div>
                    ) : (
                      <button onClick={() => { setRestockId(m.id); setRestockQty(''); }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white"
                        style={{ background: '#0891B2' }}>
                        + Restock
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
