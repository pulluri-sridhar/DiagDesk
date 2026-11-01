import { useState } from 'react';

type RequestType = 'Schedule Change' | 'Care Plan Update' | 'Caregiver Preference' | 'Medical Equipment' | 'Emergency Visit' | 'Service Addition';
type RequestStatus = 'pending' | 'in_review' | 'approved' | 'denied';
type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface CareRequest {
  id: string; type: RequestType; patient: string; submittedBy: string;
  description: string; priority: Priority; status: RequestStatus;
  submittedAt: string; resolvedAt?: string; assignedTo?: string; notes?: string;
}

const MOCK_REQUESTS: CareRequest[] = [
  {
    id: 'CR-001', type: 'Schedule Change', patient: 'Meera Iyer', submittedBy: 'Family (Suresh Iyer)',
    description: 'Request to move physiotherapy session from 10 AM to 8 AM on weekdays due to work schedule conflicts in the family.',
    priority: 'medium', status: 'pending', submittedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    assignedTo: 'Admin',
  },
  {
    id: 'CR-002', type: 'Emergency Visit', patient: 'Vikram Sharma', submittedBy: 'Family (Asha Sharma)',
    description: 'Patient has developed fever since last evening. Requesting an urgent nursing assessment today if possible.',
    priority: 'urgent', status: 'in_review', submittedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
    assignedTo: 'Dr. Anita Sharma',
  },
  {
    id: 'CR-003', type: 'Caregiver Preference', patient: 'Rajesh Kumar', submittedBy: 'Patient',
    description: 'Request to have Ravi Kumar continue as primary phlebotomist for all visits. Very comfortable with his technique.',
    priority: 'low', status: 'approved', submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    notes: 'Approved. Ravi Kumar set as primary phlebotomist for all future visits.',
  },
  {
    id: 'CR-004', type: 'Medical Equipment', patient: 'Sunita Verma', submittedBy: 'Family',
    description: 'Request for a portable blood pressure monitor to be left at the patient home for daily self-monitoring.',
    priority: 'medium', status: 'approved', submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    notes: 'BP monitor provided. Family briefed on correct usage and recording.',
  },
  {
    id: 'CR-005', type: 'Care Plan Update', patient: 'Arjun Reddy', submittedBy: 'Patient',
    description: 'Wound appears to have healed significantly faster than expected. Requesting evaluation to reduce dressing change from daily to every other day.',
    priority: 'medium', status: 'pending', submittedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'CR-006', type: 'Service Addition', patient: 'Kavitha Rao', submittedBy: 'Family',
    description: 'Looking to add physiotherapy sessions alongside IV infusion to improve mobility during recovery from infection.',
    priority: 'low', status: 'denied', submittedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    resolvedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    notes: 'Denied at this time. Patient not yet stable enough for concurrent physio. Will reassess in 2 weeks.',
  },
];

const PRIORITY_META: Record<Priority, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: '#6B7280', bg: '#F3F4F6' },
  medium: { label: 'Medium', color: '#0891B2', bg: '#E0F4F9' },
  high:   { label: 'High',   color: '#D97706', bg: '#FEF3C7' },
  urgent: { label: 'Urgent', color: '#EF4444', bg: '#FEF2F2' },
};

const STATUS_META: Record<RequestStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Pending',   color: '#6B7280', bg: '#F3F4F6', icon: 'schedule'      },
  in_review: { label: 'In Review', color: '#7C3AED', bg: '#EDE9FE', icon: 'manage_search' },
  approved:  { label: 'Approved',  color: '#17A077', bg: '#D1FAE5', icon: 'check_circle'  },
  denied:    { label: 'Denied',    color: '#EF4444', bg: '#FEF2F2', icon: 'cancel'        },
};

const REQUEST_TYPES: RequestType[] = [
  'Schedule Change', 'Care Plan Update', 'Caregiver Preference',
  'Medical Equipment', 'Emergency Visit', 'Service Addition',
];

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000)  return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

interface NewForm {
  patient: string; type: RequestType; description: string; priority: Priority;
}

export default function CareRequestsPanel() {
  const [requests, setRequests] = useState<CareRequest[]>(MOCK_REQUESTS);
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'all'>('all');
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showNew, setShowNew]           = useState(false);
  const [form, setForm] = useState<NewForm>({
    patient: '', type: 'Schedule Change', description: '', priority: 'medium',
  });

  const counts = {
    total:     requests.length,
    pending:   requests.filter(r => r.status === 'pending').length,
    in_review: requests.filter(r => r.status === 'in_review').length,
    approved:  requests.filter(r => r.status === 'approved').length,
    denied:    requests.filter(r => r.status === 'denied').length,
  };

  const filtered = filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus);

  function changeStatus(id: string, status: RequestStatus) {
    setRequests(prev => prev.map(r => r.id === id
      ? { ...r, status, ...((['approved', 'denied'].includes(status)) ? { resolvedAt: new Date().toISOString() } : {}) }
      : r));
  }

  function submitRequest() {
    if (!form.patient.trim() || !form.description.trim()) return;
    const r: CareRequest = {
      id: `CR-${String(requests.length + 1).padStart(3, '0')}`,
      type: form.type, patient: form.patient.trim(), submittedBy: 'Admin',
      description: form.description.trim(), priority: form.priority,
      status: 'pending', submittedAt: new Date().toISOString(),
    };
    setRequests(prev => [r, ...prev]);
    setForm({ patient: '', type: 'Schedule Change', description: '', priority: 'medium' });
    setShowNew(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {([
          ['Pending',   counts.pending,   'schedule',      '#D97706', '#FEF3C7'],
          ['In Review', counts.in_review, 'manage_search', '#7C3AED', '#EDE9FE'],
          ['Approved',  counts.approved,  'check_circle',  '#17A077', '#D1FAE5'],
          ['Denied',    counts.denied,    'cancel',        '#EF4444', '#FEF2F2'],
        ] as const).map(([label, val, icon, color, bg]) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
              <span className="material-symbols-outlined text-[20px]" style={{ color }}>{icon}</span>
            </div>
            <div>
              <p className="text-[24px] font-black text-gray-900 leading-none">{val}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setFilterStatus('all')}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
            style={filterStatus === 'all' ? { background: '#111827', color: '#fff' } : { background: '#F3F4F6', color: '#6B7280' }}>
            All ({counts.total})
          </button>
          {(['pending', 'in_review', 'approved', 'denied'] as RequestStatus[]).map(s => {
            const m = STATUS_META[s];
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1"
                style={filterStatus === s ? { background: m.color, color: '#fff' } : { background: m.bg, color: m.color }}>
                <span className="material-symbols-outlined text-[11px]">{m.icon}</span>
                {m.label}
              </button>
            );
          })}
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-[12px] font-bold"
          style={{ background: '#D97706', boxShadow: '0 4px 12px rgba(217,119,6,0.25)' }}>
          <span className="material-symbols-outlined text-[15px]">add</span>
          New Request
        </button>
      </div>

      {/* Request cards */}
      <div className="space-y-3">
        {filtered.map(r => {
          const sm = STATUS_META[r.status];
          const pm = PRIORITY_META[r.priority];
          const open = expandedId === r.id;
          return (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <p className="text-[13px] font-black text-gray-900">{r.type}</p>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: pm.bg, color: pm.color }}>{pm.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-0.5"
                      style={{ background: sm.bg, color: sm.color }}>
                      <span className="material-symbols-outlined text-[10px]">{sm.icon}</span>
                      {sm.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-1">
                    <span className="font-semibold text-gray-700">{r.patient}</span>
                    <span className="mx-1.5 text-gray-300">·</span>
                    By {r.submittedBy}
                    <span className="mx-1.5 text-gray-300">·</span>
                    {relTime(r.submittedAt)}
                  </p>
                  <p className={`text-[12px] text-gray-600 ${open ? '' : 'line-clamp-2'}`}>{r.description}</p>
                </div>
                <button onClick={() => setExpandedId(open ? null : r.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 mt-0.5">
                  <span className="material-symbols-outlined text-[18px] block transition-transform"
                    style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
                    expand_more
                  </span>
                </button>
              </div>

              {open && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  {r.assignedTo && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="material-symbols-outlined text-[14px] text-gray-400">person</span>
                      <span className="text-gray-500">Assigned to</span>
                      <span className="font-bold text-gray-800">{r.assignedTo}</span>
                    </div>
                  )}

                  {r.notes && (
                    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-1">Resolution Notes</p>
                      <p className="text-[11px] text-gray-700 leading-snug">{r.notes}</p>
                    </div>
                  )}

                  {r.resolvedAt && (
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">schedule</span>
                      Resolved {relTime(r.resolvedAt)}
                    </p>
                  )}

                  {/* Action buttons */}
                  {r.status === 'pending' && (
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => changeStatus(r.id, 'in_review')}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors">
                        Mark In Review
                      </button>
                      <button onClick={() => changeStatus(r.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-green-200 text-green-600 hover:bg-green-50 transition-colors">
                        Approve
                      </button>
                      <button onClick={() => changeStatus(r.id, 'denied')}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                        Deny
                      </button>
                    </div>
                  )}
                  {r.status === 'in_review' && (
                    <div className="flex gap-2">
                      <button onClick={() => changeStatus(r.id, 'approved')}
                        className="px-4 py-1.5 rounded-lg text-[11px] font-bold text-white transition-colors"
                        style={{ background: '#17A077' }}>
                        Approve
                      </button>
                      <button onClick={() => changeStatus(r.id, 'denied')}
                        className="px-4 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                        Deny
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <span className="material-symbols-outlined text-[40px] block mb-2">inbox</span>
            <p className="text-[13px]">No requests match your filter</p>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[15px] font-black text-gray-900">New Care Request</h3>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Patient Name</label>
                <input value={form.patient} onChange={e => setForm(f => ({ ...f, patient: e.target.value }))}
                  placeholder="e.g. Meera Iyer"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none focus:border-[#D97706] focus:bg-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Request Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as RequestType }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none">
                  {REQUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the request in detail…"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none resize-none h-24 focus:border-[#D97706] focus:bg-white" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowNew(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-bold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={submitRequest}
                className="flex-1 py-2.5 rounded-xl text-white text-[13px] font-bold"
                style={{ background: '#D97706', boxShadow: '0 4px 12px rgba(217,119,6,0.25)' }}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
