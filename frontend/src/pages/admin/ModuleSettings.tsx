import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { getModuleConfig, saveModuleConfig, DEFAULT_MODULE_CONFIG, type AppModuleConfig } from '../../lib/moduleConfig';

export default function ModuleSettings() {
  const [modules, setModules] = useState<AppModuleConfig[]>(getModuleConfig());
  const [saved, setSaved] = useState(false);

  function update(id: string, field: keyof AppModuleConfig, value: string | boolean) {
    setModules(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    setSaved(false);
  }

  function handleSave() {
    saveModuleConfig(modules);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleReset() {
    setModules(DEFAULT_MODULE_CONFIG);
    saveModuleConfig(DEFAULT_MODULE_CONFIG);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-[18px] font-black text-gray-900">Module Settings</h1>
            <p className="text-[12px] text-gray-400 mt-0.5">Customize module names and descriptions shown on the login portal</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleReset}
              className="px-4 py-2 rounded-xl text-[12px] font-bold text-gray-500 hover:text-gray-700 transition-colors border border-gray-200 hover:border-gray-300">
              Reset to Defaults
            </button>
            <button onClick={handleSave}
              className="px-5 py-2 rounded-xl text-[12px] font-bold text-white transition-all flex items-center gap-2"
              style={{ background: '#17A077', boxShadow: '0 4px 12px rgba(23,160,119,0.3)' }}>
              {saved
                ? <><span className="material-symbols-outlined text-[14px]">check_circle</span> Saved!</>
                : <><span className="material-symbols-outlined text-[14px]">save</span> Save Changes</>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-2xl mx-auto space-y-6">

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <span className="material-symbols-outlined text-blue-500 text-[18px] flex-shrink-0 mt-0.5">info</span>
              <div>
                <p className="text-[12px] font-bold text-blue-800">Changes reflect immediately on the login portal</p>
                <p className="text-[11px] text-blue-600 mt-0.5">Module names and taglines are shown in the MediCircle module selector dropdown.</p>
              </div>
            </div>

            {/* Module cards */}
            {modules.map(mod => (
              <div key={mod.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: mod.color }}>
                      <span className="material-symbols-outlined text-[20px]">{mod.icon}</span>
                    </div>
                    <div>
                      <p className="text-[14px] font-black text-gray-900">{mod.name} Module</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{mod.id}</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[12px] font-semibold text-gray-500">Enabled</span>
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={mod.enabled}
                        onChange={e => update(mod.id, 'enabled', e.target.checked)} />
                      <div className="w-10 h-5 rounded-full transition-colors" style={{ background: mod.enabled ? mod.color : '#D1D5DB' }}>
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                          style={{ transform: mod.enabled ? 'translateX(20px)' : 'translateX(0)' }} />
                      </div>
                    </div>
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Module Name</label>
                    <input value={mod.name} onChange={e => update(mod.id, 'name', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[14px] font-bold text-gray-900 outline-none transition-all"
                      onFocus={e => { e.target.style.borderColor = mod.color; e.target.style.background = '#fff'; }}
                      onBlur={e => { e.target.style.borderColor = '#F3F4F6'; e.target.style.background = '#F9FAFB'; }}
                      placeholder="e.g. MediDesk" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Tagline</label>
                    <input value={mod.tagline} onChange={e => update(mod.id, 'tagline', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-[13px] text-gray-900 outline-none transition-all"
                      onFocus={e => { e.target.style.borderColor = mod.color; e.target.style.background = '#fff'; }}
                      onBlur={e => { e.target.style.borderColor = '#F3F4F6'; e.target.style.background = '#F9FAFB'; }}
                      placeholder="e.g. Complete Hospital Management" />
                  </div>

                  {/* Preview */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Preview</p>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2"
                      style={{ borderColor: mod.color, background: `${mod.color}08` }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: mod.color }}>
                        <span className="material-symbols-outlined text-[16px]">{mod.icon}</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-gray-900 leading-none">{mod.name || '—'}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{mod.tagline || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
