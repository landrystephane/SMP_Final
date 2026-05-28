import React, { useState, useEffect } from 'react';
import { Calendar, UserCheck, Clock, Save, AlertCircle, FileText, Search, Printer, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { generateAttendanceReport } from '../utils/reports';

const Attendance: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE' | ''>('FRANCOPHONE');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [absences, setAbsences] = useState<Record<string, number>>({});
  
  // New States for Reports
  const [activeTab, setActiveTab] = useState<'INPUT' | 'REPORT'>('INPUT');
  const [reportPeriod, setReportPeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportWeek, setReportWeek] = useState(''); // e.g. 2026-W22
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // e.g. 2026-05
  const [reportSearch, setReportSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
        const allStudents = await window.electronAPI.getStudents(user?.schoolId);
        setStudents(allStudents.filter((s: any) => s.class_id.toString() === selectedClass));
      }
    };
    loadStudents();
  }, [selectedClass, user]);

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
                  alert(t('attendance_saved_msg') + new Date(currentDate).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR'));
              } catch (err: any) {
                  alert(err.message);
              }
          } else {
              alert(t('attendance_saved_msg') + new Date(currentDate).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR'));
          }
      }
  };

  const getWeekDateRange = (weekStr: string) => {
      const [year, week] = weekStr.split('-W');
      const d = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(d.setDate(diff));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { start, end };
  };

  const handleGenerateReport = async () => {
      if (!selectedClass || !window.electronAPI) return;
      setIsGenerating(true);
      
      try {
          let startDateStr = '';
          let endDateStr = '';
          let periodText = '';
          const isEn = i18n.language.startsWith('en');

          if (reportPeriod === 'DAY') {
              startDateStr = reportDate;
              endDateStr = reportDate;
              periodText = isEn ? `DATE: ${reportDate}` : `JOURNÉE DU: ${reportDate}`;
          } else if (reportPeriod === 'WEEK') {
              if (!reportWeek) throw new Error(isEn ? 'Select a week' : 'Sélectionnez une semaine');
              const { start, end } = getWeekDateRange(reportWeek);
              startDateStr = start.toISOString().split('T')[0];
              endDateStr = end.toISOString().split('T')[0];
              periodText = isEn ? `WEEK: ${reportWeek}` : `SEMAINE: ${reportWeek}`;
          } else if (reportPeriod === 'MONTH') {
              startDateStr = `${reportMonth}-01`;
              const [y, m] = reportMonth.split('-');
              const endOfMonth = new Date(parseInt(y), parseInt(m), 0);
              endDateStr = endOfMonth.toISOString().split('T')[0];
              periodText = isEn ? `MONTH: ${reportMonth}` : `MOIS: ${reportMonth}`;
          }

          const records = await window.electronAPI.getAttendanceReport({
              classId: selectedClass,
              startDate: startDateStr,
              endDate: endDateStr
          });

          // Filter by search if any
          let finalRecords = records;
          if (reportSearch) {
              const lowerSearch = reportSearch.toLowerCase();
              finalRecords = records.filter((r: any) => 
                  r.first_name?.toLowerCase().includes(lowerSearch) || 
                  r.last_name?.toLowerCase().includes(lowerSearch) ||
                  r.matricule?.toLowerCase().includes(lowerSearch)
              );
          }

          if (finalRecords.length === 0) {
              alert(isEn ? 'No records found for this period' : 'Aucune présence enregistrée pour cette période');
              setIsGenerating(false);
              return;
          }

          const classObj = classes.find(c => c.id.toString() === selectedClass);
          const schoolSettings = await window.electronAPI.getSchools();
          const currentSchool = schoolSettings?.find((s: any) => s.id === user?.schoolId);

          generateAttendanceReport({
              records: finalRecords,
              className: classObj?.name || selectedClass,
              periodText,
              school: currentSchool
          });

      } catch (err: any) {
          alert('Error: ' + err.message);
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('attendance_sheet')}</h1>
          <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest">{t('attendance_desc')}</p>
        </div>
        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
                onClick={() => setActiveTab('INPUT')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${activeTab === 'INPUT' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
                <Calendar className="w-4 h-4 mr-2" />
                {t('saisie', 'Saisie')}
            </button>
            <button
                onClick={() => setActiveTab('REPORT')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${activeTab === 'REPORT' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
                <FileText className="w-4 h-4 mr-2" />
                {t('rapports', 'Rapports')}
            </button>
        </div>
      </div>

      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('select_section')}</label>
          <select
            className="input-field w-full mt-1"
            value={selectedSection}
            onChange={(e) => {
                setSelectedSection(e.target.value as 'FRANCOPHONE' | 'ANGLOPHONE');
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
      </div>

      {!selectedClass ? (
          <div className="glass-card p-20 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
              <UserCheck className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-xl font-bold">{t('select_class_to_start')}</p>
              <p className="text-sm mt-2">{t('default_present')}</p>
          </div>
      ) : activeTab === 'INPUT' ? (
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
                                                    onChange={(e) => setAbsences({...absences, [student.id]: Math.min(8, Math.max(0, parseInt(e.target.value) || 0))})}
                                                    className="w-16 bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-white font-black focus:border-amber-500 outline-none"
                                                    max="8"
                                                    min="0"
                                                />
                                                <button
                                                    onClick={() => setAbsences({...absences, [student.id]: Math.min(8, h + 1)})}
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
      ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="glass-card p-6 border-none shadow-xl bg-slate-900 text-white">
                  <div className="flex items-center mb-6 text-amber-500">
                      <Printer className="w-6 h-6 mr-3" />
                      <h2 className="text-xl font-bold">{t('generate_attendance_report', 'Générer la Liste de Présence')}</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('period', 'Période')}</label>
                          <select
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500"
                              value={reportPeriod}
                              onChange={(e) => setReportPeriod(e.target.value as any)}
                          >
                              <option value="DAY">{t('day', 'Journée')}</option>
                              <option value="WEEK">{t('week', 'Semaine')}</option>
                              <option value="MONTH">{t('month', 'Mois')}</option>
                          </select>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('date_selection', 'Sélection Date')}</label>
                          <div className="flex items-center bg-slate-950 border border-slate-800 p-3 rounded-xl focus-within:ring-2 focus-within:ring-amber-500">
                              <CalendarDays className="w-5 h-5 mr-3 text-slate-500" />
                              {reportPeriod === 'DAY' && (
                                  <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="bg-transparent outline-none text-white font-bold w-full" />
                              )}
                              {reportPeriod === 'WEEK' && (
                                  <input type="week" value={reportWeek} onChange={(e) => setReportWeek(e.target.value)} className="bg-transparent outline-none text-white font-bold w-full" />
                              )}
                              {reportPeriod === 'MONTH' && (
                                  <input type="month" value={reportMonth} onChange={(e) => setReportMonth(e.target.value)} className="bg-transparent outline-none text-white font-bold w-full" />
                              )}
                          </div>
                      </div>

                       <div className="space-y-2 relative">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('search_student', 'Rechercher un élève (Optionnel)')}</label>
                          <div className="flex items-center bg-slate-950 border border-slate-800 p-3 rounded-xl focus-within:ring-2 focus-within:ring-amber-500">
                              <Search className="w-5 h-5 mr-3 text-slate-500" />
                              <input 
                                  type="text" 
                                  placeholder="Nom, Prénom, Matricule..." 
                                  value={reportSearch}
                                  onChange={(e) => {
                                      setReportSearch(e.target.value);
                                      setShowSuggestions(true);
                                  }}
                                  onFocus={() => setShowSuggestions(true)}
                                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                  className="bg-transparent outline-none text-white font-bold w-full placeholder-slate-600 focus:placeholder-slate-400" 
                              />
                          </div>

                          {showSuggestions && reportSearch.trim() && (
                              <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-slate-850 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-white/5">
                                  {students
                                      .filter(s => 
                                          (s.first_name || '').toLowerCase().includes(reportSearch.toLowerCase()) || 
                                          (s.last_name || '').toLowerCase().includes(reportSearch.toLowerCase()) || 
                                          (s.matricule || '').toLowerCase().includes(reportSearch.toLowerCase())
                                      )
                                      .map(s => (
                                          <div 
                                              key={s.id}
                                              onMouseDown={() => {
                                                  setReportSearch(`${s.last_name.toUpperCase()} ${s.first_name}`);
                                                  setShowSuggestions(false);
                                              }}
                                              className="px-4 py-3 text-left hover:bg-amber-500 hover:text-slate-950 cursor-pointer flex flex-col transition-colors group"
                                          >
                                              <span className="font-bold text-sm text-white group-hover:text-slate-950">{s.last_name.toUpperCase()} {s.first_name}</span>
                                              <span className="text-[10px] text-slate-400 group-hover:text-slate-900">{s.matricule}</span>
                                          </div>
                                      ))
                                  }
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                      <button
                          onClick={handleGenerateReport}
                          disabled={isGenerating}
                          className="px-8 py-3 bg-amber-500 text-slate-950 rounded-xl font-black shadow-lg hover:bg-amber-400 transition-all flex items-center disabled:opacity-50"
                      >
                          {isGenerating ? (
                              <span className="flex items-center">
                                  <Clock className="w-5 h-5 mr-2 animate-spin" /> {t('generating', 'Génération...')}
                              </span>
                          ) : (
                              <span className="flex items-center">
                                  <FileText className="w-5 h-5 mr-2" /> {t('generate_pdf', 'Générer le PDF')}
                              </span>
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Attendance;
