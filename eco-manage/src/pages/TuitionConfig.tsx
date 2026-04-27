import React, { useEffect, useState } from 'react';
import { Save, Info } from 'lucide-react';

const TuitionConfig: React.FC = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFees = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getTuitionFees();
      setFees(data);
      setLoading(false);
    } else {
        // Mock for web preview
        setFees([
            { classId: 1, className: 'SIL A', totalFee: 50000 },
            { classId: 2, className: 'SIL B', totalFee: 50000 },
            { classId: 9, className: 'Class 1', totalFee: 60000 },
        ]);
        setLoading(false);
    }
  };

  useEffect(() => {
    loadFees();
  }, []);

  const handleUpdate = async (classId: number, fee: number) => {
    if (window.electronAPI) {
      await window.electronAPI.updateTuitionFee({ classId, totalFee: fee });
      // UI update is handled by the input state
    }
  };

  if (loading) return <div className="text-white">Chargement...</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white">Configuration de la Scolarité</h1>
        <p className="text-slate-400 mt-1">Définissez le montant total des frais par salle de classe</p>
      </div>

      <div className="glass-card p-6 border-l-4 border-slate-gold-gold bg-slate-gold-gold/5 flex items-start space-x-4">
          <Info className="text-slate-gold-gold w-6 h-6 flex-shrink-0" />
          <p className="text-sm text-slate-300">
              Ces montants serviront de base au calcul automatique des impayés (arriérés).
              Le système compare le total payé par chaque élève au montant défini ici pour sa classe respective.
          </p>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 text-slate-500 text-xs uppercase font-black tracking-widest border-b border-white/5">
            <tr>
              <th className="px-6 py-4">Salle de Classe</th>
              <th className="px-6 py-4">Montant de la Scolarité (FCFA)</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-300 divide-y divide-white/5">
            {fees.map((f) => (
              <tr key={f.classId} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-bold">{f.className}</td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    className="bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none focus:border-slate-gold-gold w-40"
                    value={f.totalFee}
                    onChange={(e) => {
                        const newFees = fees.map(item => item.classId === f.classId ? { ...item, totalFee: parseFloat(e.target.value) } : item);
                        setFees(newFees);
                    }}
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleUpdate(f.classId, f.totalFee)}
                    className="p-2 bg-slate-700 hover:bg-slate-gold-gold hover:text-slate-900 rounded-lg transition-all"
                    title="Sauvegarder"
                  >
                    <Save className="w-4 h-4" />
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
