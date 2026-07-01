import React, { useState, useEffect } from 'react';
import { Archive, Download, Calendar, Search, DollarSign, Users, Award, ShieldAlert, FolderOpen, ArrowUpRight, BarChart3, Database, ChevronDown, ChevronUp, BookOpen, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const AnnualArchives: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [archives, setArchives] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [schools, setSchools] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [archiving, setArchiving] = useState(false);
    const [yearName, setYearName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [expandedArchive, setExpandedArchive] = useState<number | null>(null);
    const [archiveTab, setArchiveTab] = useState<'students' | 'payments' | 'grades' | 'attendance' | 'schedules' | 'expenses'>('students');

    const loadData = async () => {
        setLoading(true);
        if (window.electronAPI && user) {
            const sid = user.schoolId;
            if (!sid) { setLoading(false); return; }
            const arch = await window.electronAPI.getSchoolArchives(sid);
            const p = await window.electronAPI.getPayments(sid);
            const s = await window.electronAPI.getStudents(sid);
            const c = await window.electronAPI.getClasses(sid);
            const schs = await window.electronAPI.getSchools();
            setArchives(arch || []);
            setPayments(p || []);
            setStudents(s || []);
            setClasses(c || []);
            setSchools(schs || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const handleCreateArchive = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!yearName.trim()) return;
        if (!window.electronAPI || !user) return;

        const confirmArchive = window.confirm(t('arch_confirm_create', 'Attention ! Êtes-vous sûr de vouloir clôturer l\'année scolaire "{{yearName}}" ? Une sauvegarde SQLite complète et inaltérable sera générée dans votre répertoire /backups.', { yearName }));
        if (!confirmArchive) return;

        setArchiving(true);
        try {
            const res = await window.electronAPI.createSchoolYearArchive({
                schoolId: user.schoolId || 1,
                yearName: yearName.trim()
            });

            if (res.success) {
                alert(t('arch_success', 'Année scolaire clôturée avec succès ! Sauvegarde physique sauvegardée sous : {{path}}', { path: res.backupFilePath }));
                setYearName('');
                loadData();
            } else {
                alert(t('arch_error', 'Erreur lors de l\'archivage : {{error}}', { error: res.error || t('arch_unknown_error', 'Erreur inconnue') }));
            }
        } catch (err: any) {
            console.error(err);
            alert(t('arch_save_error', 'Erreur lors de la sauvegarde : {{message}}', { message: err.message }));
        } finally {
            setArchiving(false);
        }
    };

    const handleDownloadAudit = () => {
        if (!window.electronAPI || !user) return;
        const mySchool = schools.find(s => s.id?.toString() === user.schoolId?.toString()) || schools[0] || { name: '' };
        
        // Calculate dynamic stats
        const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);

        import('../utils/reports').then(m => {
            m.generateAnnualAuditReport({
                school: mySchool,
                yearName: `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
                stats: {
                    totalStudents: students.length,
                    totalRevenue: totalRevenue
                },
                payments: payments,
                students: students,
                classes: classes
            });
        });
    };

    // Filter payments
    const filteredPayments = payments.filter(p => {
        const stud = students.find(s => s.id === p.student_id) || { last_name: '', first_name: '', matricule: '' };
        const fullName = `${stud.last_name} ${stud.first_name}`.toLowerCase();
        const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                              p.receipt_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              stud.matricule.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'ALL' || p.payment_type === filterType;
        return matchesSearch && matchesType;
    });

    const activeSchool = schools.find(s => s.id?.toString() === user?.schoolId?.toString()) || schools[0];
    const totalTuition = payments.reduce((acc, p) => acc + p.amount, 0);

    if (loading) return (
        <div className="h-[50vh] flex flex-col items-center justify-center space-y-4">
            <Archive className="w-12 h-12 text-amber-500 animate-pulse" />
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">{t('arch_loading', "Chargement des archives et journaux d'audits...")}</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-8 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center space-x-5">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                        <Archive className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">{t('arch_title', 'Archives Annuelles & Grand Livre')}</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                            {t('arch_subtitle', 'Clôturez vos années scolaires, gérez vos sauvegardes physiques et téléchargez vos bilans d\'audits')}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleDownloadAudit}
                    className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-6 py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-amber-500 hover:text-slate-950 active:scale-95 transition-all shadow-xl"
                >
                    <Download className="w-4 h-4" /> {t('arch_download_audit', "Télécharger l'Audit Annuel (PDF)")}
                </button>
            </div>

            {/* Main grid dashboard */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* Transaction Logs Column */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="glass-card p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] shadow-2xl space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                            <div className="flex items-center space-x-3 text-amber-500">
                                <BarChart3 className="w-5 h-5" />
                                <h2 className="text-sm font-black uppercase text-white tracking-wider">{t('arch_journal_title', 'Livre Journal des Transactions Actives')}</h2>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative bg-slate-950 rounded-xl border border-white/5 flex items-center px-3.5 py-2">
                                    <Search className="w-3.5 h-3.5 text-slate-500 mr-2" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('arch_search_placeholder', 'Nom, reçu, matricule...')}
                                        className="bg-transparent text-xs font-bold text-white outline-none w-32 md:w-48 placeholder-slate-600"
                                    />
                                </div>

                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="bg-slate-950 border border-white/5 text-slate-300 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                                >
                                    <option value="ALL">{t('arch_all_reasons', 'Tous les Motifs')}</option>
                                    <option value="Inscription">{t('arch_reason_registration', 'Inscriptions')}</option>
                                    <option value="Scolarité">{t('arch_reason_tuition', 'Scolarités')}</option>
                                    <option value="Transport">{t('arch_reason_transport', 'Transports')}</option>
                                    <option value="Examen">{t('arch_reason_exam', 'Examens')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Transaction Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                        <th className="py-4">{t('arch_receipt_no', 'Reçu N°')}</th>
                                        <th className="py-4">{t('arch_student_col', 'Élève (Student)')}</th>
                                        <th className="py-4">{t('arch_type_col', 'Type')}</th>
                                        <th className="py-4">{t('arch_date_col', 'Date')}</th>
                                        <th className="py-4 text-right">{t('arch_amount_col', 'Montant (FCFA)')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-bold text-slate-300">
                                    {filteredPayments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-500 uppercase tracking-widest text-[10px]">
                                                {t('arch_no_transactions', 'Aucune transaction enregistrée')}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredPayments.map((p) => {
                                            const stud = students.find(s => s.id === p.student_id) || { last_name: 'N/A', first_name: '', matricule: '' };
                                            return (
                                                <tr key={p.id} className="hover:bg-white/2 transition-colors">
                                                    <td className="py-4 font-black text-amber-500">{p.receipt_number}</td>
                                                    <td className="py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-white text-xs font-black">{stud.last_name} {stud.first_name}</span>
                                                            <span className="text-[9px] text-slate-500">{stud.matricule}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                            p.payment_type === 'Transport' ? 'bg-indigo-500/10 text-indigo-400' :
                                                            p.payment_type === 'Inscription' ? 'bg-emerald-500/10 text-emerald-400' :
                                                            'bg-amber-500/10 text-amber-400'
                                                        }`}>
                                                            {p.payment_type}
                                                        </span>
                                                    </td>
                                                     <td className="py-4 text-slate-500 text-[10px]">{new Date(p.payment_date).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR')}</td>
                                                    <td className="py-4 text-right font-black text-white text-xs">{p.amount.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Backups & Year End Closure Column */}
                <div className="space-y-6">
                    {/* Trigger Year Closure card */}
                    <div className="glass-card p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] shadow-2xl space-y-4">
                        <div className="flex items-center space-x-3 text-red-400">
                            <ShieldAlert className="w-5 h-5 animate-pulse" />
                            <h2 className="text-sm font-black uppercase tracking-wider text-white">{t('arch_year_closure_title', "Clôture Annuelle de l'École")}</h2>
                        </div>
                        <p className="text-slate-400 text-[10px] font-bold leading-relaxed">
                            {t('arch_year_closure_desc', "Cette action sauvegarde l'état actuel complet de la base de données (élèves, notes, versements) dans un fichier d'archives SQLite physique dans votre répertoire local `/backups`.")}
                        </p>

                        <form onSubmit={handleCreateArchive} className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{t('arch_year_label', "Libellé de l'Année Scolaire")}</label>
                                <input
                                    type="text"
                                    required
                                    value={yearName}
                                    onChange={(e) => setYearName(e.target.value)}
                                    placeholder={t('arch_year_placeholder', 'Ex: 2025-2026')}
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-red-500 transition-all placeholder-slate-600"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={archiving}
                                className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Database className="w-4 h-4" /> {archiving ? t('arch_archiving_progress', 'Archivage...') : t('arch_launch_archive', "Lancer l'Archivage Physique")}
                            </button>
                        </form>
                    </div>

                    {/* Archived Years timeline history */}
                    <div className="glass-card p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] shadow-2xl space-y-5">
                        <div className="flex items-center space-x-3 text-amber-500">
                            <Archive className="w-5 h-5" />
                            <h2 className="text-sm font-black uppercase text-white tracking-wider">{t('arch_closed_years_title', 'Années Scolaires Clôturées')}</h2>
                        </div>

                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                            {archives.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                                    {t('arch_no_archive_history', "Aucun historique d'archive physique")}
                                </div>
                            ) : (
                                archives.map((a) => {
                                    let snap: any = null;
                                    try { if (a.archive_snapshot) snap = JSON.parse(a.archive_snapshot); } catch(e) {}
                                    const isExpanded = expandedArchive === a.id;
                                    return (
                                    <div key={a.id} className="bg-slate-950 rounded-2xl border border-white/5 hover:border-amber-500/20 transition-all relative">
                                        {/* Archive header */}
                                        <div className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center space-x-2">
                                                    <Calendar className="w-4 h-4 text-amber-500" />
                                                    <span className="text-xs font-black text-white">{a.year_name}</span>
                                                </div>
                                                <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wider">
                                                    {t('arch_saved_badge', 'Sauvegardé')}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-[9px] font-black uppercase tracking-wider border-t border-white/5 pt-2">
                                                <div>
                                                    <p className="text-slate-600">{t('arch_students_label', 'Élèves')}</p>
                                                    <p className="text-white text-xs mt-0.5">{snap ? snap.students?.length : a.total_students}</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-600">{t('arch_revenue_label', 'Recettes')}</p>
                                                    <p className="text-white text-[10px] mt-0.5">{(snap ? snap.stats?.totalRevenue : a.total_revenue || 0).toLocaleString()} F</p>
                                                </div>
                                                <div>
                                                    <p className="text-slate-600">{t('arch_avg_grade', 'Moy. Gén.')}</p>
                                                    <p className="text-white text-[10px] mt-0.5">{(snap?.stats?.averageGrade || a.average_grade || 0).toFixed(2)}</p>
                                                </div>
                                            </div>
                                            <div className="bg-slate-900/50 p-2 rounded-xl flex items-center space-x-2 text-[8px] text-slate-500 font-bold overflow-hidden truncate">
                                                <FolderOpen className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                                <span className="truncate" title={a.backup_file_path}>{a.backup_file_path}</span>
                                            </div>
                                            {snap && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setExpandedArchive(isExpanded ? null : a.id); setArchiveTab('students'); }}
                                                    className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest"
                                                >
                                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                    {isExpanded ? t('arch_hide_details', 'Masquer le détail') : t('arch_show_details', 'Voir tout le détail')}
                                                </button>
                                            )}
                                        </div>

                                        {/* Expanded snapshot detail */}
                                        {isExpanded && snap && (
                                            <div className="border-t border-white/5 p-4 space-y-3">
                                                {/* Tab bar */}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {([
                                                        { key: 'students', label: `Élèves (${snap.students?.length || 0})`, icon: Users },
                                                        { key: 'payments', label: `Paiements (${snap.payments?.length || 0})`, icon: DollarSign },
                                                        { key: 'grades', label: `Notes (${snap.grades?.length || 0})`, icon: Award },
                                                        { key: 'attendance', label: `Présences (${snap.attendance?.length || 0})`, icon: Clock },
                                                        { key: 'schedules', label: `Emploi du Temps (${(snap.schedules?.length || 0) + (snap.weekly_schedules?.length || 0)})`, icon: BookOpen },
                                                        { key: 'expenses', label: `Dépenses (${snap.expenses?.length || 0})`, icon: BarChart3 },
                                                    ] as const).map(tab => (
                                                        <button key={tab.key} type="button" onClick={() => setArchiveTab(tab.key)}
                                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${archiveTab === tab.key ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                                                            <tab.icon className="w-3 h-3" />{tab.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Tab content */}
                                                <div className="max-h-64 overflow-y-auto rounded-xl border border-white/5 bg-slate-950/50">
                                                    {archiveTab === 'students' && (
                                                        <table className="w-full text-[10px]">
                                                            <thead className="sticky top-0 bg-slate-950"><tr className="text-slate-500 font-black uppercase">
                                                                <th className="px-3 py-2 text-left">Matricule</th><th className="px-3 py-2 text-left">Nom</th><th className="px-3 py-2 text-left">Statut</th>
                                                            </tr></thead>
                                                            <tbody>{(snap.students || []).map((s: any) => (
                                                                <tr key={s.id} className="border-t border-white/5">
                                                                    <td className="px-3 py-1.5 text-amber-400 font-black">{s.matricule}</td>
                                                                    <td className="px-3 py-1.5 text-white font-bold">{s.last_name} {s.first_name}</td>
                                                                    <td className="px-3 py-1.5"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{s.status}</span></td>
                                                                </tr>
                                                            ))}</tbody>
                                                        </table>
                                                    )}
                                                    {archiveTab === 'payments' && (
                                                        <table className="w-full text-[10px]">
                                                            <thead className="sticky top-0 bg-slate-950"><tr className="text-slate-500 font-black uppercase">
                                                                <th className="px-3 py-2 text-left">Reçu</th><th className="px-3 py-2 text-left">Élève</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-right">Montant</th>
                                                            </tr></thead>
                                                            <tbody>{(snap.payments || []).map((p: any, i: number) => (
                                                                <tr key={i} className="border-t border-white/5">
                                                                    <td className="px-3 py-1.5 text-amber-400 font-black">{p.receipt_number}</td>
                                                                    <td className="px-3 py-1.5 text-white font-bold">{p.last_name} {p.first_name}</td>
                                                                    <td className="px-3 py-1.5 text-slate-400">{p.payment_type}</td>
                                                                    <td className="px-3 py-1.5 text-slate-500">{p.payment_date?.slice(0,10)}</td>
                                                                    <td className="px-3 py-1.5 text-right text-emerald-400 font-black">{(p.amount || 0).toLocaleString()} F</td>
                                                                </tr>
                                                            ))}</tbody>
                                                        </table>
                                                    )}
                                                    {archiveTab === 'grades' && (
                                                        <table className="w-full text-[10px]">
                                                            <thead className="sticky top-0 bg-slate-950"><tr className="text-slate-500 font-black uppercase">
                                                                <th className="px-3 py-2 text-left">Élève</th><th className="px-3 py-2 text-left">Matière</th><th className="px-3 py-2 text-center">Note</th><th className="px-3 py-2 text-left">Période</th>
                                                            </tr></thead>
                                                            <tbody>{(snap.grades || []).map((g: any, i: number) => (
                                                                <tr key={i} className="border-t border-white/5">
                                                                    <td className="px-3 py-1.5 text-white font-bold">{g.last_name} {g.first_name}</td>
                                                                    <td className="px-3 py-1.5 text-slate-400">{g.subject_name || g.subject_id}</td>
                                                                    <td className="px-3 py-1.5 text-center font-black text-amber-400">{g.score}</td>
                                                                    <td className="px-3 py-1.5 text-slate-500">T{g.term} {g.month}</td>
                                                                </tr>
                                                            ))}</tbody>
                                                        </table>
                                                    )}
                                                    {archiveTab === 'attendance' && (
                                                        <table className="w-full text-[10px]">
                                                            <thead className="sticky top-0 bg-slate-950"><tr className="text-slate-500 font-black uppercase">
                                                                <th className="px-3 py-2 text-left">Élève</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-center">Statut</th><th className="px-3 py-2 text-center">Heures abs.</th>
                                                            </tr></thead>
                                                            <tbody>{(snap.attendance || []).map((a: any, i: number) => (
                                                                <tr key={i} className="border-t border-white/5">
                                                                    <td className="px-3 py-1.5 text-white font-bold">{a.last_name} {a.first_name}</td>
                                                                    <td className="px-3 py-1.5 text-slate-400">{a.date}</td>
                                                                    <td className="px-3 py-1.5 text-center"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${a.status === 'PRESENT' ? 'text-emerald-400' : a.status === 'JUSTIFIED' ? 'text-blue-400' : 'text-rose-400'}`}>{a.status}</span></td>
                                                                    <td className="px-3 py-1.5 text-center text-slate-400">{a.hours_absent || 0}</td>
                                                                </tr>
                                                            ))}</tbody>
                                                        </table>
                                                    )}
                                                    {archiveTab === 'schedules' && (
                                                        <table className="w-full text-[10px]">
                                                            <thead className="sticky top-0 bg-slate-950"><tr className="text-slate-500 font-black uppercase">
                                                                <th className="px-3 py-2 text-left">Classe</th><th className="px-3 py-2 text-left">Jour</th><th className="px-3 py-2 text-left">Horaire</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Semaine</th>
                                                            </tr></thead>
                                                            <tbody>{[...(snap.schedules || []), ...(snap.weekly_schedules || [])].map((s: any, i: number) => {
                                                                const days = ['','Lun','Mar','Mer','Jeu','Ven','Sam'];
                                                                return (
                                                                <tr key={i} className="border-t border-white/5">
                                                                    <td className="px-3 py-1.5 text-slate-400">{s.class_id}</td>
                                                                    <td className="px-3 py-1.5 text-white font-bold">{days[s.day_of_week] || s.day_of_week}</td>
                                                                    <td className="px-3 py-1.5 text-amber-400">{s.start_time}–{s.end_time}</td>
                                                                    <td className="px-3 py-1.5 text-slate-400">{s.type}</td>
                                                                    <td className="px-3 py-1.5 text-slate-500 text-[8px]">{s.week_start_date || 'Template'}</td>
                                                                </tr>
                                                                );
                                                            })}</tbody>
                                                        </table>
                                                    )}
                                                    {archiveTab === 'expenses' && (
                                                        <table className="w-full text-[10px]">
                                                            <thead className="sticky top-0 bg-slate-950"><tr className="text-slate-500 font-black uppercase">
                                                                <th className="px-3 py-2 text-left">Libellé</th><th className="px-3 py-2 text-left">Catégorie</th><th className="px-3 py-2 text-left">Statut</th><th className="px-3 py-2 text-right">Montant</th>
                                                            </tr></thead>
                                                            <tbody>{(snap.expenses || []).map((e: any, i: number) => (
                                                                <tr key={i} className="border-t border-white/5">
                                                                    <td className="px-3 py-1.5 text-white font-bold">{e.label || e.description}</td>
                                                                    <td className="px-3 py-1.5 text-slate-400">{e.category}</td>
                                                                    <td className="px-3 py-1.5"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${e.status === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'}`}>{e.status}</span></td>
                                                                    <td className="px-3 py-1.5 text-right text-rose-400 font-black">{(e.amount || 0).toLocaleString()} F</td>
                                                                </tr>
                                                            ))}</tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AnnualArchives;
