import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, KeyRound, Building2, ChevronLeft, CheckCircle2, Download, Smartphone } from 'lucide-react';
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

  const [step, setStep] = useState<'CODE' | 'LOGIN'>('CODE');
  const [schoolCode, setSchoolCode] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [codeError, setCodeError] = useState('');
  const [pwaPrompt, setPwaPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isFirefox = navigator.userAgent.includes('Firefox');
  const isSafariMac = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && !isIOS;
  const isAlreadyInstalled = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

  // Detect subdomain (e.g. vie.ecomanageapp.com → slug = "vie")
  const hostname = window.location.hostname;
  const hostParts = hostname.split('.');
  const detectedSlug = hostParts.length >= 3 && hostParts[0] !== 'www' ? hostParts[0] : null;

  useEffect(() => {
    if (detectedSlug) {
      fetch(`/api/school-by-slug/${detectedSlug}`)
        .then(r => r.json())
        .then(data => {
          if (data.school) {
            setSelectedSchool(data.school);
            setStep('LOGIN');
          }
        })
        .catch(() => {});
    }
  }, [detectedSlug]);

  useEffect(() => {
    const checkPrompt = () => {
      if ((window as any).__pwaInstallPrompt) setPwaPrompt((window as any).__pwaInstallPrompt);
    };
    checkPrompt();
    window.addEventListener('beforeinstallprompt', checkPrompt);
    return () => window.removeEventListener('beforeinstallprompt', checkPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (!pwaPrompt) return;
    pwaPrompt.prompt();
    await pwaPrompt.userChoice;
    setPwaPrompt(null);
  };
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'SUPERADMIN') navigate('/system-admin');
      else if (user?.role === 'DRIVER') navigate('/driver-portal');
      else navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  const handleVerifyCode = async () => {
    if (!schoolCode.trim() || schoolCode.trim().length < 3) {
      setCodeError(t('code_too_short', 'Le code doit contenir au moins 3 caractères'));
      return;
    }
    setCodeError('');
    setIsVerifying(true);
    try {
      const res = await fetch('/api/verify-school-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: schoolCode.trim() })
      });
      const data = await res.json();
      if (data.found && data.school) {
        setSelectedSchool(data.school);
        setStep('LOGIN');
      } else {
        setCodeError(t('invalid_school_code', 'Code d\'accès invalide. Vérifiez auprès de votre administration.'));
      }
    } catch(e) {
      setCodeError(t('connection_error', 'Erreur de connexion au serveur'));
    }
    setIsVerifying(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      await login(username, password, selectedSchool?.id || null);
      setIsLoading(false);
    } catch (err: any) {
      setError(t('invalid_credentials_error'));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="flex justify-end mb-2">
          <div className="w-44">
            <LanguageSwitcher />
          </div>
        </div>
        <div className="text-center">
          <div className="inline-flex p-5 bg-amber-500 rounded-3xl shadow-2xl shadow-amber-500/20 mb-8 border-4 border-slate-950">
            <LogIn className="w-12 h-12 text-slate-950" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">{t('school_management_system', 'Gestion Scolaire')}</h1>
          <p className="text-amber-500 font-black uppercase text-xs tracking-[0.3em]">{t('secure_portal', 'Portail Sécurisé')}</p>
        </div>

        {step === 'CODE' ? (
          <div className="glass-card p-10 border-slate-700/50 shadow-2xl space-y-6">
            <div className="text-center">
              <KeyRound className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <h2 className="text-lg font-black text-white uppercase tracking-wider">{t('enter_access_code', 'Code d\'Accès')}</h2>
              <p className="text-slate-500 text-xs mt-2">{t('enter_school_code_desc', 'Entrez le code d\'accès fourni par votre établissement')}</p>
            </div>

            <div>
              <input
                type="text"
                value={schoolCode}
                onChange={(e) => { setSchoolCode(e.target.value.toUpperCase()); setCodeError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                placeholder={t('code_placeholder', 'Ex: HSE001')}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-4 text-white text-center text-2xl font-black tracking-[0.3em] focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 outline-none transition-all uppercase"
                autoFocus
                maxLength={10}
              />
            </div>

            {codeError && (
              <p className="text-rose-400 text-xs font-bold text-center">{codeError}</p>
            )}

            <button
              onClick={handleVerifyCode}
              disabled={isVerifying || schoolCode.trim().length < 3}
              className="w-full bg-amber-500 text-slate-950 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-amber-400 active:scale-[0.98] transition-all shadow-xl shadow-amber-500/10 flex items-center justify-center disabled:opacity-50"
            >
              {isVerifying ? <div className="w-5 h-5 border-3 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> : t('verify_code', 'Vérifier')}
            </button>

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
            <div className="mb-6 flex items-center justify-between">
              <button onClick={() => { setStep('CODE'); setSelectedSchool(null); setIsSuperAdmin(false); setError(''); }} className="text-slate-500 hover:text-white transition-colors" title={t('back_tooltip', 'Retour')}>
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center flex-1">
                {selectedSchool ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <p className="text-emerald-400 font-black text-sm uppercase tracking-wider">{selectedSchool.name}</p>
                  </div>
                ) : (
                  <p className="text-amber-500 font-black text-sm uppercase tracking-wider">{t('system_admin', 'Administration Système')}</p>
                )}
              </div>
              <div className="w-5" />
            </div>

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
        <div className="flex flex-col items-center gap-3 pt-2">
          {!isAlreadyInstalled && pwaPrompt && (
            <button onClick={handleInstallPWA}
              className="inline-flex items-center gap-2 text-xs text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest transition-colors">
              <Smartphone className="w-3.5 h-3.5" />
              {t('install_app', 'Installer l\'application')}
            </button>
          )}
          {!isAlreadyInstalled && !pwaPrompt && (
            <div className="flex flex-col items-center gap-2">
              <button onClick={() => setShowInstallGuide(v => !v)}
                className="inline-flex items-center gap-2 text-xs text-amber-500/70 hover:text-amber-400 font-bold uppercase tracking-widest transition-colors">
                <Smartphone className="w-3.5 h-3.5" />
                {t('install_app', 'Installer l\'application')}
              </button>
              {showInstallGuide && (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 max-w-xs space-y-3">
                  <p className="font-black text-amber-500 uppercase tracking-wider text-center">Guide d'installation</p>
                  {isIOS && (
                    <div className="space-y-1">
                      <p className="font-bold text-white">iPhone / iPad (Safari)</p>
                      <p>1. Appuyez sur <span className="text-amber-500">⎙</span> Partager en bas</p>
                      <p>2. "Sur l'écran d'accueil" → Ajouter</p>
                    </div>
                  )}
                  {isSafariMac && (
                    <div className="space-y-1">
                      <p className="font-bold text-white">Safari sur Mac</p>
                      <p>Menu <span className="text-amber-500">Fichier</span> → "Ajouter au Dock"</p>
                    </div>
                  )}
                  {isFirefox && (
                    <div className="space-y-1">
                      <p className="font-bold text-white">Firefox</p>
                      <p>Firefox ne supporte pas l'installation PWA.</p>
                      <p>Ouvrez cette page dans <span className="text-amber-500">Chrome</span> ou <span className="text-amber-500">Edge</span> pour installer.</p>
                    </div>
                  )}
                  {!isIOS && !isSafariMac && !isFirefox && (
                    <div className="space-y-1">
                      <p className="font-bold text-white">Chrome / Edge / Opera</p>
                      <p>Cliquez l'icône <span className="text-amber-500">⊕</span> à droite de la barre d'adresse.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <a href="https://ecomanageapp.com/downloads/eco-manage-setup.exe" download
            className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-amber-500 font-bold uppercase tracking-widest transition-colors">
            <Download className="w-3.5 h-3.5" />
            {t('download_windows_app', 'Télécharger l\'application Windows')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
