import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_HOME, type Role } from '../lib/auth';

const DEMO_USERS: { role: Role; name: string; email: string; icon: string; color: string; desc: string }[] = [
  { role: 'admin',        name: 'Admin User',       email: 'admin@lumina.com',        icon: 'manage_accounts', color: '#17A077', desc: 'Dashboard · Inventory' },
  { role: 'doctor',       name: 'Dr. Anita Sharma', email: 'anita.sharma@lumina.com', icon: 'stethoscope',     color: '#0D9460', desc: 'Reports · Orders' },
  { role: 'phlebotomist', name: 'Ravi Kumar',       email: 'ravi.kumar@lumina.com',   icon: 'biotech',         color: '#1A7260', desc: 'Sample Collection' },
  { role: 'patient',      name: 'Meera Iyer',       email: 'meera.iyer@lumina.com',   icon: 'person',          color: '#2A9174', desc: 'My Results · Reports' },
];
const DEMO_PASSWORD = 'Demo@1234';

export default function Login() {
  const { signIn }   = useAuth();
  const navigate     = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const role = await signIn(email, password);
      navigate(ROLE_HOME[role], { replace: true });
    } catch (err: any) {
      setError(err.message || err.error_description || 'Sign-in failed. Check your email and password.');
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
        style={{ background: 'linear-gradient(145deg,#0D4A3E 0%,#1A7260 45%,#2A9174 75%,#5BAAA0 100%)' }}
      >
        <div>
          <h1 className="text-4xl font-black tracking-tight">DiagDesk</h1>
          <p className="text-white/50 text-[11px] mt-1 uppercase tracking-widest font-semibold">Mission Control</p>
        </div>
        <div className="space-y-6">
          <p className="text-3xl font-bold leading-snug">
            Unified diagnostics<br />platform for modern labs.
          </p>
          <div className="space-y-2 text-white/60 text-sm">
            {['Patient Registration · Orders', 'Sample Tracking · Results', 'Reports · Inventory · Analytics'].map(t => (
              <div key={t} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-white/40"></span>{t}
              </div>
            ))}
          </div>
        </div>
        <div className="text-white/25 text-[11px]">Lumina Diagnostics · v2.4.0-stable</div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 lg:px-16">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-black tracking-tight" style={{ color: '#17A077' }}>DiagDesk</h1>
            <p className="text-on-surface-variant text-xs mt-1 uppercase tracking-widest">Mission Control</p>
          </div>

          <h2 className="text-2xl font-bold text-on-surface mb-1">Sign in</h2>
          <p className="text-on-surface-variant text-sm mb-8">Access your DiagDesk workspace</p>

          {/* Demo role cards */}
          <div className="mb-6">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Demo accounts — click to auto-fill
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map(d => (
                <button
                  key={d.email}
                  onClick={() => fillDemo(d.email)}
                  className="flex items-center gap-2 p-3 bg-white border border-outline-variant rounded-xl text-left transition-all"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#17A077')}
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
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@lumina.com"
                className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface bg-white outline-none transition-all"
                style={{ boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#17A077')}
                onBlur={e => (e.target.style.borderColor = '')}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-on-surface-variant block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface bg-white outline-none transition-all"
                onFocus={e => (e.target.style.borderColor = '#17A077')}
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
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
              style={{ background: '#17A077' }}
            >
              {loading ? (
                <><span className="material-symbols-outlined text-sm" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>Signing in…</>
              ) : (
                'Sign in to DiagDesk'
              )}
            </button>
          </form>

          <p className="text-center text-[11px] text-on-surface-variant mt-8">
            Demo password for all accounts:{' '}
            <span className="font-mono font-bold text-on-surface">{DEMO_PASSWORD}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
