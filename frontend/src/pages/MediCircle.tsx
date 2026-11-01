import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setSelectedModule, type AppModule } from '../lib/auth';

const MODULES: {
  id: AppModule; name: string; tagline: string;
  features: string[]; color: string; icon: string; bg: string;
}[] = [
  {
    id: 'medidesk',
    name: 'MediDesk',
    tagline: 'Complete Hospital Management',
    features: ['OPD Queue & IPD Beds', 'Pharmacy & Prescriptions', 'Radiology & Lab', 'Medical History & SOAP Notes'],
    color: '#17A077',
    bg: '#E8F5F1',
    icon: 'local_hospital',
  },
  {
    id: 'diagdesk',
    name: 'DiagDesk',
    tagline: 'Diagnostic Lab Platform',
    features: ['Patient Registration & Orders', 'Sample Tracking & Results', 'Reports & Pathology', 'Inventory & Invoicing'],
    color: '#0891B2',
    bg: '#E0F4F9',
    icon: 'biotech',
  },
];

export default function MediCircle() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AppModule | ''>('');
  const [open, setOpen] = useState(false);

  const activeMod = MODULES.find(m => m.id === selected) ?? null;

  function handleContinue() {
    if (!selected) return;
    setSelectedModule(selected as AppModule);
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex font-sans" style={{ background: 'linear-gradient(135deg,#0D4A3E 0%,#1A7260 50%,#2A9174 100%)' }}>
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fff,transparent)', transform: 'translate(30%,-30%)' }} />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#fff,transparent)', transform: 'translate(-30%,30%)' }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 shadow-2xl" style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <span className="material-symbols-outlined text-white text-[36px]">hub</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white">MediCircle</h1>
          <p className="text-white/50 text-[12px] mt-2 tracking-widest uppercase">Healthcare Platform Suite</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm rounded-3xl p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
          <h2 className="text-[18px] font-bold text-gray-900 mb-1">Select a module</h2>
          <p className="text-[12px] text-gray-400 mb-6">Choose the platform you want to access</p>

          {/* Custom dropdown */}
          <div className="relative mb-5">
            <button
              onClick={() => setOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-2 text-left transition-all"
              style={{ borderColor: activeMod ? activeMod.color : '#E5E7EB', background: activeMod ? activeMod.bg : '#F9FAFB' }}
            >
              {activeMod ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: activeMod.color }}>
                    <span className="material-symbols-outlined text-[16px]">{activeMod.icon}</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-900 leading-none">{activeMod.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{activeMod.tagline}</p>
                  </div>
                </div>
              ) : (
                <span className="text-[13px] text-gray-400">— Select a module —</span>
              )}
              <span className="material-symbols-outlined text-gray-400 text-[18px] transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
            </button>

            {open && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 bg-white">
                {MODULES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setSelected(m.id); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: m.color }}>
                      <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-gray-900">{m.name}</p>
                      <p className="text-[11px] text-gray-400">{m.tagline}</p>
                    </div>
                    {selected === m.id && <span className="material-symbols-outlined ml-auto text-[18px]" style={{ color: m.color }}>check_circle</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Feature pills — show on selection */}
          {activeMod && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {activeMod.features.map(f => (
                <span key={f} className="px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: activeMod.bg, color: activeMod.color }}>
                  {f}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-[14px] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            style={{ background: activeMod ? `linear-gradient(135deg,${activeMod.color},${activeMod.color}cc)` : '#9CA3AF', boxShadow: activeMod ? `0 8px 24px ${activeMod.color}40` : 'none' }}
          >
            {activeMod ? `Continue to ${activeMod.name}` : 'Select a module'}
            {activeMod && <span className="material-symbols-outlined text-[18px]">arrow_forward</span>}
          </button>
        </div>

        <p className="text-white/25 text-[10px] mt-8 uppercase tracking-widest">
          MediCircle · Healthcare Platform Suite · v1.0
        </p>
      </div>
    </div>
  );
}
