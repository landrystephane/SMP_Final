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

const RoleGuard: React.FC<{ roles: string[]; moduleKey?: string; children: React.ReactNode }> = ({ roles, moduleKey, children }) => {
  const { user } = useAuth();
  const needsSgCheck = user?.role === 'SG' && !roles.includes('SG') && roles.includes('DIRECTOR');
  const [sgActing, setSgActing] = React.useState(false);
  const [isModuleDisabled, setIsModuleDisabled] = React.useState(false);
  const [loading, setLoading] = React.useState(needsSgCheck || !!moduleKey);

  React.useEffect(() => {
    const run = async () => {
      if (needsSgCheck && window.electronAPI) {
        try {
          const status = await window.electronAPI.getSetting('sg_acting_director');
          setSgActing(status === 'true');
        } catch(e) {}
      }
      if (moduleKey && window.electronAPI && user?.role !== 'SUPERADMIN') {
        try {
          const disabled = await (window.electronAPI as any).getDisabledModules(user?.schoolId);
          setIsModuleDisabled((disabled || []).includes(moduleKey));
        } catch(e) {}
      }
      setLoading(false);
    };
    run();
  }, [needsSgCheck, moduleKey, user]);

  if (loading) return null;
  if (!user || (!roles.includes(user.role) && !(user.role === 'SG' && sgActing))) {
    return <Navigate to="/" replace />;
  }
  if (isModuleDisabled) {
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
              <Route path="students" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']} moduleKey="students"><Students /></RoleGuard>} />
              <Route path="subjects" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','ADVISOR','SUPERADMIN']}><Subjects /></RoleGuard>} />
              <Route path="grades" element={<RoleGuard roles={['FOUNDER','DIRECTOR','TEACHER','SG','SUPERADMIN']} moduleKey="grades"><Grades /></RoleGuard>} />
              <Route path="finance" element={<RoleGuard roles={['FOUNDER','BURSAR','SUPERADMIN']} moduleKey="finance"><Finance /></RoleGuard>} />
              <Route path="tuition-config" element={<RoleGuard roles={['FOUNDER','BURSAR','SUPERADMIN']} moduleKey="tuition_config"><TuitionConfig /></RoleGuard>} />
              <Route path="admin-workflow" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']} moduleKey="admin"><AdminWorkflow /></RoleGuard>} />
              <Route path="attendance" element={<RoleGuard roles={['FOUNDER','DIRECTOR','TEACHER','SG','ADVISOR','SUPERADMIN']} moduleKey="attendance"><Attendance /></RoleGuard>} />
              <Route path="tickets" element={<RoleGuard roles={['FOUNDER','DIRECTOR','TEACHER','SG','BURSAR','DRIVER','SUPERADMIN']} moduleKey="tickets"><Tickets /></RoleGuard>} />
              <Route path="transport" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']} moduleKey="transport"><Transport /></RoleGuard>} />
              <Route path="users" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']} moduleKey="users"><Users /></RoleGuard>} />
              <Route path="parents" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']} moduleKey="parents"><Parents /></RoleGuard>} />
              <Route path="profile" element={<Profile />} />
              <Route path="sync" element={<RoleGuard roles={['TEACHER','DIRECTOR','SG','SUPERADMIN']}><SyncCenter /></RoleGuard>} />
              <Route path="system-admin" element={<RoleGuard roles={['SUPERADMIN']}><SystemAdmin /></RoleGuard>} />
              <Route path="advisor" element={<RoleGuard roles={['FOUNDER','SG','ADVISOR','SUPERADMIN']} moduleKey="pedagogy_advisor"><AdvisorPortal /></RoleGuard>} />
              <Route path="driver-portal" element={<RoleGuard roles={['DRIVER','SUPERADMIN']}><DriverPortal /></RoleGuard>} />
              <Route path="parent-portal" element={<RoleGuard roles={['PARENT','FOUNDER','SUPERADMIN']}><ParentPortal /></RoleGuard>} />
              <Route path="stats" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SUPERADMIN']} moduleKey="stats"><Statistics /></RoleGuard>} />
              <Route path="customization" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SUPERADMIN']} moduleKey="customization"><CustomizationSettings /></RoleGuard>} />
              <Route path="archives" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SUPERADMIN']} moduleKey="archives"><AnnualArchives /></RoleGuard>} />
              <Route path="classes" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']}><Classes /></RoleGuard>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
