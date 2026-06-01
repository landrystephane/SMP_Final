import React, { useState, useEffect } from 'react';
import { 
    User, Bell, ClipboardList, MapPin, Bus, Activity, Info, 
    AlertTriangle, ShieldCheck, Sparkles, Download, CreditCard, 
    Printer, CheckCircle, TrendingUp, Coins, Calendar 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const ParentPortal: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [children, setChildren] = useState<any[]>([]);
    const [selectedChild, setSelectedChild] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [selectedTerm, setSelectedTerm] = useState<number>(1);
    const [isBusMapOpen, setIsBusMapOpen] = useState(false);

    // Financial metadata
    const [tuitionFees, setTuitionFees] = useState<any[]>([]);
    const [installments, setInstallments] = useState<any[]>([]);
    const [classInstallmentFees, setClassInstallmentFees] = useState<any[]>([]);
    const [schools, setSchools] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        if (window.electronAPI && user) {
            let studs: any[] = [];
            if (user.role === 'PARENT') {
                studs = await window.electronAPI.getParentStudents(user.username);
                setChildren(studs);

                const tf = await window.electronAPI.getTuitionFees(user.schoolId);
                const insts = await window.electronAPI.getInstallments();
                const cif = await window.electronAPI.getClassInstallmentFees(user.schoolId);
                const schs = await window.electronAPI.getSchools();
                const cls = await window.electronAPI.getClasses(user.schoolId);

                setTuitionFees(tf || []);
                setInstallments(insts || []);
                setClassInstallmentFees(cif || []);
                setSchools(schs || []);
                setClasses(cls || []);

                if (studs.length > 0) {
                    setSelectedChild(studs[0]);
                    const details = await window.electronAPI.getStudentDetails(studs[0].id);
                    setStats(details);
                }
            } else {
                // Mock data for admin/founder preview
                const mockStuds = [
                    { id: 101, first_name: 'Junior', last_name: 'DEMO', matricule: '26SIL0001', neighborhood: 'Bastos', has_transport: 1, class_id: 1, scholarship_reduction: 15000, has_moratoire: 1 },
                    { id: 102, first_name: 'Aline', last_name: 'DEMO', matricule: '26CP0002', neighborhood: 'Bastos', has_transport: 0, class_id: 1, scholarship_reduction: 0, has_moratoire: 0 }
                ];
                setChildren(mockStuds);
                setSelectedChild(mockStuds[0]);
                setStats({ 
                    grades: [
                        { score: 15.5, term: 1, validated: 1, subjectName: 'Mathématiques', coefficient: 2 },
                        { score: 14, term: 1, validated: 1, subjectName: 'Français', coefficient: 3 }
                    ],
                    payments: [
                        { id: 1, receipt_number: 'RCP-DEMO-001', amount: 50000, payment_type: 'Scolarité', payment_date: new Date().toISOString(), student_id: 101, class_id: 1, last_name: 'DEMO', first_name: 'Junior' }
                    ],
                    attendance: []
                });
            }
        } else {
             // Browser mock fallback
             const mockStuds = [
                 { id: 101, first_name: 'Junior', last_name: 'DEMO', matricule: '26SIL0001', neighborhood: 'Bastos', has_transport: 1, class_id: 1, scholarship_reduction: 15000, has_moratoire: 1 },
                 { id: 102, first_name: 'Aline', last_name: 'DEMO', matricule: '26CP0002', neighborhood: 'Bastos', has_transport: 0, class_id: 1, scholarship_reduction: 0, has_moratoire: 0 }
             ];
             setChildren(mockStuds);
             setSelectedChild(mockStuds[0]);
             setStats({ 
                 grades: [
                     { score: 15.5, term: 1, validated: 1, subjectName: 'Mathématiques', coefficient: 2 },
                     { score: 14, term: 1, validated: 1, subjectName: 'Français', coefficient: 3 }
                 ],
                 payments: [
                     { id: 1, receipt_number: 'RCP-DEMO-001', amount: 50000, payment_type: 'Scolarité', payment_date: new Date().toISOString(), student_id: 101, class_id: 1, last_name: 'DEMO', first_name: 'Junior' }
                 ],
                 attendance: []
             });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const handleChildSelect = async (child: any) => {
        setSelectedChild(child);
        setLoading(true);
        try {
            if (window.electronAPI) {
                const details = await window.electronAPI.getStudentDetails(child.id);
                setStats(details);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getStudentFinancials = (student: any) => {
        if (!student) return { totalDue: 0, totalPaid: 0, balance: 0, breakdown: { registration: 0, installments: [] }, overpaid: 0 };
        const classConfig = tuitionFees.find(f => f.classId === student.class_id);
        const scholarship = student.scholarship_reduction || 0;
        const totalPension = Math.max(0, (classConfig?.totalFee || 0) - scholarship);
        const totalReg = classConfig?.registrationFee || 0;
        const totalDue = totalPension + totalReg;

        const studentPayments = (stats?.payments || []).filter((p: any) => p.payment_type === 'Scolarité');
        const totalPaid = studentPayments.reduce((acc: number, p: any) => acc + p.amount, 0);

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

    const handlePrintReceipt = async (payment: any) => {
        try {
            const financials = getStudentFinancials(selectedChild);
            const activeSchool = schools.find(sch => sch.id === user?.schoolId) || schools[0] || { name: 'Eco-Manage' };
            const { generatePaymentReceipt } = await import('../utils/reports');
            generatePaymentReceipt(payment, selectedChild, financials, activeSchool);
        } catch (e: any) {
            alert(`Erreur d'impression: ${e.message}`);
        }
    };

    const printStudentReport = async () => {
        if (!selectedChild || !stats) return;
        try {
            if (window.electronAPI) {
                const allSchools = schools.length > 0 ? schools : await window.electronAPI.getSchools();
                const school = allSchools.find((s: any) => s.id === selectedChild.school_id) || allSchools[0];
                const allClasses = classes.length > 0 ? classes : await window.electronAPI.getClasses();
                const classObj = allClasses.find(c => c.id === selectedChild.class_id);

                // Fetch all students in this class
                const allStudents = await window.electronAPI.getStudents(user?.schoolId);
                const classStudents = allStudents.filter((s: any) => s.class_id === selectedChild.class_id);

                // Calculate averages for all students in the class based on validated grades
                const studentsWithAverages = await Promise.all(classStudents.map(async (s: any) => {
                    const details = await window.electronAPI.getStudentDetails(s.id);
                    const validatedGrades = details.grades.filter((g: any) => g.term === selectedTerm && g.validated === 1);
                    const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
                    const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
                    const avg = totalCoef > 0 ? (totalPoints / totalCoef) : 0;
                    return { id: s.id, avg, details };
                }));

                // Sort descending by average
                studentsWithAverages.sort((a, b) => b.avg - a.avg);

                // Find student rank
                const rankIndex = studentsWithAverages.findIndex(s => s.id === selectedChild.id);
                const rank = rankIndex !== -1 ? rankIndex + 1 : undefined;
                const totalStudents = studentsWithAverages.length;

                const studentData = studentsWithAverages.find(s => s.id === selectedChild.id);
                if (studentData) {
                    let template = null;
                    if (window.electronAPI && school.id) {
                        template = await window.electronAPI.getReportTemplate(school.id);
                    }
                    const { generateReportCard } = await import('../utils/reports');
                    generateReportCard({
                        student: selectedChild,
                        classObj,
                        school,
                        template,
                        grades: studentData.details.grades.filter((g: any) => g.term === selectedTerm),
                        attendance: studentData.details.attendance,
                        term: selectedTerm,
                        rank,
                        totalStudents
                    });
                } else {
                    alert("Une erreur est survenue lors du calcul du rang.");
                }
            } else {
                // Fallback for demo
                const { generateReportCard } = await import('../utils/reports');
                generateReportCard({
                    student: selectedChild,
                    classObj: { name: 'Classe Démo', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                    school: { name: 'École Démo' },
                    grades: stats.grades,
                    attendance: [],
                    term: selectedTerm,
                    rank: 1,
                    totalStudents: 15
                });
            }
        } catch (e: any) {
            alert(`Erreur d'impression du bulletin: ${e.message}`);
        }
    };

    if (loading && children.length === 0) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
            <Activity className="w-12 h-12 text-amber-500 animate-pulse" />
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Initialisation du Portail Parent...</p>
        </div>
    );

    if (children.length === 0) return (
        <div className="p-20 text-center space-y-6">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-white/5">
                <User className="w-10 h-10 text-slate-700" />
            </div>
            <h2 className="text-xl font-black text-white uppercase italic">Aucun élève associé</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-xs mx-auto">
                Le compte parent est configuré automatiquement à l'enregistrement de l'élève. Veuillez vous assurer que le numéro de téléphone saisi correspond parfaitement.
            </p>
        </div>
    );

    if (!selectedChild) return null;

    const financials = getStudentFinancials(selectedChild);
    const termGrades = stats?.grades?.filter((g: any) => g.term === selectedTerm) || [];
    const validatedGrades = termGrades.filter((g: any) => g.validated === 1);
    const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
    const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
    const average = totalCoef > 0 ? totalPoints / totalCoef : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {user?.role !== 'PARENT' && (
                <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-6 py-4 rounded-2xl flex items-center shadow-lg">
                    <AlertTriangle className="w-6 h-6 mr-4 flex-shrink-0" />
                    <div>
                        <h4 className="font-black uppercase tracking-tight text-sm">Mode Aperçu (Démo)</h4>
                        <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">Vous visualisez l'interface telle qu'elle apparaîtra aux parents, avec des données fictives.</p>
                    </div>
                </div>
            )}
            <div className="bg-slate-900/50 p-8 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center space-x-5">
                        <div className="w-20 h-20 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg relative">
                            <User className="w-10 h-10" />
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-1 rounded-full border-2 border-slate-950">
                                <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Espace Parent Sécurisé
                                </span>
                            </div>
                            <h1 className="text-3xl font-black text-white uppercase tracking-tight mt-2">
                                Parent de {selectedChild.first_name} {selectedChild.last_name}
                            </h1>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Matricule : <span className="text-slate-300">{selectedChild.matricule}</span>
                            </p>
                        </div>
                    </div>

                    {/* Children switcher tabs */}
                    {children.length > 1 && (
                        <div className="bg-slate-950 p-2 rounded-2xl border border-white/5 flex gap-2 w-full md:w-auto overflow-x-auto">
                            {children.map((child) => (
                                <button
                                    key={child.id}
                                    onClick={() => handleChildSelect(child)}
                                    className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                                        selectedChild.id === child.id
                                            ? 'bg-amber-500 text-slate-950 shadow-lg'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {child.first_name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="h-[30vh] flex flex-col items-center justify-center space-y-4">
                    <Activity className="w-10 h-10 text-amber-500 animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Performance / Bulletins */}
                    <div className="glass-card p-8 space-y-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-amber-500">
                                <Activity className="w-6 h-6" />
                                <h2 className="text-xl font-black uppercase text-white tracking-tight">Performances & Notes</h2>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <select 
                                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                                    value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
                                >
                                    <option value={1}>Trimestre 1</option>
                                    <option value={2}>Trimestre 2</option>
                                    <option value={3}>Trimestre 3</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Moyenne Générale Trimestrielle</p>
                                <p className="text-4xl font-black text-emerald-500 mt-1">
                                    {validatedGrades.length > 0 ? average.toFixed(2) : '--'}
                                    <span className="text-xs text-slate-600"> / 20</span>
                                </p>
                                <p className="text-[10px] text-slate-500 mt-1 font-bold">
                                    ({validatedGrades.length} matières validées sur le bulletin)
                                </p>
                            </div>
                            
                            <button 
                                onClick={printStudentReport}
                                className="w-full py-4 bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center justify-center shadow-lg active:scale-95"
                            >
                                <ClipboardList className="w-4 h-4 mr-2" /> BULLETIN DE NOTES (PDF)
                            </button>
                        </div>
                    </div>

                    {/* Financial tracking */}
                    <div className="glass-card p-8 space-y-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px]">
                        <div className="flex items-center space-x-3 text-amber-500">
                            <Coins className="w-6 h-6" />
                            <h2 className="text-xl font-black uppercase text-white tracking-tight">Suivi Financier</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-slate-950 rounded-xl border border-white/5 text-center">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tight">Scolarité Dûe</p>
                                    <p className="text-xs font-black text-white mt-1">{financials.totalDue.toLocaleString()} <span className="text-[8px] text-slate-500">F</span></p>
                                </div>
                                <div className="p-3 bg-slate-950 rounded-xl border border-white/5 text-center">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tight">Total Payé</p>
                                    <p className="text-xs font-black text-emerald-500 mt-1">{financials.totalPaid.toLocaleString()} <span className="text-[8px] text-slate-500">F</span></p>
                                </div>
                                <div className="p-3 bg-slate-950 rounded-xl border border-white/5 text-center">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tight">Reste à payer</p>
                                    <p className={`text-xs font-black mt-1 ${financials.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{financials.balance.toLocaleString()} <span className="text-[8px] text-slate-500">F</span></p>
                                </div>
                            </div>

                            {selectedChild.has_moratoire === 1 && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center space-x-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                    <div>
                                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Moratoire Accordé</p>
                                        <p className="text-[10px] text-slate-300 font-bold leading-normal mt-0.5">Cet élève bénéficie d'une autorisation spéciale d'échelonnement de paiement.</p>
                                    </div>
                                </div>
                            )}

                            {/* Paid installment summary */}
                            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 space-y-3">
                                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Résumé des Tranches</h3>
                                <div className="space-y-2">
                                    {financials.breakdown.installments.map((inst: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-xs font-bold">
                                            <span className="text-slate-400 uppercase tracking-wider">{inst.name}</span>
                                            <span className={inst.paid >= inst.amountDue ? "text-emerald-500" : inst.paid > 0 ? "text-amber-500" : "text-slate-600"}>
                                                {inst.paid >= inst.amountDue ? "Payée" : inst.paid > 0 ? `Partiel (${inst.paid.toLocaleString()} F)` : "Non payée"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payments list / Invoice receipt reprints */}
                    <div className="glass-card p-8 space-y-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] md:col-span-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 text-amber-500">
                                <CreditCard className="w-6 h-6" />
                                <h2 className="text-xl font-black uppercase text-white tracking-tight">Journal des Versements (Reçus)</h2>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                        <th className="px-6 py-4">Reçu N°</th>
                                        <th className="px-6 py-4">Montant</th>
                                        <th className="px-6 py-4">Motif</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {stats?.payments && stats.payments.length > 0 ? (
                                        stats.payments.map((p: any) => (
                                            <tr key={p.id} className="hover:bg-white/5 transition-colors text-xs font-bold">
                                                <td className="px-6 py-4 font-mono text-amber-500">#{p.receipt_number}</td>
                                                <td className="px-6 py-4 text-white">{p.amount.toLocaleString()} FCFA</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-500/20">{p.payment_type}</span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{new Date(p.payment_date).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR')}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => handlePrintReceipt(p)}
                                                        className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-amber-500 hover:text-slate-950 border border-white/10 rounded-xl transition-all"
                                                        title="Télécharger le reçu"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest">
                                                Aucun versement enregistré.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Transport Option (has_transport checks) */}
                    <div className="glass-card p-8 space-y-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] md:col-span-2">
                        <div className="flex items-center space-x-3 text-amber-500">
                            <Bus className="w-6 h-6" />
                            <h2 className="text-xl font-black uppercase text-white tracking-tight">Suivi Transport Scolaire</h2>
                        </div>

                        {selectedChild.has_transport === 1 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 space-y-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quartier de dépose</p>
                                            <p className="text-sm font-black text-white mt-1">{selectedChild.neighborhood || 'Bastos'}</p>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsBusMapOpen(true)}
                                    className="py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all flex items-center justify-center"
                                >
                                    <MapPin className="w-4 h-4 mr-2" /> CARTE DU BUS EN DIRECT
                                </button>
                            </div>
                        ) : (
                            <div className="p-6 bg-rose-500/5 rounded-2xl border border-rose-500/10 space-y-4">
                                <div className="flex items-start space-x-3 text-rose-400">
                                    <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider">Abonnement Transport Inactif</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-relaxed">
                                            Cet élève n'a pas encore souscrit au forfait transport pour ce trimestre ou le versement n'a pas encore été validé par l'économe.
                                        </p>
                                    </div>
                                </div>
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider border-t border-white/5 pt-3">
                                    💡 Dès validation du paiement transport par la comptabilité, le suivi GPS s'activera instantanément.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* School communication feed */}
            <div className="glass-card p-6 border-l-4 border-l-amber-500 bg-amber-500/5 rounded-2xl flex items-center space-x-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Note administrative</span>
                    <p className="text-xs text-slate-300 font-bold mt-0.5">La réunion parents-enseignants trimestrielle aura lieu ce Samedi à 10H précises.</p>
                </div>
            </div>

            {/* Bus GPS Map Modal */}
            {isBusMapOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl p-6 glass-card border border-white/10 rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-300 bg-slate-950">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Suivi GPS Temps Réel</h3>
                                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-0.5 animate-pulse flex items-center gap-1">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span> Connexion satellite active
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsBusMapOpen(false)}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
                            >
                                Fermer
                            </button>
                        </div>

                        {/* Interactive Bus Map Frame */}
                        <div className="w-full h-80 rounded-2xl bg-slate-900 border border-white/5 relative overflow-hidden flex flex-col items-center justify-center">
                            {/* Grid overlay for tech look */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
                            
                            {/* Map lines & stops representation */}
                            <svg className="w-full h-full absolute inset-0 p-8" viewBox="0 0 500 300">
                                {/* Route path */}
                                <path d="M 50 150 Q 150 50 250 150 T 450 150" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="6,4" className="opacity-50" />
                                
                                {/* Stops */}
                                <circle cx="50" cy="150" r="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                                <text x="50" y="175" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">Départ École</text>
                                
                                <circle cx="210" cy="115" r="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                                <text x="210" y="95" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">Arrêt Omnisports</text>

                                <circle cx="330" cy="170" r="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                                <text x="330" y="195" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">Votre Domicile ({selectedChild.neighborhood || 'Bastos'})</text>
                                
                                {/* Bus indicator (animated along the path) */}
                                <g transform="translate(180, 110)">
                                    <circle r="12" fill="#10b981" className="animate-ping opacity-75" />
                                    <circle r="7" fill="#10b981" />
                                    <path d="M-3,-3 L3,-3 L0,3 Z" fill="white" />
                                </g>
                            </svg>
                            
                            {/* Live floating stats */}
                            <div className="absolute top-4 left-4 bg-slate-950/80 border border-white/10 p-3 rounded-xl backdrop-blur-md">
                                <span className="text-[9px] text-slate-500 font-black uppercase block">Vitesse</span>
                                <span className="text-white font-black text-sm">48 km/h</span>
                            </div>
                            <div className="absolute top-4 right-4 bg-slate-950/80 border border-white/10 p-3 rounded-xl backdrop-blur-md">
                                <span className="text-[9px] text-slate-500 font-black uppercase block">Arrivée estimée</span>
                                <span className="text-amber-500 font-black text-sm">12 Mins</span>
                            </div>
                        </div>

                        {/* Driver & vehicle card */}
                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <span className="text-[9px] text-slate-500 font-black uppercase block">Conducteur principal</span>
                                <span className="text-white font-black text-sm mt-0.5 block">M. Landry Stephane</span>
                                <span className="text-slate-400 text-xs mt-0.5 block">+237 677 88 99 00</span>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <span className="text-[9px] text-slate-500 font-black uppercase block">Véhicule assigné</span>
                                <span className="text-white font-black text-sm mt-0.5 block">Toyota Coaster</span>
                                <span className="text-slate-400 text-xs mt-0.5 block">N° Immat: CE 432-BD</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentPortal;
