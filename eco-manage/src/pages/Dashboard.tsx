import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, CreditCard, Activity, ChevronRight, Globe, School, LayoutGrid, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE'>('FRANCOPHONE');
  const [selectedDiagnosticClass, setSelectedDiagnosticClass] = useState<string>('ALL');

  useEffect(() => {
    const loadStats = async () => {
      try {
        if (window.electronAPI && user) {
          const data = await window.electronAPI.getDashboardStats({ schoolId: user.schoolId, section: selectedSection });
          setStats(data);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      }
    };
    loadStats();
  }, [selectedSection, user]);

  if (!stats) return (
    <div className="flex items-center justify-center h-[70vh] text-slate-500">
      <div className="text-center space-y-4">
        <Activity className="w-12 h-12 text-blue-600 animate-pulse mx-auto" />
        <p className="text-xl font-bold">{t('initializing_dashboard')}</p>
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <p className="text-3xl font-black text-white mt-1">82.4%</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center uppercase">
              <ChevronRight className="w-3 h-3 rotate-[-90deg] mr-1" /> +2.1% {t('compared_to_t1')}
          </p>
        </div>

        <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-500/10 rounded-2xl group-hover:bg-rose-500 transition-all">
                <CreditCard className="text-rose-500 group-hover:text-slate-950 w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{t('tuition')}</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('total_recovery')}</p>
          <p className="text-2xl font-black text-white mt-1">{stats.totalRevenue.toLocaleString()} <span className="text-xs text-slate-500">FCFA</span></p>
          <div className="w-full h-1.5 bg-slate-700 rounded-full mt-4 overflow-hidden p-[1px]">
             <div
                className="h-full bg-rose-500 rounded-full shadow-lg shadow-rose-500/50"
                style={{ width: `${Math.min(100, (stats.totalRevenue / (stats.totalTuitionDue || 1)) * 100)}%` }}
             />
          </div>
        </div>

        <div className="glass-card p-6 border-none hover:translate-y-[-4px] transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-2xl group-hover:bg-purple-500 transition-all">
                <School className="text-purple-500 group-hover:text-slate-950 w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">{t('staff')}</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{t('classrooms')}</p>
          <p className="text-3xl font-black text-white mt-1">20</p>
          <p className="text-[10px] text-purple-400 font-bold mt-2 uppercase tracking-tight italic">100% {t('active_staff')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black text-white flex items-center">
                   <LayoutGrid className="w-6 h-6 mr-3 text-amber-500" />
                   {t('diagnostic_per_class')}
                </h2>
                <select
                    className="bg-slate-800 border-none shadow-sm rounded-xl px-4 py-2 text-xs font-bold text-white outline-none ring-1 ring-slate-700"
                    value={selectedDiagnosticClass}
                    onChange={(e) => setSelectedDiagnosticClass(e.target.value)}
                >
                    <option value="ALL">{t('all_classes')}</option>
                    {stats.classStats.map((c: any) => <option key={c.level} value={c.level}>{c.level}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredClassStats && filteredClassStats.length > 0 ? (
                filteredClassStats.map((item: any) => (
                    <div key={item.level} className="glass-card p-5 border-none shadow-lg hover:shadow-2xl transition-all border-l-4 border-l-amber-500">
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
                        <button className="text-[10px] font-black text-slate-950 bg-amber-500 px-4 py-2 rounded-xl hover:bg-yellow-400 transition-colors uppercase tracking-widest flex items-center shadow-lg">
                            {t('class_details')} <ChevronRight className="w-3 h-3 ml-1" />
                        </button>
                    </div>
                    </div>
                ))
                ) : (
                    <div className="col-span-full py-16 text-center glass-card border-2 border-dashed border-slate-700">
                        <School className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Aucune donnée disponible</p>
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
                            <span className="text-white">14 / 20</span>
                        </div>
                        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-[1px] border border-slate-700">
                            <div className="h-full bg-amber-500 shadow-lg shadow-amber-500/20" style={{ width: '70%' }} />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button className="w-full py-3 bg-white/5 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-slate-950 transition-all border border-white/5">
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
