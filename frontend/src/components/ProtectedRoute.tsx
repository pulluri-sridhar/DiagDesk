import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE_HOME, type Role } from '../lib/auth';

interface Props {
  children: React.ReactNode;
  allow: Role | Role[];
}

export default function ProtectedRoute({ children, allow }: Props) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F4F7' }}>
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-5xl" style={{ color: '#17A077', animation: 'spin 1s linear infinite' }}>
            progress_activity
          </span>
          <p className="text-sm font-medium" style={{ color: '#888' }}>Loading DiagDesk…</p>
        </div>
      </div>
    );
  }

  // Not logged in → go to login, remember where they were headed
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but wrong role for this route → send to their home
  const allowed = Array.isArray(allow) ? allow : [allow];
  if (role && !allowed.includes(role)) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  return <>{children}</>;
}
