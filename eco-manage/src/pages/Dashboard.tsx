import React, { useEffect, useState, useCallback } from 'react';
import { Users as UsersIcon, CreditCard, Activity, ChevronRight, Globe, School, LayoutGrid, AlertTriangle, Wallet, BookOpen, Download, RefreshCw, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import SystemAdmin from './SystemAdmin';
import { generateSchedulePdf, generateExamSchedulePdf } from '../utils/reports';
import { onDataChanged } from '../utils/dataSync';


const DAYS_OF_WEEK_KEYS = [
    { key: 1, labelKey: 'monday', labelFallback: 'Lundi' },
    { key: 2, labelKey: 'tuesday', labelFallback: 'Mardi' },
    { key: 3, labelKey: 'wednesday', labelFallback: 'Mercredi' },
    { key: 4, labelKey: 'thursday', labelFallback: 'Jeudi' },
    { key: 5, labelKey: 'friday', labelFallback: 'Vendredi' },
    { key: 6, labelKey: 'saturday', labelFallback: 'Samedi' },
    { key: 7, labelKey: 'sunday', labelFallback: 'Dimanche' }
];

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [dashSchool, setDashSchool] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE'>('FRANCOPHONE');
  const [selectedCycle, setSelectedCycle] = useState<'ALL' | 'PRIMAIRE' | 'MATERNELLE'>('ALL');
  const [selectedDiagnosticClass, setSelectedDiagnosticClass] = useState<string>('ALL');
  const [teacherTab, setTeacherTab] = useState<'OVERVIEW' | 'TIMETABLE' | 'EXAMS_PROGRAM'>('OVERVIEW');
  const [currency, setCurrency] = useState('FCFA');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      if (!isMounted) return;
      const isImpersonating = localStorage.getItem('impersonated_school_id') !== null;
      if (user?.role === 'SUPERADMIN' && !isImpersonating) {
        return;
      }
      try {
        if (window.electronAPI && user) {
          if (!dashSchool) {
              const schs = await window.electronAPI.getSchools();
              const sch = schs.find((s: any) => s.id?.toString() === user.schoolId?.toString());
              if (sch) setDashSchool(sch);
          }
          if (user.role === 'TEACHER') {
              const data = await window.electronAPI.getTeacherDashboardStats({
                  schoolId: user.schoolId,
                  teacherId: user.id
              });
              setStats(data);
          } else if (user.role === 'BURSAR') {
              const data = await window.electronAPI.getBursarDashboardStats({
                  schoolId: user.schoolId
              });
              setStats(data);
          } else if (user.role === 'ADVISOR') {
              const data = await window.electronAPI.getAdvisorDashboardStats({
                  schoolId: user.schoolId
              });
              setStats(data);
          } else {
              const data = await window.electronAPI.getDashboardStats({ 
                  schoolId: user.schoolId, 
                  section: selectedSection,
                  level: selectedCycle
              });
              setStats(data);
          }
        } else if (!window.electronAPI) {
          // Fallback for demo/web context
          setTimeout(() => {
            setStats({
              totalStudents: 156,
              genderDist: { boys: 82, girls: 74 },
              totalRevenue: 2450000,
              totalTuitionDue: 5000000,
              classStats: [
                { level: 'SIL', avg: 14.5, passRate: 85 },
                { level: 'CP', avg: 12.8, passRate: 72 },
                { level: 'CE1', avg: 15.2, passRate: 90 }
              ],
              financialAlerts: [
                { class: 'CM2', unpaidCount: 5, label: 'Échéance Tranche 2 dépassée' }
              ]
            });
          }, 500);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      }
    };
    loadStats();
    
    // Load currency setting
    const loadCurrency = async () => {
        if (window.electronAPI) {
            const curr = await window.electronAPI.getSetting('currency');
            if (curr) setCurrency(curr);
        }
    };
    loadCurrency();

    // Auto-refresh stats every 5 seconds for real-time updates
    const interval = setInterval(() => {
        if (isMounted) loadStats();
    }, 5000);

    // Instant refresh whenever any action mutates data elsewhere in the app
    const unsubscribe = onDataChanged(() => {
        if (isMounted) loadStats();
    });

    return () => {
        isMounted = false;
        clearInterval(interval);
        unsubscribe();
    };
  }, [selectedSection, selectedCycle, user, refreshTrigger]);

  useEffect(() => {
    setSelectedDiagnosticClass('ALL');
  }, [selectedSection, selectedCycle]);

  const isImpersonating = localStorage.getItem('impersonated_school_id') !== null;

  if (user?.role === 'SUPERADMIN' && !isImpersonating) {
      return <SystemAdmin />;
  }

  if (user?.role === 'PARENT') {
      return <Navigate to="/parent-portal" replace />;
  }
  if (user?.role === 'DRIVER') {
      return <Navigate to="/driver-portal" replace />;
  }

  if (user?.role === 'TEACHER' && stats) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">{t('dashboard')} - {user.fullName}</h1>
                    <p className="text-slate-400 mt-1 font-bold italic uppercase text-xs tracking-widest">{t('class_overview', 'Aperçu de vos classes')}</p>
                </div>
                <div className="flex flex-wrap bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                    <button onClick={() => setTeacherTab('OVERVIEW')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${teacherTab === 'OVERVIEW' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t('my_classes', 'Mes Classes')}</button>
                    <button onClick={() => setTeacherTab('TIMETABLE')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${teacherTab === 'TIMETABLE' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t('my_timetable', 'Mon Emploi du Temps')}</button>
                    <button onClick={() => setTeacherTab('EXAMS_PROGRAM')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${teacherTab === 'EXAMS_PROGRAM' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>{t('exams_program', 'Programme Évaluations')}</button>
                </div>
            </div>

            {teacherTab === 'TIMETABLE' ? (
                <div className="glass-card p-6 border-none shadow-xl">
                    <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                        <div className="flex items-center space-x-3 text-amber-500">
                            <LayoutGrid className="w-5 h-5" />
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">{t('my_weekly_timetable', 'Mon Emploi du Temps Hebdomadaire')}</h2>
                        </div>
                        <button 
                            onClick={() => {
                                const columns = [t('hour', 'Heure'), t('monday', 'Lundi'), t('tuesday', 'Mardi'), t('wednesday', 'Mercredi'), t('thursday', 'Jeudi'), t('friday', 'Vendredi'), t('saturday', 'Samedi'), t('sunday', 'Dimanche')];
                                const rows: any[] = [];
                                const allSlots: any[] = [];
                                if (stats.timetable_slots) {
                                    try {
                                        allSlots.push(...JSON.parse(stats.timetable_slots));
                                    } catch(e) {}
                                }
                                if (stats.schedules) {
                                    stats.schedules.forEach((s: any) => {
                                        if (s.start_time && !allSlots.some(slot => slot.start?.trim() === s.start_time?.trim())) {
                                            allSlots.push({
                                                label: `${s.start_time} - ${s.end_time || '?'}`,
                                                start: s.start_time.trim(),
                                                end: s.end_time?.trim() || '',
                                                isBreak: false
                                            });
                                        }
                                    });
                                }
                                allSlots.sort((a, b) => (a.start || '00:00').localeCompare(b.start || '00:00'));
                                
                                allSlots.forEach(slot => {
                                    const rowData = [slot.label];
                                    if (slot.isBreak) {
                                        [1, 2, 3, 4, 5, 6, 7].forEach(() => rowData.push(t('adv_pause_upper', 'PAUSE')));
                                    } else {
                                        [1, 2, 3, 4, 5, 6, 7].forEach(day => {
                                            const sData = stats.schedules?.find((s: any) => s.day_of_week == day && s.start_time?.trim() === slot.start?.trim());
                                            if (sData) {
                                                if (sData.type === 'PAUSE') {
                                                    rowData.push(t('adv_pause_upper', 'PAUSE'));
                                                } else {
                                                    const className = stats.classes?.find((c: any) => c.id == sData.class_id)?.name || t('class', 'Classe');
                                                    const subjectName = stats.subjects?.find((sub: any) => sub.id == sData.subject_id)?.name || '';
                                                    rowData.push(`${className}\n${subjectName}`);
                                                }
                                            } else {
                                                rowData.push('-');
                                            }
                                        });
                                    }
                                    rows.push(rowData);
                                });
                                
                                generateSchedulePdf({
                                    school: dashSchool || { name: '' },
                                    title: `Emploi du Temps - ${user?.fullName}`,
                                    columns,
                                    rows
                                });
                            }}
                            className="bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center"
                        >
                            <Download className="w-3 h-3 mr-2" />
                            {t('download_pdf', 'Télécharger PDF')}
                        </button>
                    </div>

                    <div className="overflow-x-auto pb-4">
                        <div className="min-w-[800px]">
                            <div className="grid grid-cols-8 gap-3">
                                {/* Header */}
                                <div className="p-3 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">{t('hour', 'Heure')}</div>
                                {[
                                    { key: 1, label: t('monday', 'Lundi') },
                                    { key: 2, label: t('tuesday', 'Mardi') },
                                    { key: 3, label: t('wednesday', 'Mercredi') },
                                    { key: 4, label: t('thursday', 'Jeudi') },
                                    { key: 5, label: t('friday', 'Vendredi') },
                                    { key: 6, label: t('saturday', 'Samedi') },
                                    { key: 7, label: t('sunday', 'Dimanche') }
                                ].map(d => (
                                    <div key={d.key} className="p-3 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">{d.label}</div>
                                ))}

                                {/* Rows */}
                                {(() => {
                                    const allSlots: any[] = [];
                                    if (stats.timetable_slots) {
                                        try {
                                            allSlots.push(...JSON.parse(stats.timetable_slots));
                                        } catch(e) {}
                                    }
                                    if (stats.schedules) {
                                        stats.schedules.forEach((s: any) => {
                                            if (s.start_time && !allSlots.some(slot => slot.start?.trim() === s.start_time?.trim())) {
                                                allSlots.push({
                                                    label: `${s.start_time} - ${s.end_time || '?'}`,
                                                    start: s.start_time.trim(),
                                                    end: s.end_time?.trim() || '',
                                                    isBreak: false
                                                });
                                            }
                                        });
                                    }
                                    allSlots.sort((a, b) => (a.start || '00:00').localeCompare(b.start || '00:00'));

                                    if (allSlots.length === 0) {
                                        return (
                                            <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                                                <p className="text-slate-400 font-bold mb-4">{t('no_courses_scheduled', 'Aucun cours programmé pour vous.')}</p>
                                                <p className="text-xs text-slate-500">{t('timetable_will_appear', "Votre emploi du temps s'affichera ici dès qu'on vous aura attribué des cours.")}</p>
                                            </div>
                                        );
                                    }

                                    return allSlots.map((slot: any, index: number) => (
                                    <React.Fragment key={`${slot.label}-${index}`}>
                                        <div className="p-4 bg-slate-950/50 rounded-xl text-[10px] font-black text-slate-400 text-center flex flex-col items-center justify-center border border-slate-800 gap-1">
                                            {slot.label && slot.label !== 'Nouveau' && slot.label !== `${slot.start} - ${slot.end}` && (
                                                <span className="text-amber-500/70">{slot.label}</span>
                                            )}
                                            <span>{slot.start} - {slot.end}</span>
                                        </div>
                                            {slot.isBreak ? (
                                                <div className="col-span-7 p-4 bg-slate-900/10 border-dashed border-slate-800 rounded-xl flex items-center justify-center border">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{t('adv_pause_upper', 'PAUSE')}</span>
                                                </div>
                                            ) : (
                                                DAYS_OF_WEEK_KEYS.map(day => {
                                                    const sData = stats.schedules?.find((s: any) => s.day_of_week == day.key && s.start_time?.trim() === slot.start?.trim());
                                                    
                                                    if (sData) {
                                                        const typeColor = sData.type === 'EVALUATION' 
                                                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                                                            : sData.type === 'PAUSE'
                                                                ? 'bg-slate-900/10 border-dashed border-slate-800 text-slate-600'
                                                                : 'bg-amber-500/10 border-amber-500/20 text-amber-500';
                                                        
                                                        if (sData.type === 'PAUSE') {
                                                            return (
                                                                <div key={day.key} className={`p-4 rounded-xl border text-center flex items-center justify-center ${typeColor}`}>
                                                                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('personal_break', 'Pause (Perso)')}</span>
                                                                </div>
                                                            );
                                                        }

                                                        const className = stats.classes?.find((c: any) => c.id == sData.class_id)?.name || t('class', 'Classe');
                                                        const subjectName = stats.subjects?.find((sub: any) => sub.id == sData.subject_id)?.name || '';

                                                        return (
                                                            <div key={day.key} className={`p-2 rounded-xl border text-center flex flex-col justify-center ${typeColor} h-[70px] overflow-hidden`} title={`${className} - ${subjectName || sData.type}`}>
                                                                <div className="w-full">
                                                                    <div className="text-[10px] font-black uppercase text-amber-500 truncate px-1">
                                                                        {className}
                                                                    </div>
                                                                    {subjectName && (
                                                                        <div className="text-[9px] font-bold uppercase mt-1 text-slate-300 truncate px-1">
                                                                            {subjectName}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-[7px] font-black uppercase tracking-wider mt-1 opacity-50 truncate">
                                                                    {sData.type || t('adv_course_upper', 'COURS')}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <div key={day.key} className="p-4 bg-slate-950/20 rounded-xl border border-white/5 hover:bg-slate-900/50 transition-all flex items-center justify-center">
                                                            <span className="text-slate-700 text-xs">-</span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </React.Fragment>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            ) : teacherTab === 'EXAMS_PROGRAM' ? (
                <div className="glass-card p-6 border-none shadow-xl">
                    <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                        <div className="flex items-center space-x-3 text-amber-500">
                            <BookOpen className="w-5 h-5" />
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">{t('my_exam_supervisions', "Mes Surveillances d'Évaluations")}</h2>
                        </div>
                        {stats.examSchedules && stats.examSchedules.length > 0 && (
                            <button 
                                onClick={() => {
                                    const columns = [t('date', 'Date'), t('schedule', 'Horaires'), t('class', 'Classe'), t('subject', 'Matière')];
                                    const rows = stats.examSchedules.map((exam: any) => {
                                        return [exam.date, `${exam.start_time} - ${exam.end_time}`, exam.class_name, exam.subject_name];
                                    });
                                    generateExamSchedulePdf({
                                        school: dashSchool || { name: '' },
                                        title: `Programme des Évaluations - ${user?.fullName}`,
                                        columns,
                                        rows
                                    });
                                }}
                                className="bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center"
                            >
                                <Download className="w-3 h-3 mr-2" />
                                {t('download_pdf', 'Télécharger PDF')}
                            </button>
                        )}
                    </div>

                    {(!stats.examSchedules || stats.examSchedules.length === 0) ? (
                        <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                            <p className="text-slate-400 font-bold mb-4">{t('no_exam_supervision_scheduled', "Aucune surveillance d'évaluation programmée.")}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                        <th className="px-6 py-4">{t('date', 'Date')}</th>
                                        <th className="px-6 py-4">{t('schedule', 'Horaires')}</th>
                                        <th className="px-6 py-4">{t('class', 'Classe')}</th>
                                        <th className="px-6 py-4">{t('subject', 'Matière')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 bg-slate-900/30">
                                    {stats.examSchedules.map((exam: any) => (
                                        <tr key={exam.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-white font-black text-sm">{exam.date}</td>
                                            <td className="px-6 py-4 text-slate-400 text-sm font-bold">{exam.start_time} - {exam.end_time}</td>
                                            <td className="px-6 py-4 text-white text-xs">{exam.class_name}</td>
                                            <td className="px-6 py-4 text-amber-500 font-bold uppercase text-xs">{exam.subject_name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card border-none hover:translate-y-[-4px] transition-all cursor-pointer group" style={{ backgroundImage: 'linear-gradient(to right, #fb923c, #f59e0b)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                  <div className="p-6 pt-7">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl group-hover:bg-amber-500 transition-all">
                        <UsersIcon className="text-amber-500 group-hover:text-slate-950 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('global_effectif')}</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.totalStudents}</p>
                  </div>
                </div>
                {/* Boys */}
                <div className="glass-card border-none hover:translate-y-[-4px] transition-all cursor-pointer group" style={{ backgroundImage: 'linear-gradient(to right, #60a5fa, #3b82f6)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                  <div className="p-6 pt-7">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500 transition-all">
                        <UsersIcon className="text-blue-500 group-hover:text-slate-950 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('boys', 'Garçons')}</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.genderDist?.boys || 0}</p>
                  </div>
                </div>
                {/* Girls */}
                <div className="glass-card border-none hover:translate-y-[-4px] transition-all cursor-pointer group" style={{ backgroundImage: 'linear-gradient(to right, #f472b6, #ec4899)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                  <div className="p-6 pt-7">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-pink-500/10 rounded-2xl group-hover:bg-pink-500 transition-all">
                        <UsersIcon className="text-pink-500 group-hover:text-slate-950 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('girls', 'Filles')}</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.genderDist?.girls || 0}</p>
                  </div>
                </div>
            </div>

            {/* List of students by merit */}
            <div className="glass-card p-6 border-none shadow-xl">
                <h2 className="text-lg font-black text-white mb-6 flex items-center tracking-tight">
                    {t('students_by_merit', 'Liste des élèves par ordre de mérite')}
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-slate-500 text-[10px] uppercase bg-slate-900/50">
                            <tr>
                                <th className="p-4">{t('dash_rank_header')}</th>
                                <th className="p-4">{t('matricule')}</th>
                                <th className="p-4">{t('full_name')}</th>
                                <th className="p-4">{t('class')}</th>
                                <th className="p-4 text-right">{t('class_average')}</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            {stats.students?.map((s: any, idx: number) => (
                                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="p-4 font-bold text-amber-500">{idx + 1}</td>
                                    <td className="p-4 text-xs font-mono">{s.matricule}</td>
                                    <td className="p-4 font-bold text-white uppercase">{s.last_name} <span className="capitalize font-normal text-slate-400">{s.first_name}</span></td>
                                    <td className="p-4"><span className="px-2 py-1 bg-slate-800 rounded-lg text-[10px]">{s.className}</span></td>
                                    <td className="p-4 text-right font-black text-emerald-400">{s.average.toFixed(2)}</td>
                                </tr>
                            ))}
                            {!stats.students?.length && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">{t('dash_no_student_found')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </>
            )}
        </div>
    );
  }

  if (user?.role === 'BURSAR' && stats) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">{t('dashboard')} - {user.fullName}</h1>
                <p className="text-slate-400 mt-1 font-bold italic uppercase text-xs tracking-widest">{t('dash_financial_overview')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Recouvrements (Recettes) */}
                <div className="glass-card border-none group hover:translate-y-[-4px] transition-all" style={{ backgroundImage: 'linear-gradient(to right, #34d399, #10b981)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                  <div className="p-6 pt-7">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                        <CreditCard className="text-emerald-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('total_receipts')}</p>
                  <p className="text-2xl font-black text-white mt-1">{(stats?.totalRevenue || 0).toLocaleString()} <span className="text-xs text-slate-500">{currency}</span></p>
                  </div>
                </div>

                {/* Total Décaissements (Dépenses) */}
                <div className="glass-card border-none group hover:translate-y-[-4px] transition-all" style={{ backgroundImage: 'linear-gradient(to right, #fb7185, #ef4444)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                  <div className="p-6 pt-7">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-rose-500/10 rounded-2xl">
                        <Wallet className="text-rose-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('total_disbursements')}</p>
                  <p className="text-2xl font-black text-white mt-1">{(stats?.totalExpenses || 0).toLocaleString()} <span className="text-xs text-slate-500">{currency}</span></p>
                  </div>
                </div>

                {/* Solde Actuel (Recettes - Dépenses) */}
                <div className="glass-card border-none group bg-amber-500/5 hover:translate-y-[-4px] transition-all" style={{ backgroundImage: 'linear-gradient(to right, #fbbf24, #f59e0b)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                  <div className="p-6 pt-7">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-500/20 rounded-2xl">
                        <Activity className="text-amber-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-amber-500/80 text-[10px] font-black uppercase tracking-widest">{t('cash_balance')}</p>
                  <p className="text-3xl font-black text-amber-500 mt-1">{((stats?.totalRevenue || 0) - (stats?.totalExpenses || 0)).toLocaleString()} <span className="text-xs opacity-50">{currency}</span></p>
                  </div>
                </div>

                {/* Reste à Percevoir (Arriérés) */}
                <div className="glass-card border-none group hover:translate-y-[-4px] transition-all" style={{ backgroundImage: 'linear-gradient(to right, #60a5fa, #3b82f6)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                  <div className="p-6 pt-7">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                        <UsersIcon className="text-blue-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('arrears', 'Reste à Percevoir')}</p>
                  <p className="text-2xl font-black text-white mt-1">{((stats?.totalTuitionDue || 0) - (stats?.totalTuitionPaid || 0) > 0 ? (stats?.totalTuitionDue || 0) - (stats?.totalTuitionPaid || 0) : 0).toLocaleString()} <span className="text-xs text-slate-500">{currency}</span></p>
                  </div>
                </div>
            </div>

            {/* Recovery bar chart per class */}
            {stats?.classStats?.length > 0 && (
              <div className="glass-card p-6 border-none" style={{ backgroundImage: 'linear-gradient(to right, #10b981, #f59e0b)', backgroundSize: '100% 2px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                <div className="flex items-center justify-between mb-5 pt-1">
                  <h2 className="text-base font-black text-white flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                      Recouvrement par classe
                    </span>
                  </h2>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /><span className="text-slate-400">≥ 80%</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /><span className="text-slate-400">50–80%</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" /><span className="text-slate-400">&lt; 50%</span></span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={stats.classStats} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '8px 14px' }}
                      labelStyle={{ color: '#10b981', fontWeight: 900, marginBottom: 4 }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      formatter={(v: any) => [`${v}%`, 'Taux de recouvrement']}
                    />
                    <Bar dataKey={(d: any) => d.totalStudents > 0 ? Math.round((d.upToDateStudents / d.totalStudents) * 100) : 0} name="Taux de recouvrement" radius={[6, 6, 0, 0]} maxBarSize={44}>
                      {stats.classStats.map((entry: any, index: number) => {
                        const rate = entry.totalStudents > 0 ? (entry.upToDateStudents / entry.totalStudents) * 100 : 0;
                        return <Cell key={`cell-${index}`} fill={rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444'} fillOpacity={0.9} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="glass-card p-6 border-none shadow-xl">
                <h2 className="text-lg font-black text-white mb-6 flex items-center tracking-tight">
                    {t('dash_class_recovery_status')}
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-slate-500 text-[10px] uppercase bg-slate-900/50">
                            <tr>
                                <th className="p-4">{t('class')}</th>
                                <th className="p-4 text-center">{t('dash_total_enrollment_header')}</th>
                                <th className="p-4 text-center">{t('dash_up_to_date_students_header')}</th>
                                <th className="p-4 text-right">{t('dash_progression_header')}</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            {stats.classStats?.map((s: any) => {
                                const progress = s.totalStudents > 0 ? (s.upToDateStudents / s.totalStudents) * 100 : 0;
                                return (
                                <tr key={s.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="p-4 font-bold text-white uppercase">{s.name}</td>
                                    <td className="p-4 text-center font-bold text-slate-400">{s.totalStudents}</td>
                                    <td className="p-4 text-center font-black text-emerald-400">{s.upToDateStudents}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <span className="text-xs font-bold">{progress.toFixed(0)}%</span>
                                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            {!stats.classStats?.length && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">{t('dash_no_data_available')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  }

  if (user?.role === 'ADVISOR' && stats) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">{t('dashboard')} - {user.fullName}</h1>
                <p className="text-slate-400 mt-1 font-bold italic uppercase text-xs tracking-widest">{t('dash_pedagogy_overview')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card border-none group hover:translate-y-[-4px] transition-all" style={{ backgroundImage: 'linear-gradient(to right, #fb923c, #f59e0b)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                  <div className="p-6 pt-7">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl">
                        <UsersIcon className="text-amber-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('global_effectif')}</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.totalStudents}</p>
                  </div>
                </div>

                <div className="glass-card border-none group hover:translate-y-[-4px] transition-all" style={{ backgroundImage: 'linear-gradient(to right, #fb7185, #ef4444)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                  <div className="p-6 pt-7">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-rose-500/10 rounded-2xl">
                        <AlertTriangle className="text-rose-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('dash_global_absences')}</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.totalAbsences}</p>
                  </div>
                </div>

                <div className="glass-card border-none group hover:translate-y-[-4px] transition-all" style={{ backgroundImage: 'linear-gradient(to right, #34d399, #10b981)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                  <div className="p-6 pt-7">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                        <Activity className="text-emerald-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('dash_overall_success_rate')}</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.overallPassRate?.toFixed(1)}%</p>
                  </div>
                </div>
            </div>

            {/* Performance chart for advisor */}
            {stats?.classStats?.length > 0 && (
              <div className="glass-card p-6 border-none" style={{ backgroundImage: 'linear-gradient(to right, #f59e0b, #10b981)', backgroundSize: '100% 2px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
                <div className="flex items-center justify-between mb-5 pt-1">
                  <h2 className="text-base font-black text-white flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                      Taux de réussite par classe
                    </span>
                  </h2>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /><span className="text-slate-400">≥ 80%</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /><span className="text-slate-400">50–80%</span></span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" /><span className="text-slate-400">&lt; 50%</span></span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={stats.classStats} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '8px 14px' }}
                      labelStyle={{ color: '#f59e0b', fontWeight: 900, marginBottom: 4 }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      formatter={(v: any) => [`${v}%`, 'Taux de réussite']}
                    />
                    <Bar dataKey="passRate" name="Taux de réussite" radius={[6, 6, 0, 0]} maxBarSize={44}>
                      {stats.classStats.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.passRate >= 80 ? '#10b981' : entry.passRate >= 50 ? '#f59e0b' : entry.passRate > 0 ? '#ef4444' : '#1e293b'} fillOpacity={entry.passRate > 0 ? 0.9 : 0.4} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="glass-card p-6 border-none shadow-xl">
                <h2 className="text-lg font-black text-white mb-6 flex items-center tracking-tight">
                    {t('dash_stats_by_class')}
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-slate-500 text-[10px] uppercase bg-slate-900/50">
                            <tr>
                                <th className="p-4">{t('class')}</th>
                                <th className="p-4 text-center">{t('dash_total_enrollment_header')}</th>
                                <th className="p-4 text-center">{t('dash_absences_header')}</th>
                                <th className="p-4 text-right">{t('dash_success_rate_header')}</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            {stats.classStats?.map((s: any) => {
                                return (
                                <tr key={s.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="p-4 font-bold text-white uppercase">{s.name}</td>
                                    <td className="p-4 text-center font-bold text-slate-400">{s.totalStudents}</td>
                                    <td className="p-4 text-center font-black text-rose-400">{s.totalAbsences}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <span className={`text-xs font-bold ${s.passRate >= 50 ? 'text-emerald-500' : 'text-rose-500'}`}>{s.passRate?.toFixed(1)}%</span>
                                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${s.passRate >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${s.passRate}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                            {!stats.classStats?.length && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">{t('dash_no_data_available')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  }

  if (!stats) return (
    <div className="flex items-center justify-center h-[70vh] bg-slate-950">
      <div className="text-center space-y-6">
        <div className="relative inline-block">
          <Activity className="w-16 h-16 text-amber-500 animate-pulse mx-auto" />
          <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 animate-pulse" />
        </div>
        <p className="text-xl font-black text-white tracking-widest uppercase">{t('initializing_dashboard')}</p>
      </div>
    </div>
  );

  const filteredClassStats = selectedDiagnosticClass === 'ALL'
    ? stats.classStats
    : stats.classStats.filter((c: any) => c.level === selectedDiagnosticClass);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">{t('global_dashboard')}</h1>
            <p className="text-slate-400 mt-1 font-bold italic uppercase text-xs tracking-widest">{t('diagnostic_bilingual')}</p>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            title={t('refresh', 'Actualiser')}
            className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-slate-400 hover:text-amber-500 hover:border-amber-500/30 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setSelectedSection('FRANCOPHONE')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${selectedSection === 'FRANCOPHONE' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {t('section_francophone')}
            </button>
            <button
              onClick={() => setSelectedSection('ANGLOPHONE')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${selectedSection === 'ANGLOPHONE' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {t('section_anglophone')}
            </button>
          </div>

          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setSelectedCycle('ALL')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${selectedCycle === 'ALL' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {t('all_cycles')}
            </button>
            <button
              onClick={() => setSelectedCycle('PRIMAIRE')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${selectedCycle === 'PRIMAIRE' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {t('primary_cycle')}
            </button>
            <button
              onClick={() => setSelectedCycle('MATERNELLE')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${selectedCycle === 'MATERNELLE' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {t('nursery_cycle')}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${user?.role === 'SG' ? '3' : '4'} gap-6`}>
        <div className="glass-card border-none hover:translate-y-[-4px] transition-all cursor-pointer group" style={{ backgroundImage: 'linear-gradient(to right, #fb923c, #f59e0b)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
          <div className="p-6 pt-7">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl group-hover:bg-amber-500 transition-all">
                <UsersIcon className="text-amber-500 group-hover:text-slate-950 w-6 h-6" />
            </div>
            <Globe className="text-slate-700 w-8 h-8" />
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('global_effectif')}</p>
          <p className="text-3xl font-black text-white mt-1">{stats.totalStudents}</p>
          <div className="flex gap-2 mt-4">
             <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">{stats.genderDist.boys} {t('boys')}</span>
             <span className="text-[10px] font-bold text-pink-500 bg-pink-500/10 px-2.5 py-1 rounded-full">{stats.genderDist.girls} {t('girls')}</span>
          </div>
          </div>
        </div>

        <div className="glass-card border-none hover:translate-y-[-4px] transition-all cursor-pointer group" style={{ backgroundImage: 'linear-gradient(to right, #34d399, #10b981)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
          <div className="p-6 pt-7">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500 transition-all">
                <Activity className="text-emerald-500 group-hover:text-slate-950 w-6 h-6" />
            </div>
            <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">{t('quality')}</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('success_rate')}</p>
          <p className="text-3xl font-black text-white mt-1">
             {stats?.classStats?.length > 0 ? (stats.classStats.reduce((acc: number, c: any) => acc + (c.passRate || 0), 0) / stats.classStats.length).toFixed(1) : '0.0'}%
          </p>
          <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center uppercase">
              <ChevronRight className="w-3 h-3 rotate-[-90deg] mr-1" /> +0.0% {t('compared_to_t1')}
          </p>
          </div>
        </div>

        {user?.role !== 'SG' && (
        <div className="glass-card border-none hover:translate-y-[-4px] transition-all cursor-pointer group" style={{ backgroundImage: 'linear-gradient(to right, #fb7185, #ef4444)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
          <div className="p-6 pt-7">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-500/10 rounded-2xl group-hover:bg-rose-500 transition-all">
                <CreditCard className="text-rose-500 group-hover:text-slate-950 w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{t('tuition')}</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('total_recovery')}</p>
          <p className="text-2xl font-black text-white mt-1">{(stats?.totalRevenue || 0).toLocaleString()} <span className="text-xs text-slate-500">{currency}</span> <span className="text-slate-600 text-sm">/</span> <span className="text-sm text-slate-400">{(stats?.totalTuitionDue || 0).toLocaleString()} {currency}</span></p>
          <div className="w-full h-1.5 bg-slate-700 rounded-full mt-4 overflow-hidden p-[1px]">
             <div
                className="h-full bg-rose-500 rounded-full shadow-lg shadow-rose-500/50"
                style={{ width: `${Math.min(100, ((stats?.totalRevenue || 0) / ((stats?.totalTuitionDue || 1) || 1)) * 100)}%` }}
             />
          </div>
          </div>
        </div>
        )}

        <div className="glass-card border-none hover:translate-y-[-4px] transition-all cursor-pointer group" style={{ backgroundImage: 'linear-gradient(to right, #c084fc, #a855f7)', backgroundSize: '100% 3px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
          <div className="p-6 pt-7">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-2xl group-hover:bg-purple-500 transition-all">
                <School className="text-purple-500 group-hover:text-slate-950 w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">{t('staff')}</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('classrooms')}</p>
          <p className="text-3xl font-black text-white mt-1">{stats?.classStats?.length || 0}</p>
          <p className="text-[10px] text-purple-400 font-bold mt-2 uppercase tracking-tight italic">100% {t('active_staff')}</p>
          </div>
        </div>
      </div>

      {/* Financial Overview for Founder/Director */}
      {(user?.role === 'FOUNDER' || user?.role === 'DIRECTOR') && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-none group hover:translate-y-[-4px] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl"><CreditCard className="text-emerald-500 w-6 h-6" /></div>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('total_receipts')}</p>
          <p className="text-2xl font-black text-white mt-1">{(stats?.totalRevenue || 0).toLocaleString()} <span className="text-xs text-slate-500">{currency}</span></p>
        </div>
        <div className="glass-card p-6 border-none group hover:translate-y-[-4px] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-500/10 rounded-2xl"><Wallet className="text-rose-500 w-6 h-6" /></div>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('total_disbursements')}</p>
          <p className="text-2xl font-black text-white mt-1">{(stats?.totalExpenses || 0).toLocaleString()} <span className="text-xs text-slate-500">{currency}</span></p>
        </div>
        <div className="glass-card p-6 border-none group bg-amber-500/5 hover:translate-y-[-4px] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-500/20 rounded-2xl"><Activity className="text-amber-500 w-6 h-6" /></div>
          </div>
          <p className="text-amber-500/80 text-[10px] font-black uppercase tracking-widest">{t('cash_balance')}</p>
          <p className="text-3xl font-black text-amber-500 mt-1">{((stats?.totalRevenue || 0) - (stats?.totalExpenses || 0)).toLocaleString()} <span className="text-xs opacity-50">{currency}</span></p>
        </div>
        <div className="glass-card p-6 border-none group hover:translate-y-[-4px] transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl"><AlertTriangle className="text-blue-500 w-6 h-6" /></div>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('arrears')}</p>
          <p className="text-2xl font-black text-white mt-1">{((stats?.totalTuitionDue || 0) - (stats?.totalRevenue || 0) > 0 ? (stats?.totalTuitionDue || 0) - (stats?.totalRevenue || 0) : 0).toLocaleString()} <span className="text-xs text-slate-500">{currency}</span></p>
        </div>
      </div>
      )}

      {/* Performance Bar Chart — always visible when classes exist */}
      {stats?.classStats?.length > 0 && (
        <div className="glass-card p-6 border-none" style={{ backgroundImage: 'linear-gradient(to right, #f59e0b, #10b981)', backgroundSize: '100% 2px', backgroundPosition: 'top', backgroundRepeat: 'no-repeat' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pt-1">
            <h2 className="text-base font-black text-white flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Performance par classe — {selectedSection}
              </span>
            </h2>
            {stats.classStats.some((c: any) => c.avg > 0) ? (
              <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /><span className="text-slate-400">Moy ≥ 14</span></span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /><span className="text-slate-400">10–14</span></span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" /><span className="text-slate-400">&lt; 10</span></span>
              </div>
            ) : (
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-800 px-3 py-1.5 rounded-xl">En attente de notes validées</span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart
              data={stats.classStats}
              margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="level"
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 20]}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '8px 14px' }}
                labelStyle={{ color: '#f59e0b', fontWeight: 900, marginBottom: 4 }}
                itemStyle={{ color: '#fff' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="avg" name="Moyenne /20" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {stats.classStats.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.avg >= 14 ? '#10b981' : entry.avg >= 10 ? '#f59e0b' : entry.avg > 0 ? '#ef4444' : '#1e293b'}
                    fillOpacity={entry.avg > 0 ? 0.9 : 0.4}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black text-white flex items-center">
                   <LayoutGrid className="w-6 h-6 mr-3 text-amber-500" />
                   <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                     {t('diagnostic_per_class')}
                   </span>
                </h2>
                <select
                    className="bg-slate-800 border-none shadow-sm rounded-xl px-4 py-2 text-xs font-bold text-white outline-none ring-1 ring-slate-700 focus:ring-amber-500 transition-all cursor-pointer"
                    value={selectedDiagnosticClass}
                    onChange={(e) => setSelectedDiagnosticClass(e.target.value)}
                >
                    <option value="ALL">{t('all_classes')}</option>
                    {(stats?.classStats || []).map((c: any) => <option key={c.level} value={c.level}>{c.level}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredClassStats && filteredClassStats.length > 0 ? (
                filteredClassStats.map((item: any) => (
                    <div key={item.level} className="glass-card p-5 border-none shadow-lg hover:shadow-2xl transition-all group hover:bg-slate-900/80" style={{ backgroundImage: `linear-gradient(to right, ${item.passRate >= 80 ? '#10b981' : item.passRate >= 50 ? '#f59e0b' : '#ef4444'}, transparent)`, backgroundSize: '3px 100%', backgroundPosition: 'left', backgroundRepeat: 'no-repeat' }}>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="text-white font-black text-xl tracking-tight">{item.level}</span>
                            <p className="text-[10px] text-amber-500 uppercase font-black tracking-widest">{selectedSection === 'FRANCOPHONE' ? t('french_section') : t('english_section')}</p>
                        </div>
                        <div className="text-right">
                            <div className={`text-2xl font-black ${item.avg >= 10 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {item.avg.toFixed(2)}
                            </div>
                            <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">{t('class_average')}</p>
                        </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-700">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest">
                            <span>{t('class_success_rate')}</span>
                            <span className="text-white">{item.passRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-[1px] border border-slate-700">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 shadow-lg ${item.passRate >= 80 ? 'bg-emerald-500 shadow-emerald-500/20' : item.passRate >= 50 ? 'bg-amber-500 shadow-amber-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}
                                style={{ width: `${item.passRate}%` }}
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={() => navigate('/classes')}
                            className="text-[10px] font-black text-slate-950 bg-amber-500 px-4 py-2 rounded-xl hover:bg-yellow-400 active:scale-95 transition-all uppercase tracking-widest flex items-center shadow-lg shadow-amber-500/10"
                        >
                            {t('class_details')} <ChevronRight className="w-3 h-3 ml-1" />
                        </button>
                    </div>
                    </div>
                ))
                ) : (
                    <div className="col-span-full py-16 text-center glass-card border-2 border-dashed border-slate-700/50 flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                            <School className="w-8 h-8 text-slate-600" />
                          </div>
                          <div className="absolute inset-0 bg-amber-500/10 rounded-3xl blur-xl" />
                        </div>
                        <div>
                          <p className="text-slate-300 font-black uppercase tracking-widest text-xs">{t('no_data')}</p>
                          <p className="text-slate-600 text-[10px] mt-1 font-bold">Aucune classe avec données pour cette sélection</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-8">
            <div className="glass-card p-6 border-none shadow-xl">
                <h2 className="text-lg font-black text-white mb-6 flex items-center tracking-tight">
                    <AlertTriangle className="w-5 h-5 mr-3 text-rose-500" />
                    {t('financial_alerts')}
                </h2>
                <div className="space-y-4">
                    {stats.financialAlerts && stats.financialAlerts.length > 0 ? stats.financialAlerts.map((alert: any) => (
                        <div key={alert.class} className="p-4 bg-rose-500/5 border-l-4 border-rose-500 rounded-xl group cursor-pointer hover:bg-rose-500/10 transition-colors">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-black text-white">{alert.class}</span>
                                <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full uppercase tracking-widest">{alert.unpaidCount} {t('students')}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-widest italic">{alert.label}</p>
                        </div>
                    )) : (
                        <p className="text-xs text-slate-500 italic uppercase font-black tracking-widest text-center py-4">{t('no_alerts')}</p>
                    )}
                </div>
            </div>

            <div className="glass-card p-6 border-none shadow-xl">
                <h2 className="text-lg font-black text-white mb-6 tracking-tight uppercase tracking-widest text-xs">{t('grade_entry_status')}</h2>
                <div className="space-y-6">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                        <span className="text-slate-500">{t('current_term')}</span>
                        <span className="text-amber-500 bg-amber-500/10 px-2 py-1 rounded">{t('term_1')}</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest">
                            <span>{t('completed_classes')}</span>
                            <span className="text-white">{stats?.completedClasses || 0} / {stats?.classStats?.length || 0}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-[1px] border border-slate-700">
                            <div className="h-full bg-amber-500 shadow-lg shadow-amber-500/20" style={{ width: `${stats?.classStats?.length ? ((stats?.completedClasses || 0) / stats.classStats.length * 100) : 0}%` }} />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button 
                            onClick={() => navigate('/admin-workflow')}
                            className="w-full py-3 bg-white/5 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-slate-950 transition-all border border-white/5"
                        >
                            {t('view_details_by_class')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
