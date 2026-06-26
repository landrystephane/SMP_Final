import React, { useState, useEffect } from 'react';
import { Archive, Download, Calendar, Search, DollarSign, Users, Award, ShieldAlert, FolderOpen, ArrowUpRight, BarChart3, Database } from 'lucide-react';
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

        const confirmArchive = window.confirm(`Attention ! Êtes-vous sûr de vouloir clôturer l'année scolaire "${yearName}" ? Une sauvegarde SQLite complète et inaltérable sera générée dans votre répertoire /backups.`);
        if (!confirmArchive) return;

        setArchiving(true);
        try {
            const res = await window.electronAPI.createSchoolYearArchive({
                schoolId: user.schoolId || 1,
                yearName: yearName.trim()
            });

            if (res.success) {
                alert(`Année scolaire clôturée avec succès ! Sauvegarde physique sauvegardée sous : ${res.backupFilePath}`);
                setYearName('');
                loadData();
            } else {
                alert(`Erreur lors de l'archivage : ${res.error || 'Erreur inconnue'}`);
            }
        } catch (err: any) {
            console.error(err);
            alert(`Erreur lors de la sauvegarde : ${err.message}`);
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
            <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Chargement des archives et journaux d'audits...</p>
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
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Archives Annuelles & Grand Livre</h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                            Clôturez vos années scolaires, gérez vos sauvegardes physiques et téléchargez vos bilans d'audits
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleDownloadAudit}
                    className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-6 py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-amber-500 hover:text-slate-950 active:scale-95 transition-all shadow-xl"
                >
                    <Download className="w-4 h-4" /> Télécharger l'Audit Annuel (PDF)
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
                                <h2 className="text-sm font-black uppercase text-white tracking-wider">Livre Journal des Transactions Actives</h2>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="relative bg-slate-950 rounded-xl border border-white/5 flex items-center px-3.5 py-2">
                                    <Search className="w-3.5 h-3.5 text-slate-500 mr-2" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Nom, reçu, matricule..."
                                        className="bg-transparent text-xs font-bold text-white outline-none w-32 md:w-48 placeholder-slate-600"
                                    />
                                </div>

                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="bg-slate-950 border border-white/5 text-slate-300 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                                >
                                    <option value="ALL">Tous les Motifs</option>
                                    <option value="Inscription">Inscriptions</option>
                                    <option value="Scolarité">Scolarités</option>
                                    <option value="Transport">Transports</option>
                                    <option value="Examen">Examens</option>
                                </select>
                            </div>
                        </div>

                        {/* Transaction Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                        <th className="py-4">Reçu N°</th>
                                        <th className="py-4">Élève (Student)</th>
                                        <th className="py-4">Type</th>
                                        <th className="py-4">Date</th>
                                        <th className="py-4 text-right">Montant (FCFA)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-bold text-slate-300">
                                    {filteredPayments.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-500 uppercase tracking-widest text-[10px]">
                                                Aucune transaction enregistrée
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
                            <h2 className="text-sm font-black uppercase tracking-wider text-white">Clôture Annuelle de l'École</h2>
                        </div>
                        <p className="text-slate-400 text-[10px] font-bold leading-relaxed">
                            Cette action sauvegarde l'état actuel complet de la base de données (élèves, notes, versements) dans un fichier d'archives SQLite physique dans votre répertoire local `/backups`.
                        </p>

                        <form onSubmit={handleCreateArchive} className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Libellé de l'Année Scolaire</label>
                                <input
                                    type="text"
                                    required
                                    value={yearName}
                                    onChange={(e) => setYearName(e.target.value)}
                                    placeholder="Ex: 2025-2026"
                                    className="w-full bg-slate-950 border border-white/5 rounded-2xl px-4 py-3 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-red-500 transition-all placeholder-slate-600"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={archiving}
                                className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                            >
                                <Database className="w-4 h-4" /> {archiving ? 'Archivage...' : "Lancer l'Archivage Physique"}
                            </button>
                        </form>
                    </div>

                    {/* Archived Years timeline history */}
                    <div className="glass-card p-6 bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-[32px] shadow-2xl space-y-5">
                        <div className="flex items-center space-x-3 text-amber-500">
                            <Archive className="w-5 h-5" />
                            <h2 className="text-sm font-black uppercase text-white tracking-wider">Années Scolaires Clôturées</h2>
                        </div>

                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                            {archives.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 uppercase tracking-widest text-[9px] font-bold">
                                    Aucun historique d'archive physique
                                </div>
                            ) : (
                                archives.map((a) => (
                                    <div key={a.id} className="bg-slate-950 p-4.5 rounded-2xl border border-white/5 hover:border-amber-500/20 transition-all space-y-3 relative group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4 text-amber-500" />
                                                <span className="text-xs font-black text-white">{a.year_name}</span>
                                            </div>
                                            <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded uppercase tracking-wider">
                                                Sauvegardé
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 text-[9px] font-black uppercase tracking-wider text-slate-400 border-t border-white/5 pt-2">
                                            <div>
                                                <p className="text-slate-600">Élèves</p>
                                                <p className="text-white text-xs mt-0.5">{a.total_students}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-600">Recettes</p>
                                                <p className="text-white text-[10px] mt-0.5">{a.total_revenue.toLocaleString()} F</p>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900/50 p-2 rounded-xl flex items-center space-x-2 text-[8px] text-slate-500 font-bold overflow-hidden truncate">
                                            <FolderOpen className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                            <span className="truncate" title={a.backup_file_path}>{a.backup_file_path}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AnnualArchives;
