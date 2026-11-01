import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_HOME, getSelectedModule, type Role } from '../lib/auth';

type DemoUser = { role: Role; name: string; email: string; icon: string; color: string; desc: string };

// ── MediDesk role cards ───────────────────────────────────────────────────────
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

// ── DiagDesk role cards ───────────────────────────────────────────────────────
const DIAGDESK_CLINICAL: DemoUser[] = [
  { role: 'admin',        name: 'Admin',        email: 'admin@lumina.com',        icon: 'manage_accounts', color: '#0891B2', desc: 'Dashboard · Inventory · Analytics' },
  { role: 'doctor',       name: 'Doctor',        email: 'anita.sharma@lumina.com', icon: 'stethoscope',     color: '#0C4A6E', desc: 'Reports · Orders' },
  { role: 'phlebotomist', name: 'Phlebotomist',  email: 'ravi.kumar@lumina.com',   icon: 'biotech',         color: '#0369A1', desc: 'Sample Collection' },
  { role: 'patient',      name: 'Patient',        email: 'meera.iyer@lumina.com',   icon: 'person',          color: '#0284C7', desc: 'My Results · Reports' },
];
const DIAGDESK_STAFF: DemoUser[] = [
  { role: 'lab_tech',    name: 'Lab Technician', email: 'lab@lumina.com',  icon: 'science',       color: '#0369A1', desc: 'Registration · Reports' },
  { role: 'pathologist', name: 'Pathologist',    email: 'path@lumina.com', icon: 'verified_user', color: '#1D4ED8', desc: 'Review Queue · Reports' },
];

const DEMO_PASSWORD = 'Demo@1234';

const MODULE_CONFIG = {
  medidesk: {
    name: 'MediDesk',
    tagline: 'Hospital Management Platform',
    color: '#17A077',
    gradient: 'linear-gradient(145deg,#0D4A3E 0%,#1A7260 45%,#2A9174 75%,#5BAAA0 100%)',
    clinical: MEDIDESK_CLINICAL,
    staff: MEDIDESK_STAFF,
    features: ['Hospital · Pharmacy · Lab', 'OPD Queue · IPD Beds', 'Radiology · SOAP Notes'],
  },
  diagdesk: {
    name: 'DiagDesk',
    tagline: 'Diagnostic Lab Platform',
    color: '#0891B2',
    gradient: 'linear-gradient(145deg,#0C4A6E 0%,#0369A1 45%,#0891B2 75%,#38BDF8 100%)',
    clinical: DIAGDESK_CLINICAL,
    staff: DIAGDESK_STAFF,
    features: ['Patient Registration · Orders', 'Sample Tracking · Results', 'Reports · Inventory'],
  },
};

export default function Login() {
  const { signIn }   = useAuth();
  const navigate     = useNavigate();
  const mod          = getSelectedModule();
  const cfg          = MODULE_CONFIG[mod];

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [demoTab, setDemoTab]   = useState<'clinical' | 'staff'>('clinical');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const role = await signIn(email, password);
      navigate(ROLE_HOME[role], { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed. Check your email and password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError('');
  }

  return (
    <div className="min-h-screen flex font-sans" style={{ background: '#F0F4F7' }}>
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-14 text-white"
        style={{ background: cfg.gradient }}
      >
        <div>
          <p className="text-white/50 text-[11px] mb-1 uppercase tracking-widest font-semibold">MediCircle</p>
          <h1 className="text-4xl font-black tracking-tight">{cfg.name}</h1>
          <p className="text-white/50 text-[11px] mt-1 uppercase tracking-widest font-semibold">{cfg.tagline}</p>
        </div>
        <div className="space-y-6">
          <p className="text-3xl font-bold leading-snug">
            {mod === 'medidesk'
              ? <>Complete hospital<br />management suite.</>
              : <>Unified diagnostics<br />platform for modern labs.</>}
          </p>
          <div className="space-y-2 text-white/60 text-sm">
            {cfg.features.map(t => (
              <div key={t} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-white/40"></span>{t}
              </div>
            ))}
          </div>
        </div>
        <div className="text-white/25 text-[11px]">MediCircle · {cfg.name} · v1.0</div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 lg:px-16">
        <div className="w-full max-w-md">
          {/* Back to MediCircle */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-700 mb-6 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Back to MediCircle
          </button>

          {/* Mobile logo */}
          <div className="lg:hidden mb-6 text-center">
            <h1 className="text-3xl font-black tracking-tight" style={{ color: cfg.color }}>{cfg.name}</h1>
            <p className="text-on-surface-variant text-xs mt-1 uppercase tracking-widest">{cfg.tagline}</p>
          </div>

          <h2 className="text-2xl font-bold text-on-surface mb-1">Sign in to {cfg.name}</h2>
          <p className="text-on-surface-variant text-sm mb-6">Access your workspace</p>

          {/* Demo role cards */}
          <div className="mb-6">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Demo accounts — click to auto-fill
            </p>
            {/* Tab switcher */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-3">
              <button
                onClick={() => setDemoTab('clinical')}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${demoTab === 'clinical' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Clinical
              </button>
              <button
                onClick={() => setDemoTab('staff')}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${demoTab === 'staff' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Staff
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(demoTab === 'clinical' ? cfg.clinical : cfg.staff).map(d => (
                <button
                  key={d.email}
                  onClick={() => fillDemo(d.email)}
                  className="flex items-center gap-2 p-3 bg-white border border-outline-variant rounded-xl text-left transition-all hover:shadow-sm"
                  onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: d.color }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{d.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-on-surface truncate">{d.name}</p>
                    <p className="text-[10px] text-on-surface-variant truncate">{d.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@lumina.com"
                className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface bg-white outline-none transition-all"
                onFocus={e => (e.target.style.borderColor = cfg.color)}
                onBlur={e => (e.target.style.borderColor = '')}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface bg-white outline-none transition-all"
                onFocus={e => (e.target.style.borderColor = cfg.color)}
                onBlur={e => (e.target.style.borderColor = '')}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ background: cfg.color }}
            >
              {loading
                ? <><span className="material-symbols-outlined text-sm" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>Signing in…</>
                : `Sign in to ${cfg.name}`}
            </button>
          </form>

          <p className="text-center text-[11px] text-on-surface-variant mt-6">
            Demo password for all accounts:{' '}
            <span className="font-mono font-bold text-on-surface">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
