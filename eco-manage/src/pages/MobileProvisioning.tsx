import React, { useState } from 'react';
import { Smartphone, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MobileProvisioning: React.FC = () => {
  const { t } = useTranslation();
  const [activationKey, setActivationKey] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    // Simulate activation logic
    setTimeout(() => {
        if (activationKey.startsWith('ECO-')) {
            setStatus('SUCCESS');
        } else {
            setStatus('ERROR');
        }
    }, 2000);
  };

  if (status === 'SUCCESS') {
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
            <div className="p-4 bg-green-500/20 rounded-full mb-6">
                <CheckCircle2 className="w-16 h-16 text-green-500 animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{t('activation_success', 'Activation Réussie')}</h1>
            <p className="text-slate-400 mb-8">{t('activation_desc', 'Votre smartphone est désormais lié au serveur central de l\'école.')}</p>
            <button onClick={() => window.location.href = '/'} className="w-full max-w-xs py-3 bg-slate-gold-gold text-slate-900 rounded-lg font-bold">
                {t('access_app', 'Accéder à l\'application')}
            </button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
            <div className="inline-block p-4 bg-slate-gold-gold/10 rounded-3xl">
                <Smartphone className="w-12 h-12 text-slate-gold-gold" />
            </div>
            <h1 className="text-3xl font-bold text-white">{t('mobile_activation', 'Activation Mobile')}</h1>
            <p className="text-slate-400">{t('mobile_activation_desc', 'Entrez votre clé unique fournie par le Fondateur pour activer cet appareil.')}</p>
        </div>

        <form onSubmit={handleActivate} className="glass-card p-8 space-y-6">
            <div className="space-y-2">
                <label className="text-xs uppercase text-slate-500 font-bold tracking-widest">{t('unique_access_key', 'Clé d\'accès unique')}</label>
                <input
                    type="text"
                    placeholder="ECO-XXXX-XX"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-center text-xl font-mono text-slate-gold-gold outline-none focus:border-slate-gold-gold"
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                    required
                />
            </div>

            {status === 'ERROR' && (
                <div className="flex items-center space-x-2 text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-medium">{t('invalid_key_error', 'Clé invalide ou déjà utilisée. Veuillez contacter le Fondateur.')}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={status === 'LOADING'}
                className="w-full py-4 bg-slate-gold-gold text-slate-900 rounded-lg font-bold text-lg hover:bg-yellow-500 transition-all disabled:opacity-50"
            >
                {status === 'LOADING' ? t('activating', 'Activation en cours...') : t('activate_device', 'Activer mon appareil')}
            </button>
        </form>

        <p className="text-center text-[10px] text-slate-600 uppercase tracking-widest">
            Sécurité Renforcée • Eco-Manage System
        </p>
      </div>
    </div>
  );
};

export default MobileProvisioning;
