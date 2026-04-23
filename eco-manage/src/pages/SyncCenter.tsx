import React, { useState } from 'react';
import { RefreshCw, CloudUpload, CheckCircle2 } from 'lucide-react';

const SyncCenter: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SUCCESS'>('IDLE');
  const [unsyncedCount, setUnsyncedCount] = useState(14);

  const handleSync = () => {
    setSyncStatus('SYNCING');
    setTimeout(() => {
        setSyncStatus('SUCCESS');
        setUnsyncedCount(0);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Centre de Synchronisation</h1>
        <p className="text-slate-400 mt-1">Transférez vos données vers le serveur de l'école</p>
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
