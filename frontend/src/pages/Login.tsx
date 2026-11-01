import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_HOME, getSelectedModule, type Role } from '../lib/auth';

type DemoUser = { role: Role; name: string; email: string; icon: string; color: string; desc: string };

const MEDIDESK_CLINICAL: DemoUser[] = [
  { role: 'admin',        name: 'Admin',        email: 'admin@lumina.com',        icon: 'manage_accounts', color: '#17A077', desc: 'Dashboard · Hospital · Pharmacy' },
  { role: 'doctor',       name: 'Doctor',        email: 'anita.sharma@lumina.com', icon: 'stethoscope',     color: '#0D9460', desc: 'OPD · SOAP Notes · Reports' },
  { role: 'phlebotomist', name: 'Phlebotomist',  email: 'ravi.kumar@lumina.com',   icon: 'biotech',         color: '#1A7260', desc: 'Sample Collection' },
];
const MEDIDESK_STAFF: DemoUser[] = [
  { role: 'lab_tech',    name: 'Lab Technician', email: 'lab@lumina.com',      icon: 'science',        color: '#0891B2', desc: 'Registration · Reports' },
  { role: 'pathologist', name: 'Pathologist',    email: 'path@lumina.com',     icon: 'verified_user',  color: '#7C3AED', desc: 'Radiology · Review Queue' },
  { role: 'pharmacist',  name: 'Pharmacist',     email: 'pharmacy@lumina.com', icon: 'local_pharmacy', color: '#D97706', desc: 'Prescriptions · Delivery' },
];
const DIAGDESK_CLINICAL: DemoUser[] = [
  { role: 'admin',        name: 'Admin',        email: 'admin@lumina.com',      icon: 'manage_accounts', color: '#0891B2', desc: 'Dashboard · Inventory · Analytics' },
  { role: 'phlebotomist', name: 'Phlebotomist', email: 'ravi.kumar@lumina.com', icon: 'biotech',         color: '#0369A1', desc: 'Sample Collection' },
  { role: 'patient',      name: 'Patient',      email: 'meera.iyer@lumina.com', icon: 'person',          color: '#0284C7', desc: 'My Results · Reports' },
];
const DIAGDESK_STAFF: DemoUser[] = [
  { role: 'lab_tech',    name: 'Lab Technician', email: 'lab@lumina.com',  icon: 'science',       color: '#0369A1', desc: 'Registration · Reports' },
  { role: 'pathologist', name: 'Pathologist',    email: 'path@lumina.com', icon: 'verified_user', color: '#1D4ED8', desc: 'Review Queue · Reports' },
];

const DEMO_PASSWORD = 'Demo@1234';

const MODULE_CONFIG = {
  medidesk: {
    name: 'MediDesk', tagline: 'Hospital Management Platform',
    color: '#17A077', dimColor: '#0D9460',
    gradient: 'linear-gradient(145deg,#0A3D32 0%,#17A077 60%,#2ECC9A 100%)',
    clinical: MEDIDESK_CLINICAL, staff: MEDIDESK_STAFF,
    headline: <>Complete hospital<br />management suite.</>,
    features: ['OPD Queue · IPD Beds', 'Pharmacy & Prescriptions', 'Radiology · SOAP Notes'],
    icon: 'local_hospital',
  },
  diagdesk: {
    name: 'DiagDesk', tagline: 'Diagnostic Lab Platform',
    color: '#0891B2', dimColor: '#0369A1',
    gradient: 'linear-gradient(145deg,#082F49 0%,#0891B2 60%,#22D3EE 100%)',
    clinical: DIAGDESK_CLINICAL, staff: DIAGDESK_STAFF,
    headline: <>Unified diagnostics<br />platform for modern labs.</>,
    features: ['Patient Registration · Orders', 'Sample Tracking · Results', 'Reports · Inventory'],
    icon: 'biotech',
  },
};

export default function Login() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const mod        = getSelectedModule();
  const cfg        = MODULE_CONFIG[mod];

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [demoTab, setDemoTab]   = useState<'clinical' | 'staff'>('clinical');

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

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail); setPassword(DEMO_PASSWORD); setError('');
  }

  const demoUsers = demoTab === 'clinical' ? cfg.clinical : cfg.staff;

  return (
    <div className="min-h-screen flex font-sans bg-gray-50">

      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col relative overflow-hidden" style={{ background: cfg.gradient }}>
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fff,transparent)' }} />
          <div className="absolute bottom-20 -left-10 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fff,transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5" style={{ background: 'radial-gradient(circle,#fff,transparent)' }} />
        </div>

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Top nav */}
          <div className="flex items-center gap-2 mb-auto">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <span className="material-symbols-outlined text-white text-[16px]">hub</span>
            </div>
            <span className="text-white/60 text-[12px] font-semibold tracking-widest uppercase">MediCircle</span>
          </div>

          {/* Main content */}
          <div className="py-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-8" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <span className="material-symbols-outlined text-white text-[14px]">{cfg.icon}</span>
              <span className="text-white/80 text-[11px] font-semibold uppercase tracking-wider">{cfg.tagline}</span>
            </div>

            <h1 className="text-[42px] font-black text-white leading-tight mb-6">
              {cfg.headline}
            </h1>

            <div className="space-y-3">
              {cfg.features.map((f, i) => (
                <div key={f} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
                    <span className="text-white text-[11px] font-black">{i + 1}</span>
                  </div>
                  <span className="text-white/70 text-[13px] font-medium">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="text-white/25 text-[10px] uppercase tracking-widest">
            MediCircle · {cfg.name} · v1.0
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 lg:px-14 py-10">
        <div className="w-full max-w-[420px]">

          {/* Back */}
          <button onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-700 mb-8 transition-colors group">
            <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            Back to MediCircle
          </button>

          {/* Heading */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: cfg.gradient }}>
                <span className="material-symbols-outlined text-[18px]">{cfg.icon}</span>
              </div>
              <span className="text-[13px] font-bold" style={{ color: cfg.color }}>{cfg.name}</span>
            </div>
            <h2 className="text-[26px] font-black text-gray-900 leading-tight">Welcome back</h2>
            <p className="text-gray-400 text-[13px] mt-1">Sign in to your {cfg.name} workspace</p>
          </div>

          {/* Demo accounts */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Quick access</p>
              <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: '#F1F5F9' }}>
                {(['clinical', 'staff'] as const).map(t => (
                  <button key={t} onClick={() => setDemoTab(t)}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold capitalize transition-all ${demoTab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {demoUsers.map(d => (
                <button key={d.email} onClick={() => fillDemo(d.email)}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-transparent bg-white text-center transition-all hover:shadow-md group"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = d.color; e.currentTarget.style.background = `${d.color}08`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'white'; }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ background: d.color }}>
                    <span className="material-symbols-outlined text-[18px]">{d.icon}</span>
                  </div>
                  <p className="text-[10px] font-bold text-gray-700 leading-tight">{d.name}</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-300 text-center mt-2">Click a role to auto-fill credentials</p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-300 font-medium">or sign in manually</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-[18px]">mail</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@lumina.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-white text-[13px] text-gray-900 outline-none transition-all focus:bg-white"
                  onFocus={e => (e.target.style.borderColor = cfg.color)}
                  onBlur={e => (e.target.style.borderColor = '#F3F4F6')}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Password</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-[18px]">lock</span>
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-gray-100 bg-white text-[13px] text-gray-900 outline-none transition-all"
                  onFocus={e => (e.target.style.borderColor = cfg.color)}
                  onBlur={e => (e.target.style.borderColor = '#F3F4F6')}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] text-red-600 font-medium" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
              style={{ background: loading ? cfg.dimColor : cfg.gradient, boxShadow: `0 8px 20px ${cfg.color}35` }}>
              {loading
                ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Signing in…</>
                : <><span className="material-symbols-outlined text-[16px]">login</span> Sign in to {cfg.name}</>}
            </button>
          </form>

          <p className="text-center text-[11px] text-gray-300 mt-6">
            Demo password:{' '}
            <span className="font-mono font-bold text-gray-500">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
