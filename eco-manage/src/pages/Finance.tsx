import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, Users, Search, Plus, Filter, FileText, Printer, CheckCircle, Wallet, ArrowUpRight, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Finance: React.FC = () => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [tuitionFees, setTuitionFees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'PAYMENTS'>('MANAGEMENT');
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPayment, setNewPayment] = useState({ studentId: '', amount: '', type: 'Scolarité', installmentId: '' });
  const [filterDate, setFilterDate] = useState('');

  const [installments, setInstallments] = useState<any[]>([]);
  const [classInstallmentFees, setClassInstallmentFees] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);

  const loadData = async () => {
    if (window.electronAPI) {
      const p = await window.electronAPI.getPayments();
      const s = await window.electronAPI.getStudents();
      const c = await window.electronAPI.getClasses();
      const t_fees = await window.electronAPI.getTuitionFees();
      const inst = await window.electronAPI.getInstallments();
      const cif = await window.electronAPI.getClassInstallmentFees();
      const schs = await window.electronAPI.getSchools();
      setPayments(p);
      setStudents(s);
      setClasses(c);
      setTuitionFees(t_fees);
      setInstallments(inst);
      setClassInstallmentFees(cif);
      setSchools(schs);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalReceived = payments.reduce((acc, p) => acc + p.amount, 0);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const res = await window.electronAPI.addPayment({
                ...newPayment,
                amount: parseFloat(newPayment.amount),
                userId: user.id,
                installmentId: newPayment.installmentId ? parseInt(newPayment.installmentId) : null
            });
            
            if (res && res.error) {
                alert(`Erreur de paiement: ${res.error}`);
                return;
            }

            setIsAddingPayment(false);
            setNewPayment({ studentId: '', amount: '', type: 'Scolarité', installmentId: '' });
            loadData();
        } catch (err: any) {
            alert(`Erreur: ${err.message}`);
        }
    }
  };

  const getStudentFinancials = (student: any) => {
      if (!student) return { totalDue: 0, totalPaid: 0, balance: 0, breakdown: { registration: 0, installments: [] }, overpaid: 0 };
      const classConfig = tuitionFees.find(f => f.classId === student.class_id);
      const scholarship = student.scholarship_reduction || 0;
      const totalPension = Math.max(0, (classConfig?.totalFee || 0) - scholarship);
      const totalReg = classConfig?.registrationFee || 0;
      const totalDue = totalPension + totalReg;

      const studentPayments = payments.filter(p => p.student_id === student.id);
      const totalPaid = studentPayments.reduce((acc, p) => acc + p.amount, 0);

      let remaining = totalPaid;
      const breakdown: any = { registration: 0, installments: [] };

      breakdown.registration = Math.min(totalReg, remaining);
      remaining -= breakdown.registration;

      const classInsts = (installments || []).map(inst => ({
          ...inst,
          amountDue: (classInstallmentFees || []).find(cif => cif.class_id === student.class_id && cif.installment_id === inst.id)?.amount || 0
      }));

      for (const inst of classInsts) {
          const paidForThis = Math.min(inst.amountDue, remaining);
          breakdown.installments.push({ ...inst, paid: paidForThis });
          remaining -= paidForThis;
      }

      return { totalDue, totalPaid, balance: totalDue - totalPaid, breakdown, overpaid: remaining };
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">{t('finance_accounting')}</h1>
          <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest">{t('bilingual_tuition_management')}</p>
        </div>
        <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
            <button
                onClick={() => setActiveTab('MANAGEMENT')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'MANAGEMENT' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                {t('global_management')}
            </button>
            <button
                onClick={() => setActiveTab('PAYMENTS')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'PAYMENTS' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                {t('student_collection')}
            </button>
        </div>
      </div>

      {activeTab === 'MANAGEMENT' ? (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl group-hover:bg-amber-500 transition-all">
                            <TrendingUp className="text-amber-500 group-hover:text-slate-950 w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{t('revenue')}</span>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('total_collected')}</p>
                    <p className="text-3xl font-black text-white mt-1">{totalReceived.toLocaleString()} <span className="text-xs text-slate-500">FCFA</span></p>
                </div>
                <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500 transition-all">
                            <Users className="text-emerald-500 group-hover:text-slate-950 w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t('solvency')}</span>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('up_to_date_students')}</p>
                    <p className="text-3xl font-black text-white mt-1">
                        {students.filter(s => getStudentFinancials(s).balance <= 0).length} <span className="text-xs text-slate-500">/ {students.length}</span>
                    </p>
                </div>
                <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-rose-500/10 rounded-2xl group-hover:bg-rose-500 transition-all">
                            <Wallet className="text-rose-500 group-hover:text-slate-950 w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{t('arrears')}</span>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('remaining_to_recover')}</p>
                    <p className="text-3xl font-black text-rose-500 mt-1">
                        {students.reduce((acc, s) => acc + Math.max(0, getStudentFinancials(s).balance), 0).toLocaleString()} <span className="text-xs">FCFA</span>
                    </p>
                </div>
            </div>

            <div className="glass-card border-none shadow-xl">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-black text-white flex items-center tracking-tight">
                        <Clock className="w-6 h-6 mr-3 text-amber-500" />
                        {t('collection_journal')}
                    </h2>
                    <div className="flex gap-4">
                        <input
                            type="date"
                            className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black text-white outline-none focus:ring-1 focus:ring-amber-500"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                        <button className="text-[10px] font-black text-amber-500 hover:text-white flex items-center uppercase tracking-widest bg-amber-500/10 px-4 py-2 rounded-xl transition-all border border-amber-500/20">
                            <Download className="w-4 h-4 mr-2" /> {t('export_report')}
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/50 text-[10px] uppercase font-black text-slate-500 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5">{t('receipt_no')}</th>
                                <th className="px-6 py-5">{t('student_class')}</th>
                                <th className="px-6 py-5">{t('amount')}</th>
                                <th className="px-6 py-5">{t('reason')}</th>
                                <th className="px-6 py-5">{t('date')}</th>
                                <th className="px-6 py-5 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {payments
                             .filter(p => !filterDate || p.payment_date.startsWith(filterDate))
                             .map(p => (
                                <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-sm text-amber-500 font-bold tracking-tighter">#{p.receipt_number}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-black uppercase text-white text-sm tracking-tight">{p.last_name} {p.first_name}</div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{classes.find(c => c.id === p.class_id)?.name || 'Classe N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 font-black text-white">{p.amount.toLocaleString()} <span className="text-[10px] text-slate-500">FCFA</span></td>
                                    <td className="px-6 py-4">
                                        <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-500/20">{t(p.payment_type.toLowerCase()) || p.payment_type}</span>
                                    </td>
                                    <td className="px-6 py-4 text-[10px] text-slate-500 font-black uppercase tracking-widest">{new Date(p.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => {
                                                const s = students.find(stud => stud.id === p.student_id);
                                                const financials = getStudentFinancials(s || { id: p.student_id, class_id: p.class_id });
                                                const user = JSON.parse(localStorage.getItem('user') || '{}');
                                                const activeSchool = schools.find(sch => sch.id === user.schoolId) || schools[0];
                                                // @ts-ignore
                                                import('../utils/reports').then(m => m.generatePaymentReceipt(p, s || { last_name: p.last_name, first_name: p.first_name, matricule: 'N/A' }, financials, activeSchool));
                                            }}
                                            className="p-2.5 text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all"
                                            title={t('reprint_receipt')}
                                        >
                                            <Printer className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-amber-500 to-yellow-400 p-8 rounded-3xl text-slate-950 shadow-2xl shadow-amber-500/20">
                <div className="mb-4 md:mb-0">
                    <h2 className="text-2xl font-black tracking-tight">{t('quick_collection_module')}</h2>
                    <p className="text-slate-900/60 text-sm font-bold mt-1">{t('quick_collection_desc')}</p>
                </div>
                <button
                    onClick={() => setIsAddingPayment(true)}
                    className="bg-slate-950 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center"
                >
                    <Plus className="w-5 h-5 mr-3" /> {t('new_payment')}
                </button>
            </div>

            <div className="glass-card border-none shadow-xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-slate-900/50">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder={t('search_student_payment')}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-6 py-3.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="p-3.5 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 transition-colors">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/50 text-[10px] uppercase font-black text-slate-500 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-5">{t('student')}</th>
                                <th className="px-6 py-5">{t('total_tuition')}</th>
                                <th className="px-6 py-5">{t('already_paid')}</th>
                                <th className="px-6 py-5">{t('remaining_to_pay')}</th>
                                <th className="px-6 py-5">{t('state')}</th>
                                <th className="px-6 py-5 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {students.filter(s =>
                                s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                s.matricule.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map(s => {
                                const fin = getStudentFinancials(s);
                                return (
                                    <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-black uppercase text-white text-sm tracking-tight">{s.last_name} {s.first_name}</div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{classes.find(c => c.id === s.class_id)?.name || 'N/A'} • {s.matricule}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-black text-slate-400">{fin.totalDue.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-xs font-black text-emerald-500">{fin.totalPaid.toLocaleString()}</td>
                                        <td className={`px-6 py-4 text-sm font-black ${fin.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {fin.balance <= 0 ? t('paid_status') : `${fin.balance.toLocaleString()} FCFA`}
                                        </td>
                                        <td className="px-6 py-4">
                                            {fin.balance <= 0 ? (
                                                <div className="flex items-center text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                    <CheckCircle className="w-3 h-3 mr-2" /> {t('paid_status')}
                                                </div>
                                            ) : (
                                                <div className="w-full max-w-[100px] h-1.5 bg-slate-900 rounded-full overflow-hidden p-[1px] border border-white/5 shadow-inner">
                                                    <div className="h-full bg-amber-500 shadow-lg shadow-amber-500/50 rounded-full transition-all duration-700" style={{ width: `${fin.totalDue > 0 ? (fin.totalPaid/fin.totalDue)*100 : 0}%` }} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => {
                                                    setNewPayment({...newPayment, studentId: s.id.toString()});
                                                    setIsAddingPayment(true);
                                                }}
                                                className="px-5 py-2.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-xl hover:bg-yellow-400 active:scale-95 transition-all uppercase tracking-widest shadow-lg shadow-amber-500/10"
                                            >
                                                {t('pay')}
                                            </button>
                                            <button className="p-2.5 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/5">
                                                <FileText className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* Modal Nouveau Paiement */}
      {isAddingPayment && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-300">
              <div className="glass-card w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl p-0 overflow-hidden">
                  <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">{t('register_payment')}</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Saisie sécurisée des fonds</p>
                      </div>
                      <button onClick={() => setIsAddingPayment(false)} className="p-2 hover:bg-white/5 rounded-full transition-all"><Plus className="w-8 h-8 rotate-45 text-slate-500" /></button>
                  </div>
                  <form onSubmit={handleAddPayment} className="p-8 space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                            <Users className="w-3 h-3 mr-2" /> {t('beneficiary_student')}
                          </label>
                          <select
                            required
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all appearance-none"
                            value={newPayment.studentId}
                            onChange={(e) => setNewPayment({...newPayment, studentId: e.target.value})}
                          >
                              <option value="">{t('choose_student')}</option>
                              {students.map(s => (
                                  <option key={s.id} value={s.id}>{s.last_name} {s.first_name} ({s.matricule})</option>
                              ))}
                          </select>
                      </div>

                      {newPayment.studentId && (
                          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl animate-in fade-in duration-300">
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">État du Compte</span>
                                  <span className="text-sm font-black text-white">{getStudentFinancials(students.find(s => s.id.toString() === newPayment.studentId)).balance.toLocaleString()} FCFA Restant</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500"
                                    style={{ width: `${getStudentFinancials(students.find(s => s.id.toString() === newPayment.studentId)).totalDue > 0 ? (getStudentFinancials(students.find(s => s.id.toString() === newPayment.studentId)).totalPaid / getStudentFinancials(students.find(s => s.id.toString() === newPayment.studentId)).totalDue) * 100 : 0}%` }}
                                  />
                              </div>
                          </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                                <Wallet className="w-3 h-3 mr-2" /> {t('amount_to_pay')}
                            </label>
                            <div className="relative">
                                <input
                                    required
                                    type="number"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 pl-6 text-white font-black text-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner"
                                    value={newPayment.amount}
                                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                                    placeholder="0"
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600 uppercase tracking-widest">FCFA</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                                <Filter className="w-3 h-3 mr-2" /> {t('fee_type')}
                            </label>
                            <select
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all appearance-none"
                                value={newPayment.type}
                                onChange={(e) => setNewPayment({...newPayment, type: e.target.value})}
                            >
                                <option value="Scolarité">{t('tuition_fees_pension')}</option>
                                <option value="Inscription">{t('registration_fees')}</option>
                                <option value="Transport">{t('transport_fees')}</option>
                                <option value="Examen">{t('exam_fees')}</option>
                            </select>
                        </div>
                      </div>

                      {newPayment.type === 'Scolarité' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                                <Clock className="w-3 h-3 mr-2" /> {t('installment_assignment')}
                            </label>
                            <select
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all appearance-none"
                                value={newPayment.installmentId}
                                onChange={(e) => setNewPayment({...newPayment, installmentId: e.target.value})}
                            >
                                <option value="">Imputation Automatique</option>
                                {installments.map(inst => (
                                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                                ))}
                            </select>
                        </div>
                      )}

                      <div className="pt-6 flex flex-col md:flex-row gap-4">
                          <button type="button" onClick={() => setIsAddingPayment(false)} className="flex-1 py-4 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all order-2 md:order-1">Annuler</button>
                          <button type="submit" className="flex-[2] py-4 px-8 bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-amber-500/20 hover:bg-yellow-400 active:scale-95 transition-all flex items-center justify-center order-1 md:order-2">
                            <ArrowUpRight className="w-5 h-5 mr-3" /> {t('validate_and_print')}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Finance;
