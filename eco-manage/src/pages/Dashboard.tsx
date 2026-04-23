import React from 'react';
import { Users, TrendingUp, CreditCard, PieChart, Activity } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Tableau de Bord Global</h1>
        <p className="text-slate-400 mt-1">Aperçu en temps réel de l'établissement</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <Users className="text-blue-500 w-8 h-8" />
            <span className="text-xs font-bold text-green-500 flex items-center">
              +5% <TrendingUp className="w-3 h-3 ml-1" />
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-4 font-medium">Effectif Total</p>
          <p className="text-3xl font-bold text-white">458</p>
          <p className="text-[10px] text-slate-500 mt-1">240 Garçons / 218 Filles</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <Activity className="text-green-500 w-8 h-8" />
            <span className="text-xs font-bold text-green-500">82%</span>
          </div>
          <p className="text-slate-400 text-sm mt-4 font-medium">Taux de Réussite</p>
          <p className="text-3xl font-bold text-white">Moy: 12.45</p>
          <p className="text-[10px] text-slate-500 mt-1">Basé sur le dernier trimestre</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-slate-gold-gold">
          <div className="flex items-center justify-between">
            <CreditCard className="text-slate-gold-gold w-8 h-8" />
            <span className="text-xs font-bold text-yellow-500">75% Payé</span>
          </div>
          <p className="text-slate-400 text-sm mt-4 font-medium">Recettes Scolarité</p>
          <p className="text-2xl font-bold text-white">12,450,000</p>
          <p className="text-[10px] text-slate-500 mt-1">FCFA (Objectif: 16M)</p>
        </div>

        <div className="glass-card p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <PieChart className="text-purple-500 w-8 h-8" />
            <span className="text-xs font-bold text-slate-400">Stable</span>
          </div>
          <p className="text-slate-400 text-sm mt-4 font-medium">Taux de Présence</p>
          <p className="text-3xl font-bold text-white">94%</p>
          <p className="text-[10px] text-slate-500 mt-1">Moyenne mensuelle</p>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance by Class */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-white mb-6">Performance par Niveau</h2>
          <div className="space-y-4">
            {[
              { level: 'SIL', pass: 85, avg: 14.2 },
              { level: 'CP', pass: 78, avg: 11.5 },
              { level: 'CE1', pass: 92, avg: 15.1 },
              { level: 'CE2', pass: 65, avg: 9.8 },
            ].map((item) => (
              <div key={item.level} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300 font-bold">{item.level}</span>
                  <span className={`${item.avg >= 10 ? 'text-green-500' : 'text-red-500'}`}>Moy: {item.avg}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${item.pass >= 80 ? 'bg-green-500' : item.pass >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${item.pass}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 text-right">{item.pass}% de réussite</div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Arrears */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold text-white mb-6">Alertes Impayés</h2>
          <div className="space-y-4">
            {[
              { name: 'SIL A', arrears: '1,200,000', students: 12 },
              { name: 'Class 1', arrears: '850,000', students: 8 },
              { name: 'CM2', arrears: '400,000', students: 4 },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                <div>
                  <p className="text-white font-bold">{item.name}</p>
                  <p className="text-[10px] text-slate-500">{item.students} élèves avec solde</p>
                </div>
                <div className="text-right">
                  <p className="text-red-400 font-mono font-bold">{item.arrears} FCFA</p>
                  <button className="text-[10px] text-blue-400 hover:underline">Voir liste</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
