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
    const [accessBlocked, setAccessBlocked] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [termStructure, setTermStructure] = useState<any[]>([]);
    const [selectedTerm, setSelectedTerm] = useState<number | ''>('');
    const [isBusMapOpen, setIsBusMapOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('home');

    // Financial metadata
    const [tuitionFees, setTuitionFees] = useState<any[]>([]);
    const [installments, setInstallments] = useState<any[]>([]);
    const [classInstallmentFees, setClassInstallmentFees] = useState<any[]>([]);
    const [installmentDeadlines, setInstallmentDeadlines] = useState<any[]>([]);
    const [schools, setSchools] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketMessage, setTicketMessage] = useState('');
    const [ticketReceiver, setTicketReceiver] = useState('');
    // Timetable
    const [schedules, setSchedules] = useState<any[]>([]);
    const [evaluationSchedules, setEvaluationSchedules] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    // Absence justification
    const [justifyingAbsence, setJustifyingAbsence] = useState<any | null>(null);
    const [justifyMessage, setJustifyMessage] = useState('');
    const [justifyAttachment, setJustifyAttachment] = useState<string | null>(null);
    const [isSubmittingJustif, setIsSubmittingJustif] = useState(false);

    const loadData = async () => {
        setLoading(true);
        if (window.electronAPI && user) {
            let studs: any[] = [];
            if (user.role === 'PARENT') {
                const raw = await window.electronAPI.getParentStudents(user.username);
                // Backend returns { students, blockedCount } — handle both old array shape and new object shape
                if (Array.isArray(raw)) {
                    studs = raw;
                } else {
                    studs = raw?.students || [];
                    if (studs.length === 0 && (raw?.blockedCount || 0) > 0) {
                        setAccessBlocked(true);
                    }
                }
                setChildren(studs);

                const tf = await window.electronAPI.getTuitionFees(user.schoolId);
                const insts = await window.electronAPI.getInstallments();
                const cif = await window.electronAPI.getClassInstallmentFees(user.schoolId);
                const dls = await (window.electronAPI as any).getInstallmentDeadlines(user.schoolId);
                const schs = await window.electronAPI.getSchools();
                const cls = await window.electronAPI.getClasses(user.schoolId);
                const usrs = await window.electronAPI.getUsers(user.schoolId);
                const msgs = await window.electronAPI.getParentMessages ? await window.electronAPI.getParentMessages({ schoolId: user.schoolId, userId: user.id }) : [];
                const scheds = await window.electronAPI.getSchedules(user.schoolId);
                const evalScheds = await (window.electronAPI as any).getEvaluationSchedules(user.schoolId);
                const subs = await window.electronAPI.getSchoolSubjects(user.schoolId);

                setTuitionFees(tf || []);
                setInstallments(insts || []);
                setClassInstallmentFees(cif || []);
                setInstallmentDeadlines(dls || []);
                setSchools(schs || []);
                setClasses(cls || []);
                setUsers(usrs || []);
                setAnnouncements(msgs || []);
                setSchedules(scheds || []);
                setEvaluationSchedules(evalScheds || []);
                setSubjects(subs || []);

                const mySchool = schs.find((s: any) => s.id?.toString() === user.schoolId?.toString()) || schs[0];
                if (mySchool && mySchool.term_structure) {
                    try {
                        const ts = JSON.parse(mySchool.term_structure);
                        setTermStructure(ts);
                        if (ts.length > 0) setSelectedTerm(ts[0].term_id);
                    } catch(e) {
                        setTermStructure([]);
                    }
                } else {
                    setTermStructure([]);
                }

                if (studs.length > 0) {
                    setSelectedChild(studs[0]);
                    const details = await window.electronAPI.getStudentDetails(studs[0].id);
                    setStats(details);
                    if (studs[0].class_id && (window.electronAPI as any).getWeekSchedule) {
                        const now = new Date();
                        const dow = now.getDay() || 7;
                        const mon = new Date(now); mon.setDate(now.getDate() - dow + 1); mon.setHours(0,0,0,0);
                        const weekStart = mon.toISOString().split('T')[0];
                        const wr = await (window.electronAPI as any).getWeekSchedule({ schoolId: user.schoolId, classId: studs[0].class_id, weekStart });
                        setSchedules(prev => [...prev.filter((s: any) => s.class_id !== studs[0].class_id), ...(wr.schedules || [])]);
                    }
                }
            } else {
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
                if (child.class_id && (window.electronAPI as any).getWeekSchedule) {
                    const now = new Date();
                    const dow = now.getDay() || 7;
                    const mon = new Date(now); mon.setDate(now.getDate() - dow + 1); mon.setHours(0,0,0,0);
                    const weekStart = mon.toISOString().split('T')[0];
                    const wr = await (window.electronAPI as any).getWeekSchedule({ schoolId: user?.schoolId, classId: child.class_id, weekStart });
                    setSchedules(prev => [...prev.filter((s: any) => s.class_id !== child.class_id), ...(wr.schedules || [])]);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getStudentFinancials = (student: any) => {
        if (!student) return { totalDue: 0, totalPaid: 0, balance: 0, breakdown: { registration: { due: 0, paid: 0 }, installments: [] }, overpaid: 0 };
        const classConfig = tuitionFees.find((f: any) => f.classId === student.class_id);
        const scholarship = student.scholarship_reduction || 0;
        const totalPension = Math.max(0, (classConfig?.totalFee || 0) - scholarship);
        const totalReg = classConfig?.registrationFee || 0;
        const totalDue = totalPension + totalReg;

        const allPayments = stats?.payments || [];
        const totalPaid = allPayments.reduce((acc: number, p: any) => acc + (p.amount || 0), 0);

        const regPaid = Math.min(totalReg, allPayments.filter((p: any) => p.payment_type === 'Inscription').reduce((a: number, p: any) => a + p.amount, 0));
        let pensionRemaining = allPayments.filter((p: any) => p.payment_type === 'Scolarité').reduce((a: number, p: any) => a + p.amount, 0);

        const classInsts = (installments || []).map((inst: any) => ({
            ...inst,
            amountDue: (classInstallmentFees || []).find((cif: any) => cif.class_id === student.class_id && cif.installment_id === inst.id)?.amount || 0
        }));

        const instBreakdown: any[] = [];
        for (const inst of classInsts) {
            const paidForThis = Math.min(inst.amountDue, pensionRemaining);
            instBreakdown.push({ ...inst, paid: paidForThis });
            pensionRemaining -= paidForThis;
        }

        return {
            totalDue,
            totalPaid,
            balance: totalDue - totalPaid,
            breakdown: { registration: { due: totalReg, paid: regPaid }, installments: instBreakdown },
            overpaid: pensionRemaining
        };
    };

    const handlePrintReceipt = async (payment: any) => {
        try {
            const financials = getStudentFinancials(selectedChild);
            const activeSchool = schools.find(sch => sch.id?.toString() === user?.schoolId?.toString()) || schools[0] || { name: '' };
            const { generatePaymentReceipt } = await import('../utils/reports');
            generatePaymentReceipt(payment, selectedChild, financials, activeSchool);
        } catch (e: any) {
            alert(t('pp_print_error', `Erreur d'impression: {{message}}`, { message: e.message }));
        }
    };

    const handleSubmitJustification = async () => {
        if (!justifyingAbsence || !justifyMessage.trim()) return;
        setIsSubmittingJustif(true);
        try {
            await (window.electronAPI as any).submitAbsenceJustification({
                attendanceId: justifyingAbsence.id,
                message: justifyMessage.trim(),
                attachmentBase64: justifyAttachment || null
            });
            setJustifyingAbsence(null);
            setJustifyMessage('');
            setJustifyAttachment(null);
            if (selectedChild) {
                const details = await window.electronAPI.getStudentDetails(selectedChild.id);
                setStats(details);
            }
            alert(t('pp_justif_sent', 'Justification envoyée à l\'enseignant. Vous serez notifié(e) de la décision.'));
        } catch (e: any) {
            alert(e.message || t('pp_justif_error', 'Erreur lors de l\'envoi de la justification.'));
        }
        setIsSubmittingJustif(false);
    };

    const printStudentReport = async () => {
        if (!selectedChild || !stats) return;
        try {
            if (window.electronAPI) {
                const allSchools = schools.length > 0 ? schools : await window.electronAPI.getSchools();
                const school = allSchools.find((s: any) => s.id === selectedChild.school_id) || allSchools[0];
                const allClasses = classes.length > 0 ? classes : await window.electronAPI.getClasses(user?.schoolId);
                const classObj = allClasses.find(c => c.id === selectedChild.class_id);

                const allStudents = await window.electronAPI.getStudents(user?.schoolId);
                const classStudents = allStudents.filter((s: any) => s.class_id === selectedChild.class_id);

                const studentsWithAverages = await Promise.all(classStudents.map(async (s: any) => {
                    const details = await window.electronAPI.getStudentDetails(s.id);
                    const validatedGrades = details.grades.filter((g: any) => g.term === selectedTerm && g.validated === 1);
                    const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
                    const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
                    const avg = totalCoef > 0 ? (totalPoints / totalCoef) : 0;
                    return { id: s.id, avg, details };
                }));

                studentsWithAverages.sort((a, b) => b.avg - a.avg);

                const rankIndex = studentsWithAverages.findIndex(s => s.id === selectedChild.id);
                const rank = rankIndex !== -1 ? rankIndex + 1 : undefined;
                const totalStudents = studentsWithAverages.length;
                const classAverage = totalStudents > 0 ? studentsWithAverages.reduce((sum, s) => sum + s.avg, 0) / totalStudents : undefined;
                const firstAverage = studentsWithAverages[0]?.avg;
                const lastAverage = studentsWithAverages[studentsWithAverages.length - 1]?.avg;

                const studentData = studentsWithAverages.find(s => s.id === selectedChild.id);
                if (studentData) {
                    let template = null;
                    if (window.electronAPI && school?.id) {
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
                        totalStudents,
                        classAverage,
                        firstAverage,
                        lastAverage
                    });
                } else {
                    alert(t('pp_rank_calc_error', 'Une erreur est survenue lors du calcul du rang.'));
                }
            } else {
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
            alert(t('pp_report_print_error', `Erreur d'impression du bulletin: {{message}}`, { message: e.message }));
        }
    };

    const handleSendTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketSubject || !ticketMessage || !ticketReceiver) return;
        try {
            if (window.electronAPI && window.electronAPI.sendParentTicket) {
                await window.electronAPI.sendParentTicket({
                    schoolId: user?.schoolId,
                    senderId: user?.id,
                    receiverId: parseInt(ticketReceiver),
                    subject: ticketSubject,
                    message: ticketMessage
                });
                alert(t('pp_message_sent_success', 'Message envoyé avec succès à l\'enseignant.'));
                setTicketSubject('');
                setTicketMessage('');
            }
        } catch (err: any) {
            alert(t('pp_message_send_error', `Erreur lors de l'envoi du message: {{message}}`, { message: err.message }));
        }
    };

    if (loading && children.length === 0) return (
        <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
            <Activity className="w-12 h-12 text-amber-500 animate-pulse" />
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">{t('pp_initializing', 'Initialisation du Portail Parent...')}</p>
        </div>
    );

    if (children.length === 0) {
        if (accessBlocked) return (
            <div className="h-[80vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-rose-500/30">
                    <ShieldCheck className="w-12 h-12 text-rose-500" />
                </div>
                <div className="space-y-3 max-w-sm">
                    <h2 className="text-2xl font-black text-white uppercase italic">{t('pp_access_blocked_title', 'Accès suspendu')}</h2>
                    <p className="text-slate-400 text-sm font-bold leading-relaxed">
                        {t('pp_access_blocked_desc', 'Le compte de votre enfant a été temporairement bloqué par l\'administration. Aucune donnée n\'est accessible pendant cette période.')}
                    </p>
                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest mt-4">
                        {t('pp_access_blocked_contact', 'Veuillez contacter l\'établissement pour plus d\'informations.')}
                    </p>
                </div>
            </div>
        );
        return (
            <div className="p-20 text-center space-y-6">
                <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <User className="w-10 h-10 text-slate-700" />
                </div>
                <h2 className="text-xl font-black text-white uppercase italic">{t('pp_no_student_linked', 'Aucun élève associé')}</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-xs mx-auto">
                    {t('pp_no_student_linked_desc', 'Le compte parent est configuré automatiquement à l\'enregistrement de l\'élève. Veuillez vous assurer que le numéro de téléphone saisi correspond parfaitement.')}
                </p>
            </div>
        );
    }

    if (!selectedChild) return null;

    const isNotRegistered = selectedChild.has_paid_registration === 0;
    // Irrégulier si une date d'échéance est dépassée et que la tranche correspondante n'est pas entièrement payée.
    // Un moratoire accordé lève le blocage.
    const isIrregular = (() => {
        if (selectedChild.has_moratoire === 1) return false;
        if (selectedChild.has_paid_registration !== 1) return false;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const passedDeadlines = installmentDeadlines.filter((d: any) => new Date(d.deadline_date) < today);
        if (passedDeadlines.length === 0) return false;
        return passedDeadlines.some((deadline: any) => {
            const classFee = classInstallmentFees.find((f: any) =>
                f.installment_id === deadline.installment_id &&
                f.class_id === selectedChild.class_id
            );
            if (!classFee || !classFee.amount) return false;
            const paidForInstallment = (stats?.payments || [])
                .filter((p: any) => p.installment_id === deadline.installment_id)
                .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
            return paidForInstallment < classFee.amount;
        });
    })();

    const financials = getStudentFinancials(selectedChild);
    const termGrades = stats?.grades?.filter((g: any) => g.term === selectedTerm) || [];
    const validatedGrades = termGrades.filter((g: any) => g.validated === 1);
    const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
    const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
    const average = totalCoef > 0 ? totalPoints / totalCoef : 0;

    const TABS = [
        { id: 'home',      icon: <Activity className="w-5 h-5" />,      shortIcon: <Activity className="w-5 h-5" />,      label: t('pp_tab_home', 'Tableau de bord'),     short: t('pp_tab_home_short', 'Accueil') },
        { id: 'notes',     icon: <ClipboardList className="w-5 h-5" />,  shortIcon: <ClipboardList className="w-5 h-5" />,  label: t('pp_tab_grades', 'Notes & Bulletins'),  short: t('pp_tab_grades_short', 'Notes') },
        { id: 'emploi',    icon: <Calendar className="w-5 h-5" />,       shortIcon: <Calendar className="w-5 h-5" />,       label: t('pp_tab_timetable', 'Emploi du temps'), short: t('pp_tab_timetable_short', 'Emploi') },
        { id: 'finance',   icon: <Coins className="w-5 h-5" />,          shortIcon: <Coins className="w-5 h-5" />,          label: t('pp_tab_finance', 'Finances'),           short: t('pp_tab_finance_short', 'Finance') },
        { id: 'absences',  icon: <AlertTriangle className="w-5 h-5" />,  shortIcon: <AlertTriangle className="w-5 h-5" />,  label: t('pp_tab_absences', 'Absences'),          short: t('pp_tab_absences_short', 'Absences') },
        { id: 'transport', icon: <Bus className="w-5 h-5" />,            shortIcon: <Bus className="w-5 h-5" />,            label: t('pp_tab_transport', 'Transport'),        short: t('pp_tab_transport_short', 'Transport') },
        { id: 'messages',  icon: <Bell className="w-5 h-5" />,           shortIcon: <Bell className="w-5 h-5" />,           label: t('pp_tab_messages', 'Messages'),          short: t('pp_tab_messages_short', 'Messages') },
    ];

    return (
        <div className="relative flex flex-col min-h-0 animate-in fade-in duration-500 space-y-3">

            {/* ── PREVIEW BANNER (admin only) ─────────────────────────────── */}
            {user?.role !== 'PARENT' && (
                <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-4 py-3 rounded-2xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                        <p className="font-black uppercase tracking-tight text-xs">{t('pp_preview_mode_title', 'Mode Aperçu (Démo)')}</p>
                        <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mt-0.5">{t('pp_preview_mode_desc', 'Interface telle qu\'elle apparaîtra aux parents.')}</p>
                    </div>
                </div>
            )}

            {/* ── STICKY HEADER ──────────────────────────────────────────── */}
            <div className="bg-slate-900/80 backdrop-blur-md border border-white/5 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 relative">
                        <User className="w-5 h-5" />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-0.5 rounded-full border border-slate-950">
                            <ShieldCheck className="w-2.5 h-2.5 text-slate-950" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-sm uppercase tracking-tight truncate">
                            {selectedChild.first_name} {selectedChild.last_name}
                        </p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest truncate">
                            {t('matricule', 'Matricule')} : {selectedChild.matricule}
                        </p>
                    </div>
                    {children.length > 1 && (
                        <div className="flex gap-1 overflow-x-auto flex-shrink-0">
                            {children.map((child) => (
                                <button
                                    type="button"
                                    key={child.id}
                                    onClick={() => handleChildSelect(child)}
                                    className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all whitespace-nowrap ${
                                        selectedChild.id === child.id
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'text-slate-400 bg-white/5 hover:text-white'
                                    }`}
                                >
                                    {child.first_name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── STATUS BANNERS ──────────────────────────────────────────── */}
            {isNotRegistered && (
                <div className="bg-orange-500/10 border border-orange-500/30 px-4 py-3 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-black uppercase tracking-tight text-xs text-orange-400">{t('pp_not_registered_title', 'Élève Non Inscrit')}</h4>
                        <p className="text-[10px] font-bold text-orange-300/70 mt-0.5">{t('pp_not_registered_desc', "Les frais d'inscription n'ont pas encore été réglés. Aucune information pédagogique n'est disponible.")}</p>
                    </div>
                </div>
            )}
            {!isNotRegistered && isIrregular && (
                <div className="bg-rose-500/10 border border-rose-500/30 px-4 py-3 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-black uppercase tracking-tight text-xs text-rose-400">{t('pp_irregular_title', 'Situation Financière Irrégulière')}</h4>
                        <p className="text-[10px] font-bold text-rose-300/70 mt-0.5">{t('pp_irregular_desc', "La pension scolaire n'a pas été entièrement réglée. Le bulletin n'est pas disponible.")}</p>
                    </div>
                </div>
            )}

            {/* ── DESKTOP TOP TAB BAR ─────────────────────────────────────── */}
            <div className="hidden md:flex gap-1 bg-slate-900/50 border border-white/5 rounded-2xl p-1.5">
                {TABS.map(tab => (
                    <button
                        type="button"
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex-1 justify-center ${
                            activeTab === tab.id
                                ? 'bg-amber-500 text-slate-950 shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden lg:inline">{tab.label}</span>
                        <span className="lg:hidden">{tab.short}</span>
                    </button>
                ))}
            </div>

            {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
            {loading ? (
                <div className="h-[30vh] flex flex-col items-center justify-center space-y-4">
                    <Activity className="w-10 h-10 text-amber-500 animate-spin" />
                </div>
            ) : (
                <div className="pb-24 md:pb-2 space-y-4">

                    {/* ══════════════ HOME ══════════════════════════════════ */}
                    {activeTab === 'home' && (
                        <div className="space-y-4">
                            {/* Quick stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('pp_general_average', 'Moy. Générale')}</p>
                                    <p className="text-2xl font-black text-emerald-500 mt-1">
                                        {!isNotRegistered && !isIrregular && validatedGrades.length > 0 ? average.toFixed(2) : '--'}
                                        <span className="text-xs text-slate-600 ml-1">/20</span>
                                    </p>
                                </div>
                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('pp_absences_count', 'Absences')}</p>
                                    <p className="text-2xl font-black text-rose-400 mt-1">
                                        {stats?.attendance?.filter((a: any) => a.status !== 'JUSTIFIED').reduce((acc: number, a: any) => acc + (a.hours_absent || 0), 0) || 0}
                                        <span className="text-xs text-slate-600 ml-1">h</span>
                                    </p>
                                </div>
                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('remaining_to_pay', 'Reste à Payer')}</p>
                                    <p className={`text-2xl font-black mt-1 ${financials.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        {Math.max(0, Math.round(financials.balance)).toLocaleString()}
                                        <span className="text-xs text-slate-600 ml-1">F</span>
                                    </p>
                                </div>
                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('pp_transport_status', 'Transport')}</p>
                                    <p className={`text-sm font-black mt-2 ${selectedChild.has_transport === 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {selectedChild.has_transport === 1 ? t('pp_active', '✓ Actif') : t('pp_inactive', '✗ Inactif')}
                                    </p>
                                </div>
                            </div>

                            {/* Quick action buttons */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                    { id: 'notes',    icon: <ClipboardList className="w-5 h-5" />, label: t('pp_tab_grades', 'Notes'),    color: 'text-amber-400' },
                                    { id: 'finance',  icon: <Coins className="w-5 h-5" />,          label: t('pp_tab_finance', 'Finances'), color: 'text-emerald-400' },
                                    { id: 'absences', icon: <AlertTriangle className="w-5 h-5" />,  label: t('pp_tab_absences', 'Absences'), color: 'text-rose-400' },
                                    { id: 'messages', icon: <Bell className="w-5 h-5" />,            label: t('pp_tab_messages', 'Messages'), color: 'text-blue-400' },
                                ].map(action => (
                                    <button
                                        type="button"
                                        key={action.id}
                                        onClick={() => setActiveTab(action.id)}
                                        className="flex flex-col items-center gap-2 p-4 bg-slate-900/60 border border-white/5 rounded-2xl hover:bg-white/5 transition-all active:scale-95"
                                    >
                                        <span className={action.color}>{action.icon}</span>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{action.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Latest messages preview */}
                            {announcements.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Bell className="w-3.5 h-3.5 text-amber-500" /> {t('pp_latest_messages', 'Derniers messages')}
                                    </p>
                                    {announcements.slice(0, 2).map((ann) => (
                                        <div key={ann.id} className={`p-4 border-l-2 rounded-xl flex items-start gap-3 ${ann.message_type === 'TICKET' ? 'border-l-blue-500 bg-blue-500/5' : 'border-l-amber-500 bg-amber-500/5'}`}>
                                            <Info className={`w-4 h-4 shrink-0 mt-0.5 ${ann.message_type === 'TICKET' ? 'text-blue-500' : 'text-amber-500'}`} />
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-white truncate">{ann.title}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{ann.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {announcements.length > 2 && (
                                        <button type="button" onClick={() => setActiveTab('messages')} className="text-[10px] font-black text-amber-500 uppercase tracking-widest hover:underline">
                                            {t('pp_see_all_messages', 'Voir tous les messages →')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════════════ NOTES ═════════════════════════════════ */}
                    {activeTab === 'notes' && !isNotRegistered && !isIrregular && (
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('pp_period', 'Période')}</p>
                                    <select
                                        title={t('pp_period', 'Période')}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                                        value={selectedTerm}
                                        onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
                                    >
                                        {termStructure.length === 0 && <option value="">{t('gr_no_period_configured', '-- Aucune période configurée --')}</option>}
                                        {termStructure.map(ts => (
                                            <option key={ts.term_id} value={ts.term_id}>{ts.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1 bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('pp_term_general_average', 'Moyenne Générale')}</p>
                                    <p className="text-3xl font-black text-emerald-500 mt-1">
                                        {validatedGrades.length > 0 ? average.toFixed(2) : '--'}
                                        <span className="text-xs text-slate-600"> /20</span>
                                    </p>
                                    <p className="text-[9px] text-slate-500 mt-1 font-bold">{t('pp_validated_subjects_count', '{{count}} matière(s) validée(s)', { count: validatedGrades.length })}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={printStudentReport}
                                className="w-full py-3 bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                            >
                                <Download className="w-4 h-4" /> {t('pp_report_card_pdf', 'Bulletin de Notes (PDF)')}
                            </button>
                            <div className="space-y-2">
                                {termGrades.length === 0 ? (
                                    <p className="text-center text-slate-500 text-xs font-black uppercase tracking-widest py-8">{t('pp_no_grades', 'Aucune note disponible pour cette période.')}</p>
                                ) : termGrades.map((g: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 bg-slate-900/50 border border-white/5 rounded-xl px-4 py-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-white truncate">{g.subjectName}</p>
                                            <p className="text-[9px] text-slate-500 font-bold">{t('coefficient', 'Coef.')} {g.coefficient}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-lg font-black ${g.score >= 10 ? 'text-emerald-400' : 'text-rose-400'}`}>{g.score?.toFixed(2)}</p>
                                            {!g.validated && <p className="text-[8px] text-amber-400 uppercase">{t('pp_pending', 'En attente')}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {activeTab === 'notes' && (isNotRegistered || isIrregular) && (
                        <div className="py-16 text-center">
                            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">
                                {isNotRegistered ? t('pp_not_registered_title', 'Élève Non Inscrit') : t('pp_irregular_title', 'Situation Financière Irrégulière')}
                            </p>
                        </div>
                    )}

                    {/* ══════════════ EMPLOI DU TEMPS ═══════════════════════ */}
                    {activeTab === 'emploi' && (() => {
                        const childSchedules = schedules.filter((s: any) => s.class_id === selectedChild.class_id && s.type !== 'PAUSE');
                        const dayNums = [1, 2, 3, 4, 5, 6];
                        const daysFr = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                        const daysEn = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        const todayForLabel = new Date();
                        const monOffset = todayForLabel.getDay() || 7;
                        const monDate = new Date(todayForLabel); monDate.setDate(todayForLabel.getDate() - monOffset + 1);
                        const satDate = new Date(monDate); satDate.setDate(monDate.getDate() + 5);
                        const fmtShort = (d: Date) => d.toLocaleDateString(i18n.language.startsWith('en') ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'short' });
                        const weekLabel = `${fmtShort(monDate)} — ${fmtShort(satDate)} ${monDate.getFullYear()}`;
                        return (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-black uppercase text-white tracking-tight flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-blue-400" /> {t('pp_timetable', 'Emploi du Temps')}
                                    </p>
                                    <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20 uppercase tracking-widest">{weekLabel}</span>
                                </div>
                                {childSchedules.length === 0 ? (
                                    <p className="text-center text-slate-500 text-xs font-black uppercase tracking-widest py-12">{t('pp_no_timetable', 'Aucun emploi du temps configuré.')}</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                                        {dayNums.map((dayNum, di) => {
                                            const daySlots = childSchedules
                                                .filter((s: any) => Number(s.day_of_week) === dayNum)
                                                .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''));
                                            if (daySlots.length === 0) return null;
                                            return (
                                                <div key={dayNum} className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 space-y-2">
                                                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest border-b border-white/5 pb-2">
                                                        {i18n.language.startsWith('en') ? daysEn[di] : daysFr[di]}
                                                    </p>
                                                    {daySlots.map((slot: any) => {
                                                        const sub = subjects.find((s: any) => s.id === slot.subject_id);
                                                        const isEval = slot.type === 'EVALUATION' || slot.type === 'EXAM';
                                                        return (
                                                            <div key={slot.id} className={`p-2 rounded-lg text-[10px] ${isEval ? 'bg-rose-500/10 border border-rose-500/20' : 'bg-slate-950/80'}`}>
                                                                <p className={`font-black truncate ${isEval ? 'text-rose-400' : 'text-amber-400'}`}>{sub?.name || '-'}</p>
                                                                <p className="text-slate-500">{slot.start_time} – {slot.end_time}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Évaluations programmées */}
                                {(() => {
                                    const childEvals = evaluationSchedules
                                        .filter((e: any) => e.class_id === selectedChild.class_id && ['APPROVED', 'FORCED_APPROVED', 'PENDING_TEACHER', 'PENDING_ADMIN'].includes(e.status || 'APPROVED'))
                                        .sort((a: any, b: any) => (a.date || '').localeCompare(b.date || '') || (a.start_time || '').localeCompare(b.start_time || ''));
                                    if (childEvals.length === 0) return null;
                                    const fmtDate = (d: string) => {
                                        try { return new Date(d).toLocaleDateString(i18n.language.startsWith('en') ? 'en-GB' : 'fr-FR', { weekday: 'short', day: '2-digit', month: 'short' }); }
                                        catch { return d; }
                                    };
                                    const today2 = new Date(); today2.setHours(0, 0, 0, 0);
                                    const upcoming = childEvals.filter((e: any) => new Date(e.date) >= today2);
                                    const past = childEvals.filter((e: any) => new Date(e.date) < today2);
                                    const renderEval = (e: any) => {
                                        const sub = subjects.find((s: any) => s.id === e.subject_id);
                                        const isPast = new Date(e.date) < today2;
                                        return (
                                            <div key={e.id} className={`flex items-center gap-3 p-3 rounded-xl border ${isPast ? 'bg-slate-900/30 border-white/5 opacity-60' : 'bg-rose-500/5 border-rose-500/20'}`}>
                                                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isPast ? 'bg-slate-800' : 'bg-rose-500/15'}`}>
                                                    <span className={`text-[10px] font-black uppercase ${isPast ? 'text-slate-500' : 'text-rose-400'}`}>
                                                        {e.date ? new Date(e.date).toLocaleDateString(i18n.language.startsWith('en') ? 'en-GB' : 'fr-FR', { month: 'short' }).toUpperCase() : '--'}
                                                    </span>
                                                    <span className={`text-base font-black leading-none ${isPast ? 'text-slate-400' : 'text-rose-300'}`}>
                                                        {e.date ? new Date(e.date).getDate() : '--'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-black truncate ${isPast ? 'text-slate-400' : 'text-white'}`}>{sub?.name || e.subject_name || t('pp_unknown_subject', 'Matière inconnue')}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold">{fmtDate(e.date)} · {e.start_time || '--'} – {e.end_time || '--'}</p>
                                                </div>
                                            </div>
                                        );
                                    };
                                    return (
                                        <div className="mt-4 space-y-3">
                                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-4 h-[1px] bg-rose-500/40 inline-block" />
                                                {t('pp_eval_schedule', 'Évaluations programmées')}
                                                <span className="w-4 h-[1px] bg-rose-500/40 inline-block" />
                                            </p>
                                            {upcoming.length > 0 && <div className="space-y-2">{upcoming.map(renderEval)}</div>}
                                            {past.length > 0 && (
                                                <details className="group">
                                                    <summary className="text-[9px] font-black text-slate-600 uppercase tracking-widest cursor-pointer hover:text-slate-400 transition-colors list-none flex items-center gap-1">
                                                        <span>{t('pp_past_evals', 'Évaluations passées')} ({past.length})</span>
                                                    </summary>
                                                    <div className="space-y-2 mt-2">{past.map(renderEval)}</div>
                                                </details>
                                            )}
                                            {upcoming.length === 0 && past.length === 0 && (
                                                <p className="text-center text-slate-500 text-xs font-black uppercase tracking-widest py-4">{t('pp_no_evals', 'Aucune évaluation programmée.')}</p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })()}

                    {/* ══════════════ FINANCE ═══════════════════════════════ */}
                    {activeTab === 'finance' && (
                        <div className="space-y-4">
                            {selectedChild.has_moratoire === 1 && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{t('pp_moratoire_granted', 'Moratoire accordé — paiement échelonné autorisé')}</p>
                                </div>
                            )}
                            {/* Summary cards */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 text-center">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tight">{t('pp_total_due', 'Total Dû')}</p>
                                    <p className="text-xs font-black text-white mt-1">{Math.round(financials.totalDue).toLocaleString()} <span className="text-[8px] text-slate-500">F</span></p>
                                </div>
                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 text-center">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tight">{t('total_paid_label', 'Versé')}</p>
                                    <p className="text-xs font-black text-emerald-500 mt-1">{Math.round(financials.totalPaid).toLocaleString()} <span className="text-[8px] text-slate-500">F</span></p>
                                </div>
                                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 text-center">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tight">{t('remaining_to_pay', 'Reste')}</p>
                                    <p className={`text-xs font-black mt-1 ${financials.balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{Math.max(0, Math.round(financials.balance)).toLocaleString()} <span className="text-[8px] text-slate-500">F</span></p>
                                </div>
                            </div>

                            {/* Tranches — cards on mobile */}
                            <div className="md:hidden space-y-2">
                                {(() => {
                                    const { due, paid } = financials.breakdown.registration;
                                    const bal = Math.max(0, due - paid);
                                    const settled = paid >= due && due > 0;
                                    return (
                                        <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-black text-white">{t('registration', 'Inscription')}</p>
                                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide ${settled ? 'bg-emerald-500/20 text-emerald-400' : bal > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-500'}`}>
                                                    {settled ? t('paid', 'Payée') : bal > 0 ? t('not_paid', 'Non payée') : '-'}
                                                </span>
                                            </div>
                                            <div className="flex gap-4 mt-2 text-[10px] font-bold flex-wrap">
                                                <span className="text-slate-400">{t('pp_amount_due', 'Dû')} : {Math.round(due).toLocaleString()} F</span>
                                                <span className="text-emerald-400">{t('pp_amount_paid', 'Payé')} : {Math.round(paid).toLocaleString()} F</span>
                                                {bal > 0 && <span className="text-rose-400">{t('pp_balance', 'Reste')} : {Math.round(bal).toLocaleString()} F</span>}
                                            </div>
                                        </div>
                                    );
                                })()}
                                {financials.breakdown.installments.map((inst: any, idx: number) => {
                                    const bal = Math.max(0, inst.amountDue - inst.paid);
                                    const statusLabel = inst.paid >= inst.amountDue && inst.amountDue > 0 ? t('paid', 'Payée') : inst.paid > 0 ? t('partial', 'Partielle') : t('not_paid', 'Non payée');
                                    const statusCls = inst.paid >= inst.amountDue && inst.amountDue > 0 ? 'bg-emerald-500/20 text-emerald-400' : inst.paid > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400';
                                    return (
                                        <div key={idx} className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-black text-white">{inst.name}</p>
                                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide ${statusCls}`}>{statusLabel}</span>
                                            </div>
                                            <div className="flex gap-4 mt-2 text-[10px] font-bold flex-wrap">
                                                <span className="text-slate-400">{t('pp_amount_due', 'Dû')} : {Math.round(inst.amountDue).toLocaleString()} F</span>
                                                <span className="text-emerald-400">{t('pp_amount_paid', 'Payé')} : {Math.round(inst.paid).toLocaleString()} F</span>
                                                {bal > 0 && <span className="text-rose-400">{t('pp_balance', 'Reste')} : {Math.round(bal).toLocaleString()} F</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Tranches — table on desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-950 text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                                            <th className="px-4 py-3">{t('pp_tranche', 'Tranche')}</th>
                                            <th className="px-4 py-3 text-right">{t('pp_amount_due', 'À Payer')}</th>
                                            <th className="px-4 py-3 text-right">{t('pp_amount_paid', 'Payé')}</th>
                                            <th className="px-4 py-3 text-right">{t('pp_balance', 'Reste')}</th>
                                            <th className="px-4 py-3 text-center">{t('pp_status', 'Statut')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-xs font-bold">
                                        {(() => {
                                            const { due, paid } = financials.breakdown.registration;
                                            const bal = Math.max(0, due - paid);
                                            return (
                                                <tr className="hover:bg-white/3 transition-colors">
                                                    <td className="px-4 py-3 text-slate-300">{t('registration', 'Inscription')}</td>
                                                    <td className="px-4 py-3 text-right text-white">{Math.round(due).toLocaleString()} F</td>
                                                    <td className="px-4 py-3 text-right text-emerald-400">{Math.round(paid).toLocaleString()} F</td>
                                                    <td className={`px-4 py-3 text-right font-black ${bal > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{Math.round(bal).toLocaleString()} F</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide ${paid >= due && due > 0 ? 'bg-emerald-500/20 text-emerald-400' : bal > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-500'}`}>
                                                            {paid >= due && due > 0 ? t('paid', 'Payée') : bal > 0 ? t('not_paid', 'Non payée') : '-'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })()}
                                        {financials.breakdown.installments.map((inst: any, idx: number) => {
                                            const bal = Math.max(0, inst.amountDue - inst.paid);
                                            const statusLabel = inst.paid >= inst.amountDue && inst.amountDue > 0 ? t('paid', 'Payée') : inst.paid > 0 ? t('partial', 'Partielle') : t('not_paid', 'Non payée');
                                            const statusCls = inst.paid >= inst.amountDue && inst.amountDue > 0 ? 'bg-emerald-500/20 text-emerald-400' : inst.paid > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400';
                                            return (
                                                <tr key={idx} className="hover:bg-white/3 transition-colors">
                                                    <td className="px-4 py-3 text-slate-300">{inst.name}</td>
                                                    <td className="px-4 py-3 text-right text-white">{Math.round(inst.amountDue).toLocaleString()} F</td>
                                                    <td className="px-4 py-3 text-right text-emerald-400">{Math.round(inst.paid).toLocaleString()} F</td>
                                                    <td className={`px-4 py-3 text-right font-black ${bal > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{Math.round(bal).toLocaleString()} F</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide ${statusCls}`}>{statusLabel}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-slate-950/80 border-t border-white/10">
                                            <td className="px-4 py-3 font-black text-white uppercase tracking-widest text-[10px]">{t('total', 'TOTAL')}</td>
                                            <td className="px-4 py-3 text-right font-black text-white">{Math.round(financials.totalDue).toLocaleString()} F</td>
                                            <td className="px-4 py-3 text-right font-black text-emerald-400">{Math.round(financials.totalPaid).toLocaleString()} F</td>
                                            <td className={`px-4 py-3 text-right font-black ${financials.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{Math.max(0, Math.round(financials.balance)).toLocaleString()} F</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide ${selectedChild.has_moratoire === 1 ? 'bg-amber-500/20 text-amber-400' : financials.balance <= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                    {selectedChild.has_moratoire === 1 ? t('pp_moratoire', 'Moratoire') : financials.balance <= 0 ? t('pp_settled', 'Soldé') : t('pp_in_progress', 'En cours')}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Payment receipts */}
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-amber-500" /> {t('pp_payments_journal', 'Journal des Versements')}
                                </p>
                                {/* Mobile: cards */}
                                <div className="md:hidden space-y-2">
                                    {stats?.payments && stats.payments.length > 0 ? stats.payments.map((p: any) => (
                                        <div key={p.id} className="bg-slate-900/60 border border-white/5 rounded-xl p-4 flex items-center gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-mono text-amber-500">#{p.receipt_number}</p>
                                                <p className="text-xs font-black text-white">{(p.amount || 0).toLocaleString()} FCFA</p>
                                                <p className="text-[9px] text-slate-500">{p.payment_type} · {new Date(p.payment_date).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR')}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handlePrintReceipt(p)}
                                                className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                                                title={t('pp_download_receipt', 'Télécharger le reçu')}
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )) : (
                                        <p className="text-center text-slate-500 text-xs font-black uppercase tracking-widest py-6">{t('pp_no_payment_recorded', 'Aucun versement enregistré.')}</p>
                                    )}
                                </div>
                                {/* Desktop: table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                                <th className="px-4 py-3">{t('receipt_no', 'Reçu N°')}</th>
                                                <th className="px-4 py-3">{t('amount', 'Montant')}</th>
                                                <th className="px-4 py-3">{t('reason', 'Motif')}</th>
                                                <th className="px-4 py-3">{t('date', 'Date')}</th>
                                                <th className="px-4 py-3 text-right">{t('actions', 'Action')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {stats?.payments && stats.payments.length > 0 ? (
                                                stats.payments.map((p: any) => (
                                                    <tr key={p.id} className="hover:bg-white/5 transition-colors text-xs font-bold">
                                                        <td className="px-4 py-3 font-mono text-amber-500">#{p.receipt_number}</td>
                                                        <td className="px-4 py-3 text-white">{(p.amount || 0).toLocaleString()} FCFA</td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full uppercase tracking-widest border border-amber-500/20">{p.payment_type}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500">{new Date(p.payment_date).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR')}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePrintReceipt(p)}
                                                                className="p-2 text-slate-400 bg-white/5 hover:bg-amber-500 hover:text-slate-950 border border-white/10 rounded-xl transition-all"
                                                                title={t('pp_download_receipt', 'Télécharger le reçu')}
                                                            >
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest">{t('pp_no_payment_recorded', 'Aucun versement enregistré.')}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════ ABSENCES ══════════════════════════════ */}
                    {activeTab === 'absences' && !isNotRegistered && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                                <AlertTriangle className="w-5 h-5 text-rose-400" />
                                <div>
                                    <p className="text-xs font-black text-white">
                                        {t('cumulative_total', 'Cumul Total')} : <span className="text-rose-400">{stats?.attendance?.filter((a: any) => a.status !== 'JUSTIFIED').reduce((acc: number, a: any) => acc + (a.hours_absent || 0), 0) || 0}h</span>
                                    </p>
                                    <p className="text-[9px] text-slate-500">{t('pp_unjustified_absences', 'heures non justifiées')}</p>
                                </div>
                            </div>
                            {/* Mobile: cards */}
                            <div className="md:hidden space-y-2">
                                {stats?.attendance && stats.attendance.length > 0 ? (
                                    stats.attendance.map((abs: any) => (
                                        <div key={abs.id} className="bg-slate-900/60 border border-white/5 rounded-xl p-4 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-xs font-black text-white">{abs.subject_name || '-'}</p>
                                                    <p className="text-[9px] text-slate-500 mt-0.5">
                                                        {new Date(abs.date).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR')}
                                                        {abs.start_time && abs.end_time ? ` · ${abs.start_time}–${abs.end_time}` : ''}
                                                        {' · '}<span className="text-rose-400 font-black">{abs.hours_absent}h</span>
                                                    </p>
                                                </div>
                                                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest border flex-shrink-0 ${
                                                    abs.status === 'ABSENT' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                    abs.status === 'JUSTIFIED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                    {abs.status === 'ABSENT' ? t('not_justified', 'Non Just.') : abs.status === 'JUSTIFIED' ? t('justified', 'Justifiée') : t('late', 'Retard')}
                                                </span>
                                            </div>
                                            {abs.status !== 'JUSTIFIED' && abs.hours_absent > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setJustifyingAbsence(abs); setJustifyMessage(''); setJustifyAttachment(null); }}
                                                    className="w-full py-2 text-[9px] font-black bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg uppercase tracking-widest transition-all border border-indigo-500/20"
                                                >
                                                    {t('pp_justify', 'Justifier')}
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-slate-500 text-xs font-black uppercase tracking-widest py-8">{t('no_absences', 'Aucune absence enregistrée.')}</p>
                                )}
                            </div>
                            {/* Desktop: table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                            <th className="px-4 py-3">{t('date', 'Date')}</th>
                                            <th className="px-4 py-3">{t('course', 'Cours')}</th>
                                            <th className="px-4 py-3">{t('schedule_time', 'Horaire')}</th>
                                            <th className="px-4 py-3">{t('hours', 'Heures')}</th>
                                            <th className="px-4 py-3">{t('status', 'Statut')}</th>
                                            <th className="px-4 py-3 text-right">{t('action', 'Action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {stats?.attendance && stats.attendance.length > 0 ? (
                                            <>
                                                {stats.attendance.map((abs: any) => (
                                                    <tr key={abs.id} className="hover:bg-white/5 transition-colors text-xs font-bold">
                                                        <td className="px-4 py-3 text-white">{new Date(abs.date).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR')}</td>
                                                        <td className="px-4 py-3 text-amber-400">{abs.subject_name || '-'}</td>
                                                        <td className="px-4 py-3 text-slate-400">{abs.start_time && abs.end_time ? `${abs.start_time} - ${abs.end_time}` : '-'}</td>
                                                        <td className="px-4 py-3 text-rose-400 font-black">{abs.hours_absent}h</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest border ${
                                                                abs.status === 'ABSENT' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                                abs.status === 'JUSTIFIED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                            }`}>
                                                                {abs.status === 'ABSENT' ? t('not_justified', 'Non Justifiée') : abs.status === 'JUSTIFIED' ? t('justified', 'Justifiée') : t('late', 'Retard')}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {abs.status !== 'JUSTIFIED' && abs.hours_absent > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setJustifyingAbsence(abs); setJustifyMessage(''); setJustifyAttachment(null); }}
                                                                    className="text-[9px] font-black px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg uppercase tracking-widest transition-all border border-indigo-500/20"
                                                                >
                                                                    {t('pp_justify', 'Justifier')}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-slate-950/50">
                                                    <td colSpan={3} className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cumulative_total', 'Cumul Total')}</td>
                                                    <td className="px-4 py-3 text-rose-500 font-black text-sm">{stats.attendance.filter((a: any) => a.status !== 'JUSTIFIED').reduce((acc: number, a: any) => acc + (a.hours_absent || 0), 0)}h</td>
                                                    <td colSpan={2}></td>
                                                </tr>
                                            </>
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 italic uppercase text-[10px] font-black tracking-widest">{t('no_absences', 'Aucune absence enregistrée.')}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'absences' && isNotRegistered && (
                        <div className="py-16 text-center">
                            <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">{t('pp_not_registered_title', 'Élève Non Inscrit')}</p>
                        </div>
                    )}

                    {/* ══════════════ TRANSPORT ═════════════════════════════ */}
                    {activeTab === 'transport' && (
                        <div className="space-y-4">
                            {selectedChild.has_transport === 1 ? (
                                <>
                                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('pp_dropoff_neighborhood', 'Quartier de dépose')}</p>
                                                <p className="text-sm font-black text-white mt-1">{selectedChild.neighborhood || 'Bastos'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsBusMapOpen(true)}
                                        className="w-full py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <MapPin className="w-4 h-4" /> {t('pp_live_bus_map', 'Carte du Bus en Direct')}
                                    </button>
                                </>
                            ) : (
                                <div className="p-6 bg-rose-500/5 rounded-2xl border border-rose-500/10 space-y-4">
                                    <div className="flex items-start gap-3 text-rose-400">
                                        <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider">{t('pp_transport_inactive_title', 'Abonnement Transport Inactif')}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-relaxed">
                                                {t('pp_transport_inactive_desc', "Cet élève n'a pas encore souscrit au forfait transport ou le versement n'a pas encore été validé.")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-wider border-t border-white/5 pt-3">
                                        💡 {t('pp_transport_gps_activation_note', 'Dès validation du paiement transport, le suivi GPS s\'activera instantanément.')}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ══════════════ MESSAGES ══════════════════════════════ */}
                    {activeTab === 'messages' && (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Bell className="w-3.5 h-3.5 text-amber-500" /> {t('pp_messages_and_announcements', 'Messages et Communiqués')}
                            </p>
                            {announcements.length > 0 ? (
                                announcements.map((ann) => (
                                    <div key={ann.id} className={`p-5 border-l-4 rounded-2xl flex items-start gap-4 ${ann.message_type === 'TICKET' ? 'border-l-blue-500 bg-blue-500/5' : 'border-l-amber-500 bg-amber-500/5'}`}>
                                        <Info className={`w-5 h-5 shrink-0 mt-0.5 ${ann.message_type === 'TICKET' ? 'text-blue-500' : 'text-amber-500'}`} />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                                {t('pp_announcement_from', '{{date}} - De : {{sender}}', { date: new Date(ann.created_at).toLocaleDateString(), sender: ann.sender_name })}
                                            </span>
                                            <h4 className="text-sm font-black text-white mt-1 uppercase">{ann.title}</h4>
                                            <p className="text-xs text-slate-300 font-bold mt-1 whitespace-pre-wrap">{ann.content}</p>
                                            {ann.message_type === 'TICKET' && ann.sender_id && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setTicketReceiver(ann.sender_id.toString()); setTicketSubject(`RE: ${ann.title}`); }}
                                                    className="mt-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-black text-white uppercase tracking-widest rounded-lg transition-colors"
                                                >
                                                    {t('pp_reply', 'Répondre')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl">
                                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs">{t('pp_no_school_message', 'Aucun message de l\'école')}</p>
                                </div>
                            )}

                            {/* Contact form */}
                            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 space-y-4">
                                <p className="text-sm font-black uppercase text-white tracking-tight">{t('pp_contact_teacher', 'Contacter l\'enseignant')}</p>
                                <form onSubmit={handleSendTicket} className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">{t('pp_recipient_student_teacher', 'Destinataire')}</label>
                                        <select
                                            required
                                            title={t('pp_recipient_student_teacher', 'Destinataire')}
                                            value={ticketReceiver}
                                            onChange={(e) => setTicketReceiver(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="">{t('pp_select_teacher_placeholder', '-- Sélectionner l\'enseignant --')}</option>
                                            {(() => {
                                                const studentClass = classes.find(c => c.id === selectedChild.class_id);
                                                if (!studentClass) return null;
                                                const teachers = users.filter(u => {
                                                    if (u.id === studentClass.main_teacher_id || u.id === studentClass.assistant_teacher_id) return true;
                                                    if (u.role === 'TEACHER' && u.assignedClasses) {
                                                        try {
                                                            const classList = typeof u.assignedClasses === 'string' ? JSON.parse(u.assignedClasses) : u.assignedClasses;
                                                            return Array.isArray(classList) && (classList.includes(studentClass.id) || classList.includes(String(studentClass.id)));
                                                        } catch(e) { return false; }
                                                    }
                                                    return false;
                                                });
                                                return teachers.map(tchr => (
                                                    <option key={tchr.id} value={tchr.id}>
                                                        {tchr.full_name} ({tchr.id === studentClass.main_teacher_id ? t('main_teacher', 'Titulaire') : tchr.id === studentClass.assistant_teacher_id ? t('assistant_teacher', 'Suppléant') : t('subject_teacher', 'Professeur')})
                                                    </option>
                                                ));
                                            })()}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">{t('pp_subject', 'Sujet')}</label>
                                        <input
                                            required
                                            type="text"
                                            value={ticketSubject}
                                            onChange={(e) => setTicketSubject(e.target.value)}
                                            placeholder={t('pp_message_subject_placeholder', 'Sujet de votre message...')}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:ring-1 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">{t('message_content', 'Message')}</label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={ticketMessage}
                                            onChange={(e) => setTicketMessage(e.target.value)}
                                            placeholder={t('pp_message_body_placeholder', 'Rédigez votre message ici...')}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:ring-1 focus:ring-amber-500 resize-none custom-scrollbar"
                                        />
                                    </div>
                                    <button type="submit" className="w-full py-3 bg-amber-500 text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-yellow-400 transition-all">
                                        {t('pp_send_message', 'Envoyer le message')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* ── MOBILE BOTTOM NAV ───────────────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-20 md:hidden bg-slate-950/95 backdrop-blur-md border-t border-white/10">
                <div className="flex items-stretch justify-around px-1 py-2">
                    {TABS.map(tab => (
                        <button
                            type="button"
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition-all flex-1 ${
                                activeTab === tab.id ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <span className={`transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`}>{tab.shortIcon}</span>
                            <span className="text-[7px] font-black uppercase tracking-tight truncate w-full text-center">{tab.short}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── JUSTIFICATION MODAL ─────────────────────────────────────── */}
            {justifyingAbsence && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full md:max-w-lg bg-slate-950 rounded-t-3xl md:rounded-3xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
                        <div className="p-5 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tight">{t('pp_justify_absence', 'Justifier une Absence')}</h3>
                                <p className="text-slate-400 text-[10px] mt-0.5">
                                    {justifyingAbsence.date} — {justifyingAbsence.subject_name || '-'} ({justifyingAbsence.hours_absent}h)
                                </p>
                            </div>
                            <button type="button" onClick={() => setJustifyingAbsence(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-lg font-bold">×</button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('pp_justif_message', 'Message de justification')} *</label>
                                <textarea
                                    rows={4}
                                    value={justifyMessage}
                                    onChange={e => setJustifyMessage(e.target.value)}
                                    placeholder={t('pp_justif_placeholder', 'Expliquez la raison de l\'absence...')}
                                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('pp_justif_attachment', 'Pièce justificative (optionnel)')}</label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    title={t('pp_justif_attachment', 'Pièce justificative')}
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = ev => setJustifyAttachment(ev.target?.result as string);
                                        reader.readAsDataURL(file);
                                    }}
                                    className="w-full text-[11px] text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 file:transition-all cursor-pointer"
                                />
                                {justifyAttachment && (
                                    <div className="mt-2 flex items-center gap-2">
                                        {justifyAttachment.startsWith('data:image') ? (
                                            <img src={justifyAttachment} alt="preview" className="h-16 w-24 object-cover rounded-lg border border-white/10" />
                                        ) : (
                                            <span className="text-[10px] text-emerald-400 font-black uppercase">PDF joint</span>
                                        )}
                                        <button type="button" onClick={() => setJustifyAttachment(null)} className="text-rose-400 text-[10px] hover:text-rose-300 font-bold">Supprimer</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-5 pt-0 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setJustifyingAbsence(null)}
                                className="flex-1 py-3 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                {t('cancel', 'Annuler')}
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitJustification}
                                disabled={isSubmittingJustif || !justifyMessage.trim()}
                                className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                {isSubmittingJustif ? t('pp_sending', 'Envoi...') : t('pp_send_justif', 'Envoyer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── GPS MAP MODAL ────────────────────────────────────────────── */}
            {isBusMapOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full md:max-w-2xl bg-slate-950 rounded-t-3xl md:rounded-3xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="p-5 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-black text-white uppercase tracking-tight">{t('pp_realtime_gps_tracking', 'Suivi GPS Temps Réel')}</h3>
                                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-0.5 animate-pulse flex items-center gap-1">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span> {t('pp_satellite_connection_active', 'Connexion satellite active')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsBusMapOpen(false)}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl text-xs font-bold transition-all"
                            >
                                {t('close', 'Fermer')}
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="w-full h-64 rounded-2xl bg-slate-900 border border-white/5 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
                                <svg className="w-full h-full absolute inset-0 p-8" viewBox="0 0 500 300">
                                    <path d="M 50 150 Q 150 50 250 150 T 450 150" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="6,4" className="opacity-50" />
                                    <circle cx="50" cy="150" r="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                                    <text x="50" y="175" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">{t('pp_school_departure', 'Départ École')}</text>
                                    <circle cx="210" cy="115" r="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                                    <text x="210" y="95" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">{t('pp_omnisport_stop', 'Arrêt Omnisports')}</text>
                                    <circle cx="330" cy="170" r="8" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                                    <text x="330" y="195" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">{selectedChild.neighborhood || 'Bastos'}</text>
                                    <g transform="translate(180, 110)">
                                        <circle r="12" fill="#10b981" className="animate-ping opacity-75" />
                                        <circle r="7" fill="#10b981" />
                                        <path d="M-3,-3 L3,-3 L0,3 Z" fill="white" />
                                    </g>
                                </svg>
                                <div className="absolute top-3 left-3 bg-slate-950/80 border border-white/10 p-2.5 rounded-xl backdrop-blur-md">
                                    <span className="text-[9px] text-slate-500 font-black uppercase block">{t('pp_speed', 'Vitesse')}</span>
                                    <span className="text-white font-black text-sm">48 km/h</span>
                                </div>
                                <div className="absolute top-3 right-3 bg-slate-950/80 border border-white/10 p-2.5 rounded-xl backdrop-blur-md">
                                    <span className="text-[9px] text-slate-500 font-black uppercase block">{t('eta_label', 'Arrivée')}</span>
                                    <span className="text-amber-500 font-black text-sm">{t('pp_minutes_count', '{{count}} Min', { count: 12 })}</span>
                                </div>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center">
                                <span className="text-[9px] text-slate-500 font-black uppercase block">{t('pp_transport_info', 'Informations du transport')}</span>
                                <span className="text-slate-400 text-xs mt-1 block">{t('pp_contact_school_for_details', 'Contactez l\'école pour les détails du chauffeur et du véhicule.')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentPortal;
