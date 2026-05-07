import React, { useState, useEffect } from 'react';
import { Receipt, Download, TrendingUp, Users, Search, Plus, Filter, FileText, Printer, CheckCircle } from 'lucide-react';

const Finance: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [tuitionFees, setTuitionFees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'PAYMENTS'>('MANAGEMENT');
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ studentId: '', amount: '', type: 'Scolarité' });

  const loadData = async () => {
    if (window.electronAPI) {
      const p = await window.electronAPI.getPayments();
      const s = await window.electronAPI.getStudents();
      const c = await window.electronAPI.getClasses();
      const t = await window.electronAPI.getTuitionFees();
      setPayments(p);
      setStudents(s);
      setClasses(c);
      setTuitionFees(t);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalReceived = payments.reduce((acc, p) => acc + p.amount, 0);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
        // @ts-ignore
        const user = JSON.parse(localStorage.getItem('user'));
        await window.electronAPI.addPayment({
            ...newPayment,
            amount: parseFloat(newPayment.amount),
            userId: user.id
        });
        setIsAddingPayment(false);
        setNewPayment({ studentId: '', amount: '', type: 'Scolarité' });
        loadData();
    }
  };

  const getStudentBalance = (student: any) => {
      const classFee = tuitionFees.find(f => f.classId === student.class_id)?.totalFee || 0;
      const paid = payments.filter(p => p.student_id === student.id).reduce((acc, curr) => acc + curr.amount, 0);
      return classFee - paid;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Finance & Comptabilité</h1>
          <p className="text-slate-500 mt-1">Gestion bilingue des pensions et frais scolaires</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
                onClick={() => setActiveTab('MANAGEMENT')}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'MANAGEMENT' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                GESTION GLOBALE
            </button>
            <button
                onClick={() => setActiveTab('PAYMENTS')}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'PAYMENTS' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                ENCAISSEMENT ÉLÈVES
            </button>
        </div>
      </div>

      {activeTab === 'MANAGEMENT' ? (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 border-t-4 border-blue-600">
                    <div className="flex items-center justify-between mb-4">
                        <TrendingUp className="text-blue-600 w-8 h-8" />
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-black">RECETTES</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Total Encaissé</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalReceived.toLocaleString()} <span className="text-xs">FCFA</span></p>
                </div>
                <div className="glass-card p-6 border-t-4 border-emerald-500">
                    <div className="flex items-center justify-between mb-4">
                        <Users className="text-emerald-500 w-8 h-8" />
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-black">SOLVABILITÉ</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Élèves à jour</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {students.filter(s => getStudentBalance(s) <= 0).length} / {students.length}
                    </p>
                </div>
                <div className="glass-card p-6 border-t-4 border-rose-500">
                    <div className="flex items-center justify-between mb-4">
                        <Receipt className="text-rose-500 w-8 h-8" />
                        <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-1 rounded font-black">ARRIÉRÉS</span>
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase">Reste à recouvrer</p>
                    <p className="text-2xl font-black text-rose-600 mt-1">
                        {students.reduce((acc, s) => acc + Math.max(0, getStudentBalance(s)), 0).toLocaleString()} <span className="text-xs">FCFA</span>
                    </p>
                </div>
            </div>

            <div className="glass-card">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold">Journal des Encaissements</h2>
                    <button className="text-xs font-bold text-blue-600 hover:underline flex items-center">
                        <Download className="w-4 h-4 mr-2" /> EXPORTER RAPPORT FINANCIER
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">N° Reçu</th>
                                <th className="px-6 py-4">Élève / Classe</th>
                                <th className="px-6 py-4">Montant</th>
                                <th className="px-6 py-4">Motif</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {payments.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 font-mono text-sm text-blue-600 font-bold">{p.receipt_number}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold uppercase text-slate-900 dark:text-white text-sm">{p.last_name} {p.first_name}</div>
                                        <div className="text-[10px] text-slate-500">{classes.find(c => c.id === p.class_id)?.name || 'Classe N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 font-black text-slate-900 dark:text-white">{p.amount.toLocaleString()} <span className="text-[10px] text-slate-400">FCFA</span></td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-2 py-1 rounded-full uppercase">{p.payment_type}</span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-500">{new Date(p.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Réimprimer le reçu">
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
            <div className="flex justify-between items-center bg-blue-600 p-6 rounded-2xl text-white shadow-lg">
                <div>
                    <h2 className="text-xl font-bold">Module d'Encaissement Rapide</h2>
                    <p className="text-blue-100 text-sm mt-1">Enregistrez un nouveau versement pour un élève déjà inscrit</p>
                </div>
                <button
                    onClick={() => setIsAddingPayment(true)}
                    className="bg-white text-blue-600 px-6 py-2.5 rounded-xl font-black text-sm shadow-sm hover:bg-blue-50 transition-all flex items-center"
                >
                    <Plus className="w-5 h-5 mr-2" /> NOUVEAU VERSEMENT
                </button>
            </div>

            <div className="glass-card">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un élève pour paiement..."
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none ring-1 ring-slate-200 dark:ring-slate-700 focus:ring-2 focus:ring-blue-600 transition-all"
                        />
                    </div>
                    <button className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase font-black text-slate-500 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Élève</th>
                                <th className="px-6 py-4">Scolarité Totale</th>
                                <th className="px-6 py-4">Déjà Payé</th>
                                <th className="px-6 py-4">Reste à Payer</th>
                                <th className="px-6 py-4">État</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {students.map(s => {
                                const balance = getStudentBalance(s);
                                const total = tuitionFees.find(f => f.classId === s.class_id)?.totalFee || 0;
                                const paid = total - balance;
                                return (
                                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold uppercase text-slate-900 dark:text-white text-sm">{s.last_name} {s.first_name}</div>
                                            <div className="text-[10px] text-slate-500">{classes.find(c => c.id === s.class_id)?.name || 'N/A'} • {s.matricule}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-500">{total.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-emerald-600">{paid.toLocaleString()}</td>
                                        <td className={`px-6 py-4 text-sm font-black ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {balance <= 0 ? 'SOLDÉ' : `${balance.toLocaleString()} FCFA`}
                                        </td>
                                        <td className="px-6 py-4">
                                            {balance <= 0 ? (
                                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                                            ) : (
                                                <div className="w-full max-w-[100px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-600" style={{ width: `${(paid/total)*100}%` }} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => {
                                                    setNewPayment({...newPayment, studentId: s.id.toString()});
                                                    setIsAddingPayment(true);
                                                }}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg hover:bg-blue-600 hover:text-white transition-all uppercase"
                                            >
                                                Payer
                                            </button>
                                            <button className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white">
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <div className="glass-card w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h2 className="text-xl font-bold">Enregistrer un versement</h2>
                      <button onClick={() => setIsAddingPayment(false)} className="text-slate-400 hover:text-slate-600"><Plus className="w-6 h-6 rotate-45" /></button>
                  </div>
                  <form onSubmit={handleAddPayment} className="p-6 space-y-4">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Élève bénéficiaire</label>
                          <select
                            required
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600"
                            value={newPayment.studentId}
                            onChange={(e) => setNewPayment({...newPayment, studentId: e.target.value})}
                          >
                              <option value="">Choisir un élève...</option>
                              {students.map(s => (
                                  <option key={s.id} value={s.id}>{s.last_name} {s.first_name} ({s.matricule})</option>
                              ))}
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Montant à verser (FCFA)</label>
                          <input
                            required
                            type="number"
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600 font-bold"
                            value={newPayment.amount}
                            onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                            placeholder="Ex: 25000"
                          />
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase">Type de frais</label>
                          <select
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-600"
                            value={newPayment.type}
                            onChange={(e) => setNewPayment({...newPayment, type: e.target.value})}
                          >
                              <option value="Scolarité">Frais de Scolarité (Pension)</option>
                              <option value="Inscription">Frais d'Inscription</option>
                              <option value="Transport">Frais de Transport</option>
                              <option value="Examen">Frais d'Examen</option>
                          </select>
                      </div>
                      <div className="pt-4 flex gap-3">
                          <button type="button" onClick={() => setIsAddingPayment(false)} className="flex-1 py-3 text-sm font-bold text-slate-500">Annuler</button>
                          <button type="submit" className="flex-2 py-3 px-8 bg-blue-600 text-white rounded-xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all">VALIDER ET IMPRIMER REÇU</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Finance;
