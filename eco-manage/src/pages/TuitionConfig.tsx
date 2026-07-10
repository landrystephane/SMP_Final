import React, { useEffect, useState } from 'react';
import { Save, Info, Plus, Trash2, CreditCard, ChevronRight, X, Bus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';

const TuitionConfig: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [fees, setFees] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [classInstallmentFees, setClassInstallmentFees] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE'>('FRANCOPHONE');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newInstallmentName, setNewInstallmentName] = useState('');
  
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [transportFeeModel, setTransportFeeModel] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [transportFeeAmount, setTransportFeeAmount] = useState<number>(0);

  const loadData = async () => {
    if (window.electronAPI && user) {
      const data = await window.electronAPI.getTuitionFees(user.schoolId);
      const classes = await window.electronAPI.getClasses(user.schoolId);
      const inst = await window.electronAPI.getInstallments();
      const cif = await window.electronAPI.getClassInstallmentFees(user.schoolId);
      const dead = await window.electronAPI.getInstallmentDeadlines(user.schoolId);

      const joined = data.map((f: any) => ({
          ...f,
          section: classes.find((c: any) => c.id === f.classId)?.section || 'FRANCOPHONE'
      }));
      setFees(joined);
      setInstallments(inst || []);
      setClassInstallmentFees(cif || []);
      setDeadlines(dead || []);
      
      const schools = await window.electronAPI.getSchools();
      const currentSchool = schools.find((s: any) => Number(s.id) === Number(user.schoolId)) || schools[0];
      if (currentSchool) {
          setSchoolSettings(currentSchool);
          setTransportFeeModel(currentSchool.transport_fee_model || 'ANNUAL');
          setTransportFeeAmount(currentSchool.transport_fee_amount || 0);
      }
      
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const getInstallmentSum = (classId: number, overrideCif?: any[]) => {
      const cif = overrideCif ?? classInstallmentFees;
      return installments.reduce((sum, inst) => {
          const entry = cif.find((c: any) => c.class_id === classId && c.installment_id === inst.id);
          return sum + (entry?.amount || 0);
      }, 0);
  };

  const saveTimerRef = React.useRef<any>(null);
  const handleUpdateBase = async (classId: number, fee: number, reg: number, trans: number, exam: number) => {
    if (installments.length > 0 && fee > 0) {
        const instSum = getInstallmentSum(classId);
        if (instSum !== fee) {
            const className = fees.find(f => f.classId === classId)?.className || '';
            showNotification(
                `${className} — La somme des tranches (${instSum.toLocaleString()} FCFA) doit être égale à la pension totale (${fee.toLocaleString()} FCFA). Différence : ${(fee - instSum).toLocaleString()} FCFA.`,
                "error"
            );
            return;
        }
    }
    if (window.electronAPI) {
      try {
        await window.electronAPI.updateTuitionFee({ classId, totalFee: fee, registrationFee: reg, transportFee: trans, examFee: exam });
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => showNotification(t('tc_tuition_fees_updated', 'Frais de scolarité mis à jour'), "success"), 1500);
      } catch (err: any) {
        showNotification(t('fin_generic_error', 'Erreur: {{error}}', { error: err.message }), "error");
      }
    }
  };

  const installTimerRef = React.useRef<any>(null);
  const handleUpdateInstallmentFee = async (classId: number, installmentId: number, amount: number) => {
      const updatedCif = [...classInstallmentFees.filter((c: any) => !(c.class_id === classId && c.installment_id === installmentId)), { class_id: classId, installment_id: installmentId, amount }];
      if (window.electronAPI) {
          try {
              await window.electronAPI.updateClassInstallmentFee({ classId, installmentId, amount });
              if (installTimerRef.current) clearTimeout(installTimerRef.current);
              const classTotal = fees.find(f => f.classId === classId)?.totalFee || 0;
              const instSum = getInstallmentSum(classId, updatedCif);
              if (installments.length > 0 && classTotal > 0 && instSum !== classTotal) {
                  installTimerRef.current = setTimeout(() => showNotification(
                      `Somme des tranches : ${instSum.toLocaleString()} / ${classTotal.toLocaleString()} FCFA — ${instSum < classTotal ? (classTotal - instSum).toLocaleString() + ' FCFA manquants' : (instSum - classTotal).toLocaleString() + ' FCFA en excès'}`,
                      "warning"
                  ), 800);
              } else if (installments.length > 0 && classTotal > 0 && instSum === classTotal) {
                  installTimerRef.current = setTimeout(() => showNotification(t('tc_installment_updated', 'Tranche mise à jour'), "success"), 800);
              }
          } catch (err: any) {
              showNotification(t('fin_generic_error', 'Erreur: {{error}}', { error: err.message }), "error");
          }
      }
  };

  const handleUpdateDeadline = async (installmentId: number, date: string) => {
      const updated = [...deadlines];
      const idx = updated.findIndex(d => d.installment_id === installmentId);
      if (idx >= 0) {
          updated[idx].deadline_date = date;
      } else {
          updated.push({ installment_id: installmentId, deadline_date: date });
      }
      setDeadlines(updated);
      
      if (window.electronAPI && user) {
          try {
              await window.electronAPI.saveInstallmentDeadlines({
                  schoolId: user.schoolId,
                  deadlines: updated.map(d => ({ installmentId: d.installment_id, deadlineDate: d.deadline_date }))
              });
              showNotification(t('tc_deadline_updated', 'Échéance mise à jour'), "success");
          } catch (err: any) {
              showNotification(t('fin_generic_error', 'Erreur: {{error}}', { error: err.message }), "error");
          }
      }
  };

  const handleUpdateTransportSettings = async () => {
      if (window.electronAPI && schoolSettings) {
          try {
              await window.electronAPI.updateSchoolSettings({
                  ...schoolSettings,
                  transport_fee_model: transportFeeModel,
                  transport_fee_amount: transportFeeAmount
              });
              
              // Appliquer à toutes les classes
              for (const f of fees) {
                  await window.electronAPI.updateTuitionFee({
                      classId: f.classId,
                      totalFee: f.totalFee || 0,
                      registrationFee: f.registrationFee || 0,
                      transportFee: transportFeeAmount,
                      examFee: f.examFee || 0
                  });
              }
              const newFees = fees.map(f => ({ ...f, transportFee: transportFeeAmount }));
              setFees(newFees);
              
              showNotification(t('settings_updated', 'Paramètres mis à jour avec succès.'), "success");
          } catch (e: any) {
              showNotification(t('fin_generic_error', 'Erreur: {{error}}', { error: e.message }), "error");
          }
      } else {
          showNotification(t('tc_school_settings_load_error', 'Erreur: Les paramètres de l\'école n\'ont pas pu être chargés.'), "error");
      }
  };

  const handleAddInstallment = () => {
      setNewInstallmentName('');
      setShowAddModal(true);
  };

  const submitAddInstallment = async () => {
      if (!newInstallmentName.trim()) return;
      if (window.electronAPI) {
          try {
              const res = await window.electronAPI.addInstallment(newInstallmentName.trim().toUpperCase());
              if (res && res.error) {
                  showNotification(t('fin_generic_error', 'Erreur: {{error}}', { error: res.error }), "error");
                  return;
              }
              setShowAddModal(false);
              showNotification(t('tc_installment_added', 'Tranche ajoutée avec succès'), "success");
              loadData();
          } catch (err: any) {
              showNotification(t('fin_generic_error', 'Erreur: {{error}}', { error: err.message }), "error");
          }
      }
  };

  const handleDeleteInstallment = async (id: number, name: string) => {
      if (!window.confirm(t('tc_confirm_delete_installment', 'Êtes-vous sûr de vouloir supprimer la tranche : {{name}} ? Cela supprimera également les configurations de paiement associées.', { name }))) return;
      if (window.electronAPI) {
          try {
              await window.electronAPI.deleteInstallment(id);
              showNotification(t('tc_installment_deleted', 'Tranche supprimée'), "success");
              loadData();
          } catch (err: any) {
              showNotification(t('fin_generic_error', 'Erreur: {{error}}', { error: err.message }), "error");
          }
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
          <h1 className="text-4xl font-black text-white tracking-tighter italic">{t('tc_finance_engine_title', 'FINANCE')} <span className="text-amber-500">{t('tc_finance_engine_title_accent', 'ENGINE')}</span></h1>
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
              <button onClick={handleAddInstallment} className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest border border-white/10 transition-all">
                  {t('add_installment', 'Ajouter une tranche')}
              </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              {installments.map((inst, idx) => {
                  const deadlineRecord = deadlines.find(d => d.installment_id === inst.id);
                  return (
                      <div key={inst.id} className="p-8 bg-slate-950/80 rounded-[2rem] border border-white/5 flex flex-col justify-between items-start group/card hover:border-amber-500/30 transition-all shadow-2xl">
                          <div className="flex justify-between w-full items-start mb-6">
                              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('installment', 'Tranche')} {idx + 1}</span>
                              <button onClick={() => handleDeleteInstallment(inst.id, inst.name)} className="text-slate-700 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <span className="font-black text-xl text-white uppercase tracking-tighter mb-4">{inst.name}</span>
                          <div className="w-full">
                              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">{t('tc_deadline_label', 'Date limite')}</label>
                              <input 
                                  type="date" 
                                  value={deadlineRecord?.deadline_date || ''}
                                  onChange={(e) => handleUpdateDeadline(inst.id, e.target.value)}
                                  onBlur={() => {}}
                                  className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-slate-300 outline-none focus:border-amber-500"
                              />
                          </div>
                      </div>
                  );
              })}
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
                    <th className="px-10 py-8">{t('tc_transport_col', 'Transport (FCFA)')}</th>
                    <th className="px-10 py-8">{t('tc_exam_col', 'Examen (FCFA)')}</th>
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
                            type="text"
                            inputMode="numeric"
                            className="w-full max-w-[140px] bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-black text-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                            value={f.registrationFee === 0 ? '' : f.registrationFee}
                            onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                const newFees = fees.map(item => item.classId === f.classId ? { ...item, registrationFee: val } : item);
                                setFees(newFees);
                            }}
                            onBlur={() => {}}
                        />
                    </td>
                    <td className="px-10 py-6">
                        <input
                            type="text"
                            inputMode="numeric"
                            className="w-full max-w-[140px] bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-black text-indigo-500 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                            value={f.transportFee === 0 ? '' : f.transportFee}
                            onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                const newFees = fees.map(item => item.classId === f.classId ? { ...item, transportFee: val } : item);
                                setFees(newFees);
                            }}
                            onBlur={() => {}}
                        />
                    </td>
                    <td className="px-10 py-6">
                        <input
                            type="text"
                            inputMode="numeric"
                            disabled={!(f.className || '').toUpperCase().replace(/\s+/g, '').includes('CM2') && !(f.className || '').toUpperCase().replace(/\s+/g, '').includes('CLASS6')}
                            className="w-full max-w-[140px] bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-black text-rose-500 outline-none focus:ring-2 focus:ring-rose-500/20 transition-all shadow-inner disabled:opacity-30 disabled:cursor-not-allowed"
                            value={!(f.className || '').toUpperCase().replace(/\s+/g, '').includes('CM2') && !(f.className || '').toUpperCase().replace(/\s+/g, '').includes('CLASS6') ? '' : (f.examFee === 0 ? '' : f.examFee)}
                            onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                const newFees = fees.map(item => item.classId === f.classId ? { ...item, examFee: val } : item);
                                setFees(newFees);
                            }}
                            onBlur={() => {}}
                        />
                    </td>
                    <td className="px-10 py-6">
                        <input
                            type="text"
                            inputMode="numeric"
                            className="w-full max-w-[160px] bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm font-black text-white outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
                            value={f.totalFee === 0 ? '' : f.totalFee}
                            onChange={(e) => {
                                const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                const newFees = fees.map(item => item.classId === f.classId ? { ...item, totalFee: val } : item);
                                setFees(newFees);
                            }}
                            onBlur={() => {}}
                        />
                    </td>
                    {installments.map(inst => {
                        const fee = classInstallmentFees.find(cif => cif.class_id === f.classId && cif.installment_id === inst.id)?.amount || 0;
                        return (
                            <td key={inst.id} className="px-10 py-6 bg-amber-500/5">
                                <input
                                    type="number"
                                    min={0}
                                    className="w-full max-w-[120px] bg-slate-950 border border-amber-500/20 rounded-2xl px-4 py-3 text-xs font-black text-amber-500 outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
                                    value={fee === 0 ? '' : fee}
                                    onChange={(e) => {
                                        const amount = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        const updatedCif = [...classInstallmentFees.filter(c => !(c.class_id === f.classId && c.installment_id === inst.id)), { class_id: f.classId, installment_id: inst.id, amount }];
                                        setClassInstallmentFees(updatedCif);
                                        handleUpdateInstallmentFee(f.classId, inst.id, amount);
                                    }}
                                    onBlur={() => {}}
                                />
                            </td>
                        );
                    })}
                    {installments.length > 0 && (() => {
                        const instSum = getInstallmentSum(f.classId);
                        const pension = f.totalFee || 0;
                        const isOk = pension > 0 && instSum === pension;
                        const isEmpty = instSum === 0 && pension === 0;
                        return (
                            <td className="px-6 py-6">
                                <div className={`text-center text-[10px] font-black rounded-xl px-3 py-2 whitespace-nowrap ${isEmpty ? 'bg-slate-800 text-slate-500' : isOk ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'}`}>
                                    {isEmpty ? '—' : isOk ? `✓ ${instSum.toLocaleString()} FCFA` : `${instSum.toLocaleString()} / ${pension.toLocaleString()}`}
                                </div>
                            </td>
                        );
                    })()}
                    <td className="px-10 py-6 text-right">
                    {(() => {
                        const instSum = getInstallmentSum(f.classId);
                        const pension = f.totalFee || 0;
                        const blocked = installments.length > 0 && pension > 0 && instSum !== pension;
                        return (
                            <button
                                type="button"
                                onClick={() => handleUpdateBase(f.classId, f.totalFee, f.registrationFee, f.transportFee, f.examFee)}
                                className={`p-4 rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center ${blocked ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/10'}`}
                                title={blocked ? `Somme des tranches (${instSum.toLocaleString()}) ≠ Pension (${pension.toLocaleString()})` : t('apply_changes', 'Appliquer les changements')}
                            >
                                <Save className="w-5 h-5" />
                            </button>
                        );
                    })()}
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
              <p className="font-medium">{t('chronological_engine_desc', 'Le système utilise une règle d\'imputation chronologique stricte pour garantir la transparence financière.')}</p>
              <div className="flex items-center gap-4 py-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 font-black text-emerald-500 uppercase">1. {t('registration', 'Inscription')}</div>
                  <ChevronRight className="w-4 h-4 text-slate-700" />
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/5 font-black text-amber-500 uppercase">2. {t('installments', 'Tranches')} (1, 2, 3)</div>
              </div>
              <p className="italic">{t('chronological_engine_example', 'Exemple : Pour un versement de 30.000 FCFA, si l\'inscription est de 10.000 FCFA, le système soldera l\'inscription et affectera les 20.000 FCFA restants à la première tranche impayée.')}</p>
          </div>
      </div>

      {/* Transport Fee Settings */}
      <div className="glass-card p-10 bg-slate-900/40 border-white/5">
          <div className="flex justify-between items-center mb-8">
              <div>
                  <h2 className="text-2xl font-black text-white italic tracking-tight uppercase flex items-center gap-3">
                      <Bus className="w-6 h-6 text-amber-500" /> {t('tc_transport_settings_title', 'Paramètres de Transport')}
                  </h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('tc_transport_settings_desc', 'Configuration globale des frais de transport scolaire')}</p>
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('tc_billing_model_label', 'Modèle de Facturation')}</label>
                  <select
                      value={transportFeeModel}
                      onChange={(e) => setTransportFeeModel(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                  >
                      <option value="ANNUAL">{t('tc_annual_flat_rate', 'Annuel (Forfait Global)')}</option>
                      <option value="MONTHLY">{t('tc_monthly_subscription', 'Mensuel (Abonnement par mois)')}</option>
                  </select>
              </div>
              <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('tc_amount_per_period_label', 'Montant ({{period}}) en FCFA', { period: transportFeeModel === 'MONTHLY' ? t('tc_per_month', 'Par Mois') : t('tc_annual', 'Annuel') })}</label>
                  <input 
                      type="number"
                      value={transportFeeAmount}
                      onChange={(e) => setTransportFeeAmount(parseFloat(e.target.value) || 0)}
                      onBlur={() => {}}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                  />
              </div>
          </div>
          <div className="mt-8 flex justify-end">
              <button 
                  onClick={handleUpdateTransportSettings}
                  className="px-8 py-3 bg-amber-500 text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20"
              >
                  {t('tc_save_transport_settings', 'Enregistrer les paramètres de transport')}
              </button>
          </div>
      </div>

      {/* Add Installment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-white italic tracking-tight">{t('tc_new_installment_title', 'NOUVELLE TRANCHE')}</h3>
                    <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('tc_installment_name_label', 'Nom de la tranche')}</label>
                        <input
                            type="text"
                            placeholder={t('tc_installment_name_placeholder', 'ex: 4E TRANCHE')}
                            value={newInstallmentName}
                            onChange={(e) => setNewInstallmentName(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>
                    <button
                        onClick={submitAddInstallment}
                        disabled={!newInstallmentName.trim()}
                        className="w-full bg-amber-500 text-slate-950 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-yellow-400 transition-all disabled:opacity-50"
                    >
                        {t('tc_create_installment', 'Créer la tranche')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default TuitionConfig;
