import React, { useState, useEffect } from 'react';
import { RefreshCw, CloudUpload, CheckCircle2, Settings } from 'lucide-react';
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
        setUnsyncedCount(grades.length);
    };
    checkUnsynced();
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Centre de Synchronisation</h1>
        <p className="text-slate-400 mt-1">Transférez vos données vers le serveur de l'école</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6 space-y-4">
            <div className="flex items-center space-x-2 text-slate-gold-gold mb-4">
                <Settings className="w-5 h-5" />
                <h2 className="font-bold uppercase tracking-wider text-sm">Configuration Connexion</h2>
            </div>
            <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold">IP du Serveur Principal</label>
                <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1"
                    placeholder="ex: 192.168.1.10"
                    value={serverIp}
                    onChange={(e) => setServerIp(e.target.value)}
                />
            </div>
            <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold">Clé d'Activation</label>
                <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1"
                    placeholder="Clé générée par le Fondateur"
                    value={activationKey}
                    onChange={(e) => setActivationKey(e.target.value)}
                />
            </div>
        </div>

      <div className="glass-card p-8 flex flex-col items-center text-center space-y-6">
        <div className={`p-6 rounded-full ${unsyncedCount > 0 ? 'bg-yellow-500/10' : 'bg-green-500/10'}`}>
            <RefreshCw className={`w-16 h-16 ${unsyncedCount > 0 ? 'text-yellow-500' : 'text-green-500'} ${syncStatus === 'SYNCING' ? 'animate-spin' : ''}`} />
        </div>

        <div>
            <h2 className="text-2xl font-bold text-white">
                {unsyncedCount > 0 ? `${unsyncedCount} Éléments en attente` : 'Toutes les données sont à jour'}
            </h2>
            <p className="text-slate-500 mt-2 max-w-sm">
                {unsyncedCount > 0
                  ? "Connectez-vous au Wi-Fi de l'école ou au Hotspot du PC principal pour synchroniser vos notes."
                  : "Votre smartphone est parfaitement synchronisé avec la base de données centrale."}
            </p>
        </div>

        {unsyncedCount > 0 && (
            <button
                onClick={handleSync}
                disabled={syncStatus === 'SYNCING'}
                className="flex items-center px-8 py-3 bg-slate-gold-gold text-slate-900 rounded-xl font-bold text-lg hover:bg-yellow-500 transition-all disabled:opacity-50"
            >
                <CloudUpload className="w-6 h-6 mr-2" />
                {syncStatus === 'SYNCING' ? 'Synchronisation...' : 'Lancer la Synchronisation'}
            </button>
        )}

        {syncStatus === 'SUCCESS' && (
            <div className="flex items-center space-x-2 text-green-500 bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold">Données envoyées avec succès !</span>
            </div>
        )}

        {syncStatus === 'ERROR' && (
            <div className="flex flex-col items-center space-y-2 text-red-500 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                <span className="font-bold">Échec de la synchronisation</span>
                <span className="text-xs">{errorMessage}</span>
            </div>
        )}
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-4 border-l-4 border-blue-500">
            <h3 className="text-slate-400 text-xs font-bold uppercase">Grades à envoyer</h3>
            <p className="text-2xl font-bold text-white mt-1">12</p>
        </div>
        <div className="glass-card p-4 border-l-4 border-purple-500">
            <h3 className="text-slate-400 text-xs font-bold uppercase">Présences à envoyer</h3>
            <p className="text-2xl font-bold text-white mt-1">2</p>
        </div>
      </div>
    </div>
  );
};

export default SyncCenter;
