import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, MapPin, Truck, Award, CheckCircle2, Eye, ShieldAlert, X, BookOpen, NotebookPen } from 'lucide-react';
import { DiaryAdminView } from './LessonDiary';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';
import { generateSchedulePdf, generateExamSchedulePdf } from '../utils/reports';
import { notifyDataChanged } from '../utils/dataSync';

const AdvisorPortal: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const { showNotification } = useNotification();
    const [termStructure, setTermStructure] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'PLANNING' | 'EVALUATIONS' | 'EXAMS_PROGRAM' | 'CAHIER_DE_TEXTE'>('PLANNING');
    const [examSchedules, setExamSchedules] = useState<any[]>([]);
    const [examWeekOffset, setExamWeekOffset] = useState(0);
    const [showExamModal, setShowExamModal] = useState(false);
    const [examDate, setExamDate] = useState('');
    const [examStart, setExamStart] = useState('');
    const [examEnd, setExamEnd] = useState('');
    const [examSubject, setExamSubject] = useState('');
    const [examTeacher, setExamTeacher] = useState('');
    const [classes, setClasses] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [currentSchool, setCurrentSchool] = useState<any>(null);

    const [selectedRoute, setSelectedRoute] = useState<string>('');

    // Evaluation Validation states
    const [selectedCycle, setSelectedCycle] = useState<string>('ALL');
    const [selectedSection, setSelectedSection] = useState<string>('ALL');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedTerm, setSelectedTerm] = useState<number | ''>('');
    const [selectedSequence, setSelectedSequence] = useState<string>('');
    const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<string>('ALL');

    const monthLabel = termStructure.flatMap(t => t.sequences).find(s => s?.id?.toString() === selectedSequence)?.name || selectedSequence;
    const [subjectStatuses, setSubjectStatuses] = useState<any[]>([]);
    const [selectedSubjectForDetail, setSelectedSubjectForDetail] = useState<any>(null);
    const [detailGrades, setDetailGrades] = useState<any[]>([]);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Schedule / Planning states
    const [schedules, setSchedules] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [classSubjects, setClassSubjects] = useState<any[]>([]);
    const [teacherAssignments, setTeacherAssignments] = useState<Record<number, number>>({});

    const [replacementTeacher, setReplacementTeacher] = useState<Record<number, string>>({});

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<any>(null);
    const [schedDay, setSchedDay] = useState<number>(1);
    const [schedStart, setSchedStart] = useState<string>('08:00');
    const [schedEnd, setSchedEnd] = useState<string>('10:00');
    const [schedSubject, setSchedSubject] = useState<string>('');
    const [schedTeacher, setSchedTeacher] = useState<string>('');
    const [schedType, setSchedType] = useState<string>('COURSE');

    // Weekly programme state
    const [schedWeekOffset, setSchedWeekOffset] = useState(0);
    const [isWeekCustom, setIsWeekCustom] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isCopyingTemplate, setIsCopyingTemplate] = useState(false);

    const getWeekStartDate = (offset: number): string => {
        const now = new Date();
        const dayOfWeek = now.getDay() || 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - dayOfWeek + 1 + offset * 7);
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().split('T')[0];
    };

    const getWeekLabel = (offset: number): string => {
        const monStr = getWeekStartDate(offset);
        const mon = new Date(monStr + 'T12:00:00');
        const sat = new Date(monStr + 'T12:00:00');
        sat.setDate(mon.getDate() + 5);
        const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        return `Lun. ${fmt(mon)} — Sam. ${fmt(sat)} ${mon.getFullYear()}`;
    };

    const loadData = async () => {
        if (window.electronAPI && user) {
          try {
            const [c, r, studs, allUsers, schs] = await Promise.all([
                window.electronAPI.getClasses(user.schoolId),
                window.electronAPI.getBusRoutes(user.schoolId),
                window.electronAPI.getStudents(user.schoolId),
                window.electronAPI.getUsers(user.schoolId),
                window.electronAPI.getSchools()
            ]);
            setClasses(c || []);
            setRoutes(r || []);
            setStudents((studs || []).filter((s: any) => s.has_paid_registration === 1));
            setTeachers((allUsers || []).filter((u: any) => u.role?.trim().toUpperCase() === 'TEACHER'));
            if (c && c.length > 0) {
                setSelectedClass(c[0].id.toString());
            }
            const mySchool = schs.find((s: any) => s.id?.toString() === user.schoolId?.toString()) || schs[0];
            setCurrentSchool(mySchool);
            if (mySchool && mySchool.timetable_slots) {
                try {
                    setTimetableSlots(JSON.parse(mySchool.timetable_slots));
                } catch(e) {}
            }
            if (mySchool && mySchool.term_structure) {
                try {
                    const ts = JSON.parse(mySchool.term_structure);
                    setTermStructure(ts);
                    if (ts.length > 0) {
                        setSelectedTerm(ts[0].term_id);
                        if (ts[0].sequences && ts[0].sequences.length > 0) {
                            setSelectedSequence(ts[0].sequences[0].id.toString());
                        }
                    }
                } catch(e) {
                    setTermStructure([]);
                }
            } else {
                setTermStructure([]);
            }
          } catch (e) {
            console.error('AdvisorPortal loadData error:', e);
          }
        }
    };

    const loadValidationStatuses = async () => {
        if (window.electronAPI && selectedClass) {
            const data = await window.electronAPI.getClassSubjectsValidationStatus({
                classId: parseInt(selectedClass),
                term: selectedTerm,
                month: selectedSequence
            });
            setSubjectStatuses(data || []);
        }
    };

    const loadSchedules = async () => {
        if (!window.electronAPI || !selectedClass) return;
        try {
            const weekStart = getWeekStartDate(schedWeekOffset);
            const result = await (window.electronAPI as any).getWeekSchedule({
                schoolId: user?.schoolId,
                classId: parseInt(selectedClass),
                weekStart
            });
            setSchedules(result.schedules || []);
            setIsWeekCustom(result.isCustom || false);

            if (window.electronAPI.getEvaluationSchedules) {
                const allExams = await window.electronAPI.getEvaluationSchedules(user?.schoolId);
                const filteredExams = allExams.filter((s: any) => s.class_id?.toString() === selectedClass?.toString());
                setExamSchedules(filteredExams);
            }
        } catch (e) {
            console.error("Failed to load schedules", e);
        }
    };

    const handleCopyTemplateToWeek = async () => {
        if (!window.electronAPI || !selectedClass) return;
        setIsCopyingTemplate(true);
        try {
            const weekStart = getWeekStartDate(schedWeekOffset);
            const res = await (window.electronAPI as any).copyTemplateToWeek({
                schoolId: user?.schoolId,
                classId: parseInt(selectedClass),
                weekStart
            });
            if (res.count === 0) {
                showNotification(t('adv_no_template_to_copy', 'Aucun cours dans le template. Ajoutez d\'abord des cours au programme de base.'), 'warning');
            } else {
                showNotification(t('adv_template_copied', '{{count}} cours copiés depuis le template. Modifiez librement puis publiez.', { count: res.count }), 'success');
            }
            await loadSchedules();
        } catch (err: any) {
            showNotification(t('error_prefix', 'Erreur') + ': ' + err.message, 'error');
        } finally {
            setIsCopyingTemplate(false);
        }
    };

    const handlePublishWeekSchedule = async () => {
        if (!window.electronAPI) return;
        setIsPublishing(true);
        try {
            const weekStart = getWeekStartDate(schedWeekOffset);
            const classIds = selectedClass ? [parseInt(selectedClass)] : classes.map((c: any) => c.id);
            const res = await (window.electronAPI as any).publishWeekSchedule({ schoolId: user?.schoolId, weekStart, classIds });
            showNotification(
                t('adv_week_published', 'Programme publié ! {{t}} enseignants et {{p}} parents notifiés.', { t: res.notifiedTeachers, p: res.notifiedParents }),
                'success'
            );
        } catch (err: any) {
            showNotification(t('error_prefix', 'Erreur') + ': ' + err.message, 'error');
        } finally {
            setIsPublishing(false);
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
            loadTeacherAssignments();
        }
    }, [selectedClass, selectedTerm, selectedSequence, schedWeekOffset]);

    const loadTeacherAssignments = async () => {
        if (window.electronAPI && selectedClass) {
            try {
                const assignments = await (window.electronAPI as any).getClassTeacherAssignments(parseInt(selectedClass));
                const initialAssignments: Record<number, number> = {};
                if (assignments && Array.isArray(assignments)) {
                    assignments.forEach((a: any) => {
                        initialAssignments[a.subject_id] = a.teacher_id;
                    });
                }
                setTeacherAssignments(initialAssignments);
            } catch (e) {
                console.error("Failed to load teacher assignments", e);
            }
        }
    };

    const classObj = classes.find(c => c.id.toString() === selectedClass);
    const availableTeachers = teachers.filter(t => {
        if (classObj?.main_teacher_id === t.id) return true;
        if (classObj?.assistant_teacher_id === t.id) return true;
        if (Object.values(teacherAssignments).includes(t.id)) return true;
        try {
            const assigned = JSON.parse(t.assigned_classes || '[]');
            if (assigned.includes(classObj?.id?.toString()) || assigned.includes(Number(classObj?.id))) return true;
        } catch(e) {}
        return false;
    });

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
            
            const defaultSubject = classSubjects[0]?.id?.toString() || '';
            setSchedSubject(defaultSubject);
            
            const assignedTeacher = defaultSubject && teacherAssignments[parseInt(defaultSubject)] 
                ? teacherAssignments[parseInt(defaultSubject)].toString() 
                : '';
            setSchedTeacher(assignedTeacher);
            
            setSchedType('COURSE');
        }
        setShowScheduleModal(true);
    };

    const handleSaveSchedule = async () => {
        if (!window.electronAPI || !selectedClass) return;
        if (schedType !== 'PAUSE') {
            if (!schedSubject) {
                showNotification(t('adv_select_subject_warning', 'Veuillez sélectionner une matière.'), "warning");
                return;
            }
            if (!schedTeacher) {
                showNotification(t('adv_select_teacher_warning', 'Veuillez sélectionner un enseignant.'), "warning");
                return;
            }
        }
        try {
            const payload = {
                id: editingSchedule ? editingSchedule.id : undefined,
                class_id: parseInt(selectedClass),
                subject_id: (schedType !== 'PAUSE' && schedSubject) ? parseInt(schedSubject) : null,
                teacher_id: (schedType !== 'PAUSE' && schedTeacher) ? parseInt(schedTeacher) : null,
                day_of_week: schedDay,
                start_time: schedStart,
                end_time: schedEnd,
                type: schedType,
                school_id: user?.schoolId,
                week_start_date: isWeekCustom ? getWeekStartDate(schedWeekOffset) : null
            };
            
            const res = await window.electronAPI.updateSchedule(payload);
            if (res && res.error) throw new Error(res.error);
            showNotification(t('adv_schedule_updated_success', 'Emploi du temps mis à jour avec succès !'), "success");
            setShowScheduleModal(false);
            loadSchedules();
        } catch (err: any) {
            showNotification(t('adv_schedule_save_error', "Erreur lors de l'enregistrement de l'emploi du temps : ") + err.message, "error");
        }
    };

    const handleDeleteSchedule = async (id: number) => {
        if (!window.electronAPI) return;
        if (window.confirm(t('adv_confirm_delete_course', "Voulez-vous supprimer ce cours de l'emploi du temps ?"))) {
            try {
                const res = await (window.electronAPI as any).deleteSchedule(id);
                if (res && res.error) throw new Error(res.error);
                showNotification(t('adv_course_deleted_success', 'Cours supprimé avec succès !'), "success");
                setShowScheduleModal(false);
                loadSchedules();
            } catch (err: any) {
                showNotification(t('adv_delete_error', "Erreur lors de la suppression : ") + err.message, "error");
            }
        }
    };

    const handleSaveExam = async () => {
        if (!window.electronAPI || !selectedClass) return;
        if (!examSubject || !examTeacher || !examDate || !examStart || !examEnd) {
            showNotification(t('adv_fill_all_fields_warning', 'Veuillez remplir tous les champs (Matière, Surveillant, Date, Heures).'), "warning");
            return;
        }
        try {
            const payload = {
                school_id: user?.schoolId,
                class_id: parseInt(selectedClass),
                subject_id: parseInt(examSubject),
                teacher_id: parseInt(examTeacher),
                evaluation_period_id: selectedTerm, // or sequence
                date: examDate,
                start_time: examStart,
                end_time: examEnd
            };
            const res = await window.electronAPI.addEvaluationSchedule(payload);
            if (res && res.error) throw new Error(res.error);

            // Notify the teacher
            const teacherObj = teachers.find(t => t.id.toString() === examTeacher);
            const subjObj = getSubjectName(parseInt(examSubject));
            await window.electronAPI.createNotification({
                user_id: teacherObj?.id, // Send only to this teacher
                message: t('adv_notif_surveillance_scheduled', 'Vous êtes programmé(e) pour surveiller l\'évaluation de {{subject}} le {{date}} de {{start}} à {{end}}.', { subject: subjObj, date: examDate, start: examStart, end: examEnd }),
                type: 'ACTION_REQUIRED',
                request_type: 'EXAM_SURVEILLANCE_REQUEST',
                request_data: JSON.stringify({ exam_id: res.id }),
                school_id: user?.schoolId
            });

            showNotification(t('adv_exam_scheduled_success', 'Évaluation programmée avec succès !'), "success");
            setShowExamModal(false);
            loadSchedules();
        } catch (err: any) {
            showNotification(t('adv_exam_save_error', "Erreur lors de l'enregistrement de l'évaluation : ") + err.message, "error");
        }
    };

    const handleDeleteExam = async (id: number) => {
        if (!window.electronAPI) return;
        if (window.confirm(t('adv_confirm_delete_exam', "Voulez-vous supprimer cette évaluation du programme ?"))) {
            try {
                const res = await window.electronAPI.deleteEvaluationSchedule(id);
                if (res && res.error) throw new Error(res.error);
                showNotification(t('adv_exam_deleted_success', 'Évaluation supprimée avec succès !'), "success");
                loadSchedules();
            } catch (err: any) {
                showNotification(t('adv_delete_error', "Erreur lors de la suppression : ") + err.message, "error");
            }
        }
    };

    const handleReassignSurveillant = async (examId: number) => {
        const newTeacherId = replacementTeacher[examId];
        if (!newTeacherId || !window.electronAPI) return;
        try {
            await (window.electronAPI as any).reassignExamSurveillant({
                examId,
                newTeacherId: parseInt(newTeacherId),
                schoolId: user?.schoolId
            });
            showNotification(t('adv_surveillant_replaced_success', 'Surveillant remplacé avec succès. Une notification a été envoyée au nouvel enseignant.'), "success");
            setReplacementTeacher(prev => { const copy = {...prev}; delete copy[examId]; return copy; });
            loadSchedules();
        } catch (err: any) {
            showNotification(t('error_prefix', 'Erreur') + " : " + err.message, "error");
        }
    };

    const getSubjectName = (subId: number) => classSubjects.find(s => s.id === subId)?.name || t('adv_subject_hash', 'Matière #{{id}}', { id: subId });
    const getTeacherName = (tId: number) => teachers.find(t => t.id === tId)?.fullName || teachers.find(t => t.id === tId)?.full_name || t('adv_teacher_hash', 'Enseignant #{{id}}', { id: tId });
    const getScheduleForSlot = (day: number, start: string) => {
        return schedules.find(s => s.day_of_week === day && s.start_time?.trim() === start?.trim());
    };

    const handleViewSubjectDetails = async (subj: any) => {
        if (!window.electronAPI || !selectedClass) return;
        
        // Fetch grades for this class, term, month
        const allGrades = await window.electronAPI.getGrades({
            classId: parseInt(selectedClass),
            term: selectedTerm,
            month: selectedSequence
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
                month: selectedSequence
            });
            
            await window.electronAPI.createNotification({
                role: 'SG',
                message: t('adv_notif_grades_validated', 'Les notes de la classe {{className}} ({{month}}, Trimestre {{term}}) ont été validées. Les bulletins sont prêts pour l\'impression.', { className: classes.find(c => c.id.toString() === selectedClass)?.name || selectedClass, month: monthLabel, term: selectedTerm }),
                type: 'ACTION_REQUIRED',
                school_id: user?.schoolId
            });

            showNotification(t('grades_validated_success', "Notes validées avec succès ! Cette matière est désormais visible sur les bulletins."), "success");
            loadValidationStatuses();
            notifyDataChanged();
        } catch (err: any) {
            showNotification(t('validation_error', "Erreur lors de la validation: ") + err.message, "error");
        }
    };

    const handleLaunchGradeEntry = async () => {
        try {
            if (!window.electronAPI) {
                alert(t('adv_electron_api_unavailable', 'Erreur : API Electron non disponible'));
                return;
            }

            // Remove window.confirm as it blocks/hangs in some Electron setups
            const res = await window.electronAPI.createNotification({
                role: 'TEACHER',
                message: t('adv_notif_entry_open', 'La période de saisie des notes pour {{month}} (Trimestre {{term}}) est désormais OUVERTE. Merci de bien vouloir remplir vos notes à temps.', { month: monthLabel, term: selectedTerm }),
                type: 'ACTION_REQUIRED',
                school_id: user?.schoolId
            });

            if (res && res.error) {
                showNotification(t('adv_db_error', 'Erreur base de données : ') + res.error, "error");
            } else {
                showNotification(t('adv_all_teachers_notified', 'Tous les enseignants ont été notifiés !'), "success");
            }
        } catch (err: any) {
            showNotification(t('adv_notification_error', 'Erreur lors de la notification: ') + err.message, "error");
        }
    };

    const DAYS_OF_WEEK = [
        { key: 1, label: t('monday', 'Lundi') },
        { key: 2, label: t('tuesday', 'Mardi') },
        { key: 3, label: t('wednesday', 'Mercredi') },
        { key: 4, label: t('thursday', 'Jeudi') },
        { key: 5, label: t('friday', 'Vendredi') },
        { key: 6, label: t('saturday', 'Samedi') }
    ];

    const [timetableSlots, setTimetableSlots] = useState<any[]>([
        { label: '08:00 - 10:00', start: '08:00', end: '10:00', isBreak: false },
        { label: '10:00 - 12:00', start: '10:00', end: '12:00', isBreak: false },
        { label: '12:00 - 13:00', start: '12:00', end: '13:00', isBreak: true },
        { label: '13:00 - 15:00', start: '13:00', end: '15:00', isBreak: false },
        { label: '15:00 - 17:00', start: '15:00', end: '17:00', isBreak: false }
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">{t('advisor_portal', 'Conseiller Pédagogique')}</h1>
                    <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest italic">{t('advisor_desc', 'Pilotage de la qualité et logistique scolaire')}</p>
                </div>
                <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                    <button onClick={() => setActiveTab('PLANNING')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'PLANNING' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t('tab_planning', 'Plannings')}</button>
                    <button onClick={() => setActiveTab('EVALUATIONS')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'EVALUATIONS' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t('tab_evaluations', 'Validation Notes')}</button>
                    <button onClick={() => setActiveTab('EXAMS_PROGRAM')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'EXAMS_PROGRAM' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t('tab_exams_program', 'Programme Évaluations')}</button>
                    <button onClick={() => setActiveTab('CAHIER_DE_TEXTE')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest flex items-center gap-2 ${activeTab === 'CAHIER_DE_TEXTE' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}><NotebookPen className="w-3.5 h-3.5" />{t('tab_cahier_texte', 'Cahier de Texte')}</button>
                </div>
            </div>

            {/* Shared Filters Bar */}
            <div className="glass-card p-6 flex flex-wrap gap-4 items-center justify-between bg-slate-900/40 border-slate-800">
                <div className="flex flex-wrap gap-4 items-center">
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('cycle', 'Cycle')}</label>
                        <select
                            value={selectedCycle}
                            onChange={(e) => { setSelectedCycle(e.target.value); setSelectedClass(''); }}
                            className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-36"
                        >
                            <option value="ALL">{t('adv_all_masc', 'TOUS')}</option>
                            <option value="PRIMAIRE">PRIMAIRE</option>
                            <option value="MATERNELLE">MATERNELLE</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('section', 'Section')}</label>
                        <select
                            value={selectedSection}
                            onChange={(e) => { setSelectedSection(e.target.value); setSelectedClass(''); }}
                            className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-36"
                        >
                            <option value="ALL">{t('adv_all_fem', 'TOUTES')}</option>
                            <option value="FRANCOPHONE">FRANCOPHONE</option>
                            <option value="ANGLOPHONE">ANGLOPHONE</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('class_label', 'Classes')}</label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-44 disabled:opacity-30"
                        >
                            <option value="">{t('choose_class', 'Choisir une classe')}</option>
                            {classes
                                .filter(c => (selectedSection === 'ALL' || c.section === selectedSection) && (selectedCycle === 'ALL' || c.level === selectedCycle))
                                .map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {(activeTab === 'PLANNING' || activeTab === 'EVALUATIONS' || activeTab === 'EXAMS_PROGRAM') && (
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('term', 'Évaluation Globale')}</label>
                            <select
                                value={selectedTerm}
                                onChange={(e) => {
                                    const newTerm = parseInt(e.target.value);
                                    setSelectedTerm(newTerm);
                                    const termObj = termStructure.find(t => t.term_id === newTerm);
                                    if (termObj && termObj.sequences && termObj.sequences.length > 0) {
                                        setSelectedSequence(termObj.sequences[0].id.toString());
                                    } else {
                                        setSelectedSequence('');
                                    }
                                }}
                                className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-32"
                            >
                                {termStructure.length === 0 && <option value="">{t('gr_no_period_configured', '-- Aucune période configurée --')}</option>}
                                {termStructure.map(ts => (
                                    <option key={ts.term_id} value={ts.term_id}>{ts.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(activeTab === 'PLANNING' || activeTab === 'EVALUATIONS' || activeTab === 'EXAMS_PROGRAM') && (
                        <>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('sequence_label', 'Séquence')}</label>
                                <select
                                    value={selectedSequence}
                                    onChange={(e) => setSelectedSequence(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-40"
                                >
                                    {termStructure.find(t => t.term_id === selectedTerm)?.sequences?.length ? (
                                        termStructure.find(t => t.term_id === selectedTerm)?.sequences.map((seq: any) => (
                                            <option key={seq.id} value={seq.id}>{seq.name}</option>
                                        ))
                                    ) : (
                                        <option value="">{t('gr_no_sequence_configured', '-- Aucune séquence --')}</option>
                                    )}
                                </select>
                            </div>

                            {(activeTab === 'EXAMS_PROGRAM' || activeTab === 'PLANNING') && (
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1">{t('month_label', 'Mois')}</label>
                                    <select
                                        value={selectedCalendarMonth}
                                        onChange={(e) => setSelectedCalendarMonth(e.target.value)}
                                        className="bg-slate-950 border border-slate-800 text-white font-bold text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500 w-36"
                                    >
                                        <option value="ALL">{t('adv_all_months', 'TOUS LES MOIS')}</option>
                                        <option value="01">{t('month_jan', 'Janvier')}</option>
                                        <option value="02">{t('month_feb', 'Février')}</option>
                                        <option value="03">{t('month_mar', 'Mars')}</option>
                                        <option value="04">{t('month_apr', 'Avril')}</option>
                                        <option value="05">{t('month_may', 'Mai')}</option>
                                        <option value="06">{t('month_jun', 'Juin')}</option>
                                        <option value="07">{t('month_jul', 'Juillet')}</option>
                                        <option value="08">{t('month_aug', 'Août')}</option>
                                        <option value="09">{t('month_sep', 'Septembre')}</option>
                                        <option value="10">{t('month_oct', 'Octobre')}</option>
                                        <option value="11">{t('month_nov', 'Novembre')}</option>
                                        <option value="12">{t('month_dec', 'Décembre')}</option>
                                    </select>
                                </div>
                            )}
                            
                            {user?.role !== 'ADVISOR' && activeTab === 'EVALUATIONS' && (
                                <div className="flex flex-col justify-end h-full">
                                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1 opacity-0">{t('actions', 'Actions')}</label>
                                    <button
                                        onClick={handleLaunchGradeEntry}
                                        className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-blue-500 transition-all uppercase tracking-wider"
                                    >
                                        {t('launch_grade_entry', 'Lancer la Saisie')}
                                    </button>
                                </div>
                            )}
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
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-black text-white flex items-center">
                                    <Calendar className="w-6 h-6 mr-3 text-amber-500" />
                                    {t('weekly_schedule', 'Emploi du Temps Hebdomadaire')}
                                </h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            if (!selectedClass) {
                                                showNotification(t('adv_select_class_warning', 'Veuillez sélectionner une classe.'), "warning");
                                                return;
                                            }
                                            const classObj = classes.find(c => c.id.toString() === selectedClass);
                                            const columns = [t('hour', 'Heure'), t('monday', 'Lundi'), t('tuesday', 'Mardi'), t('wednesday', 'Mercredi'), t('thursday', 'Jeudi'), t('friday', 'Vendredi'), t('saturday', 'Samedi')];
                                            const rows: any[] = [];
                                            const allSlots: any[] = [...timetableSlots];
                                            schedules.forEach(s => {
                                                if (s.start_time && !allSlots.some(slot => slot.start?.trim() === s.start_time?.trim())) {
                                                    allSlots.push({
                                                        label: `${s.start_time} - ${s.end_time || '?'}`,
                                                        start: s.start_time.trim(),
                                                        end: s.end_time?.trim() || '',
                                                        isBreak: false
                                                    });
                                                }
                                            });
                                            allSlots.sort((a, b) => (a.start || '00:00').localeCompare(b.start || '00:00'));
                                            
                                            allSlots.forEach(slot => {
                                                const rowData = [slot.label];
                                                if (slot.isBreak) {
                                                    [1, 2, 3, 4, 5, 6].forEach(() => rowData.push(t('adv_pause_upper', 'PAUSE')));
                                                } else {
                                                    [1, 2, 3, 4, 5, 6].forEach(day => {
                                                        const sData = getScheduleForSlot(day, slot.start);
                                                        if (sData) {
                                                            if (sData.type === 'PAUSE') {
                                                                rowData.push(t('adv_pause_upper', 'PAUSE'));
                                                            } else {
                                                                const subjectName = getSubjectName(sData.subject_id);
                                                                const teacherName = getTeacherName(sData.teacher_id);
                                                                rowData.push(`${subjectName}\n${teacherName}`);
                                                            }
                                                        } else {
                                                            rowData.push('-');
                                                        }
                                                    });
                                                }
                                                rows.push(rowData);
                                            });
                                            
                                            const curr = new Date();
                                            const firstDay = curr.getDate() - curr.getDay() + 1; // Lundi
                                            const monday = new Date(curr.setDate(firstDay)).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                                            const saturday = new Date(curr.setDate(firstDay + 5)).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

                                            generateSchedulePdf({
                                                school: currentSchool || { name: '' },
                                                title: t('adv_schedule_pdf_title', 'Programme des cours du Lundi {{monday}} au Samedi {{saturday}}', { monday, saturday }),
                                                subtitle: t('adv_schedule_pdf_subtitle', 'Emploi du Temps - Classe : {{className}}', { className: classObj?.name }),
                                                columns,
                                                rows
                                            });
                                        }}
                                        className="bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                                    >
                                        {t('download_pdf', 'Télécharger PDF')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!selectedClass) {
                                                showNotification(t('adv_select_class_before_schedule', 'Veuillez sélectionner une classe dans le menu déroulant ci-dessus avant de programmer un cours.'), "warning");
                                                return;
                                            }
                                            handleOpenScheduleModal();
                                        }}
                                        className="btn-primary text-[10px]"
                                    >
                                        {t('schedule_class', 'PROGRAMMER COURS')}
                                    </button>
                                </div>
                            </div>

                            {/* Week navigation bar */}
                            <div className="flex items-center gap-3 mb-6 p-3 bg-slate-950/60 rounded-2xl border border-white/5">
                                <button type="button" onClick={() => setSchedWeekOffset(o => o - 1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all font-black text-sm">‹</button>
                                <div className="flex-1 text-center">
                                    <p className="text-sm font-black text-white">{getWeekLabel(schedWeekOffset)}</p>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${isWeekCustom ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {isWeekCustom ? t('adv_week_custom', 'Programme personnalisé') : t('adv_week_template', 'Template de base (récurrent)')}
                                    </p>
                                </div>
                                <button type="button" onClick={() => setSchedWeekOffset(o => o + 1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all font-black text-sm">›</button>
                                {!isWeekCustom ? (
                                    <button
                                        type="button"
                                        onClick={handleCopyTemplateToWeek}
                                        disabled={isCopyingTemplate || !selectedClass}
                                        className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                                    >
                                        {isCopyingTemplate ? '...' : t('adv_program_this_week', 'Programmer cette semaine')}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handlePublishWeekSchedule}
                                        disabled={isPublishing}
                                        className="px-4 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
                                    >
                                        {isPublishing ? '...' : t('adv_publish_and_notify', 'Publier & Notifier')}
                                    </button>
                                )}
                            </div>

                            {!selectedClass ? (
                                <div className="p-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                                    {t('adv_choose_class_to_manage_schedule', "Veuillez choisir une classe dans le filtre ci-dessus pour gérer son emploi du temps.")}
                                </div>
                            ) : (
                                (() => {
                                    // Generate slots PURELY from schedules mixed with configured slots
                                    const allSlots: any[] = [...timetableSlots];
                                    schedules.forEach(s => {
                                        if (s.start_time && !allSlots.some(slot => slot.start?.trim() === s.start_time?.trim())) {
                                            allSlots.push({
                                                label: `${s.start_time} - ${s.end_time || '?'}`,
                                                start: s.start_time.trim(),
                                                end: s.end_time?.trim() || '',
                                                isBreak: false
                                            });
                                        }
                                    });
                                    // Sort slots by start time
                                    allSlots.sort((a, b) => {
                                        const timeA = a.start || '00:00';
                                        const timeB = b.start || '00:00';
                                        return timeA.localeCompare(timeB);
                                    });

                                    if (allSlots.length === 0) {
                                        return (
                                            <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                                                <p className="text-slate-400 font-bold mb-4">{t('adv_no_course_scheduled_yet', 'Aucun cours programmé pour le moment.')}</p>
                                                <p className="text-xs text-slate-500 mb-6">{t('adv_schedule_will_build', "L'emploi du temps se construira au fur et à mesure.")}</p>
                                                <button
                                                    onClick={() => handleOpenScheduleModal()}
                                                    className="px-6 py-2 bg-amber-500 text-slate-950 font-black text-[10px] rounded-xl uppercase tracking-widest hover:bg-amber-400 transition-all"
                                                >
                                                    + {t('adv_add_course_or_break', 'Ajouter un cours ou une pause')}
                                                </button>
                                            </div>
                                        );
                                    }

                                    return (
                                <div className="grid grid-cols-7 gap-3">
                                    {/* Header */}
                                    <div className="p-3 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">{t('hour', 'Heure')}</div>
                                    {DAYS_OF_WEEK.map(d => (
                                        <div key={d.key} className="p-3 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">{d.label}</div>
                                    ))}

                                    {/* Rows */}
                                    {allSlots.map((slot, index) => (
                                        <React.Fragment key={`${slot.label}-${index}`}>
                                            {/* Time slot column */}
                                            <div className="p-4 bg-slate-950/50 rounded-xl text-[10px] font-black text-slate-400 text-center flex flex-col items-center justify-center border border-slate-800 gap-1">
                                                {slot.label && slot.label !== 'Nouveau' && slot.label !== `${slot.start} - ${slot.end}` && (
                                                    <span className="text-amber-500/70">{slot.label}</span>
                                                )}
                                                <span>{slot.start} - {slot.end}</span>
                                            </div>

                                            {/* Days columns */}
                                            {slot.isBreak ? (
                                                <div className="col-span-6 p-4 bg-slate-900/10 border-dashed border-slate-800 rounded-xl flex items-center justify-center border">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{t('adv_pause_upper', 'PAUSE')}</span>
                                                </div>
                                            ) : (
                                                DAYS_OF_WEEK.map(day => {
                                                    const sData = getScheduleForSlot(day.key, slot.start);
                                                
                                                if (sData) {
                                                    const typeColor = sData.type === 'EVALUATION' 
                                                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                                                        : sData.type === 'HOLIDAY'
                                                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                                            : sData.type === 'PAUSE'
                                                                ? 'bg-slate-900/10 border-dashed border-slate-800 text-slate-600'
                                                                : 'bg-amber-500/10 border-amber-500/20 text-amber-500';
                                                    
                                                    if (sData.type === 'PAUSE') {
                                                        return (
                                                            <button
                                                                key={day.key}
                                                                onClick={() => handleOpenScheduleModal(sData)}
                                                                className={`p-4 rounded-xl border text-center hover:scale-[1.02] active:scale-95 transition-all w-full flex items-center justify-center ${typeColor}`}
                                                            >
                                                                <span className="text-[10px] font-bold uppercase tracking-widest">{t('adv_pause_label', 'Pause')}</span>
                                                            </button>
                                                        );
                                                    }

                                                    return (
                                                        <button
                                                            key={day.key}
                                                            onClick={() => handleOpenScheduleModal(sData)}
                                                            className={`p-3 rounded-xl border text-left hover:scale-[1.02] active:scale-95 transition-all w-full flex flex-col justify-between ${typeColor} h-full`}
                                                        >
                                                            <div>
                                                                <div className="text-[9px] font-black uppercase break-all leading-tight text-amber-500">{getSubjectName(sData.subject_id)}</div>
                                                                <div className="text-[8px] text-white/50 mt-1 uppercase font-bold break-words leading-tight">{getTeacherName(sData.teacher_id)}</div>
                                                            </div>
                                                            <div className="text-[7px] font-black uppercase tracking-wider mt-2 opacity-50">
                                                                {sData.type || t('adv_course_upper', 'COURS')}
                                                            </div>
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        key={day.key}
                                                        onClick={() => handleOpenScheduleModal(null, day.key, slot.start, slot.end)}
                                                        className="p-4 bg-slate-900/10 border border-dashed border-slate-800 hover:border-amber-500/30 hover:bg-amber-500/5 rounded-xl text-[10px] font-bold text-slate-600 hover:text-amber-500 text-center flex flex-col items-center justify-center uppercase tracking-widest group transition-all"
                                                    >
                                                        <span className="hidden group-hover:block opacity-100">+ {t('adv_prog_abbr', 'PROG.')}</span>
                                                    </button>
                                                );
                                            })
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                                );})()
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
                                                {t('adv_select_class_to_load_subjects', 'Veuillez sélectionner une classe pour charger les matières.')}
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
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">{subj.domain || t('gr_general_domain', 'Général')}</td>
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

            {activeTab === 'EXAMS_PROGRAM' && (() => {
                const getWeekDates = (offset: number) => {
                    const now = new Date();
                    const monday = new Date(now);
                    monday.setDate(now.getDate() - (now.getDay() || 7) + 1 + offset * 7);
                    return Array.from({ length: 6 }, (_, i) => {
                        const d = new Date(monday);
                        d.setDate(monday.getDate() + i);
                        return { date: d.toISOString().split('T')[0], label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' }) };
                    });
                };
                const weekDates = getWeekDates(examWeekOffset);
                const getExamForSlot = (date: string, start: string) => examSchedules.find(e => e.date === date && e.start_time?.trim() === start?.trim());
                const statusColors: Record<string, string> = { 'PENDING_TEACHER': 'border-amber-500/30 text-amber-400', 'APPROVED': 'border-emerald-500/30 text-emerald-400', 'FORCED_APPROVED': 'border-blue-500/30 text-blue-400', 'PENDING_ADMIN': 'border-rose-500/30 text-rose-400', 'REJECTED': 'border-rose-500/30 text-rose-400' };
                const statusLabelsMap: Record<string, string> = { 'PENDING_TEACHER': t('adv_status_pending', 'En attente'), 'APPROVED': t('adv_status_accepted', 'Accepté'), 'FORCED_APPROVED': t('adv_status_forced', 'Forcé'), 'PENDING_ADMIN': t('adv_status_refused', 'Refusé'), 'REJECTED': t('adv_status_refused', 'Refusé') };

                return (
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="glass-card p-6 border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-white flex items-center">
                                <BookOpen className="w-6 h-6 mr-3 text-amber-500" />
                                {t('exam_schedule_grid', 'Programme des Évaluations')}
                            </h2>
                            <div className="flex gap-2 items-center">
                                <button onClick={() => setExamWeekOffset(examWeekOffset - 1)} className="p-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all text-xs font-black">◀</button>
                                <button onClick={() => setExamWeekOffset(0)} className="px-3 py-2 bg-amber-500/10 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-wider border border-amber-500/20">{t('this_week', 'Cette semaine')}</button>
                                <button onClick={() => setExamWeekOffset(examWeekOffset + 1)} className="p-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all text-xs font-black">▶</button>
                                <button onClick={() => {
                                    if (!selectedClass) { showNotification(t('adv_select_class_warning', 'Veuillez sélectionner une classe.'), "warning"); return; }
                                    const classObj = classes.find(c => c.id.toString() === selectedClass);
                                    const columns = [t('date', 'Date'), t('schedule_time', 'Horaires'), t('subject_primary_header', 'Matière'), t('teacher_supervisor', 'Enseignant/Surveillant')];
                                    const rows = examSchedules.map(exam => [exam.date, `${exam.start_time} - ${exam.end_time}`, getSubjectName(parseInt(exam.subject_id)), getTeacherName(parseInt(exam.teacher_id))]);
                                    generateExamSchedulePdf({ school: currentSchool || { name: '' }, title: t('adv_exam_schedule_pdf_title', 'Programme des Évaluations - {{className}}', { className: classObj?.name }), columns, rows });
                                }} className="bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all">{t('download_pdf', 'Télécharger PDF')}</button>
                            </div>
                        </div>

                        {!selectedClass ? (
                            <div className="p-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">{t('select_class_filter', 'Veuillez choisir une classe dans le filtre ci-dessus.')}</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <div className="grid grid-cols-7 gap-3 min-w-[900px]">
                                    <div className="p-3 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">{t('hour', 'Heure')}</div>
                                    {weekDates.map(wd => (
                                        <div key={wd.date} className="p-3 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">{wd.label}</div>
                                    ))}

                                    {timetableSlots.map((slot: any, si: number) => (
                                        <React.Fragment key={`exam-slot-${si}`}>
                                            <div className="p-4 bg-slate-950/50 rounded-xl text-[10px] font-black text-slate-400 text-center flex flex-col items-center justify-center border border-slate-800">
                                                <span>{slot.start} - {slot.end}</span>
                                            </div>
                                            {slot.isBreak ? (
                                                <div className="col-span-6 p-4 bg-slate-900/10 border-dashed border-slate-800 rounded-xl flex items-center justify-center border">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{t('adv_pause_upper', 'PAUSE')}</span>
                                                </div>
                                            ) : weekDates.map(wd => {
                                                const exam = getExamForSlot(wd.date, slot.start);
                                                if (exam) {
                                                    const stColor = statusColors[exam.status] || 'border-slate-700 text-slate-400';
                                                    const stLabel = statusLabelsMap[exam.status] || exam.status;
                                                    return (
                                                        <div key={wd.date} className={`p-3 rounded-xl border text-left transition-all w-full flex flex-col justify-between bg-blue-500/10 ${stColor} h-full relative group`}>
                                                            <div>
                                                                <div className="text-[9px] font-black uppercase break-all leading-tight text-amber-500">{getSubjectName(exam.subject_id)}</div>
                                                                <div className="text-[8px] text-white/50 mt-1 uppercase font-bold break-words leading-tight">{getTeacherName(exam.teacher_id)}</div>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-[7px] font-black uppercase tracking-wider opacity-70">{stLabel}</span>
                                                                <button onClick={() => handleDeleteExam(exam.id)} className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-300 transition-all"><Trash2 className="w-3 h-3" /></button>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <button key={wd.date} onClick={() => {
                                                        if (!selectedClass) { showNotification(t('adv_select_class_warning', 'Veuillez sélectionner une classe.'), "warning"); return; }
                                                        setExamDate(wd.date); setExamStart(slot.start); setExamEnd(slot.end); setShowExamModal(true);
                                                    }} className="p-4 bg-slate-900/10 border border-dashed border-slate-800 hover:border-amber-500/30 hover:bg-amber-500/5 rounded-xl text-[10px] font-bold text-slate-600 hover:text-amber-500 text-center flex flex-col items-center justify-center uppercase tracking-widest group transition-all">
                                                        <span className="hidden group-hover:block opacity-100">+ {t('adv_prog_abbr', 'PROG.')}</span>
                                                    </button>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                );
            })()}

            {/* Cahier de Texte Tab */}
            {activeTab === 'CAHIER_DE_TEXTE' && (
                <div className="mt-6 pb-20">
                    <DiaryAdminView />
                </div>
            )}

            {/* Grades Inspection Slide-over Drawer / Modal */}
            {showDetailModal && selectedSubjectForDetail && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-2xl max-h-[80vh] flex flex-col overflow-y-auto custom-scrollbar max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200">
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
                    <div className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-lg max-h-[90vh] flex flex-col overflow-y-auto custom-scrollbar max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 text-left">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                                    {editingSchedule ? t('adv_edit_course_title', 'Modifier le Cours') : t('adv_schedule_course_title', 'Programmer un Cours')}
                                </h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                                    {editingSchedule ? t('edit_schedule_subtitle', "Modifier la programmation horaire") : t('add_schedule_subtitle', "Ajouter un nouveau cours à l'emploi du temps")}
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
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('adv_day_of_week', 'Jour de la semaine')}</label>
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

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('adv_start_time', 'Heure Début')}</label>
                                    <input
                                        type="text"
                                        placeholder="ex: 08:00"
                                        value={schedStart}
                                        disabled
                                        className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none opacity-70 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('adv_end_time', 'Heure Fin')}</label>
                                    <input
                                        type="text"
                                        placeholder="ex: 10:00"
                                        value={schedEnd}
                                        disabled
                                        className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none opacity-70 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {schedType !== 'PAUSE' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('subject_primary_header', 'Matière')}</label>
                                        <select
                                            value={schedSubject}
                                            onChange={(e) => {
                                                const newSubjId = e.target.value;
                                                setSchedSubject(newSubjId);
                                                if (newSubjId && teacherAssignments[parseInt(newSubjId)]) {
                                                    setSchedTeacher(teacherAssignments[parseInt(newSubjId)].toString());
                                                } else {
                                                    setSchedTeacher(''); // Clear teacher or fallback to empty
                                                }
                                            }}
                                            className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="">{t('adv_select_subject_opt', 'Sélectionner une matière')}</option>
                                            {classSubjects.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('gr_teacher_col', 'Enseignant')}</label>
                                        <select
                                            value={schedTeacher}
                                            onChange={(e) => setSchedTeacher(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                        >
                                            <option value="">{t('adv_select_teacher_opt', 'Sélectionner un enseignant')}</option>
                                            {availableTeachers.filter(t => !schedSubject || teacherAssignments[parseInt(schedSubject)] === t.id).map(t => (
                                                <option key={t.id} value={t.id}>{t.fullName || t.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('adv_course_type', 'Type de cours')}</label>
                                <select
                                    value={schedType}
                                    onChange={(e) => setSchedType(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="COURSE">{t('adv_course_standard_opt', 'COURS STANDARD')}</option>
                                    <option value="EVALUATION">{t('adv_evaluation_exam_opt', 'ÉVALUATION / EXAMEN')}</option>
                                    <option value="HOLIDAY">{t('adv_holiday_opt', 'CONGÉ / FERIÉ')}</option>
                                    <option value="PAUSE">{t('adv_pause_custom_opt', 'PAUSE (Personnalisée)')}</option>
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
                                    {t('cust_delete_btn', 'Supprimer')}
                                </button>
                            ) : (
                                <div />
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowScheduleModal(false)}
                                    className="bg-slate-800 text-white hover:bg-slate-700 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    {t('cancel', 'Annuler')}
                                </button>
                                <button
                                    onClick={handleSaveSchedule}
                                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg"
                                >
                                    {t('save', 'Enregistrer')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Exam Programming Modal */}
            {showExamModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-[32px] w-full max-w-lg max-h-[90vh] flex flex-col overflow-y-auto custom-scrollbar max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-200 text-left">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                                    {t('adv_schedule_evaluation_title', 'Programmer une Évaluation')}
                                </h3>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
                                    {t('tick_class_label', 'Classe:')} {classObj?.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowExamModal(false)}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-slate-400 hover:text-white transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('subject_primary_header', 'Matière')}</label>
                                <select
                                    value={examSubject}
                                    onChange={(e) => setExamSubject(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="">{t('adv_select_subject_opt2', 'Sélectionnez une matière')}</option>
                                    {classSubjects.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('adv_supervisor_teacher', 'Enseignant Surveillant')}</label>
                                <select
                                    value={examTeacher}
                                    onChange={(e) => setExamTeacher(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                >
                                    <option value="">{t('adv_select_supervisor_opt', 'Sélectionnez un surveillant')}</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.fullName || t.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('adv_evaluation_date', "Date de l'évaluation")}</label>
                                <input
                                    type="date"
                                    value={examDate}
                                    onChange={(e) => setExamDate(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('adv_start_time', 'Heure Début')}</label>
                                    <input
                                        type="time"
                                        value={examStart}
                                        disabled
                                        className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none opacity-70 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('adv_end_time', 'Heure Fin')}</label>
                                    <input
                                        type="time"
                                        value={examEnd}
                                        disabled
                                        className="w-full bg-slate-950 border border-slate-800 text-white font-bold text-sm rounded-xl px-4 py-3 outline-none opacity-70 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-white/5 bg-slate-950/50 flex justify-end">
                            <button
                                onClick={handleSaveExam}
                                className="bg-amber-500 text-slate-950 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-amber-400 transition-all shadow-lg"
                            >
                                {t('save', 'Enregistrer')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvisorPortal;
