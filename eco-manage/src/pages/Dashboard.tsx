import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, CreditCard, Activity, ChevronRight, Globe, School, LayoutGrid, AlertTriangle, Wallet, BookOpen, Download } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import SystemAdmin from './SystemAdmin';
import { generateSchedulePdf, generateExamSchedulePdf } from '../utils/reports';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE'>('FRANCOPHONE');
  const [selectedCycle, setSelectedCycle] = useState<'ALL' | 'PRIMAIRE' | 'MATERNELLE'>('ALL');
  const [selectedDiagnosticClass, setSelectedDiagnosticClass] = useState<string>('ALL');
  const [teacherTab, setTeacherTab] = useState<'OVERVIEW' | 'TIMETABLE' | 'EXAMS_PROGRAM'>('OVERVIEW');
  const navigate = useNavigate();

  useEffect(() => {
    const loadStats = async () => {
      const isImpersonating = localStorage.getItem('impersonated_school_id') !== null;
      if (user?.role === 'SUPERADMIN' && !isImpersonating) {
        return;
      }
      try {
        if (window.electronAPI && user) {
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
  }, [selectedSection, selectedCycle, user]);

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
                    <p className="text-slate-400 mt-1 font-bold italic uppercase text-xs tracking-widest">Aperçu de vos classes</p>
                </div>
                <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                    <button onClick={() => setTeacherTab('OVERVIEW')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${teacherTab === 'OVERVIEW' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Mes Classes</button>
                    <button onClick={() => setTeacherTab('TIMETABLE')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${teacherTab === 'TIMETABLE' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Mon Emploi du Temps</button>
                    <button onClick={() => setTeacherTab('EXAMS_PROGRAM')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${teacherTab === 'EXAMS_PROGRAM' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Programme Évaluations</button>
                </div>
            </div>

            {teacherTab === 'TIMETABLE' ? (
                <div className="glass-card p-6 border-none shadow-xl">
                    <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                        <div className="flex items-center space-x-3 text-amber-500">
                            <LayoutGrid className="w-5 h-5" />
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">Mon Emploi du Temps Hebdomadaire</h2>
                        </div>
                        <button 
                            onClick={() => {
                                const columns = [t('hour', 'Heure'), t('monday', 'Lundi'), t('tuesday', 'Mardi'), t('wednesday', 'Mercredi'), t('thursday', 'Jeudi'), t('friday', 'Vendredi'), t('saturday', 'Samedi'), t('sunday', 'Dimanche')];
                                const rows: any[] = [];
                                const allSlots: any[] = [];
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
                                    [1, 2, 3, 4, 5, 6, 7].forEach(day => {
                                        const sData = stats.schedules?.find((s: any) => s.day_of_week === day && s.start_time?.trim() === slot.start?.trim());
                                        if (sData) {
                                            if (sData.type === 'PAUSE') {
                                                rowData.push('PAUSE');
                                            } else {
                                                const className = stats.classes?.find((c: any) => c.id == sData.class_id)?.name || 'Classe';
                                                const subjectName = stats.subjects?.find((sub: any) => sub.id == sData.subject_id)?.name || '';
                                                rowData.push(`${className}\n${subjectName}`);
                                            }
                                        } else {
                                            rowData.push('-');
                                        }
                                    });
                                    rows.push(rowData);
                                });
                                
                                generateSchedulePdf({
                                    school: { name: user?.schoolName || 'ECO-MANAGE' }, 
                                    title: `Emploi du Temps - ${user?.fullName}`,
                                    columns,
                                    rows
                                });
                            }}
                            className="bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center"
                        >
                            <Download className="w-3 h-3 mr-2" />
                            Télécharger PDF
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
                                                <p className="text-slate-400 font-bold mb-4">Aucun cours programmé pour vous.</p>
                                                <p className="text-xs text-slate-500">Votre emploi du temps s'affichera ici dès qu'on vous aura attribué des cours.</p>
                                            </div>
                                        );
                                    }

                                    return allSlots.map((slot: any, index: number) => (
                                    <React.Fragment key={`${slot.label}-${index}`}>
                                        <div className="p-4 bg-slate-950/50 rounded-xl text-[10px] font-black text-slate-400 text-center flex items-center justify-center border border-slate-800">
                                            {slot.label}
                                        </div>
                                        {[1, 2, 3, 4, 5, 6, 7].map(day => {
                                            const sData = stats.schedules?.find((s: any) => s.day_of_week === day && s.start_time?.trim() === slot.start?.trim());
                                            
                                            if (sData) {
                                                const typeColor = sData.type === 'EVALUATION' 
                                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                                                    : sData.type === 'PAUSE'
                                                        ? 'bg-slate-900/10 border-dashed border-slate-800 text-slate-600'
                                                        : 'bg-amber-500/10 border-amber-500/20 text-amber-500';
                                                
                                                if (sData.type === 'PAUSE') {
                                                    return (
                                                        <div key={day} className={`p-4 rounded-xl border text-center flex items-center justify-center ${typeColor}`}>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">Pause (Perso)</span>
                                                        </div>
                                                    );
                                                }

                                                const className = stats.classes?.find((c: any) => c.id == sData.class_id)?.name || 'Classe';
                                                const subjectName = stats.subjects?.find((sub: any) => sub.id == sData.subject_id)?.name || '';
                                                
                                                return (
                                                    <div key={day} className={`p-2 rounded-xl border text-center flex flex-col justify-center ${typeColor} h-[70px] overflow-hidden`} title={`${className} - ${subjectName || sData.type}`}>
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
                                                            {sData.type || 'COURS'}
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            return (
                                                <div key={day} className="p-4 bg-slate-950/20 rounded-xl border border-white/5 hover:bg-slate-900/50 transition-all flex items-center justify-center">
                                                    <span className="text-slate-700 text-xs">-</span>
                                                </div>
                                            );
                                        })}
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
                            <h2 className="text-lg font-black uppercase text-white tracking-wide">Mes Surveillances d'Évaluations</h2>
                        </div>
                        {stats.examSchedules && stats.examSchedules.length > 0 && (
                            <button 
                                onClick={() => {
                                    const columns = ['Date', 'Horaires', 'Classe', 'Matière'];
                                    const rows = stats.examSchedules.map((exam: any) => {
                                        return [exam.date, `${exam.start_time} - ${exam.end_time}`, exam.class_name, exam.subject_name];
                                    });
                                    generateExamSchedulePdf({
                                        school: { name: user?.schoolName || 'ECO-MANAGE' },
                                        title: `Programme des Évaluations - ${user?.fullName}`,
                                        columns,
                                        rows
                                    });
                                }}
                                className="bg-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center"
                            >
                                <Download className="w-3 h-3 mr-2" />
                                Télécharger PDF
                            </button>
                        )}
                    </div>
                    
                    {(!stats.examSchedules || stats.examSchedules.length === 0) ? (
                        <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                            <p className="text-slate-400 font-bold mb-4">Aucune surveillance d'évaluation programmée.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Horaires</th>
                                        <th className="px-6 py-4">Classe</th>
                                        <th className="px-6 py-4">Matière</th>
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
                <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl group-hover:bg-amber-500 transition-all">
                        <UsersIcon className="text-amber-500 group-hover:text-slate-950 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('global_effectif')}</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.totalStudents}</p>
                </div>
                {/* Boys */}
                <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:bg-blue-500 transition-all">
                        <UsersIcon className="text-blue-500 group-hover:text-slate-950 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Garçons</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.genderDist?.boys || 0}</p>
                </div>
                {/* Girls */}
                <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-pink-500/10 rounded-2xl group-hover:bg-pink-500 transition-all">
                        <UsersIcon className="text-pink-500 group-hover:text-slate-950 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Filles</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.genderDist?.girls || 0}</p>
                </div>
            </div>

            {/* List of students by merit */}
            <div className="glass-card p-6 border-none shadow-xl">
                <h2 className="text-lg font-black text-white mb-6 flex items-center tracking-tight">
                    Liste des élèves par ordre de mérite
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-slate-500 text-[10px] uppercase bg-slate-900/50">
                            <tr>
                                <th className="p-4">Rang</th>
                                <th className="p-4">Matricule</th>
                                <th className="p-4">Nom et Prénom</th>
                                <th className="p-4">Classe</th>
                                <th className="p-4 text-right">Moyenne</th>
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
                                    <td colSpan={5} className="p-8 text-center text-slate-500">Aucun élève trouvé.</td>
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
                <p className="text-slate-400 mt-1 font-bold italic uppercase text-xs tracking-widest">Aperçu Financier</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-1 space-y-4 lg:grid-cols-4 gap-6">
                {/* Total Recouvrements (Recettes) */}
                <div className="glass-card p-6 border-none group hover:translate-y-[-4px] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                        <CreditCard className="text-emerald-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Recettes</p>
                  <p className="text-2xl font-black text-white mt-1">{(stats?.totalRevenue || 0).toLocaleString()} <span className="text-xs text-slate-500">FCFA</span></p>
                </div>

                {/* Total Décaissements (Dépenses) */}
                <div className="glass-card p-6 border-none group hover:translate-y-[-4px] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-rose-500/10 rounded-2xl">
                        <Wallet className="text-rose-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Décaissements</p>
                  <p className="text-2xl font-black text-white mt-1">{(stats?.totalExpenses || 0).toLocaleString()} <span className="text-xs text-slate-500">FCFA</span></p>
                </div>

                {/* Solde Actuel (Recettes - Dépenses) */}
                <div className="glass-card p-6 border-none group bg-amber-500/5 hover:translate-y-[-4px] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-500/20 rounded-2xl">
                        <Activity className="text-amber-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-amber-500/80 text-[10px] font-black uppercase tracking-widest">Solde en Caisse</p>
                  <p className="text-3xl font-black text-amber-500 mt-1">{((stats?.totalRevenue || 0) - (stats?.totalExpenses || 0)).toLocaleString()} <span className="text-xs opacity-50">FCFA</span></p>
                </div>
                
                {/* Reste à Percevoir (Arriérés) */}
                <div className="glass-card p-6 border-none group hover:translate-y-[-4px] transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                        <UsersIcon className="text-blue-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('arrears', 'Reste à Percevoir')}</p>
                  <p className="text-2xl font-black text-white mt-1">{((stats?.totalTuitionDue || 0) - (stats?.totalTuitionPaid || 0) > 0 ? (stats?.totalTuitionDue || 0) - (stats?.totalTuitionPaid || 0) : 0).toLocaleString()} <span className="text-xs text-slate-500">FCFA</span></p>
                </div>
            </div>

            <div className="glass-card p-6 border-none shadow-xl">
                <h2 className="text-lg font-black text-white mb-6 flex items-center tracking-tight">
                    État de recouvrement par Salle de Classe
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-slate-500 text-[10px] uppercase bg-slate-900/50">
                            <tr>
                                <th className="p-4">Classe</th>
                                <th className="p-4 text-center">Effectif Total</th>
                                <th className="p-4 text-center">Élèves à jour</th>
                                <th className="p-4 text-right">Progression</th>
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
                                    <td colSpan={4} className="p-8 text-center text-slate-500">Aucune donnée disponible.</td>
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
                <p className="text-slate-400 mt-1 font-bold italic uppercase text-xs tracking-widest">Aperçu Pédagogique</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 border-none group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl">
                        <UsersIcon className="text-amber-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Effectif Global</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.totalStudents}</p>
                </div>

                <div className="glass-card p-6 border-none group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-rose-500/10 rounded-2xl">
                        <AlertTriangle className="text-rose-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Absences Globales</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.totalAbsences}</p>
                </div>
                
                <div className="glass-card p-6 border-none group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl">
                        <Activity className="text-emerald-500 w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Taux de Réussite Global</p>
                  <p className="text-3xl font-black text-white mt-1">{stats.overallPassRate?.toFixed(1)}%</p>
                </div>
            </div>

            <div className="glass-card p-6 border-none shadow-xl">
                <h2 className="text-lg font-black text-white mb-6 flex items-center tracking-tight">
                    Statistiques par Salle de Classe
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-slate-500 text-[10px] uppercase bg-slate-900/50">
                            <tr>
                                <th className="p-4">Classe</th>
                                <th className="p-4 text-center">Effectif Total</th>
                                <th className="p-4 text-center">Absences</th>
                                <th className="p-4 text-right">Taux de réussite</th>
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
                                    <td colSpan={4} className="p-8 text-center text-slate-500">Aucune donnée disponible.</td>
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
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">{t('global_dashboard')}</h1>
          <p className="text-slate-400 mt-1 font-bold italic uppercase text-xs tracking-widest">{t('diagnostic_bilingual')}</p>
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
      <div className={`grid grid-cols-1 grid-cols-1 lg:grid-cols-${user?.role === 'SG' ? '3' : '4'} gap-6`}>
        <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all cursor-pointer group">
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

        <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all cursor-pointer group">
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

        {user?.role !== 'SG' && (
        <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-500/10 rounded-2xl group-hover:bg-rose-500 transition-all">
                <CreditCard className="text-rose-500 group-hover:text-slate-950 w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{t('tuition')}</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('total_recovery')}</p>
          <p className="text-2xl font-black text-white mt-1">{(stats?.totalRevenue || 0).toLocaleString()} <span className="text-xs text-slate-500">FCFA</span></p>
          <div className="w-full h-1.5 bg-slate-700 rounded-full mt-4 overflow-hidden p-[1px]">
             <div
                className="h-full bg-rose-500 rounded-full shadow-lg shadow-rose-500/50"
                style={{ width: `${Math.min(100, ((stats?.totalRevenue || 0) / ((stats?.totalTuitionDue || 1) || 1)) * 100)}%` }}
             />
          </div>
        </div>
        )}

        <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all cursor-pointer group">
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

            <div className="grid grid-cols-1 grid-cols-1 gap-4">
                {filteredClassStats && filteredClassStats.length > 0 ? (
                filteredClassStats.map((item: any) => (
                    <div key={item.level} className="glass-card p-5 border-none shadow-lg hover:shadow-2xl transition-all border-l-4 border-l-amber-500 bg-slate-900/60 group hover:bg-slate-900/80">
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
                    <div className="col-span-full py-16 text-center glass-card border-2 border-dashed border-slate-700">
                        <School className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">{t('no_data')}</p>
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
                            <span className="text-white">0 / {stats?.classStats?.length || 0}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-[1px] border border-slate-700">
                            <div className="h-full bg-amber-500 shadow-lg shadow-amber-500/20" style={{ width: '0%' }} />
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
