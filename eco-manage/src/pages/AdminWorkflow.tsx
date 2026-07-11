import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ShieldCheck, CheckCircle2, UserCheck, Printer, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { generateClassReportCards } from '../utils/reports';
import { onDataChanged } from '../utils/dataSync';

const AdminWorkflow: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSgActing, setIsSgActing] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [school, setSchool] = useState<any>(null);
  const [printingClassId, setPrintingClassId] = useState<number | null>(null);
  const [printingAnnualClassId, setPrintingAnnualClassId] = useState<number | null>(null);
  const [bulletinsValidated, setBulletinsValidated] = useState(false);
  const [evaluationPeriods, setEvaluationPeriods] = useState<any[]>([]);

  const [lockedClasses, setLockedClasses] = useState<string[]>([]);
    const [period, setPeriod] = useState({
    activeId: '1',
    start: '2026-04-20',
    end: '2026-05-15',
    active: true,
    editingAllowed: false
  });

  const loadData = async () => {
    if (window.electronAPI && user) {
        const cls = await window.electronAPI.getClasses(user.schoolId);
        setClasses(cls || []);

        const schoolsList = await window.electronAPI.getSchools();
        const curSchool = schoolsList.find((s: any) => s.id?.toString() === user.schoolId?.toString());
        setSchool(curSchool);
    }
  };

  const loadActingStatus = async () => {
    if (window.electronAPI) {
        const status = await window.electronAPI.getSetting('sg_acting_director');
        setIsSgActing(status === 'true');
        const bv = await window.electronAPI.getSetting('bulletins_validated');
        setBulletinsValidated(bv === 'true');
    }
  };

  const loadPeriodSettings = async () => {
    if (window.electronAPI) {
        const allSet = (await window.electronAPI.getSettings()) || [];
          const locks = allSet.filter((s: any) => s.setting_key.startsWith('class_locked_') && s.setting_value === 'true').map((s: any) => s.setting_key);
          setLockedClasses(locks);
          const startFromDb = await window.electronAPI.getSetting('period_start');
        const endFromDb = await window.electronAPI.getSetting('period_end');
        const start = startFromDb || '2026-04-20';
        const end = endFromDb || '2026-05-15';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const periodExpired = end ? new Date(end) < today : false;
        // Période expirée → toujours false ; période active → null/absent = true (ouvert par défaut)
        const rawAllowed = await window.electronAPI.getSetting('period_editing_allowed');
        let editingAllowed = periodExpired ? false : rawAllowed !== 'false';
        // Always persist lock state so teachers can read it; only persist dates if they came from DB
        await window.electronAPI.setSetting({ key: 'period_editing_allowed', value: editingAllowed ? 'true' : 'false' });
        if (startFromDb) await window.electronAPI.setSetting({ key: 'period_start', value: startFromDb });
        if (endFromDb) await window.electronAPI.setSetting({ key: 'period_end', value: endFromDb });
        const activeTerm = await window.electronAPI.getSetting('active_term') || '1';
        const activeSequence = await window.electronAPI.getSetting('active_sequence') || '';
        const activeId = activeSequence ? `${activeTerm}_${activeSequence}` : activeTerm;
        setPeriod(prev => ({ ...prev, start, end, editingAllowed, activeId }));

        const schoolsList = await window.electronAPI.getSchools();
        const curSchool = schoolsList.find((s: any) => s.id?.toString() === user?.schoolId?.toString()) || schoolsList[0];
        if (curSchool && curSchool.term_structure) {
            try {
                const parsed = JSON.parse(curSchool.term_structure);
                const flattened: any[] = [];
                parsed.forEach((t: any) => {
                    if (t.sequences && t.sequences.length > 0) {
                        t.sequences.forEach((s: any) => {
                            flattened.push({
                                id: `${t.term_id}_${s.id}`,
                                name: `${t.name} - ${s.name}`
                            });
                        });
                    } else {
                        flattened.push({
                            id: t.term_id.toString(),
                            name: t.name
                        });
                    }
                });
                setEvaluationPeriods(flattened);
            } catch(e) {
                setEvaluationPeriods([{ id: '1', name: '1ER TRIMESTRE' }, { id: '2', name: '2E TRIMESTRE' }, { id: '3', name: '3E TRIMESTRE' }]);
            }
        } else if (curSchool && curSchool.evaluation_periods) {
            try {
                const parsed = JSON.parse(curSchool.evaluation_periods);
                setEvaluationPeriods(parsed.map((t: any) => ({ id: t.id.toString(), name: t.name })));
            } catch(e) {
                setEvaluationPeriods([{ id: '1', name: '1ER TRIMESTRE' }, { id: '2', name: '2E TRIMESTRE' }, { id: '3', name: '3E TRIMESTRE' }]);
            }
        } else {
            setEvaluationPeriods([{ id: '1', name: '1ER TRIMESTRE' }, { id: '2', name: '2E TRIMESTRE' }, { id: '3', name: '3E TRIMESTRE' }]);
        }
    }
  };

  useEffect(() => {
    loadData();
    loadActingStatus();
    loadPeriodSettings();
  }, [user]);

  useEffect(() => {
    // Live-refresh class validation status (and other settings-driven state)
    // whenever grades are validated/saved elsewhere (e.g. Advisor or Director portals),
    // so the EN ATTENTE / VALIDÉ badges and print buttons update without a manual reload.
    const unsubscribe = onDataChanged(() => {
        loadPeriodSettings();
        loadActingStatus();
    });
    return unsubscribe;
  }, [user]);

  const handleUpdatePeriod = async () => {
    if (window.electronAPI) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const newEndDate = period.end ? new Date(period.end) : null;
        // Sauvegarder une période future active → toujours activer la saisie
        // (si 'false' en DB c'est un auto-lock de l'ancienne période, pas un choix manuel)
        const finalEditingAllowed = (newEndDate && newEndDate >= today) ? true : period.editingAllowed;

        await window.electronAPI.setSetting({ key: 'period_start', value: period.start });
        await window.electronAPI.setSetting({ key: 'period_end', value: period.end });
        await window.electronAPI.setSetting({ key: 'period_editing_allowed', value: finalEditingAllowed.toString() });
        setPeriod(prev => ({ ...prev, editingAllowed: finalEditingAllowed }));

        const parts = period.activeId.toString().split('_');
        const activeTerm = parts[0];
        const activeSequence = parts[1] || '';
        await window.electronAPI.setSetting({ key: 'active_term', value: activeTerm });
        await window.electronAPI.setSetting({ key: 'active_sequence', value: activeSequence });

        if (finalEditingAllowed) {
            await window.electronAPI.createNotification({
                school_id: user?.schoolId,
                role: 'TEACHER',
                message: t('aw_notif_entry_period_open', 'La période de saisie des notes est ouverte du {{start}} au {{end}}. Veuillez procéder au remplissage.', { start: period.start, end: period.end }),
                type: 'SYSTEM'
            });
        }

        alert(t('aw_period_updated_success', "Période d'évaluation mise à jour avec succès."));
    }
  };

  const toggleSgActing = async () => {
    if (window.electronAPI) {
        const newValue = !isSgActing;
        await window.electronAPI.setSetting({ key: 'sg_acting_director', value: newValue.toString() });
        setIsSgActing(newValue);
        window.dispatchEvent(new Event('sg_mode_changed'));

        alert(newValue
            ? t('aw_sg_mode_enabled_alert', 'Mode SG Intérimaire Activé. Le SG a maintenant les privilèges du directeur.')
            : t('aw_sg_mode_disabled_alert', 'Mode SG Intérimaire Désactivé. Le SG a maintenant les privilèges du directeur.'));
    }
  };

  const toggleBulletinsValidation = async () => {
    if (window.electronAPI) {
        try {
            const newValue = !bulletinsValidated;
            await window.electronAPI.setSetting({ key: 'bulletins_validated', value: newValue.toString() });
            setBulletinsValidated(newValue);

            if (newValue) {
                await window.electronAPI.createNotification({
                    school_id: user?.schoolId,
                    role: 'SG',
                    message: t('aw_notif_bulletins_validated', 'La validation globale des bulletins a été activée par la direction. Vous pouvez maintenant imprimer les bulletins des classes dont les notes sont verrouillées.'),
                    type: 'INFO'
                });
            }

            alert(newValue
                ? t('aw_bulletins_validation_enabled_alert', "Validation globale des bulletins activée. L'impression est désormais autorisée pour les classes verrouillées.")
                : t('aw_bulletins_validation_disabled_alert', "Validation globale des bulletins désactivée. L'impression est désormais bloquée pour les classes verrouillées."));
        } catch (err: any) {
            alert(t('aw_validation_status_update_error', "Erreur lors de la mise à jour du statut de validation : ") + err.message);
        }
    }
  };

  const getActiveTerm = () => period.activeId.toString().split('_')[0];
  const getActiveSequence = () => {
      const parts = period.activeId.toString().split('_');
      return parts.length > 1 ? parts[1] : '';
  };

  const handlePrintClassReportCards = async (classId: number) => {
    if (!window.electronAPI || !school) return;
    setPrintingClassId(classId);
    try {
        const classObj = classes.find(c => c.id === classId);
        if (!classObj) return;

        // Fetch all students of this class
        const allStudents = await window.electronAPI.getStudents(user?.schoolId);
        const classStudents = allStudents.filter((s: any) => s.class_id?.toString() === classId?.toString());

        if (classStudents.length === 0) {
            alert(t('aw_no_student_in_class', 'Aucun élève dans cette classe.'));
            return;
        }

        // Fetch details (grades & attendance) for each student
        const studentsData: any[] = [];
        for (const student of classStudents) {
            const details = await window.electronAPI.getStudentDetails(student.id);
            studentsData.push({
                student,
                grades: details.grades || [],
                attendance: details.attendance || []
            });
        }

        const isDirector = user?.role === 'DIRECTOR' || user?.role === 'FOUNDER' || (user?.role === 'SG' && isSgActing);

        // Calculate averages for rank calculation
        const studentsWithAverages = studentsData.map(sData => {
            const validatedGrades = sData.grades.filter((g: any) =>
                g.term?.toString() === getActiveTerm()?.toString() &&
                (g.validated === 1 || isDirector)
            );
            if (validatedGrades.length === 0) {
                return { ...sData, average: null };
            }
            const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
            const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
            return {
                ...sData,
                average: totalPoints / (totalCoef || 1)
            };
        });

        // Sort students to assign rank
        const sortedStudents = [...studentsWithAverages]
            .filter(s => s.average !== null)
            .sort((a, b) => (b.average || 0) - (a.average || 0));

        const finalStudentsData = studentsWithAverages.map(sData => {
            const termGrades = sData.grades.filter((g: any) => g.term?.toString() === getActiveTerm()?.toString());
            if (sData.average === null) {
                return {
                    student: sData.student,
                    grades: termGrades,
                    attendance: sData.attendance,
                    rank: undefined,
                    totalStudents: classStudents.length
                };
            }
            const rankIndex = sortedStudents.findIndex(s => s.student.id === sData.student.id);
            return {
                student: sData.student,
                grades: termGrades,
                attendance: sData.attendance,
                rank: rankIndex !== -1 ? rankIndex + 1 : undefined,
                totalStudents: classStudents.length
            };
        }).sort((a, b) => {
            if (a.rank === undefined && b.rank === undefined) return 0;
            if (a.rank === undefined) return 1;
            if (b.rank === undefined) return -1;
            return a.rank - b.rank;
        });

        let reportTemplate = null;
        try { reportTemplate = await window.electronAPI.getReportTemplate(user?.schoolId); } catch(e) {}
        generateClassReportCards({
            classObj,
            school,
            term: getActiveTerm(),
            studentsData: finalStudentsData,
            ignoreValidation: isDirector,
            template: reportTemplate
        });

        alert(t('aw_print_launched_success', 'Impression lancée avec succès (le fichier PDF a été généré).'));
    } catch (err: any) {
        console.error(err);
        alert(t('gr_report_generation_error', 'Erreur lors de la génération du bulletin : ') + err.message);
    } finally {
        setPrintingClassId(null);
    }
  };

  const handlePrintAnnualReportCards = async (classId: number) => {
    if (!window.electronAPI || !school) return;
    setPrintingAnnualClassId(classId);
    try {
        const classObj = classes.find(c => c.id === classId);
        if (!classObj) return;

        const allStudents = await window.electronAPI.getStudents(user?.schoolId);
        const classStudents = allStudents.filter((s: any) => s.class_id?.toString() === classId?.toString());

        if (classStudents.length === 0) {
            alert(t('aw_no_student_in_class', 'Aucun élève dans cette classe.'));
            return;
        }

        const studentsData: any[] = [];
        for (const student of classStudents) {
            const details = await window.electronAPI.getStudentDetails(student.id);
            studentsData.push({
                student,
                grades: details.grades || [],
                attendance: details.attendance || []
            });
        }

        const isDirector = user?.role === 'DIRECTOR' || user?.role === 'FOUNDER' || (user?.role === 'SG' && isSgActing);

        // Get all unique terms present in the grades for this class to determine N
        let allTerms = new Set<number>();
        studentsData.forEach(sd => {
            sd.grades.forEach((g: any) => {
                if (g.validated === 1 || isDirector) {
                    allTerms.add(Number(g.term));
                }
            });
        });
        const termsArray = Array.from(allTerms).sort((a, b) => a - b);
        const N = termsArray.length || 1;

        // Calculate averages for rank calculation
        const studentsWithAverages = studentsData.map(sData => {
            // Only keep validated grades
            const validGrades = sData.grades.filter((g: any) => g.validated === 1 || isDirector);
            if (validGrades.length === 0) {
                return { ...sData, validGrades, average: null, termAverages: {} };
            }

            let termAverages: Record<number, number> = {};
            let sumOfTermAverages = 0;
            let termsCountForStudent = 0;

            termsArray.forEach(t => {
                const termG = validGrades.filter((g: any) => Number(g.term) === t);
                if (termG.length > 0) {
                    const tPts = termG.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
                    const tCoef = termG.reduce((acc: number, g: any) => acc + g.coefficient, 0);
                    const tAvg = tPts / (tCoef || 1);
                    termAverages[t] = tAvg;
                    sumOfTermAverages += tAvg;
                    termsCountForStudent++;
                }
            });

            // The annual average is the sum of ALL term averages divided by N (the total number of terms for the school year so far)
            const annualAverage = sumOfTermAverages / N;

            return {
                ...sData,
                validGrades,
                termAverages,
                average: annualAverage
            };
        });

        // Sort students to assign rank
        const sortedStudents = [...studentsWithAverages]
            .filter(s => s.average !== null)
            .sort((a, b) => (b.average || 0) - (a.average || 0));

        const finalStudentsData = studentsWithAverages.map(sData => {
            if (sData.average === null) {
                return {
                    ...sData,
                    rank: undefined,
                    totalStudents: classStudents.length,
                    termsArray
                };
            }
            const rankIndex = sortedStudents.findIndex(s => s.student.id === sData.student.id);
            return {
                ...sData,
                rank: rankIndex !== -1 ? rankIndex + 1 : undefined,
                totalStudents: classStudents.length,
                termsArray
            };
        }).sort((a, b) => {
            if (a.rank === undefined && b.rank === undefined) return 0;
            if (a.rank === undefined) return 1;
            if (b.rank === undefined) return -1;
            return a.rank - b.rank;
        });

        let reportTemplateAnnual = null;
        try { reportTemplateAnnual = await window.electronAPI.getReportTemplate(user?.schoolId); } catch(e) {}
        generateClassReportCards({
            classObj,
            school,
            term: 'ANNUEL',
            studentsData: finalStudentsData,
            ignoreValidation: isDirector,
            template: reportTemplateAnnual,
            isAnnual: true
        });

        alert(t('aw_annual_print_launched_success', 'Impression du bulletin ANNUEL lancée avec succès.'));
    } catch (err: any) {
        console.error(err);
        alert(t('gr_report_generation_error', 'Erreur lors de la génération du bulletin : ') + err.message);
    } finally {
        setPrintingAnnualClassId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">{t('admin_control')}</h1>
        <p className="text-slate-400 mt-1">{t('admin_control_desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Evaluation Period Control */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center space-x-3 text-slate-gold-gold">
            <Calendar className="w-6 h-6" />
            <h2 className="text-xl font-semibold">{t('evaluation_period')}</h2>
          </div>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-4">
              <div className="col-span-2">
                <label className="text-xs uppercase text-slate-500 font-bold">{t('aw_active_period', 'Période Active')}</label>
                <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1 outline-none focus:border-amber-500"
                    value={period.activeId}
                    onChange={(e) => setPeriod(prev => ({ ...prev, activeId: e.target.value }))}
                >
                    {evaluationPeriods.map(ep => (
                        <option key={ep.id} value={ep.id}>{ep.name}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500 font-bold">{t('start')}</label>
                <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1" value={period.start} onChange={(e) => setPeriod(prev => ({...prev, start: e.target.value}))} />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500 font-bold">{t('end')}</label>
                <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1" value={period.end} onChange={(e) => {
                    const newEnd = e.target.value;
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const isOpen = newEnd && new Date(newEnd) >= today;
                    setPeriod(prev => ({ ...prev, end: newEnd, editingAllowed: !!isOpen }));
                }} />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-300">{t('allow_grade_entry')}</span>
              <div 
                  onClick={async () => {
                      const newValue = !period.editingAllowed;
                      setPeriod(prev => ({...prev, editingAllowed: newValue}));
                      if (window.electronAPI) {
                          await window.electronAPI.setSetting({ key: 'period_editing_allowed', value: newValue.toString() });
                      }
                  }}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${period.editingAllowed ? 'bg-green-500' : 'bg-slate-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${period.editingAllowed ? 'translate-x-6' : ''}`} />
              </div>
            </div>
            {!period.editingAllowed && period.end && new Date(period.end) < new Date() && (
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <span className="text-amber-400 text-xs">⚠️ Saisie automatiquement bloquée — le délai du {new Date(period.end).toLocaleDateString('fr-FR')} est dépassé. La saisie restera bloquée jusqu'à déblocage manuel.</span>
              </div>
            )}
            <button onClick={handleUpdatePeriod} className="w-full py-2 bg-slate-gold-gold text-slate-900 rounded font-bold hover:bg-yellow-500 transition-colors">
              {t('update_period')}
            </button>
          </div>
        </div>

        {/* SG Acting Director Toggle */}
        {(user?.role === 'FOUNDER' || user?.role === 'DIRECTOR') && (
        <div className="glass-card p-6 space-y-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-purple-400">
                <UserCheck className="w-6 h-6" />
                <h2 className="text-xl font-semibold">{t('director_acting')}</h2>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            {t('director_acting_desc')}
          </p>
          <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <div>
                <span className="text-white font-bold block text-sm">{t('sg_acting_mode')}</span>
                <span className="text-[10px] text-slate-500 uppercase font-black">{t('currently')}: {isSgActing ? t('enabled') : t('disabled')}</span>
            </div>
            <div
                onClick={toggleSgActing}
                className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-all duration-300 ${isSgActing ? 'bg-purple-500' : 'bg-slate-700'}`}
            >
                <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${isSgActing ? 'translate-x-7' : ''}`} />
            </div>
          </div>
        </div>
        )}

        {/* Global Print Validation Toggle */}
        {(user?.role === 'FOUNDER' || user?.role === 'DIRECTOR') && (
        <div className="glass-card p-6 space-y-4 md:col-span-2 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
                <h2 className="text-xl font-semibold">{t('aw_global_bulletin_validation', 'Validation Globale des Bulletins')}</h2>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            {t('aw_authorize_secretary_print', "Autoriser la secrétaire à lancer l'impression des bulletins pour toutes les classes.")}
          </p>
          <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <div>
                <span className="text-white font-bold block text-sm">{t('aw_validation_status', 'Statut de validation')}</span>
                <span className="text-[10px] text-slate-500 uppercase font-black">{t('currently')}: {bulletinsValidated ? t('aw_validated_print_authorized', 'VALIDÉ (Impression autorisée)') : t('aw_not_validated_print_blocked', 'NON VALIDÉ (Impression bloquée)')}</span>
            </div>
            <div
                onClick={toggleBulletinsValidation}
                className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-all duration-300 ${bulletinsValidated ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
                <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${bulletinsValidated ? 'translate-x-7' : ''}`} />
            </div>
          </div>
        </div>
        )}

        {/* Validation Status */}
        <div className="glass-card p-6 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
              <h2 className="text-xl font-semibold">{t('report_validation')}</h2>
            </div>
            {(user?.role === 'FOUNDER' || user?.role === 'DIRECTOR' || (user?.role === 'SG' && isSgActing)) && (
              <button
                onClick={() => navigate('/grades')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-all"
              >
                {t('go_validate_grades', 'Aller valider les notes')} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {(user?.role === 'FOUNDER' || user?.role === 'DIRECTOR' || (user?.role === 'SG' && isSgActing))
              ? t('validate_grades_instruction', 'Pour valider les notes d\'une classe, rendez-vous dans la page Notes, sélectionnez la classe puis cliquez sur « VALIDER LES IMPRESSIONS ».')
              : t('validation_status_desc', 'Statut de verrouillage des notes par classe pour la période active.')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classes.map((cls) => {
              const isClassLocked = lockedClasses.some(k => k.startsWith(`class_locked_${cls.id}_${getActiveTerm()}_`) || k === `class_locked_${cls.id}_${getActiveTerm()}_${getActiveSequence()}`);
              return (
                <div key={cls.id} className={`flex items-center justify-between p-4 border rounded-xl bg-slate-900/30 ${isClassLocked ? 'border-emerald-500/30' : 'border-slate-800'}`}>
                  <div>
                    <span className="text-white font-medium block">{cls.name}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase">{cls.section}</span>
                  </div>
                  {isClassLocked ? (
                    <span className="flex items-center text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded border border-emerald-500/20 font-bold uppercase">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> {t('class_validated', 'CLASSE VALIDÉE')}
                    </span>
                  ) : (
                    <span className="flex items-center text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded border border-amber-500/20 font-bold uppercase">
                      <Clock className="w-3 h-3 mr-1" /> {t('status_pending', 'EN ATTENTE')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secretary Print Authorization */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 text-purple-400 mb-6">
          <Printer className="w-6 h-6" />
          <h2 className="text-xl font-semibold">{t('print_auth')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="pb-4">{t('class')}</th>
                <th className="pb-4">{t('aw_level_section', 'Niveau / Section')}</th>
                <th className="pb-4">{t('aw_validation_status_header', 'Statut Validation')}</th>
                <th className="pb-4">{t('aw_action', 'Action')}</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {classes.map((c) => {
                const isClassLockedRow = lockedClasses.some(k => k.startsWith(`class_locked_${c.id}_${getActiveTerm()}_`) || k === `class_locked_${c.id}_${getActiveTerm()}_${getActiveSequence()}`);
                return (
                <tr key={c.id} className="border-t border-slate-850 hover:bg-slate-900/20">
                  <td className="py-4 font-bold text-white">{c.name}</td>
                  <td className="py-4 text-xs font-semibold text-slate-400">{c.level} • {c.section}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isClassLockedRow ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {isClassLockedRow ? t('validated', 'VALIDÉ') : t('status_pending', 'EN ATTENTE')}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                        <button
                        onClick={() => handlePrintClassReportCards(c.id)}
                        disabled={printingClassId === c.id || !isClassLockedRow}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl font-bold hover:from-amber-400 hover:to-amber-500 transition-all shadow-md text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!isClassLockedRow ? t('gr_print_not_validated', 'Les notes de la classe ne sont pas encore validées et verrouillées.') : t('aw_term_report_card_title', 'Bulletin du trimestre actuel')}
                        >
                        <Printer className="w-4 h-4" />
                        {printingClassId === c.id ? t('aw_printing', 'Impression...') : t('start_printing')}
                        </button>

                        <button
                        onClick={() => handlePrintAnnualReportCards(c.id)}
                        disabled={printingAnnualClassId === c.id || !isClassLockedRow}
                        className="px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-xl font-bold hover:bg-slate-700 transition-all shadow-md text-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!isClassLockedRow ? t('gr_print_not_validated', 'Les notes de la classe ne sont pas encore validées et verrouillées.') : t('aw_annual_report_card_title', 'Bulletin Annuel (Moyenne des trimestres)')}
                        >
                        <Printer className="w-4 h-4" />
                        {printingAnnualClassId === c.id ? t('aw_printing', 'Impression...') : t('aw_annual_report_abbr', 'B. Annuel')}
                        </button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminWorkflow;
