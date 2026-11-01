import { useState } from 'react';

type StaffRole = 'Doctor' | 'Nurse' | 'Phlebotomist' | 'Physiotherapist' | 'Geriatric Nurse';
type StaffAvailability = 'available' | 'on_visit' | 'off_duty';

interface HomeStaff {
  id: string; name: string; role: StaffRole; specialty: string;
  phone: string; experience: number; availability: StaffAvailability;
  currentPatient: string | null; todayVisits: number; totalVisits: number;
  rating: number; certifications: string[];
}

const MOCK_STAFF: HomeStaff[] = [
  {
    id: 'HS-001', name: 'Dr. Anita Sharma', role: 'Doctor', specialty: 'General Medicine & Hypertension',
    phone: '+91 98765 11111', experience: 12, availability: 'available', currentPatient: null,
    todayVisits: 2, totalVisits: 147, rating: 4.8,
    certifications: ['MBBS', 'MD Internal Medicine', 'BLS Certified'],
  },
  {
    id: 'HS-002', name: 'Dr. Kavitha Rao', role: 'Physiotherapist', specialty: 'Orthopedic Rehabilitation',
    phone: '+91 98765 22222', experience: 8, availability: 'on_visit', currentPatient: 'Meera Iyer',
    todayVisits: 3, totalVisits: 334, rating: 4.9,
    certifications: ['BPT', 'MPT Orthopedics', 'Manual Therapy Certified'],
  },
  {
    id: 'HS-003', name: 'Ravi Kumar', role: 'Phlebotomist', specialty: 'Blood Collection & IV Cannulation',
    phone: '+91 98765 33333', experience: 5, availability: 'on_visit', currentPatient: 'Rajesh Kumar',
    todayVisits: 4, totalVisits: 489, rating: 4.7,
    certifications: ['DMLT', 'Phlebotomy Certification', 'Infection Control'],
  },
  {
    id: 'HS-004', name: 'Nurse Priya Nair', role: 'Nurse', specialty: 'Wound Care & Post-operative',
    phone: '+91 98765 44444', experience: 9, availability: 'available', currentPatient: null,
    todayVisits: 2, totalVisits: 298, rating: 4.6,
    certifications: ['BSc Nursing', 'Wound Care Specialist', 'BLS/ACLS'],
  },
  {
    id: 'HS-005', name: 'Nurse Deepa Menon', role: 'Nurse', specialty: 'IV Therapy & Infusion Management',
    phone: '+91 98765 55555', experience: 7, availability: 'available', currentPatient: null,
    todayVisits: 1, totalVisits: 256, rating: 4.8,
    certifications: ['BSc Nursing', 'IV Therapy Specialist', 'Oncology Nursing'],
  },
  {
    id: 'HS-006', name: 'Nurse Meena Das', role: 'Geriatric Nurse', specialty: 'Elder Care & Palliative Support',
    phone: '+91 98765 66666', experience: 15, availability: 'on_visit', currentPatient: 'Vikram Sharma',
    todayVisits: 1, totalVisits: 512, rating: 4.9,
    certifications: ['BSc Nursing', 'Geriatric Care Certification', 'Palliative Care'],
  },
];

const AVAIL_META: Record<StaffAvailability, { label: string; color: string; bg: string; icon: string }> = {
  available: { label: 'Available', color: '#17A077', bg: '#D1FAE5', icon: 'check_circle' },
  on_visit:  { label: 'On Visit',  color: '#D97706', bg: '#FEF3C7', icon: 'directions_car' },
  off_duty:  { label: 'Off Duty',  color: '#6B7280', bg: '#F3F4F6', icon: 'nights_stay' },
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function StaffPanel() {
  const [staff] = useState<HomeStaff[]>(MOCK_STAFF);
  const [filterRole, setFilterRole]     = useState<StaffRole | 'all'>('all');
  const [filterAvail, setFilterAvail]   = useState<StaffAvailability | 'all'>('all');
  const [search, setSearch]             = useState('');
  const [expandedId, setExpandedId]     = useState<string | null>(null);

  const roles = [...new Set(staff.map(s => s.role))];

  const filtered = staff.filter(s => {
    const mr = filterRole  === 'all' || s.role === filterRole;
    const ma = filterAvail === 'all' || s.availability === filterAvail;
    const ms = !search || s.name.toLowerCase().includes(search.toLowerCase())
                       || s.specialty.toLowerCase().includes(search.toLowerCase());
    return mr && ma && ms;
  });

  const counts = {
    total:     staff.length,
    available: staff.filter(s => s.availability === 'available').length,
    on_visit:  staff.filter(s => s.availability === 'on_visit').length,
    off_duty:  staff.filter(s => s.availability === 'off_duty').length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {([
          ['Total Staff', String(counts.total),     'groups',         '#D97706', '#FEF3C7'],
          ['Available',   String(counts.available), 'check_circle',   '#17A077', '#D1FAE5'],
          ['On Visit',    String(counts.on_visit),  'directions_car', '#0891B2', '#E0F4F9'],
          ['Off Duty',    String(counts.off_duty),  'nights_stay',    '#6B7280', '#F3F4F6'],
        ] as const).map(([label, value, icon, color, bg]) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color }}>{icon}</span>
            </div>
            <div>
              <p className="text-[24px] font-black text-gray-900 leading-none">{value}</p>
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
            placeholder="Search by name or specialty…"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-[12px] outline-none focus:border-[#D97706]" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12px] font-bold text-gray-700 outline-none">
          <option value="all">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filterAvail} onChange={e => setFilterAvail(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-[12px] font-bold text-gray-700 outline-none">
          <option value="all">All Availability</option>
          <option value="available">Available</option>
          <option value="on_visit">On Visit</option>
          <option value="off_duty">Off Duty</option>
        </select>
      </div>

      {/* Staff grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(s => {
          const avail = AVAIL_META[s.availability];
          const open  = expandedId === s.id;
          return (
            <div key={s.id}
              className="bg-white rounded-2xl border-2 border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer"
              onClick={() => setExpandedId(open ? null : s.id)}>

              {/* Header row */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[14px] font-black flex-shrink-0"
                  style={{ background: '#D97706' }}>
                  {initials(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-black text-gray-900 truncate">{s.name}</p>
                      <p className="text-[10px] text-gray-500">{s.role} · {s.experience}y exp</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-0.5 flex-shrink-0"
                      style={{ background: avail.bg, color: avail.color }}>
                      <span className="material-symbols-outlined text-[10px]">{avail.icon}</span>
                      {avail.label}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 mb-3 leading-snug">{s.specialty}</p>

              {s.currentPatient && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-100 mb-3">
                  <span className="material-symbols-outlined text-[13px] text-amber-600">person</span>
                  <p className="text-[11px] text-amber-700 font-semibold truncate">With {s.currentPatient}</p>
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                {[
                  ['Today', `${s.todayVisits} visits`],
                  ['Total', `${s.totalVisits}`],
                  ['Rating', `${s.rating}★`],
                ].map(([lbl, val]) => (
                  <div key={lbl} className="text-center">
                    <p className="text-[12px] font-black text-gray-900">{val}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide">{lbl}</p>
                  </div>
                ))}
              </div>

              {/* Expandable section */}
              {open && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3" onClick={e => e.stopPropagation()}>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Contact</p>
                    <p className="text-[12px] font-bold text-gray-900">{s.phone}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1.5">Certifications</p>
                    <div className="flex flex-wrap gap-1">
                      {s.certifications.map(c => (
                        <span key={c} className="px-2 py-0.5 rounded-full bg-amber-50 text-[10px] font-semibold text-amber-700 border border-amber-100">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 rounded-lg text-[11px] font-bold border border-[#D97706] text-[#D97706] hover:bg-amber-50">
                      View Schedule
                    </button>
                    <button className="flex-1 py-1.5 rounded-lg text-[11px] font-bold border border-gray-200 text-gray-500 hover:bg-gray-50">
                      Edit Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-[40px] block mb-2">manage_accounts</span>
          <p className="text-[13px]">No staff match your filters</p>
        </div>
      )}
    </div>
  );
}
