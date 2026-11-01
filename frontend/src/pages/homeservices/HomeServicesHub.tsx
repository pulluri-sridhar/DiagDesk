import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import PatientsPanel      from './PatientsPanel';
import StaffPanel         from './StaffPanel';
import SchedulePanel      from './SchedulePanel';
import CareRequestsPanel  from './CareRequestsPanel';

// ── Types ─────────────────────────────────────────────────────────────────────

type VisitStatus = 'requested' | 'assigned' | 'en_route' | 'arrived' | 'in_service' | 'completed' | 'cancelled';
type Tab = 'overview' | 'active' | 'all' | 'catalog' | 'patients' | 'staff' | 'schedule' | 'requests';

interface ServiceType {
  id: string; name: string; category: string;
  icon: string; estimatedDuration: number; description: string;
  color: string; bg: string;
}

interface HomeVisit {
  id: string; patientName: string; patientPhone: string; patientAddress: string;
  serviceId: string; professional: string; professionalRole: string;
  scheduledFor: string; requestedAt: string; status: VisitStatus;
  etaMinutes: number; etaStarted?: string;
  departureTime?: string; arrivalTime?: string;
  serviceStart?: string; serviceEnd?: string;
  distanceKm: number; notes: string;
  feedback?: { rating: number; comment: string; time: string };
}

// ── Service Catalog ───────────────────────────────────────────────────────────

const SERVICE_TYPES: ServiceType[] = [
  { id: 'blood_work',  name: 'Blood Sample Collection', category: 'Diagnostics',  icon: 'colorize',         estimatedDuration: 20,  description: 'Home blood draw for lab panels and routine tests',       color: '#EF4444', bg: '#FEF2F2' },
  { id: 'physio',      name: 'Physiotherapy',           category: 'Therapy',      icon: 'self_improvement', estimatedDuration: 60,  description: 'In-home physiotherapy, rehab & mobility exercises',      color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'doc_consult', name: 'Doctor Home Visit',       category: 'Consultation', icon: 'stethoscope',      estimatedDuration: 30,  description: 'General or specialist home consultation',                color: '#17A077', bg: '#D1FAE5' },
  { id: 'wound_care',  name: 'Wound Dressing',          category: 'Nursing',      icon: 'healing',          estimatedDuration: 25,  description: 'Wound cleaning, dressing change & infection monitoring', color: '#0891B2', bg: '#E0F4F9' },
  { id: 'iv_infusion', name: 'IV / Injection',          category: 'Nursing',      icon: 'vaccines',         estimatedDuration: 45,  description: 'IV drip setup and injection administration at home',     color: '#D97706', bg: '#FEF3C7' },
  { id: 'ecg',         name: 'ECG Monitoring',          category: 'Diagnostics',  icon: 'monitor_heart',    estimatedDuration: 30,  description: '12-lead ECG and cardiac vitals monitoring',              color: '#F59E0B', bg: '#FFFBEB' },
  { id: 'elder_care',  name: 'Elder Care',              category: 'Nursing',      icon: 'elderly',          estimatedDuration: 120, description: 'Daily assistance, medication admin & vitals check',       color: '#059669', bg: '#ECFDF5' },
  { id: 'post_op',     name: 'Post-Surgery Follow-up',  category: 'Consultation', icon: 'medical_services', estimatedDuration: 40,  description: 'Post-operative wound check and recovery monitoring',     color: '#6366F1', bg: '#EEF2FF' },
];

// ── Status Config ─────────────────────────────────────────────────────────────

const STATUS_META: Record<VisitStatus, {
  label: string; color: string; bg: string; icon: string;
  next?: VisitStatus; nextLabel?: string;
}> = {
  requested:  { label: 'Requested',   color: '#6B7280', bg: '#F3F4F6', icon: 'pending',          next: 'assigned',   nextLabel: 'Assign Professional' },
  assigned:   { label: 'Assigned',    color: '#0891B2', bg: '#E0F4F9', icon: 'person_check',     next: 'en_route',   nextLabel: 'Start Journey'       },
  en_route:   { label: 'En Route',    color: '#D97706', bg: '#FEF3C7', icon: 'directions_car',   next: 'arrived',    nextLabel: 'Mark Arrived'        },
  arrived:    { label: 'Arrived',     color: '#7C3AED', bg: '#EDE9FE', icon: 'home_pin',         next: 'in_service', nextLabel: 'Start Service'       },
  in_service: { label: 'In Service',  color: '#17A077', bg: '#D1FAE5', icon: 'medical_services', next: 'completed',  nextLabel: 'Complete & Sign Off' },
  completed:  { label: 'Completed',   color: '#059669', bg: '#ECFDF5', icon: 'task_alt'          },
  cancelled:  { label: 'Cancelled',   color: '#EF4444', bg: '#FEF2F2', icon: 'cancel'            },
};

const STATUS_ORDER: VisitStatus[] = ['requested', 'assigned', 'en_route', 'arrived', 'in_service', 'completed'];

const JOURNEY_STEPS: { key: VisitStatus; icon: string; label: string }[] = [
  { key: 'assigned',   icon: 'local_hospital', label: 'Departed'   },
  { key: 'en_route',   icon: 'directions_car', label: 'En Route'   },
  { key: 'arrived',    icon: 'home_pin',        label: 'Arrived'    },
  { key: 'in_service', icon: 'healing',         label: 'In Service' },
  { key: 'completed',  icon: 'task_alt',        label: 'Done'       },
];

// ── Visit Checklist Templates ─────────────────────────────────────────────────

interface ChecklistTask { id: string; label: string; done: boolean }
interface ChecklistCategory { name: string; tasks: ChecklistTask[] }

const CHECKLIST_TEMPLATES: Record<string, ChecklistCategory[]> = {
  blood_work: [
    { name: 'Patient Verification',  tasks: [{ id:'bw1', label:'Verify patient identity & DOB', done:false }, { id:'bw2', label:'Confirm fasting status', done:false }, { id:'bw3', label:'Check for allergies / contraindications', done:false }] },
    { name: 'Sample Collection',     tasks: [{ id:'bw4', label:'Label tubes with patient ID', done:false }, { id:'bw5', label:'Select correct tubes for ordered tests', done:false }, { id:'bw6', label:'Disinfect collection site & collect sample', done:false }, { id:'bw7', label:'Apply pressure dressing', done:false }] },
    { name: 'Documentation',         tasks: [{ id:'bw8', label:'Record collection time in notes', done:false }, { id:'bw9', label:'Seal and bag samples for transport', done:false }] },
  ],
  physio: [
    { name: 'Assessment',            tasks: [{ id:'ph1', label:'Review previous session notes', done:false }, { id:'ph2', label:'Assess range of motion & pain (0-10)', done:false }] },
    { name: 'Treatment',             tasks: [{ id:'ph3', label:'Complete prescribed exercises', done:false }, { id:'ph4', label:'Apply manual therapy as needed', done:false }, { id:'ph5', label:'Apply heat/cold therapy if indicated', done:false }] },
    { name: 'Patient Education',     tasks: [{ id:'ph6', label:'Teach home exercise program', done:false }, { id:'ph7', label:'Set goals for next session', done:false }] },
  ],
  doc_consult: [
    { name: 'Vitals',                tasks: [{ id:'dc1', label:'Record blood pressure', done:false }, { id:'dc2', label:'Measure temperature & pulse rate', done:false }, { id:'dc3', label:'Check SpO₂', done:false }] },
    { name: 'Examination',           tasks: [{ id:'dc4', label:'Review current medications', done:false }, { id:'dc5', label:'Complete physical examination', done:false }, { id:'dc6', label:'Review recent lab/radiology reports', done:false }] },
    { name: 'Care Plan',             tasks: [{ id:'dc7', label:'Update care plan if needed', done:false }, { id:'dc8', label:'Write/update prescriptions', done:false }, { id:'dc9', label:'Schedule follow-up if required', done:false }] },
  ],
  wound_care: [
    { name: 'Wound Assessment',      tasks: [{ id:'wc1', label:'Inspect for signs of infection', done:false }, { id:'wc2', label:'Measure wound dimensions', done:false }, { id:'wc3', label:'Assess surrounding skin condition', done:false }] },
    { name: 'Dressing Change',       tasks: [{ id:'wc4', label:'Remove old dressing carefully', done:false }, { id:'wc5', label:'Clean wound with saline solution', done:false }, { id:'wc6', label:'Apply topical medication if prescribed', done:false }, { id:'wc7', label:'Apply fresh sterile dressing', done:false }] },
    { name: 'Documentation',         tasks: [{ id:'wc8', label:'Photograph wound for records', done:false }, { id:'wc9', label:'Document wound condition & progress', done:false }] },
  ],
  iv_infusion: [
    { name: 'Setup',                 tasks: [{ id:'iv1', label:'Verify medication order & dose', done:false }, { id:'iv2', label:'Check expiry date on IV solution', done:false }, { id:'iv3', label:'Prepare IV line & drip chamber', done:false }] },
    { name: 'Administration',        tasks: [{ id:'iv4', label:'Insert IV cannula & verify position', done:false }, { id:'iv5', label:'Set infusion rate as prescribed', done:false }, { id:'iv6', label:'Monitor patient for first 10 minutes', done:false }] },
    { name: 'Completion',            tasks: [{ id:'iv7', label:'Continue monitoring throughout infusion', done:false }, { id:'iv8', label:'Remove cannula & apply pressure bandage', done:false }, { id:'iv9', label:'Document infusion start/end times', done:false }] },
  ],
  ecg: [
    { name: 'Preparation',           tasks: [{ id:'ec1', label:'Explain procedure to patient', done:false }, { id:'ec2', label:'Position patient supine & comfortably', done:false }, { id:'ec3', label:'Clean skin & prep electrode sites', done:false }] },
    { name: 'Recording',             tasks: [{ id:'ec4', label:'Attach all 12 leads correctly', done:false }, { id:'ec5', label:'Ensure patient is still & relaxed', done:false }, { id:'ec6', label:'Record 12-lead ECG & check for artefacts', done:false }] },
    { name: 'Reporting',             tasks: [{ id:'ec7', label:'Save / print ECG report', done:false }, { id:'ec8', label:'Note heart rate & rhythm', done:false }, { id:'ec9', label:'Flag any acute changes for urgent review', done:false }] },
  ],
  elder_care: [
    { name: 'Morning Care',          tasks: [{ id:'el1', label:'Assist with hygiene & grooming', done:false }, { id:'el2', label:'Help with dressing as needed', done:false }, { id:'el3', label:'Prepare and serve breakfast', done:false }] },
    { name: 'Medical',               tasks: [{ id:'el4', label:'Administer morning medications', done:false }, { id:'el5', label:'Check blood pressure & pulse', done:false }, { id:'el6', label:'Assess overall wellbeing & mood', done:false }] },
    { name: 'Activities',            tasks: [{ id:'el7', label:'Assist with range-of-motion exercises', done:false }, { id:'el8', label:'Encourage light activity', done:false }] },
    { name: 'Documentation',         tasks: [{ id:'el9', label:'Record all observations', done:false }, { id:'el10', label:'Update daily care log', done:false }] },
  ],
  post_op: [
    { name: 'Wound Assessment',      tasks: [{ id:'po1', label:'Inspect surgical site for healing', done:false }, { id:'po2', label:'Check for infection signs (redness, discharge)', done:false }, { id:'po3', label:'Assess pain at incision site (0-10)', done:false }] },
    { name: 'Care',                  tasks: [{ id:'po4', label:'Change surgical dressing if needed', done:false }, { id:'po5', label:'Review post-op medications compliance', done:false }] },
    { name: 'Documentation',         tasks: [{ id:'po6', label:'Record wound healing status', done:false }, { id:'po7', label:'Document any complications or concerns', done:false }] },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDur(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_VISITS: HomeVisit[] = [
  {
    id: 'HV-001', patientName: 'Meera Iyer', patientPhone: '+91 98765 43210',
    patientAddress: '5A, Indiranagar, Bengaluru 560038',
    serviceId: 'physio', professional: 'Dr. Kavitha Rao', professionalRole: 'Physiotherapist',
    scheduledFor: '2026-11-01T10:00:00', requestedAt: '2026-10-31T15:00:00',
    status: 'en_route', etaMinutes: 15, etaStarted: new Date(Date.now() - 3 * 60000).toISOString(),
    departureTime: new Date(Date.now() - 3 * 60000).toISOString(),
    distanceKm: 4.2, notes: 'Post-knee surgery – session 3 of 10',
  },
  {
    id: 'HV-002', patientName: 'Rajesh Kumar', patientPhone: '+91 91234 56789',
    patientAddress: '12, MG Road, Koramangala, Bengaluru 560001',
    serviceId: 'blood_work', professional: 'Ravi Kumar', professionalRole: 'Phlebotomist',
    scheduledFor: '2026-11-01T09:00:00', requestedAt: '2026-10-31T10:00:00',
    status: 'in_service', etaMinutes: 0,
    departureTime: new Date(Date.now() - 65 * 60000).toISOString(),
    arrivalTime: new Date(Date.now() - 20 * 60000).toISOString(),
    serviceStart: new Date(Date.now() - 15 * 60000).toISOString(),
    distanceKm: 3.8, notes: 'Fasting: CBC, HbA1c, lipid panel',
  },
  {
    id: 'HV-003', patientName: 'Arjun Reddy', patientPhone: '+91 90000 55678',
    patientAddress: '8, HSR Layout, Bengaluru 560102',
    serviceId: 'wound_care', professional: 'Nurse Priya Nair', professionalRole: 'Nurse',
    scheduledFor: '2026-11-01T14:00:00', requestedAt: '2026-11-01T08:00:00',
    status: 'assigned', etaMinutes: 25, distanceKm: 6.1,
    notes: 'Post-appendectomy wound dressing change',
  },
  {
    id: 'HV-004', patientName: 'Sunita Verma', patientPhone: '+91 99001 22334',
    patientAddress: '22, Whitefield, Bengaluru 560066',
    serviceId: 'doc_consult', professional: 'Dr. Anita Sharma', professionalRole: 'Physician',
    scheduledFor: '2026-11-01T16:00:00', requestedAt: '2026-11-01T09:00:00',
    status: 'requested', etaMinutes: 30, distanceKm: 8.5,
    notes: 'Follow-up for hypertension management',
  },
  {
    id: 'HV-005', patientName: 'Kavitha Rao', patientPhone: '+91 97654 32100',
    patientAddress: '3, JP Nagar, Bengaluru 560078',
    serviceId: 'iv_infusion', professional: 'Nurse Deepa Menon', professionalRole: 'Nurse',
    scheduledFor: '2026-10-31T11:00:00', requestedAt: '2026-10-31T08:00:00',
    status: 'completed', etaMinutes: 0,
    departureTime: new Date(Date.now() - 5 * 3600000).toISOString(),
    arrivalTime: new Date(Date.now() - 4.5 * 3600000).toISOString(),
    serviceStart: new Date(Date.now() - 4.3 * 3600000).toISOString(),
    serviceEnd: new Date(Date.now() - 3.5 * 3600000).toISOString(),
    distanceKm: 5.2, notes: 'IV antibiotic infusion – Day 3',
    feedback: { rating: 5, comment: 'Nurse was professional and gentle. Arrived on time.', time: new Date(Date.now() - 3 * 3600000).toISOString() },
  },
  {
    id: 'HV-006', patientName: 'Vikram Sharma', patientPhone: '+91 98123 45678',
    patientAddress: '15, Jayanagar, Bengaluru 560041',
    serviceId: 'elder_care', professional: 'Nurse Meena Das', professionalRole: 'Geriatric Nurse',
    scheduledFor: '2026-11-01T08:00:00', requestedAt: '2026-10-30T10:00:00',
    status: 'completed', etaMinutes: 0,
    departureTime: new Date(Date.now() - 6 * 3600000).toISOString(),
    arrivalTime: new Date(Date.now() - 5.5 * 3600000).toISOString(),
    serviceStart: new Date(Date.now() - 5.3 * 3600000).toISOString(),
    serviceEnd: new Date(Date.now() - 3.3 * 3600000).toISOString(),
    distanceKm: 2.9, notes: 'Daily elder care: medication, BP check, exercises',
    feedback: { rating: 4, comment: 'Good service. A bit late.', time: new Date(Date.now() - 2.5 * 3600000).toISOString() },
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomeServicesHub() {
  const [visits, setVisits] = useState<HomeVisit[]>(MOCK_VISITS);
  const [tab, setTab] = useState<Tab>('overview');
  const [now, setNow] = useState(Date.now());
  const [feedbackVisit, setFeedbackVisit] = useState<HomeVisit | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<VisitStatus | 'all'>('all');
  const [checklistVisit, setChecklistVisit] = useState<HomeVisit | null>(null);
  const [checklist, setChecklist] = useState<ChecklistCategory[]>([]);
  const [checklistNotes, setChecklistNotes] = useState('');

  // Live tick every 15s for ETA countdown & service duration
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  function getETA(v: HomeVisit): number | null {
    if (v.status !== 'en_route' || !v.etaStarted) return null;
    const elapsed = (now - new Date(v.etaStarted).getTime()) / 60000;
    return Math.max(0, Math.round(v.etaMinutes - elapsed));
  }

  function getServiceDuration(v: HomeVisit): string {
    if (!v.serviceStart) return '—';
    const endMs = v.serviceEnd ? new Date(v.serviceEnd).getTime() : now;
    return fmtDur(Math.floor((endMs - new Date(v.serviceStart).getTime()) / 60000));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  function advance(id: string) {
    setVisits(prev => prev.map(v => {
      if (v.id !== id) return v;
      const meta = STATUS_META[v.status];
      if (!meta.next) return v;
      const next = meta.next;
      const iso = new Date().toISOString();
      const u: Partial<HomeVisit> = { status: next };
      if (next === 'en_route')   { u.departureTime = iso; u.etaStarted = iso; showToast(`Patient notified: ${v.professional} is on the way to ${v.patientName}. ETA ~${v.etaMinutes} min`); }
      if (next === 'arrived')    { u.arrivalTime = iso;   showToast(`${v.professional} arrived at ${v.patientName}'s home`); }
      if (next === 'in_service') { u.serviceStart = iso;  showToast(`Service started for ${v.patientName}`); }
      if (next === 'completed')  { u.serviceEnd = iso;    showToast(`Service complete for ${v.patientName} — patient notified to share feedback`); }
      return { ...v, ...u };
    }));
  }

  function submitFeedback() {
    if (!feedbackVisit) return;
    setVisits(prev => prev.map(v =>
      v.id === feedbackVisit.id
        ? { ...v, feedback: { rating: feedbackRating, comment: feedbackComment, time: new Date().toISOString() } }
        : v
    ));
    showToast(`Feedback saved — ${feedbackRating}/5 for ${feedbackVisit.patientName}`);
    setFeedbackVisit(null); setFeedbackRating(5); setFeedbackComment('');
  }

  const svc = (id: string) => SERVICE_TYPES.find(s => s.id === id) ?? SERVICE_TYPES[0];

  function openChecklist(v: HomeVisit) {
    const tpl = CHECKLIST_TEMPLATES[v.serviceId] ?? CHECKLIST_TEMPLATES['doc_consult'];
    setChecklist(tpl.map(cat => ({
      name: cat.name,
      tasks: cat.tasks.map(t => ({ ...t, done: false })),
    })));
    setChecklistNotes('');
    setChecklistVisit(v);
  }

  function toggleTask(catIdx: number, taskId: string) {
    setChecklist(prev => prev.map((cat, ci) =>
      ci !== catIdx ? cat : {
        ...cat,
        tasks: cat.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t),
      }
    ));
  }

  const checklistDone = checklist.every(cat => cat.tasks.every(t => t.done));

  const activeVisits  = visits.filter(v => ['en_route', 'arrived', 'in_service'].includes(v.status));
  const pendingVisits = visits.filter(v => ['requested', 'assigned'].includes(v.status));
  const completedVisits = visits.filter(v => v.status === 'completed');
  const feedbackList  = visits.filter(v => v.feedback);
  const avgRating     = feedbackList.length
    ? (feedbackList.reduce((s, v) => s + v.feedback!.rating, 0) / feedbackList.length).toFixed(1)
    : null;
  const filteredVisits = filterStatus === 'all' ? visits : visits.filter(v => v.status === filterStatus);

  const TABS: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: 'overview',  label: 'Overview',        icon: 'dashboard'                              },
    { id: 'active',    label: 'Active Visits',   icon: 'directions_car', count: activeVisits.length + pendingVisits.length },
    { id: 'all',       label: 'All Requests',    icon: 'list_alt',       count: visits.length   },
    { id: 'catalog',   label: 'Services',        icon: 'medical_services'                       },
    { id: 'patients',  label: 'Patients',        icon: 'groups'                                 },
    { id: 'staff',     label: 'Staff',           icon: 'badge'                                  },
    { id: 'schedule',  label: 'Schedule',        icon: 'calendar_month'                         },
    { id: 'requests',  label: 'Care Requests',   icon: 'assignment'                             },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden ml-64">

        {/* ── Header ── */}
        <div className="bg-white border-b border-gray-100 px-8 flex-shrink-0">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-[18px] font-black text-gray-900">Home Services</h1>
              <p className="text-[11px] text-gray-400 mt-0.5">Healthcare professionals visiting patients at home</p>
            </div>
            {activeVisits.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-bold text-amber-700">
                  {activeVisits.length} visit{activeVisits.length > 1 ? 's' : ''} in progress
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-0">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3 text-[12px] font-bold border-b-2 transition-all ${
                  tab === t.id ? 'border-green-500 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}>
                <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${tab === t.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-auto p-6">

          {/* ══════════════════════ OVERVIEW ══════════════════════ */}
          {tab === 'overview' && (
            <div className="max-w-5xl mx-auto space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: 'calendar_today',  label: "Today's Visits",    value: String(visits.length),          color: '#0891B2', bg: '#E0F4F9' },
                  { icon: 'directions_car',  label: 'Active Now',        value: String(activeVisits.length),    color: '#D97706', bg: '#FEF3C7' },
                  { icon: 'task_alt',        label: 'Completed',         value: String(completedVisits.length), color: '#17A077', bg: '#D1FAE5' },
                  { icon: 'star',            label: 'Avg Rating',        value: avgRating ?? '—',               color: '#F59E0B', bg: '#FFFBEB' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                      <span className="material-symbols-outlined text-[20px]" style={{ color: s.color }}>{s.icon}</span>
                    </div>
                    <div>
                      <p className="text-[24px] font-black text-gray-900 leading-none">{s.value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-5">
                {/* Active visits summary */}
                <div className="col-span-3 bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[13px] font-black text-gray-900">Active Right Now</h3>
                    {activeVisits.length > 0 && (
                      <button onClick={() => setTab('active')} className="text-[11px] font-bold text-green-600 hover:text-green-700">
                        View All →
                      </button>
                    )}
                  </div>
                  {activeVisits.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <span className="material-symbols-outlined text-[36px] block mb-2">directions_car</span>
                      <p className="text-[12px]">No active visits right now</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeVisits.map(v => {
                        const s = svc(v.serviceId);
                        const meta = STATUS_META[v.status];
                        const eta = getETA(v);
                        return (
                          <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                              <span className="material-symbols-outlined text-[16px]" style={{ color: s.color }}>{s.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-bold text-gray-900 truncate">{v.patientName}</p>
                              <p className="text-[10px] text-gray-400 truncate">{v.professional} · {s.name}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                                style={{ background: meta.bg, color: meta.color }}>
                                <span className="material-symbols-outlined text-[10px]">{meta.icon}</span>
                                {meta.label}
                              </span>
                              {eta !== null && <p className="text-[10px] text-amber-600 font-bold mt-0.5">{eta} min ETA</p>}
                              {v.status === 'in_service' && v.serviceStart && (
                                <p className="text-[10px] text-green-600 font-bold mt-0.5">{getServiceDuration(v)} ongoing</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent feedback */}
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="text-[13px] font-black text-gray-900 mb-4">Patient Feedback</h3>
                  {feedbackList.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <span className="material-symbols-outlined text-[36px] block mb-2">star</span>
                      <p className="text-[12px]">No feedback yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {feedbackList.slice(-3).reverse().map(v => (
                        <div key={v.id} className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[12px] font-bold text-gray-900">{v.patientName}</p>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className="material-symbols-outlined text-[11px]"
                                  style={{ color: i < (v.feedback?.rating ?? 0) ? '#F59E0B' : '#E5E7EB' }}>star</span>
                              ))}
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-500 leading-snug">{v.feedback?.comment}</p>
                          <p className="text-[9px] text-gray-300 mt-1">{svc(v.serviceId).name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Today's schedule */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="text-[13px] font-black text-gray-900 mb-4">Full Schedule</h3>
                <div className="space-y-0">
                  {[...visits].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)).map(v => {
                    const s = svc(v.serviceId);
                    const meta = STATUS_META[v.status];
                    return (
                      <div key={v.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                        <p className="text-[11px] font-bold text-gray-400 w-14 flex-shrink-0">{fmtTime(v.scheduledFor)}</p>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                          <span className="material-symbols-outlined text-[13px]" style={{ color: s.color }}>{s.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-gray-900 truncate">
                            {v.patientName} <span className="font-normal text-gray-400">· {s.name}</span>
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{v.professional} · {v.distanceKm} km</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 flex-shrink-0"
                          style={{ background: meta.bg, color: meta.color }}>
                          <span className="material-symbols-outlined text-[10px]">{meta.icon}</span>
                          {meta.label}
                        </span>
                        {meta.next && (
                          <button onClick={() => advance(v.id)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: '#17A077' }}>
                            {meta.nextLabel}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════ ACTIVE VISITS ══════════════════════ */}
          {tab === 'active' && (
            <div className="max-w-4xl mx-auto space-y-5">
              {[...activeVisits, ...pendingVisits].length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <span className="material-symbols-outlined text-[48px] block mb-3">directions_car</span>
                  <p className="text-[14px]">No active visits right now</p>
                </div>
              ) : (
                [...activeVisits, ...pendingVisits].map(v => {
                  const s = svc(v.serviceId);
                  const meta = STATUS_META[v.status];
                  const eta = getETA(v);
                  const currentStepIdx = STATUS_ORDER.indexOf(v.status);

                  return (
                    <div key={v.id} className="bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm">
                      {/* Title row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                            <span className="material-symbols-outlined text-[22px]" style={{ color: s.color }}>{s.icon}</span>
                          </div>
                          <div>
                            <p className="text-[15px] font-black text-gray-900">{s.name}</p>
                            <p className="text-[11px] text-gray-400">{v.id} · Scheduled {fmtTime(v.scheduledFor)}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5"
                          style={{ background: meta.bg, color: meta.color }}>
                          <span className="material-symbols-outlined text-[12px]">{meta.icon}</span>
                          {meta.label}
                        </span>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-gray-50">
                          <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Professional</p>
                          <p className="text-[12px] font-bold text-gray-900">{v.professional}</p>
                          <p className="text-[10px] text-gray-400">{v.professionalRole}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50">
                          <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Patient</p>
                          <p className="text-[12px] font-bold text-gray-900">{v.patientName}</p>
                          <p className="text-[10px] text-gray-400">{v.patientPhone}</p>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-2 mb-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
                        <span className="material-symbols-outlined text-[14px] text-blue-500 flex-shrink-0 mt-0.5">location_on</span>
                        <div>
                          <p className="text-[11px] text-blue-700 font-medium">{v.patientAddress}</p>
                          <p className="text-[10px] text-blue-400 mt-0.5">{v.distanceKm} km from hospital · Est. {v.etaMinutes} min travel</p>
                        </div>
                      </div>

                      {/* Journey progress */}
                      <div className="mb-4 px-2">
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-3">Journey Progress</p>
                        <div className="flex items-start">
                          {JOURNEY_STEPS.map((step, i) => {
                            const stepOrder = STATUS_ORDER.indexOf(step.key);
                            const done = currentStepIdx >= stepOrder;
                            const current = currentStepIdx === stepOrder;
                            return (
                              <div key={step.key} className="flex items-start flex-1">
                                <div className="flex flex-col items-center w-full">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${current ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}
                                    style={{ background: done ? '#17A077' : '#F3F4F6' }}>
                                    <span className="material-symbols-outlined text-[14px]"
                                      style={{ color: done ? '#fff' : '#9CA3AF' }}>{step.icon}</span>
                                  </div>
                                  <p className={`text-[8px] mt-1 font-semibold text-center ${done ? 'text-green-600' : 'text-gray-300'}`}>
                                    {step.label}
                                  </p>
                                </div>
                                {i < JOURNEY_STEPS.length - 1 && (
                                  <div className="flex-1 h-0.5 mt-4 mx-0.5"
                                    style={{ background: currentStepIdx > STATUS_ORDER.indexOf(step.key) ? '#17A077' : '#E5E7EB' }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Live ETA */}
                      {v.status === 'en_route' && eta !== null && (
                        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <span className="material-symbols-outlined text-[20px] text-amber-600">timer</span>
                          <div className="flex-1">
                            <p className="text-[14px] font-black text-amber-700">{eta} min remaining</p>
                            <p className="text-[10px] text-amber-500">Patient notified. Professional is on the way.</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-amber-500">Departed {fmtTime(v.departureTime)}</p>
                            <p className="text-[10px] text-amber-400">{v.distanceKm} km</p>
                          </div>
                        </div>
                      )}

                      {/* Service timer */}
                      {v.status === 'in_service' && v.serviceStart && (
                        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-green-50 border border-green-200">
                          <span className="material-symbols-outlined text-[20px] text-green-600">timer</span>
                          <div className="flex-1">
                            <p className="text-[14px] font-black text-green-700">{getServiceDuration(v)} in service</p>
                            <p className="text-[10px] text-green-500">
                              Started at {fmtTime(v.serviceStart)} · Est. {s.estimatedDuration} min total
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {v.notes && (
                        <div className="flex items-start gap-2 mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                          <span className="material-symbols-outlined text-[13px] text-amber-500 flex-shrink-0 mt-0.5">info</span>
                          <p className="text-[11px] text-amber-700">{v.notes}</p>
                        </div>
                      )}

                      {/* Checklist button for in_service visits */}
                      {v.status === 'in_service' && (
                        <button onClick={() => openChecklist(v)}
                          className="w-full py-2.5 rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 mb-2 border-2 border-green-300 text-green-700 hover:bg-green-50 transition-colors">
                          <span className="material-symbols-outlined text-[15px]">checklist</span>
                          View Visit Checklist
                        </button>
                      )}

                      {/* Action */}
                      {meta.next && (
                        <button onClick={() => advance(v.id)}
                          className="w-full py-2.5 rounded-xl text-white font-bold text-[13px] flex items-center justify-center gap-2"
                          style={{ background: '#17A077', boxShadow: '0 4px 12px rgba(23,160,119,0.3)' }}>
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                          {meta.nextLabel}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ══════════════════════ ALL REQUESTS ══════════════════════ */}
          {tab === 'all' && (
            <div className="max-w-4xl mx-auto">
              {/* Filter chips */}
              <div className="flex gap-1.5 mb-5 flex-wrap">
                <button onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold transition-all ${filterStatus === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  All ({visits.length})
                </button>
                {(['requested', 'assigned', 'en_route', 'arrived', 'in_service', 'completed', 'cancelled'] as VisitStatus[]).map(status => {
                  const count = visits.filter(v => v.status === status).length;
                  if (count === 0) return null;
                  const meta = STATUS_META[status];
                  return (
                    <button key={status} onClick={() => setFilterStatus(status)}
                      className="px-3 py-1 rounded-xl text-[10px] font-bold transition-all"
                      style={filterStatus === status
                        ? { background: meta.color, color: '#fff' }
                        : { background: meta.bg, color: meta.color }}>
                      {meta.label} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {filteredVisits.map(v => {
                  const s = svc(v.serviceId);
                  const meta = STATUS_META[v.status];
                  return (
                    <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                            <span className="material-symbols-outlined text-[16px]" style={{ color: s.color }}>{s.icon}</span>
                          </div>
                          <div>
                            <p className="text-[13px] font-black text-gray-900">
                              {v.patientName} <span className="text-gray-300 font-normal text-[11px]">· {v.id}</span>
                            </p>
                            <p className="text-[10px] text-gray-400">{s.name} · {v.professional} · {v.professionalRole}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1"
                          style={{ background: meta.bg, color: meta.color }}>
                          <span className="material-symbols-outlined text-[10px]">{meta.icon}</span>
                          {meta.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[
                          { label: 'Scheduled',  value: fmtTime(v.scheduledFor)           },
                          { label: 'Distance',   value: `${v.distanceKm} km`              },
                          { label: 'Est. Time',  value: `${s.estimatedDuration} min`      },
                          { label: 'Phone',      value: v.patientPhone                    },
                        ].map(d => (
                          <div key={d.label} className="p-2 rounded-lg bg-gray-50">
                            <p className="text-[9px] text-gray-400 mb-0.5">{d.label}</p>
                            <p className="text-[11px] font-bold text-gray-700 truncate">{d.value}</p>
                          </div>
                        ))}
                      </div>

                      {v.notes && (
                        <p className="text-[10px] text-gray-500 mb-3 pl-2.5 border-l-2 border-gray-200">{v.notes}</p>
                      )}

                      {/* Timeline for completed */}
                      {v.status === 'completed' && v.departureTime && (
                        <div className="flex items-center gap-2 mb-3 text-[10px] text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">flight_takeoff</span>Depart {fmtTime(v.departureTime)}</span>
                          {v.arrivalTime && <><span>→</span><span className="flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">home_pin</span>Arrive {fmtTime(v.arrivalTime)}</span></>}
                          {v.serviceStart && <><span>→</span><span className="flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">play_arrow</span>Start {fmtTime(v.serviceStart)}</span></>}
                          {v.serviceEnd && <><span>→</span><span className="flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">stop</span>End {fmtTime(v.serviceEnd)}</span></>}
                          {v.serviceStart && v.serviceEnd && (
                            <span className="ml-auto font-bold text-green-600">{getServiceDuration(v)} served</span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        {v.status === 'completed' && !v.feedback && (
                          <button onClick={() => { setFeedbackVisit(v); setFeedbackRating(5); setFeedbackComment(''); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border-2 border-amber-200 text-amber-600 hover:bg-amber-50 transition-colors">
                            <span className="material-symbols-outlined text-[13px]">star</span>
                            Add Patient Feedback
                          </button>
                        )}
                        {v.feedback && (
                          <div className="flex items-center gap-1.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className="material-symbols-outlined text-[12px]"
                                style={{ color: i < v.feedback!.rating ? '#F59E0B' : '#E5E7EB' }}>star</span>
                            ))}
                            <span className="text-[10px] text-gray-400 ml-1">
                              {v.feedback.comment.length > 45 ? v.feedback.comment.slice(0, 45) + '…' : v.feedback.comment}
                            </span>
                          </div>
                        )}
                        {!v.feedback && v.status !== 'completed' && <div />}

                        {meta.next && (
                          <button onClick={() => advance(v.id)}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-white ml-auto"
                            style={{ background: '#17A077' }}>
                            {meta.nextLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════ SERVICE CATALOG ══════════════════════ */}
          {tab === 'catalog' && (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[13px] font-black text-gray-900">{SERVICE_TYPES.length} Service Types</p>
                  <p className="text-[11px] text-gray-400">All services available for home visits</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {SERVICE_TYPES.map(s => {
                  const visitCount = visits.filter(v => v.serviceId === s.id).length;
                  return (
                    <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all group">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                          <span className="material-symbols-outlined text-[24px]" style={{ color: s.color }}>{s.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-black text-gray-900">{s.name}</p>
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold mt-0.5"
                            style={{ background: s.bg, color: s.color }}>{s.category}</span>
                        </div>
                        <div className="w-8 h-4 rounded-full flex items-center justify-end pr-0.5 flex-shrink-0"
                          style={{ background: s.color }}>
                          <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-4 leading-snug">{s.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          <span className="font-semibold text-gray-600">~{s.estimatedDuration} min session</span>
                        </div>
                        {visitCount > 0 && (
                          <span style={{ color: s.color }} className="font-bold">{visitCount} visit{visitCount > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════ PATIENTS ══════════════════════ */}
          {tab === 'patients' && <PatientsPanel />}

          {/* ══════════════════════ STAFF ══════════════════════ */}
          {tab === 'staff' && <StaffPanel />}

          {/* ══════════════════════ SCHEDULE ══════════════════════ */}
          {tab === 'schedule' && <SchedulePanel />}

          {/* ══════════════════════ CARE REQUESTS ══════════════════════ */}
          {tab === 'requests' && <CareRequestsPanel />}

        </div>
      </div>

      {/* ── Feedback Modal ─────────────────────────────────────────────────── */}
      {feedbackVisit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-black text-gray-900">Patient Feedback</h3>
              <button onClick={() => setFeedbackVisit(null)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 mb-5">
              <p className="text-[12px] font-bold text-gray-900">{feedbackVisit.patientName}</p>
              <p className="text-[10px] text-gray-400">
                {svc(feedbackVisit.serviceId).name} · {feedbackVisit.professional}
              </p>
            </div>

            {/* Star rating */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">How was the service?</p>
              <div className="flex gap-2 justify-center mb-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setFeedbackRating(n)}
                    className="text-[32px] transition-transform hover:scale-125"
                    style={{ color: n <= feedbackRating ? '#F59E0B' : '#E5E7EB' }}>
                    ★
                  </button>
                ))}
              </div>
              <p className="text-center text-[12px] font-bold mt-1"
                style={{ color: feedbackRating >= 4 ? '#17A077' : feedbackRating >= 3 ? '#D97706' : '#EF4444' }}>
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][feedbackRating]}
              </p>
            </div>

            {/* Comment */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Patient's Comments</p>
              <textarea value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)}
                placeholder="How was the experience? Was the professional on time, professional, caring?"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[12px] text-gray-700 outline-none resize-none h-24"
                onFocus={e => { e.target.style.borderColor = '#17A077'; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = '#F3F4F6'; e.target.style.background = '#F9FAFB'; }} />
            </div>

            <button onClick={submitFeedback}
              className="w-full py-3 rounded-xl text-white font-bold text-[13px] flex items-center justify-center gap-2"
              style={{ background: '#17A077', boxShadow: '0 4px 12px rgba(23,160,119,0.3)' }}>
              <span className="material-symbols-outlined text-[15px]">send</span>
              Submit Feedback
            </button>
          </div>
        </div>
      )}

      {/* ── Visit Checklist Modal ─────────────────────────────────────────── */}
      {checklistVisit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="text-[15px] font-black text-gray-900">Visit Checklist</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {svc(checklistVisit.serviceId).name} · {checklistVisit.patientName}
                </p>
              </div>
              <button onClick={() => setChecklistVisit(null)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-6 py-3 flex-shrink-0">
              {(() => {
                const all   = checklist.reduce((n, c) => n + c.tasks.length, 0);
                const done  = checklist.reduce((n, c) => n + c.tasks.filter(t => t.done).length, 0);
                const pct   = all > 0 ? Math.round((done / all) * 100) : 0;
                return (
                  <div>
                    <div className="flex justify-between text-[10px] font-bold mb-1.5">
                      <span className="text-gray-500">{done}/{all} tasks completed</span>
                      <span style={{ color: checklistDone ? '#17A077' : '#D97706' }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, background: checklistDone ? '#17A077' : '#D97706' }} />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-auto px-6 space-y-4 pb-4">
              {checklist.map((cat, ci) => (
                <div key={cat.name} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
                    <p className="text-[11px] font-black text-gray-700">{cat.name}</p>
                    <span className="text-[10px] text-gray-400">
                      {cat.tasks.filter(t => t.done).length}/{cat.tasks.length}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {cat.tasks.map(task => (
                      <label key={task.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.done ? 'border-green-500' : 'border-gray-300'}`}
                          style={{ background: task.done ? '#17A077' : 'transparent' }}
                          onClick={() => toggleTask(ci, task.id)}>
                          {task.done && <span className="material-symbols-outlined text-[13px] text-white">check</span>}
                        </div>
                        <span className={`text-[12px] ${task.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {task.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Notes */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Visit Notes & Observations
                </label>
                <textarea value={checklistNotes} onChange={e => setChecklistNotes(e.target.value)}
                  placeholder="Enter any observations, concerns, or notes about this visit…"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[12px] text-gray-700 outline-none resize-none h-20 focus:border-[#17A077] focus:bg-white" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button onClick={() => setChecklistVisit(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-600 hover:bg-gray-50">
                Save & Close
              </button>
              <button
                onClick={() => { advance(checklistVisit.id); setChecklistVisit(null); }}
                disabled={!checklistDone}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{ background: '#17A077', boxShadow: checklistDone ? '0 4px 12px rgba(23,160,119,0.3)' : 'none' }}>
                <span className="material-symbols-outlined text-[15px]">task_alt</span>
                {checklistDone ? 'Complete & Sign Off' : `Complete All Tasks First`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-[12px] px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 z-50 max-w-sm">
          <span className="material-symbols-outlined text-green-400 text-[15px] flex-shrink-0">notifications</span>
          <span className="leading-snug">{toast}</span>
        </div>
      )}
    </div>
  );
}
