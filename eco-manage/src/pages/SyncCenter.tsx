import React, { useState, useEffect } from 'react';
import { RefreshCw, UploadCloud, CheckCircle2, Settings, Info, Wifi } from 'lucide-react';
import { dataService } from '../utils/dataService';

const SyncCenter: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [serverIp, setServerIp] = useState(localStorage.getItem('serverIp') || '');
  const [activationKey, setActivationKey] = useState(localStorage.getItem('activationKey') || '');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkUnsynced = async () => {
        const grades = await dataService.getUnsyncedGrades();
        const attendance = await dataService.getUnsyncedAttendance();
        setUnsyncedCount(grades.length + attendance.length);
    };
    checkUnsynced();
    const interval = setInterval(checkUnsynced, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!serverIp || !activationKey) {
        alert('Veuillez configurer l\'IP du serveur et la clé d\'activation.');
        return;
    }

    setSyncStatus('SYNCING');
    localStorage.setItem('serverIp', serverIp);
    localStorage.setItem('activationKey', activationKey);

    const result = await dataService.sync(serverIp, activationKey);

    if (result.success) {
        setSyncStatus('SUCCESS');
        setUnsyncedCount(0);
    } else {
        setSyncStatus('ERROR');
        setErrorMessage(result.error || 'Erreur inconnue');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Centre de Synchronisation</h1>
          <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest italic">Fusion des données mobiles vers le serveur central</p>
        </div>
        <div className="flex items-center space-x-2 bg-amber-500/10 text-amber-500 px-4 py-2 rounded-full border border-amber-500/20">
            <Wifi className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Réseau Local Actif</span>
        </div>
      </div>

      <div className="glass-card p-8 bg-amber-500/5 border-l-4 border-amber-500 flex items-start space-x-6">
          <Info className="text-amber-500 w-10 h-10 flex-shrink-0" />
          <div className="space-y-2">
              <h3 className="font-black text-white uppercase tracking-widest text-sm">À quoi sert ce module ?</h3>
              <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed tracking-wider">
                  Les enseignants utilisent souvent leurs smartphones pour faire l'appel ou saisir des notes en classe sans connexion internet.
                  Ce bouton permet de "pousser" les données enregistrées sur le téléphone vers l'ordinateur central de l'école une fois connecté au Wi-Fi.
              </p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-8 space-y-6">
            <div className="flex items-center space-x-3 text-amber-500 mb-4">
                <Settings className="w-6 h-6" />
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Paramètres de Liaison</h2>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest ml-1">Adresse IP du PC Central</label>
                    <input
                        type="text"
                        className="input-field w-full text-amber-500 font-mono"
                        placeholder="Ex: 192.168.1.15"
                        value={serverIp}
                        onChange={(e) => setServerIp(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] uppercase text-slate-500 font-black tracking-widest ml-1">Clé de Sécurité Instance</label>
                    <input
                        type="text"
                        className="input-field w-full"
                        placeholder="Fournie par l'administration"
                        value={activationKey}
                        onChange={(e) => setActivationKey(e.target.value)}
                    />
                </div>
            </div>
        </div>

      <div className="glass-card p-10 flex flex-col items-center text-center space-y-8 bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl">
        <div className={`p-8 rounded-3xl shadow-inner ${unsyncedCount > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
            <RefreshCw className={`w-16 h-16 ${unsyncedCount > 0 ? 'text-amber-500' : 'text-emerald-500'} ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
        </div>

        <div>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase italic">
                {unsyncedCount > 0 ? `${unsyncedCount} Enregistrements locaux` : 'Système Synchronisé'}
            </h2>
        </div>

        {unsyncedCount > 0 && (
            <button
                onClick={handleSync}
                disabled={syncStatus === 'SYNCING'}
                className="btn-primary flex items-center px-10 py-5 text-sm"
            >
                <UploadCloud className="w-6 h-6 mr-3" />
                {syncStatus === 'SYNCING' ? 'TRANSFÈRT EN COURS...' : 'SYNCHRONISER MAINTENANT'}
            </button>
        )}

        {syncStatus === 'SUCCESS' && (
            <div className="flex items-center space-x-3 text-emerald-500 bg-emerald-500/5 p-5 rounded-2xl border border-emerald-500/20 animate-in zoom-in duration-300">
                <CheckCircle2 className="w-6 h-6" />
                <span className="font-black uppercase tracking-widest text-xs">Données fusionnées avec succès !</span>
            </div>
        )}

        {syncStatus === 'ERROR' && (
            <div className="text-rose-500 font-black text-xs uppercase tracking-widest">
                Échec: {errorMessage}
            </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default SyncCenter;
