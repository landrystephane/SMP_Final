import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, MapPin, Truck, Award, CheckCircle2, Eye, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const AdvisorPortal: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const MONTHS = [
        t('september', 'Septembre'), t('october', 'Octobre'), t('november', 'Novembre'),
        t('december', 'Décembre'), t('january', 'Janvier'), t('february', 'Février'),
        t('march', 'Mars'), t('april', 'Avril'), t('may', 'Mai')
    ];
    const [activeTab, setActiveTab] = useState<'PLANNING' | 'TRANSPORT' | 'EVALUATIONS'>('PLANNING');
    const [classes, setClasses] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    const [selectedRoute, setSelectedRoute] = useState<string>('');

    // Evaluation Validation states
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedTerm, setSelectedTerm] = useState<number>(1);
    const [selectedMonth, setSelectedMonth] = useState<string>('Septembre');
    const [subjectStatuses, setSubjectStatuses] = useState<any[]>([]);
    const [selectedSubjectForDetail, setSelectedSubjectForDetail] = useState<any>(null);
    const [detailGrades, setDetailGrades] = useState<any[]>([]);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const loadData = async () => {
        if (window.electronAPI && user) {
            const [c, r, studs] = await Promise.all([
                window.electronAPI.getClasses(user.schoolId),
                window.electronAPI.getBusRoutes(user.schoolId),
                window.electronAPI.getStudents(user.schoolId)
            ]);
            setClasses(c);
            setRoutes(r);
            setStudents(studs);
            if (c && c.length > 0) {
                setSelectedClass(c[0].id.toString());
            }
        }
    };

    const loadValidationStatuses = async () => {
        if (window.electronAPI && selectedClass) {
            const data = await window.electronAPI.getClassSubjectsValidationStatus({
                classId: parseInt(selectedClass),
                term: selectedTerm,
                month: selectedMonth
            });
            setSubjectStatuses(data);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    useEffect(() => {
        if (selectedClass) {
            loadValidationStatuses();
        }
    }, [selectedClass, selectedTerm, selectedMonth]);

    const handleViewSubjectDetails = async (subj: any) => {
        if (!window.electronAPI || !selectedClass) return;
        
        // Fetch grades for this class, term, month
        const allGrades = await window.electronAPI.getGrades({
            classId: parseInt(selectedClass),
            term: selectedTerm,
            month: selectedMonth
        });
        
        // Filter grades for this subject
        const subjectGrades = allGrades.filter((g: any) => g.subject_id === subj.id);
        
        // Map to students names
        const gradesList = students
            .filter((s: any) => s.class_id.toString() === selectedClass)
            .map((s: any) => {
                const gr = subjectGrades.find((g: any) => g.student_id === s.id);
                return {
                    studentName: `${s.last_name} ${s.first_name}`,
                    matricule: s.matricule,
                    score: gr ? gr.score : null
                };
            });
            
        setDetailGrades(gradesList);
        setSelectedSubjectForDetail(subj);
        setShowDetailModal(true);
    };

    const handleValidateSubject = async (subjId: number) => {
        if (!window.electronAPI || !selectedClass) return;
        try {
            await window.electronAPI.validateSubjectGrades({
                classId: parseInt(selectedClass),
                subjectId: subjId,
                term: selectedTerm,
                month: selectedMonth
            });
            
            await window.electronAPI.createNotification({
                role: 'SECRETARY',
                message: `Les notes de la classe ${classes.find(c => c.id.toString() === selectedClass)?.name || selectedClass} (${selectedMonth}, Trimestre ${selectedTerm}) ont été validées. Les bulletins sont prêts pour l'impression.`,
                type: 'ACTION_REQUIRED',
                school_id: user?.schoolId
            });

            alert(t('grades_validated_success', "Notes validées avec succès ! Cette matière est désormais visible sur les bulletins."));
            loadValidationStatuses();
        } catch (err: any) {
            alert(t('validation_error', "Erreur lors de la validation: ") + err.message);
        }
    };

    const handleLaunchGradeEntry = async () => {
        if (!window.electronAPI) return;
        if (confirm("Voulez-vous notifier tous les enseignants que la période de saisie des notes pour le " + selectedMonth + " (Trimestre " + selectedTerm + ") est ouverte ?")) {
            try {
                await window.electronAPI.createNotification({
                    role: 'TEACHER',
                    message: `La période de saisie des notes pour ${selectedMonth} (Trimestre ${selectedTerm}) est désormais OUVERTE. Merci de bien vouloir remplir vos notes à temps.`,
                    type: 'ACTION_REQUIRED',
                    school_id: user?.schoolId
                });
                alert("Tous les enseignants ont été notifiés !");
            } catch (err: any) {
                alert("Erreur lors de l'envoi de la notification: " + err.message);
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">{t('advisor_portal', 'Conseiller Pédagogique')}</h1>
                    <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest italic">{t('advisor_desc', 'Pilotage de la qualité et logistique scolaire')}</p>
                </div>
                <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                    <button onClick={() => setActiveTab('PLANNING')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'PLANNING' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t('tab_planning', 'Plannings')}</button>
                    <button onClick={() => setActiveTab('EVALUATIONS')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'EVALUATIONS' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t('tab_evaluations', 'Évaluations')}</button>
                    <button onClick={() => setActiveTab('TRANSPORT')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'TRANSPORT' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t('tab_transport', 'Transport')}</button>
                </div>
            </div>

            {activeTab === 'PLANNING' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-6">
                        <div className="glass-card p-6">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-black text-white flex items-center">
                                    <Calendar className="w-6 h-6 mr-3 text-amber-500" />
                                    {t('weekly_schedule', 'Emploi du Temps Hebdomadaire')}
                                </h2>
                                <button className="btn-primary text-[10px]">{t('schedule_class', 'PROGRAMMER COURS')}</button>
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                                <div className="p-2 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">{t('hour', 'Heure')}</div>
                                {[t('monday', 'Lundi'), t('tuesday', 'Mardi'), t('wednesday', 'Mercredi'), t('thursday', 'Jeudi'), t('friday', 'Vendredi')].map(d => (
                                    <div key={d} className="p-2 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">{d}</div>
                                ))}
                                <div className="p-4 bg-slate-950/50 rounded-xl text-[10px] font-bold text-slate-600 text-center">08:00 - 10:00</div>
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <div className="text-[10px] font-black text-amber-500 uppercase">Maths</div>
                                    <div className="text-[9px] text-white/50 mt-1 uppercase font-bold">Mballa J.</div>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl"></div>
                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <div className="text-[10px] font-black text-blue-400 uppercase">Français</div>
                                    <div className="text-[9px] text-white/50 mt-1 uppercase font-bold">Ngo J.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'EVALUATIONS' && (
                <div className="space-y-6">
                    {/* Filters Bar */}
                    <div className="glass-card p-6 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('class_label', 'Classe')}</label>
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="bg-slate-950 border border-white/5 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-44"
                                >
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({t(`section_${c.section?.toLowerCase()}`)})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('term', 'Trimestre')}</label>
                                <select
                                    value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
                                    className="bg-slate-950 border border-white/5 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-32"
                                >
                                    <option value={1}>{t('term_1', '1er Trimestre')}</option>
                                    <option value={2}>{t('term_2', '2e Trimestre')}</option>
                                    <option value={3}>{t('term_3', '3e Trimestre')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('evaluation_month', 'Mois d\'Évaluation')}</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="bg-slate-950 border border-white/5 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-40"
                                >
                                    {MONTHS.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex flex-col justify-end h-full">
                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1 opacity-0">Action</label>
                                <button
                                    onClick={handleLaunchGradeEntry}
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-blue-500 transition-all uppercase tracking-wider"
                                >
                                    Lancer la Saisie
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 px-4 py-3.5 rounded-xl border border-white/5 flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <ShieldAlert className="w-4 h-4 text-amber-500 mr-2" />
                            {t('validated_subjects_info', 'Seules les matières validées apparaîtront sur le bulletin de l\'élève.')}
                        </div>
                    </div>

                    {/* Subject validation status list */}
                    <div className="glass-card overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center">
                            <Award className="w-5 h-5 text-amber-500 mr-2" />
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">{t('subject_validation', 'Validation des notes par matière')}</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                        <th className="px-6 py-4">{t('subject', 'Matière')}</th>
                                        <th className="px-6 py-4">{t('domain_block', 'Domaine / Bloc')}</th>
                                        <th className="px-6 py-4 text-center">{t('coefficient', 'Coefficient')}</th>
                                        <th className="px-6 py-4">{t('entry_status', 'Statut Saisie')}</th>
                                        <th className="px-6 py-4 text-right">{t('actions', 'Actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-slate-900/30">
                                    {subjectStatuses.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-slate-500 font-bold text-xs">
                                                {t('no_subjects_programmed', 'Aucune matière programmée pour cette classe.')}
                                            </td>
                                        </tr>
                                    ) : (
                                        subjectStatuses.map(subj => {
                                            let statusBadge = (
                                                <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-white/5 rounded-full text-[9px] font-black uppercase tracking-wider">{t('no_grades', 'Pas de notes')}</span>
                                            );
                                            if (subj.hasGrades) {
                                                if (subj.isValidated) {
                                                    statusBadge = (
                                                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" /> {t('validated', 'Validé')}
                                                        </span>
                                                    );
                                                } else if (subj.isLocked) {
                                                    statusBadge = (
                                                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">{t('pending_validation', 'En attente de validation')}</span>
                                                    );
                                                } else {
                                                    statusBadge = (
                                                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">{t('draft', 'Brouillon')}</span>
                                                    );
                                                }
                                            }

                                            return (
                                                <tr key={subj.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 font-black text-white uppercase text-sm tracking-tight">{subj.name}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">{subj.domain || 'Général'}</td>
                                                    <td className="px-6 py-4 text-center text-xs font-bold text-white">{subj.coefficient}</td>
                                                    <td className="px-6 py-4">{statusBadge}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {subj.hasGrades && (
                                                                <button
                                                                    onClick={() => handleViewSubjectDetails(subj)}
                                                                    className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl border border-white/5 transition-all inline-flex items-center text-[10px] font-black uppercase tracking-wider"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5 mr-1" /> {t('inspect', 'Inspecter')}
                                                                </button>
                                                            )}
                                                            {subj.hasGrades && !subj.isValidated && (
                                                                <button
                                                                    onClick={() => handleValidateSubject(subj.id)}
                                                                    className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all"
                                                                >
                                                                    {t('validate_grades', 'Valider les notes')}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'TRANSPORT' && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    <div className="space-y-6">
                        <div className="glass-card p-6">
                            <h2 className="text-xl font-black text-white mb-6 flex items-center tracking-tight">
                                <Truck className="w-6 h-6 mr-3 text-amber-500" />
                                {t('bus_assignment', 'Affectation Bus')}
                            </h2>
                            <div className="space-y-4">
                                {routes.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedRoute(r.id.toString())}
                                        className={`w-full p-4 rounded-2xl border transition-all text-left group ${selectedRoute === r.id.toString() ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-white/5 border-white/5 text-slate-400 hover:border-amber-500/50'}`}
                                    >
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{t('route_id', 'Route ID')} #{r.id}</div>
                                        <div className="font-black text-sm uppercase tracking-tight">{r.name}</div>
                                        <div className={`text-[9px] mt-2 font-bold uppercase flex items-center ${selectedRoute === r.id.toString() ? 'text-slate-900' : 'text-slate-600'}`}>
                                            <MapPin className="w-3 h-3 mr-1" /> Quartier Central
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="xl:col-span-3 space-y-6">
                        {selectedRoute ? (
                            <div className="glass-card border-none shadow-2xl overflow-hidden">
                                <div className="p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight italic">{t('passengers', 'Passagers')} : {routes.find(r => r.id.toString() === selectedRoute)?.name}</h2>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('student_transport_assignment', 'Affectation des élèves au transport')}</p>
                                    </div>
                                    <button className="btn-primary text-[10px]">{t('add_passenger', 'AJOUTER PASSAGER')}</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                                <th className="px-8 py-6">{t('student', 'Élève')}</th>
                                                <th className="px-8 py-6">{t('class', 'Classe')}</th>
                                                <th className="px-8 py-6 text-right">{t('action', 'Action')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 bg-slate-900/30">
                                            {students.filter(s => s.bus_route_id?.toString() === selectedRoute).map(s => (
                                                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="font-black text-white uppercase text-sm tracking-tight">{s.last_name} {s.first_name}</div>
                                                        <div className="text-[10px] text-amber-500 font-bold tracking-tighter">Mat: {s.matricule}</div>
                                                    </td>
                                                    <td className="px-8 py-6 text-xs text-slate-400 font-black uppercase">{classes.find(c => c.id === s.class_id)?.name}</td>
                                                    <td className="px-8 py-6 text-right">
                                                        <button className="p-2.5 text-slate-500 hover:text-rose-500 transition-colors bg-white/5 rounded-xl border border-white/10"><Trash2 className="w-4 h-4" /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-30 border-2 border-dashed border-white/5">
                                <Truck className="w-20 h-20 mb-6" />
                                <p className="text-xl font-black uppercase tracking-widest">{t('select_route_passengers', 'Sélectionnez une route pour gérer les passagers')}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Grades Inspection Slide-over Drawer / Modal */}
            {showDetailModal && selectedSubjectForDetail && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">{selectedSubjectForDetail.name}</h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('class_grades_review', 'Revue des notes de la classe')}</p>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-white/5">
                                        <th className="pb-3">{t('student', 'Élève')}</th>
                                        <th className="pb-3">{t('matricule', 'Matricule')}</th>
                                        <th className="pb-3 text-right">{t('grade_out_of_20', 'Note/20')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-bold">
                                    {detailGrades.map((g, i) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors">
                                            <td className="py-3 text-white uppercase tracking-tight">{g.studentName}</td>
                                            <td className="py-3 text-slate-400 text-xs">{g.matricule}</td>
                                            <td className="py-3 text-right">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-black ${g.score === null ? 'bg-slate-800 text-slate-500' : g.score >= 10 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                    {g.score !== null ? g.score.toFixed(2) : t('absent_not_entered', 'Abs/Non saisi')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-white/5 bg-slate-950/50 flex justify-end">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="bg-slate-800 text-white hover:bg-slate-700 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            >
                                {t('close', 'Fermer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvisorPortal;
