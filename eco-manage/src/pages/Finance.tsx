import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, Users, Search, Plus, Filter, FileText, Printer, CheckCircle, Wallet, ArrowUpRight, Clock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Finance: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [tuitionFees, setTuitionFees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'PAYMENTS' | 'EXPENSES' | 'SPECIAL_FEES'>('MANAGEMENT');
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPayment, setNewPayment] = useState({ studentId: '', amount: '', depositorName: '', includeTransport: false, includeExam: false });
  const [newExpense, setNewExpense] = useState({ amount: '', reason: '' });
  const [filterDate, setFilterDate] = useState('');

  const [installments, setInstallments] = useState<any[]>([]);
  const [classInstallmentFees, setClassInstallmentFees] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [isNotifying, setIsNotifying] = useState(false);

  const loadData = async () => {
    if (window.electronAPI) {
      const sid = localStorage.getItem('impersonated_school_id') || user?.schoolId;
      const p = await window.electronAPI.getPayments(sid);
      const s = await window.electronAPI.getStudents(sid);
      const c = await window.electronAPI.getClasses(sid);
      const t_fees = await window.electronAPI.getTuitionFees(sid);
      const inst = await window.electronAPI.getInstallments();
      const cif = await window.electronAPI.getClassInstallmentFees(sid);
      const schs = await window.electronAPI.getSchools();
      const exp = await window.electronAPI.getExpenses(sid);
      const dead = await window.electronAPI.getInstallmentDeadlines(sid);
      setPayments(p || []);
      setStudents(s || []);
      setClasses(c || []);
      setTuitionFees(t_fees || []);
      setInstallments(inst || []);
      setClassInstallmentFees(cif || []);
      setSchools(schs || []);
      setExpenses(exp || []);
      setDeadlines(dead || []);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalValidatedExpenses = expenses.filter(e => e.status === 'VALIDATED').reduce((acc, e) => acc + e.amount, 0);
  const totalReceived = totalCollected - totalValidatedExpenses;

  const handleAddPaymentLegacy = async (paymentData: { studentId: string; amount: string; type: string; installmentId: string; depositorName: string }) => {
    if (window.electronAPI) {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const res = await window.electronAPI.addPayment({
                ...paymentData,
                studentId: parseInt(paymentData.studentId),
                amount: parseFloat(paymentData.amount.toString().replace(/\s+/g, '')),
                userId: parseInt(user.id),
                installmentId: paymentData.installmentId ? parseInt(paymentData.installmentId) : null
            });
            if (res && res.error) {
                showNotification(`Erreur de paiement: ${res.error}`, "error");
                return;
            }
            if (res.receiptNumber) {
                const s = students.find(stud => stud.id.toString() === paymentData.studentId);
                const financials = getStudentFinancials(s, paymentData.type);
                const amountPaid = parseFloat(paymentData.amount) || 0;
                financials.totalPaid += amountPaid;
                financials.balance = Math.max(0, financials.totalDue - financials.totalPaid);
                const activeSchool = schools.find(sch => sch.id.toString() === (localStorage.getItem('impersonated_school_id') || user?.schoolId)?.toString()) || schools[0];
                const pd = { ...paymentData, receipt_number: res.receiptNumber, payment_date: new Date().toISOString(), amount: amountPaid, payment_type: paymentData.type, depositor_name: paymentData.depositorName };
                // @ts-ignore
                import('../utils/reports').then(m => m.generatePaymentReceipt(pd, s, financials, activeSchool));
            }
            showNotification("Paiement enregistré avec succès !", "success");
            loadData();
        } catch (err: any) {
            console.error(err);
            showNotification("Erreur: " + err.message, "error");
        }
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.depositorName.trim()) {
        showNotification("Le nom de celui qui fait le versement est obligatoire.", "warning");
        return;
    }
    if (!newPayment.studentId) {
        showNotification("Veuillez sélectionner un élève.", "warning");
        return;
    }
    const parsedAmount = parseFloat(newPayment.amount.toString().replace(/\s+/g, ''));
    if (!parsedAmount || parsedAmount <= 0) {
        showNotification("Veuillez saisir un montant valide.", "warning");
        return;
    }

    if (window.electronAPI) {
        try {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const res = await window.electronAPI.smartPayment({
                studentId: parseInt(newPayment.studentId),
                totalAmount: parsedAmount,
                userId: currentUser.id,
                depositorName: newPayment.depositorName,
                includeTransport: newPayment.includeTransport || false,
                includeExam: newPayment.includeExam || false
            });

            if (res && res.error) {
                showNotification(`Erreur de paiement: ${res.error}`, "error");
                setIsAddingPayment(false);
                return;
            }

            // Generate a PDF receipt for EACH ventilated receipt
            if (res.receipts && res.receipts.length > 0) {
                const s = students.find(stud => stud.id.toString() === newPayment.studentId);
                const activeSchool = schools.find(sch => sch.id.toString() === (localStorage.getItem('impersonated_school_id') || currentUser?.schoolId)?.toString()) || schools[0];

                // @ts-ignore
                const reportsModule = await import('../utils/reports');
                for (const receipt of res.receipts) {
                    const financials = getStudentFinancials(s, receipt.type);
                    financials.totalPaid += receipt.amount;
                    financials.balance = Math.max(0, financials.totalDue - financials.totalPaid);

                    const paymentData = {
                        receipt_number: receipt.receiptNumber,
                        payment_date: new Date().toISOString(),
                        amount: receipt.amount,
                        payment_type: receipt.type,
                        installment_name: receipt.installmentName || null,
                        depositor_name: newPayment.depositorName,
                        student_id: parseInt(newPayment.studentId)
                    };
                    reportsModule.generatePaymentReceipt(paymentData, s, financials, activeSchool);
                }

                // Build ventilation summary
                const summary = res.receipts.map((r: any) => `${r.installmentName || r.type} ${r.amount.toLocaleString()} FCFA`).join(', ');
                showNotification(`Paiement ventilé: ${summary}`, "success");
            } else {
                showNotification("Paiement enregistré avec succès !", "success");
            }

            setIsAddingPayment(false);
            setNewPayment({ studentId: '', amount: '', depositorName: '', includeTransport: false, includeExam: false });

            // Notify system
            const studentInfo = students.find(s => s.id.toString() === newPayment.studentId);
            try {
                await window.electronAPI.createNotification({
                    school_id: localStorage.getItem('impersonated_school_id') || currentUser?.schoolId,
                    role: currentUser?.role || 'ALL',
                    message: `Un paiement de ${parsedAmount.toLocaleString()} FCFA a été enregistré pour l'élève ${studentInfo?.last_name} ${studentInfo?.first_name || ''} (ventilation automatique).`,
                    type: 'FINANCE'
                });
            } catch(e) { console.error("Notification failed", e); }

            loadData();
        } catch (err: any) {
            console.error(err);
            showNotification("Erreur: " + err.message, "error");
        }
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await window.electronAPI.createExpense({
                amount: parseFloat(newExpense.amount.replace(/\s+/g, '')),
                reason: newExpense.reason,
                requested_by: user.id,
                school_id: localStorage.getItem('impersonated_school_id') || user?.schoolId
            });
            
            // Notify FOUNDER
            await window.electronAPI.createNotification({
                school_id: localStorage.getItem('impersonated_school_id') || user?.schoolId,
                role: 'FOUNDER',
                message: `Une demande de ${newExpense.amount} FCFA a été soumise par l'Économe pour: ${newExpense.reason}. \n\nVeuillez vous rendre dans l'onglet "Gestion Financière > Décaissements" pour l'approuver ou la rejeter.`,
                type: 'FINANCE'
            });

            setNewExpense({ amount: '', reason: '' });
            showNotification("Demande de décaissement soumise pour validation.", "success");
            loadData();
        } catch (err: any) {
            console.error(err);
            showNotification("Erreur: " + err.message, "error");
        }
    }
  };

  const handleValidateExpense = async (expenseId: number, status: 'VALIDATED' | 'REJECTED') => {
    if (window.electronAPI) {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await window.electronAPI.updateExpenseStatus({
                expenseId,
                status,
                validatedBy: user.id
            });

            // Notify requester
            const exp = expenses.find(e => e.id === expenseId);
            if (exp) {
                await window.electronAPI.createNotification({
                    school_id: localStorage.getItem('impersonated_school_id') || user?.schoolId,
                    user_id: exp.requested_by,
                    message: `Votre demande de ${exp.amount} FCFA a été ${status === 'VALIDATED' ? 'approuvée' : 'rejetée'} par ${user.fullName}.`,
                    type: 'FINANCE'
                });
            }

            showNotification(status === 'VALIDATED' ? "Décaissement approuvé" : "Décaissement rejeté", "success");
            loadData();
        } catch (err: any) {
            console.error(err);
            showNotification("Erreur: " + err.message, "error");
        }
    }
  };

  const handleNotifyRetards = async (installmentId: number) => {
      setConfirmModal({
          title: "Envoyer les relances d'échéance",
          message: "Voulez-vous envoyer une notification d'échéance à tous les parents retardataires pour cette tranche ?",
          onConfirm: async () => {
              setIsNotifying(true);
              try {
                  if (window.electronAPI && user) {
                      const res = await window.electronAPI.notifyLateInstallments({
                          schoolId: localStorage.getItem('impersonated_school_id') || user?.schoolId,
                          installmentId,
                          senderId: user.id
                      });
                      if (res.success) {
                          showNotification(`${res.notifiedCount} notifications envoyées avec succès.`, "success");
                      } else {
                          showNotification(`Erreur: ${res.error}`, "error");
                      }
                  }
              } catch (err: any) {
                  showNotification(`Erreur: ${err.message}`, "error");
              }
              setIsNotifying(false);
          }
      });
  };

  const getStudentFinancials = (student: any, feeType: string = 'Scolarité') => {
      if (!student) return { totalDue: 0, totalPaid: 0, balance: 0, breakdown: { registration: 0, installments: [] }, overpaid: 0 };
      
      const activeSchool = schools.find(s => s.id.toString() === (localStorage.getItem('impersonated_school_id') || user?.schoolId)?.toString()) || schools[0] || {};
      
      let totalDue = 0;
      const isTuitionOrReg = feeType === 'Scolarité' || feeType === 'Inscription';

      if (isTuitionOrReg) {
          const classConfig = tuitionFees.find(f => f.classId === student.class_id);
          const scholarship = student.scholarship_reduction || 0;
          const totalPension = Math.max(0, (classConfig?.totalFee || 0) - scholarship);
          const totalReg = classConfig?.registrationFee || 0;
          totalDue = totalPension + totalReg;
      } else if (feeType === 'Transport') {
          const classConfig = tuitionFees.find(f => f.classId === student.class_id);
          totalDue = classConfig?.transportFee || 0;
      } else if (feeType === 'Examen') {
          const classConfig = tuitionFees.find(f => f.classId === student.class_id);
          totalDue = classConfig?.examFee || 0;
      }

      const studentPayments = payments.filter(p => p.student_id === student.id && (
          (isTuitionOrReg && (p.payment_type === 'Scolarité' || p.payment_type === 'Inscription' || !p.payment_type)) ||
          (!isTuitionOrReg && p.payment_type === feeType)
      ));
      const totalPaid = studentPayments.reduce((acc, p) => acc + p.amount, 0);
      let remaining = totalPaid;
      const breakdown: any = { registration: 0, installments: [] };

      if (feeType === 'Scolarité') {
          const classConfig = tuitionFees.find(f => f.classId === student.class_id);
          const totalReg = classConfig?.registrationFee || 0;
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
      }

      return { totalDue, totalPaid, balance: totalDue - totalPaid, breakdown, overpaid: remaining };
  };

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterClass, setFilterClass] = useState('ALL');
  const [filterFeeType, setFilterFeeType] = useState('Scolarité'); // Scolarité, Transport, Examen
  const [filterStatus, setFilterStatus] = useState('ALL'); // UP_TO_DATE, IN_ARREARS
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentFilterSection, setPaymentFilterSection] = useState('ALL');
  const [paymentFilterLevel, setPaymentFilterLevel] = useState('ALL');
  const [paymentFilterClass, setPaymentFilterClass] = useState('ALL');

  const handleSearch = async () => {
    if (window.electronAPI) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const results = await window.electronAPI.searchStudentsDetailed({
            name: searchQuery,
            schoolId: localStorage.getItem('impersonated_school_id') || user?.schoolId,
            section: filterSection,
            level: filterLevel,
            classId: filterClass
        });
        setSearchResults(results);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery, filterSection, filterLevel, filterClass, payments]);

  useEffect(() => {
    if (students.length > 0 && searchResults.length === 0 && !searchQuery && filterSection === 'ALL' && filterLevel === 'ALL' && filterClass === 'ALL') {
        setSearchResults(students);
    }
  }, [students]);

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
                {t('payment_history')}
            </button>
            <button
                onClick={() => setActiveTab('SPECIAL_FEES')}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'SPECIAL_FEES' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
            >
                {t('services')}
            </button>
            {(user?.role === 'SUPERADMIN' || user?.role === 'FOUNDER' || user?.role === 'BURSAR') && (
                <button
                    onClick={() => setActiveTab('EXPENSES')}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'EXPENSES' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                    {t('expenses')}
                </button>
            )}
        </div>
      </div>

      {activeTab === 'MANAGEMENT' && (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all group flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl group-hover:bg-indigo-500 transition-all">
                                <FileText className="text-indigo-500 group-hover:text-slate-950 w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Alertes</span>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Relance des Échéances</p>
                        <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-[10px] text-white outline-none mb-3" id="notify-installment-select">
                            {installments.map(inst => {
                                const dl = deadlines.find(d => d.installment_id === inst.id)?.deadline_date;
                                return <option key={inst.id} value={inst.id}>{inst.name} {dl ? `(${dl})` : ''}</option>;
                            })}
                        </select>
                    </div>
                    <button 
                        onClick={() => {
                            const val = (document.getElementById('notify-installment-select') as HTMLSelectElement)?.value;
                            if (val) handleNotifyRetards(parseInt(val));
                        }}
                        disabled={isNotifying || installments.length === 0}
                        className="w-full py-2 bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all disabled:opacity-50"
                    >
                        {isNotifying ? 'Envoi...' : 'Notifier Retardataires'}
                    </button>
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
                                    <td className="px-6 py-4 text-[10px] text-slate-500 font-black uppercase tracking-widest">{new Date(p.payment_date).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => {
                                                const s = students.find(stud => stud.id === p.student_id);
                                                const financials = getStudentFinancials(s || { id: p.student_id, class_id: p.class_id }, p.payment_type);
                                                const user = JSON.parse(localStorage.getItem('user') || '{}');
                                                const activeSchool = schools.find(sch => sch.id.toString() === (localStorage.getItem('impersonated_school_id') || user?.schoolId)?.toString()) || schools[0];
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
      )} 
      
      {activeTab === 'PAYMENTS' && (
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
                <div className="p-4 border-b border-white/5 bg-slate-900/50 space-y-4">
                    <div className="flex items-center gap-4">
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
                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    const filteredStudentsForPrint = students.filter(s => {
                                        if (filterSection !== 'ALL' && classes.find(c => c.id === s.class_id)?.section !== filterSection) return false;
                                        if (filterLevel !== 'ALL' && classes.find(c => c.id === s.class_id)?.level !== filterLevel) return false;
                                        if (filterClass !== 'ALL' && s.class_id.toString() !== filterClass) return false;
                                        const fin = getStudentFinancials(s, filterFeeType);
                                        if (filterStatus === 'UP_TO_DATE' && fin.balance > 0 && !s.has_moratoire) return false;
                                        if (filterStatus === 'IN_ARREARS' && (fin.balance <= 0 || s.has_moratoire)) return false;
                                        if (searchQuery && !`${s.first_name} ${s.last_name} ${s.matricule}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                                        return true;
                                    }).map(s => ({
                                        ...s, 
                                        className: classes.find(c => c.id === s.class_id)?.name || 'N/A',
                                        financials: getStudentFinancials(s, filterFeeType)
                                    }));
                                    
                                    const user = JSON.parse(localStorage.getItem('user') || '{}');
                                    const activeSchool = schools.find(sch => sch.id.toString() === (localStorage.getItem('impersonated_school_id') || user?.schoolId)?.toString()) || schools[0];
                                    
                                    // @ts-ignore
                                    import('../utils/reports').then(m => m.generateFinancialList(filteredStudentsForPrint, filterFeeType, filterStatus, activeSchool));
                                }}
                                className="p-3.5 bg-indigo-500/10 text-indigo-500 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all shadow-lg"
                                title="Imprimer la liste"
                            >
                                <Printer className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className={`p-3.5 rounded-2xl transition-colors ${showAdvancedFilters ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
                            >
                                <Filter className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {showAdvancedFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2">
                            <select
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                value={filterSection}
                                onChange={(e) => {
                                    setFilterSection(e.target.value);
                                    setFilterLevel('ALL');
                                    setFilterClass('ALL');
                                }}
                            >
                                <option value="ALL">Toutes les sections</option>
                                <option value="Francophone">Francophone</option>
                                <option value="Anglophone">Anglophone</option>
                            </select>

                            <select
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                value={filterLevel}
                                onChange={(e) => {
                                    setFilterLevel(e.target.value);
                                    setFilterClass('ALL');
                                }}
                                disabled={filterSection === 'ALL'}
                            >
                                <option value="ALL">Tous les cycles</option>
                                <option value="Maternelle">Maternelle</option>
                                <option value="Primaire">Primaire</option>
                            </select>

                            <select
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                value={filterClass}
                                onChange={(e) => setFilterClass(e.target.value)}
                                disabled={filterLevel === 'ALL'}
                            >
                                <option value="ALL">Toutes les salles</option>
                                {classes
                                    .filter(c => c.section === filterSection && c.level === filterLevel)
                                    .map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            
                            <select
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                value={filterFeeType}
                                onChange={(e) => setFilterFeeType(e.target.value)}
                            >
                                <option value="Scolarité">Frais Scolarité</option>
                                <option value="Transport">Frais Transport</option>
                                <option value="Examen">Frais Examen</option>
                            </select>
                            
                            <select
                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="ALL">Tous statuts</option>
                                <option value="UP_TO_DATE">À jour</option>
                                <option value="IN_ARREARS">Non à jour (Arriérés)</option>
                            </select>
                        </div>
                    )}
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
                            {searchResults.filter(s => {
                                const fin = getStudentFinancials(s, filterFeeType);
                                if (filterStatus === 'UP_TO_DATE' && fin.balance > 0 && !s.has_moratoire) return false;
                                if (filterStatus === 'IN_ARREARS' && (fin.balance <= 0 || s.has_moratoire)) return false;
                                return true;
                            }).map(s => {
                                const fin = getStudentFinancials(s, filterFeeType);
                                return (
                                    <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-black uppercase text-white text-sm tracking-tight">{s.last_name} {s.first_name}</div>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{classes.find(c => c.id === s.class_id)?.name || 'N/A'} • {s.matricule}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-black text-slate-400">{fin.totalDue.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-xs font-black text-emerald-500">{fin.totalPaid.toLocaleString()}</td>
                                        <td className={`px-6 py-4 text-sm font-black ${fin.balance > 0 && !s.has_moratoire ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            <div className="flex items-center gap-2">
                                                {fin.balance <= 0 ? t('paid_status') : `${fin.balance.toLocaleString()} FCFA`}
                                                {s.has_moratoire === 1 && fin.balance > 0 && <span className="bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold" title="Autorisé exceptionnellement">Moratoire</span>}
                                            </div>
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
              <div className="glass-card w-full max-w-lg max-h-[90vh] bg-slate-900 border-slate-800 shadow-2xl p-0 flex flex-col overflow-y-auto custom-scrollbar max-h-[90vh]">
                  <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50 flex-shrink-0">
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">{t('register_payment')}</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Saisie sécurisée des fonds</p>
                      </div>
                      <button type="button" onClick={() => setIsAddingPayment(false)} className="p-2 hover:bg-white/5 rounded-full transition-all"><Plus className="w-8 h-8 rotate-45 text-slate-500" /></button>
                  </div>
                  <form onSubmit={handleAddPayment} className="p-8 space-y-6 overflow-y-auto flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <select
                              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                              value={paymentFilterSection}
                              onChange={(e) => {
                                  setPaymentFilterSection(e.target.value);
                                  setPaymentFilterLevel('ALL');
                                  setPaymentFilterClass('ALL');
                              }}
                          >
                              <option value="ALL">Toutes les sections</option>
                              <option value="FRANCOPHONE">Francophone</option>
                              <option value="ANGLOPHONE">Anglophone</option>
                          </select>

                          <select
                              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                              value={paymentFilterLevel}
                              onChange={(e) => {
                                  setPaymentFilterLevel(e.target.value);
                                  setPaymentFilterClass('ALL');
                              }}
                              disabled={paymentFilterSection === 'ALL'}
                          >
                              <option value="ALL">Tous les cycles</option>
                              <option value="MATERNELLE">Maternelle</option>
                              <option value="PRIMAIRE">Primaire</option>
                          </select>

                          <select
                              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                              value={paymentFilterClass}
                              onChange={(e) => setPaymentFilterClass(e.target.value)}
                              disabled={paymentFilterLevel === 'ALL'}
                          >
                              <option value="ALL">Toutes les salles</option>
                              {classes
                                  .filter(c => (paymentFilterSection === 'ALL' || c.section === paymentFilterSection) && (paymentFilterLevel === 'ALL' || c.level === paymentFilterLevel))
                                  .map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                          </select>
                      </div>

                      <div className="space-y-2 relative">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                            <Users className="w-3 h-3 mr-2" /> {t('beneficiary_student')}
                          </label>
                          <input
                              type="text"
                              placeholder="Rechercher un élève (Nom, Matricule...)"
                              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner"
                              value={newPayment.studentId ? `${students.find(s => s.id.toString() === newPayment.studentId)?.last_name} ${students.find(s => s.id.toString() === newPayment.studentId)?.first_name}` : paymentSearchQuery}
                              onChange={(e) => {
                                  setPaymentSearchQuery(e.target.value);
                                  if (newPayment.studentId) {
                                      setNewPayment({...newPayment, studentId: ''});
                                  }
                              }}
                          />
                          {!newPayment.studentId && paymentSearchQuery && (
                              <div className="absolute z-10 w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-48 overflow-y-auto mt-2">
                                  {students.filter(s => {
                                      if (paymentFilterClass !== 'ALL' && s.class_id?.toString() !== paymentFilterClass) return false;
                                      const c = classes.find(cl => cl.id === s.class_id);
                                      if (paymentFilterLevel !== 'ALL' && (!c || c.level !== paymentFilterLevel)) return false;
                                      if (paymentFilterSection !== 'ALL' && (!c || c.section !== paymentFilterSection)) return false;
                                      
                                      if (paymentSearchQuery) {
                                          const q = paymentSearchQuery.toLowerCase();
                                          return (s.first_name?.toLowerCase() || '').includes(q) || 
                                                 (s.last_name?.toLowerCase() || '').includes(q) || 
                                                 (s.matricule?.toLowerCase() || '').includes(q);
                                      }
                                      return true;
                                  }).slice(0, 10).map(s => (
                                      <div 
                                          key={s.id} 
                                          className="p-3 hover:bg-white/5 cursor-pointer flex justify-between items-center transition-colors border-b border-white/5 last:border-0"
                                          onClick={() => {
                                              setNewPayment({...newPayment, studentId: s.id.toString()});
                                              setPaymentSearchQuery('');
                                          }}
                                      >
                                          <div>
                                              <p className="text-white font-bold text-sm">{s.last_name} {s.first_name}</p>
                                              <p className="text-[10px] text-slate-500 font-bold uppercase">{s.matricule} • {classes.find(c => c.id === s.class_id)?.name}</p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {newPayment.studentId && (() => {
                          const selectedStudent = students.find(s => s.id.toString() === newPayment.studentId);
                          const finScol = getStudentFinancials(selectedStudent, 'Scolarité');
                          const classConfig = tuitionFees.find(f => f.classId === selectedStudent?.class_id);
                          const hasTransportFee = (classConfig?.transportFee || 0) > 0;
                          const hasExamFee = (classConfig?.examFee || 0) > 0;
                          return (
                          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl animate-in fade-in duration-300 relative">
                              <button
                                  type="button"
                                  onClick={() => setNewPayment({...newPayment, studentId: ''})}
                                  className="absolute top-2 right-2 p-1.5 bg-slate-900 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              >
                                  <Plus className="w-4 h-4 rotate-45" />
                              </button>
                              <div className="flex justify-between items-center mb-2 pr-8">
                                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">État du Compte (Scolarité)</span>
                                  <span className="text-sm font-black text-white">{finScol.balance.toLocaleString()} FCFA Restant</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500"
                                    style={{ width: `${finScol.totalDue > 0 ? (finScol.totalPaid / finScol.totalDue) * 100 : 0}%` }}
                                  />
                              </div>
                              {(hasTransportFee || hasExamFee) && (
                                  <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
                                      {hasTransportFee && (
                                          <label className="flex items-center gap-3 cursor-pointer group/cb">
                                              <input
                                                  type="checkbox"
                                                  checked={newPayment.includeTransport}
                                                  onChange={(e) => setNewPayment({...newPayment, includeTransport: e.target.checked})}
                                                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                                              />
                                              <div>
                                                  <span className="text-xs font-black text-white group-hover/cb:text-amber-500 transition-colors">Inclure Transport</span>
                                                  <span className="text-[10px] text-slate-500 ml-2">({classConfig?.transportFee?.toLocaleString()} FCFA)</span>
                                              </div>
                                          </label>
                                      )}
                                      {hasExamFee && (
                                          <label className="flex items-center gap-3 cursor-pointer group/cb">
                                              <input
                                                  type="checkbox"
                                                  checked={newPayment.includeExam}
                                                  onChange={(e) => setNewPayment({...newPayment, includeExam: e.target.checked})}
                                                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                                              />
                                              <div>
                                                  <span className="text-xs font-black text-white group-hover/cb:text-amber-500 transition-colors">Inclure Examen</span>
                                                  <span className="text-[10px] text-slate-500 ml-2">({classConfig?.examFee?.toLocaleString()} FCFA)</span>
                                              </div>
                                          </label>
                                      )}
                                  </div>
                              )}
                          </div>
                          );
                      })()}

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                            <Wallet className="w-3 h-3 mr-2" /> {t('amount_to_pay')}
                        </label>
                        <div className="relative">
                            <input
                                required
                                type="number"
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-6 pr-20 text-white font-black text-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={newPayment.amount}
                                onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                                placeholder="0"
                            />
                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-slate-600 uppercase tracking-widest">FCFA</span>
                        </div>
                        <p className="text-[10px] text-slate-600 font-bold mt-1 leading-relaxed">
                            Le montant sera ventilé automatiquement : Inscription &rarr; Transport &rarr; Examen &rarr; Tranches de pension
                        </p>
                      </div>

                      <div className="space-y-2 pt-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                              <User className="w-3 h-3 mr-2" /> NOM DU DÉPOSANT / PAYEUR <span className="text-rose-500 ml-1">*</span>
                          </label>
                          <input
                              required
                              type="text"
                              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                              value={newPayment.depositorName}
                              onChange={(e) => setNewPayment({...newPayment, depositorName: e.target.value.toUpperCase()})}
                              placeholder="Ex: TCHATCHOUANG PAUL"
                          />
                      </div>


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

      {activeTab === 'EXPENSES' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-black text-white flex items-center tracking-tight">
                <Wallet className="w-6 h-6 mr-3 text-rose-500" />
                HISTORIQUE DES DÉCAISSEMENTS
              </h2>
              <div className="space-y-4">
                {expenses.map((exp) => (
                  <div key={exp.id} className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:bg-white/[0.02] transition-colors border-l-4" style={{ borderColor: exp.status === 'VALIDATED' ? '#10b981' : exp.status === 'REJECTED' ? '#f43f5e' : '#f59e0b' }}>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-white">{exp.amount.toLocaleString()} FCFA</h3>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${exp.status === 'VALIDATED' ? 'bg-emerald-500/10 text-emerald-500' : exp.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {exp.status === 'PENDING' ? 'EN ATTENTE' : exp.status === 'VALIDATED' ? 'APPROUVÉ' : 'REJETÉ'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-300">{exp.reason}</p>
                      <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">
                        <span>Demandé par: <span className="text-amber-500">{exp.requester_name}</span></span>
                        <span>Le: {new Date(exp.created_at).toLocaleString('fr-FR')}</span>
                      </div>
                      {exp.validator_name && (
                         <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">
                           Traité par: <span className={exp.status === 'VALIDATED' ? 'text-emerald-500' : 'text-rose-500'}>{exp.validator_name}</span>
                         </div>
                      )}
                    </div>
                    {(user?.role === 'SUPERADMIN' || user?.role === 'FOUNDER') && exp.status === 'PENDING' && (
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <button onClick={() => handleValidateExpense(exp.id, 'VALIDATED')} className="flex-1 md:flex-none px-4 py-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                          Approuver
                        </button>
                        <button onClick={() => handleValidateExpense(exp.id, 'REJECTED')} className="flex-1 md:flex-none px-4 py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                          Rejeter
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {expenses.length === 0 && (
                  <div className="p-8 text-center text-slate-500 italic text-sm">
                    Aucune demande de décaissement enregistrée.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-black text-white flex items-center tracking-tight">
                <Plus className="w-6 h-6 mr-3 text-amber-500" />
                NOUVELLE DEMANDE
              </h2>
              <form onSubmit={handleAddExpense} className="glass-card p-6 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                    <Wallet className="w-3 h-3 mr-2" /> Montant (FCFA)
                  </label>
                  <input
                    required
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-black text-xl outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                    <FileText className="w-3 h-3 mr-2" /> Motif de la dépense
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newExpense.reason}
                    onChange={(e) => setNewExpense({...newExpense, reason: e.target.value})}
                    placeholder="Ex: Achat de fournitures, Paiement prestataire..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                  />
                </div>

                <button type="submit" className="w-full py-4 bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20">
                  Soumettre au Fondateur
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'SPECIAL_FEES' && (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 grid-cols-1 gap-8">
                {/* Transport Section */}
                <div className="glass-card overflow-hidden border-none shadow-2xl">
                    <div className="p-6 border-b border-white/5 bg-indigo-500/10">
                        <h2 className="text-xl font-black text-indigo-400 uppercase tracking-tight flex items-center italic">
                            <Clock className="w-5 h-5 mr-3" />
                            Abonnés Transport
                        </h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">
                            {(() => {
                                const relevant = payments.filter(p => p.payment_type === 'Transport' && p.amount > 0);
                                const ids = [...new Set(relevant.map(p => p.student_id))];
                                return ids.length;
                            })()} Élèves Inscrits
                        </p>
                    </div>
                    <div className="divide-y divide-white/5 bg-slate-950/40">
                        {(() => {
                            const relevant = payments.filter(p => p.payment_type === 'Transport' && p.amount > 0);
                            const ids = [...new Set(relevant.map(p => p.student_id))];
                            const list = ids.map(id => students.find(s => s.id === id)).filter(Boolean);
                            if (list.length === 0) {
                                return <div className="p-8 text-center text-slate-500 font-black text-xs uppercase tracking-widest">Aucun abonnement</div>;
                            }
                            return list.map(s => {
                                const c = classes.find(c => c.id === s.class_id);
                                return (
                                    <div key={s.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-all">
                                        <div>
                                            <p className="text-sm font-black text-white uppercase">{s.last_name} {s.first_name}</p>
                                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{c?.name}</p>
                                        </div>
                                        <div className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-xl">Payé</div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* Exam Section */}
                <div className="glass-card overflow-hidden border-none shadow-2xl">
                    <div className="p-6 border-b border-white/5 bg-rose-500/10">
                        <h2 className="text-xl font-black text-rose-400 uppercase tracking-tight flex items-center italic">
                            <FileText className="w-5 h-5 mr-3" />
                            Candidats Examens
                        </h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">
                            {(() => {
                                const candidates = students.filter(s => {
                                    const c = classes.find(cl => cl.id === s.class_id);
                                    if (!c) return false;
                                    const name = c.name.toUpperCase().replace(/\s+/g, '');
                                    return name.includes('CM2') || name.includes('CLASS6');
                                });
                                return candidates.length;
                            })()} Élèves Inscrits
                        </p>
                    </div>
                    <div className="divide-y divide-white/5 bg-slate-950/40 max-h-64 overflow-y-auto">
                        {(() => {
                            const candidates = students.filter(s => {
                                const c = classes.find(cl => cl.id === s.class_id);
                                if (!c) return false;
                                const name = c.name.toUpperCase().replace(/\s+/g, '');
                                return name.includes('CM2') || name.includes('CLASS6');
                            }).sort((a, b) => a.last_name.localeCompare(b.last_name));
                            
                            if (candidates.length === 0) {
                                return <div className="p-8 text-center text-slate-500 font-black text-xs uppercase tracking-widest">Aucun candidat</div>;
                            }
                            return candidates.map(s => {
                                const c = classes.find(c => c.id === s.class_id);
                                const hasPaid = payments.some(p => p.student_id === s.id && p.payment_type === 'Examen' && p.amount > 0);
                                return (
                                    <div key={s.id} className="p-4 flex justify-between items-center hover:bg-white/5 transition-all">
                                        <div>
                                            <p className="text-sm font-black text-white uppercase">{s.last_name} {s.first_name}</p>
                                            <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">{c?.name}</p>
                                        </div>
                                        {hasPaid ? (
                                            <div className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-xl">Payé</div>
                                        ) : (
                                            <div className="text-xs font-black text-rose-500 bg-rose-500/10 px-3 py-1 rounded-xl">Non Payé</div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>
        </div>
      )}
      {confirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white italic">{confirmModal.title}</h3>
              <p className="text-slate-400 text-sm font-semibold">{confirmModal.message}</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-black uppercase tracking-widest border border-white/5"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all text-xs font-black uppercase tracking-widest"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
