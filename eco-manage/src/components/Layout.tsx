import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, BookOpen, GraduationCap, LayoutDashboard,
  LogOut, Wallet, Building2, Briefcase, Calendar, 
  Settings, Bus, HelpCircle, Bell, UserCircle, RefreshCcw, TabletSmartphone, Server, Archive, Menu, X, CreditCard, ClipboardList, ShieldCheck, UserCheck, MessageSquare, RefreshCw, HeartHandshake, TrendingUp, Palette, Award
} from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useNotification } from '../context/NotificationContext';

const Layout: React.FC = () => {
  const { user, logout, hasRole, exitImpersonation } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [schoolName, setSchoolName] = useState('Eco-Manage');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSgActing, setIsSgActing] = useState(false);

  const { showNotification } = useNotification();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [durations, setDurations] = useState<Record<number, number>>({});
  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0);

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

  const handleResolveRequest = async (notifId: number, action: 'APPROVED' | 'REJECTED') => {
    if (!window.electronAPI) return;
    try {
      const duration = durations[notifId] || 24;
      await (window.electronAPI as any).resolveSystemRequest({
        notificationId: notifId,
        action,
        durationHours: duration,
        resolvedBy: user?.fullName || user?.username || 'Admin'
      });
      showNotification(
        action === 'APPROVED' ? "Demande approuvée avec succès !" : "Demande refusée.",
        action === 'APPROVED' ? "success" : "info"
      );
      loadNotifications();
    } catch (e: any) {
      showNotification(e.message || "Erreur lors du traitement", "error");
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
              alert("L'accès de votre établissement a été suspendu par l'administrateur.");
              handleLogout();
              return;
            }
            setSchoolName(currentSchool.name);
          } else {
            if (user.schoolId && user.role !== 'SUPERADMIN') {
              alert("Cet établissement a été supprimé ou désactivé. Accès déconnecté.");
              handleLogout();
              return;
            }
            setSchoolName('Eco-Manage');
          }
        } catch (e) {
          console.error("Failed to load school name in layout", e);
        }
      } else {
        setSchoolName('Eco-Manage');
      }

      if (window.electronAPI) {
          const sgActing = await window.electronAPI.getSetting('sg_acting_director');
          setIsSgActing(sgActing === 'true');
      }
    };
    loadActiveSchool();
    const interval = setInterval(loadActiveSchool, 4000);
    
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
    { key: 'dashboard', path: '/', icon: LayoutDashboard, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'BURSAR', 'TEACHER', 'SG', 'ADVISOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'students', path: '/students', icon: Users, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'subjects', path: '/subjects', icon: BookOpen, roles: ['FOUNDER', 'DIRECTOR', 'SG', 'ADVISOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'classes', path: '/classes', icon: Building2, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'grades', path: '/grades', icon: ClipboardList, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'pedagogy_advisor', path: '/advisor', icon: Award, roles: ['FOUNDER', 'SG', 'ADVISOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'finance', path: '/finance', icon: CreditCard, roles: ['FOUNDER', 'BURSAR'], hideForSuperAdmin: !isImpersonating },
    { key: 'tuition_config', path: '/tuition-config', icon: Settings, roles: ['FOUNDER', 'BURSAR'], hideForSuperAdmin: !isImpersonating },
    { key: 'attendance', path: '/attendance', icon: UserCheck, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SECRETARY', 'SG', 'ADVISOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'stats', path: '/stats', icon: TrendingUp, roles: ['FOUNDER', 'DIRECTOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'admin', path: '/admin-workflow', icon: ShieldCheck, roles: isSgActing ? ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'SG'] : ['FOUNDER', 'DIRECTOR', 'SECRETARY'], hideForSuperAdmin: !isImpersonating },
    { key: 'users', path: '/users', icon: UserCheck, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'parents', path: '/parents', icon: HeartHandshake, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'mobile_access', path: '/mobile-access', icon: ShieldCheck, roles: isSgActing ? ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'SG'] : ['FOUNDER', 'DIRECTOR', 'SECRETARY'], hideForSuperAdmin: !isImpersonating },
    { key: 'transport', path: '/transport', icon: Bus, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'tickets', path: '/tickets', icon: MessageSquare, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SECRETARY', 'BURSAR', 'DRIVER', 'MAINTENANCE', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'customization', path: '/customization', icon: Palette, roles: ['FOUNDER', 'DIRECTOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'archives', path: '/archives', icon: Archive, roles: ['FOUNDER', 'DIRECTOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'system_admin', path: '/system-admin', icon: Building2, roles: ['SUPERADMIN'] },
    { key: 'sync', path: '/sync', icon: RefreshCw, roles: ['TEACHER', 'DIRECTOR', 'SECRETARY'], hideForSuperAdmin: !isImpersonating },
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
        <div className="p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center space-x-4 min-w-0 flex-1">
              <div className="p-3 bg-amber-500 rounded-2xl shadow-2xl shadow-amber-500/20">
                  <GraduationCap className="w-8 h-8 text-slate-950" />
              </div>
              <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black text-white leading-none tracking-tight truncate" title={schoolName}>{schoolName}</h2>
                  <p className="text-xs font-bold text-slate-300 mt-1 truncate" title={user?.fullName || user?.username}>{user?.fullName || user?.username}</p>
                  <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest mt-0.5 opacity-80">{t(`role_${user?.role}`)}</p>
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
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Centre d'Alertes</span>
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

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto min-h-0 custom-scrollbar">
          {menuItems.filter(item => {
              if (user?.role === 'SUPERADMIN' && item.hideForSuperAdmin) return false;
              return hasRole(item.roles as any);
          }).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
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
                  <span>{t(item.key) || item.key.replace('_', ' ')}</span>
                  {item.key === 'tickets' && unreadTicketsCount > 0 && (
                      <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/20">
                          {unreadTicketsCount}
                      </span>
                  )}
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 bg-slate-900/20">
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
        {user?.role === 'SUPERADMIN' && isImpersonating && (
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 flex items-center justify-between shadow-2xl border-b border-amber-400/20">
            <div className="flex items-center space-x-3">
              <span className="animate-pulse flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-slate-950"></span>
              </span>
              <span className="text-slate-950 text-xs font-black uppercase tracking-widest">
                Mode SuperAdmin : Immersion dans l'instance
              </span>
            </div>
            <button
              onClick={async () => {
                await exitImpersonation();
                navigate('/');
              }}
              className="bg-slate-950 hover:bg-slate-900 text-amber-500 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
            >
              Quitter l'immersion
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
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Centre d'Alertes</h3>
                {pendingNotifsCount > 0 && (
                  <span className="bg-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                    {pendingNotifsCount} active(s)
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
                  <p className="text-xs text-slate-500 font-bold">Aucune notification pour le moment.</p>
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
                          {n.type === 'ACTION_REQUIRED' ? 'Action Requise' : 'Message'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed font-bold mb-3">{n.message}</p>

                      {isPending && (
                        <div className="space-y-3 border-t border-white/5 pt-3 mt-2">
                          {n.request_type === 'GRADE_REACTIVATION' && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-bold">Durée de réactivation :</span>
                              <select 
                                value={durations[n.id] || 24}
                                onChange={(e) => setDurations({...durations, [n.id]: parseInt(e.target.value)})}
                                className="bg-slate-950 border border-white/10 text-white rounded-xl px-2 py-1 outline-none text-xs font-black"
                              >
                                <option value={2}>2 heures</option>
                                <option value={6}>6 heures</option>
                                <option value={12}>12 heures</option>
                                <option value={24}>24 heures</option>
                                <option value={48}>48 heures</option>
                              </select>
                            </div>
                          )}

                          <div className="flex space-x-2">
                            {n.request_type === 'SUBJECT_ACTIVATION' ? (
                              <button
                                onClick={() => handleResolveRequest(n.id, 'APPROVED')}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all"
                              >
                                Marquer comme traité
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleResolveRequest(n.id, 'APPROVED')}
                                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all"
                                >
                                  Approuver
                                </button>
                                <button
                                  onClick={() => handleResolveRequest(n.id, 'REJECTED')}
                                  className="flex-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-black text-[10px] uppercase tracking-wider py-2 rounded-xl transition-all border border-rose-500/30"
                                >
                                  Refuser
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
                            Marquer comme lu
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
