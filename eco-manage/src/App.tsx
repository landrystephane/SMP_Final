import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Subjects from './pages/Subjects';
import Grades from './pages/Grades';
import Finance from './pages/Finance';
import TuitionConfig from './pages/TuitionConfig';
import AdminWorkflow from './pages/AdminWorkflow';
import Attendance from './pages/Attendance';
import Tickets from './pages/Tickets';
import Transport from './pages/Transport';
import Users from './pages/Users';
import Parents from './pages/Parents';
import Profile from './pages/Profile';
import MobileAccess from './pages/MobileAccess';
import MobileProvisioning from './pages/MobileProvisioning';
import SyncCenter from './pages/SyncCenter';
import SystemAdmin from './pages/SystemAdmin';
import AdvisorPortal from './pages/AdvisorPortal';
import DriverPortal from './pages/DriverPortal';
import ParentPortal from './pages/ParentPortal';
import Statistics from './pages/Statistics';
import CustomizationSettings from './pages/CustomizationSettings';
import AnnualArchives from './pages/AnnualArchives';
import Classes from './pages/Classes';
import './index.css';

import { useTranslation } from 'react-i18next';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isRestoringSession } = useAuth();
  const { t } = useTranslation();

  if (isRestoringSession) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white font-black text-sm italic uppercase tracking-[0.2em]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>{t('verifying_session', 'Vérification de la session...')}</span>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const RoleGuard: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/activate" element={<MobileProvisioning />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="students" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SECRETARY','SG','SUPERADMIN']}><Students /></RoleGuard>} />
              <Route path="subjects" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','ADVISOR','SUPERADMIN']}><Subjects /></RoleGuard>} />
              <Route path="grades" element={<RoleGuard roles={['FOUNDER','DIRECTOR','TEACHER','SG','SUPERADMIN']}><Grades /></RoleGuard>} />
              <Route path="finance" element={<RoleGuard roles={['FOUNDER','BURSAR','SUPERADMIN']}><Finance /></RoleGuard>} />
              <Route path="tuition-config" element={<RoleGuard roles={['FOUNDER','BURSAR','SUPERADMIN']}><TuitionConfig /></RoleGuard>} />
              <Route path="admin-workflow" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SECRETARY','SG','SUPERADMIN']}><AdminWorkflow /></RoleGuard>} />
              <Route path="attendance" element={<RoleGuard roles={['FOUNDER','DIRECTOR','TEACHER','SECRETARY','SG','ADVISOR','SUPERADMIN']}><Attendance /></RoleGuard>} />
              <Route path="tickets" element={<RoleGuard roles={['FOUNDER','DIRECTOR','TEACHER','SECRETARY','BURSAR','DRIVER','SG','SUPERADMIN']}><Tickets /></RoleGuard>} />
              <Route path="transport" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']}><Transport /></RoleGuard>} />
              <Route path="users" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']}><Users /></RoleGuard>} />
              <Route path="parents" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SECRETARY','SG','SUPERADMIN']}><Parents /></RoleGuard>} />
              <Route path="profile" element={<Profile />} />
              <Route path="mobile-access" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SECRETARY','SG','SUPERADMIN']}><MobileAccess /></RoleGuard>} />
              <Route path="sync" element={<RoleGuard roles={['TEACHER','DIRECTOR','SECRETARY','SUPERADMIN']}><SyncCenter /></RoleGuard>} />
              <Route path="system-admin" element={<RoleGuard roles={['SUPERADMIN']}><SystemAdmin /></RoleGuard>} />
              <Route path="advisor" element={<RoleGuard roles={['FOUNDER','SG','ADVISOR','SUPERADMIN']}><AdvisorPortal /></RoleGuard>} />
              <Route path="driver-portal" element={<RoleGuard roles={['DRIVER','SUPERADMIN']}><DriverPortal /></RoleGuard>} />
              <Route path="parent-portal" element={<RoleGuard roles={['PARENT','FOUNDER','SUPERADMIN']}><ParentPortal /></RoleGuard>} />
              <Route path="stats" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SUPERADMIN']}><Statistics /></RoleGuard>} />
              <Route path="customization" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SUPERADMIN']}><CustomizationSettings /></RoleGuard>} />
              <Route path="archives" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SUPERADMIN']}><AnnualArchives /></RoleGuard>} />
              <Route path="classes" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']}><Classes /></RoleGuard>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
