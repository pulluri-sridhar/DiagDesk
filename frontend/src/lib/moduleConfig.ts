export interface AppModuleConfig {
  id: 'medidesk' | 'diagdesk' | 'pharmdesk';
  name: string;
  tagline: string;
  color: string;
  icon: string;
  enabled: boolean;
}

const CONFIG_KEY = 'medicircle_module_config';

export const DEFAULT_MODULE_CONFIG: AppModuleConfig[] = [
  { id: 'medidesk',  name: 'MediDesk',  tagline: 'Complete Hospital Management', color: '#17A077', icon: 'local_hospital',  enabled: true },
  { id: 'diagdesk',  name: 'DiagDesk',  tagline: 'Diagnostic Lab Platform',      color: '#0891B2', icon: 'biotech',          enabled: true },
  { id: 'pharmdesk', name: 'PharmaDesk', tagline: 'Pharmacy Management Platform', color: '#7C3AED', icon: 'local_pharmacy',   enabled: true },
];

export function getModuleConfig(): AppModuleConfig[] {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppModuleConfig[];
      return DEFAULT_MODULE_CONFIG.map(def => {
        const saved = parsed.find(p => p.id === def.id);
        return saved ? { ...def, ...saved } : def;
      });
    }
  } catch { /* ignore */ }
  return DEFAULT_MODULE_CONFIG;
}

export function saveModuleConfig(modules: AppModuleConfig[]): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(modules));
}
