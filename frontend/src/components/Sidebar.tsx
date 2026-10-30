import { NavLink } from 'react-router-dom';
import { useAuth, type Role } from '../lib/auth';
import { isModuleEnabled } from '../modules/hospital.config';

const NAV_BY_ROLE: Record<Role, { to: string; icon: string; label: string }[]> = {
  pharmacist: [
    { to: '/pharmacy', icon: 'local_pharmacy', label: 'Pharmacy Hub' },
  ],
  admin: [
    { to: '/dashboard',          icon: 'dashboard',        label: 'Dashboard'       },
    { to: '/pharmacy',           icon: 'local_pharmacy',   label: 'Pharmacy'        },
    { to: '/registration',       icon: 'person_add',       label: 'Registration'    },
    { to: '/invoices',           icon: 'receipt_long',     label: 'Invoices'        },
    { to: '/reports',            icon: 'lab_profile',      label: 'Reports'         },
    { to: '/pathologist-review', icon: 'verified_user',    label: 'Pathologist'     },
    { to: '/analytics',          icon: 'bar_chart_4_bars', label: 'Analytics'       },
    { to: '/inventory',          icon: 'inventory_2',      label: 'Inventory'       },
    { to: '/doctor',             icon: 'stethoscope',      label: 'Doctor View'     },
    { to: '/phlebotomist',       icon: 'biotech',          label: 'Field Ops'       },
    { to: '/patients',           icon: 'manage_accounts',  label: 'Patient Records' },
  ],
  doctor: [
    { to: '/doctor',    icon: 'assessment',     label: 'Reports'       },
  ],
  phlebotomist: [
    { to: '/phlebotomist', icon: 'biotech',     label: 'My Visits'     },
  ],
  patient: [
    { to: '/patient',   icon: 'science',        label: 'My Results'    },
  ],
  lab_tech: [
    { to: '/registration', icon: 'person_add',    label: 'Registration'  },
    { to: '/invoices',     icon: 'receipt_long',  label: 'Invoices'      },
    { to: '/reports',      icon: 'lab_profile',   label: 'Reports'       },
  ],
  pathologist: [
    { to: '/pathologist-review', icon: 'verified_user', label: 'Review Queue' },
    { to: '/reports',            icon: 'lab_profile',   label: 'All Reports'  },
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  admin:        'Lab Administrator',
  doctor:       'Referring Physician',
  phlebotomist: 'Phlebotomist',
  patient:      'Patient',
  lab_tech:     'Lab Technician',
  pathologist:  'Pathologist',
  pharmacist:   'Pharmacist',
};

const ROLE_COLORS: Record<Role, string> = {
  admin:        '#17A077',
  doctor:       '#0D9460',
  phlebotomist: '#1A7260',
  patient:      '#2A9174',
  lab_tech:     '#0891B2',
  pathologist:  '#7C3AED',
  pharmacist:   '#D97706',
};

const HOSPITAL_NAV: { module: Parameters<typeof isModuleEnabled>[0]; to: string; icon: string; label: string }[] = [
  { module: 'OPD_QUEUE',          to: '/hospital/opd',                 icon: 'queue',           label: 'OPD Queue'        },
  { module: 'IPD_BEDS',           to: '/hospital/beds',                icon: 'bed',             label: 'IPD Beds'         },
  { module: 'RADIOLOGY',          to: '/hospital/radiology',           icon: 'radiology',       label: 'Radiology'        },
  { module: 'MEDICAL_HISTORY',    to: '/hospital/medical-history',     icon: 'history_edu',     label: 'Med. History'     },
  { module: 'CONSULTATION_NOTES', to: '/hospital/consultation-notes',  icon: 'clinical_notes',  label: 'SOAP Notes'       },
];

export default function Sidebar() {
  const { user, role } = useAuth();

  const baseNav = role ? NAV_BY_ROLE[role] : [];
  const hospitalNav = (role === 'admin' || role === 'doctor')
    ? HOSPITAL_NAV.filter(h => isModuleEnabled(h.module)).map(({ to, icon, label }) => ({ to, icon, label }))
    : [];
  const nav = [...baseNav, ...hospitalNav];
  const displayName = user?.name ?? user?.email ?? 'User';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const accentColor = role ? ROLE_COLORS[role] : '#17A077';

  function handleSignOut() {
    console.log('[DiagDesk] Sign out clicked — clearing session');
    localStorage.removeItem('diagdesk_session');
    console.log('[DiagDesk] Session cleared, redirecting…');
    window.location.href = '/login';
  }

  return (
    <aside className="h-screen w-64 flex-col fixed left-0 top-0 border-r border-outline-variant bg-white flex py-lg z-50">
      {/* Logo */}
      <div className="px-lg mb-xl">
        <h1 className="font-headline-md text-2xl font-extrabold tracking-tight" style={{ color: accentColor }}>DiagDesk</h1>
        <p className="font-label-caps text-[10px] text-on-surface-variant tracking-widest uppercase mt-xs">Mission Control</p>
      </div>

      {/* User badge */}
      <div className="mx-sm mb-md px-md py-sm rounded-xl flex items-center gap-sm" style={{ background: `${accentColor}12` }}>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ background: accentColor }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-label-md text-sm font-bold text-on-surface truncate">{displayName}</p>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
            {role ? ROLE_LABELS[role] : '—'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-sm overflow-y-auto min-h-0 pb-2">
        <div className="space-y-0.5">
          {nav.map(({ to, icon, label }) => (
            <NavLink
              key={label}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 mx-1 rounded-lg transition-colors font-medium text-[11px] uppercase tracking-wider font-label-caps ` +
                (isActive ? 'text-white' : 'text-on-surface-variant hover:bg-surface-container-low')
              }
              style={({ isActive }) => isActive ? { background: accentColor } : {}}
            >
              <span className="material-symbols-outlined text-[16px]">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom actions — always visible */}
      <div className="px-sm flex-shrink-0">
        <div className="pt-2 border-t border-outline-variant">
          <a
            className="flex items-center gap-2 px-3 py-1.5 text-on-surface-variant hover:text-[#17A077] transition-colors cursor-pointer text-[11px] uppercase tracking-wider font-label-caps"
            href="#"
          >
            <span className="material-symbols-outlined text-[16px]">settings</span>
            Settings
          </a>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-error hover:bg-error/5 rounded-lg transition-colors text-[11px] uppercase tracking-wider font-label-caps"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}
