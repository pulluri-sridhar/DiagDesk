import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setSelectedModule, type AppModule } from '../lib/auth';

const MODULES: {
  id: AppModule; name: string; tagline: string;
  features: string[]; color: string; icon: string;
}[] = [
  {
    id: 'medidesk',
    name: 'MediDesk',
    tagline: 'Complete Hospital Management',
    features: ['OPD Queue & IPD Beds', 'Pharmacy & Prescriptions', 'Radiology & Lab', 'Medical History & SOAP Notes'],
    color: '#17A077',
    icon: 'local_hospital',
  },
  {
    id: 'diagdesk',
    name: 'DiagDesk',
    tagline: 'Diagnostic Lab Platform',
    features: ['Patient Registration & Orders', 'Sample Tracking & Results', 'Reports & Pathology', 'Inventory & Invoicing'],
    color: '#0891B2',
    icon: 'biotech',
  },
];

export default function MediCircle() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AppModule | ''>('');

  const activeMod = MODULES.find(m => m.id === selected) ?? null;

  function handleContinue() {
    if (!selected) return;
    setSelectedModule(selected as AppModule);
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#F0F4F7' }}>
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-md"
            style={{ background: 'linear-gradient(135deg,#0D4A3E,#17A077)' }}>
            <span className="material-symbols-outlined text-white text-[28px]">hub</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">
            Medi<span style={{ color: '#17A077' }}>Circle</span>
          </h1>
          <p className="text-gray-400 text-[11px] mt-1 tracking-widest uppercase">Healthcare Platform Suite</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-[15px] font-bold text-gray-800 mb-1">Select a module</h2>
          <p className="text-[12px] text-gray-400 mb-5">Choose the platform you want to access</p>

          {/* Dropdown */}
          <div className="relative mb-5">
            <select
              value={selected}
              onChange={e => setSelected(e.target.value as AppModule | '')}
              className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-[13px] text-gray-800 font-medium focus:outline-none focus:ring-2 cursor-pointer"
              style={{ focusRingColor: '#17A077' } as React.CSSProperties}
            >
              <option value="">— Select a module —</option>
              {MODULES.map(m => (
                <option key={m.id} value={m.id}>{m.name} · {m.tagline}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Module preview — shows when a module is selected */}
          {activeMod && (
            <div className="rounded-xl border p-4 mb-5 transition-all" style={{ borderColor: `${activeMod.color}40`, background: `${activeMod.color}08` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                  style={{ background: activeMod.color }}>
                  <span className="material-symbols-outlined text-[16px]">{activeMod.icon}</span>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">{activeMod.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">{activeMod.tagline}</p>
                </div>
              </div>
              <ul className="grid grid-cols-2 gap-1.5">
                {activeMod.features.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: activeMod.color }}></span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="w-full py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: activeMod ? activeMod.color : '#9CA3AF' }}
          >
            <span className="material-symbols-outlined text-[16px]">login</span>
            {activeMod ? `Continue to ${activeMod.name}` : 'Select a module to continue'}
          </button>
        </div>

        <p className="text-center text-gray-400 text-[10px] mt-6 uppercase tracking-widest">
          MediCircle · Healthcare Platform Suite · v1.0
        </p>
      </div>
    </div>
  );
}
