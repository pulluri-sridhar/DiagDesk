import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_HOME, getSelectedModule, type Role } from '../lib/auth';

type DemoUser = { role: Role; name: string; email: string; };

const MEDIDESK_ROLES: DemoUser[] = [
  { role: 'doctor',       name: 'Doctor',      email: 'anita.sharma@lumina.com' },
  { role: 'phlebotomist', name: 'Nurse',        email: 'ravi.kumar@lumina.com'   },
  { role: 'admin',        name: 'Admin',        email: 'admin@lumina.com'        },
  { role: 'lab_tech',     name: 'Lab/Path',     email: 'lab@lumina.com'          },
  { role: 'pharmacist',   name: 'Pharmacist',   email: 'pharmacy@lumina.com'     },
];

const DIAGDESK_ROLES: DemoUser[] = [
  { role: 'admin',        name: 'Admin',        email: 'admin@lumina.com'      },
  { role: 'phlebotomist', name: 'Phlebotomist', email: 'ravi.kumar@lumina.com' },
  { role: 'lab_tech',     name: 'Lab Tech',     email: 'lab@lumina.com'        },
  { role: 'pathologist',  name: 'Pathologist',  email: 'path@lumina.com'       },
  { role: 'patient',      name: 'Patient',      email: 'meera.iyer@lumina.com' },
];

const DEMO_PASSWORD = 'Demo@1234';

const PHARMDESK_ROLES: DemoUser[] = [
  { role: 'pharmacist', name: 'Pharmacist', email: 'pharmacy@lumina.com' },
  { role: 'admin',      name: 'Admin',      email: 'admin@lumina.com'    },
];

const MODULE_CONFIG = {
  medidesk: {
    name: 'MediDesk',
    tagline: 'Clinical & In-Patient Hospital Terminal',
    color: '#17A077',
    roles: MEDIDESK_ROLES,
    icon: 'local_hospital',
    features: ['OPD Queue & IPD Beds', 'Pharmacy & Prescriptions', 'Radiology & Lab', 'Medical History & SOAP Notes'],
  },
  diagdesk: {
    name: 'DiagDesk',
    tagline: 'Diagnostic Lab Platform Terminal',
    color: '#0891B2',
    roles: DIAGDESK_ROLES,
    icon: 'biotech',
    features: ['Patient Registration & Orders', 'Sample Tracking & Results', 'Reports & Pathology', 'Inventory & Invoicing'],
  },
  pharmdesk: {
    name: 'PharmaDesk',
    tagline: 'Pharmacy Management Platform',
    color: '#7C3AED',
    roles: PHARMDESK_ROLES,
    icon: 'local_pharmacy',
    features: ['Prescription Queue', 'Medicine Inventory & Alerts', 'Refill Center', 'Home Delivery Management'],
  },
};

export default function Login() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const mod        = getSelectedModule();
  const cfg        = MODULE_CONFIG[mod];

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [activeRole, setActiveRole] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const role = await signIn(email, password);
      navigate(ROLE_HOME[role], { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally { setLoading(false); }
  }

  function selectRole(user: DemoUser) {
    setEmail(user.email);
    setPassword(DEMO_PASSWORD);
    setActiveRole(user.role);
    setError('');
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center font-sans relative overflow-hidden px-4 py-10"
      style={{ background: 'linear-gradient(135deg,#0A1628 0%,#0D2137 55%,#091520 100%)' }}
    >
      {/* Background glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(ellipse,${cfg.color}15 0%,transparent 70%)` }}
      />

      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-1.5 text-[12px] text-white/30 hover:text-white/60 transition-colors group z-10"
      >
        <span className="material-symbols-outlined text-[15px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
        Back
      </button>

      <div className="w-full max-w-md relative z-10">

        {/* Logo */}
        <div className="text-center mb-7">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <span className="material-symbols-outlined text-white text-[26px]">asterisk</span>
          </div>
          <h1 className="text-[26px] font-black text-white tracking-tight">MediCircle</h1>
          <p className="text-white/25 text-[9px] tracking-[0.2em] uppercase mt-1">Healthcare Platform Suite</p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-6 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(24px)' }}
        >
          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: `${cfg.color}20`, border: `1px solid ${cfg.color}40` }}
            >
              <span className="material-symbols-outlined text-[11px]" style={{ color: cfg.color }}>verified_user</span>
              <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: cfg.color }}>HIPAA Compliant & Encrypted</span>
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span className="text-white/30 text-[9px] font-semibold">{cfg.tagline}</span>
            </div>
          </div>

          {/* Module */}
          <div
            className="flex items-center gap-3 p-3 rounded-2xl mb-4"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.color }}>
              <span className="material-symbols-outlined text-white text-[18px]">{cfg.icon}</span>
            </div>
            <div>
              <p className="text-white font-bold text-[14px] leading-none">{cfg.name}</p>
              <p className="text-white/30 text-[10px] mt-0.5">Selected module</p>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {cfg.features.map(f => (
              <span
                key={f}
                className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                style={{ background: `${cfg.color}15`, color: cfg.color, border: `1px solid ${cfg.color}28` }}
              >
                {f}
              </span>
            ))}
          </div>

          {/* Role tabs */}
          <div className="mb-5">
            <p className="text-white/25 text-[9px] font-bold uppercase tracking-[0.15em] mb-2">Select Staff Role</p>
            <div className="flex flex-wrap gap-1.5">
              {cfg.roles.map(r => (
                <button
                  key={r.role}
                  onClick={() => selectRole(r)}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                  style={
                    activeRole === r.role
                      ? { background: cfg.color, color: '#fff', boxShadow: `0 4px 12px ${cfg.color}50` }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }
                  }
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-white/25 text-[9px] font-bold uppercase tracking-[0.15em] block mb-1.5">
                Healthcare ID or Staff Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 text-[17px]">badge</span>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="dr.chen@medicircle.org"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-[13px] text-white placeholder:text-white/20 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', caretColor: cfg.color }}
                  onFocus={e => { e.target.style.borderColor = cfg.color; e.target.style.background = 'rgba(255,255,255,0.09)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-white/25 text-[9px] font-bold uppercase tracking-[0.15em]">Access Password</label>
                <button type="button" className="text-[10px] transition-colors" style={{ color: cfg.color }}>Forgot?</button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 text-[17px]">lock</span>
                <input
                  type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-[13px] text-white placeholder:text-white/20 outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', caretColor: cfg.color }}
                  onFocus={e => { e.target.style.borderColor = cfg.color; e.target.style.background = 'rgba(255,255,255,0.09)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
                />
                <button
                  type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[17px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] text-red-400 font-medium"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <span className="material-symbols-outlined text-[14px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-1"
              style={{ background: cfg.color, boxShadow: `0 8px 24px ${cfg.color}45` }}
            >
              {loading
                ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Signing in…</>
                : <>Continue to {cfg.name} <span className="material-symbols-outlined text-[16px]">arrow_forward</span></>
              }
            </button>
          </form>

          {/* Face ID */}
          <button className="w-full mt-3 py-2 flex items-center justify-center gap-1.5 text-[11px] text-white/25 hover:text-white/45 transition-colors">
            <span className="material-symbols-outlined text-[14px]">face_recognition</span>
            Clinical Face ID / Smart Badge Tap
          </button>
        </div>

        {/* Footer badges */}
        <div className="flex items-center justify-center gap-6 mt-5">
          {[
            { icon: 'verified_user', label: 'HIPAA Verified' },
            { icon: 'check_circle',  label: 'HL7/FHIR Ready' },
            { icon: 'lock',          label: '256-bit SSL' },
          ].map(b => (
            <div key={b.label} className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px] text-white/15">{b.icon}</span>
              <span className="text-[8px] font-bold text-white/15 uppercase tracking-widest">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
