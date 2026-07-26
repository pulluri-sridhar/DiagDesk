import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, ROLE_HOME } from './lib/auth';
import ProtectedRoute       from './components/ProtectedRoute';
import Login                from './pages/Login';
import AdminDashboard       from './pages/AdminDashboard';
import InventoryManager     from './pages/InventoryManager';
import PhlebotomistMobile   from './pages/PhlebotomistMobile';
import DoctorPortal         from './pages/DoctorPortal';
import PatientPortal        from './pages/PatientPortal';
import PatientRecords       from './pages/PatientRecords';
import AnalyticsDashboard   from './pages/AnalyticsDashboard';
import PatientRegistration  from './pages/PatientRegistration';
import InvoiceManager       from './pages/InvoiceManager';
import ReportManager        from './pages/ReportManager';
import PathologistQueue     from './pages/PathologistQueue';

// Redirect authenticated users away from /login to their role home
function LoginRoute() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (user && role) return <Navigate to={ROLE_HOME[role]} replace />;
  return <Login />;
}

// Redirect / to role home (or /login if not authenticated)
function RootRoute() {
  const { user, role, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[role!]} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/"      element={<RootRoute />} />

          <Route path="/dashboard" element={
            <ProtectedRoute allow="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/inventory" element={
            <ProtectedRoute allow="admin">
              <InventoryManager />
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute allow="admin">
              <AnalyticsDashboard />
            </ProtectedRoute>
          } />

          <Route path="/phlebotomist" element={
            <ProtectedRoute allow={['phlebotomist', 'admin']}>
              <PhlebotomistMobile />
            </ProtectedRoute>
          } />

          <Route path="/doctor" element={
            <ProtectedRoute allow={['doctor', 'admin']}>
              <DoctorPortal />
            </ProtectedRoute>
          } />

          <Route path="/patient" element={
            <ProtectedRoute allow="patient">
              <PatientPortal />
            </ProtectedRoute>
          } />

          <Route path="/patients" element={
            <ProtectedRoute allow="admin">
              <PatientRecords />
            </ProtectedRoute>
          } />

          <Route path="/registration" element={
            <ProtectedRoute allow={['admin', 'lab_tech']}>
              <PatientRegistration />
            </ProtectedRoute>
          } />

          <Route path="/invoices" element={
            <ProtectedRoute allow={['admin', 'lab_tech']}>
              <InvoiceManager />
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute allow={['admin', 'lab_tech', 'pathologist']}>
              <ReportManager />
            </ProtectedRoute>
          } />

          <Route path="/pathologist-review" element={
            <ProtectedRoute allow={['admin', 'pathologist']}>
              <PathologistQueue />
            </ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<RootRoute />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
