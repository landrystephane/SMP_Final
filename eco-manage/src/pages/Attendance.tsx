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
  const [maxAllowedHours, setMaxAllowedHours] = useState<number>(8);
  const [notProgrammedMsg, setNotProgrammedMsg] = useState<string>('');
  const [availableSchedules, setAvailableSchedules] = useState<any[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('');
  const [subjectsMap, setSubjectsMap] = useState<Record<number, string>>({});
  
  // New States for Reports
  const [activeTab, setActiveTab] = useState<'INPUT' | 'REPORT'>(() => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
          const u = JSON.parse(storedUser);
          if (u.role === 'SECRETARY' || u.role === 'DIRECTOR') return 'REPORT';
      }
      return 'INPUT';
  });
  const [reportPeriod, setReportPeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportWeek, setReportWeek] = useState(''); // e.g. 2026-W22
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // e.g. 2026-05
  const [reportSearch, setReportSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isUnlockedByAdmin, setIsUnlockedByAdmin] = useState(false);
  
  const [exceedersToNotify, setExceedersToNotify] = useState<any[]>([]);

  const loadExistingAttendance = async () => {
    if (window.electronAPI && selectedClass && currentDate) {
      try {
        const schedIdStr = user?.role === 'TEACHER' ? selectedSchedule : '';
        const records = await window.electronAPI.getAttendance({ classId: parseInt(selectedClass), date: currentDate, scheduleId: schedIdStr });
        const hasRecords = records.length > 0;
        
        const unlockKey = `attendance_unlock_${selectedClass}_${currentDate}`;
        const unlockKeyTeacher = user?.role === 'TEACHER' ? `attendance_unlock_${selectedClass}_${currentDate}_${user.id}` : null;
        const unlockSetting = await window.electronAPI.getSetting(unlockKey);
        const unlockSettingT = unlockKeyTeacher ? await window.electronAPI.getSetting(unlockKeyTeacher) : null;
        let unlocked = false;
        const checkUnlock = (val: any) => {
            if (val === 'true') return true;
            if (val && val !== 'false') { return new Date(val) > new Date(); }
            return false;
        };
        unlocked = checkUnlock(unlockSetting) || checkUnlock(unlockSettingT);
        
        setIsUnlockedByAdmin(unlocked);
        
        if (user?.role === 'TEACHER') {
            if (!unlocked && !selectedSchedule && availableSchedules.length > 0) {
                setIsLocked(true);
                setNotProgrammedMsg(t('select_slot_for_attendance', "Veuillez sélectionner un créneau horaire pour faire l'appel."));
                setMaxAllowedHours(0);
                setAbsences({});
                return;
            }

            setIsLocked(hasRecords && !unlocked);
            
            // Calculate programmed hours for the SELECTED schedule
            const schedule = availableSchedules.find(s => s.id.toString() === selectedSchedule);
            if (schedule && schedule.start_time && schedule.end_time) {
                const [startH, startM] = schedule.start_time.split(':').map(Number);
                const [endH, endM] = schedule.end_time.split(':').map(Number);
                const diffMins = (endH * 60 + endM) - (startH * 60 + startM);
                  const maxH = Math.max(0, Math.ceil(diffMins / 60));
                  setMaxAllowedHours(maxH);
                  
                  const now = new Date();
                  const selectedDateObj = new Date(currentDate);
                  const isToday = now.toISOString().split('T')[0] === currentDate;
                  
                  const currentH = now.getHours();
                  const currentM = now.getMinutes();
                  
                  const isPast = (selectedDateObj < new Date(now.toISOString().split('T')[0])) || (isToday && (currentH > endH || (currentH === endH && currentM > endM)));

                  if (isPast && !unlocked && hasRecords) {
                      setIsLocked(true);
                      setNotProgrammedMsg(t('course_ended_deadline_passed', "Le cours est terminé. Délai de saisie dépassé."));
                  } else if (isPast && !unlocked && !hasRecords) {
                      setIsLocked(true);
                      setNotProgrammedMsg(t('course_ended_not_recorded', "Le cours est terminé. Vous n'avez pas enregistré l'appel à temps."));
                  } else {
                      setNotProgrammedMsg('');
                  }
            } else if (!unlocked) {
                setMaxAllowedHours(0);
                setIsLocked(true);
                if (availableSchedules.length > 0) {
                    setNotProgrammedMsg(t('invalid_slot', "Créneau invalide ou introuvable."));
                }
            } else {
                // Admin unlocked it, allow default max hours
                setMaxAllowedHours(8);
                setNotProgrammedMsg('');
            }
        } else {
            setIsLocked(false);
            setMaxAllowedHours(8);
            setNotProgrammedMsg('');
        }

        const newAbsences: Record<string, number> = {};
        records.forEach((r: any) => {
            newAbsences[r.student_id] = r.hours_absent;
        });
        setAbsences(newAbsences);
      } catch (e) {
        console.error("Failed to load attendance:", e);
      }
    } else {
        setAbsences({});
        setIsLocked(false);
        setIsUnlockedByAdmin(false);
        setMaxAllowedHours(8);
        setNotProgrammedMsg('');
    }
  };

  // Load schedules and subjects when date or class changes
  useEffect(() => {
      const loadTeacherSchedules = async () => {
          if (user?.role === 'TEACHER' && window.electronAPI && selectedClass && currentDate) {
              try {
                  const [allSchedules, allSubjects] = await Promise.all([
                      window.electronAPI.getSchedules(user?.schoolId),
                      window.electronAPI.getGlobalSubjects()
                  ]);
                  
                  const subMap: Record<number, string> = {};
                  allSubjects.forEach((sub: any) => { subMap[sub.id] = sub.name; });
                  setSubjectsMap(subMap);

                  const dayOfWeek = new Date(currentDate).getDay() || 7;
                  const teacherSchedules = allSchedules.filter((s: any) => 
                      s.teacher_id === user.id && 
                      s.class_id?.toString() === selectedClass && 
                      s.day_of_week === dayOfWeek
                  );
                  
                  // Sort by start_time
                  teacherSchedules.sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''));

                  // Check if unlocked by admin (class-wide or per-teacher)
                  const unlockKey2 = `attendance_unlock_${selectedClass}_${currentDate}`;
                  const unlockKeyT2 = `attendance_unlock_${selectedClass}_${currentDate}_${user?.id}`;
                  const unlockS2 = await window.electronAPI.getSetting(unlockKey2);
                  const unlockST2 = await window.electronAPI.getSetting(unlockKeyT2);
                  const chk = (val: any) => {
                      if (val === 'true') return true;
                      if (val && val !== 'false') return new Date(val) > new Date();
                      return false;
                  };
                  let isUnlocked = chk(unlockS2) || chk(unlockST2);

                  if (teacherSchedules.length === 0 && !isUnlocked) {
                      setIsLocked(true);
                      setNotProgrammedMsg(t('no_scheduled_class_today', "Vous ne pouvez pas faire l'appel car vous n'avez aucun cours programmé dans cette classe aujourd'hui."));
                      setMaxAllowedHours(0);
                  }
                  setAvailableSchedules(teacherSchedules);
                  setSelectedSchedule(''); // Reset selection when date/class changes
              } catch (e) {
                  console.error("Failed to load schedules", e);
              }
          }
      };
      loadTeacherSchedules();
  }, [selectedClass, currentDate, user]);

  useEffect(() => {
      loadExistingAttendance();
  }, [selectedClass, currentDate, user, selectedSchedule]);

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
        setStudents(allStudents.filter((s: any) => s.class_id?.toString() === selectedClass?.toString()));
      }
    };
    loadStudents();
  }, [selectedClass, user]);

  const handleRequestUnlock = async () => {
      if (!window.electronAPI || !user || !selectedClass || !currentDate) return;
      const classObj = classes.find(c => c.id.toString() === selectedClass);
      const className = classObj ? `${classObj.name} (${classObj.code})` : selectedClass;
      const formattedDate = new Date(currentDate).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR');
      const subject = t('unlock_request_subject', `Demande de déblocage : Présences ${className}`);
      const message = t('unlock_request_message', `Bonjour,\n\nJe souhaite modifier la fiche de présence de la classe ${className} du ${formattedDate}. Veuillez s'il vous plaît débloquer cette fiche.\n\nMerci d'avance.\n\nEnseignant : ${user.fullName || user.username}`);
      
      try {
          await window.electronAPI.submitSystemRequest({
              requestType: 'ATTENDANCE_REACTIVATION',
              requestData: {
                  teacherId: user.id,
                  classId: selectedClass,
                  className: classObj ? classObj.name : selectedClass,
                  date: formattedDate,
                  rawDate: currentDate
              }
          });
          alert(t('unlock_request_sent', "Votre demande de déblocage a été envoyée avec succès à l'administration."));
      } catch (e: any) {
          alert(t('error_sending_request', "Erreur lors de l'envoi de la demande: ") + e.message);
      }
  };

  const handleToggleUnlock = async () => {
      if (!window.electronAPI || !selectedClass || !currentDate) return;
      const newValue = !isUnlockedByAdmin;
      try {
          await window.electronAPI.setSetting({
              key: `attendance_unlock_${selectedClass}_${currentDate}`,
              value: newValue ? 'true' : 'false'
          });
          setIsUnlockedByAdmin(newValue);
          alert(newValue ? t('sheet_unlocked', "La fiche a été déverrouillée pour l'enseignant.") : t('sheet_relocked', "La fiche a été verrouillée à nouveau."));
          await loadExistingAttendance();
      } catch (e: any) {
          alert(t('error_lock_change', "Erreur lors du changement de verrouillage: ") + e.message);
      }
  };

  const handleSave = async () => {
      if (window.electronAPI) {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const records = Object.keys(absences).map(studentId => ({
              studentId: parseInt(studentId),
              date: currentDate,
              hours: absences[studentId],
              scheduleId: user?.role === 'TEACHER' ? selectedSchedule : null
          }));

          if (records.length > 0) {
              try {
                  const res = await window.electronAPI.saveAttendanceBulk({ records, userId: user.id });
                  if (res && res.error) {
                      alert(`${t('error_label', 'Erreur')}: ${res.error}`);
                      return;
                  }
                  if (res && res.exceeders && res.exceeders.length > 0) {
                      setExceedersToNotify(res.exceeders);
                  } else {
                      alert(t('attendance_saved_msg') + new Date(currentDate).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR'));
                      if (isUnlockedByAdmin) {
                          await window.electronAPI.setSetting({
                              key: `attendance_unlock_${selectedClass}_${currentDate}`,
                              value: 'false'
                          });
                      }
                      await loadExistingAttendance();
                  }
              } catch (err: any) {
                  alert(err.message);
              }
          } else {
              alert(t('attendance_saved_msg') + new Date(currentDate).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR'));
          }
      } else {
          // Mobile / Web fallback
          const records = Object.keys(absences).map(studentId => ({
              student_id: parseInt(studentId),
              date: currentDate,
              status: absences[studentId] > 0 ? 'ABSENT' : 'PRESENT',
              hours_absent: absences[studentId]
          }));
          const key = `pending_attendance_${Date.now()}`;
          localStorage.setItem(key, JSON.stringify(records));
          alert(t('absences_saved_locally', "Absences sauvegardées localement ! Allez dans le Centre de Synchronisation pour les envoyer au PC."));
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
              periodText = isEn ? `DATE: ${reportDate}` : t('day_of', `JOURNÉE DU: ${reportDate}`);
          } else if (reportPeriod === 'WEEK') {
              if (!reportWeek) throw new Error(t('select_a_week', 'Sélectionnez une semaine'));
              const { start, end } = getWeekDateRange(reportWeek);
              startDateStr = start.toISOString().split('T')[0];
              endDateStr = end.toISOString().split('T')[0];
              periodText = isEn ? `WEEK: ${reportWeek}` : t('week_of', `SEMAINE: ${reportWeek}`);
          } else if (reportPeriod === 'MONTH') {
              startDateStr = `${reportMonth}-01`;
              const [y, m] = reportMonth.split('-');
              const endOfMonth = new Date(parseInt(y), parseInt(m), 0);
              endDateStr = endOfMonth.toISOString().split('T')[0];
              periodText = isEn ? `MONTH: ${reportMonth}` : t('month_of', `MOIS: ${reportMonth}`);
          }

          const records = await window.electronAPI.getAttendanceReport({
              classId: selectedClass,
              startDate: startDateStr,
              endDate: endDateStr
          });

          // Filter by search if any
          let finalRecords = records;
          if (reportSearch) {
              const searchTerms = reportSearch.trim().toLowerCase().split(/\s+/);
              finalRecords = records.filter((r: any) => {
                  const fullName = `${r.last_name || ''} ${r.first_name || ''} ${r.matricule || ''}`.toLowerCase();
                  return searchTerms.every(term => fullName.includes(term));
              });
          }

          if (finalRecords.length === 0) {
              alert(t('no_records_for_period', 'Aucune présence enregistrée pour cette période'));
              setIsGenerating(false);
              return;
          }

          const classObj = classes.find(c => c.id.toString() === selectedClass);
          const schoolSettings = await window.electronAPI.getSchools();
          const currentSchool = schoolSettings?.find((s: any) => s.id?.toString() === user?.schoolId?.toString());

          generateAttendanceReport({
              records: finalRecords,
              className: classObj ? `${classObj.name} (${classObj.code})` : selectedClass,
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
            {user?.role !== 'SECRETARY' && user?.role !== 'DIRECTOR' && (
                <button
                    onClick={() => setActiveTab('INPUT')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${activeTab === 'INPUT' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    <Calendar className="w-4 h-4 mr-2" />
                    {t('saisie', 'Saisie')}
                </button>
            )}
            <button
                onClick={() => setActiveTab('REPORT')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center ${activeTab === 'REPORT' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
            >
                <FileText className="w-4 h-4 mr-2" />
                {t('rapports', 'Rapports')}
            </button>
        </div>
      </div>

      <div className="glass-card p-6 grid grid-cols-1 grid-cols-1 gap-6 bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
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
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        
        {user?.role === 'TEACHER' && selectedClass && activeTab === 'INPUT' && (
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('select_course_slot', 'Sélectionner le cours (Créneau)')}</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold outline-none focus:ring-2 focus:ring-amber-500 transition-all disabled:opacity-30"
                value={selectedSchedule}
                onChange={(e) => setSelectedSchedule(e.target.value)}
              >
                <option value="">{t('choose_slot', '-- Choisir un créneau --')}</option>
                {availableSchedules.length === 0 ? (
                    <option value="" disabled>{t('no_course_scheduled_today', 'Aucun cours programmé ce jour')}</option>
                ) : (
                    availableSchedules.map(s => {
                        const today = new Date().toISOString().split('T')[0];
                        let isFuture = false;
                        if (currentDate === today && s.start_time) {
                            const now = new Date();
                            const currentMinutes = now.getHours() * 60 + now.getMinutes();
                            const [startH, startM] = s.start_time.split(':').map(Number);
                            const startMinutes = startH * 60 + startM;
                            // Block if the class hasn't started yet
                            if (startMinutes > currentMinutes) {
                                isFuture = true;
                            }
                        }
                        
                        return (
                            <option key={s.id} value={s.id} disabled={isFuture}>
                                {s.start_time} - {s.end_time} : {subjectsMap[s.subject_id] || t('unknown_subject', 'Matière inconnue')} {isFuture ? t('not_started_yet', '(Pas encore commencé)') : ''}
                            </option>
                        );
                    })
                )}
              </select>
            </div>
        )}
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
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">
                            {isLocked && notProgrammedMsg ? notProgrammedMsg : isLocked ? t('attendance_sheet_locked', "Fiche de présence verrouillée") : `Maximum : ${maxAllowedHours}h ${t('of_absence', "d'absence")}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                    {user?.role !== 'TEACHER' && (
                        <button
                            onClick={handleToggleUnlock}
                            className={`w-full md:w-auto px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center shadow-lg active:scale-95 ${
                                isUnlockedByAdmin 
                                ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                        >
                            {isUnlockedByAdmin ? t('relock', "Re-verrouiller") : t('unlock_btn', "Débloquer")}
                        </button>
                    )}
                    {!isLocked && (
                        <button
                            onClick={handleSave}
                            className="w-full md:w-auto px-8 py-3 bg-white text-blue-600 rounded-xl font-black text-sm hover:bg-blue-50 transition-all flex items-center justify-center shadow-lg active:scale-95"
                        >
                            <Save className="w-5 h-5 mr-2" /> {t('save_attendance')}
                        </button>
                    )}
                </div>
            </div>

            {isLocked && (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-md">
                    <div className="flex items-center space-x-3">
                        <AlertCircle className="w-6 h-6 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-sm">{notProgrammedMsg ? t('attendance_sheet_blocked', "Fiche de présence bloquée") : t('attendance_sheet_locked', "Fiche de présence verrouillée")}</p>
                            <p className="text-xs text-slate-400">
                                {notProgrammedMsg 
                                    ? notProgrammedMsg
                                    : "Cette fiche a déjà été enregistrée pour aujourd'hui. Les modifications sont désactivées pour les enseignants. Si vous avez commis une erreur, veuillez envoyer une requête de déblocage."}
                            </p>
                        </div>
                    </div>
                    {user?.role === 'TEACHER' && (
                        <button
                            onClick={handleRequestUnlock}
                            className="w-full md:w-auto px-6 py-2 bg-amber-500 text-slate-950 font-black rounded-lg text-xs hover:bg-amber-400 active:scale-95 transition-all shadow-md"
                        >
                            Demander le déblocage
                        </button>
                    )}
                </div>
            )}

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
                                    <tr key={student.id} className="hover:bg-slate-800/50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-white font-bold uppercase text-sm">{student.last_name}</div>
                                            <div className="text-[10px] text-slate-500 font-bold group-hover:text-slate-300 transition-colors">{student.first_name} • {student.matricule}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center space-x-3">
                                                <button
                                                    onClick={() => setAbsences({...absences, [student.id]: Math.max(0, h - 1)})}
                                                    disabled={isLocked}
                                                    className="w-8 h-8 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-black hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-950 disabled:hover:text-slate-400"
                                                >
                                                    -
                                                </button>
                                                <input
                                                    type="number"
                                                    value={h}
                                                    disabled={isLocked}
                                                    onChange={(e) => setAbsences({...absences, [student.id]: Math.min(maxAllowedHours, Math.max(0, parseInt(e.target.value) || 0))})}
                                                    className="w-16 bg-slate-950 border border-slate-800 rounded-xl p-2 text-center text-white font-black focus:border-amber-500 outline-none disabled:opacity-50"
                                                    max={maxAllowedHours}
                                                    min="0"
                                                />
                                                <button
                                                    onClick={() => setAbsences({...absences, [student.id]: Math.min(maxAllowedHours, h + 1)})}
                                                    disabled={isLocked}
                                                    className="w-8 h-8 rounded-full bg-slate-950 text-slate-400 border border-slate-800 font-black hover:bg-amber-500 hover:text-slate-950 transition-all disabled:opacity-30 disabled:hover:bg-slate-950 disabled:hover:text-slate-400"
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
                                      .filter(s => {
                                          const fullName = `${s.last_name || ''} ${s.first_name || ''} ${s.matricule || ''}`.toLowerCase();
                                          const searchTerms = reportSearch.trim().toLowerCase().split(/\s+/);
                                          return searchTerms.every(term => fullName.includes(term));
                                      })
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

      {exceedersToNotify.length > 0 && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
                  <div className="flex items-center justify-center w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full mb-6 mx-auto">
                      <AlertCircle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-center text-white mb-2">Convocations Envoyées</h3>
                  <p className="text-slate-400 text-center text-sm mb-6">
                      Les présences ont été enregistrées avec succès.<br/>
                      Cependant, les élèves suivants ont dépassé 15h d'absences cumulées. Un message de convocation automatique a été envoyé à leurs parents.
                  </p>
                  <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {exceedersToNotify.map((ex, i) => (
                          <div key={i} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
                              <span className="font-bold text-white text-sm">{ex.firstName} {ex.lastName}</span>
                              <span className="text-rose-500 font-black text-sm bg-rose-500/10 px-3 py-1 rounded-lg">{ex.total}h d'absence</span>
                          </div>
                      ))}
                  </div>
                  <button
                      onClick={async () => {
                          setExceedersToNotify([]);
                          if (isUnlockedByAdmin) {
                              await window.electronAPI.setSetting({
                                  key: `attendance_unlock_${selectedClass}_${currentDate}`,
                                  value: 'false'
                              });
                          }
                          await loadExistingAttendance();
                      }}
                      className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black transition-all shadow-lg hover:shadow-amber-500/25 active:scale-95"
                  >
                      Compris
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Attendance;
