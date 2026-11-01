import { useState } from 'react';

type CarePlan = 'basic' | 'standard' | 'comprehensive';
type PatientStatus = 'active' | 'pending' | 'discharged';

interface HomePatient {
  id: string; name: string; age: number; phone: string; address: string;
  condition: string; carePlan: CarePlan; assignedPro: string;
  nextVisit: string; status: PatientStatus; notes: string;
}

interface PatientForm {
  name: string; age: string; phone: string; address: string;
  condition: string; carePlan: CarePlan; notes: string;
}

const MOCK_PATIENTS: HomePatient[] = [
  { id: 'HP-001', name: 'Meera Iyer',     age: 62, phone: '+91 98765 43210', address: '5A, Indiranagar, Bengaluru',   condition: 'Post-knee surgery rehab',        carePlan: 'comprehensive', assignedPro: 'Dr. Kavitha Rao',  nextVisit: 'Today 10:00 AM',    status: 'active',     notes: 'Session 3 of 10 physio' },
  { id: 'HP-002', name: 'Rajesh Kumar',   age: 55, phone: '+91 91234 56789', address: '12, Koramangala, Bengaluru',   condition: 'Diabetes monitoring',            carePlan: 'standard',      assignedPro: 'Ravi Kumar',       nextVisit: 'Today 09:00 AM',    status: 'active',     notes: 'Fasting blood work' },
  { id: 'HP-003', name: 'Arjun Reddy',   age: 38, phone: '+91 90000 55678', address: '8, HSR Layout, Bengaluru',     condition: 'Post-appendectomy',              carePlan: 'standard',      assignedPro: 'Nurse Priya Nair', nextVisit: 'Today 02:00 PM',    status: 'active',     notes: 'Wound dressing change' },
  { id: 'HP-004', name: 'Sunita Verma',  age: 71, phone: '+91 99001 22334', address: '22, Whitefield, Bengaluru',   condition: 'Hypertension management',        carePlan: 'basic',         assignedPro: 'Dr. Anita Sharma', nextVisit: 'Today 04:00 PM',    status: 'active',     notes: 'Follow-up consultation' },
  { id: 'HP-005', name: 'Kavitha Rao',   age: 44, phone: '+91 97654 32100', address: '3, JP Nagar, Bengaluru',      condition: 'IV antibiotic infusion',         carePlan: 'comprehensive', assignedPro: 'Nurse Deepa Menon',nextVisit: 'Tomorrow 11:00 AM', status: 'active',     notes: 'Day 4 of 7' },
  { id: 'HP-006', name: 'Vikram Sharma', age: 83, phone: '+91 98123 45678', address: '15, Jayanagar, Bengaluru',    condition: 'Elder care & daily assistance',  carePlan: 'comprehensive', assignedPro: 'Nurse Meena Das',  nextVisit: 'Today 08:00 AM',    status: 'active',     notes: 'Daily routine care' },
  { id: 'HP-007', name: 'Preethi Nair',  age: 29, phone: '+91 88777 11234', address: '7, Koramangala 4th Block',    condition: 'Post-C-section recovery',        carePlan: 'standard',      assignedPro: 'Unassigned',       nextVisit: 'Pending assignment',status: 'pending',    notes: '' },
  { id: 'HP-008', name: 'Mohan Das',     age: 67, phone: '+91 99876 54321', address: '4, Malleshwaram, Bengaluru',  condition: 'Cardiac rehabilitation',         carePlan: 'comprehensive', assignedPro: 'Dr. Anita Sharma', nextVisit: '—',                 status: 'discharged', notes: 'Completed 6-week program' },
];

const PLAN_META: Record<CarePlan, { label: string; color: string; bg: string }> = {
  basic:         { label: 'Basic',         color: '#6B7280', bg: '#F3F4F6' },
  standard:      { label: 'Standard',      color: '#0891B2', bg: '#E0F4F9' },
  comprehensive: { label: 'Comprehensive', color: '#7C3AED', bg: '#EDE9FE' },
};

const STATUS_META: Record<PatientStatus, { label: string; color: string; bg: string; icon: string }> = {
  active:     { label: 'Active',     color: '#17A077', bg: '#D1FAE5', icon: 'check_circle'  },
  pending:    { label: 'Pending',    color: '#D97706', bg: '#FEF3C7', icon: 'pending'       },
  discharged: { label: 'Discharged', color: '#6B7280', bg: '#F3F4F6', icon: 'task_alt'     },
};

const BLANK: PatientForm = { name: '', age: '', phone: '', address: '', condition: '', carePlan: 'standard', notes: '' };

export default function PatientsPanel() {
  const [patients, setPatients] = useState<HomePatient[]>(MOCK_PATIENTS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PatientStatus | 'all'>('all');
  const [filterPlan, setFilterPlan]     = useState<CarePlan | 'all'>('all');
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [form, setForm]                 = useState<PatientForm>(BLANK);

  const counts = {
    active:     patients.filter(p => p.status === 'active').length,
    pending:    patients.filter(p => p.status === 'pending').length,
    discharged: patients.filter(p => p.status === 'discharged').length,
  };

  const filtered = patients.filter(p => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search);
    const mst = filterStatus === 'all' || p.status === filterStatus;
    const mp  = filterPlan   === 'all' || p.carePlan === filterPlan;
    return ms && mst && mp;
  });

  function addPatient() {
    if (!form.name.trim() || !form.phone.trim()) return;
    const p: HomePatient = {
      id: `HP-${String(patients.length + 1).padStart(3, '0')}`,
      name: form.name.trim(), age: parseInt(form.age) || 0,
      phone: form.phone.trim(), address: form.address.trim(),
      condition: form.condition.trim(), carePlan: form.carePlan,
      assignedPro: 'Unassigned', nextVisit: 'Pending assignment',
      status: 'pending', notes: form.notes.trim(),
    };
    setPatients(prev => [p, ...prev]);
    setForm(BLANK); setShowAdd(false);
  }

  function discharge(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status: 'discharged' } : p));
  }

  const initials = (name: string) =>
    name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {([
          ['active',     'Active Patients',    'groups',          '#17A077', '#D1FAE5'],
          ['pending',    'Pending Assignment', 'pending_actions', '#D97706', '#FEF3C7'],
          ['discharged', 'Discharged',         'task_alt',        '#6B7280', '#F3F4F6'],
        ] as const).map(([key, label, icon, color, bg]) => (
          <div key={key} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color }}>{icon}</span>
            </div>
            <div>
              <p className="text-[24px] font-black text-gray-900 leading-none">{counts[key]}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-gray-400">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-[12px] outline-none focus:border-[#D97706]" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12px] font-bold text-gray-700 outline-none">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="discharged">Discharged</option>
        </select>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12px] font-bold text-gray-700 outline-none">
          <option value="all">All Care Plans</option>
          <option value="basic">Basic</option>
          <option value="standard">Standard</option>
          <option value="comprehensive">Comprehensive</option>
        </select>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[12px] font-bold"
          style={{ background: '#D97706', boxShadow: '0 4px 12px rgba(217,119,6,0.25)' }}>
          <span className="material-symbols-outlined text-[15px]">person_add</span>
          Register Patient
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Patient', 'Age', 'Condition', 'Care Plan', 'Assigned Professional', 'Next Visit', 'Status', ''].map(h => (
                <th key={h} className="text-left py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const plan = PLAN_META[p.carePlan];
              const st   = STATUS_META[p.status];
              const open = expandedId === p.id;
              return (
                <>
                  <tr className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(open ? null : p.id)}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-black flex-shrink-0"
                          style={{ background: '#D97706' }}>
                          {initials(p.name)}
                        </div>
                        <div>
                          <p className="text-[12px] font-bold text-gray-900">{p.name}</p>
                          <p className="text-[10px] text-gray-400">{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[12px] text-gray-700">{p.age}y</td>
                    <td className="py-3 px-4 text-[12px] text-gray-700 max-w-[150px]">
                      <p className="truncate">{p.condition}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                        style={{ background: plan.bg, color: plan.color }}>{plan.label}</span>
                    </td>
                    <td className="py-3 px-4 text-[12px] text-gray-700 whitespace-nowrap">{p.assignedPro}</td>
                    <td className="py-3 px-4 text-[11px] text-gray-500 whitespace-nowrap">{p.nextVisit}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 w-fit"
                        style={{ background: st.bg, color: st.color }}>
                        <span className="material-symbols-outlined text-[10px]">{st.icon}</span>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="material-symbols-outlined text-[18px] text-gray-400 block transition-transform"
                        style={{ transform: open ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-amber-50/30 border-b border-amber-100/50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-3 gap-4 text-[11px] mb-3">
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Phone</p>
                            <p className="font-bold text-gray-800">{p.phone}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Address</p>
                            <p className="font-bold text-gray-800">{p.address}</p>
                          </div>
                          {p.notes && (
                            <div className="col-span-3">
                              <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Clinical Notes</p>
                              <p className="text-gray-700 bg-white px-3 py-2 rounded-lg border border-amber-100">{p.notes}</p>
                            </div>
                          )}
                        </div>
                        {p.status !== 'discharged' && (
                          <div className="flex gap-2">
                            <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#D97706] text-[#D97706] hover:bg-amber-50">
                              Edit Patient
                            </button>
                            <button onClick={e => discharge(p.id, e)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 text-gray-500 hover:bg-gray-50">
                              Mark Discharged
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <span className="material-symbols-outlined text-[40px] block mb-2">group_off</span>
            <p className="text-[13px]">No patients match your filters</p>
          </div>
        )}
      </div>

      {/* Register Patient Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-black text-gray-900">Register New Patient</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3">
              {([
                ['name',      'Full Name',         'text',   'e.g. Sridhar Rao'],
                ['age',       'Age',               'number', 'e.g. 65'],
                ['phone',     'Phone',             'tel',    '+91 98765 43210'],
                ['address',   'Address',           'text',   'House no, Area, City'],
                ['condition', 'Medical Condition', 'text',   'e.g. Post-surgery rehab'],
              ] as const).map(([field, label, type, ph]) => (
                <div key={field}>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">{label}</label>
                  <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                    placeholder={ph}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none focus:border-[#D97706] focus:bg-white" />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Care Plan</label>
                <select value={form.carePlan} onChange={e => setForm(f => ({ ...f, carePlan: e.target.value as CarePlan }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none">
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="comprehensive">Comprehensive</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Clinical Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any relevant clinical notes or special instructions…"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none resize-none h-20 focus:border-[#D97706] focus:bg-white" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={addPatient}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold"
                style={{ background: '#D97706', boxShadow: '0 4px 12px rgba(217,119,6,0.25)' }}>
                Register Patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
