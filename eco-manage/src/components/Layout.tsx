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
    { key: 'dashboard', path: '/', icon: LayoutDashboard, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'BURSAR', 'TEACHER'] },
    { key: 'students', path: '/students', icon: Users, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'ADMIN'] },
    { key: 'subjects', path: '/subjects', icon: BookOpen, roles: ['FOUNDER', 'DIRECTOR', 'ADMIN'] },
    { key: 'grades', path: '/grades', icon: ClipboardList, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER'] },
    { key: 'finance', path: '/finance', icon: CreditCard, roles: ['FOUNDER', 'BURSAR', 'ADMIN'] },
    { key: 'tuition_config', path: '/tuition-config', icon: Settings, roles: ['FOUNDER', 'BURSAR', 'ADMIN'] },
    { key: 'presence', path: '/attendance', icon: UserCheck, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SECRETARY', 'ADMIN'] },
    { key: 'admin', path: '/admin-workflow', icon: ShieldCheck, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'ADMIN'] },
    { key: 'tickets', path: '/tickets', icon: MessageSquare, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SECRETARY', 'BURSAR', 'ADVISOR', 'DRIVER', 'MAINTENANCE'] },
    { key: 'users', path: '/users', icon: UserCheck, roles: ['FOUNDER', 'DIRECTOR', 'ADMIN'] },
    { key: 'profile', path: '/profile', icon: User, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'BURSAR', 'TEACHER', 'ADVISOR', 'DRIVER', 'MAINTENANCE'] },
    { key: 'transport', path: '/transport', icon: Truck, roles: ['FOUNDER', 'DIRECTOR', 'DRIVER', 'SECRETARY'] },
    { key: 'mobile_access', path: '/mobile-access', icon: Key, roles: ['FOUNDER'] },
    { key: 'sync', path: '/sync', icon: RefreshCw, roles: ['TEACHER', 'DIRECTOR', 'SECRETARY'] },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden p-2 md:p-0">
      {/* Sidebar / Topbar on mobile */}
      <aside className="w-full md:w-64 glass-card md:m-4 md:mr-0 flex flex-col z-50 flex-shrink-0">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-600 rounded-lg">
                <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Eco-Manage</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
          <div className="mt-6">
            <LanguageSwitcher />
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-x-auto md:overflow-y-auto flex md:flex-col items-center md:items-stretch scrollbar-hide min-h-0">
          {menuItems.filter(item => hasRole(item.roles as any)).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center p-2.5 rounded-lg transition-all text-sm font-medium ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 md:mr-3" />
              <span className="hidden md:inline">{t(item.key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-2.5 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 rounded-lg transition-all text-sm font-medium"
          >
            <LogOut className="w-5 h-5 mr-3" />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-2 md:p-4 overflow-auto min-w-0">
        <div className="glass-card min-h-full p-4 md:p-8 bg-white dark:bg-slate-900/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
