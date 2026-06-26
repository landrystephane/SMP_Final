import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Search, Building2, Download, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // School selection
  const [step, setStep] = useState<'SCHOOL' | 'LOGIN'>('SCHOOL');
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // PWA Install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'SUPERADMIN') navigate('/system-admin');
      else if (user?.role === 'DRIVER') navigate('/driver-portal');
      else navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  // Load schools list
  useEffect(() => {
    const loadSchools = async () => {
      try {
        const res = await fetch('/api/schools-list');
        if (res.ok) {
          const data = await res.json();
          setSchools(data.schools || []);
        }
      } catch(e) {
        // Fallback: allow direct login without school selection
        setStep('LOGIN');
      }
    };
    loadSchools();
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') setShowInstall(false);
      setDeferredPrompt(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      await login(username, password);
      setIsLoading(false);
    } catch (err: any) {
      setError(t('invalid_credentials_error'));
      setIsLoading(false);
    }
  };

  const filteredSchools = schoolSearch.trim().length >= 2
    ? schools.filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase()))
    : [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute top-6 right-6 z-50 w-48">
        <LanguageSwitcher />
      </div>

      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <div className="inline-flex p-5 bg-amber-500 rounded-3xl shadow-2xl shadow-amber-500/20 mb-8 border-4 border-slate-950">
            <LogIn className="w-12 h-12 text-slate-950" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">{t('school_management_system', 'Gestion Scolaire')}</h1>
          <p className="text-amber-500 font-black uppercase text-xs tracking-[0.3em]">{t('school_management_system')}</p>
        </div>

        {step === 'SCHOOL' ? (
          <div className="glass-card p-10 border-slate-700/50 shadow-2xl space-y-6">
            <div className="text-center">
              <Building2 className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-black text-white uppercase tracking-wider">{t('find_school', 'Trouver mon établissement')}</h2>
              <p className="text-slate-500 text-xs mt-1">{t('type_school_name', 'Tapez le nom de votre école')}</p>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                placeholder={t('search_school_placeholder', 'Ex: Collège Saint-Joseph...')}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-11 pr-4 py-4 text-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all font-bold"
                autoFocus
              />
            </div>

            {schoolSearch.trim().length >= 2 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredSchools.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-4 italic">{t('no_school_found', 'Aucun établissement trouvé')}</p>
                ) : (
                  filteredSchools.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedSchool(s); setStep('LOGIN'); }}
                      className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-left hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group"
                    >
                      <span className="text-white font-black text-sm group-hover:text-amber-500 transition-colors">{s.name}</span>
                      {s.address && <span className="text-slate-500 text-[10px] block mt-1">{s.address}</span>}
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="border-t border-slate-800 pt-4">
              <button
                onClick={() => { setIsSuperAdmin(true); setStep('LOGIN'); }}
                className="w-full text-center text-[10px] text-slate-600 hover:text-amber-500 font-bold uppercase tracking-widest transition-colors"
              >
                {t('admin_access', 'Accès Administration Système')}
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-card p-10 border-slate-700/50 shadow-2xl">
            {!isSuperAdmin && selectedSchool && (
              <div className="mb-6 flex items-center justify-between">
                <button onClick={() => { setStep('SCHOOL'); setSelectedSchool(null); setIsSuperAdmin(false); setError(''); }} className="text-slate-500 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center flex-1">
                  <p className="text-amber-500 font-black text-sm uppercase tracking-wider">{selectedSchool.name}</p>
                  {selectedSchool.address && <p className="text-slate-600 text-[10px]">{selectedSchool.address}</p>}
                </div>
                <div className="w-5" />
              </div>
            )}
            {isSuperAdmin && (
              <div className="mb-6 flex items-center justify-between">
                <button onClick={() => { setStep('SCHOOL'); setIsSuperAdmin(false); setError(''); }} className="text-slate-500 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <p className="text-amber-500 font-black text-sm uppercase tracking-wider flex-1 text-center">{t('system_admin', 'Administration Système')}</p>
                <div className="w-5" />
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-4 bg-red-500/10 text-red-500 text-xs font-black rounded-xl border border-red-500/20 uppercase tracking-widest text-center">
                  {error}
                </div>
              )}
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t('user_field')}</label>
                  <input type="text" required disabled={isLoading}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-4 text-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all font-bold disabled:opacity-50"
                    value={username} onChange={(e) => setUsername(e.target.value.trim())} placeholder="Admin" autoFocus />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t('password_field')}</label>
                  <input type="password" required disabled={isLoading}
                    className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-4 text-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all font-bold disabled:opacity-50"
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full bg-amber-500 text-slate-950 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-amber-400 active:scale-[0.98] transition-all shadow-xl shadow-amber-500/10 flex items-center justify-center disabled:opacity-50">
                {isLoading ? <div className="w-6 h-6 border-4 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> : t('access_portal')}
              </button>
            </form>
          </div>
        )}

        {/* PWA Install Button */}
        {showInstall && (
          <button onClick={handleInstall}
            className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            {t('install_app', 'Installer l\'application')}
          </button>
        )}
      </div>
    </div>
  );
};

export default Login;
