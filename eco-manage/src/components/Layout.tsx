import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Users, BookOpen, CreditCard, ClipboardList, ShieldCheck, UserCheck, MessageSquare, RefreshCw, Settings, GraduationCap, Building2, Calendar, Bus, HeartHandshake, TrendingUp, Palette, Archive } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Layout: React.FC = () => {
  const { user, logout, hasRole, exitImpersonation } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [schoolName, setSchoolName] = useState('Eco-Manage');

  useEffect(() => {
    const loadActiveSchool = async () => {
      if (window.electronAPI && user) {
        if (user.role === 'SUPERADMIN' && !localStorage.getItem('impersonated_school_id')) {
          setSchoolName('SuperAdmin Portal');
          return;
        }
        try {
          const schools = await window.electronAPI.getSchools();
          const currentSchool = schools.find((s: any) => s.id === user.schoolId);
          if (currentSchool && currentSchool.name) {
            setSchoolName(currentSchool.name);
          } else {
            setSchoolName('Eco-Manage');
          }
        } catch (e) {
          console.error("Failed to load school name in layout", e);
        }
      } else {
        setSchoolName('Eco-Manage');
      }
    };
    loadActiveSchool();
    const interval = setInterval(loadActiveSchool, 4000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isImpersonating = localStorage.getItem('impersonated_school_id') !== null;

  const menuItems = [
    { key: 'dashboard', path: '/', icon: LayoutDashboard, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'BURSAR', 'TEACHER', 'SG', 'ADVISOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'students', path: '/students', icon: Users, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'subjects', path: '/subjects', icon: BookOpen, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'grades', path: '/grades', icon: ClipboardList, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SG', 'ADVISOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'finance', path: '/finance', icon: CreditCard, roles: ['FOUNDER', 'BURSAR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'tuition_config', path: '/tuition-config', icon: Settings, roles: ['FOUNDER', 'BURSAR'], hideForSuperAdmin: !isImpersonating },
    { key: 'attendance', path: '/attendance', icon: UserCheck, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SECRETARY', 'SG', 'ADVISOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'stats', path: '/stats', icon: TrendingUp, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'admin', path: '/admin-workflow', icon: ShieldCheck, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'users', path: '/users', icon: UserCheck, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'mobile_access', path: '/mobile-access', icon: ShieldCheck, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'transport', path: '/transport', icon: Bus, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'tickets', path: '/tickets', icon: MessageSquare, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SECRETARY', 'BURSAR', 'ADVISOR', 'DRIVER', 'MAINTENANCE', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'customization', path: '/customization', icon: Palette, roles: ['FOUNDER', 'DIRECTOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'archives', path: '/archives', icon: Archive, roles: ['FOUNDER', 'DIRECTOR'], hideForSuperAdmin: !isImpersonating },
    { key: 'system_admin', path: '/system-admin', icon: Building2, roles: ['SUPERADMIN'] },
    { key: 'sync', path: '/sync', icon: RefreshCw, roles: ['TEACHER', 'DIRECTOR', 'SECRETARY'], hideForSuperAdmin: !isImpersonating },
    { key: 'transport_driver', path: '/driver-portal', icon: Bus, roles: ['DRIVER'] },
    { key: 'parent_portal', path: '/parent-portal', icon: HeartHandshake, roles: ['PARENT', 'SUPERADMIN', 'FOUNDER'] },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-slate-900/40 border-r border-white/5 flex flex-col z-50 flex-shrink-0">
        <div className="p-8">
          <div className="flex items-center space-x-4 mb-10">
            <div className="p-3 bg-amber-500 rounded-2xl shadow-2xl shadow-amber-500/20">
                <GraduationCap className="w-8 h-8 text-slate-950" />
            </div>
            <div className="min-w-0 flex-1">
                <h2 className="text-lg font-black text-white leading-none tracking-tight truncate" title={schoolName}>{schoolName}</h2>
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-1 opacity-80">{t(`role_${user?.role}`)}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto min-h-0 custom-scrollbar">
          {menuItems.filter(item => {
              if (user?.role === 'SUPERADMIN' && item.hideForSuperAdmin) return false;
              return hasRole(item.roles as any);
          }).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-5 py-3.5 rounded-2xl transition-all text-xs font-black uppercase tracking-widest border border-transparent ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-2xl shadow-amber-500/20 border-amber-400/50 scale-[1.02]'
                    : 'text-slate-500 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-4 opacity-70" />
              <span>{t(item.key) || item.key.replace('_', ' ')}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 bg-slate-900/20">
          <button
            onClick={handleLogout}
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
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
