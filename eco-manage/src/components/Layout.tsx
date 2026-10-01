import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, BookOpen, GraduationCap, LayoutDashboard,
  LogOut, Wallet, Building2, Briefcase, Calendar,
  Settings, Bus, HelpCircle, Bell, UserCircle, RefreshCcw, TabletSmartphone, Server, Archive, Menu, X, CreditCard, ClipboardList, ShieldCheck, UserCheck, MessageSquare, RefreshCw, HeartHandshake, TrendingUp, Palette, Award, MessageCircle, Search, NotebookPen
} from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useNotification } from '../context/NotificationContext';
import { useOnlineStatus } from '../utils/dataSync';
import { getOfflineQueueCount } from '../saasApiBridge';

const Layout: React.FC = () => {
  const { user, logout, hasRole, exitImpersonation } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [schoolName, setSchoolName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [isSgActing, setIsSgActing] = useState(false);
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  const [myAllowedModules, setMyAllowedModules] = useState<string[] | null>(null);

  const { showNotification } = useNotification();
  const isOnline = useOnlineStatus();
  const [queueCount, setQueueCount] = useState(getOfflineQueueCount());
  const [isFlushing, setIsFlushing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [durations, setDurations] = useState<Record<number, number>>({});
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedReplacementTeacher, setSelectedReplacementTeacher] = useState<Record<number, string>>({});

  const loadNotifications = async () => {
    if (window.electronAPI && user) {
      try {
        const notifs = await window.electronAPI.getNotifications({
          userId: user.id,
          schoolId: user.schoolId,
          role: user.role
        });
        setNotifications(notifs || []);

        const count = await window.electronAPI.getUnreadTicketsCount({
          userId: user.id,
          role: user.role,
          schoolId: user.schoolId
        });
        setUnreadTicketsCount(count || 0);

        if (['FOUNDER', 'DIRECTOR', 'SG', 'ADVISOR'].includes(user.role)) {
          const allUsers = await window.electronAPI.getUsers(user.schoolId);
          setTeachers((allUsers || []).filter((u: any) => u.role === 'TEACHER'));
        }
      } catch (e) {
        console.error("Failed to load notifications", e);
      }
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const onQueueChanged = (e: Event) => setQueueCount((e as CustomEvent).detail?.count ?? 0);
    const onFlushing = () => { setIsFlushing(true); setTimeout(() => setIsFlushing(false), 5000); };
    window.addEventListener('eco:queue-changed', onQueueChanged);
    window.addEventListener('eco:queue-flushing', onFlushing);
    return () => {
      window.removeEventListener('eco:queue-changed', onQueueChanged);
      window.removeEventListener('eco:queue-flushing', onFlushing);
    };
  }, []);

  const handleResolveRequest = async (notifId: number, action: 'APPROVED' | 'REJECTED', n: any) => {
    if (!window.electronAPI) return;
    try {
      if (n.request_type === 'EXAM_SURVEILLANCE_REQUEST') {
          const reqData = JSON.parse(n.request_data || '{}');
          if (action === 'REJECTED') {
              const reason = window.prompt(t('lay_refusal_reason_prompt'));
              if (!reason) return;
              await (window.electronAPI as any).respondExamSurveillance({
                  notificationId: notifId,
                  examId: reqData.exam_id,
                  status: 'PENDING_ADMIN',
                  rejectionReason: reason,
                  schoolId: user?.schoolId
              });
              showNotification(t('lay_refusal_sent_admin'), "info");
          } else {
              await (window.electronAPI as any).respondExamSurveillance({
                  notificationId: notifId,
                  examId: reqData.exam_id,
                  status: 'APPROVED',
                  schoolId: user?.schoolId
              });
              showNotification(t('lay_surveillance_approved'), "success");
          }
      } else if (n.request_type === 'EXAM_SURVEILLANCE_REFUSAL') {
          const reqData = JSON.parse(n.request_data || '{}');
          if (action === 'APPROVED') {
              const newTeacherId = selectedReplacementTeacher[notifId];
              if (!newTeacherId) {
                  showNotification(t('lay_select_replacement_teacher_warning'), "warning");
                  return;
              }
              await (window.electronAPI as any).reassignExamSurveillant({
                  examId: reqData.exam_id,
                  newTeacherId: parseInt(newTeacherId),
                  schoolId: user?.schoolId,
                  notificationId: notifId
              });
              setSelectedReplacementTeacher(prev => { const copy = {...prev}; delete copy[notifId]; return copy; });
              showNotification(t('lay_refusal_accepted_replaced'), "success");
          } else {
              await (window.electronAPI as any).adminResolveExamRefusal({
                  notificationId: notifId,
                  examId: reqData.exam_id,
                  adminAction: 'FORCE_ASSIGNMENT',
                  schoolId: user?.schoolId
              });
              showNotification(t('lay_surveillance_maintained'), "info");
          }
      } else if (n.request_type === 'CASH_WITHDRAWAL') {
          await (window.electronAPI as any).resolveSystemRequest({
              notificationId: notifId,
              action,
              resolvedBy: user?.id || 1
          });
          showNotification(
              action === 'APPROVED' ? t('lay_expense_approved_short') : t('lay_expense_rejected_short'),
              action === 'APPROVED' ? "success" : "info"
          );
      } else if (n.request_type === 'ABSENCE_JUSTIFICATION') {
          const reqData = JSON.parse(n.request_data || '{}');
          let teacherResponse: string | null = null;
          if (action === 'REJECTED') {
              teacherResponse = window.prompt(t('lay_justif_rejection_reason', 'Motif du refus (optionnel)') || 'Motif du refus (optionnel)');
          }
          await (window.electronAPI as any).reviewAbsenceJustification({
              justificationId: reqData.justificationId,
              decision: action,
              teacherResponse: teacherResponse || null,
              notificationId: notifId
          });
          showNotification(
              action === 'APPROVED' ? t('lay_justif_approved', 'Justification acceptée — absence retirée du dossier') : t('lay_justif_rejected', 'Justification refusée'),
              action === 'APPROVED' ? "success" : "info"
          );
      } else {
          const duration = durations[notifId] || 24;
          await (window.electronAPI as any).resolveSystemRequest({
            notificationId: notifId,
            action,
            durationHours: duration,
            resolvedBy: user?.id || 1
          });
          showNotification(
            action === 'APPROVED' ? t('lay_request_approved_short') : t('lay_request_rejected_short'),
            action === 'APPROVED' ? "success" : "info"
          );
      }
      loadNotifications();
    } catch (e: any) {
      showNotification(e.message || t('lay_processing_error'), "error");
    }
  };

  const handleMarkAsRead = async (notifId: number) => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.markNotificationRead(notifId);
      loadNotifications();
    } catch (e: any) {
      console.error(e);
    }
  };

  const pendingNotifsCount = notifications.filter(n => 
    n.is_read === 0 || (n.type === 'ACTION_REQUIRED' && n.action_status === 'PENDING')
  ).length;

  useEffect(() => {
    const loadActiveSchool = async () => {
      if (window.electronAPI && user) {
        if (user.role === 'SUPERADMIN' && !localStorage.getItem('impersonated_school_id')) {
          setSchoolName('SuperAdmin Portal');
          return;
        }
        try {
          const schools = await window.electronAPI.getSchools();
          const currentSchool = schools.find((s: any) => s.id?.toString() === user.schoolId?.toString());
          if (currentSchool) {
            if (currentSchool.is_active === 0 && user.role !== 'SUPERADMIN') {
              alert(t('lay_school_suspended_alert'));
              handleLogout();
              return;
            }
            setSchoolName(currentSchool.name);
          } else {
            if (user.schoolId && user.role !== 'SUPERADMIN') {
              alert(t('lay_school_deleted_alert'));
              handleLogout();
              return;
            }
            setSchoolName('');
          }
        } catch (e) {
          console.error("Failed to load school name in layout", e);
        }
      } else {
        setSchoolName('');
      }

      if (window.electronAPI) {
          const sgActing = await window.electronAPI.getSetting('sg_acting_director');
          setIsSgActing(sgActing === 'true');
          try {
              const disabled = await (window.electronAPI as any).getDisabledModules(user?.schoolId);
              setDisabledModules(disabled || []);
          } catch(e) { setDisabledModules([]); }
          try {
              const allowed = await (window.electronAPI as any).getMyAllowedModules();
              setMyAllowedModules(allowed);
          } catch(e) { setMyAllowedModules(null); }
      }
    };
    loadActiveSchool();
    const interval = setInterval(loadActiveSchool, 60000);
    
    // Override window.alert
    const originalAlert = window.alert;
    window.alert = (message) => {
        if (window.electronAPI && (window.electronAPI as any).showAlert) {
            (window.electronAPI as any).showAlert(message, schoolName);
        } else {
            originalAlert.call(window, message);
        }
    };

    return () => {
        clearInterval(interval);
        window.alert = originalAlert;
    };
  }, [user, schoolName]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isImpersonating = localStorage.getItem('impersonated_school_id') !== null;

  const menuItems = [
    { key: 'dashboard', path: '/', icon: LayoutDashboard, roles: ['FOUNDER', 'DIRECTOR', 'BURSAR', 'TEACHER', 'SG', 'ADVISOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'students', path: '/students', icon: Users, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'subjects', path: '/subjects', icon: BookOpen, roles: ['FOUNDER', 'DIRECTOR', 'SG', 'ADVISOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'classes', path: '/classes', icon: Building2, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'grades', path: '/grades', icon: ClipboardList, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'pedagogy_advisor', path: '/advisor', icon: Award, roles: ['FOUNDER', 'ADVISOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'finance', path: '/finance', icon: CreditCard, roles: ['FOUNDER', 'BURSAR'], hideForSuperAdmin: !isImpersonating },
    { key: 'tuition_config', path: '/tuition-config', icon: Settings, roles: ['FOUNDER', 'BURSAR'], hideForSuperAdmin: !isImpersonating },
    { key: 'attendance', path: '/attendance', icon: UserCheck, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SG', 'ADVISOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'stats', path: '/stats', icon: TrendingUp, roles: isSgActing ? ['FOUNDER', 'DIRECTOR', 'SG'] : ['FOUNDER', 'DIRECTOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'admin', path: '/admin-workflow', icon: ShieldCheck, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'users', path: '/users', icon: UserCheck, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'parents', path: '/parents', icon: HeartHandshake, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'transport', path: '/transport', icon: Bus, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'tickets', path: '/tickets', icon: MessageSquare, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'BURSAR', 'DRIVER', 'MAINTENANCE', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'messaging', path: '/messaging', icon: MessageCircle, roles: ['FOUNDER', 'DIRECTOR', 'SG', 'BURSAR', 'TEACHER', 'ADVISOR', 'DRIVER'], hideForSuperAdmin: !isImpersonating },
    { key: 'customization', path: '/customization', icon: Palette, roles: isSgActing ? ['FOUNDER', 'DIRECTOR', 'SG'] : ['FOUNDER', 'DIRECTOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'archives', path: '/archives', icon: Archive, roles: ['FOUNDER', 'DIRECTOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'lesson_diary', path: '/lesson-diary', icon: NotebookPen, roles: ['TEACHER'], hideForSuperAdmin: !isImpersonating },
    { key: 'system_admin', path: '/system-admin', icon: Building2, roles: ['SUPERADMIN'] },
    { key: 'sync', path: '/sync', icon: RefreshCw, roles: ['TEACHER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'transport_driver', path: '/driver-portal', icon: Bus, roles: ['DRIVER'] },
    { key: 'parent_portal', path: '/parent-portal', icon: HeartHandshake, roles: ['PARENT', 'SUPERADMIN', 'FOUNDER'] },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 overflow-hidden">
      {/* Mobile Header Bar */}
      <header className="md:hidden bg-slate-900 border-b border-white/5 px-6 py-4 flex items-center justify-between z-40">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500 rounded-xl">
            <GraduationCap className="w-5 h-5 text-slate-950" />
          </div>
          <h2 className="text-sm font-black text-white leading-none tracking-tight truncate max-w-[180px]">{schoolName}</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <Bell className="w-5 h-5" />
            {pendingNotifsCount > 0 && (
              <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-slate-900 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Sidebar Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 w-72 bg-slate-900 md:bg-slate-900/40 border-r border-white/5 flex flex-col z-50 transform transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:flex-shrink-0`}
      >
        <div className="relative" style={{ backgroundImage: 'linear-gradient(180deg, rgba(245,158,11,0.08) 0%, transparent 100%)' }}>
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
          <div className="p-7 pb-5">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="p-2.5 bg-amber-500 rounded-xl shadow-2xl shadow-amber-500/30 flex-shrink-0">
                  <GraduationCap className="w-7 h-7 text-slate-950" />
              </div>
              <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-black text-white leading-none tracking-tight truncate" title={schoolName}>{schoolName}</h2>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 truncate" title={user?.fullName || user?.username}>{user?.fullName || user?.username}</p>
                  <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest mt-1 inline-block bg-amber-500/10 px-2 py-0.5 rounded-full">{t(`role_${user?.role}`)}</span>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <LanguageSwitcher />
          <div className="flex items-center justify-between mt-6 bg-white/5 p-3 rounded-2xl border border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('lay_alerts_center')}</span>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all animate-pulse-subtle"
            >
              <Bell className="w-4 h-4" />
              {pendingNotifsCount > 0 && (
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-900 animate-pulse" />
              )}
            </button>
          </div>
          </div>
        </div>

        {/* Barre de recherche modules */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-3 py-2 focus-within:border-amber-500/50 transition-all">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={navSearch}
              onChange={e => setNavSearch(e.target.value)}
              placeholder={t('nav_search_placeholder', 'Rechercher un module...')}
              className="bg-transparent text-xs font-bold text-white placeholder:text-slate-600 outline-none w-full"
            />
            {navSearch && (
              <button onClick={() => setNavSearch('')} className="text-slate-500 hover:text-white transition-all shrink-0">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto min-h-0 custom-scrollbar">
          {(() => {
            const filtered = menuItems.filter(item => {
              if (user?.role === 'SUPERADMIN' && item.hideForSuperAdmin) return false;
              if (item.key === 'mobile_access' && (window as any).electronAPI?.isWebMode) return false;
              if (user?.role !== 'SUPERADMIN' && disabledModules.includes(item.key)) return false;
              if (!['SUPERADMIN', 'FOUNDER', 'DIRECTOR'].includes(user?.role || '') && myAllowedModules && myAllowedModules.length > 0 && !myAllowedModules.includes(item.key) && item.key !== 'dashboard' && item.key !== 'profile') return false;
              if (!hasRole(item.roles as any)) return false;
              if (navSearch.trim()) {
                const label = (t(item.key) || item.key.replace(/_/g, ' ')).toLowerCase();
                return label.includes(navSearch.trim().toLowerCase());
              }
              return true;
            });
            if (filtered.length === 0 && navSearch.trim()) {
              return (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Search className="w-6 h-6 text-slate-700" />
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">
                    {t('nav_no_result', 'Aucun module trouvé')}
                  </p>
                </div>
              );
            }
            return filtered.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => { setIsSidebarOpen(false); setNavSearch(''); }}
                className={({ isActive }) =>
                  `flex items-center px-5 py-3.5 rounded-2xl transition-all text-xs font-black uppercase tracking-widest border border-transparent ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-2xl shadow-amber-500/20 border-amber-400/50 scale-[1.02]'
                      : 'text-slate-500 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5 mr-4 opacity-70 relative" />
                <div className="flex-1 flex justify-between items-center">
                  <span>{t(item.key) || item.key.replace(/_/g, ' ')}</span>
                  {item.key === 'tickets' && unreadTicketsCount > 0 && (
                    <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/20">
                      {unreadTicketsCount}
                    </span>
                  )}
                </div>
              </NavLink>
            ));
          })()}
        </nav>

        <div className="p-6 border-t border-white/5 bg-slate-900/20 space-y-2">
          {(window as any).__pwaInstallPrompt && (
            <button
              onClick={async () => {
                const prompt = (window as any).__pwaInstallPrompt;
                if (prompt) { prompt.prompt(); const r = await prompt.userChoice; if (r.outcome === 'accepted') (window as any).__pwaInstallPrompt = null; }
              }}
              className="flex items-center w-full px-5 py-4 text-emerald-500 hover:bg-emerald-500/10 rounded-2xl transition-all text-xs font-black uppercase tracking-widest"
            >
              <TabletSmartphone className="w-5 h-5 mr-4" />
              {t('install_app', 'Installer l\'App')}
            </button>
          )}
          <button
            onClick={() => { setIsSidebarOpen(false); handleLogout(); }}
            className="flex items-center w-full px-5 py-4 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 rounded-2xl transition-all text-xs font-black uppercase tracking-widest"
          >
            <LogOut className="w-5 h-5 mr-4" />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-[#030711] via-[#080d1a] to-[#030711]">
        {/* Bannière hors-connexion / synchronisation */}
        {!isOnline ? (
          <div className="bg-slate-800 border-b border-rose-500/30 px-4 py-2.5 flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
            <span className="text-xs font-black text-rose-400 uppercase tracking-widest flex-1">
              Hors connexion — données en cache.
              {queueCount > 0 && (
                <span className="ml-2 bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[10px]">
                  {queueCount} action{queueCount > 1 ? 's' : ''} en attente de sync
                </span>
              )}
            </span>
          </div>
        ) : isFlushing ? (
          <div className="bg-emerald-900/40 border-b border-emerald-500/30 px-4 py-2.5 flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">
              Synchronisation en cours — envoi des données en attente…
            </span>
          </div>
        ) : null}
        {user?.role === 'SUPERADMIN' && isImpersonating && (
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 flex items-center justify-between shadow-2xl border-b border-amber-400/20">
            <div className="flex items-center space-x-3">
              <span className="animate-pulse flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-slate-950"></span>
              </span>
              <span className="text-slate-950 text-xs font-black uppercase tracking-widest">
                {t('lay_superadmin_immersion_mode')}
              </span>
            </div>
            <button
              onClick={async () => {
                await exitImpersonation();
                navigate('/');
              }}
              className="bg-slate-950 hover:bg-slate-900 text-amber-500 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
            >
              {t('lay_exit_immersion')}
            </button>
          </div>
        )}
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>

      {/* Notifications Drawer */}
      {isNotifOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-end p-6 pointer-events-none animate-in fade-in duration-200">
          <div 
            onClick={() => setIsNotifOpen(false)} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />
          
          <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 pointer-events-auto mt-16 md:mt-0 animate-in fade-in slide-in-from-top-5 duration-300 max-h-[85vh] flex flex-col z-50">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">{t('lay_alerts_center')}</h3>
                {pendingNotifsCount > 0 && (
                  <span className="bg-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                    {pendingNotifsCount} {t('lay_active_count_suffix')}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setIsNotifOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs text-slate-500 font-bold">{t('lay_no_notifications_yet')}</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const isPending = n.type === 'ACTION_REQUIRED' && n.action_status === 'PENDING';
                  return (
                    <div 
                      key={n.id} 
                      className={`p-4 rounded-2xl border transition-all ${
                        isPending 
                          ? 'bg-amber-500/10 border-amber-500/20 shadow-lg' 
                          : 'bg-white/5 border-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          n.type === 'ACTION_REQUIRED' 
                            ? 'bg-amber-500/20 text-amber-400' 
                            : 'bg-white/10 text-slate-300'
                        }`}>
                          {n.type === 'ACTION_REQUIRED' ? t('action_required', 'Action Requise') : t('message_type', 'Message')}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed font-bold mb-3">{n.message}</p>

                      {isPending && (
                        <div className="space-y-3 border-t border-white/5 pt-3 mt-2">
                          {(n.request_type === 'GRADE_REACTIVATION' || n.request_type === 'ATTENDANCE_REACTIVATION') && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-bold">{t('lay_reactivation_duration')}</span>
                              <select
                                value={durations[n.id] || 24}
                                onChange={(e) => setDurations({...durations, [n.id]: parseInt(e.target.value)})}
                                className="bg-slate-950 border border-white/10 text-white rounded-xl px-2 py-1 outline-none text-xs font-black"
                              >
                                <option value={2}>{t('lay_hours_2')}</option>
                                <option value={6}>{t('lay_hours_6')}</option>
                                <option value={12}>{t('lay_hours_12')}</option>
                                <option value={24}>{t('lay_hours_24')}</option>
                                <option value={48}>{t('lay_hours_48')}</option>
                              </select>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            {n.request_type === 'SUBJECT_ACTIVATION' ? (
                              <button
                                onClick={() => handleResolveRequest(n.id, 'APPROVED', n)}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all"
                              >
                                {t('lay_mark_as_processed')}
                              </button>
                            ) : n.request_type === 'EXAM_SURVEILLANCE_REFUSAL' ? (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">{t('lay_replacement_teacher')}</label>
                                  <select
                                    title={t('lay_replacement_teacher')}
                                    value={selectedReplacementTeacher[n.id] || ''}
                                    onChange={(e) => setSelectedReplacementTeacher(prev => ({...prev, [n.id]: e.target.value}))}
                                    className="w-full bg-slate-950 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500"
                                  >
                                    <option value="">{t('lay_select_placeholder')}</option>
                                    {teachers.map(t => (
                                      <option key={t.id} value={t.id}>{t.full_name || t.fullName}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleResolveRequest(n.id, 'APPROVED', n)}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all"
                                  >
                                    {t('lay_accept_and_replace')}
                                  </button>
                                  <button
                                    onClick={() => handleResolveRequest(n.id, 'REJECTED', n)}
                                    className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all border border-rose-500/30"
                                  >
                                    {t('lay_force_maintain')}
                                  </button>
                                </div>
                              </div>
                            ) : n.request_type === 'CASH_WITHDRAWAL' ? (
                              <>
                                <button
                                  onClick={() => handleResolveRequest(n.id, 'APPROVED', n)}
                                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all"
                                >
                                  {t('lay_approve_disbursement')}
                                </button>
                                <button
                                  onClick={() => handleResolveRequest(n.id, 'REJECTED', n)}
                                  className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all border border-rose-500/30"
                                >
                                  {t('lay_reject')}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleResolveRequest(n.id, 'APPROVED', n)}
                                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all"
                                >
                                  {t('lay_approve')}
                                </button>
                                <button
                                  onClick={() => handleResolveRequest(n.id, 'REJECTED', n)}
                                  className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all border border-rose-500/30"
                                >
                                  {t('lay_reject')}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {!isPending && n.is_read === 0 && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="text-[10px] text-amber-500 hover:text-amber-400 font-black uppercase tracking-wider transition-all"
                          >
                            {t('lay_mark_as_read')}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
