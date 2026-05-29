import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, MapPin, Truck, Award, CheckCircle2, Eye, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const AdvisorPortal: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const MONTHS = [
        { key: 'month_oct', label: t('month_oct', 'Octobre') },
        { key: 'month_nov', label: t('month_nov', 'Novembre') },
        { key: 'month_dec', label: t('month_dec', 'Décembre') },
        { key: 'month_jan', label: t('month_jan', 'Janvier') },
        { key: 'month_feb', label: t('month_feb', 'Février') },
        { key: 'month_mar', label: t('month_mar', 'Mars') },
        { key: 'month_apr', label: t('month_apr', 'Avril') },
        { key: 'month_may', label: t('month_may', 'Mai') },
        { key: 'month_jun', label: t('month_jun', 'Juin') }
    ];
    const [activeTab, setActiveTab] = useState<'PLANNING' | 'TRANSPORT' | 'EVALUATIONS'>('PLANNING');
    const [classes, setClasses] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    const [selectedRoute, setSelectedRoute] = useState<string>('');

    // Evaluation Validation states
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedTerm, setSelectedTerm] = useState<number>(1);
    const [selectedMonth, setSelectedMonth] = useState<string>('month_oct');

    const monthLabel = MONTHS.find(m => m.key === selectedMonth)?.label || selectedMonth;
    const [subjectStatuses, setSubjectStatuses] = useState<any[]>([]);
    const [selectedSubjectForDetail, setSelectedSubjectForDetail] = useState<any>(null);
    const [detailGrades, setDetailGrades] = useState<any[]>([]);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Schedule / Planning states
    const [schedules, setSchedules] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [classSubjects, setClassSubjects] = useState<any[]>([]);

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<any>(null);
    const [schedDay, setSchedDay] = useState<number>(1);
    const [schedStart, setSchedStart] = useState<string>('08:00');
    const [schedEnd, setSchedEnd] = useState<string>('10:00');
    const [schedSubject, setSchedSubject] = useState<string>('');
    const [schedTeacher, setSchedTeacher] = useState<string>('');
    const [schedType, setSchedType] = useState<string>('COURSE');

    const loadData = async () => {
        if (window.electronAPI && user) {
            const [c, r, studs, allUsers] = await Promise.all([
                window.electronAPI.getClasses(user.schoolId),
                window.electronAPI.getBusRoutes(user.schoolId),
                window.electronAPI.getStudents(user.schoolId),
                window.electronAPI.getUsers(user.schoolId)
            ]);
            setClasses(c);
            setRoutes(r);
            setStudents(studs);
            setTeachers(allUsers.filter((u: any) => u.role === 'TEACHER'));
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

    const loadSchedules = async () => {
        if (window.electronAPI && selectedClass) {
            try {
                const allSchedules = await window.electronAPI.getSchedules(user?.schoolId);
                const filtered = allSchedules.filter((s: any) => s.class_id?.toString() === selectedClass?.toString());
                setSchedules(filtered);
            } catch (e) {
                console.error("Failed to load schedules", e);
            }
        }
    };

    const loadClassSubjects = async () => {
        if (window.electronAPI && selectedClass) {
            try {
                const subs = await window.electronAPI.getClassSubjects(parseInt(selectedClass));
                setClassSubjects(subs);
            } catch (e) {
                console.error("Failed to load class subjects", e);
            }
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    useEffect(() => {
        if (selectedClass) {
            loadValidationStatuses();
            loadSchedules();
            loadClassSubjects();
        }
    }, [selectedClass, selectedTerm, selectedMonth]);

    const handleOpenScheduleModal = (existing: any = null, day: number = 1, start: string = '08:00', end: string = '10:00') => {
        if (existing) {
            setEditingSchedule(existing);
            setSchedDay(existing.day_of_week);
            setSchedStart(existing.start_time);
            setSchedEnd(existing.end_time);
            setSchedSubject(existing.subject_id?.toString() || '');
            setSchedTeacher(existing.teacher_id?.toString() || '');
            setSchedType(existing.type || 'COURSE');
        } else {
            setEditingSchedule(null);
            setSchedDay(day);
            setSchedStart(start);
            setSchedEnd(end);
            setSchedSubject(classSubjects[0]?.id?.toString() || '');
            setSchedTeacher(teachers[0]?.id?.toString() || '');
            setSchedType('COURSE');
        }
        setShowScheduleModal(true);
    };

    const handleSaveSchedule = async () => {
        if (!window.electronAPI || !selectedClass) return;
        if (!schedSubject) {
            alert("Veuillez sélectionner une matière.");
            return;
        }
        try {
            const payload = {
                id: editingSchedule ? editingSchedule.id : undefined,
                class_id: parseInt(selectedClass),
                subject_id: parseInt(schedSubject),
                teacher_id: schedTeacher ? parseInt(schedTeacher) : null,
                day_of_week: schedDay,
                start_time: schedStart,
                end_time: schedEnd,
                type: schedType,
                school_id: user?.schoolId
            };
            
            await window.electronAPI.updateSchedule(payload);
            alert("Emploi du temps mis à jour avec succès !");
            setShowScheduleModal(false);
            loadSchedules();
        } catch (err: any) {
            alert("Erreur lors de l'enregistrement de l'emploi du temps : " + err.message);
        }
    };

    const handleDeleteSchedule = async (id: number) => {
        if (!window.electronAPI) return;
        if (confirm("Voulez-vous supprimer ce cours de l'emploi du temps ?")) {
            try {
                await (window.electronAPI as any).deleteSchedule(id);
                alert("Cours supprimé avec succès !");
                setShowScheduleModal(false);
                loadSchedules();
            } catch (err: any) {
                alert("Erreur lors de la suppression : " + err.message);
            }
        }
    };

    const getSubjectName = (subId: number) => classSubjects.find(s => s.id === subId)?.name || `Matière #${subId}`;
    const getTeacherName = (tId: number) => teachers.find(t => t.id === tId)?.fullName || `Enseignant #${tId}`;
    const getScheduleForSlot = (day: number, start: string) => {
        return schedules.find(s => s.day_of_week === day && s.start_time === start);
    };

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
            .filter((s: any) => s.class_id?.toString() === selectedClass?.toString())
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
                message: `Les notes de la classe ${classes.find(c => c.id.toString() === selectedClass)?.name || selectedClass} (${monthLabel}, Trimestre ${selectedTerm}) ont été validées. Les bulletins sont prêts pour l'impression.`,
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
        try {
            if (!window.electronAPI) {
                alert("Erreur : API Electron non disponible");
                return;
            }
            if (confirm("Voulez-vous notifier tous les enseignants que la période de saisie des notes pour " + monthLabel + " (Trimestre " + selectedTerm + ") est ouverte ?")) {
                const res = await window.electronAPI.createNotification({
                    role: 'TEACHER',
                    message: `La période de saisie des notes pour ${monthLabel} (Trimestre ${selectedTerm}) est désormais OUVERTE. Merci de bien vouloir remplir vos notes à temps.`,
                    type: 'ACTION_REQUIRED',
                    school_id: user?.schoolId
                });
                if (res && res.error) {
                    alert("Erreur base de données : " + res.error);
                } else {
                    alert("Tous les enseignants ont été notifiés !");
                }
            }
        } catch (err: any) {
            alert("Erreur lors de la notification: " + err.message);
        }
    };

    const DAYS_OF_WEEK = [
        { key: 1, label: t('monday', 'Lundi') },
        { key: 2, label: t('tuesday', 'Mardi') },
        { key: 3, label: t('wednesday', 'Mercredi') },
        { key: 4, label: t('thursday', 'Jeudi') },
        { key: 5, label: t('friday', 'Vendredi') }
    ];

    const TIME_SLOTS = [
        { label: '08:00 - 10:00', start: '08:00', end: '10:00', isBreak: false },
        { label: '10:00 - 12:00', start: '10:00', end: '12:00', isBreak: false },
        { label: '12:00 - 13:00', start: '12:00', end: '13:00', isBreak: true },
        { label: '13:00 - 15:00', start: '13:00', end: '15:00', isBreak: false },
        { label: '15:00 - 17:00', start: '15:00', end: '17:00', isBreak: false }
    ];

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

            {/* Shared Filters Bar */}
            <div className="glass-card p-6 flex flex-wrap gap-4 items-center justify-between bg-slate-900/40 border-slate-800">
                <div className="flex flex-wrap gap-4 items-center">
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('class_label', 'Classe')}</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-44"
                        >
                            <option value="">{t('choose_class', 'Choisir une classe')}</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({t(`section_${c.section?.toLowerCase()}`)})</option>
                            ))}
                        </select>
                    </div>

                    {(activeTab === 'PLANNING' || activeTab === 'EVALUATIONS') && (
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('term', 'Trimestre')}</label>
                            <select
                                value={selectedTerm}
                                onChange={(e) => setSelectedTerm(parseInt(e.target.value))}
                                className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-32"
                            >
                                <option value={1}>{t('term_1', '1er Trimestre')}</option>
                                <option value={2}>{t('term_2', '2e Trimestre')}</option>
                                <option value={3}>{t('term_3', '3e Trimestre')}</option>
                            </select>
                        </div>
                    )}

                    {activeTab === 'EVALUATIONS' && (
                        <>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('evaluation_month', 'Mois d\'Évaluation')}</label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-40"
                                >
                                    {MONTHS.map(m => (
                                        <option key={m.key} value={m.key}>{m.label}</option>
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
                        </>
                    )}
                </div>

                {activeTab === 'EVALUATIONS' && (
                    <div className="bg-slate-900/50 px-4 py-3.5 rounded-xl border border-white/5 flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <ShieldAlert className="w-4 h-4 text-amber-500 mr-2" />
                        {t('validated_subjects_info', 'Seules les matières validées apparaîtront sur le bulletin de l\'élève.')}
                    </div>
                )}
            </div>

            {activeTab === 'PLANNING' && (
                <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-300">
                    <div className="space-y-6">
                        <div className="glass-card p-6 border-slate-800">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-black text-white flex items-center">
                                    <Calendar className="w-6 h-6 mr-3 text-amber-500" />
                                    {t('weekly_schedule', 'Emploi du Temps Hebdomadaire')}
                                </h2>
                                <button 
                                    onClick={() => handleOpenScheduleModal()} 
                                    className="btn-primary text-[10px]"
                                    disabled={!selectedClass}
                                >
                                    {t('schedule_class', 'PROGRAMMER COURS')}
                                </button>
                            </div>

                            {!selectedClass ? (
                                <div className="p-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                    Veuillez choisir une classe dans le filtre ci-dessus pour gérer son emploi du temps.
                                </div>
                            ) : (
                                <div className="grid grid-cols-6 gap-3">
                                    {/* Header */}
                                    <div className="p-3 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">{t('hour', 'Heure')}</div>
                                    {DAYS_OF_WEEK.map(d => (
                                        <div key={d.key} className="p-3 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">{d.label}</div>
                                    ))}

                                    {/* Rows */}
                                    {TIME_SLOTS.map(slot => (
                                        <React.Fragment key={slot.label}>
                                            {/* Time slot column */}
                                            <div className="p-4 bg-slate-950/50 rounded-xl text-[10px] font-black text-slate-400 text-center flex items-center justify-center border border-slate-800">
                                                {slot.label}
                                            </div>

                                            {/* Days columns */}
                                            {DAYS_OF_WEEK.map(day => {
                                                if (slot.isBreak) {
                                                    return (
                                                        <div key={day.key} className="p-4 bg-slate-900/10 border border-dashed border-slate-800 rounded-xl text-[10px] font-bold text-slate-600 text-center flex items-center justify-center uppercase tracking-widest">
                                                            Pause
                                                        </div>
                                                    );
                                                }

                                                const sData = getScheduleForSlot(day.key, slot.start);
                                                if (sData) {
                                                    const typeColor = sData.type === 'EVALUATION' 
                                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                                                        : sData.type === 'HOLIDAY'
                                                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                                            : 'bg-amber-500/10 border-amber-500/20 text-amber-500';
                                                    
                                                    return (
                                                        <button
                                                            key={day.key}
                                                            onClick={() => handleOpenScheduleModal(sData)}
                                                            className={`p-4 rounded-xl border text-left hover:scale-[1.02] active:scale-95 transition-all w-full flex flex-col justify-between ${typeColor}`}
                                                        >
                                                            <div>
                                                                <div className="text-[10px] font-black uppercase truncate">{getSubjectName(sData.subject_id)}</div>
                                                                <div className="text-[8px] text-white/50 mt-1 uppercase font-bold truncate">{getTeacherName(sData.teacher_id)}</div>
                                                            </div>
                                                            <div className="text-[7px] font-black uppercase tracking-wider mt-2 opacity-50">
                                                                {sData.type || 'COURS'}
                                                            </div>
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        key={day.key}
                                                        onClick={() => handleOpenScheduleModal(null, day.key, slot.start, slot.end)}
                                                        className="p-4 bg-white/5 border border-white/5 hover:border-amber-500/30 hover:bg-amber-500/5 rounded-xl text-slate-700 hover:text-amber-500 transition-all flex items-center justify-center group"
                                                    >
                                                        <span className="text-xs font-black opacity-0 group-hover:opacity-100 transition-all">+ PROGRAMMER</span>
                                                    </button>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'EVALUATIONS' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Subject validation status list */}
                    <div className="glass-card overflow-hidden border-slate-800">
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
                                    {!selectedClass ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-slate-500 font-bold text-xs">
                                                Veuillez sélectionner une classe pour charger les matières.
                                            </td>
                                        </tr>
                                    ) : subjectStatuses.length === 0 ? (
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

            {/* Course Programming Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 text-left">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                                    {editingSchedule ? "Modifier le Cours" : "Programmer un Cours"}
                                </h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                                    {editingSchedule ? "Modifier la programmation horaire" : "Ajouter un nouveau cours à l'emploi du temps"}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowScheduleModal(false)}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Jour de la semaine</label>
                                <select
                                    value={schedDay}
                                    onChange={(e) => setSchedDay(parseInt(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    {DAYS_OF_WEEK.map(d => (
                                        <option key={d.key} value={d.key}>{d.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Heure Début</label>
                                    <input
                                        type="text"
                                        placeholder="ex: 08:00"
                                        value={schedStart}
                                        onChange={(e) => setSchedStart(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Heure Fin</label>
                                    <input
                                        type="text"
                                        placeholder="ex: 10:00"
                                        value={schedEnd}
                                        onChange={(e) => setSchedEnd(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Matière</label>
                                <select
                                    value={schedSubject}
                                    onChange={(e) => setSchedSubject(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="">Sélectionner une matière</option>
                                    {classSubjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Enseignant</label>
                                <select
                                    value={schedTeacher}
                                    onChange={(e) => setSchedTeacher(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="">Sélectionner un enseignant</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Type de cours</label>
                                <select
                                    value={schedType}
                                    onChange={(e) => setSchedType(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="COURSE">COURS STANDARD</option>
                                    <option value="EVALUATION">ÉVALUATION / EXAMEN</option>
                                    <option value="HOLIDAY">CONGÉ / FERIÉ</option>
                                </select>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-white/5 bg-slate-950/50 flex justify-between gap-4">
                            {editingSchedule ? (
                                <button
                                    onClick={() => handleDeleteSchedule(editingSchedule.id)}
                                    className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Supprimer
                                </button>
                            ) : (
                                <div />
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowScheduleModal(false)}
                                    className="bg-slate-800 text-white hover:bg-slate-700 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSaveSchedule}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvisorPortal;
