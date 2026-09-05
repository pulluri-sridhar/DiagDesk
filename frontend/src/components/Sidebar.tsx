import { NavLink } from 'react-router-dom';
import { useAuth, type Role } from '../lib/auth';

const NAV_BY_ROLE: Record<Role, { to: string; icon: string; label: string }[]> = {
  admin: [
    { to: '/dashboard',          icon: 'dashboard',        label: 'Dashboard'       },
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
};

const ROLE_COLORS: Record<Role, string> = {
  admin:        '#17A077',
  doctor:       '#0D9460',
  phlebotomist: '#1A7260',
  patient:      '#2A9174',
  lab_tech:     '#0891B2',
  pathologist:  '#7C3AED',
};

export default function Sidebar() {
  const { user, role } = useAuth();

  const nav = role ? NAV_BY_ROLE[role] : [];
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
      <nav className="flex-1 space-y-base px-sm">
        {nav.map(({ to, icon, label }) => (
          <NavLink
            key={label}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-md px-md py-sm mx-2 rounded-lg transition-colors font-medium text-[12px] uppercase tracking-wider font-label-caps ` +
              (isActive ? 'text-white' : 'text-on-surface-variant hover:bg-surface-container-low')
            }
            style={({ isActive }) => isActive ? { background: accentColor } : {}}
          >
            <span className="material-symbols-outlined text-lg">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-sm mt-auto space-y-xs">
        <div className="pt-lg border-t border-outline-variant">
          <a
            className="flex items-center gap-md px-md py-sm text-on-surface-variant hover:text-[#17A077] transition-colors cursor-pointer"
            href="#"
          >
            <span className="material-symbols-outlined text-md">settings</span>
            <span className="font-label-caps text-[11px] uppercase">Settings</span>
          </a>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-md px-md py-sm text-error hover:bg-error/5 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-md">logout</span>
            <span className="font-label-caps text-[11px] uppercase">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
