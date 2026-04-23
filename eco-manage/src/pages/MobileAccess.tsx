import React, { useState } from 'react';
import { Plus, Copy, ShieldCheck, RefreshCw } from 'lucide-react';

const MobileAccess: React.FC = () => {
  const [keys] = useState([
    { id: 1, key: 'ECO-9283-X1', status: 'ACTIVE', user: 'M. Tchana' },
    { id: 2, key: 'ECO-1204-Y8', status: 'USED', user: 'Mme. Bekono' },
  ]);

  const generateKey = () => {
    const newKey = `ECO-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`;
    console.log('Generated:', newKey);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Accès Mobile Sécurisé</h1>
          <p className="text-slate-400 mt-1">Gérez les clés d'accès uniques pour les téléphones</p>
        </div>
        <button
          onClick={generateKey}
          className="flex items-center px-4 py-2 bg-slate-gold-gold text-slate-900 rounded-lg font-bold hover:bg-yellow-500 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Générer une Clé
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass-card overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-800/50 text-slate-500 text-[10px] uppercase font-bold">
                    <tr>
                        <th className="px-6 py-4">Clé Unique</th>
                        <th className="px-6 py-4">Assigné à</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4">Actions</th>
                    </tr>
                </thead>
                <tbody className="text-slate-300 divide-y divide-slate-800">
                    {keys.map(k => (
                        <tr key={k.id}>
                            <td className="px-6 py-4 font-mono text-slate-gold-gold">{k.key}</td>
                            <td className="px-6 py-4">{k.user}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                    k.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-slate-700 text-slate-500'
                                }`}>
                                    {k.status === 'ACTIVE' ? 'PRÊT' : 'UTILISÉ'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <button className="text-slate-500 hover:text-white transition-colors"><Copy className="w-4 h-4" /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div className="glass-card p-6 space-y-4">
            <div className="flex items-center space-x-3 text-slate-gold-gold">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="font-bold text-lg">Sécurité Mobile</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
                Chaque clé est **unique** et ne peut être utilisée qu'une seule fois pour activer l'application sur un smartphone.
                Une fois activée, l'application mobile est liée de façon sécurisée au serveur central de l'école.
            </p>
            <div className="pt-4 border-t border-slate-800">
                <button className="w-full flex items-center justify-center py-2 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700 transition-colors">
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Révoquer tous les accès
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MobileAccess;
