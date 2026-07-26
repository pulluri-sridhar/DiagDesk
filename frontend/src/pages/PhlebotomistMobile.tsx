import { useState, useEffect, useRef, useMemo } from 'react';
import { fetchOrdersByPhlebotomist, updateOrderStatus, saveOrderBarcode, type Order, type OrderItem } from '../lib/api';
import { barcodeValue } from '../lib/barcode';
import { useAuth } from '../lib/auth';
import Sidebar from '../components/Sidebar';
import BarcodeLabelModal from '../components/BarcodeLabelModal';

// ── Types ────────────────────────────────────────────────────────────────────

type VisitStatus = 'scheduled' | 'en_route' | 'arrived' | 'collecting' | 'collected' | 'cancelled';

interface VisitState {
  status: VisitStatus;
  departedAt?: string;
  arrivedAt?: string;
  collectedAt?: string;
  etaMinutes?: number;
  cancelReason?: string;
  checklist: {
    patientId: boolean;
    fasting: boolean;
    tubesReady: boolean;
    labelsReady: boolean;
    consent: boolean;
  };
}

interface NotifEntry {
  id: string;
  ts: string;
  event: 'scheduled' | 'en_route' | 'arrived' | 'collected' | 'cancelled';
  recipient: 'patient' | 'lab';
  patientName: string;
  orderId: string;
  message: string;
  read: boolean;
}

interface TubeInfo {
  color: string;
  bgClass: string;
  borderClass: string;
  name: string;
  tests: string[];
  prepNote: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const RAVI_ID    = '00000000-0000-0000-0000-000000000011';
const TEAL       = '#17A077';
const DONE_STATUSES = new Set(['resulted', 'reported', 'delivered', 'sample_collected']);

// Bangalore neighbourhoods with approximate lat/lng for demo ETA
const BLR_AREAS: [string, number, number][] = [
  ['Koramangala',    12.9352, 77.6244],
  ['Indiranagar',    12.9784, 77.6408],
  ['HSR Layout',     12.9116, 77.6389],
  ['Whitefield',     12.9698, 77.7499],
  ['Jayanagar',      12.9299, 77.5836],
  ['Marathahalli',   12.9592, 77.6972],
  ['BTM Layout',     12.9165, 77.6101],
  ['Electronic City',12.8417, 77.6697],
  ['Malleshwaram',   13.0069, 77.5648],
  ['Hebbal',         13.0358, 77.5971],
  ['Yeshwanthpur',   13.0208, 77.5507],
  ['JP Nagar',       12.9063, 77.5857],
];

// Test department → tube type
const DEPT_TUBE: Record<string, TubeInfo> = {
  Hematology: {
    color: '#9333EA', bgClass: 'bg-purple-100', borderClass: 'border-purple-400',
    name: 'Purple Cap (EDTA)',
    tests: ['CBC', 'ESR', 'HbA1c', 'Blood Group', 'Haemoglobin', 'WBC', 'Platelets'],
    prepNote: 'No fasting required. Invert 8–10 times after filling.',
  },
  Biochemistry: {
    color: '#EAB308', bgClass: 'bg-yellow-100', borderClass: 'border-yellow-400',
    name: 'Yellow Cap (SST)',
    tests: ['LFT', 'KFT', 'Lipid Profile', 'Electrolytes', 'CRP', 'Uric Acid', 'Creatinine'],
    prepNote: '10–12 hrs fasting required. Allow to clot 30 min before centrifuge.',
  },
  Endocrinology: {
    color: '#EAB308', bgClass: 'bg-yellow-100', borderClass: 'border-yellow-400',
    name: 'Yellow Cap (SST)',
    tests: ['TSH', 'T3', 'T4', 'Cortisol', 'Testosterone', 'Insulin', 'Prolactin'],
    prepNote: 'Fasting preferred for glucose-related hormones.',
  },
  Immunology: {
    color: '#EAB308', bgClass: 'bg-yellow-100', borderClass: 'border-yellow-400',
    name: 'Yellow Cap (SST)',
    tests: ['HIV', 'HBsAg', 'Anti-HCV', 'ANA', 'RA Factor', 'VDRL'],
    prepNote: 'Allow to clot fully (30–45 min) before centrifuging.',
  },
  Coagulation: {
    color: '#3B82F6', bgClass: 'bg-blue-100', borderClass: 'border-blue-400',
    name: 'Blue Cap (Citrate)',
    tests: ['PT-INR', 'APTT', 'D-Dimer', 'Fibrinogen'],
    prepNote: 'Fill to exact mark (9:1 ratio). No air bubbles.',
  },
  Microbiology: {
    color: '#EF4444', bgClass: 'bg-red-100', borderClass: 'border-red-400',
    name: 'Red Cap (Plain)',
    tests: ['Culture', 'Widal', 'HBsAg', 'Serology', 'Blood Bank'],
    prepNote: 'Allow full clotting. Sterile technique required.',
  },
  Glucose: {
    color: '#6B7280', bgClass: 'bg-gray-100', borderClass: 'border-gray-400',
    name: 'Gray Cap (Fluoride Oxalate)',
    tests: ['Blood Glucose', 'FBS', 'PPBS', 'OGTT', 'Lactate', 'HbA1c Glucose'],
    prepNote: 'Fluoride prevents glycolysis — keep cool. Do NOT delay transport.',
  },
  BloodGas: {
    color: '#22C55E', bgClass: 'bg-green-100', borderClass: 'border-green-400',
    name: 'Green Cap (Lithium Heparin)',
    tests: ['Blood Gas', 'ABG', 'Ammonia', 'Stat Chemistry', 'Chromosomes', 'Cyclosporine'],
    prepNote: 'Heparinized tube. Invert 8–10 times. Keep on ice for ABG analysis.',
  },
  default: {
    color: '#EAB308', bgClass: 'bg-yellow-100', borderClass: 'border-yellow-400',
    name: 'Yellow Cap (SST)',
    tests: [],
    prepNote: 'Follow standard collection protocol.',
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// City road factor × average traffic speed → ETA in minutes
function etaMin(distKm: number): number {
  return Math.max(3, Math.round((distKm * 1.45) / 20 * 60 + 5));
}

// Assign a deterministic area to an order (for demo consistency)
function patientArea(orderId: string): [string, number, number] {
  let hash = 0;
  for (const c of orderId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return BLR_AREAS[Math.abs(hash) % BLR_AREAS.length];
}

function getTubeForItem(item: OrderItem): TubeInfo {
  const dept = (item.department ?? '').toLowerCase().trim();
  const test = (item.test_name ?? '').toLowerCase().trim();

  // Exact key match (case-insensitive)
  for (const [key, info] of Object.entries(DEPT_TUBE)) {
    if (key === 'default') continue;
    if (dept === key.toLowerCase()) return info;
  }

  // Fuzzy department keyword match
  if (/hemat|haem|blood count|cbc/.test(dept))                       return DEPT_TUBE.Hematology;
  if (/coag|thromb|clot|inr/.test(dept))                             return DEPT_TUBE.Coagulation;
  if (/micro|cultur|serol|bacteriol/.test(dept))                     return DEPT_TUBE.Microbiology;
  if (/biochem|clin.?chem|metabol/.test(dept))                       return DEPT_TUBE.Biochemistry;
  if (/endocrin|horm|thyroid/.test(dept))                            return DEPT_TUBE.Endocrinology;
  if (/immun|allerg|rheumato/.test(dept))                            return DEPT_TUBE.Immunology;
  if (/glucose|diabet|glyc/.test(dept))                              return DEPT_TUBE.Glucose;
  if (/gas|critical|icu|heparin|ammon/.test(dept))                   return DEPT_TUBE.BloodGas;

  // Fallback: match on test name keywords
  if (/cbc|haemoglobin|hemoglobin|wbc|rbc|platelet|esr|blood group|haematology/i.test(test))
    return DEPT_TUBE.Hematology;
  if (/pt.?inr|aptt|prothrombin|fibrinogen|d.?dimer|clotting time/i.test(test))
    return DEPT_TUBE.Coagulation;
  if (/culture|widal|typhoid|malaria|dengue|hbsag|hepatitis|hiv|vdrl/i.test(test))
    return DEPT_TUBE.Microbiology;
  if (/tsh|t3\b|t4\b|cortisol|testosterone|insulin|prolactin|estrogen|progesteron/i.test(test))
    return DEPT_TUBE.Endocrinology;
  if (/\bfbs\b|ppbs|ogtt|blood.?glucose|fasting.?sugar|random.?sugar|lactate/i.test(test))
    return DEPT_TUBE.Glucose;
  if (/blood.?gas|abg|pao2|pco2|ammonia|spo2.?arterial|bicarbonate/i.test(test))
    return DEPT_TUBE.BloodGas;
  if (/hba1c|lfts?|kfts?|lipid|cholesterol|triglyceride|creatinine|urea|sgpt|sgot|bilirubin|uric.?acid/i.test(test))
    return DEPT_TUBE.Biochemistry;

  return DEPT_TUBE.default;
}

function getTubesNeeded(items: OrderItem[]): TubeInfo[] {
  const seen = new Set<string>();
  const result: TubeInfo[] = [];
  for (const item of items) {
    const tube = getTubeForItem(item);
    if (!seen.has(tube.name)) { seen.add(tube.name); result.push(tube); }
  }
  return result;
}

function buildMessage(
  event: NotifEntry['event'],
  order: Order,
  extra?: { eta?: number; phleboName?: string },
) {
  const name   = order.patient_name ?? 'Patient';
  const tests  = (order.items ?? []).slice(0, 2).map(i => i.test_name).join(', ');
  const phName = extra?.phleboName ?? 'our team';
  const eta    = extra?.eta ?? 15;
  const reportEta = new Date(Date.now() + 6 * 3600_000)
    .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const msgs: Record<string, Record<'patient'|'lab', string>> = {
    scheduled: {
      patient: `Dear ${name}, your home sample collection is confirmed. ${phName} will visit you today. Please keep your ID ready and ensure the patient is available. ✅`,
      lab: `Home collection scheduled for ${name} — Tests: ${tests}. Assigned to ${phName}.`,
    },
    en_route: {
      patient: `Dear ${name}, ${phName} is on the way to your location. ETA: ~${eta} minutes. Please keep the door open and have your Aadhaar / ID ready. 🚗`,
      lab: `${phName} has departed for ${name}'s collection. ETA: ~${eta} min.`,
    },
    arrived: {
      patient: `Your sample collector has arrived at your location. Please open the door. 🔔`,
      lab: `${phName} arrived at ${name}'s address. Collection in progress.`,
    },
    collected: {
      patient: `Hi ${name}, your sample has been collected successfully! Your ${tests} report will be ready by approximately ${reportEta} today. Track your report at diagdesk.in 🧪✅`,
      lab: `Sample successfully collected from ${name} by ${phName}. Tests: ${tests}. Sending to processing. 📦`,
    },
    cancelled: {
      patient: `Dear ${name}, your home collection visit has been cancelled. Please contact us to reschedule. 📞`,
      lab: `Visit cancelled for ${name}. Please reassign or reschedule.`,
    },
  };
  return msgs[event] ?? { patient: '', lab: '' };
}

function relTime(ts: string): string {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  return `${Math.floor(d / 3600)}h ago`;
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function defaultVisitState(): VisitState {
  return {
    status: 'scheduled',
    checklist: { patientId: false, fasting: false, tubesReady: false, labelsReady: false, consent: false },
  };
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PhlebotomistMobile() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';
  const phName  = user?.name ?? 'Ravi Kumar';

  // Data
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // GPS
  const [myLat, setMyLat]         = useState<number | null>(null);
  const [myLng, setMyLng]         = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle'|'requesting'|'ok'|'denied'|'error'>('idle');
  const watchIdRef = useRef<number | null>(null);

  // Visit lifecycle
  const [visitStates, setVisitStates] = useState<Record<string, VisitState>>({});

  // Notification log (in-memory session cache)
  const notifLog = useRef<NotifEntry[]>([]);
  const [notifVersion, setNotifVersion] = useState(0);
  const [showNotifs, setShowNotifs]     = useState(false);

  // Checklist modal
  const [checklistId, setChecklistId] = useState<string | null>(null);

  // Cancel reason modal
  const [cancelId, setCancelId]         = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Barcode / label modal
  const [labelOrderId, setLabelOrderId] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<'visits'|'notifications'>('visits');

  // Timer tick (for live ETA countdown)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  // Load orders
  useEffect(() => {
    fetchOrdersByPhlebotomist(RAVI_ID)
      .then(ords => {
        setOrders(ords);
        // Auto-save barcode for each order (noop if column doesn't exist)
        ords.forEach(o => saveOrderBarcode(o.id, barcodeValue(o.id)));
        // Init visit states for orders not already completed
        setVisitStates(prev => {
          const next = { ...prev };
          ords.forEach(o => {
            if (!next[o.id]) next[o.id] = defaultVisitState();
            // Sync with DB status
            if (DONE_STATUSES.has(o.status) && next[o.id].status !== 'collected') {
              next[o.id] = { ...next[o.id], status: 'collected' };
            }
          });
          return next;
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Start GPS watch
  useEffect(() => {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
    setGpsStatus('requesting');
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setMyLat(pos.coords.latitude);
        setMyLng(pos.coords.longitude);
        setGpsStatus('ok');
      },
      err => {
        if (err.code === 1) setGpsStatus('denied');
        else setGpsStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 },
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────

  const vState = (id: string): VisitState => visitStates[id] ?? defaultVisitState();

  const enRouteOrder = orders.find(o => vState(o.id).status === 'en_route');
  const arrivedOrder = orders.find(o => vState(o.id).status === 'arrived' || vState(o.id).status === 'collecting');

  const remaining  = orders.filter(o => !['collected','cancelled'].includes(vState(o.id).status)).length;
  const completed  = orders.filter(o => vState(o.id).status === 'collected').length;
  const unreadCount = notifLog.current.filter(n => !n.read).length;

  function getDistKm(order: Order): number {
    const [, plat, plng] = patientArea(order.id);
    if (myLat !== null && myLng !== null) return haversineKm(myLat, myLng, plat, plng);
    // fallback demo distance
    const seed = order.id.charCodeAt(0) % 15 + 3;
    return seed;
  }

  function getETA(order: Order): number {
    return etaMin(getDistKm(order));
  }

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const sa = vState(a.id).status, sb = vState(b.id).status;
      const priority = (s: VisitStatus) => s === 'en_route' ? 0 : s === 'arrived' || s === 'collecting' ? 1 : s === 'scheduled' ? 2 : 3;
      return priority(sa) - priority(sb) || getDistKm(a) - getDistKm(b);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, visitStates, tick]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function pushNotif(entry: Omit<NotifEntry, 'id' | 'ts' | 'read'>) {
    const full: NotifEntry = { ...entry, id: crypto.randomUUID(), ts: new Date().toISOString(), read: false };
    notifLog.current.unshift(full);
    setNotifVersion(v => v + 1);
    // Browser push notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`DiagDesk — ${entry.recipient === 'patient' ? '📱 Patient' : '🏥 Lab'}`, {
        body: entry.message.slice(0, 120),
      });
    }
  }

  function sendNotifications(event: NotifEntry['event'], order: Order, extra?: { eta?: number }) {
    const msgs = buildMessage(event, order, { phleboName: phName, ...extra });
    pushNotif({ event, recipient: 'patient', patientName: order.patient_name ?? '—', orderId: order.id, message: msgs.patient });
    pushNotif({ event, recipient: 'lab',     patientName: order.patient_name ?? '—', orderId: order.id, message: msgs.lab });
  }

  function updateVisit(id: string, patch: Partial<VisitState>) {
    setVisitStates(prev => ({ ...prev, [id]: { ...(prev[id] ?? defaultVisitState()), ...patch } }));
  }

  async function requestBrowserNotifPermission() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  function startTrip(order: Order) {
    requestBrowserNotifPermission();
    const eta = getETA(order);
    updateVisit(order.id, { status: 'en_route', departedAt: new Date().toISOString(), etaMinutes: eta });
    sendNotifications('en_route', order, { eta });
  }

  function markArrived(order: Order) {
    updateVisit(order.id, { status: 'arrived', arrivedAt: new Date().toISOString() });
    sendNotifications('arrived', order);
  }

  function openChecklist(orderId: string) {
    updateVisit(orderId, { status: 'collecting' });
    setChecklistId(orderId);
  }

  // Open the tube guide / checklist in preview — no status change (safe from any state)
  function viewGuide(orderId: string) {
    setChecklistId(orderId);
  }

  async function markCollected(order: Order) {
    setChecklistId(null);
    updateVisit(order.id, { status: 'collected', collectedAt: new Date().toISOString() });
    sendNotifications('collected', order);
    try {
      await updateOrderStatus(order.id, 'sample_collected');
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'sample_collected' } : o));
    } catch (e) {
      console.error('Status update failed:', e);
    }
  }

  function confirmCancel() {
    if (!cancelId) return;
    updateVisit(cancelId, { status: 'cancelled', cancelReason: cancelReason || 'Not specified' });
    const order = orders.find(o => o.id === cancelId);
    if (order) sendNotifications('cancelled', order);
    setCancelId(null);
    setCancelReason('');
  }

  function toggleChecklist(orderId: string, key: keyof VisitState['checklist']) {
    setVisitStates(prev => {
      const cur = prev[orderId] ?? defaultVisitState();
      return { ...prev, [orderId]: { ...cur, checklist: { ...cur.checklist, [key]: !cur.checklist[key] } } };
    });
  }

  function markNotifsRead() {
    notifLog.current = notifLog.current.map(n => ({ ...n, read: true }));
    setNotifVersion(v => v + 1);
  }

  // ── Checklist modal order ─────────────────────────────────────────────────
  const checklistOrder = orders.find(o => o.id === checklistId);
  const checklistState = checklistId ? vState(checklistId) : null;
  const checklistDone  = checklistState
    ? Object.values(checklistState.checklist).every(Boolean)
    : false;

  // ── GPS indicator ────────────────────────────────────────────────────────
  const gpsInfo = {
    idle:       { icon: 'location_off',       color: '#9CA3AF', label: 'GPS Off' },
    requesting: { icon: 'location_searching', color: '#F59E0B', label: 'Locating…' },
    ok:         { icon: 'my_location',        color: TEAL,      label: myLat ? `${myLat.toFixed(3)}, ${myLng?.toFixed(3)}` : 'Live' },
    denied:     { icon: 'location_disabled',  color: '#EF4444', label: 'GPS Denied' },
    error:      { icon: 'location_off',       color: '#EF4444', label: 'GPS Error' },
  }[gpsStatus];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#EEF3F7', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {isAdmin && <Sidebar />}

      <div className={isAdmin ? 'ml-64' : ''}>

        {/* ── Header ── */}
        <header className="bg-white px-5 pb-4 shadow-sm sticky top-0 z-30" style={{ paddingTop: isAdmin ? '16px' : '44px' }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[18px] font-black" style={{ color: TEAL }}>DiagDesk</span>
                <span className="text-[10px] font-bold bg-[#17A077]/10 text-[#17A077] px-2 py-0.5 rounded-full uppercase tracking-wider">Field Ops</span>
                {isAdmin && <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full uppercase">Admin View</span>}
              </div>
              <p className="text-[13px] font-bold text-gray-800">{phName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="material-symbols-outlined text-[14px]" style={{ color: gpsInfo.color }}>{gpsInfo.icon}</span>
                <span className="text-[11px] text-gray-500">{gpsInfo.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowNotifs(true); markNotifsRead(); }}
                className="relative w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
                <span className="material-symbols-outlined text-gray-500 text-[22px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => { localStorage.removeItem('diagdesk_session'); window.location.href = '/login'; }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-500 text-[12px] font-semibold hover:border-red-300 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>logout</span>
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 pt-4 pb-28 flex flex-col gap-4">

          {/* ── Shift KPI Cards ── */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total',     value: orders.length,  color: '#6B7280', bg: 'bg-white' },
              { label: 'Remaining', value: remaining,       color: TEAL,      bg: 'bg-white' },
              { label: 'En Route',  value: enRouteOrder ? 1 : 0, color: '#F59E0B', bg: 'bg-white' },
              { label: 'Done',      value: completed,       color: TEAL,      bg: 'bg-[#17A077]',  textWhite: true },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-3 border border-gray-200 shadow-sm`}>
                <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${s.textWhite ? 'text-white/70' : 'text-gray-400'}`}>{s.label}</div>
                <div className={`text-[28px] font-black leading-none ${s.textWhite ? 'text-white' : ''}`} style={s.textWhite ? {} : { color: s.color }}>
                  {loading ? '…' : String(s.value).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>

          {/* ── Active Trip Banner ── */}
          {(enRouteOrder || arrivedOrder) && (() => {
            const active = enRouteOrder ?? arrivedOrder!;
            const vs = vState(active.id);
            const [areaName] = patientArea(active.id);
            const isEnRoute = vs.status === 'en_route';
            const elapsed = vs.departedAt
              ? Math.floor((Date.now() - new Date(vs.departedAt).getTime()) / 60_000)
              : 0;
            const remaining_eta = Math.max(0, (vs.etaMinutes ?? 15) - elapsed);

            return (
              <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: `linear-gradient(135deg, #0D4A3E, ${TEAL})` }}>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
                        {isEnRoute ? 'Trip Active — En Route' : 'Arrived — Collection in Progress'}
                      </span>
                    </div>
                    {isEnRoute && (
                      <div className="bg-white/15 rounded-xl px-3 py-1">
                        <span className="text-white font-black text-[18px]">{remaining_eta}</span>
                        <span className="text-white/60 text-[11px] ml-1">min ETA</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[22px]">person</span>
                    </div>
                    <div>
                      <div className="font-black text-white text-[16px]">{active.patient_name ?? '—'}</div>
                      <div className="text-white/70 text-[12px]">{areaName} · {(active.items ?? []).slice(0, 2).map(i => i.test_name).join(', ')}</div>
                    </div>
                  </div>
                  {isEnRoute && (
                    <button
                      onClick={() => markArrived(active)}
                      className="mt-3 w-full py-2.5 rounded-xl text-[13px] font-bold bg-white text-[#0D4A3E] active:opacity-80">
                      I've Arrived at Patient's Location
                    </button>
                  )}
                  {!isEnRoute && (
                    <button
                      onClick={() => openChecklist(active.id)}
                      className="mt-3 w-full py-2.5 rounded-xl text-[13px] font-bold bg-white text-[#0D4A3E] active:opacity-80 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">assignment</span>
                      Open Collection Checklist
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Tab Bar ── */}
          <div className="flex bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            {([
              { key: 'visits',        label: 'Visit Queue',    icon: 'route',         badge: remaining },
              { key: 'notifications', label: 'Notifications',  icon: 'notifications', badge: unreadCount },
            ] as const).map(t => (
              <button key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${activeTab === t.key ? 'bg-[#17A077]/5' : ''}`}>
                <div className="relative">
                  <span className="material-symbols-outlined text-[22px]"
                    style={{ color: activeTab === t.key ? TEAL : '#9CA3AF', fontVariationSettings: activeTab === t.key ? "'FILL' 1" : "'FILL' 0" }}>
                    {t.icon}
                  </span>
                  {t.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                      {t.badge > 9 ? '9+' : t.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold" style={{ color: activeTab === t.key ? TEAL : '#9CA3AF' }}>{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── VISITS TAB ── */}
          {activeTab === 'visits' && (
            <>
              {loading ? (
                <div className="bg-white rounded-2xl p-6 text-center text-gray-400">Loading visits…</div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-gray-300">event_available</span>
                  <p className="text-gray-400 mt-2">No visits assigned today</p>
                </div>
              ) : (
                sortedOrders.map(order => {
                  const vs    = vState(order.id);
                  const isDone = vs.status === 'collected' || vs.status === 'cancelled';
                  const [areaName, , ] = patientArea(order.id);
                  const distKm = getDistKm(order);
                  const eta    = getETA(order);
                  const tests  = (order.items ?? []).map(i => i.test_name).join(', ');
                  const tubes  = getTubesNeeded(order.items ?? []);
                  const time   = fmtTime(order.ordered_at);

                  const borderStyle: React.CSSProperties = vs.status === 'en_route'
                    ? { border: `2px solid ${TEAL}`, boxShadow: `0 0 0 3px ${TEAL}22` }
                    : vs.status === 'arrived' || vs.status === 'collecting'
                    ? { border: '2px solid #F59E0B', boxShadow: '0 0 0 3px #F59E0B22' }
                    : vs.status === 'collected'
                    ? { border: `1px solid ${TEAL}`, background: '#F0FDF4' }
                    : vs.status === 'cancelled'
                    ? { border: '1px solid #FCA5A5', background: '#FFF5F5' }
                    : { border: '1px solid #E5E7EB' };

                  return (
                    <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm" style={borderStyle}>
                      {/* Top row */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Status badge */}
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                            style={
                              vs.status === 'collected'   ? { background: TEAL,     color: '#fff' } :
                              vs.status === 'cancelled'   ? { background: '#EF4444', color: '#fff' } :
                              vs.status === 'en_route'    ? { background: TEAL,     color: '#fff' } :
                              vs.status === 'arrived' || vs.status === 'collecting' ? { background: '#F59E0B', color: '#fff' } :
                              { background: '#DCE8F0', color: '#4A6580' }
                            }>
                            {vs.status === 'scheduled'  ? 'Upcoming' :
                             vs.status === 'en_route'   ? '🚗 En Route' :
                             vs.status === 'arrived'    ? '🔔 Arrived' :
                             vs.status === 'collecting' ? '🧪 Collecting' :
                             vs.status === 'collected'  ? '✅ Done' : '✖ Cancelled'}
                          </span>
                          {/* Location badge */}
                          <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>location_on</span>
                            {areaName}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <div className="text-[16px] font-black text-gray-800 leading-none">{time}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">₹{order.total.toLocaleString('en-IN')}</div>
                        </div>
                      </div>

                      {/* Patient info */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-500 flex-shrink-0">
                          {(order.patient_name ?? 'P')[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-[15px] text-gray-900"
                            style={isDone ? { textDecoration: 'line-through', color: '#9CA3AF' } : {}}>
                            {order.patient_name ?? 'Unknown Patient'}
                          </h3>
                          <p className="text-[12px] text-gray-500 mt-0.5">
                            {order.patient_age ? `${order.patient_age}y` : ''}{order.patient_sex ? ` · ${order.patient_sex}` : ''}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{tests}</p>
                        </div>
                      </div>

                      {/* Distance + Tube guide (for upcoming & en route) */}
                      {!isDone && vs.status !== 'collected' && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          <div className="flex items-center gap-1.5 bg-blue-50 rounded-lg px-2.5 py-1.5">
                            <span className="material-symbols-outlined text-blue-500" style={{ fontSize: 14 }}>directions_car</span>
                            <span className="text-[11px] font-bold text-blue-700">{distKm.toFixed(1)} km · ~{eta} min</span>
                          </div>
                          {tubes.map(t => (
                            <div key={t.name} className={`flex items-center gap-1.5 ${t.bgClass} rounded-lg px-2.5 py-1.5 border ${t.borderClass}`}>
                              <div className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ background: t.color, borderColor: t.color }}></div>
                              <span className="text-[11px] font-bold" style={{ color: t.color }}>{t.name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Collected time */}
                      {vs.status === 'collected' && vs.collectedAt && (
                        <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2 mb-3">
                          <span className="material-symbols-outlined text-[#17A077]" style={{ fontSize: 18 }}>check_circle</span>
                          <div>
                            <span className="text-[12px] font-bold text-[#17A077]">Sample collected at {fmtTime(vs.collectedAt)}</span>
                            <p className="text-[10px] text-gray-500 mt-0.5">Notifications sent to patient and lab ✓</p>
                          </div>
                        </div>
                      )}

                      {/* Cancelled */}
                      {vs.status === 'cancelled' && (
                        <div className="bg-red-50 rounded-xl px-3 py-2 mb-3">
                          <span className="text-[12px] font-bold text-red-600">Cancelled: {vs.cancelReason}</span>
                        </div>
                      )}

                      {/* Print Label button — available for ALL statuses */}
                      <button onClick={() => setLabelOrderId(order.id)}
                        className="w-full mb-2 py-2 rounded-xl text-[12px] font-bold border-2 flex items-center justify-center gap-1.5"
                        style={{ borderColor: '#6366F1', color: '#6366F1' }}>
                        <span className="material-symbols-outlined text-[16px]">label</span>
                        Print Sample Labels
                      </button>

                      {/* Actions */}
                      {vs.status === 'scheduled' && (
                        <div className="flex flex-col gap-2">
                          {/* Sample guide — always accessible */}
                          <button onClick={() => viewGuide(order.id)}
                            className="w-full py-2 rounded-xl text-[12px] font-bold border-2 flex items-center justify-center gap-1.5"
                            style={{ borderColor: '#9333EA', color: '#9333EA' }}>
                            <span className="material-symbols-outlined text-[16px]">science</span>
                            View Tube Guide &amp; Collection Checklist
                          </button>
                          <div className="flex gap-2">
                            <button onClick={() => startTrip(order)}
                              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-1.5"
                              style={{ background: TEAL }}>
                              <span className="material-symbols-outlined text-[16px]">directions_car</span>
                              Start Trip
                            </button>
                            <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(areaName + ', Bangalore')}`, '_blank')}
                              className="px-4 py-2.5 rounded-xl border text-[13px] font-bold"
                              style={{ borderColor: TEAL, color: TEAL }}>
                              <span className="material-symbols-outlined text-[16px]">map</span>
                            </button>
                            <button onClick={() => setCancelId(order.id)}
                              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-[13px] font-bold">
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {vs.status === 'en_route' && (
                        <button onClick={() => markArrived(order)}
                          className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white"
                          style={{ background: '#F59E0B' }}>
                          I've Arrived at Patient's Location
                        </button>
                      )}

                      {(vs.status === 'arrived' || vs.status === 'collecting') && (
                        <div className="flex gap-2">
                          <button onClick={() => openChecklist(order.id)}
                            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-1.5"
                            style={{ background: '#F59E0B' }}>
                            <span className="material-symbols-outlined text-[16px]">assignment</span>
                            Collection Checklist
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {activeTab === 'notifications' && (
            <div className="flex flex-col gap-3">
              {notifVersion >= 0 && notifLog.current.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center">
                  <span className="material-symbols-outlined text-4xl text-gray-300">notifications_off</span>
                  <p className="text-gray-400 mt-2 text-sm">No notifications yet</p>
                  <p className="text-gray-400 text-xs mt-1">Start a trip to trigger notifications</p>
                </div>
              ) : (
                notifLog.current.map(n => (
                  <div key={n.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                    <div className={`flex items-center gap-2 px-4 py-2 ${n.recipient === 'patient' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                      <span className="material-symbols-outlined text-[16px]" style={{ color: n.recipient === 'patient' ? '#3B82F6' : '#7C3AED' }}>
                        {n.recipient === 'patient' ? 'smartphone' : 'local_hospital'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: n.recipient === 'patient' ? '#2563EB' : '#6D28D9' }}>
                        → {n.recipient === 'patient' ? 'Patient SMS/WhatsApp' : 'Lab Notification'}
                      </span>
                      <span className="ml-auto text-[10px] text-gray-400">{relTime(n.ts)}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={
                          n.event === 'collected'  ? { background: '#D1FAE5', color: '#065F46' } :
                          n.event === 'en_route'   ? { background: '#FEF3C7', color: '#92400E' } :
                          n.event === 'arrived'    ? { background: '#DBEAFE', color: '#1E40AF' } :
                          n.event === 'cancelled'  ? { background: '#FEE2E2', color: '#991B1B' } :
                          { background: '#F3F4F6', color: '#374151' }
                        }>
                        {n.event.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-[11px] font-bold text-gray-500 mb-1">To: {n.patientName}</div>
                      <p className="text-[13px] text-gray-700 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </main>

        {/* ── Bottom Nav ── */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-4 pt-3 pb-6 z-20" style={{ left: isAdmin ? '256px' : '0' }}>
          {[
            { key: 'visits',        icon: 'route',         label: 'Visits',    badge: remaining },
            { key: 'notifications', icon: 'notifications', label: 'Notifs',    badge: unreadCount },
          ].map(t => (
            <button key={t.key} className="flex flex-col items-center gap-1 relative"
              onClick={() => setActiveTab(t.key as typeof activeTab)}>
              <div className="relative">
                <span className="material-symbols-outlined text-[24px]"
                  style={{ color: activeTab === t.key ? TEAL : '#9CA3AF', fontVariationSettings: activeTab === t.key ? "'FILL' 1" : "'FILL' 0" }}>
                  {t.icon}
                </span>
                {t.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-black text-white flex items-center justify-center">
                    {t.badge > 9 ? '9+' : t.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold" style={{ color: activeTab === t.key ? TEAL : '#9CA3AF' }}>{t.label}</span>
            </button>
          ))}
        </nav>

      </div>{/* end ml-64 wrapper */}

      {/* ── OVERLAY: Notification Panel (bell icon) ── */}
      {showNotifs && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowNotifs(false)}></div>
          <div className="w-full max-w-sm bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200" style={{ background: TEAL }}>
              <div className="flex items-center gap-2 text-white">
                <span className="material-symbols-outlined">notifications</span>
                <span className="font-bold">Notifications</span>
                <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{notifLog.current.length}</span>
              </div>
              <button onClick={() => setShowNotifs(false)} className="text-white/70 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifLog.current.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <span className="material-symbols-outlined text-4xl opacity-30">notifications_off</span>
                  <p className="mt-2 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifLog.current.map(n => (
                  <div key={n.id} className="border-b border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[14px]" style={{ color: n.recipient === 'patient' ? '#3B82F6' : '#7C3AED' }}>
                        {n.recipient === 'patient' ? 'smartphone' : 'local_hospital'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500">{n.patientName}</span>
                      <span className="ml-auto text-[10px] text-gray-400">{relTime(n.ts)}</span>
                    </div>
                    <p className="text-[12px] text-gray-700 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Pre-Collection Checklist ── */}
      {checklistId && checklistOrder && checklistState && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full bg-white rounded-t-3xl max-h-[90vh] flex flex-col" style={{ marginLeft: isAdmin ? '256px' : '0' }}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[17px] text-gray-900">
                    {checklistState.status === 'scheduled' ? 'Tube Guide & Checklist' : 'Pre-Collection Checklist'}
                  </span>
                  {checklistState.status === 'scheduled' && (
                    <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Preview</span>
                  )}
                </div>
                <button onClick={() => setChecklistId(null)} className="text-gray-400">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <p className="text-[13px] font-bold" style={{ color: TEAL }}>{checklistOrder.patient_name}</p>
              <p className="text-[11px] text-gray-500">{(checklistOrder.items ?? []).map(i => i.test_name).join(', ')}</p>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {/* Tube guide */}
              {getTubesNeeded(checklistOrder.items ?? []).map(tube => (
                <div key={tube.name} className={`rounded-2xl p-4 border-2 ${tube.bgClass} ${tube.borderClass}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full border-4 flex-shrink-0" style={{ background: tube.color, borderColor: tube.color }}></div>
                    <div>
                      <div className="font-bold text-[14px] text-gray-800">{tube.name}</div>
                      <div className="text-[11px] text-gray-500">For: {tube.tests.filter(t => (checklistOrder.items ?? []).some(i => i.test_name.includes(t) || tube.tests.includes(i.test_name))).join(', ') || (checklistOrder.items ?? []).slice(0, 2).map(i => i.test_name).join(', ')}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 bg-white/60 rounded-xl px-3 py-2">{tube.prepNote}</p>
                </div>
              ))}

              {/* Checklist items */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Verify before collection</p>
                {([
                  { key: 'patientId' as const,  icon: 'badge',         label: 'Patient ID verified (Aadhaar / Hospital ID)' },
                  { key: 'fasting'   as const,  icon: 'no_food',       label: 'Fasting status confirmed (if required)' },
                  { key: 'tubesReady' as const, icon: 'science',       label: 'Correct tubes selected and labelled' },
                  { key: 'labelsReady' as const,icon: 'qr_code',       label: 'Barcode labels printed and attached' },
                  { key: 'consent'   as const,  icon: 'task_alt',      label: 'Patient verbal consent obtained' },
                ]).map(item => (
                  <button key={item.key}
                    onClick={() => toggleChecklist(checklistId, item.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${checklistState.checklist[item.key] ? 'border-[#17A077] bg-[#17A077]/5' : 'border-gray-200 bg-white'}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${checklistState.checklist[item.key] ? 'bg-[#17A077]' : 'bg-gray-200'}`}>
                      {checklistState.checklist[item.key]
                        ? <span className="material-symbols-outlined text-white text-[16px]">check</span>
                        : <span className="material-symbols-outlined text-gray-400 text-[16px]">{item.icon}</span>}
                    </div>
                    <span className={`text-[13px] font-semibold ${checklistState.checklist[item.key] ? 'text-[#17A077]' : 'text-gray-700'}`}>{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>Checklist progress</span>
                  <span>{Object.values(checklistState.checklist).filter(Boolean).length} / 5</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Object.values(checklistState.checklist).filter(Boolean).length / 5 * 100}%`, background: TEAL }}></div>
                </div>
              </div>
            </div>

            {/* Footer action */}
            <div className="px-5 py-4 border-t border-gray-200 flex-shrink-0">
              {checklistState.status === 'scheduled' ? (
                // Preview mode — just close
                <button onClick={() => setChecklistId(null)}
                  className="w-full py-4 rounded-2xl text-[15px] font-black border-2 transition-all"
                  style={{ borderColor: TEAL, color: TEAL }}>
                  Close Guide
                </button>
              ) : (
                <button
                  disabled={!checklistDone}
                  onClick={() => markCollected(checklistOrder)}
                  className="w-full py-4 rounded-2xl text-[15px] font-black text-white transition-all active:scale-98 disabled:opacity-40"
                  style={{ background: checklistDone ? TEAL : '#9CA3AF' }}>
                  {checklistDone ? '✅ Mark Sample Collected' : `Complete all ${5 - Object.values(checklistState.checklist).filter(Boolean).length} remaining items`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Cancel Reason ── */}
      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="font-black text-[17px] text-gray-900 mb-4">Cancel Visit</h3>
            <p className="text-[13px] text-gray-500 mb-4">Please select a reason for cancellation. The patient and lab will be notified.</p>
            <div className="space-y-2 mb-4">
              {['Patient not available', 'Patient refused', 'Incorrect address', 'Medical emergency', 'Vehicle breakdown', 'Other'].map(r => (
                <button key={r}
                  onClick={() => setCancelReason(r)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-[13px] font-semibold transition-colors ${cancelReason === r ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-700'}`}>
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setCancelId(null); setCancelReason(''); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-[13px] font-bold">
                Back
              </button>
              <button onClick={confirmCancel} disabled={!cancelReason}
                className="flex-1 py-3 rounded-xl text-white text-[13px] font-bold disabled:opacity-40"
                style={{ background: '#EF4444' }}>
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Barcode Label Modal ── */}
      {labelOrderId && (() => {
        const labelOrder = orders.find(o => o.id === labelOrderId);
        if (!labelOrder) return null;
        return (
          <BarcodeLabelModal
            order={labelOrder}
            collectorName={phName}
            onClose={() => setLabelOrderId(null)}
          />
        );
      })()}

    </div>
  );
}
