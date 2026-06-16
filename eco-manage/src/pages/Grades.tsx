import React, { useState, useEffect } from 'react';
import { Save, Lock, Unlock, Filter, Download, CheckCircle2, AlertCircle, FileText, BookOpen, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateReportCard } from '../utils/reports';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Grades: React.FC = () => {
  const { t } = useTranslation();
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
  const [evaluationPeriods, setEvaluationPeriods] = useState<any[]>([]);
  const [scaleConfig, setScaleConfig] = useState<any>(null);

  const [selectedSection, setSelectedSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE' | ''>('FRANCOPHONE');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('month_oct');

  const [grades, setGrades] = useState<Record<string, string>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [isPastDeadline, setIsPastDeadline] = useState(false);
  const [bulletinsValidated, setBulletinsValidated] = useState(false);

  const loadData = async () => {
      if (window.electronAPI) {
        const c = await window.electronAPI.getClasses(user?.schoolId);
        if (user?.role === 'TEACHER') {
            let assignedIds: number[] = [];
            try {
                if (typeof user.assignedClasses === 'string') {
                    assignedIds = JSON.parse(user.assignedClasses);
                } else if (Array.isArray(user.assignedClasses)) {
                    assignedIds = user.assignedClasses;
                }
            } catch (e) {
                console.error('Failed to parse assigned classes:', e);
            }
            const filtered = c.filter((cls: any) => assignedIds.includes(cls.id));
            setClasses(filtered);
        } else {
            setClasses(c);
        }
        
        const bv = await window.electronAPI.getSetting('bulletins_validated');
        setBulletinsValidated(bv === 'true');

        const schools = await window.electronAPI.getSchools();
        const mySchool = schools.find((s: any) => s.id?.toString() === user?.schoolId?.toString()) || schools[0];
        if (mySchool && mySchool.evaluation_periods) {
            try {
                setEvaluationPeriods(JSON.parse(mySchool.evaluation_periods));
            } catch(e) {
                setEvaluationPeriods([{ id: 1, name: '1ER TRIMESTRE' }, { id: 2, name: '2E TRIMESTRE' }, { id: 3, name: '3E TRIMESTRE' }]);
            }
        } else {
            setEvaluationPeriods([{ id: 1, name: '1ER TRIMESTRE' }, { id: 2, name: '2E TRIMESTRE' }, { id: 3, name: '3E TRIMESTRE' }]);
        }
      }
  }

  useEffect(() => { loadData(); }, []);

  const handleLoadContext = async () => {
    if (window.electronAPI && selectedClass) {
        const classObj = classes.find(c => c.id.toString() === selectedClass);
        const allStudents = await window.electronAPI.getStudents(user?.schoolId);
        setStudents(allStudents.filter((s: any) => s.class_id?.toString() === selectedClass?.toString() && s.has_paid_registration === 1));

        let classSubs = await window.electronAPI.getClassSubjects(parseInt(selectedClass));
        
        if (user?.role === 'TEACHER') {
            try {
                const assignedSubs = await window.electronAPI.getTeacherAssignedSubjects({
                    classId: parseInt(selectedClass),
                    teacherId: user.id
                });
                classSubs = assignedSubs || [];
            } catch (e) {
                console.error("Failed to load teacher assigned subjects", e);
                classSubs = [];
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
                if (g.locked) locked = true;
            }
        });
        setGrades(gradeMap);
        setIsLocked(locked);

        // Check deadline and permissions
        let pastDeadline = false;
        const editingAllowed = await window.electronAPI.getSetting('period_editing_allowed');
        if (editingAllowed === 'false') {
            pastDeadline = true;
            
            // Check for override if master toggle is false
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
    if (selectedClass && selectedMonth) {
        handleLoadContext();
    }
  }, [selectedClass, selectedMonth, selectedTerm]);

  const handleSave = async () => {
    if (isLocked || isPastDeadline) {
        showNotification("La saisie est bloquée (période fermée ou délai dépassé).", "error");
        return;
    }
    const formattedGrades = Object.entries(grades).map(([key, scoreOrLetter]) => {
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
            message: `Des notes ont été enregistrées pour la classe ${classes.find(c => c.id.toString() === selectedClass)?.name || selectedClass} (${selectedMonth}, Trimestre ${selectedTerm}) par ${user?.fullName || 'un enseignant'}.`,
            type: 'INFO',
            school_id: user?.schoolId
        });

        showNotification("✅ Les notes ont été enregistrées avec succès !", "success");
        handleLoadContext();
      } else {
        showNotification("Erreur: " + result.error, "error");
      }
    } else {
      // Mobile / Web fallback
      const key = `pending_grades_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(formattedGrades));
      showNotification("✅ Notes sauvegardées localement !", "success");
    }
  };

  const handleUnlock = async () => {
    if (window.electronAPI) {
        setConfirmModal({
            title: t('confirm_unlock') || "Déverrouiller les notes",
            message: "Êtes-vous sûr de vouloir déverrouiller toutes les notes pour cette classe, cette période et ce mois ?",
            onConfirm: async () => {
                await window.electronAPI.unlockGrades({
                    classId: parseInt(selectedClass),
                    term: selectedTerm,
                    month: selectedMonth
                });
                setIsLocked(false);
                showNotification("Notes déverrouillées avec succès !", "success");
                handleLoadContext();
            }
        });
    }
  };

  const handleValidateClass = async () => {
    if (window.electronAPI) {
        setConfirmModal({
            title: "Valider et verrouiller",
            message: "Voulez-vous valider et verrouiller toutes les notes de cette classe pour ce trimestre et ce mois ? Cela permettra d'imprimer les bulletins officiels.",
            onConfirm: async () => {
                try {
                    const result = await (window.electronAPI as any).validateClassGrades({
                        classId: parseInt(selectedClass),
                        term: selectedTerm,
                        month: selectedMonth
                    });
                    
                    // Notify Secretary/Advisor
                    await window.electronAPI.createNotification({
                        role: 'SECRETARY',
                        message: `Les notes de la classe ${classes.find(c => c.id.toString() === selectedClass)?.name || selectedClass} (${selectedMonth}, Trimestre ${selectedTerm}) ont été validées par le Directeur. Les bulletins sont prêts pour l'impression.`,
                        type: 'INFO',
                        school_id: user?.schoolId
                    });

                    showNotification("✅ Toutes les notes ont été validées et verrouillées !", "success");
                    handleLoadContext();
                } catch (err: any) {
                    showNotification("Erreur lors de la validation : " + err.message, "error");
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
                  return assigned.includes(parseInt(selectedClass));
              } catch (e) {
                  return false;
              }
          });

          if (!classObj || !teacher) {
              showNotification("Cette classe n'a pas de titulaire assigné, impossible d'accorder une dérogation.", "error");
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
              showNotification("Erreur lors de l'application de la dérogation.", "error");
              setShowOverrideModal(false);
              return;
          }

          await window.electronAPI.createNotification({
              school_id: user?.schoolId,
              user_id: teacher.id,
              message: `Une dérogation exceptionnelle de saisie des notes vous a été accordée pour la classe ${classObj.name} jusqu'au ${formattedDate}.`,
              type: 'SYSTEM'
          });

          showNotification(`Dérogation accordée jusqu'au ${formattedDate}.`, "success");
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
              showNotification("Demande de réactivation envoyée au directeur.", "success");
              setShowReactivationModal(false);
              setReactivationReason('');
          } catch (e: any) {
              showNotification("Erreur lors de l'envoi : " + e.message, "error");
          }
      }
  };

  const printStudentReport = async (student: any) => {
    if (window.electronAPI) {
        try {
            const classObj = classes.find(c => c.id.toString() === selectedClass);
            const schools = await window.electronAPI.getSchools();
            const school = schools.find((s: any) => s.id?.toString() === user?.schoolId?.toString()) || schools[0];
            
            // Fetch all students in this class
            const allStudents = await window.electronAPI.getStudents(user?.schoolId);
            const classStudents = allStudents.filter((s: any) => s.class_id?.toString() === selectedClass?.toString());

            const isDirector = user?.role === 'DIRECTOR' || user?.role === 'FOUNDER';
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
                    ignoreValidation: isDirector
                });
            }
        } catch (err: any) {
            console.error("Error generating report card:", err);
            alert("Erreur lors de la génération du bulletin : " + err.message);
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
            value={selectedTerm} onChange={(e) => setSelectedTerm(parseInt(e.target.value))}>
            {evaluationPeriods.map(ep => (
                <option key={ep.id} value={ep.id}>{ep.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('evaluation_month')}</label>
          <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="month_oct">{t('month_oct')}</option>
            <option value="month_nov">{t('month_nov')}</option>
            <option value="month_dec">{t('month_dec')}</option>
            <option value="month_jan">{t('month_jan')}</option>
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
                            <AlertCircle className="w-3 h-3 mr-2" /> DÉLAI DÉPASSÉ
                        </span>
                        {user?.role === 'TEACHER' && (
                          <button
                            onClick={handleRequestReactivation}
                            className="bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full font-bold text-[10px] uppercase hover:bg-amber-500/30 transition-all border border-amber-500/30"
                          >
                            Demander Réactivation
                          </button>
                        )}
                      </div>
                    )}
                </div>
                <div className="flex items-center space-x-4">
                    {hasRole(['DIRECTOR', 'FOUNDER', 'ADVISOR']) && (
                        <button
                            onClick={handleGrantOverride}
                            className="bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-xl font-bold text-xs hover:bg-indigo-500/30 transition-all border border-indigo-500/30 flex items-center"
                            title="Accorder une dérogation de délai à l'enseignant"
                        >
                            DÉROGATION
                        </button>
                    )}
                    {hasRole(['DIRECTOR', 'FOUNDER']) && !isLocked && (
                        <button
                            onClick={handleValidateClass}
                            className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all inline-flex items-center shadow-lg shadow-emerald-600/20"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" /> VALIDER LES IMPRESSIONS
                        </button>
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
                        hasRole(['DIRECTOR', 'FOUNDER']) && (
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
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-white/5 group transition-colors">
                      <td className="px-6 py-4 sticky left-0 bg-slate-950 backdrop-blur-md group-hover:bg-slate-900 transition-colors z-10 border-r border-white/5">
                        <div className="text-white font-black uppercase text-sm tracking-tight">{student.last_name}</div>
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
                                  disabled={isLocked || isPastDeadline}
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
                                  disabled={isLocked || isPastDeadline}
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
                                disabled={isLocked || isPastDeadline}
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
                                disabled={isLocked || isPastDeadline}
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
                            disabled={!bulletinsValidated && user?.role === 'SECRETARY'}
                            title={(!bulletinsValidated && user?.role === 'SECRETARY') ? "L'impression n'est pas encore autorisée par la direction." : ""}
                            className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-amber-500 transition-all border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                              <FileText className="w-5 h-5" />
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {/* Override Days Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-2 flex justify-between items-center">
              <h3 className="text-lg font-black text-white italic">Accorder une dérogation</h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nombre de jours supplémentaires</label>
                <input
                  type="number"
                  value={overrideDays}
                  onChange={e => setOverrideDays(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white font-bold"
                  placeholder="ex: 3"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowOverrideModal(false)}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-black uppercase tracking-widest border border-white/5"
              >
                Annuler
              </button>
              <button
                onClick={submitOverride}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all text-xs font-black uppercase tracking-widest"
              >
                Confirmer
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
              <h3 className="text-lg font-black text-white italic">Demande de réactivation</h3>
              <button onClick={() => setShowReactivationModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-slate-400 text-xs font-semibold">Le délai de saisie est dépassé. Vous pouvez soumettre une demande motivée de réactivation exceptionnelle au Directeur de l'école.</p>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Motif de la demande</label>
                <textarea
                  value={reactivationReason}
                  onChange={e => setReactivationReason(e.target.value)}
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm font-semibold"
                  placeholder="ex: Problème de connexion, notes reçues tardivement..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowReactivationModal(false)}
                className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-black uppercase tracking-widest border border-white/5"
              >
                Annuler
              </button>
              <button
                onClick={submitReactivationRequest}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all text-xs font-black uppercase tracking-widest"
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Grades;
