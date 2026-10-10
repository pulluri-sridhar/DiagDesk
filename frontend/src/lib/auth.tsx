/**
 * DiagDesk Auth — localStorage-based session for prototype.
 * Credentials are validated client-side against the DEMO_USERS table.
 * Replace signIn/signOut with Keycloak JWT calls when the backend is ready.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Role = 'admin' | 'doctor' | 'phlebotomist' | 'patient' | 'lab_tech' | 'pathologist';

export const ROLE_HOME: Record<Role, string> = {
  admin:        '/dashboard',
  doctor:       '/doctor',
  phlebotomist: '/phlebotomist',
  patient:      '/patient',
  lab_tech:     '/reports',
  pathologist:  '/pathologist-review',
};

export const ROLE_ALLOWED: Record<Role, string[]> = {
  admin:        ['/dashboard', '/inventory', '/analytics', '/doctor', '/phlebotomist', '/patients', '/registration', '/invoices', '/reports', '/pathologist-review'],
  doctor:       ['/doctor'],
  phlebotomist: ['/phlebotomist'],
  patient:      ['/patient'],
  lab_tech:     ['/registration', '/invoices', '/reports'],
  pathologist:  ['/pathologist-review', '/reports'],
};

// ── Demo credential store ────────────────────────────────────────────────────
// In production this is replaced by Keycloak token validation on the backend.
const DEMO_PASSWORD = 'Demo@1234';

const DEMO_USERS: Record<string, { role: Role; name: string; userId: string | null }> = {
  'admin@lumina.com':        { role: 'admin',        name: 'Admin User',           userId: '00000000-0000-0000-0000-000000000013' },
  'anita.sharma@lumina.com': { role: 'doctor',       name: 'Dr. Anita Sharma',     userId: '00000000-0000-0000-0000-000000000010' },
  'ravi.kumar@lumina.com':   { role: 'phlebotomist', name: 'Ravi Kumar',           userId: '00000000-0000-0000-0000-000000000011' },
  'meera.iyer@lumina.com':   { role: 'patient',      name: 'Meera Iyer',           userId: null },
  'lab@lumina.com':          { role: 'lab_tech',     name: 'Priya Nair (Lab Tech)',userId: '00000000-0000-0000-0000-000000000014' },
  'path@lumina.com':         { role: 'pathologist',  name: 'Dr. Suresh Mehta',     userId: '00000000-0000-0000-0000-000000000015' },
};

const SESSION_KEY = 'diagdesk_session';

// ── Session type ─────────────────────────────────────────────────────────────
export interface DiagDeskUser {
  email:  string;
  name:   string;
  role:   Role;
  userId: string | null;   // FK → public.users.id
}

interface AuthCtx {
  user:    DiagDeskUser | null;
  role:    Role | null;
  loading: boolean;
  signIn:  (email: string, password: string) => Promise<Role>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<DiagDeskUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session from localStorage on mount.
  // If the stored session is missing `userId` (stale format), discard it
  // so the user is prompted to log in again with the current schema.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const session = JSON.parse(raw) as DiagDeskUser;
        if (session.email && session.role && 'userId' in session) {
          setUser(session);
        } else {
          localStorage.removeItem(SESSION_KEY); // stale — force re-login
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  async function signIn(email: string, password: string): Promise<Role> {
    const key = email.trim().toLowerCase();

    if (password !== DEMO_PASSWORD) {
      throw new Error('Invalid credentials. Demo password: Demo@1234');
    }
    const match = DEMO_USERS[key];
    if (!match) {
      throw new Error('No account found for that email.');
    }

    const session: DiagDeskUser = { email: key, ...match };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return match.role;
  }

  async function signOut() {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
