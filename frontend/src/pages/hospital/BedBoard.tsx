import { useState } from 'react';
import Sidebar from '../../components/Sidebar';

// ── Types ────────────────────────────────────────────────────────────────────

type BedStatus = 'available' | 'occupied' | 'maintenance';

interface BedCategory { id: string; name: string; color: string; dailyRate: number; }
interface Bed { id: string; number: string; categoryId: string; status: BedStatus; }
interface Admission {
  id: string; patientName: string; patientId: string; phone: string; age: number; sex: 'M' | 'F';
  bedId: string; doctorName: string; diagnosis: string; admittedAt: string; dischargedAt?: string;
  notes: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────

const CATEGORIES: BedCategory[] = [
  { id: 'c1', name: 'General Ward',  color: '#17A077', dailyRate: 800  },
  { id: 'c2', name: 'Private Room',  color: '#0891B2', dailyRate: 2500 },
  { id: 'c3', name: 'ICU',           color: '#DC2626', dailyRate: 6000 },
  { id: 'c4', name: 'Semi-Private',  color: '#D97706', dailyRate: 1500 },
];

const INITIAL_BEDS: Bed[] = [
  { id: 'b1',  number: 'G-01', categoryId: 'c1', status: 'occupied'    },
  { id: 'b2',  number: 'G-02', categoryId: 'c1', status: 'available'   },
  { id: 'b3',  number: 'G-03', categoryId: 'c1', status: 'occupied'    },
  { id: 'b4',  number: 'G-04', categoryId: 'c1', status: 'available'   },
  { id: 'b5',  number: 'G-05', categoryId: 'c1', status: 'maintenance' },
  { id: 'b6',  number: 'G-06', categoryId: 'c1', status: 'available'   },
  { id: 'b7',  number: 'P-01', categoryId: 'c2', status: 'occupied'    },
  { id: 'b8',  number: 'P-02', categoryId: 'c2', status: 'available'   },
  { id: 'b9',  number: 'P-03', categoryId: 'c2', status: 'available'   },
  { id: 'b10', number: 'I-01', categoryId: 'c3', status: 'occupied'    },
  { id: 'b11', number: 'I-02', categoryId: 'c3', status: 'occupied'    },
  { id: 'b12', number: 'I-03', categoryId: 'c3', status: 'available'   },
  { id: 'b13', number: 'S-01', categoryId: 'c4', status: 'available'   },
  { id: 'b14', number: 'S-02', categoryId: 'c4', status: 'occupied'    },
  { id: 'b15', number: 'S-03', categoryId: 'c4', status: 'available'   },
];

const INITIAL_ADMISSIONS: Admission[] = [
  { id: 'a1', patientName: 'Sridhar Rao', patientId: 'DD-00321', phone: '+91 99887 76655', age: 55, sex: 'M', bedId: 'b1', doctorName: 'Dr. Ravi Prasad', diagnosis: 'Hypertensive crisis', admittedAt: new Date(Date.now() - 2 * 86400000).toISOString(), notes: 'BP monitoring every 4 hours' },
  { id: 'a2', patientName: 'Lakshmi Devi', patientId: 'DD-00654', phone: '+91 77665 54433', age: 68, sex: 'F', bedId: 'b3', doctorName: 'Dr. Anita Sharma', diagnosis: 'Type 2 DM with complication', admittedAt: new Date(Date.now() - 4 * 86400000).toISOString(), notes: 'Insulin drip, glucose 2-hourly' },
  { id: 'a3', patientName: 'Arjun Mehta', patientId: 'DD-00987', phone: '+91 88776 65544', age: 42, sex: 'M', bedId: 'b7', doctorName: 'Dr. Meena Joshi', diagnosis: 'Post-op appendectomy', admittedAt: new Date(Date.now() - 86400000).toISOString(), notes: 'Wound care daily, mobilise tomorrow' },
  { id: 'a4', patientName: 'Rekha Sharma', patientId: 'DD-01234', phone: '+91 91234 56789', age: 35, sex: 'F', bedId: 'b10', doctorName: 'Dr. Suresh Mehta', diagnosis: 'Sepsis — post-CABG', admittedAt: new Date(Date.now() - 3 * 86400000).toISOString(), notes: 'Vasopressors — ICU care' },
  { id: 'a5', patientName: 'Mohan Das', patientId: 'DD-01567', phone: '+91 98765 43210', age: 71, sex: 'M', bedId: 'b11', doctorName: 'Dr. Suresh Mehta', diagnosis: 'COPD exacerbation', admittedAt: new Date(Date.now() - 86400000).toISOString(), notes: 'NIV support, nebulisation 6-hourly' },
  { id: 'a6', patientName: 'Sunita Rao', patientId: 'DD-01890', phone: '+91 77665 44332', age: 29, sex: 'F', bedId: 'b14', doctorName: 'Dr. Anita Sharma', diagnosis: 'Dengue fever', admittedAt: new Date(Date.now() - 2 * 86400000).toISOString(), notes: 'Platelet monitoring 12-hourly' },
];

const DOCTORS = ['Dr. Anita Sharma', 'Dr. Ravi Prasad', 'Dr. Meena Joshi', 'Dr. Suresh Mehta'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function losLabel(admittedAt: string) {
  const days = Math.floor((Date.now() - new Date(admittedAt).getTime()) / 86400000);
  return days === 0 ? 'Today' : `${days}d`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Admit Modal ───────────────────────────────────────────────────────────────

function AdmitModal({ bed, onAdmit, onClose }: {
  bed: Bed;
  onAdmit: (a: Omit<Admission, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ patientName: '', patientId: '', phone: '', age: '', sex: 'M' as 'M' | 'F', doctorName: DOCTORS[0], diagnosis: '', notes: '' });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  function submit() {
    if (!form.patientName || !form.diagnosis) return;
    onAdmit({ patientName: form.patientName, patientId: form.patientId || `NEW-${Date.now()}`, phone: form.phone, age: parseInt(form.age) || 0, sex: form.sex, bedId: bed.id, doctorName: form.doctorName, diagnosis: form.diagnosis, admittedAt: new Date().toISOString(), notes: form.notes });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-bold text-gray-900">Admit Patient</h3>
            <p className="text-[12px] text-gray-500">Bed {bed.number}</p>
          </div>
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
            <input value={form.patientId} onChange={e => set('patientId', e.target.value)} placeholder="DD-xxxxx"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 …"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Age</label>
            <input type="number" value={form.age} onChange={e => set('age', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Sex</label>
            <select value={form.sex} onChange={e => set('sex', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30">
              <option value="M">Male</option><option value="F">Female</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Admitting Doctor</label>
            <select value={form.doctorName} onChange={e => set('doctorName', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30">
              {DOCTORS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Primary Diagnosis *</label>
            <input value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} placeholder="Admitting diagnosis"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30" />
          </div>
          <div className="col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Nursing Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Initial nursing instructions…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} className="flex-1 py-2 bg-[#17A077] text-white rounded-lg text-[13px] font-semibold hover:bg-[#0D9460]">Admit Patient</button>
        </div>
      </div>
    </div>
  );
}

// ── Discharge Modal ───────────────────────────────────────────────────────────

function DischargeModal({ admission, onDischarge, onClose }: {
  admission: Admission;
  onDischarge: (id: string, summary: string) => void;
  onClose: () => void;
}) {
  const [summary, setSummary] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-gray-900">Discharge — {admission.patientName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg text-[12px] space-y-1">
            <div><span className="text-gray-500">Diagnosis:</span> <span className="font-semibold">{admission.diagnosis}</span></div>
            <div><span className="text-gray-500">Length of stay:</span> <span className="font-semibold">{losLabel(admission.admittedAt)}</span></div>
            <div><span className="text-gray-500">Admitted:</span> <span className="font-semibold">{formatDate(admission.admittedAt)}</span></div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Discharge Summary / Instructions</label>
            <textarea rows={4} value={summary} onChange={e => setSummary(e.target.value)}
              placeholder="Follow-up instructions, medication changes, when to return…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onDischarge(admission.id, summary); onClose(); }}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[13px] font-semibold hover:bg-red-700">
            Confirm Discharge
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BedBoard() {
  const [beds, setBeds] = useState<Bed[]>(INITIAL_BEDS);
  const [admissions, setAdmissions] = useState<Admission[]>(INITIAL_ADMISSIONS);
  const [admitBed, setAdmitBed] = useState<Bed | null>(null);
  const [dischargeAdm, setDischargeAdm] = useState<Admission | null>(null);
  const [activeTab, setActiveTab] = useState<'board' | 'admissions'>('board');
  const [filterCat, setFilterCat] = useState('all');

  const activeAdmissions = admissions.filter(a => !a.dischargedAt);

  function handleAdmit(entry: Omit<Admission, 'id'>) {
    const newAdm: Admission = { ...entry, id: `a${Date.now()}` };
    setAdmissions(prev => [...prev, newAdm]);
    setBeds(prev => prev.map(b => b.id === entry.bedId ? { ...b, status: 'occupied' } : b));
  }

  function handleDischarge(id: string) {
    const adm = admissions.find(a => a.id === id);
    if (!adm) return;
    setAdmissions(prev => prev.map(a => a.id === id ? { ...a, dischargedAt: new Date().toISOString() } : a));
    setBeds(prev => prev.map(b => b.id === adm.bedId ? { ...b, status: 'available' } : b));
  }

  const stats = {
    total: beds.length,
    available: beds.filter(b => b.status === 'available').length,
    occupied: beds.filter(b => b.status === 'occupied').length,
    maintenance: beds.filter(b => b.status === 'maintenance').length,
  };

  const filteredBeds = filterCat === 'all' ? beds : beds.filter(b => b.categoryId === filterCat);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#17A077]">bed</span>
            IPD · Bed Board
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total Beds',  value: stats.total,       color: 'text-gray-700',  bg: 'bg-gray-50'   },
              { label: 'Available',   value: stats.available,   color: 'text-[#17A077]', bg: 'bg-green-50'  },
              { label: 'Occupied',    value: stats.occupied,    color: 'text-blue-600',  bg: 'bg-blue-50'   },
              { label: 'Maintenance', value: stats.maintenance, color: 'text-amber-600', bg: 'bg-amber-50'  },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3`}>
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs + filter */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setActiveTab('board')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold ${activeTab === 'board' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                Ward Board
              </button>
              <button onClick={() => setActiveTab('admissions')}
                className={`px-3 py-1.5 rounded-md text-[12px] font-semibold ${activeTab === 'admissions' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                Active Admissions ({activeAdmissions.length})
              </button>
            </div>
            {activeTab === 'board' && (
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#17A077]/30 ml-auto">
                <option value="all">All Wards</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="px-8 py-6">
          {activeTab === 'board' ? (
            <div className="space-y-6">
              {(filterCat === 'all' ? CATEGORIES : CATEGORIES.filter(c => c.id === filterCat)).map(cat => {
                const catBeds = filteredBeds.filter(b => b.categoryId === cat.id);
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="font-bold text-gray-800">{cat.name}</h2>
                      <span className="text-[12px] text-gray-400">₹{cat.dailyRate.toLocaleString()}/day</span>
                      <span className="text-[12px] text-gray-400 ml-auto">
                        {catBeds.filter(b => b.status === 'available').length}/{catBeds.length} available
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-3">
                      {catBeds.map(bed => {
                        const adm = activeAdmissions.find(a => a.bedId === bed.id);
                        return (
                          <div key={bed.id}
                            className={`rounded-xl border p-3 text-center cursor-pointer transition-all ${
                              bed.status === 'available' ? 'border-green-200 bg-green-50 hover:border-green-400' :
                              bed.status === 'occupied'  ? 'border-blue-200 bg-blue-50' :
                              'border-amber-200 bg-amber-50'
                            }`}
                            onClick={() => bed.status === 'available' && setAdmitBed(bed)}
                          >
                            <div className="font-bold text-[13px] text-gray-800 mb-1">{bed.number}</div>
                            {bed.status === 'available' && (
                              <div className="text-[10px] text-green-600 font-semibold">Available</div>
                            )}
                            {bed.status === 'occupied' && adm && (
                              <>
                                <div className="text-[10px] font-semibold text-blue-700 truncate">{adm.patientName.split(' ')[0]}</div>
                                <div className="text-[9px] text-blue-500">{losLabel(adm.admittedAt)}</div>
                              </>
                            )}
                            {bed.status === 'maintenance' && (
                              <div className="text-[10px] text-amber-600 font-semibold">Maint.</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <p className="text-[12px] text-gray-400 text-center">Click a green bed to admit a patient</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAdmissions.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <span className="material-symbols-outlined text-5xl mb-3 block">bed</span>
                  <p className="text-[14px]">No active admissions</p>
                </div>
              ) : (
                activeAdmissions.map(adm => {
                  const bed = beds.find(b => b.id === adm.bedId);
                  const cat = CATEGORIES.find(c => c.id === bed?.categoryId);
                  const los = Math.floor((Date.now() - new Date(adm.admittedAt).getTime()) / 86400000);
                  return (
                    <div key={adm.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-blue-600">bed</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-bold text-gray-900">{adm.patientName}</span>
                            <span className="text-[12px] text-gray-400">{adm.age}y/{adm.sex}</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">{bed?.number ?? '—'}</span>
                            {cat && <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: `${cat.color}20`, color: cat.color }}>{cat.name}</span>}
                          </div>
                          <div className="text-[12px] text-gray-500 mb-1">{adm.patientId} · {adm.doctorName}</div>
                          <div className="text-[13px] font-medium text-gray-700 mb-1">{adm.diagnosis}</div>
                          {adm.notes && <div className="text-[12px] text-gray-500 italic">{adm.notes}</div>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[13px] font-bold text-blue-600">{los === 0 ? 'Today' : `Day ${los + 1}`}</div>
                          <div className="text-[10px] text-gray-400">{formatDate(adm.admittedAt)}</div>
                          {cat && <div className="text-[11px] text-gray-500 mt-1">₹{(cat.dailyRate * Math.max(1, los)).toLocaleString()}</div>}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                        <button
                          onClick={() => setDischargeAdm(adm)}
                          className="flex items-center gap-1 px-4 py-1.5 rounded-lg border border-red-200 text-red-600 text-[12px] font-semibold hover:bg-red-50 ml-auto"
                        >
                          <span className="material-symbols-outlined text-[14px]">logout</span>
                          Discharge
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>

      {admitBed && <AdmitModal bed={admitBed} onAdmit={handleAdmit} onClose={() => setAdmitBed(null)} />}
      {dischargeAdm && <DischargeModal admission={dischargeAdm} onDischarge={handleDischarge} onClose={() => setDischargeAdm(null)} />}
    </div>
  );
}
