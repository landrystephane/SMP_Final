import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Users, BookOpen, CreditCard, ClipboardList, ShieldCheck, UserCheck, MessageSquare, Truck, Key, RefreshCw, User, Settings, GraduationCap } from 'lucide-react';
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

  const menuItems = [
    { key: 'dashboard', path: '/', icon: LayoutDashboard, roles: ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'SECRETARY', 'BURSAR', 'TEACHER', 'SG', 'ADVISOR'] },
    { key: 'students', path: '/students', icon: Users, roles: ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'SECRETARY', 'ADMIN', 'SG'] },
    { key: 'subjects', path: '/subjects', icon: BookOpen, roles: ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'ADMIN', 'SG'] },
    { key: 'grades', path: '/grades', icon: ClipboardList, roles: ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'TEACHER', 'SG', 'ADVISOR'] },
    { key: 'finance', path: '/finance', icon: CreditCard, roles: ['SUPERADMIN', 'FOUNDER', 'BURSAR', 'ADMIN', 'SG'] },
    { key: 'tuition_config', path: '/tuition-config', icon: Settings, roles: ['SUPERADMIN', 'FOUNDER', 'BURSAR', 'ADMIN'] },
    { key: 'presence', path: '/attendance', icon: UserCheck, roles: ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'TEACHER', 'SECRETARY', 'ADMIN', 'SG', 'ADVISOR'] },
    { key: 'admin', path: '/admin-workflow', icon: ShieldCheck, roles: ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'SECRETARY', 'ADMIN', 'SG'] },
    { key: 'tickets', path: '/tickets', icon: MessageSquare, roles: ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'TEACHER', 'SECRETARY', 'BURSAR', 'ADVISOR', 'DRIVER', 'MAINTENANCE', 'SG'] },
    { key: 'users', path: '/users', icon: UserCheck, roles: ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'ADMIN', 'SG'] },
    { key: 'profile', path: '/profile', icon: User, roles: ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'SECRETARY', 'BURSAR', 'TEACHER', 'ADVISOR', 'DRIVER', 'MAINTENANCE', 'SG'] },
    { key: 'transport', path: '/transport', icon: Truck, roles: ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'DRIVER', 'SECRETARY', 'SG'] },
    { key: 'mobile_access', path: '/mobile-access', icon: Key, roles: ['SUPERADMIN', 'FOUNDER'] },
    { key: 'sync', path: '/sync', icon: RefreshCw, roles: ['SUPERADMIN', 'TEACHER', 'DIRECTOR', 'SECRETARY'] },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar / Topbar on mobile */}
      <aside className="w-full md:w-64 bg-slate-900/40 border-r border-slate-800/50 flex flex-col z-50 flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-2.5 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20">
                <GraduationCap className="w-6 h-6 text-slate-950" />
            </div>
            <div>
                <h2 className="text-xl font-black text-white leading-tight tracking-tight">Eco-Manage</h2>
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">{t(`role_${user?.role}`)}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto min-h-0">
          {menuItems.filter(item => hasRole(item.roles as any)).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-xl transition-all text-sm font-bold tracking-tight ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-xl shadow-amber-500/10'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span>{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all text-sm font-bold"
          >
            <LogOut className="w-5 h-5 mr-3" />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto min-w-0 bg-gradient-to-br from-slate-950 to-slate-900">
        <div className="min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
