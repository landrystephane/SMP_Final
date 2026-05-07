import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, CreditCard, Activity, ChevronRight, Globe, School, LayoutGrid, AlertTriangle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE'>('FRANCOPHONE');
  const [selectedDiagnosticClass, setSelectedDiagnosticClass] = useState<string>('ALL');

  useEffect(() => {
    const loadStats = async () => {
      try {
        if (window.electronAPI) {
          const data = await window.electronAPI.getDashboardStats();
          setStats(data);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
      }
    };
    loadStats();
  }, [selectedSection]);

  if (!stats) return (
    <div className="flex items-center justify-center h-[70vh] text-slate-500">
      <div className="text-center space-y-4">
        <Activity className="w-12 h-12 text-blue-600 animate-pulse mx-auto" />
        <p className="text-xl font-bold">Initialisation du Dashboard...</p>
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
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Tableau de Bord Global</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Diagnostic bilingue et suivi des performances scolaires</p>
        </div>

        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setSelectedSection('FRANCOPHONE')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${selectedSection === 'FRANCOPHONE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-blue-600'}`}
          >
            SECTION FRANCOPHONE
          </button>
          <button
            onClick={() => setSelectedSection('ANGLOPHONE')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${selectedSection === 'ANGLOPHONE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-blue-600'}`}
          >
            ANGLOPHONE SECTION
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 bg-white dark:bg-slate-900 border-none shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl group-hover:bg-blue-600 transition-all">
                <UsersIcon className="text-blue-600 group-hover:text-white w-6 h-6" />
            </div>
            <Globe className="text-slate-200 dark:text-slate-800 w-8 h-8" />
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Effectif Global</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.totalStudents}</p>
          <div className="flex gap-2 mt-4">
             <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">{stats.genderDist.boys} Garçons</span>
             <span className="text-[10px] font-bold text-pink-500 bg-pink-50 dark:bg-pink-900/30 px-2.5 py-1 rounded-full">{stats.genderDist.girls} Filles</span>
          </div>
        </div>

        <div className="glass-card p-6 bg-white dark:bg-slate-900 border-none shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl group-hover:bg-emerald-500 transition-all">
                <Activity className="text-emerald-500 group-hover:text-white w-6 h-6" />
            </div>
            <span className="text-xs font-black text-emerald-500">QUALITÉ</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Taux de Réussite</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">82.4%</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center">
              <ChevronRight className="w-3 h-3 rotate-[-90deg] mr-1" /> +2.1% par rapport au T1
          </p>
        </div>

        <div className="glass-card p-6 bg-white dark:bg-slate-900 border-none shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-2xl group-hover:bg-rose-500 transition-all">
                <CreditCard className="text-rose-500 group-hover:text-white w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">PENSION</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Recouvrement Total</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalRevenue.toLocaleString()} <span className="text-xs">FCFA</span></p>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden p-[1px]">
             <div
                className="h-full bg-rose-500 rounded-full"
                style={{ width: `${Math.min(100, (stats.totalRevenue / (stats.totalTuitionDue || 1)) * 100)}%` }}
             />
          </div>
        </div>

        <div className="glass-card p-6 bg-white dark:bg-slate-900 border-none shadow-xl hover:translate-y-[-4px] transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl group-hover:bg-purple-600 transition-all">
                <School className="text-purple-600 group-hover:text-white w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-slate-400">STAFF</span>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Salles de Classe</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">20</p>
          <p className="text-[10px] text-purple-600 font-bold mt-2 uppercase tracking-tight">100% du personnel actif</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center">
                   <LayoutGrid className="w-6 h-6 mr-3 text-blue-600" />
                   Diagnostic par Salle de Classe
                </h2>
                <select
                    className="bg-white dark:bg-slate-800 border-none shadow-sm rounded-xl px-4 py-2 text-xs font-bold outline-none ring-1 ring-slate-200 dark:ring-slate-700"
                    value={selectedDiagnosticClass}
                    onChange={(e) => setSelectedDiagnosticClass(e.target.value)}
                >
                    <option value="ALL">Toutes les classes</option>
                    {stats.classStats.map((c: any) => <option key={c.level} value={c.level}>{c.level}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredClassStats && filteredClassStats.length > 0 ? (
                filteredClassStats.map((item: any) => (
                    <div key={item.level} className="glass-card p-5 bg-white dark:bg-slate-900 border-none shadow-lg hover:shadow-2xl transition-all border-l-4 border-l-blue-600">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <span className="text-slate-900 dark:text-white font-black text-xl">{item.level}</span>
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Section {selectedSection === 'FRANCOPHONE' ? 'Française' : 'English'}</p>
                        </div>
                        <div className="text-right">
                            <div className={`text-2xl font-black ${item.avg >= 10 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {item.avg.toFixed(2)}
                            </div>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Moyenne de classe</p>
                        </div>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                            <span>Taux de réussite</span>
                            <span>{item.passRate.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${item.passRate >= 80 ? 'bg-emerald-500' : item.passRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${item.passRate}%` }}
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest flex items-center">
                            Détails classe <ChevronRight className="w-3 h-3 ml-1" />
                        </button>
                    </div>
                    </div>
                ))
                ) : (
                    <div className="col-span-full py-16 text-center glass-card border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <School className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold">Aucune donnée disponible</p>
                    </div>
                )}
            </div>
        </div>

        <div className="space-y-8">
            <div className="glass-card p-6 bg-white dark:bg-slate-900 border-none shadow-xl">
                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-3 text-rose-500" />
                    Alertes Financières
                </h2>
                <div className="space-y-4">
                    {stats.financialAlerts ? stats.financialAlerts.map((alert: any) => (
                        <div key={alert.class} className="p-4 bg-rose-50/50 dark:bg-rose-900/10 border-l-4 border-rose-500 rounded-lg group cursor-pointer hover:bg-rose-50 transition-colors">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-black text-slate-900 dark:text-white">{alert.class}</span>
                                <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-2 py-1 rounded-full">{alert.unpaidCount} ÉLÈVES</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tight">{alert.label}</p>
                        </div>
                    )) : (
                        <p className="text-xs text-slate-400 italic">Aucune alerte critique ce jour.</p>
                    )}
                </div>
            </div>

            <div className="glass-card p-6 bg-white dark:bg-slate-900 border-none shadow-xl">
                <h2 className="text-lg font-black text-slate-900 dark:text-white mb-6">État des Saisies (Notes)</h2>
                <div className="space-y-5">
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                        <span className="text-slate-400">Trimestre en cours</span>
                        <span className="text-blue-600">Trimestre 1</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                            <span>Classes Complétées</span>
                            <span>14 / 20</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 shadow-lg shadow-blue-500/20" style={{ width: '70%' }} />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                            Voir le détail par classe
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
