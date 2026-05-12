import React, { useState, useEffect } from 'react';
import { Save, Lock, Unlock, FileText, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateReportCard } from '../utils/reports';
import { useAuth } from '../context/AuthContext';

const Grades: React.FC = () => {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [sections, _setSections] = useState(['FRANCOPHONE', 'ANGLOPHONE']);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [selectedSection, setSelectedSection] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('month_oct');

  const [grades, setGrades] = useState<Record<string, number>>({});
  const [dbGrades, setDbGrades] = useState<any[]>([]);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (window.electronAPI) {
        const c = await window.electronAPI.getClasses();
        const s = await window.electronAPI.getSubjects();
        setClasses(c);
        setSubjects(s);
      }
    };
    init();
  }, []);

  const handleLoadStudents = async () => {
    if (window.electronAPI && selectedClass) {
        const allStudents = await window.electronAPI.getStudents();
        setStudents(allStudents.filter((s: any) => s.class_id.toString() === selectedClass));

        const existingGrades = await window.electronAPI.getGrades({
            classId: parseInt(selectedClass),
            term: selectedTerm
        });
        setDbGrades(existingGrades);

        const gradeMap: Record<string, number> = {};
        existingGrades.forEach((g: any) => {
            if (g.month === selectedMonth) {
                gradeMap[`${g.student_id}-${g.subject_id}`] = g.score;
                if (g.locked) setIsLocked(true);
            }
        });
        setGrades(gradeMap);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedMonth) {
        handleLoadStudents();
        setIsLocked(false);
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
          teacher_id: 1 // TODO: get from auth
        };
      });

    if (window.electronAPI) {
      const result = await window.electronAPI.saveGrades(formattedGrades);
      if (result.success) {
        setIsLocked(true);
        alert(t('grades_locked_msg') || 'Notes enregistrées et verrouillées.');
        handleLoadStudents();
      } else {
        alert('Erreur: ' + result.error);
      }
    } else {
        localStorage.setItem(`pending_grades_${selectedClass}_${selectedMonth}`, JSON.stringify(formattedGrades));
        alert(t('sync_pending_msg') || 'Sauvegardé localement. Synchronisez plus tard.');
    }
  };

  const handleUnlock = async () => {
    if (window.electronAPI) {
        if (confirm(t('confirm_unlock') || 'Êtes-vous sûr de vouloir déverrouiller ces notes ?')) {
            await window.electronAPI.unlockGrades({
                classId: parseInt(selectedClass),
                term: selectedTerm,
                month: selectedMonth
            });
            setIsLocked(false);
            handleLoadStudents();
        }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">{t('grades_management')}</h1>
          <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest">{t('grades_subtitle')}</p>
        </div>
        <div className="flex space-x-2">
            {selectedClass && students.length > 0 && (
                <button
                    onClick={() => {
                        const s = students[0];
                        const classSubjects = subjects.filter(sub => sub.level === classes.find(c => c.id.toString() === selectedClass)?.level && sub.section === selectedSection);
                        generateReportCard(
                            { ...s, className: classes.find(c => c.id.toString() === selectedClass)?.name },
                            dbGrades.filter(g => g.student_id === s.id),
                            selectedSection,
                            classSubjects
                        );
                    }}
                    className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 hover:text-slate-950 transition-all flex items-center shadow-lg"
                >
                    <FileText className="w-4 h-4 mr-2" /> {t('report_card_preview')} <span className="ml-1 opacity-50">{t('first_student_only')}</span>
                </button>
            )}
        </div>
      </div>

      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-900/40 border-slate-800">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('section')}</label>
          <select
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            value={selectedSection}
            onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedClass('');
            }}
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
            disabled={!selectedSection}
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
            <option value={2}>{t('term_2') || 'Term 2'}</option>
            <option value={3}>{t('term_3') || 'Term 3'}</option>
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
                            <Save className="w-4 h-4 mr-2" /> {t('save_and_lock')}
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
                    {subjects.filter(s =>
                      s.level === classes.find(c => c.id.toString() === selectedClass)?.level &&
                      s.section === selectedSection
                    ).map(s => (
                      <th key={s.id} className="px-4 py-5 text-center min-w-[120px]">
                        <div className="truncate max-w-[100px] mx-auto text-white">{s.name}</div>
                        <div className="text-[8px] text-amber-500/50 mt-0.5">{t('coefficient')}: {s.coefficient}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-white/5 group transition-colors">
                      <td className="px-6 py-4 sticky left-0 bg-slate-950 backdrop-blur-md group-hover:bg-slate-900 transition-colors z-10 border-r border-white/5">
                        <div className="text-white font-black uppercase text-sm tracking-tight">{student.last_name}</div>
                        <div className="text-[10px] text-slate-500 font-bold">{student.first_name}</div>
                      </td>
                      {subjects.filter(s =>
                        s.level === classes.find(c => c.id.toString() === selectedClass)?.level &&
                        s.section === selectedSection
                      ).map(subject => (
                        <td key={subject.id} className="px-4 py-4">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            disabled={isLocked}
                            value={grades[`${student.id}-${subject.id}`] || ''}
                            onChange={(e) => setGrades({
                                ...grades,
                                [`${student.id}-${subject.id}`]: parseFloat(e.target.value)
                            })}
                            placeholder="0.00"
                            className="w-20 bg-slate-900/50 border border-slate-800 rounded-xl py-2 text-center text-white text-sm font-black focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          />
                        </td>
                      ))}
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
