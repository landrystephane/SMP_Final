import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, CreditCard, Activity, ChevronRight, Globe, School } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE'>('FRANCOPHONE');

  useEffect(() => {
    const loadStats = async () => {
      try {
        if (window.electronAPI) {
          // @ts-ignore - Electron IPC exposure
          const data = await window.electronAPI.getDashboardStats(selectedSection);
          setStats(data);
        } else {
        // Mock fallback for web preview verification
        setTimeout(() => {
          setStats({
            totalStudents: 458,
            genderDist: { boys: 240, girls: 218 },
            totalRevenue: 12450000,
            classStats: [
              { level: 'SIL A', avg: 14.2, passRate: 85 },
              { level: 'SIL B', avg: 11.5, passRate: 78 },
              { level: 'CP A', avg: 15.1, passRate: 92 },
              { level: 'Class 1', avg: 9.8, passRate: 65 },
            ]
          });
        }, 500);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        // Fallback in case of error
        setStats({
          totalStudents: 0,
          genderDist: { boys: 0, girls: 0 },
          totalRevenue: 0,
          classStats: []
        });
      }
    };
    loadStats();
  }, [selectedSection]);

  if (!stats) return (
    <div className="flex items-center justify-center h-full text-white">
      <div className="text-center space-y-4">
        <Activity className="w-12 h-12 text-slate-gold-gold animate-pulse mx-auto" />
        <p className="text-xl font-bold">Initialisation du Dashboard...</p>
        <p className="text-slate-400">Si cela prend trop de temps, assurez-vous que la base de données est initialisée.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Tableau de Bord Global</h1>
          <p className="text-slate-400 mt-1">Diagnostic et statistiques de l'établissement</p>
        </div>

        {/* Sélecteur de Section */}
        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setSelectedSection('FRANCOPHONE')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${selectedSection === 'FRANCOPHONE' ? 'bg-slate-gold-gold text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            SECTION FRANCOPHONE
          </button>
          <button
            onClick={() => setSelectedSection('ANGLOPHONE')}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${selectedSection === 'ANGLOPHONE' ? 'bg-slate-gold-gold text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            ANGLOPHONE SECTION
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-l-4 border-blue-500 hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between">
            <UsersIcon className="text-blue-500 w-8 h-8" />
            <Globe className="text-slate-500 w-4 h-4" />
          </div>
          <p className="text-slate-400 text-xs mt-4 font-bold uppercase">Effectif Global</p>
          <p className="text-3xl font-bold text-white">{stats.totalStudents}</p>
          <div className="flex gap-2 mt-2">
             <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{stats.genderDist.boys} Garçons</span>
             <span className="text-[10px] bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full">{stats.genderDist.girls} Filles</span>
          </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-green-500 hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between">
            <Activity className="text-green-500 w-8 h-8" />
            <span className="text-xs font-bold text-green-500">82%</span>
          </div>
          <p className="text-slate-400 text-xs mt-4 font-bold uppercase">Moyenne Générale</p>
          <p className="text-3xl font-bold text-white">12.45</p>
          <p className="text-[10px] text-slate-500 mt-1">Diagnostic: Performance Stable</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-slate-gold-gold hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between">
            <CreditCard className="text-slate-gold-gold w-8 h-8" />
            <div className="text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Objectif</span>
                <span className="text-xs font-bold text-white">16M FCFA</span>
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-4 font-bold uppercase">Recettes Totales</p>
          <p className="text-2xl font-bold text-white">{stats.totalRevenue.toLocaleString()} FCFA</p>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
             <div
                className="h-full bg-slate-gold-gold"
                style={{ width: `${Math.min(100, (stats.totalRevenue / (stats.totalTuitionDue || 1)) * 100)}%` }}
             />
          </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-purple-500 hover:scale-105 transition-transform cursor-pointer">
          <div className="flex items-center justify-between">
            <School className="text-purple-500 w-8 h-8" />
            <span className="text-xs font-bold text-slate-400">T1 Actif</span>
          </div>
          <p className="text-slate-400 text-xs mt-4 font-bold uppercase">Salles de Classe</p>
          <p className="text-3xl font-bold text-white">20</p>
          <p className="text-[10px] text-slate-500 mt-1">100% du personnel actif</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance détaillée par Classe */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center">
               Diagnostic par Salle de Classe
               <span className="ml-3 text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-400">{selectedSection}</span>
            </h2>
            <button className="text-blue-400 text-xs flex items-center hover:underline">
              Voir rapport complet <ChevronRight className="w-3 h-3 ml-1" />
            </button>
          </div>

          <div className="space-y-6">
            {stats.classStats && stats.classStats.length > 0 ? (
              stats.classStats.map((item: any) => (
                <div key={item.level} className="group p-4 bg-white/5 rounded-xl border border-white/5 hover:border-slate-gold-gold/50 transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                        <span className="text-white font-bold text-lg">{item.level}</span>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Section {selectedSection === 'FRANCOPHONE' ? 'Française' : 'English'}</p>
                    </div>
                    <div className="text-right">
                        <span className={`text-xl font-mono font-bold ${item.avg >= 10 ? 'text-green-500' : 'text-red-500'}`}>
                            {item.avg.toFixed(2)}
                        </span>
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Moyenne de classe</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 mb-1">
                        <span>Taux de réussite</span>
                        <span>{item.passRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 shadow-sm ${item.passRate >= 80 ? 'bg-green-500 shadow-green-500/20' : item.passRate >= 50 ? 'bg-yellow-500 shadow-yellow-500/20' : 'bg-red-500 shadow-red-500/20'}`}
                            style={{ width: `${item.passRate}%` }}
                        />
                    </div>
                  </div>
                </div>
              ))
            ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                    <School className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Aucune donnée de performance disponible</p>
                    <p className="text-xs text-slate-600 mt-1 italic">Veuillez saisir des notes pour générer les diagnostics</p>
                </div>
            )}
          </div>
        </div>

        {/* Alertes et État du Personnel */}
        <div className="space-y-8">
            <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-white mb-4">Alertes Financières</h2>
                <div className="space-y-3">
                    {[
                        { class: 'SIL A', arrears: '1,250,000', count: 8 },
                        { class: 'Class 2', arrears: '900,000', count: 5 },
                        { class: 'GS', arrears: '450,000', count: 12 },
                    ].map(alert => (
                        <div key={alert.class} className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg group cursor-pointer hover:bg-red-500/10 transition-colors">
                            <div className="flex justify-between">
                                <span className="text-sm font-bold text-white">{alert.class}</span>
                                <span className="text-red-400 font-mono text-sm">{alert.arrears}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">{alert.count} élèves avec solde impayé</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-card p-6">
                <h2 className="text-lg font-bold text-white mb-4">État des Saisies</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold uppercase">Trimestre 1</span>
                        <span className="text-slate-gold-gold font-bold">En cours</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold uppercase">Notes Verrouillées</span>
                        <span className="text-white font-bold">1,240 / 3,500</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '35%' }} />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
