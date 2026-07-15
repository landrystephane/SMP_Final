import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import HelpGuide from './components/HelpGuide';
import OnboardingModal from './components/OnboardingModal';
import './index.css';

// Chargement différé de toutes les pages — réduit le bundle initial
const Dashboard            = React.lazy(() => import('./pages/Dashboard'));
const Students             = React.lazy(() => import('./pages/Students'));
const Subjects             = React.lazy(() => import('./pages/Subjects'));
const Grades               = React.lazy(() => import('./pages/Grades'));
const Finance              = React.lazy(() => import('./pages/Finance'));
const TuitionConfig        = React.lazy(() => import('./pages/TuitionConfig'));
const AdminWorkflow        = React.lazy(() => import('./pages/AdminWorkflow'));
const Attendance           = React.lazy(() => import('./pages/Attendance'));
const Tickets              = React.lazy(() => import('./pages/Tickets'));
const Transport            = React.lazy(() => import('./pages/Transport'));
const Users                = React.lazy(() => import('./pages/Users'));
const Parents              = React.lazy(() => import('./pages/Parents'));
const Profile              = React.lazy(() => import('./pages/Profile'));
const MobileProvisioning   = React.lazy(() => import('./pages/MobileProvisioning'));
const SyncCenter           = React.lazy(() => import('./pages/SyncCenter'));
const SystemAdmin          = React.lazy(() => import('./pages/SystemAdmin'));
const AdvisorPortal        = React.lazy(() => import('./pages/AdvisorPortal'));
const DriverPortal         = React.lazy(() => import('./pages/DriverPortal'));
const ParentPortal         = React.lazy(() => import('./pages/ParentPortal'));
const Statistics           = React.lazy(() => import('./pages/Statistics'));
const CustomizationSettings = React.lazy(() => import('./pages/CustomizationSettings'));
const AnnualArchives       = React.lazy(() => import('./pages/AnnualArchives'));
const LessonDiary          = React.lazy(() => import('./pages/LessonDiary'));
const Classes              = React.lazy(() => import('./pages/Classes'));
const Messaging            = React.lazy(() => import('./pages/Messaging'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[300px]">
    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

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
          if ((disabled || []).includes(moduleKey)) {
            setIsModuleDisabled(true);
          } else {
            const allowed = await (window.electronAPI as any).getMyAllowedModules();
            if (allowed && allowed.length > 0 && !allowed.includes(moduleKey)) {
              setIsModuleDisabled(true);
            }
          }
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
  if (isModuleDisabled && !roles.includes(user.role)) {
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
            <Route path="/login/:slug" element={<Login />} />
            <Route path="/activate" element={<Suspense fallback={<PageLoader />}><MobileProvisioning /></Suspense>} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
              <Route path="students" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']} moduleKey="students"><Suspense fallback={<PageLoader />}><Students /></Suspense></RoleGuard>} />
              <Route path="subjects" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','ADVISOR','SUPERADMIN']}><Suspense fallback={<PageLoader />}><Subjects /></Suspense></RoleGuard>} />
              <Route path="grades" element={<RoleGuard roles={['FOUNDER','DIRECTOR','TEACHER','SG','SUPERADMIN']} moduleKey="grades"><Suspense fallback={<PageLoader />}><Grades /></Suspense></RoleGuard>} />
              <Route path="finance" element={<RoleGuard roles={['FOUNDER','BURSAR','SUPERADMIN']} moduleKey="finance"><Suspense fallback={<PageLoader />}><Finance /></Suspense></RoleGuard>} />
              <Route path="tuition-config" element={<RoleGuard roles={['FOUNDER','BURSAR','SUPERADMIN']} moduleKey="tuition_config"><Suspense fallback={<PageLoader />}><TuitionConfig /></Suspense></RoleGuard>} />
              <Route path="admin-workflow" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']} moduleKey="admin"><Suspense fallback={<PageLoader />}><AdminWorkflow /></Suspense></RoleGuard>} />
              <Route path="attendance" element={<RoleGuard roles={['FOUNDER','DIRECTOR','TEACHER','SG','ADVISOR','SUPERADMIN']} moduleKey="attendance"><Suspense fallback={<PageLoader />}><Attendance /></Suspense></RoleGuard>} />
              <Route path="tickets" element={<RoleGuard roles={['FOUNDER','DIRECTOR','TEACHER','SG','BURSAR','DRIVER','SUPERADMIN']} moduleKey="tickets"><Suspense fallback={<PageLoader />}><Tickets /></Suspense></RoleGuard>} />
              <Route path="transport" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']} moduleKey="transport"><Suspense fallback={<PageLoader />}><Transport /></Suspense></RoleGuard>} />
              <Route path="users" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']} moduleKey="users"><Suspense fallback={<PageLoader />}><Users /></Suspense></RoleGuard>} />
              <Route path="parents" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']} moduleKey="parents"><Suspense fallback={<PageLoader />}><Parents /></Suspense></RoleGuard>} />
              <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
              <Route path="sync" element={<RoleGuard roles={['TEACHER','DIRECTOR','SG','SUPERADMIN']}><Suspense fallback={<PageLoader />}><SyncCenter /></Suspense></RoleGuard>} />
              <Route path="system-admin" element={<RoleGuard roles={['SUPERADMIN']}><Suspense fallback={<PageLoader />}><SystemAdmin /></Suspense></RoleGuard>} />
              <Route path="advisor" element={<RoleGuard roles={['FOUNDER','SG','ADVISOR','SUPERADMIN']} moduleKey="pedagogy_advisor"><Suspense fallback={<PageLoader />}><AdvisorPortal /></Suspense></RoleGuard>} />
              <Route path="driver-portal" element={<RoleGuard roles={['DRIVER','SUPERADMIN']}><Suspense fallback={<PageLoader />}><DriverPortal /></Suspense></RoleGuard>} />
              <Route path="parent-portal" element={<RoleGuard roles={['PARENT','FOUNDER','SUPERADMIN']}><Suspense fallback={<PageLoader />}><ParentPortal /></Suspense></RoleGuard>} />
              <Route path="stats" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SUPERADMIN']} moduleKey="stats"><Suspense fallback={<PageLoader />}><Statistics /></Suspense></RoleGuard>} />
              <Route path="customization" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SUPERADMIN']} moduleKey="customization"><Suspense fallback={<PageLoader />}><CustomizationSettings /></Suspense></RoleGuard>} />
              <Route path="archives" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SUPERADMIN']} moduleKey="archives"><Suspense fallback={<PageLoader />}><AnnualArchives /></Suspense></RoleGuard>} />
              <Route path="lesson-diary" element={<RoleGuard roles={['FOUNDER','DIRECTOR','ADVISOR','TEACHER','SUPERADMIN']} moduleKey="lesson_diary"><Suspense fallback={<PageLoader />}><LessonDiary /></Suspense></RoleGuard>} />
              <Route path="classes" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','SUPERADMIN']}><Suspense fallback={<PageLoader />}><Classes /></Suspense></RoleGuard>} />
              <Route path="messaging" element={<RoleGuard roles={['FOUNDER','DIRECTOR','SG','BURSAR','TEACHER','ADVISOR','DRIVER','SUPERADMIN']} moduleKey="messaging"><Suspense fallback={<PageLoader />}><Messaging /></Suspense></RoleGuard>} />
            </Route>
          </Routes>
          <HelpGuide />
          <OnboardingModal />
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
