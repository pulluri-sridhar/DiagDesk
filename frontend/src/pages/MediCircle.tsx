import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_HOME, setSelectedModule, type AppModule, type Role } from '../lib/auth';

type RoleOption = { role: Role; name: string; email: string };

const MODULES: {
  id: AppModule; name: string; tagline: string; color: string; icon: string;
  features: string[]; roles: RoleOption[];
}[] = [
  {
    id: 'medidesk',
    name: 'MediDesk',
    tagline: 'Complete Hospital Management',
    color: '#17A077',
    icon: 'local_hospital',
    features: ['OPD Queue & IPD Beds', 'Pharmacy & Prescriptions', 'Radiology & Lab', 'Medical History & SOAP Notes'],
    roles: [
      { role: 'doctor',       name: 'Doctor',    email: 'anita.sharma@lumina.com' },
      { role: 'phlebotomist', name: 'Nurse',      email: 'ravi.kumar@lumina.com'   },
      { role: 'admin',        name: 'Admin',      email: 'admin@lumina.com'        },
      { role: 'lab_tech',     name: 'Lab/PACS',  email: 'lab@lumina.com'          },
    ],
  },
  {
    id: 'diagdesk',
    name: 'DiagDesk',
    tagline: 'Diagnostic Lab Platform',
    color: '#0891B2',
    icon: 'biotech',
    features: ['Patient Registration & Orders', 'Sample Tracking & Results', 'Reports & Pathology', 'Inventory & Invoicing'],
    roles: [
      { role: 'admin',        name: 'Admin',        email: 'admin@lumina.com'      },
      { role: 'phlebotomist', name: 'Phlebotomist', email: 'ravi.kumar@lumina.com' },
      { role: 'lab_tech',     name: 'Lab Tech',     email: 'lab@lumina.com'        },
      { role: 'pathologist',  name: 'Pathologist',  email: 'path@lumina.com'       },
    ],
  },
];

const DEMO_PASSWORD = 'Demo@1234';

export default function MediCircle() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [selectedMod, setMod] = useState<AppModule>('medidesk');
  const [dropOpen, setDropOpen] = useState(false);
  const [activeRole, setActiveRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const mod = MODULES.find(m => m.id === selectedMod)!;

  function switchModule(id: AppModule) {
    setMod(id);
    setDropOpen(false);
    setActiveRole('');
    setEmail('');
    setPassword('');
    setError('');
  }

  function selectRole(r: RoleOption) {
    setActiveRole(r.role);
    setEmail(r.email);
    setPassword(DEMO_PASSWORD);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      setSelectedModule(selectedMod);
      const role = await signIn(email, password);
      navigate(ROLE_HOME[role], { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">

      {/* ── Dark green header ──────────────────────────────────────────── */}
      <div
        className="relative flex-shrink-0 pt-3 pb-16 overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#062E1F 0%,#0D5C3A 55%,#0A4530 100%)' }}
      >
        {/* Decorative glow circles */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full pointer-events-none opacity-10"
          style={{ background: 'radial-gradient(circle,#fff,transparent)' }} />
        <div className="absolute bottom-0 -left-10 w-52 h-52 rounded-full pointer-events-none opacity-5"
          style={{ background: 'radial-gradient(circle,#fff,transparent)' }} />

        {/* Status bar */}
        <div className="relative z-10 flex items-center justify-between px-5 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/40 text-[10px] font-medium tracking-wide">MediCloud Live · Node US-East</span>
          </div>
          <button
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-white/50"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            IT Helpdesk
          </button>
        </div>

        {/* HIPAA badge */}
        <div className="relative z-10 px-5 mb-4">
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(23,160,119,0.2)', border: '1px solid rgba(23,160,119,0.35)' }}
          >
            <span className="material-symbols-outlined text-green-400 text-[11px]">verified_user</span>
            <span className="text-green-400 text-[9px] font-bold uppercase tracking-widest">HIPAA Compliant & Encrypted</span>
          </div>
        </div>

        {/* Terminal label */}
        <div className="absolute bottom-20 right-5 z-10 flex items-center gap-2">
          <span className="text-white/20 text-[9px] uppercase tracking-wider">Clinical & In-Patient Hospital Terminal</span>
          <div
            className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white/30"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >STAFF v1</div>
        </div>

        {/* Logo */}
        <div className="relative z-10 text-center mt-1">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <span className="material-symbols-outlined text-white text-[22px]">asterisk</span>
          </div>
          <h1 className="text-[28px] font-black text-white tracking-tight">MediCircle</h1>
          <p className="text-white/35 text-[9px] tracking-[0.25em] uppercase mt-1">Healthcare Platform Suite</p>
        </div>
      </div>

      {/* ── White card slides up ───────────────────────────────────────── */}
      <div className="flex-1 -mt-8 rounded-t-3xl bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] overflow-auto">
        <div className="max-w-md mx-auto px-5 pt-6 pb-10">

          {/* Module selector */}
          <div className="mb-4">
            <h2 className="text-[16px] font-black text-gray-900">Select a module</h2>
            <p className="text-[11px] text-gray-400 mt-0.5 mb-3">Choose the platform you want to access</p>

            <div className="relative">
              <button
                onClick={() => setDropOpen(o => !o)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                style={{ borderColor: mod.color, background: `${mod.color}0A` }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: mod.color }}>
                  <span className="material-symbols-outlined text-[16px]">{mod.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 leading-none">{mod.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{mod.tagline}</p>
                </div>
                <span
                  className="material-symbols-outlined text-gray-400 text-[18px] flex-shrink-0 transition-transform"
                  style={{ transform: dropOpen ? 'rotate(180deg)' : 'none' }}
                >expand_more</span>
              </button>

              {dropOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden z-30">
                  {MODULES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => switchModule(m.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: m.color }}>
                        <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-gray-900">{m.name}</p>
                        <p className="text-[10px] text-gray-400">{m.tagline}</p>
                      </div>
                      {selectedMod === m.id && (
                        <span className="material-symbols-outlined ml-auto text-[16px]" style={{ color: m.color }}>check_circle</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {mod.features.map(f => (
              <span
                key={f}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                style={{ background: `${mod.color}12`, color: mod.color }}
              >{f}</span>
            ))}
          </div>

          {/* Role tabs */}
          <div className="mb-4">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2">Select Staff Role</p>
            <div className="flex flex-wrap gap-1.5">
              {mod.roles.map(r => (
                <button
                  key={r.role}
                  onClick={() => selectRole(r)}
                  className="px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                  style={activeRole === r.role
                    ? { background: mod.color, color: '#fff', boxShadow: `0 4px 12px ${mod.color}45` }
                    : { background: '#F1F5F9', color: '#64748B' }}
                >{r.name}</button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] block mb-1.5">
                Healthcare ID or Staff Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[16px]">badge</span>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="dr.chen@medicircle.org"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none transition-all"
                  onFocus={e => { e.target.style.borderColor = mod.color; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#F3F4F6'; e.target.style.background = '#F9FAFB'; }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">Access Password</label>
                <button type="button" className="text-[10px] font-semibold" style={{ color: mod.color }}>Forgot?</button>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[16px]">lock</span>
                <input
                  type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none transition-all"
                  onFocus={e => { e.target.style.borderColor = mod.color; e.target.style.background = '#fff'; }}
                  onBlur={e => { e.target.style.borderColor = '#F3F4F6'; e.target.style.background = '#F9FAFB'; }}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] text-red-600 font-medium"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
              >
                <span className="material-symbols-outlined text-[14px]">error</span>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ background: mod.color, boxShadow: `0 6px 20px ${mod.color}40` }}
            >
              {loading
                ? <><span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span> Signing in…</>
                : <>Continue to {mod.name} <span className="material-symbols-outlined text-[15px]">arrow_forward</span></>
              }
            </button>
          </form>

          {/* Face ID */}
          <button className="w-full mt-3 py-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-300 hover:text-gray-500 transition-colors">
            <span className="material-symbols-outlined text-[14px]">face_recognition</span>
            Clinical Face ID / Smart Badge Tap
          </button>

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-gray-50">
            <div className="flex items-center justify-center gap-5">
              {[
                { icon: 'verified_user', label: 'HIPAA Verified' },
                { icon: 'check_circle',  label: 'HL7/FHIR Ready' },
                { icon: 'lock',          label: '256-bit SSL' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[11px] text-gray-300">{b.icon}</span>
                  <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wide">{b.label}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-[8px] text-gray-200 mt-2 uppercase tracking-[0.2em]">
              MediCircle · Healthcare Platform Suite · V1.0
            </p>
            <p className="text-center text-[8px] text-gray-200 mt-0.5">
              Authorized Clinical Personnel Only · Unauthorized Access Security Prohibited
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
