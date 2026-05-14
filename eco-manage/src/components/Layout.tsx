import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Users, BookOpen, CreditCard, ClipboardList, ShieldCheck, UserCheck, MessageSquare, RefreshCw, Settings, GraduationCap, Building2, Calendar, Bus, HeartHandshake, TrendingUp } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

const Layout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
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
    { key: 'transport', path: '/transport', icon: Bus, roles: ['FOUNDER', 'DIRECTOR', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'tickets', path: '/tickets', icon: MessageSquare, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SECRETARY', 'BURSAR', 'ADVISOR', 'DRIVER', 'MAINTENANCE', 'SG'], hideForSuperAdmin: !isImpersonating },
    { key: 'system_admin', path: '/system-admin', icon: Building2, roles: ['SUPERADMIN'] },
    { key: 'sync', path: '/sync', icon: RefreshCw, roles: ['TEACHER', 'DIRECTOR', 'SECRETARY'], hideForSuperAdmin: !isImpersonating },
    { key: 'transport_driver', path: '/driver-portal', icon: Bus, roles: ['DRIVER'] },
    { key: 'parent_portal', path: '/parent-portal', icon: HeartHandshake, roles: ['PARENT'] },
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
            <div>
                <h2 className="text-2xl font-black text-white leading-none tracking-tighter">Eco-Manage</h2>
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-1 opacity-80">{t(`role_${user?.role}`)}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto min-h-0 custom-scrollbar">
          {menuItems.filter(item => hasRole(item.roles as any)).map((item) => (
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
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
