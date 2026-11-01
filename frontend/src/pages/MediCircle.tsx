import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setSelectedModule, type AppModule } from '../lib/auth';

const MODULES: {
  id: AppModule; name: string; tagline: string;
  features: string[]; color: string; gradient: string; icon: string;
}[] = [
  {
    id: 'medidesk',
    name: 'MediDesk',
    tagline: 'Complete Hospital Management',
    features: ['OPD Queue & IPD Beds', 'Pharmacy & Prescriptions', 'Radiology & Lab', 'Medical History & SOAP Notes'],
    color: '#17A077',
    gradient: 'linear-gradient(135deg,#0D4A3E 0%,#17A077 100%)',
    icon: 'local_hospital',
  },
  {
    id: 'diagdesk',
    name: 'DiagDesk',
    tagline: 'Diagnostic Lab Platform',
    features: ['Patient Registration & Orders', 'Sample Tracking & Results', 'Reports & Pathology', 'Inventory & Invoicing'],
    color: '#0891B2',
    gradient: 'linear-gradient(135deg,#0C4A6E 0%,#0891B2 100%)',
    icon: 'biotech',
  },
];

export default function MediCircle() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AppModule | null>(null);

  function handleContinue() {
    if (!selected) return;
    setSelectedModule(selected);
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0F4F7' }}>
      {/* Header */}
      <header className="flex items-center justify-center py-10">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-gray-900">
            Medi<span style={{ color: '#17A077' }}>Circle</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1 tracking-widest uppercase">Healthcare Platform Suite</p>
        </div>
      </header>

      {/* Module selector */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <p className="text-gray-600 text-[15px] mb-8 font-medium">Select a module to continue</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
          {MODULES.map(mod => (
            <button
              key={mod.id}
              onClick={() => setSelected(mod.id)}
              className={`text-left rounded-2xl border-2 overflow-hidden transition-all shadow-sm hover:shadow-lg ${
                selected === mod.id ? 'border-transparent scale-[1.02]' : 'border-gray-200 bg-white'
              }`}
              style={selected === mod.id ? { borderColor: mod.color } : {}}
            >
              {/* Card header */}
              <div className="px-6 py-5 text-white" style={{ background: mod.gradient }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">{mod.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-black">{mod.name}</h2>
                    <p className="text-white/70 text-[11px] uppercase tracking-wider">{mod.tagline}</p>
                  </div>
                  {selected === mod.id && (
                    <span className="ml-auto material-symbols-outlined text-white text-[22px]">check_circle</span>
                  )}
                </div>
              </div>
              {/* Features */}
              <div className="px-6 py-4 bg-white">
                <ul className="space-y-1.5">
                  {mod.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-[12px] text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: mod.color }}></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected}
          className="mt-8 px-10 py-3 rounded-xl text-white font-bold text-[14px] transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 shadow-md"
          style={{ background: selected ? (MODULES.find(m => m.id === selected)?.color ?? '#17A077') : '#9CA3AF' }}
        >
          Continue to {selected ? MODULES.find(m => m.id === selected)?.name : 'Login'} →
        </button>

        <p className="text-gray-400 text-[11px] mt-6">
          MediCircle · Healthcare Platform Suite · v1.0
        </p>
      </main>
    </div>
  );
}
