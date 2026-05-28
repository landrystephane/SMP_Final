import React, { useEffect, useState } from 'react';
import {
  TrendingUp, Users, BookOpen, Award, CheckCircle, BarChart3,
  ArrowUpRight, ArrowDownRight, LayoutDashboard, Search, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getPrimaryAppreciation } from '../utils/pedagogy';
import { generateHonorCertificate } from '../utils/reports';

const Statistics: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE'>('FRANCOPHONE');
  const [activeCycle, setActiveCycle] = useState<'ALL' | 'PRIMAIRE' | 'MATERNELLE'>('ALL');
  const [school, setSchool] = useState<any>(null);

  useEffect(() => {
    const loadSchool = async () => {
      if (window.electronAPI && user) {
        const schoolsList = await window.electronAPI.getSchools();
        const curSchool = schoolsList.find((s: any) => s.id?.toString() === user.schoolId?.toString());
        setSchool(curSchool);
      }
    };
    loadSchool();
  }, [user]);

  useEffect(() => {
    const loadStats = async () => {
      if (window.electronAPI && user) {
        const data = await window.electronAPI.getDashboardStats({ 
            schoolId: user.schoolId, 
            section: activeSection,
            level: activeCycle
        });
        setStats(data);
        setLoading(false);
      }
    };
    loadStats();
  }, [user, activeSection, activeCycle]);

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">{t('analyzing_performance', 'Analyse des performances en cours...')}</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic">INSIGHT <span className="text-amber-500">ANALYTICS</span></h1>
          <p className="text-slate-500 mt-2 uppercase text-[10px] font-black tracking-[0.4em]">{t('performance_indicators', 'Indicateurs de Performance Pédagogique & Financière')}</p>
        </div>

        <div className="flex flex-wrap gap-4">
            <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-2xl">
                <button
                    onClick={() => setActiveSection('FRANCOPHONE')}
                    className={`flex items-center px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeSection === 'FRANCOPHONE' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                    FRANCOPHONE
                </button>
                <button
                    onClick={() => setActiveSection('ANGLOPHONE')}
                    className={`flex items-center px-8 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeSection === 'ANGLOPHONE' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                    ANGLOPHONE
                </button>
            </div>

            <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-2xl">
                <button
                    onClick={() => setActiveCycle('ALL')}
                    className={`flex items-center px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeCycle === 'ALL' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                    {t('all_cycles', 'Tous Cycles')}
                </button>
                <button
                    onClick={() => setActiveCycle('PRIMAIRE')}
                    className={`flex items-center px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeCycle === 'PRIMAIRE' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                    {t('primary_cycle', 'Primaire')}
                </button>
                <button
                    onClick={() => setActiveCycle('MATERNELLE')}
                    className={`flex items-center px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeCycle === 'MATERNELLE' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                    {t('kindergarten_cycle', 'Maternelle')}
                </button>
            </div>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-8 bg-slate-900/40 border-none relative overflow-hidden group">
              <Users className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 group-hover:text-amber-500/10 transition-all" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('total_enrollment', 'Effectif Total')}</p>
              <h3 className="text-4xl font-black text-white">{stats.totalStudents}</h3>
              <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-500">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> {t('vs_last_year', '+2.4% vs l\'an passé')}
              </div>
          </div>
          <div className="glass-card p-8 bg-slate-900/40 border-none relative overflow-hidden group">
              <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 group-hover:text-emerald-500/10 transition-all" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('cycle_average', 'Moyenne du Cycle')}</p>
              <h3 className="text-4xl font-black text-white">{(stats.classStats.reduce((acc: number, c: any) => acc + c.avg, 0) / (stats.classStats.length || 1)).toFixed(2)}</h3>
              <div className="mt-4 flex items-center text-[10px] font-bold text-slate-500">
                  {t('out_of_20', 'Sur 20 points')}
              </div>
          </div>
          <div className="glass-card p-8 bg-slate-900/40 border-none relative overflow-hidden group">
              <CheckCircle className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 group-hover:text-blue-500/10 transition-all" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('success_rate', 'Taux de Réussite')}</p>
              <h3 className="text-4xl font-black text-white">{(stats.classStats.reduce((acc: number, c: any) => acc + c.passRate, 0) / (stats.classStats.length || 1)).toFixed(1)}%</h3>
              <div className="mt-4 flex items-center text-[10px] font-bold text-emerald-500">
                  {t('threshold', 'Seuil')}: 10/20
              </div>
          </div>
          <div className="glass-card p-8 bg-slate-900/40 border-none relative overflow-hidden group">
              <Award className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 group-hover:text-purple-500/10 transition-all" />
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{t('honor_rolls', 'Honor Rolls')}</p>
              <h3 className="text-4xl font-black text-white">12</h3>
              <div className="mt-4 flex items-center text-[10px] font-bold text-purple-500">
                  {t('average_gt_14', 'Moyennes > 14/20')}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Performance Chart (Placeholder for list) */}
          <div className="lg:col-span-2 space-y-8">
              <div className="glass-card p-10 bg-slate-900/30 border-none">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                        <h2 className="text-2xl font-black text-white italic tracking-tight uppercase">{t('performance_distribution', 'Répartition des Performances par Classe')}</h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('avg_pass_comparison', 'Comparaison des moyennes et taux de passage')}</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-amber-500 opacity-50" />
                  </div>

                  <div className="space-y-8">
                      {stats.classStats.map((c: any) => (
                          <div key={c.level} className="space-y-3">
                              <div className="flex justify-between items-end">
                                  <span className="text-sm font-black text-white uppercase tracking-wider">{c.level}</span>
                                  <div className="flex items-center gap-4">
                                      <span className="text-xs font-bold text-amber-500">{t('avg_abbr', 'Moy')}: {c.avg.toFixed(2)}</span>
                                      <span className="text-xs font-bold text-emerald-500">{t('succeed', 'Succeed')}: {c.passRate.toFixed(1)}%</span>
                                  </div>
                              </div>
                              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 flex">
                                  <div
                                    className="bg-amber-500 h-full transition-all duration-1000 shadow-lg shadow-amber-500/20"
                                    style={{ width: `${(c.avg / 20) * 100}%` }}
                                  />
                                  <div
                                    className="bg-emerald-500/40 h-full transition-all duration-1000"
                                    style={{ width: `${c.passRate}%` }}
                                  />
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Subject Pass Rates */}
              <div className="glass-card p-10 bg-slate-900/30 border-none">
                  <h2 className="text-2xl font-black text-white italic tracking-tight uppercase mb-8">{t('critical_points_by_subject', 'Points Critiques par Matière')}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[t('math', 'Mathématiques'), t('french', 'Français'), t('english', 'Anglais'), t('sciences', 'Sciences')].map(m => (
                          <div key={m} className="p-6 bg-slate-950/50 rounded-2xl border border-white/5 flex justify-between items-center">
                              <span className="font-black text-xs text-slate-400 uppercase tracking-widest">{m}</span>
                              <div className="flex items-center gap-3">
                                  <span className="text-xl font-black text-white">82%</span>
                                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* Right: Honor Roll (Top Students) */}
          <div className="space-y-8">
              <div className="glass-card p-10 bg-gradient-to-br from-amber-500 to-amber-600 border-none shadow-2xl shadow-amber-500/20 relative overflow-hidden group">
                  <Award className="absolute -right-8 -top-8 w-48 h-48 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
                  <h2 className="text-2xl font-black text-slate-950 italic tracking-tight uppercase mb-6 relative z-10">{t('honor_roll', 'Tableau d\'Honneur')}</h2>
                  <p className="text-amber-950/70 text-[10px] font-black uppercase tracking-widest mb-8 relative z-10">{t('top_students_term', 'Meilleurs élèves du trimestre (Moy > 15/20)')}</p>

                  <div className="space-y-4 relative z-10">
                      {[
                        { name: 'KAMGANG Landry', class: 'CM2', avg: 18.45 },
                        { name: 'NGONO Michelle', class: 'SIL', avg: 17.80 },
                        { name: 'TCHATCHOUA Paul', class: 'CM1', avg: 17.25 },
                        { name: 'MBARGA Cédric', class: 'CE2', avg: 16.90 },
                      ].map((s, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/20 transition-all cursor-default">
                              <div className="flex items-center gap-4">
                                  <span className="text-xl font-black text-amber-950/40">#{i+1}</span>
                                  <div>
                                      <p className="text-xs font-black text-slate-950 uppercase">{s.name}</p>
                                      <p className="text-[10px] font-bold text-amber-950/60 uppercase">{s.class}</p>
                                  </div>
                              </div>
                              <span className="text-lg font-black text-slate-950">{s.avg.toFixed(2)}</span>
                          </div>
                      ))}
                  </div>

                  <button 
                      onClick={() => {
                          const honorRoll = [
                            { name: 'KAMGANG Landry', class: 'CM2', avg: 18.45 },
                            { name: 'NGONO Michelle', class: 'SIL', avg: 17.80 },
                            { name: 'TCHATCHOUA Paul', class: 'CM1', avg: 17.25 },
                            { name: 'MBARGA Cédric', class: 'CE2', avg: 16.90 },
                          ];
                          honorRoll.forEach(student => {
                            generateHonorCertificate(student.name, student.class, student.avg, school);
                          });
                          alert(t('certificates_generated', "Certificats d'honneur générés avec succès."));
                      }}
                      className="w-full mt-10 py-4 bg-slate-950 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl"
                  >
                      {t('generate_certificates', 'Générer Certificats')}
                  </button>
              </div>

              {/* Financial Health Summary */}
              <div className="glass-card p-10 bg-slate-900/40 border-none">
                  <h2 className="text-xl font-black text-white italic tracking-tight uppercase mb-8">{t('section_solvency', 'Solvabilité Section')}</h2>
                  <div className="space-y-6">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span>{t('recovery_objective', 'Objectif de Recouvrement')}</span>
                          <span className="text-white">{stats.totalTuitionDue.toLocaleString()} FCFA</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${(stats.totalRevenue / (stats.totalTuitionDue || 1)) * 100}%` }}
                          />
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <span>{t('total_recovered', 'Total Recouvré')}</span>
                          <span className="text-emerald-500">{stats.totalRevenue.toLocaleString()} FCFA</span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Statistics;
