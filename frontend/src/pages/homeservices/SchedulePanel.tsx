import { useState } from 'react';

type VisitStatus = 'assigned' | 'en_route' | 'in_service' | 'completed' | 'requested';

interface ScheduledSlot {
  id: string; patientName: string; serviceType: string; serviceColor: string;
  professional: string; date: string; time: string; duration: number; status: VisitStatus;
  notes: string;
}

const PROFESSIONALS = [
  'Dr. Anita Sharma',
  'Dr. Kavitha Rao',
  'Ravi Kumar',
  'Nurse Priya Nair',
  'Nurse Deepa Menon',
  'Nurse Meena Das',
];

const STATUS_COLORS: Record<VisitStatus, string> = {
  requested:  '#6B7280',
  assigned:   '#0891B2',
  en_route:   '#D97706',
  in_service: '#17A077',
  completed:  '#059669',
};

function getWeekStart(d: Date): Date {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
}

function getWeekDates(start: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function buildSchedule(): ScheduledSlot[] {
  const today     = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrow  = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const day2      = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
  return [
    { id: 'SC-001', patientName: 'Rajesh Kumar',   serviceType: 'Blood Work',     serviceColor: '#EF4444', professional: 'Ravi Kumar',        date: today,     time: '09:00', duration: 30,  status: 'in_service', notes: 'Fasting CBC + lipid panel' },
    { id: 'SC-002', patientName: 'Meera Iyer',     serviceType: 'Physiotherapy',  serviceColor: '#7C3AED', professional: 'Dr. Kavitha Rao',   date: today,     time: '10:00', duration: 60,  status: 'en_route',   notes: 'Session 3 of 10' },
    { id: 'SC-003', patientName: 'Vikram Sharma',  serviceType: 'Elder Care',     serviceColor: '#059669', professional: 'Nurse Meena Das',   date: today,     time: '08:00', duration: 120, status: 'completed',  notes: 'Daily routine' },
    { id: 'SC-004', patientName: 'Arjun Reddy',    serviceType: 'Wound Dressing', serviceColor: '#0891B2', professional: 'Nurse Priya Nair',  date: today,     time: '14:00', duration: 30,  status: 'assigned',   notes: 'Post-appendectomy' },
    { id: 'SC-005', patientName: 'Sunita Verma',   serviceType: 'Doctor Visit',   serviceColor: '#17A077', professional: 'Dr. Anita Sharma',  date: today,     time: '16:00', duration: 45,  status: 'requested',  notes: 'Hypertension follow-up' },
    { id: 'SC-006', patientName: 'Kavitha Rao',    serviceType: 'IV Infusion',    serviceColor: '#D97706', professional: 'Nurse Deepa Menon', date: yesterday, time: '11:00', duration: 60,  status: 'completed',  notes: 'IV antibiotic Day 3' },
    { id: 'SC-007', patientName: 'Preethi Nair',   serviceType: 'Doctor Visit',   serviceColor: '#17A077', professional: 'Dr. Anita Sharma',  date: tomorrow,  time: '10:00', duration: 30,  status: 'assigned',   notes: 'Post-C-section check' },
    { id: 'SC-008', patientName: 'Meera Iyer',     serviceType: 'Physiotherapy',  serviceColor: '#7C3AED', professional: 'Dr. Kavitha Rao',   date: tomorrow,  time: '10:00', duration: 60,  status: 'assigned',   notes: 'Session 4 of 10' },
    { id: 'SC-009', patientName: 'Rajesh Kumar',   serviceType: 'Blood Work',     serviceColor: '#EF4444', professional: 'Ravi Kumar',        date: day2,      time: '09:00', duration: 20,  status: 'assigned',   notes: 'Follow-up HbA1c' },
    { id: 'SC-010', patientName: 'Kavitha Rao',    serviceType: 'IV Infusion',    serviceColor: '#D97706', professional: 'Nurse Deepa Menon', date: today,     time: '11:00', duration: 60,  status: 'assigned',   notes: 'Day 4 of 7' },
  ];
}

function fmtShortDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function fmtDayLabel(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
}

interface BookForm {
  patient: string; service: string; professional: string; date: string; time: string; notes: string;
}

export default function SchedulePanel() {
  const [weekStart, setWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [schedule]  = useState<ScheduledSlot[]>(buildSchedule());
  const [selected, setSelected] = useState<ScheduledSlot | null>(null);
  const [showBook, setShowBook] = useState(false);
  const [bookForm, setBookForm] = useState<BookForm>({
    patient: '', service: '', professional: PROFESSIONALS[0],
    date: new Date().toISOString().split('T')[0], time: '09:00', notes: '',
  });

  const today     = new Date().toISOString().split('T')[0];
  const weekDates = getWeekDates(weekStart);

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const goToday  = () => setWeekStart(getWeekStart(new Date()));

  const slotsForProDay = (pro: string, date: string) =>
    schedule.filter(s => s.professional === pro && s.date === date);

  const dayTotal = (date: string) => schedule.filter(s => s.date === date).length;

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevWeek}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined text-[18px] text-gray-600">chevron_left</span>
          </button>
          <div className="text-center">
            <p className="text-[14px] font-black text-gray-900">
              {fmtShortDate(weekDates[0])} – {fmtShortDate(weekDates[6])}
            </p>
            <p className="text-[10px] text-gray-400">Weekly Visit Schedule</p>
          </div>
          <button onClick={nextWeek}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined text-[18px] text-gray-600">chevron_right</span>
          </button>
          <button onClick={goToday}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors">
            Today
          </button>
        </div>
        <button onClick={() => setShowBook(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[12px] font-bold"
          style={{ background: '#D97706', boxShadow: '0 4px 12px rgba(217,119,6,0.25)' }}>
          <span className="material-symbols-outlined text-[15px]">add</span>
          Schedule Visit
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        {/* Day header row */}
        <div className="grid border-b border-gray-100 bg-gray-50" style={{ gridTemplateColumns: '160px repeat(7, 1fr)' }}>
          <div className="py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Professional</div>
          {weekDates.map(d => {
            const isToday = d === today;
            const total = dayTotal(d);
            return (
              <div key={d} className={`py-3 px-2 text-center border-l border-gray-100 ${isToday ? 'bg-amber-50' : ''}`}>
                <p className={`text-[9px] uppercase tracking-wider font-bold ${isToday ? 'text-amber-600' : 'text-gray-400'}`}>
                  {fmtDayLabel(d)}
                </p>
                <p className={`text-[16px] font-black mt-0.5 ${isToday ? 'text-amber-700' : 'text-gray-900'}`}>
                  {new Date(d + 'T00:00:00').getDate()}
                </p>
                {total > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isToday ? 'bg-amber-200 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>
                    {total} visit{total > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Professional rows */}
        {PROFESSIONALS.map((pro, pi) => (
          <div key={pro} className={`grid min-h-[72px] border-b border-gray-50 last:border-0 ${pi % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
            style={{ gridTemplateColumns: '160px repeat(7, 1fr)' }}>

            <div className="py-3 px-4 flex items-center gap-2 border-r border-gray-50">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[9px] font-black flex-shrink-0"
                style={{ background: '#D97706' }}>
                {pro.split(' ').filter(Boolean).map(w => w[0]).join('').slice(-2).toUpperCase()}
              </div>
              <p className="text-[10px] font-bold text-gray-900 leading-tight">
                {pro.replace('Nurse ', '').replace('Dr. ', 'Dr ')}
              </p>
            </div>

            {weekDates.map(d => {
              const slots = slotsForProDay(pro, d);
              const isToday = d === today;
              return (
                <div key={d} className={`py-2 px-1.5 border-l border-gray-100 ${isToday ? 'bg-amber-50/30' : ''}`}>
                  <div className="space-y-1">
                    {slots.map(v => (
                      <button key={v.id}
                        onClick={() => setSelected(v)}
                        className="w-full text-left px-1.5 py-1 rounded-lg text-[9px] font-bold transition-all hover:opacity-80 leading-tight"
                        style={{ background: v.serviceColor + '18', color: v.serviceColor, border: `1px solid ${v.serviceColor}35` }}>
                        <span className="block truncate">{v.time.replace(':00', '')}  {v.patientName.split(' ')[0]}</span>
                        <span className="block truncate font-normal opacity-80">{v.serviceType}</span>
                      </button>
                    ))}
                    {slots.length === 0 && d >= today && (
                      <div className="w-full h-8 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-[8px] text-gray-300">
                        free
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Visit detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black"
                  style={{ background: selected.serviceColor }}>
                  {selected.serviceType[0]}
                </div>
                <h3 className="text-[15px] font-black text-gray-900">{selected.serviceType}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-0 divide-y divide-gray-50">
              {[
                ['Patient',      selected.patientName],
                ['Professional', selected.professional],
                ['Date & Time',  `${fmtShortDate(selected.date)} at ${selected.time}`],
                ['Duration',     `${selected.duration} min`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between py-2.5 text-[12px]">
                  <span className="text-gray-400">{label}</span>
                  <span className="font-bold text-gray-900">{val}</span>
                </div>
              ))}
              <div className="flex justify-between py-2.5 text-[12px]">
                <span className="text-gray-400">Status</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold capitalize"
                  style={{ background: STATUS_COLORS[selected.status] + '20', color: STATUS_COLORS[selected.status] }}>
                  {selected.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {selected.notes && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-[11px] text-amber-700">{selected.notes}</p>
              </div>
            )}

            <button onClick={() => setSelected(null)}
              className="w-full mt-4 py-2.5 rounded-xl text-white font-bold text-[13px]"
              style={{ background: '#D97706' }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Book visit modal */}
      {showBook && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-black text-gray-900">Schedule New Visit</h3>
              <button onClick={() => setShowBook(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Patient Name</label>
                <input value={bookForm.patient} onChange={e => setBookForm(f => ({ ...f, patient: e.target.value }))}
                  placeholder="e.g. Meera Iyer"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none focus:border-[#D97706] focus:bg-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Service Type</label>
                <input value={bookForm.service} onChange={e => setBookForm(f => ({ ...f, service: e.target.value }))}
                  placeholder="e.g. Physiotherapy"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none focus:border-[#D97706] focus:bg-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Assign to Professional</label>
                <select value={bookForm.professional} onChange={e => setBookForm(f => ({ ...f, professional: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none">
                  {PROFESSIONALS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Date</label>
                  <input type="date" value={bookForm.date} onChange={e => setBookForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Time</label>
                  <input type="time" value={bookForm.time} onChange={e => setBookForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Notes</label>
                <textarea value={bookForm.notes} onChange={e => setBookForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special instructions or clinical notes…"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none resize-none h-16 focus:border-[#D97706] focus:bg-white" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowBook(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={() => setShowBook(false)}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold"
                style={{ background: '#D97706', boxShadow: '0 4px 12px rgba(217,119,6,0.25)' }}>
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
