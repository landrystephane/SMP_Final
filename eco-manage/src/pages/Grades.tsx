import React, { useState, useEffect } from 'react';
import { Save, Lock, Unlock, Filter, Download, CheckCircle2, AlertCircle, FileText, BookOpen, X, Eye, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateReportCard } from '../utils/reports';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { notifyDataChanged } from '../utils/dataSync';
import { getRoleLabel } from '../utils/roleLabels';

const Grades: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasRole, user } = useAuth();
  const { showNotification } = useNotification();

  // Custom modal and notification states
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideDays, setOverrideDays] = useState('3');
  const [showReactivationModal, setShowReactivationModal] = useState(false);
  const [reactivationReason, setReactivationReason] = useState('');

  const [sections, _setSections] = useState(['FRANCOPHONE', 'ANGLOPHONE']);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [termStructure, setTermStructure] = useState<any[]>([]);
  const [scaleConfig, setScaleConfig] = useState<any>(null);

  const [selectedSection, setSelectedSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE' | ''>('FRANCOPHONE');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<number | ''>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const [grades, setGrades] = useState<Record<string, string>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [isPastDeadline, setIsPastDeadline] = useState(false);
  const [bulletinsValidated, setBulletinsValidated] = useState(false);
  const [isClassValidated, setIsClassValidated] = useState(false);
  const [subjectStatuses, setSubjectStatuses] = useState<any[]>([]);
  const [detailGrades, setDetailGrades] = useState<any[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSubjectForDetail, setSelectedSubjectForDetail] = useState<any>(null);
    const [isSgActing, setIsSgActing] = useState(false);

  const loadData = async () => {
      if (window.electronAPI) {
        const c = await window.electronAPI.getClasses(user?.schoolId);
        if (user?.role === 'TEACHER') {
            let assignedIds: number[] = [];
            try {
                const teacherClasses = await (window.electronAPI as any).getTeacherClasses({ teacherId: user.id, schoolId: user.schoolId });
                assignedIds = (teacherClasses || []).map((tc: any) => tc.id || tc.class_id);
            } catch (e) {
                // Fallback to JWT assignedClasses
                try {
                    const raw = typeof user.assignedClasses === 'string' ? JSON.parse(user.assignedClasses) : (user.assignedClasses || []);
                    assignedIds = raw.map((id: any) => typeof id === 'string' ? parseInt(id) : id);
                } catch(e2) {}
            }
            const filtered = c.filter((cls: any) => assignedIds.includes(cls.id));
            setClasses(filtered);
        } else {
            setClasses(c);
        }
        
        const sgStatus = await window.electronAPI.getSetting('sg_acting_director');
          setIsSgActing(sgStatus === 'true');
          const bv = await window.electronAPI.getSetting('bulletins_validated');
        setBulletinsValidated(bv === 'true');

        const activeTerm = await window.electronAPI.getSetting('active_term');
        const activeSequence = await window.electronAPI.getSetting('active_sequence');

        const schools = await window.electronAPI.getSchools();
        const mySchool = schools.find((s: any) => s.id?.toString() === user?.schoolId?.toString()) || schools[0];
        if (mySchool && mySchool.term_structure) {
            try {
                const ts = JSON.parse(mySchool.term_structure);
                setTermStructure(ts);
                if (ts.length > 0) {
                    const defaultTerm = activeTerm ? parseInt(activeTerm) : ts[0].term_id;
                    setSelectedTerm(defaultTerm);
                    
                    const termObj = ts.find((t: any) => t.term_id === defaultTerm) || ts[0];
                    if (activeSequence && termObj.sequences?.find((s: any) => s.id.toString() === activeSequence)) {
                        setSelectedMonth(activeSequence);
                    } else if (termObj.sequences && termObj.sequences.length > 0) {
                        setSelectedMonth(termObj.sequences[0].id.toString());
                    }
                }
            } catch(e) {
                setTermStructure([]);
            }
        } else {
            setTermStructure([]);
        }
      }
  }

  useEffect(() => { loadData(); }, []);

  const handleLoadContext = async () => {
    if (window.electronAPI && selectedClass) {
        const classObj = classes.find(c => c.id.toString() === selectedClass);
        const allStudents = await window.electronAPI.getStudents(user?.schoolId);
        setStudents(allStudents.filter((s: any) => s.class_id?.toString() === selectedClass?.toString()));

        let classSubs = await window.electronAPI.getClassSubjects(parseInt(selectedClass));

        if (user?.role === 'TEACHER') {
            const isTitulaire = classObj?.main_teacher_id === user.id;
            try {
                const assignedSubs = await window.electronAPI.getTeacherAssignedSubjects({
                    classId: parseInt(selectedClass),
                    teacherId: user.id
                });
                let teacherAssignments: any[] = [];
                if (isTitulaire) {
                    try {
                        teacherAssignments = await (window.electronAPI as any).getClassTeacherAssignments(parseInt(selectedClass)) || [];
                    } catch(e) {}
                    classSubs = (classSubs || []).map((s: any) => {
                        const assignment = teacherAssignments.find((a: any) => a.subject_id === s.id);
                        return {
                            ...s,
                            _readOnly: !(assignedSubs || []).some((a: any) => a.id === s.id),
                            teacher_name: assignment?.teacherName || null
                        };
                    });
                } else {
                    classSubs = assignedSubs || [];
                }
            } catch (e) {
                console.error("Failed to load teacher assigned subjects", e);
                classSubs = isTitulaire ? (classSubs || []).map((s: any) => ({ ...s, _readOnly: true })) : [];
            }
        }

        setSubjects(classSubs);

        // Load grading scale config
        let currentScale = null;
        try {
            currentScale = await window.electronAPI.getClassGradingScale(parseInt(selectedClass));
            setScaleConfig(currentScale);
        } catch (e) {
            console.error("Failed to load grading scale config", e);
            setScaleConfig(null);
        }

        const existingGrades = await window.electronAPI.getGrades({
            classId: parseInt(selectedClass),
            term: selectedTerm
        });

        const gradeMap: Record<string, string> = {};
        let locked = false;
        existingGrades.forEach((g: any) => {
            if (g.month === selectedMonth) {
                const val = (currentScale && currentScale.scale.is_numerical === 0)
                  ? (g.letter_score || '')
                  : (g.score !== null && g.score !== undefined ? g.score.toString() : '');
                gradeMap[`${g.student_id}-${g.subject_id}`] = val;
                if (g.locked) {
                    if (user?.role === 'TEACHER') {
                        // Only lock if a grade belonging to the teacher's subjects is locked
                        if (subjects.some(s => s.id === g.subject_id)) {
                            locked = true;
                        }
                    } else {
                        locked = true;
                    }
                }
            }
        });
        setGrades(gradeMap);
        setIsLocked(locked);

        // Check class-level validation (class_locked setting)
        const allSettings = await window.electronAPI.getSettings();
        const classIsValidated = allSettings.some((s: any) =>
            s.setting_key.startsWith(`class_locked_${selectedClass}_${selectedTerm}_`) && s.setting_value === 'true'
        );
        setIsClassValidated(classIsValidated);

        // Check deadline and permissions
        let pastDeadline = false;
        const editingAllowed = await window.electronAPI.getSetting('period_editing_allowed');
        const periodStartStr = await window.electronAPI.getSetting('period_start');
        const periodEndStr = await window.electronAPI.getSetting('period_end');
        
        let isOutsideDateRange = false;
        if (periodStartStr && periodEndStr) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const start = new Date(periodStartStr);
            start.setHours(0, 0, 0, 0);
            const end = new Date(periodEndStr);
            end.setHours(23, 59, 59, 999);
            
            if (today < start || today > end) {
                isOutsideDateRange = true;
            }
        }

        if (editingAllowed === 'false' || isOutsideDateRange) {
            pastDeadline = true;
            
            // Check for override if master toggle is false or outside date range
            if (user?.role === 'TEACHER') {
                try {
                    const override = await window.electronAPI.getGradeOverrides({
                        teacherId: user.id,
                        classId: parseInt(selectedClass),
                        term: selectedTerm,
                        month: selectedMonth
                    });
                    if (override) {
                        const overrideDate = new Date(override.deadline);
                        overrideDate.setHours(23, 59, 59, 999);
                        if (new Date() <= overrideDate) {
                            pastDeadline = false;
                        }
                    }
                } catch (err) {
                    console.warn("getGradeOverrides non disponible.");
                }
            }
        }
        setIsPastDeadline(pastDeadline);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedTerm && selectedMonth) {
        handleLoadContext();
        if (user?.role === 'FOUNDER' || user?.role === 'DIRECTOR' || (user?.role === 'SG' && isSgActing)) {
            loadValidationStatuses();
        }
    }
  }, [selectedClass, selectedMonth, selectedTerm]);

  const handleRequestUnlock = async () => {
      if (!window.electronAPI || !user || !selectedClass || !selectedTerm || !selectedMonth) return;
      const classObj = classes.find(c => c.id.toString() === selectedClass);
      const className = classObj ? `${classObj.name} (${classObj.code})` : selectedClass;
      const subject = t('gr_unlock_request_subject', 'Demande de déblocage : Notes {{className}}', { className });
      const message = t('gr_unlock_request_message', 'Bonjour,\n\nJe souhaite modifier les notes de la classe {{className}} pour la période {{month}} (Trimestre {{term}}). Veuillez s\'il vous plaît débloquer ces notes.\n\nMerci d\'avance.\n\nEnseignant : {{teacherName}}', { className, month: selectedMonth, term: selectedTerm, teacherName: user.fullName || user.username });

      try {
          await window.electronAPI.submitSystemRequest({
              requestType: 'GRADE_REACTIVATION',
              requestData: {
                  teacherId: user.id,
                  classId: selectedClass,
                  className: classObj ? classObj.name : selectedClass,
                  term: selectedTerm,
                  month: selectedMonth
              }
          });
          showNotification(t('gr_unlock_request_sent', "Votre demande de déblocage a été envoyée avec succès à l'administration."), "success");
      } catch (e: any) {
          showNotification(t('gr_send_request_error', "Erreur lors de l'envoi de la demande: ") + e.message, "error");
      }
  };

  const handleSave = async () => {
    if (isLocked || isPastDeadline) {
        showNotification(t('gr_entry_blocked', "La saisie est bloquée (période fermée ou délai dépassé)."), "error");
        return;
    }
    const formattedGrades = Object.entries(grades)
        .filter(([key]) => {
            const [, subjectId] = key.split('-');
            return subjects.some(s => s.id === parseInt(subjectId) && !s._readOnly);
        })
        .map(([key, scoreOrLetter]) => {
        const [studentId, subjectId] = key.split('-');
        const isNumerical = !scaleConfig || scaleConfig.scale.is_numerical === 1;
        
        let scoreNum = 0;
        let letterStr = null;

        if (isNumerical) {
            scoreNum = parseFloat(scoreOrLetter.replace(',', '.'));
            if (isNaN(scoreNum)) {
                scoreNum = 0;
            }
        } else {
            letterStr = scoreOrLetter;
        }

        return {
          student_id: parseInt(studentId),
          subject_id: parseInt(subjectId),
          class_id: parseInt(selectedClass),
          term: selectedTerm,
          month: selectedMonth,
          score: scoreNum,
          letter_score: letterStr,
          teacher_id: user?.id
        };
      });

    if (window.electronAPI) {
      const result = await window.electronAPI.saveGrades(formattedGrades);
      if (result.success) {
        // Notify ADVISOR that grades were saved
        await window.electronAPI.createNotification({
            role: 'ADVISOR',
            message: t('gr_notif_grades_saved', 'Des notes ont été enregistrées pour la classe {{className}} ({{month}}, Trimestre {{term}}) par {{teacherName}}.', { className: classes.find(c => c.id.toString() === selectedClass)?.name || selectedClass, month: selectedMonth, term: selectedTerm, teacherName: getRoleLabel(user?.role, i18n.language) }),
            type: 'INFO',
            school_id: user?.schoolId
        });

        showNotification("✅ " + t('gr_grades_saved_success', "Les notes ont été enregistrées avec succès !"), "success");
        handleLoadContext();
        notifyDataChanged();
      } else {
        showNotification(t('gr_save_error', "Erreur: ") + result.error, "error");
      }
    } else {
      // Mobile / Web fallback
      const key = `pending_grades_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(formattedGrades));
      showNotification("✅ " + t('gr_grades_saved_locally', "Notes sauvegardées localement !"), "success");
    }
  };

  const handleUnlock = async () => {
    if (window.electronAPI) {
        setConfirmModal({
            title: t('confirm_unlock') || t('gr_unlock_confirm_title', "Déverrouiller les notes"),
            message: t('gr_unlock_confirm_msg', "Êtes-vous sûr de vouloir déverrouiller toutes les notes pour cette classe, cette période et ce mois ?"),
            onConfirm: async () => {
                await window.electronAPI.unlockGrades({
                    classId: parseInt(selectedClass),
                    term: selectedTerm,
                    month: selectedMonth
                });
                setIsLocked(false);
                showNotification(t('gr_grades_unlocked_success', "Notes déverrouillées avec succès !"), "success");
                handleLoadContext();
            }
        });
    }
  };

  const handleValidateClass = async () => {
    if (window.electronAPI) {
        setConfirmModal({
            title: t('gr_validate_lock_title', "Valider et verrouiller"),
            message: t('gr_validate_lock_msg', "Voulez-vous valider et verrouiller toutes les notes de cette classe pour ce trimestre et ce mois ? Cela permettra d'imprimer les bulletins officiels."),
            onConfirm: async () => {
                try {
                    const result = await (window.electronAPI as any).validateClassGrades({
                        classId: parseInt(selectedClass),
                        term: selectedTerm,
                        month: selectedMonth
                    });

                    // Notify Secretary/Advisor
                    await window.electronAPI.createNotification({
                        role: 'SG',
                        message: t('gr_notif_grades_validated', 'Les notes de la classe {{className}} ({{month}}, Trimestre {{term}}) ont été validées par {{role}}. Les bulletins sont prêts pour l\'impression.', { className: classes.find(c => c.id.toString() === selectedClass)?.name || selectedClass, month: selectedMonth, term: selectedTerm, role: getRoleLabel(user?.role, i18n.language) }),
                        type: 'INFO',
                        school_id: user?.schoolId
                    });

                    setIsClassValidated(true);
                    showNotification("✅ " + t('gr_grades_validated_lock_success', "Toutes les notes ont été validées et verrouillées !"), "success");
                    handleLoadContext();
                    notifyDataChanged();
                } catch (err: any) {
                    showNotification(t('gr_validation_error', "Erreur lors de la validation : ") + err.message, "error");
                }
            }
        });
    }
  };

  const handleGrantOverride = async () => {
      setShowOverrideModal(true);
  };

  const submitOverride = async () => {
      if (window.electronAPI && !isNaN(parseInt(overrideDays))) {
          const classObj = classes.find(c => c.id.toString() === selectedClass);
          const allUsers = await window.electronAPI.getUsers(user?.schoolId);
          const teacher = allUsers.find((u: any) => {
              if (u.role !== 'TEACHER') return false;
              try {
                  const assigned = typeof u.assignedClasses === 'string' ? JSON.parse(u.assignedClasses) : (u.assignedClasses || []);
                  return assigned.map(Number).includes(parseInt(selectedClass));
              } catch (e) {
                  return false;
              }
          });

          if (!classObj || !teacher) {
              showNotification(t('gr_no_titulaire_error', "Cette classe n'a pas de titulaire assigné, impossible d'accorder une dérogation."), "error");
              setShowOverrideModal(false);
              return;
          }

          const newDeadline = new Date();
          newDeadline.setDate(newDeadline.getDate() + parseInt(overrideDays));
          const formattedDate = newDeadline.toISOString().split('T')[0];

          try {
              await window.electronAPI.addGradeOverride({
                  teacherId: teacher.id,
                  classId: parseInt(selectedClass),
                  term: selectedTerm,
                  month: selectedMonth,
                  deadline: formattedDate,
                  grantedBy: user?.id
              });
          } catch (err) {
              showNotification(t('gr_override_apply_error', "Erreur lors de l'application de la dérogation."), "error");
              setShowOverrideModal(false);
              return;
          }

          await window.electronAPI.createNotification({
              school_id: user?.schoolId,
              user_id: teacher.id,
              message: t('gr_notif_override_granted', 'Une dérogation exceptionnelle de saisie des notes vous a été accordée pour la classe {{className}} jusqu\'au {{date}}.', { className: classObj.name, date: formattedDate }),
              type: 'SYSTEM'
          });

          showNotification(t('gr_override_granted_msg', 'Dérogation accordée jusqu\'au {{date}}.', { date: formattedDate }), "success");
          setShowOverrideModal(false);
          handleLoadContext();
      }
  };

  const handleRequestReactivation = async () => {
      setShowReactivationModal(true);
  };

  const submitReactivationRequest = async () => {
      if (window.electronAPI && selectedClass) {
          const classObj = classes.find(c => c.id.toString() === selectedClass);
          try {
              await window.electronAPI.submitSystemRequest({
                  schoolId: user?.schoolId,
                  senderId: user?.id,
                  requestType: 'GRADE_REACTIVATION',
                  requestData: {
                      teacherId: user?.id,
                      classId: parseInt(selectedClass),
                      className: classObj?.name || selectedClass,
                      term: selectedTerm,
                      month: selectedMonth,
                      reason: reactivationReason
                  }
              });
              showNotification(t('gr_reactivation_sent', "Demande de réactivation envoyée au directeur."), "success");
              setShowReactivationModal(false);
              setReactivationReason('');
          } catch (e: any) {
              showNotification(t('gr_send_request_error', "Erreur lors de l'envoi : ") + e.message, "error");
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
        setSubjectStatuses(data || []);
    }
  };

  const handleViewSubjectDetails = async (subj: any) => {
    if (!window.electronAPI || !selectedClass) return;
    const allGrades = await window.electronAPI.getGrades({
        classId: parseInt(selectedClass),
        term: selectedTerm,
        month: selectedMonth
    });
    const subjectGrades = allGrades.filter((g: any) => g.subject_id === subj.id);
    const allStudents = await window.electronAPI.getStudents(user?.schoolId);
    const classStudents = allStudents.filter((s: any) => s.class_id?.toString() === selectedClass?.toString());
    const gradesList = classStudents.map((s: any) => {
        const gr = subjectGrades.find((g: any) => g.student_id === s.id);
        return { studentName: `${s.last_name} ${s.first_name}`, matricule: s.matricule, score: gr ? gr.score : null };
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
        showNotification(t('grades_validated_success', "Notes validées avec succès !"), "success");
        loadValidationStatuses();
    } catch (err: any) {
        showNotification(t('gr_validation_error', "Erreur lors de la validation : ") + err.message, "error");
    }
  };

  const printStudentReport = async (student: any) => {
    if (student.has_paid_registration === 0) {
        showNotification(t('student_not_registered_no_action', "Cet élève n'est pas inscrit. Aucune action n'est possible tant que l'inscription n'est pas payée."), "error");
        return;
    }
    if (student.status === 'BLOCKED') {
        showNotification(t('student_blocked_no_action', "Cet élève est bloqué. Aucune action n'est possible (y compris l'impression)."), "error");
        return;
    }
    if (window.electronAPI) {
        try {
            const classObj = classes.find(c => c.id.toString() === selectedClass);
            const schools = await window.electronAPI.getSchools();
            const school = schools.find((s: any) => s.id?.toString() === user?.schoolId?.toString()) || schools[0];
            
            // Fetch all students in this class
            const allStudents = await window.electronAPI.getStudents(user?.schoolId);
            const classStudents = allStudents.filter((s: any) => s.class_id?.toString() === selectedClass?.toString());

            const isDirector = user?.role === 'DIRECTOR' || user?.role === 'FOUNDER' || (user?.role === 'SG' && isSgActing);
            // Calculate averages for all students in the class based on validated grades (or all grades for DIRECTOR)
            const studentsWithAverages = await Promise.all(classStudents.map(async (s: any) => {
                const details = await window.electronAPI.getStudentDetails(s.id);
                const validatedGrades = details.grades.filter((g: any) => g.term === selectedTerm && (g.validated === 1 || isDirector));
                const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + ((Number(g.score) || 0) * (Number(g.coefficient) || 1)), 0);
                const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + (Number(g.coefficient) || 1), 0);
                const avg = totalCoef > 0 ? (totalPoints / totalCoef) : 0;
                return { id: s.id, avg, details };
            }));

            // Sort descending by average
            studentsWithAverages.sort((a, b) => b.avg - a.avg);

            // Find student rank
            const rankIndex = studentsWithAverages.findIndex(s => s.id === student.id);
            const rank = rankIndex !== -1 ? rankIndex + 1 : undefined;
            const totalStudents = studentsWithAverages.length;
            const firstAverage = studentsWithAverages[0]?.avg;
            const lastAverage = studentsWithAverages[studentsWithAverages.length - 1]?.avg;
            const classAverage = totalStudents > 0
                ? studentsWithAverages.reduce((sum: number, s: any) => sum + s.avg, 0) / totalStudents
                : undefined;

            const studentData = studentsWithAverages.find(s => s.id === student.id);
            if (studentData) {
                let template = null;
                if (window.electronAPI) {
                    template = await window.electronAPI.getReportTemplate(user?.schoolId);
                }
                generateReportCard({
                    student,
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
                    lastAverage,
                    ignoreValidation: isDirector
                });
            }
        } catch (err: any) {
            console.error("Error generating report card:", err);
            alert(t('gr_report_generation_error', "Erreur lors de la génération du bulletin : ") + err.message);
        }
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">{t('grades_management')}</h1>
          <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest">{t('grades_subtitle')}</p>
        </div>
      </div>

      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-900/40 border-slate-800">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('section')}</label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            value={selectedSection}
            onChange={(e) => { setSelectedSection(e.target.value); setSelectedClass(''); }}
          >
            <option value="">{t('choose_section')}</option>
            {sections.map(s => <option key={s} value={s}>{t(`section_${s.toLowerCase()}`)}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('choose_classroom')}</label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all disabled:opacity-30"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">{t('select_classroom')}</option>
            {classes.filter(c => c.section === selectedSection).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('term', 'Période')}</label>
          <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            value={selectedTerm} onChange={(e) => {
                const newTerm = parseInt(e.target.value);
                setSelectedTerm(newTerm);
                const termObj = termStructure.find(t => t.term_id === newTerm);
                if (termObj && termObj.sequences && termObj.sequences.length > 0) {
                    setSelectedMonth(termObj.sequences[0].id.toString());
                } else {
                    setSelectedMonth('');
                }
            }}>
            {termStructure.length === 0 && <option value="">{t('gr_no_period_configured', '-- Aucune période configurée --')}</option>}
            {termStructure.map(ts => (
                <option key={ts.term_id} value={ts.term_id}>{ts.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('evaluation_month', 'Séquence / Mois')}</label>
          <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {termStructure.find(t => t.term_id === selectedTerm)?.sequences?.length ? (
                termStructure.find(t => t.term_id === selectedTerm)?.sequences.map((seq: any) => (
                    <option key={seq.id} value={seq.id}>{seq.name}</option>
                ))
            ) : (
                <option value="">{t('gr_no_sequence_configured', '-- Aucune séquence --')}</option>
            )}
          </select>
        </div>
      </div>

      {!selectedClass ? (
          <div className="glass-card p-20 text-center text-slate-500 border-2 border-dashed border-slate-800 flex flex-col items-center justify-center">
              <BookOpen className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-sm font-black uppercase tracking-widest">{t('select_context_to_start')}</p>
          </div>
      ) : (
          <div className="glass-card overflow-hidden border-slate-800">
            <div className="p-4 bg-white/5 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2">
                    {isLocked ? (
                        <span className="flex items-center text-[10px] font-black text-rose-500 bg-rose-500/10 px-4 py-1.5 rounded-full uppercase tracking-widest border border-rose-500/20">
                            <Lock className="w-3 h-3 mr-2" /> {t('locked_status')}
                        </span>
                    ) : (
                        <span className="flex items-center text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-full uppercase tracking-widest border border-emerald-500/20">
                            <Unlock className="w-3 h-3 mr-2" /> {t('unlocked_status')}
                        </span>
                    )}
                    {isPastDeadline && (
                      <div className="flex items-center space-x-2">
                        <span className="flex items-center text-[10px] font-black text-amber-500 bg-amber-500/10 px-4 py-1.5 rounded-full uppercase tracking-widest border border-amber-500/20">
                            <AlertCircle className="w-3 h-3 mr-2" /> {t('deadline_exceeded', 'DÉLAI DÉPASSÉ')}
                        </span>
                        {user?.role === 'TEACHER' && (
                          <button
                            onClick={handleRequestReactivation}
                            className="bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full font-bold text-[10px] uppercase hover:bg-amber-500/30 transition-all border border-amber-500/30"
                          >
                            {t('request_reactivation_btn', 'Demander Réactivation')}
                          </button>
                        )}
                      </div>
                    )}
                    {user?.role === 'TEACHER' && (isLocked || isPastDeadline) && (
                        <button
                            onClick={handleRequestUnlock}
                            className="bg-amber-500 text-slate-950 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all inline-flex items-center shadow-lg shadow-amber-500/20"
                        >
                            {t('request_unlock_btn', 'Demander Déblocage')}
                        </button>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    {hasRole(['DIRECTOR', 'FOUNDER', 'ADVISOR']) && (
                        <button
                            onClick={handleGrantOverride}
                            className="bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-xl font-bold text-xs hover:bg-indigo-500/30 transition-all border border-indigo-500/30 flex items-center"
                            title={t('grant_override_tooltip', "Accorder une dérogation de délai à l'enseignant")}
                        >
                            {t('override_label', 'DÉROGATION')}
                        </button>
                    )}
                    {(hasRole(['DIRECTOR', 'FOUNDER']) || (user?.role === 'SG' && isSgActing)) && !isClassValidated && (
                        <button
                            onClick={handleValidateClass}
                            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all inline-flex items-center shadow-lg shadow-emerald-600/20"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> {t('validate_for_printing', 'VALIDER LES IMPRESSIONS')}
                        </button>
                    )}
                    {(hasRole(['DIRECTOR', 'FOUNDER']) || (user?.role === 'SG' && isSgActing)) && isClassValidated && (
                        <span className="flex items-center text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-4 py-1.5 rounded-full uppercase tracking-widest border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-2" /> {t('class_validated_badge', 'CLASSE VALIDÉE')}
                        </span>
                    )}
                    {!isLocked ? (
                        <button
                            onClick={handleSave}
                            disabled={isLocked || isPastDeadline}
                            className="bg-amber-500 text-slate-950 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all inline-flex items-center shadow-lg shadow-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4 mr-2" /> {t('save_grades') || 'Sauvegarder'}
                        </button>
                    ) : (
                        (hasRole(['DIRECTOR', 'FOUNDER']) || (user?.role === 'SG' && isSgActing)) && (
                            <button
                                onClick={handleUnlock}
                                className="bg-rose-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all inline-flex items-center shadow-lg shadow-rose-500/20"
                            >
                                <Unlock className="w-4 h-4 mr-2" /> {t('unlock_for_correction')}
                            </button>
                        )
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-slate-500 font-black border-b border-white/5">
                  <tr className="bg-slate-900/50">
                    <th className="px-6 py-5 sticky left-0 bg-slate-900 backdrop-blur-md z-10">{t('student')}</th>
                    {subjects.map(s => (
                      <th key={s.id} className="px-4 py-5 text-center min-w-[120px]">
                        <div className="truncate max-w-[100px] mx-auto text-white">{s.name}</div>
                        <div className="text-[8px] text-amber-500/50 mt-0.5">{t('coefficient')}: {s.coefficient}</div>
                      </th>
                    ))}
                    <th className="px-6 py-5 text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {students.map(student => {
                    const isStudentNotRegistered = student.has_paid_registration === 0;
                    const isStudentBlocked = student.status === 'BLOCKED';
                    return (
                    <tr key={student.id} className={`hover:bg-white/5 group transition-colors ${(isStudentNotRegistered || isStudentBlocked) ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 sticky left-0 bg-slate-950 backdrop-blur-md group-hover:bg-slate-900 transition-colors z-10 border-r border-white/5">
                        <div className="text-white font-black uppercase text-sm tracking-tight flex items-center gap-2">
                          {student.last_name}
                          {isStudentNotRegistered && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20">{t('not_registered_badge', 'Non-Inscrit')}</span>}
                          {isStudentBlocked && <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20">{t('blocked_badge', 'Bloqué')}</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold">{student.first_name}</div>
                      </td>
                      {subjects.map(subject => {
                        const classObj = classes.find(c => c.id.toString() === selectedClass);
                        const isNursery = classObj?.level === 'MATERNELLE';
                        
                        // Check if we have scale configuration
                        if (scaleConfig) {
                          if (scaleConfig.scale.is_numerical === 0) {
                            // Literal direct scale
                            return (
                              <td key={subject.id} className="px-4 py-4">
                                <select
                                  disabled={isLocked || isPastDeadline || subject._readOnly || isStudentNotRegistered || isStudentBlocked}
                                  value={grades[`${student.id}-${subject.id}`] ?? ''}
                                  onChange={(e) => {
                                      const val = e.target.value;
                                      const updated = { ...grades };
                                      if (val === '') {
                                          delete updated[`${student.id}-${subject.id}`];
                                      } else {
                                          updated[`${student.id}-${subject.id}`] = val;
                                      }
                                      setGrades(updated);
                                  }}
                                  className="w-28 bg-slate-900/50 border border-slate-800 rounded-xl py-2 px-1 text-center text-white text-xs font-black focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                >
                                  <option value="">--</option>
                                  {scaleConfig.options.map((opt: any) => (
                                    <option key={opt.id} value={opt.symbol}>{opt.symbol} ({opt.description})</option>
                                  ))}
                                </select>
                              </td>
                            );
                          } else {
                            // Numerical with conversion (Mode A)
                            const minVal = scaleConfig.scale.min_value ?? 0;
                            const maxVal = scaleConfig.scale.max_value ?? 20;
                            return (
                              <td key={subject.id} className="px-4 py-4">
                                <input
                                  type="text"
                                  disabled={isLocked || isPastDeadline || subject._readOnly || isStudentNotRegistered || isStudentBlocked}
                                  value={grades[`${student.id}-${subject.id}`] ?? ''}
                                  onChange={(e) => {
                                      const raw = e.target.value;
                                      if (raw === '' || /^\d*[.,]?\d{0,2}$/.test(raw)) {
                                          const cleanRaw = raw.replace(',', '.');
                                          const parsed = parseFloat(cleanRaw);
                                          if (raw === '' || raw === '.' || raw === ',' || (!isNaN(parsed) && parsed >= minVal && parsed <= maxVal)) {
                                              const updated = { ...grades };
                                              if (raw === '') {
                                                  delete updated[`${student.id}-${subject.id}`];
                                              } else {
                                                  updated[`${student.id}-${subject.id}`] = raw;
                                              }
                                              setGrades(updated);
                                          }
                                      }
                                  }}
                                  placeholder={`${minVal.toFixed(1)}-${maxVal.toFixed(1)}`}
                                  className="w-20 bg-slate-900/50 border border-slate-800 rounded-xl py-2 text-center text-white text-sm font-black focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                />
                              </td>
                            );
                          }
                        }

                        // Fallback to legacy behavior
                        return (
                          <td key={subject.id} className="px-4 py-4">
                            {isNursery ? (
                              <select
                                disabled={isLocked || isPastDeadline || subject._readOnly}
                                value={grades[`${student.id}-${subject.id}`] ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = { ...grades };
                                    if (val === '') {
                                        delete updated[`${student.id}-${subject.id}`];
                                    } else {
                                        updated[`${student.id}-${subject.id}`] = val;
                                    }
                                    setGrades(updated);
                                }}
                                className="w-28 bg-slate-900/50 border border-slate-800 rounded-xl py-2 px-1 text-center text-white text-xs font-black focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                              >
                                <option value="">--</option>
                                <option value="19">{t('appreciation_expert_label')}</option>
                                <option value="15">{t('appreciation_acquired_label')}</option>
                                <option value="11">{t('appreciation_progress_label')}</option>
                                <option value="5">{t('appreciation_not_acquired_label')}</option>
                              </select>
                            ) : (
                              <input
                                type="text"
                                disabled={isLocked || isPastDeadline || subject._readOnly}
                                value={grades[`${student.id}-${subject.id}`] ?? ''}
                                onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '' || /^\d*[.,]?\d{0,2}$/.test(raw)) {
                                        const cleanRaw = raw.replace(',', '.');
                                        const parsed = parseFloat(cleanRaw);
                                        if (raw === '' || raw === '.' || raw === ',' || (!isNaN(parsed) && parsed >= 0 && parsed <= 20)) {
                                            const updated = { ...grades };
                                            if (raw === '') {
                                                delete updated[`${student.id}-${subject.id}`];
                                            } else {
                                                updated[`${student.id}-${subject.id}`] = raw;
                                            }
                                            setGrades(updated);
                                        }
                                    }
                                }}
                                placeholder="0.00"
                                className="w-20 bg-slate-900/50 border border-slate-800 rounded-xl py-2 text-center text-white text-sm font-black focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                              />
                            )}
                          </td>
                        );
                      })}
                      <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => printStudentReport(student)}
                            disabled={!isLocked || isStudentNotRegistered || isStudentBlocked}
                            title={!isLocked ? t('gr_print_not_validated', "Les notes de la classe ne sont pas encore validées et verrouillées.") : ""}
                            className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-amber-500 transition-all border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                              <FileText className="w-5 h-5" />
                          </button>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
      )}
      {/* Teacher-Subject Mapping for Titulaire */}
      {selectedClass && user?.role === 'TEACHER' && classes.find(c => c.id.toString() === selectedClass)?.main_teacher_id === user?.id && (
        <div className="glass-card overflow-hidden border-slate-800">
          <div className="p-6 border-b border-white/5 flex items-center">
            <BookOpen className="w-5 h-5 text-purple-400 mr-2" />
            <h2 className="text-lg font-black text-white uppercase tracking-tight">{t('gr_class_teachers_heading', 'Enseignants de ma classe')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                  <th className="px-6 py-4">{t('gr_subject_col', 'Matière')}</th>
                  <th className="px-6 py-4">{t('gr_teacher_col', 'Enseignant')}</th>
                  <th className="px-6 py-4 text-center">{t('gr_coef_col', 'Coef')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-slate-900/30">
                {subjects.map(subj => (
                  <tr key={subj.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-black text-white uppercase text-sm">{subj.name}</td>
                    <td className="px-6 py-4 text-xs text-slate-300">{subj.teacher_name || (subj._readOnly ? t('other_teacher') : user?.fullName || t('me'))}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-white">{subj.coefficient}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subject-level Validation Section for Director/Founder/SG Acting */}
      {selectedClass && (user?.role === 'FOUNDER' || user?.role === 'DIRECTOR' || (user?.role === 'SG' && isSgActing)) && (
        <div className="glass-card overflow-hidden border-slate-800">
          <div className="p-6 border-b border-white/5 flex items-center">
            <Award className="w-5 h-5 text-amber-500 mr-2" />
            <h2 className="text-lg font-black text-white uppercase tracking-tight">{t('gr_subject_validation_heading', 'Validation des notes par matière')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                  <th className="px-6 py-4">{t('gr_subject_col', 'Matière')}</th>
                  <th className="px-6 py-4">{t('gr_domain_block_col', 'Domaine / Bloc')}</th>
                  <th className="px-6 py-4 text-center">{t('gr_coef_col', 'Coef')}</th>
                  <th className="px-6 py-4">{t('gr_entry_status_col', 'Statut Saisie')}</th>
                  <th className="px-6 py-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-slate-900/30">
                {subjectStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500 font-bold text-xs">
                      {t('gr_no_subject_programmed', 'Aucune matière programmée pour cette classe et cette période.')}
                    </td>
                  </tr>
                ) : (
                  subjectStatuses.map(subj => {
                    let statusBadge = (
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-white/5 rounded-full text-[9px] font-black uppercase tracking-wider">{t('gr_no_grades_badge', 'Pas de notes')}</span>
                    );
                    if (subj.hasGrades) {
                      if (subj.isValidated) {
                        statusBadge = (
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> {t('validated')}
                          </span>
                        );
                      } else {
                        statusBadge = (
                          <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">{t('pending_validation')}</span>
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
                                <Eye className="w-3.5 h-3.5 mr-1" /> {t('inspect')}
                              </button>
                            )}
                            {subj.hasGrades && !subj.isValidated && (
                              <button
                                onClick={() => handleValidateSubject(subj.id)}
                                className="bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all"
                              >
                                {t('validate_grades')}
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
      )}

      {/* Subject Detail Modal */}
      {showDetailModal && selectedSubjectForDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white uppercase">{selectedSubjectForDetail.name}</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('class_grades_review')}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 text-[9px] font-black uppercase tracking-widest border-b border-white/5">
                    <th className="pb-3">{t('student')}</th>
                    <th className="pb-3">{t('matricule')}</th>
                    <th className="pb-3 text-right">{t('gr_score_out_of_20', 'Note/20')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-bold">
                  {detailGrades.map((g, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 text-white uppercase tracking-tight">{g.studentName}</td>
                      <td className="py-3 text-slate-400 text-xs">{g.matricule}</td>
                      <td className="py-3 text-right">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-black ${g.score === null ? 'bg-slate-800 text-slate-500' : g.score >= 10 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {g.score !== null ? Number(g.score).toFixed(2) : t('gr_abs_not_entered', 'Abs/Non saisi')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-white/5 flex justify-end">
              <button onClick={() => setShowDetailModal(false)} className="bg-slate-800 text-white hover:bg-slate-700 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all">
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
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
                {t('cancel')}
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all text-xs font-black uppercase tracking-widest"
              >
                {t('confirm_btn', 'Confirmer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Override Days Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-2 flex justify-between items-center">
              <h3 className="text-lg font-black text-white italic">{t('gr_grant_override_title', 'Accorder une dérogation')}</h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('gr_extra_days_label', 'Nombre de jours supplémentaires')}</label>
                <input
                  type="number"
                  value={overrideDays}
                  onChange={e => setOverrideDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white font-bold"
                  placeholder={t('gr_extra_days_placeholder', 'ex: 3')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-black uppercase tracking-widest border border-white/5"
              >
                {t('cancel')}
              </button>
              <button
                onClick={submitOverride}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all text-xs font-black uppercase tracking-widest"
              >
                {t('confirm_btn', 'Confirmer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactivation Request Modal */}
      {showReactivationModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-2 flex justify-between items-center">
              <h3 className="text-lg font-black text-white italic">{t('gr_reactivation_request_title', 'Demande de réactivation')}</h3>
              <button onClick={() => setShowReactivationModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-slate-400 text-xs font-semibold">{t('gr_deadline_exceeded_desc', "Le délai de saisie est dépassé. Vous pouvez soumettre une demande motivée de réactivation exceptionnelle au Directeur de l'école.")}</p>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('gr_reason_label', 'Motif de la demande')}</label>
                <textarea
                  value={reactivationReason}
                  onChange={e => setReactivationReason(e.target.value)}
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm font-semibold"
                  placeholder={t('gr_reason_placeholder', 'ex: Problème de connexion, notes reçues tardivement...')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowReactivationModal(false)}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-black uppercase tracking-widest border border-white/5"
              >
                {t('cancel')}
              </button>
              <button
                onClick={submitReactivationRequest}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all text-xs font-black uppercase tracking-widest"
              >
                {t('send_request_btn', 'Envoyer la demande')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Grades;
