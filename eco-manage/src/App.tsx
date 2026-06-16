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
              <Route path="students" element={<Students />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="grades" element={<Grades />} />
              <Route path="finance" element={<Finance />} />
              <Route path="tuition-config" element={<TuitionConfig />} />
              <Route path="admin-workflow" element={<AdminWorkflow />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="transport" element={<Transport />} />
              <Route path="users" element={<Users />} />
              <Route path="parents" element={<Parents />} />
              <Route path="profile" element={<Profile />} />
              <Route path="mobile-access" element={<MobileAccess />} />
              <Route path="sync" element={<SyncCenter />} />
              <Route path="system-admin" element={<SystemAdmin />} />
              <Route path="advisor" element={<AdvisorPortal />} />
              <Route path="driver-portal" element={<DriverPortal />} />
              <Route path="parent-portal" element={<ParentPortal />} />
              <Route path="stats" element={<Statistics />} />
              <Route path="customization" element={<CustomizationSettings />} />
              <Route path="archives" element={<AnnualArchives />} />
              <Route path="classes" element={<Classes />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
