import React, { useState, useEffect } from 'react';
import { Save, Lock, Unlock, Filter, Download, CheckCircle2, AlertCircle, FileText, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateReportCard } from '../utils/reports';
import { useAuth } from '../context/AuthContext';

const Grades: React.FC = () => {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const [sections, _setSections] = useState(['FRANCOPHONE', 'ANGLOPHONE']);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [selectedSection, setSelectedSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE' | ''>('FRANCOPHONE');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('month_oct');

  const [grades, setGrades] = useState<Record<string, number>>({});
  const [isLocked, setIsLocked] = useState(false);

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
      }
  }

  useEffect(() => { loadData(); }, []);

  const handleLoadContext = async () => {
    if (window.electronAPI && selectedClass) {
        const classObj = classes.find(c => c.id.toString() === selectedClass);
        const allStudents = await window.electronAPI.getStudents(user?.schoolId);
        setStudents(allStudents.filter((s: any) => s.class_id.toString() === selectedClass));

        const classSubs = await window.electronAPI.getClassSubjects(parseInt(selectedClass));
        setSubjects(classSubs);

        const existingGrades = await window.electronAPI.getGrades({
            classId: parseInt(selectedClass),
            term: selectedTerm
        });

        const gradeMap: Record<string, number> = {};
        let locked = false;
        existingGrades.forEach((g: any) => {
            if (g.month === selectedMonth) {
                gradeMap[`${g.student_id}-${g.subject_id}`] = g.score;
                if (g.locked) locked = true;
            }
        });
        setGrades(gradeMap);
        setIsLocked(locked);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedMonth) {
        handleLoadContext();
    }
  }, [selectedClass, selectedMonth, selectedTerm]);

  const handleSave = async () => {
    const formattedGrades = Object.entries(grades).map(([key, score]) => {
        const [studentId, subjectId] = key.split('-');
        return {
          student_id: parseInt(studentId),
          subject_id: parseInt(subjectId),
          class_id: parseInt(selectedClass),
          term: selectedTerm,
          month: selectedMonth,
          score: score,
          teacher_id: user?.id
        };
      });

    if (window.electronAPI) {
      const result = await window.electronAPI.saveGrades(formattedGrades);
      if (result.success) {
        alert(t('grades_saved_draft_msg') || 'Notes sauvegardées (Brouillon)');
        handleLoadContext();
      } else {
        alert('Erreur: ' + result.error);
      }
    }
  };

  const handleUnlock = async () => {
    if (window.electronAPI) {
        if (confirm(t('confirm_unlock'))) {
            await window.electronAPI.unlockGrades({
                classId: parseInt(selectedClass),
                term: selectedTerm,
                month: selectedMonth
            });
            setIsLocked(false);
            handleLoadContext();
        }
    }
  };

  const printStudentReport = async (student: any) => {
      if (window.electronAPI) {
          const classObj = classes.find(c => c.id.toString() === selectedClass);
          const schools = await window.electronAPI.getSchools();
          const school = schools.find((s: any) => s.id === user?.schoolId) || schools[0];
          
          // Fetch all students in this class
          const allStudents = await window.electronAPI.getStudents(user?.schoolId);
          const classStudents = allStudents.filter((s: any) => s.class_id.toString() === selectedClass);

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
          const rankIndex = studentsWithAverages.findIndex(s => s.id === student.id);
          const rank = rankIndex !== -1 ? rankIndex + 1 : undefined;
          const totalStudents = studentsWithAverages.length;

          const studentData = studentsWithAverages.find(s => s.id === student.id);
          if (studentData) {
              generateReportCard({
                  student,
                  classObj,
                  school,
                  grades: studentData.details.grades.filter((g: any) => g.term === selectedTerm),
                  attendance: studentData.details.attendance,
                  term: selectedTerm,
                  rank,
                  totalStudents
              });
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
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('term')}</label>
          <select className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            value={selectedTerm} onChange={(e) => setSelectedTerm(parseInt(e.target.value))}>
            <option value={1}>{t('term_1')}</option>
            <option value={2}>{t('term_2')}</option>
            <option value={3}>{t('term_3')}</option>
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
                </div>
                <div className="flex items-center space-x-4">
                    {!isLocked ? (
                        <button
                            onClick={handleSave}
                            className="bg-amber-500 text-slate-950 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all inline-flex items-center shadow-lg shadow-amber-500/20"
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
                        return (
                          <td key={subject.id} className="px-4 py-4">
                            {isNursery ? (
                              <select
                                disabled={isLocked}
                                value={grades[`${student.id}-${subject.id}`] ?? ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const updated = { ...grades };
                                    if (isNaN(val)) {
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
                                type="number"
                                step="0.25"
                                min="0"
                                max="20"
                                disabled={isLocked}
                                value={grades[`${student.id}-${subject.id}`] ?? ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const updated = { ...grades };
                                    if (isNaN(val)) {
                                        delete updated[`${student.id}-${subject.id}`];
                                    } else {
                                        updated[`${student.id}-${subject.id}`] = val;
                                    }
                                    setGrades(updated);
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
                            className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-amber-500 transition-all border border-white/5"
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
    </div>
  );
};

export default Grades;
