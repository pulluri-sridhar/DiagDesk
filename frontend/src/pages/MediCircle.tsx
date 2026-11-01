import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_HOME, setSelectedModule, type AppModule, type Role } from '../lib/auth';
import { getModuleConfig } from '../lib/moduleConfig';

type RoleOption = { role: Role; name: string; email: string };

const MODULE_ROLES: Record<AppModule, { features: string[]; roles: RoleOption[] }> = {
  medidesk: {
    features: ['OPD Queue & IPD Beds', 'Pharmacy & Prescriptions', 'Radiology & Lab', 'Medical History & SOAP Notes'],
    roles: [
      { role: 'doctor',       name: 'Doctor',    email: 'anita.sharma@lumina.com' },
      { role: 'phlebotomist', name: 'Nurse',      email: 'ravi.kumar@lumina.com'   },
      { role: 'admin',        name: 'Admin',      email: 'admin@lumina.com'        },
      { role: 'lab_tech',     name: 'Lab/PACS',  email: 'lab@lumina.com'          },
    ],
  },
  diagdesk: {
    features: ['Patient Registration & Orders', 'Sample Tracking & Results', 'Reports & Pathology', 'Inventory & Invoicing'],
    roles: [
      { role: 'admin',        name: 'Admin',        email: 'admin@lumina.com'      },
      { role: 'phlebotomist', name: 'Phlebotomist', email: 'ravi.kumar@lumina.com' },
      { role: 'lab_tech',     name: 'Lab Tech',     email: 'lab@lumina.com'        },
      { role: 'pathologist',  name: 'Pathologist',  email: 'path@lumina.com'       },
    ],
  },
};

const DEMO_PASSWORD = 'Demo@1234';

const STATS = [
  { icon: 'groups',          value: '12,400+', label: 'Patients Served' },
  { icon: 'medical_services',value: '380+',    label: 'Clinical Staff'  },
  { icon: 'apartment',       value: '18',      label: 'Departments'     },
  { icon: 'favorite',        value: '99.8%',   label: 'Uptime SLA'      },
];

const HIGHLIGHTS = [
  { icon: 'dashboard',       title: 'Unified Dashboard',    desc: 'One view for OPD, IPD, lab and pharmacy workflows.' },
  { icon: 'biotech',         title: 'Lab & Radiology',      desc: 'Sample tracking, DICOM imaging and result delivery.'  },
  { icon: 'local_pharmacy',  title: 'Pharmacy & Inventory', desc: 'Real-time drug stock, prescriptions and billing.'    },
  { icon: 'health_metrics',  title: 'Clinical Analytics',   desc: 'HL7/FHIR-ready reports and compliance dashboards.'   },
];

export default function MediCircle() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();

  const MODULES = getModuleConfig()
    .filter(m => m.enabled)
    .map(m => ({ ...m, ...MODULE_ROLES[m.id] }));

  const [selectedMod, setMod]     = useState<AppModule>('medidesk');
  const [dropOpen, setDropOpen]   = useState(false);
  const [activeRole, setActiveRole] = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const mod = MODULES.find(m => m.id === selectedMod)!;

  function switchModule(id: AppModule) {
    setMod(id); setDropOpen(false);
    setActiveRole(''); setEmail(''); setPassword(''); setError('');
  }

  function selectRole(r: RoleOption) {
    setActiveRole(r.role); setEmail(r.email); setPassword(DEMO_PASSWORD); setError('');
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
    <div className="min-h-screen flex font-sans">

      {/* ══════════════════════════════════════════════════
          LEFT PANEL — desktop only
      ══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[58%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg,#041C12 0%,#0A3D28 45%,#0D5C3A 100%)' }}>

        {/* Background photo */}
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1400&q=80)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg,rgba(4,28,18,0.93) 0%,rgba(10,61,40,0.87) 50%,rgba(13,92,58,0.82) 100%)' }} />

        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none opacity-10"
          style={{ background: 'radial-gradient(circle,#2ECC9A,transparent)', transform: 'translate(30%,-30%)' }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full pointer-events-none opacity-8"
          style={{ background: 'radial-gradient(circle,#17A077,transparent)', transform: 'translate(-30%,30%)' }} />

        <div className="relative z-10 flex flex-col h-full p-10">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-auto">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/40 text-[10px] font-medium tracking-wide">MediCloud Live · Node US-East</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(23,160,119,0.2)', border: '1px solid rgba(23,160,119,0.35)' }}>
                <span className="material-symbols-outlined text-green-400 text-[11px]">verified_user</span>
                <span className="text-green-400 text-[9px] font-bold uppercase tracking-widest">HIPAA Compliant</span>
              </div>
              <button className="px-2.5 py-1 rounded-full text-[10px] font-semibold text-white/40"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                IT Helpdesk
              </button>
            </div>
          </div>

          {/* Logo + tagline */}
          <div className="py-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <span className="material-symbols-outlined text-white text-[26px]">asterisk</span>
              </div>
              <div>
                <h1 className="text-[32px] font-black text-white tracking-tight leading-none">MediCircle</h1>
                <p className="text-white/35 text-[9px] tracking-[0.25em] uppercase mt-1">Healthcare Platform Suite</p>
              </div>
            </div>
            <p className="text-white/70 text-[22px] font-bold leading-snug mb-2">
              Empowering Healthcare<br />Teams to Work Smarter.
            </p>
            <p className="text-white/35 text-[13px] leading-relaxed max-w-sm">
              A unified platform connecting doctors, nurses, lab technicians, pharmacists and patients — in real time.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-10">
            {STATS.map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="material-symbols-outlined text-white/40 text-[18px] block mb-1">{s.icon}</span>
                <p className="text-white font-black text-[16px] leading-none">{s.value}</p>
                <p className="text-white/30 text-[9px] mt-0.5 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-3 mb-10">
            {HIGHLIGHTS.map(h => (
              <div key={h.title} className="flex items-start gap-3 p-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(23,160,119,0.2)' }}>
                  <span className="material-symbols-outlined text-[16px]" style={{ color: '#17A077' }}>{h.icon}</span>
                </div>
                <div>
                  <p className="text-white/80 text-[11px] font-bold leading-none">{h.title}</p>
                  <p className="text-white/30 text-[10px] mt-1 leading-snug">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {[
                { icon: 'verified_user', label: 'HIPAA Verified' },
                { icon: 'check_circle',  label: 'HL7/FHIR Ready' },
                { icon: 'lock',          label: '256-bit SSL' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[11px] text-white/20">{b.icon}</span>
                  <span className="text-[9px] font-semibold text-white/20 uppercase tracking-wide">{b.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              <span className="text-white/20 text-[8px] uppercase tracking-wider">Clinical Terminal</span>
              <span className="text-white/20 text-[8px] font-bold">STAFF v1</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          RIGHT PANEL — login card (full width on mobile)
      ══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col bg-white overflow-auto">

        {/* Mobile-only dark header */}
        <div className="lg:hidden relative pt-3 pb-14 overflow-hidden"
          style={{ background: 'linear-gradient(160deg,#062E1F 0%,#0D5C3A 55%,#0A4530 100%)' }}>
          <div className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80)' }} />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(160deg,rgba(6,46,31,0.9) 0%,rgba(13,92,58,0.85) 100%)' }} />
          <div className="relative z-10 flex items-center justify-between px-5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/40 text-[10px]">MediCloud Live · Node US-East</span>
            </div>
            <button className="px-2.5 py-1 rounded-full text-[10px] text-white/40"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              IT Helpdesk
            </button>
          </div>
          <div className="relative z-10 px-5 mb-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(23,160,119,0.2)', border: '1px solid rgba(23,160,119,0.35)' }}>
              <span className="material-symbols-outlined text-green-400 text-[11px]">verified_user</span>
              <span className="text-green-400 text-[9px] font-bold uppercase tracking-widest">HIPAA Compliant & Encrypted</span>
            </div>
          </div>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <span className="material-symbols-outlined text-white text-[22px]">asterisk</span>
            </div>
            <h1 className="text-[26px] font-black text-white">MediCircle</h1>
            <p className="text-white/35 text-[9px] tracking-[0.2em] uppercase mt-1">Healthcare Platform Suite</p>
          </div>
        </div>

        {/* Login form card */}
        <div className="flex-1 -mt-6 lg:mt-0 rounded-t-3xl lg:rounded-none bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.1)] lg:shadow-none flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full px-6 py-8">

            {/* Desktop heading */}
            <div className="hidden lg:block mb-6">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Secure Access Portal</p>
              <h2 className="text-[24px] font-black text-gray-900">Sign in to your workspace</h2>
            </div>

            {/* Module selector */}
            <div className="mb-4">
              <h2 className="text-[15px] font-black text-gray-900 lg:hidden">Select a module</h2>
              <p className="text-[11px] text-gray-400 mt-0.5 mb-3">Choose the platform you want to access</p>
              <div className="relative">
                <button onClick={() => setDropOpen(o => !o)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                  style={{ borderColor: mod.color, background: `${mod.color}0A` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: mod.color }}>
                    <span className="material-symbols-outlined text-[16px]">{mod.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 leading-none">{mod.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{mod.tagline}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 text-[18px] flex-shrink-0 transition-transform"
                    style={{ transform: dropOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                </button>
                {dropOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden z-30">
                    {MODULES.map(m => (
                      <button key={m.id} onClick={() => switchModule(m.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: m.color }}>
                          <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-gray-900">{m.name}</p>
                          <p className="text-[10px] text-gray-400">{m.tagline}</p>
                        </div>
                        {selectedMod === m.id && <span className="material-symbols-outlined ml-auto text-[16px]" style={{ color: m.color }}>check_circle</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {mod.features.map(f => (
                <span key={f} className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                  style={{ background: `${mod.color}12`, color: mod.color }}>{f}</span>
              ))}
            </div>

            {/* Role tabs */}
            <div className="mb-4">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-2">Select Staff Role</p>
              <div className="flex flex-wrap gap-1.5">
                {mod.roles.map(r => (
                  <button key={r.role} onClick={() => selectRole(r)}
                    className="px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                    style={activeRole === r.role
                      ? { background: mod.color, color: '#fff', boxShadow: `0 4px 12px ${mod.color}45` }
                      : { background: '#F1F5F9', color: '#64748B' }}>
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] block mb-1.5">Healthcare ID or Staff Email</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[16px]">badge</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="dr.chen@medicircle.org"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none transition-all"
                    onFocus={e => { e.target.style.borderColor = mod.color; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = '#F3F4F6'; e.target.style.background = '#F9FAFB'; }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">Access Password</label>
                  <button type="button" className="text-[10px] font-semibold" style={{ color: mod.color }}>Forgot?</button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[16px]">lock</span>
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none transition-all"
                    onFocus={e => { e.target.style.borderColor = mod.color; e.target.style.background = '#fff'; }}
                    onBlur={e => { e.target.style.borderColor = '#F3F4F6'; e.target.style.background = '#F9FAFB'; }} />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">{showPwd ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] text-red-600 font-medium"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: mod.color, boxShadow: `0 6px 20px ${mod.color}40` }}>
                {loading
                  ? <><span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span> Signing in…</>
                  : <>Continue to {mod.name} <span className="material-symbols-outlined text-[15px]">arrow_forward</span></>}
              </button>
            </form>

            <button className="w-full mt-3 py-2 flex items-center justify-center gap-1.5 text-[11px] text-gray-300 hover:text-gray-500 transition-colors">
              <span className="material-symbols-outlined text-[14px]">face_recognition</span>
              Clinical Face ID / Smart Badge Tap
            </button>

            <div className="mt-5 pt-4 border-t border-gray-50">
              <div className="flex items-center justify-center gap-4">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
