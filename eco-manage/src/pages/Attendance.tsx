import React, { useState, useEffect } from 'react';
import { Calendar, UserCheck, Clock, Save, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const Attendance: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [absences, setAbsences] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadClasses = async () => {
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
    };
    loadClasses();
  }, [user]);

  useEffect(() => {
    const loadStudents = async () => {
      if (window.electronAPI && selectedClass) {
        const allStudents = await window.electronAPI.getStudents();
        setStudents(allStudents.filter((s: any) => s.class_id.toString() === selectedClass));
      }
    };
    loadStudents();
  }, [selectedClass]);

  const handleSave = async () => {
      if (window.electronAPI) {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const records = Object.keys(absences).map(studentId => ({
              studentId: parseInt(studentId),
              date: currentDate,
              hours: absences[studentId]
          }));

          if (records.length > 0) {
              try {
                  const res = await window.electronAPI.saveAttendanceBulk({ records, userId: user.id });
                  if (res && res.error) {
                      alert(`Erreur: ${res.error}`);
                      return;
                  }
                  alert(t('attendance_saved_msg') + new Date(currentDate).toLocaleDateString());
              } catch (err: any) {
                  alert(err.message);
              }
          } else {
              alert(t('attendance_saved_msg') + new Date(currentDate).toLocaleDateString());
          }
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('attendance_sheet')}</h1>
          <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest">{t('attendance_desc')}</p>
        </div>
        <div className="flex items-center bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-sm text-white focus-within:ring-2 focus-within:ring-amber-500 transition-all">
            <Calendar className="w-5 h-5 mr-3 text-amber-500" />
            <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="bg-transparent outline-none text-sm font-black text-white"
            />
        </div>
      </div>

      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('select_section')}</label>
          <select
            className="input-field w-full mt-1"
            value={selectedSection}
            onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedClass('');
            }}
          >
            <option value="">{t('choose_section')}</option>
            <option value="FRANCOPHONE">{t('section_francophone')}</option>
            <option value="ANGLOPHONE">{t('section_anglophone')}</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('choose_classroom')}</label>
          <select
            className="input-field w-full mt-1"
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
      </div>

      {!selectedClass ? (
          <div className="glass-card p-20 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
              <UserCheck className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-xl font-bold">{t('select_class_to_start')}</p>
              <p className="text-sm mt-2">{t('default_present')}</p>
          </div>
      ) : (
          <div className="space-y-6">
            <div className="glass-card p-4 bg-blue-600 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl border-none">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-white/20 rounded-full">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">{t('daily_call')} : {classes.find(c => c.id.toString() === selectedClass)?.name}</h2>
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">{t('zero_for_full_presence')}</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="w-full md:w-auto px-8 py-3 bg-white text-blue-600 rounded-xl font-black text-sm hover:bg-blue-50 transition-all flex items-center justify-center shadow-lg active:scale-95"
                >
                    <Save className="w-5 h-5 mr-2" /> {t('save_attendance')}
                </button>
            </div>

            <div className="glass-card shadow-xl border-none">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase text-slate-500 font-black border-b border-slate-100 dark:border-slate-800">
                                <th className="px-6 py-5">{t('student')}</th>
                                <th className="px-6 py-5 text-center">{t('absence_hours')}</th>
                                <th className="px-6 py-5 text-center">{t('auto_status')}</th>
                                <th className="px-6 py-5 text-right">{t('forecast_sanction')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {students.map(student => {
                                const h = absences[student.id] || 0;
                                return (
                                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-slate-900 dark:text-white font-bold uppercase text-sm">{student.last_name}</div>
                                            <div className="text-[10px] text-slate-500 font-bold">{student.first_name} • {student.matricule}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center space-x-3">
                                                <button
                                                    onClick={() => setAbsences({...absences, [student.id]: Math.max(0, h - 1)})}
                                                    className="w-8 h-8 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-black hover:bg-rose-500 hover:text-white transition-all"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    value={h}
                                                    onChange={(e) => setAbsences({...absences, [student.id]: parseInt(e.target.value) || 0})}
                                                    className="w-16 bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-white font-black focus:border-amber-500 outline-none"
                                                />
                                                <button
                                                    onClick={() => setAbsences({...absences, [student.id]: h + 1})}
                                                    className="w-8 h-8 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-black hover:bg-amber-500 hover:text-slate-950 transition-all"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {h === 0 ? (
                                                <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase">{t('present')}</span>
                                            ) : (
                                                <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-3 py-1 rounded-full uppercase">{t('absent')}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {h > 4 ? (
                                                <span className="text-[9px] font-black text-rose-500 flex items-center justify-end">
                                                    <AlertCircle className="w-3 h-3 mr-1" /> {t('auto_warning')}
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">{t('ras')}</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default Attendance;
