import React, { useEffect, useState } from 'react';
import { Save, Info, Plus, Trash2 } from 'lucide-react';

const TuitionConfig: React.FC = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [classInstallmentFees, setClassInstallmentFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE'>('FRANCOPHONE');

  const loadData = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getTuitionFees();
      const classes = await window.electronAPI.getClasses();
      const inst = await window.electronAPI.getInstallments();
      const cif = await window.electronAPI.getClassInstallmentFees();

      const joined = data.map((f: any) => ({
          ...f,
          section: classes.find((c: any) => c.id === f.classId)?.section || 'FRANCOPHONE'
      }));
      setFees(joined);
      setInstallments(inst || []);
      setClassInstallmentFees(cif || []);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateBase = async (classId: number, fee: number, reg: number) => {
    if (window.electronAPI) {
      await window.electronAPI.updateTuitionFee({ classId, totalFee: fee, registrationFee: reg });
      alert('Montants de base mis à jour');
    }
  };

  const handleUpdateInstallmentFee = async (classId: number, installmentId: number, amount: number) => {
      if (window.electronAPI) {
          await window.electronAPI.updateClassInstallmentFee({ classId, installmentId, amount });
      }
  };

  if (loading) return <div className="text-slate-500 animate-pulse p-10 text-center font-bold">Chargement de la structure financière...</div>;

  const filteredFees = fees.filter(f => f.section === activeSection);

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Paramétrage des Tranches</h1>
          <p className="text-slate-500 mt-1">Définissez la structure de paiement (Inscription + Tranches) par classe</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <button
                onClick={() => setActiveSection('FRANCOPHONE')}
                className={`flex items-center px-6 py-2.5 rounded-lg text-xs font-black transition-all ${activeSection === 'FRANCOPHONE' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                SECTION FRANCOPHONE
            </button>
            <button
                onClick={() => setActiveSection('ANGLOPHONE')}
                className={`flex items-center px-6 py-2.5 rounded-lg text-xs font-black transition-all ${activeSection === 'ANGLOPHONE' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                ANGLOPHONE SECTION
            </button>
        </div>
      </div>

      {/* Configuration des Tranches Globales */}
      <div className="glass-card p-6 border-none shadow-lg">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-blue-600" />
                  Structure des Tranches Annuelles
              </h2>
              <button className="text-[10px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-all uppercase tracking-widest">
                  Ajouter une tranche globale
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {installments.map(inst => (
                  <div key={inst.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <span className="font-bold text-sm">{inst.name}</span>
                      <button className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
              ))}
          </div>
      </div>

      <div className="glass-card shadow-xl border-none">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                <tr>
                <th className="px-6 py-5">Classe</th>
                <th className="px-6 py-5">Inscription Fixe</th>
                <th className="px-6 py-5">Total Pension (hors inscr.)</th>
                {installments.map(inst => (
                    <th key={inst.id} className="px-6 py-5 text-blue-600 bg-blue-50/30 dark:bg-blue-900/10">{inst.name}</th>
                ))}
                <th className="px-6 py-5 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFees.map((f) => (
                <tr key={f.classId} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white">{f.className}</td>
                    <td className="px-6 py-4">
                        <input
                            type="number"
                            className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm font-bold text-emerald-600 outline-none focus:border-blue-600"
                            value={f.registrationFee || 0}
                            onChange={(e) => {
                                const newFees = fees.map(item => item.classId === f.classId ? { ...item, registrationFee: parseFloat(e.target.value) || 0 } : item);
                                setFees(newFees);
                            }}
                        />
                    </td>
                    <td className="px-6 py-4">
                        <input
                            type="number"
                            className="w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-blue-600"
                            value={f.totalFee}
                            onChange={(e) => {
                                const newFees = fees.map(item => item.classId === f.classId ? { ...item, totalFee: parseFloat(e.target.value) || 0 } : item);
                                setFees(newFees);
                            }}
                        />
                    </td>
                    {installments.map(inst => {
                        const fee = classInstallmentFees.find(cif => cif.class_id === f.classId && cif.installment_id === inst.id)?.amount || 0;
                        return (
                            <td key={inst.id} className="px-6 py-4 bg-blue-50/10 dark:bg-blue-900/5">
                                <input
                                    type="number"
                                    className="w-24 bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900 rounded-lg p-2 text-xs font-bold text-blue-600 outline-none focus:border-blue-600"
                                    value={fee}
                                    onChange={(e) => {
                                        const amount = parseFloat(e.target.value) || 0;
                                        handleUpdateInstallmentFee(f.classId, inst.id, amount);
                                        // Update local state for immediate feedback
                                        const updatedCif = [...classInstallmentFees.filter(c => !(c.class_id === f.classId && c.installment_id === inst.id)), { class_id: f.classId, installment_id: inst.id, amount }];
                                        setClassInstallmentFees(updatedCif);
                                    }}
                                />
                            </td>
                        );
                    })}
                    <td className="px-6 py-4 text-right">
                    <button
                        onClick={() => handleUpdateBase(f.classId, f.totalFee, f.registrationFee)}
                        className="p-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all shadow-lg active:scale-95"
                        title="Sauvegarder"
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

      <div className="glass-card p-6 bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-600 flex items-start space-x-4">
          <Info className="text-blue-600 w-6 h-6 flex-shrink-0" />
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <p className="font-bold uppercase">Règle de Calcul Automatique :</p>
              <p>Lorsqu'un paiement est saisi, l'application solde d'abord l'inscription, puis répartit le reste dans l'ordre chronologique des tranches configurées ci-dessus.</p>
              <p>Exemple : Si Inscription = 5000 et Tranche 1 = 20000, un versement de 10000 couvrira les 5000 d'inscription et 5000 d'avance sur la Tranche 1.</p>
          </div>
      </div>
    </div>
  );
};

export default TuitionConfig;
