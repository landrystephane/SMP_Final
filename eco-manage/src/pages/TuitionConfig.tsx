import React, { useEffect, useState } from 'react';
import { Save, Info, Globe } from 'lucide-react';

const TuitionConfig: React.FC = () => {

  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE'>('FRANCOPHONE');

  const loadFees = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getTuitionFees();
      const classes = await window.electronAPI.getClasses();
      // Join data
      const joined = data.map((f: any) => ({
          ...f,
          section: classes.find((c: any) => c.id === f.classId)?.section || 'FRANCOPHONE'
      }));
      setFees(joined);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const handleUpdate = async (classId: number, fee: number) => {
    if (window.electronAPI) {
      await window.electronAPI.updateTuitionFee({ classId, totalFee: fee });
    }
  };

  if (loading) return <div className="text-slate-500 animate-pulse">Chargement des tarifs...</div>;

  const filteredFees = fees.filter(f => f.section === activeSection);

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Configuration de la Scolarité</h1>
          <p className="text-slate-500 mt-1">Définissez les frais de scolarité par section et par classe</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <button
                onClick={() => setActiveSection('FRANCOPHONE')}
                className={`flex items-center px-4 py-2 rounded-lg text-xs font-black transition-all ${activeSection === 'FRANCOPHONE' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                <Globe className="w-3 h-3 mr-2" /> SECTION FRANCOPHONE
            </button>
            <button
                onClick={() => setActiveSection('ANGLOPHONE')}
                className={`flex items-center px-4 py-2 rounded-lg text-xs font-black transition-all ${activeSection === 'ANGLOPHONE' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
                <Globe className="w-3 h-3 mr-2" /> ANGLOPHONE SECTION
            </button>
        </div>
      </div>

      <div className="glass-card p-6 border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-900/10 flex items-start space-x-4">
          <Info className="text-blue-600 w-6 h-6 flex-shrink-0" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
              {activeSection === 'FRANCOPHONE'
                ? "Configuration des tarifs pour le sous-système francophone (en FCFA)."
                : "Tariff configuration for the anglophone sub-system (in FCFA)."}
              <br/>
              <span className="font-bold">Note :</span> Ces montants sont utilisés pour calculer automatiquement les reliquats sur les reçus de paiement.
          </p>
      </div>

      <div className="glass-card shadow-xl border-none">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="px-6 py-5">Salle de Classe</th>
              <th className="px-6 py-5">Montant Total de la Scolarité (FCFA)</th>
              <th className="px-6 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
            {filteredFees.map((f) => (
              <tr key={f.classId} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{f.className}</td>
                <td className="px-6 py-4">
                  <div className="relative max-w-xs">
                    <input
                        type="number"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 pl-4 text-slate-900 dark:text-white outline-none focus:border-blue-600 transition-all font-mono font-bold"
                        value={f.totalFee}
                        onChange={(e) => {
                            const newFees = fees.map(item => item.classId === f.classId ? { ...item, totalFee: parseFloat(e.target.value) || 0 } : item);
                            setFees(newFees);
                        }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">FCFA</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleUpdate(f.classId, f.totalFee)}
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-95"
                    title="Enregistrer"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TuitionConfig;
