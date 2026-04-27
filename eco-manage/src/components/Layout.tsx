import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Users, BookOpen, CreditCard, ClipboardList, ShieldCheck, UserCheck, MessageSquare, Truck, Key, RefreshCw, User, Settings } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';

const Layout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'BURSAR', 'TEACHER'] },
    { name: 'Élèves', path: '/students', icon: Users, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY'] },
    { name: 'Matières', path: '/subjects', icon: BookOpen, roles: ['FOUNDER', 'DIRECTOR'] },
    { name: 'Notes', path: '/grades', icon: ClipboardList, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER'] },
    { name: 'Finance', path: '/finance', icon: CreditCard, roles: ['FOUNDER', 'BURSAR'] },
    { name: 'Config Scolarité', path: '/tuition-config', icon: Settings, roles: ['FOUNDER', 'BURSAR'] },
    { name: 'Présences', path: '/attendance', icon: UserCheck, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SECRETARY'] },
    { name: 'Admin', path: '/admin-workflow', icon: ShieldCheck, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY'] },
    { name: 'Requêtes', path: '/tickets', icon: MessageSquare, roles: ['FOUNDER', 'DIRECTOR', 'TEACHER', 'SECRETARY', 'BURSAR', 'ADVISOR', 'DRIVER', 'MAINTENANCE'] },
    { name: 'Personnel', path: '/users', icon: UserCheck, roles: ['FOUNDER', 'DIRECTOR'] },
    { name: 'Mon Profil', path: '/profile', icon: User, roles: ['FOUNDER', 'DIRECTOR', 'SECRETARY', 'BURSAR', 'TEACHER', 'ADVISOR', 'DRIVER', 'MAINTENANCE'] },
    { name: 'Transport', path: '/transport', icon: Truck, roles: ['FOUNDER', 'DIRECTOR', 'DRIVER', 'SECRETARY'] },
    { name: 'Accès Mobile', path: '/mobile-access', icon: Key, roles: ['FOUNDER'] },
    { name: 'Sync', path: '/sync', icon: RefreshCw, roles: ['TEACHER', 'DIRECTOR', 'SECRETARY'] },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-900 overflow-hidden p-2 md:p-0">
      {/* Sidebar / Topbar on mobile */}
      <aside className="w-full md:w-64 glass-card md:m-4 md:mr-0 flex flex-col z-50 flex-shrink-0">
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-2xl font-bold text-slate-gold-gold">Eco-Manage</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{user?.role}</p>
          <div className="mt-4">
            <LanguageSwitcher />
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-x-auto md:overflow-y-auto flex md:flex-col items-center md:items-stretch scrollbar-hide min-h-0">
          {menuItems.filter(item => hasRole(item.roles as any)).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center p-3 rounded-lg transition-all ${
                  isActive ? 'bg-slate-gold-gold text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 md:mr-3" />
              <span className="hidden md:inline">{item.name}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-3 text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-2 md:p-4 overflow-auto min-w-0">
        <div className="glass-card min-h-full p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
