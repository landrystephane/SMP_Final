import React, { useEffect, useState } from 'react';
import { Save, Info, Plus, Trash2, CreditCard, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const TuitionConfig: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [fees, setFees] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [classInstallmentFees, setClassInstallmentFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE'>('FRANCOPHONE');

  const loadData = async () => {
    if (window.electronAPI && user) {
      const data = await window.electronAPI.getTuitionFees(user.schoolId);
      const classes = await window.electronAPI.getClasses(user.schoolId);
      const inst = await window.electronAPI.getInstallments();
      const cif = await window.electronAPI.getClassInstallmentFees(user.schoolId);

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
  }, [user]);

  const handleUpdateBase = async (classId: number, fee: number, reg: number) => {
    if (window.electronAPI) {
      await window.electronAPI.updateTuitionFee({ classId, totalFee: fee, registrationFee: reg });
    }
  };

  const handleUpdateInstallmentFee = async (classId: number, installmentId: number, amount: number) => {
      if (window.electronAPI) {
          await window.electronAPI.updateClassInstallmentFee({ classId, installmentId, amount });
      }
  };

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <CreditCard className="w-12 h-12 text-amber-500 animate-pulse" />
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">{t('loading_financial_settings', 'Chargement des paramètres financiers...')}</p>
    </div>
  );

  const filteredFees = fees.filter(f => f.section === activeSection);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic">FINANCE <span className="text-amber-500">ENGINE</span></h1>
          <p className="text-slate-500 mt-2 uppercase text-[10px] font-black tracking-[0.4em]">{t('tuition_config_subtitle', 'Configuration des Tranches & Échéanciers')}</p>
        </div>

        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            <button
                onClick={() => setActiveSection('FRANCOPHONE')}
                className={`flex items-center px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeSection === 'FRANCOPHONE' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
            >
                {t('section_francophone_label', 'FRANCOPHONE')}
            </button>
            <button
                onClick={() => setActiveSection('ANGLOPHONE')}
                className={`flex items-center px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeSection === 'ANGLOPHONE' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
            >
                {t('section_anglophone_label', 'ANGLOPHONE')}
            </button>
        </div>
      </div>

      {/* Global Tranches View */}
      <div className="glass-card p-10 bg-slate-900/40 border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-20 transition-opacity">
              <CreditCard className="w-32 h-32 text-white" />
          </div>
          <div className="flex justify-between items-center mb-10 relative z-10">
              <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tight uppercase flex items-center gap-3">
                    <Plus className="w-6 h-6 text-amber-500" /> {t('global_installments_structure', 'Structure des Tranches Globales')}
                  </h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('global_installments_desc', 'Définition des paliers de paiement pour l\'année scolaire')}</p>
              </div>
              <button className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10 transition-all">
                  {t('add_installment', 'Ajouter une tranche')}
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {installments.map((inst, idx) => (
                  <div key={inst.id} className="p-8 bg-slate-950/80 rounded-[2rem] border border-white/5 flex flex-col justify-between items-start group/card hover:border-amber-500/30 transition-all shadow-2xl">
                      <div className="flex justify-between w-full items-start mb-6">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('installment', 'Tranche')} {idx + 1}</span>
                        <button className="text-slate-700 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <span className="font-black text-xl text-white uppercase tracking-tighter">{inst.name}</span>
                  </div>
              ))}
          </div>
      </div>

      {/* Main Configuration Table */}
      <div className="glass-card shadow-2xl border-none overflow-hidden bg-slate-900/30">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead>
                <tr className="bg-slate-950 text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] border-b border-white/5">
                    <th className="px-10 py-8">{t('class_level', 'Classe / Niveau')}</th>
                    <th className="px-10 py-8">{t('registration_fee', 'Inscription Fixe (FCFA)')}</th>
                    <th className="px-10 py-8">{t('total_pension', 'Pension Totale (FCFA)')}</th>
                    {installments.map(inst => (
                        <th key={inst.id} className="px-10 py-8 text-amber-500 bg-amber-500/5">{inst.name}</th>
                    ))}
                    <th className="px-10 py-8 text-right">{t('actions', 'Actions')}</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-900/30">
                {filteredFees.map((f) => (
                <tr key={f.classId} className="hover:bg-white/5 transition-all group">
                    <td className="px-10 py-6 font-black text-white uppercase text-base tracking-tight italic">
                        {f.className}
                    </td>
                    <td className="px-10 py-6">
                        <input
                            type="number"
                            className="w-full max-w-[140px] bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-black text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                            value={f.registrationFee || 0}
                            onChange={(e) => {
                                const newFees = fees.map(item => item.classId === f.classId ? { ...item, registrationFee: parseFloat(e.target.value) || 0 } : item);
                                setFees(newFees);
                            }}
                        />
                    </td>
                    <td className="px-10 py-6">
                        <input
                            type="number"
                            className="w-full max-w-[160px] bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-black text-white outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
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
                            <td key={inst.id} className="px-10 py-6 bg-amber-500/5">
                                <input
                                    type="number"
                                    className="w-full max-w-[120px] bg-slate-950 border border-amber-500/20 rounded-2xl px-4 py-3 text-xs font-black text-amber-500 outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
                                    value={fee}
                                    onChange={(e) => {
                                        const amount = parseFloat(e.target.value) || 0;
                                        handleUpdateInstallmentFee(f.classId, inst.id, amount);
                                        const updatedCif = [...classInstallmentFees.filter(c => !(c.class_id === f.classId && c.installment_id === inst.id)), { class_id: f.classId, installment_id: inst.id, amount }];
                                        setClassInstallmentFees(updatedCif);
                                    }}
                                />
                            </td>
                        );
                    })}
                    <td className="px-10 py-6 text-right">
                    <button
                        onClick={() => handleUpdateBase(f.classId, f.totalFee, f.registrationFee)}
                        className="p-4 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-2xl transition-all shadow-xl shadow-amber-500/10 active:scale-95 flex items-center justify-center"
                        title={t('apply_changes', 'Appliquer les changements')}
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

      <div className="glass-card p-10 bg-slate-950 border-l-8 border-amber-500 flex items-start space-x-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
              <Info className="w-24 h-24 text-white" />
          </div>
          <div className="p-4 bg-amber-500/10 rounded-3xl">
            <Info className="text-amber-500 w-8 h-8 flex-shrink-0" />
          </div>
          <div className="text-[11px] text-slate-400 space-y-3 leading-relaxed relative z-10">
              <p className="font-black text-white uppercase tracking-widest text-sm italic">{t('chronological_engine', 'Moteur de Calcul Chronologique :')}</p>
              <p className="font-medium">{t('chronological_engine_desc', 'Le système Eco-Manage utilise une règle d\'imputation chronologique stricte pour garantir la transparence financière.')}</p>
              <div className="flex items-center gap-4 py-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 font-black text-emerald-500 uppercase">1. {t('registration', 'Inscription')}</div>
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 font-black text-amber-500 uppercase">2. {t('installments', 'Tranches')} (1, 2, 3)</div>
              </div>
              <p className="italic">{t('chronological_engine_example', 'Exemple : Pour un versement de 30.000 FCFA, si l\'inscription est de 10.000 FCFA, le système soldera l\'inscription et affectera les 20.000 FCFA restants à la première tranche impayée.')}</p>
          </div>
      </div>
    </div>
  );
};

export default TuitionConfig;
