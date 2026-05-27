import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Users, Shield, Radio, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Transport: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const loadData = async () => {
    if (window.electronAPI) {
      const r = await window.electronAPI.getBusRoutes(user?.schoolId);
      setRoutes(r || []);
      if (r && r.length > 0) {
        setSelectedRoute(r[0]);
      }
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
        // In a real app, we would fetch fresh logs here
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">{t('transport_management', 'Gestion du Transport')}</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{t('transport_supervision', 'Supervision de la flotte scolaire')}</p>
        </div>
        <div className="flex space-x-2">
            <span className="flex items-center px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-2xl text-[10px] font-black uppercase border border-emerald-500/20">
                <Radio className="w-3 h-3 mr-2 animate-pulse" />
                {t('gps_server_connected', 'Serveur GPS Connecté')}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Route List */}
        <div className="space-y-6">
            <div className="glass-card p-6">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center">
                    <Navigation className="w-4 h-4 mr-2" />
                    {t('active_lines', 'Lignes Actives')}
                </h2>
                <div className="space-y-3">
                    {routes.map(r => (
                        <button
                            key={r.id}
                            onClick={() => setSelectedRoute(r)}
                            className={`w-full p-4 rounded-2xl text-left transition-all border ${
                                selectedRoute?.id === r.id
                                ? 'bg-amber-500/10 border-amber-500/50'
                                : 'bg-slate-900/50 border-white/5 hover:bg-white/5'
                            }`}
                        >
                            <p className={`font-black text-xs uppercase ${selectedRoute?.id === r.id ? 'text-amber-500' : 'text-white'}`}>
                                {r.name}
                            </p>
                            <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-bold">
                                <span>{r.bus_number}</span>
                                <span className="flex items-center text-emerald-500">
                                    <Activity className="w-3 h-3 mr-1" /> {t('en_route', 'EN ROUTE')}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                <button className="w-full mt-6 py-3 bg-white/5 text-white rounded-xl font-black text-[10px] uppercase border border-white/5 hover:bg-white/10 transition-all">
                    + {t('add_line', 'Ajouter une ligne')}
                </button>
            </div>

            <div className="glass-card p-6">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">{t('fleet_stats', 'Statistiques Flotte')}</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                        <p className="text-slate-500 font-black text-[10px] uppercase">{t('buses', 'Bus')}</p>
                        <p className="text-white text-xl font-black">04</p>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                        <p className="text-slate-500 font-black text-[10px] uppercase">{t('students', 'Élèves')}</p>
                        <p className="text-white text-xl font-black">156</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Main: Map Simulation & Details */}
        <div className="lg:col-span-3 space-y-6">
            <div className="glass-card h-[500px] relative overflow-hidden bg-slate-950">
                {/* Background Map Placeholder */}
                <div className="absolute inset-0 opacity-20 pointer-events-none"
                     style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

                {/* Simulation Points */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-full h-full max-w-2xl max-h-96">
                        {/* School */}
                        <div className="absolute left-[10%] top-[80%] flex flex-col items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20 border-4 border-slate-950">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <span className="mt-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('campus', 'Campus Eco-Manage')}</span>
                        </div>

                        {/* Bus Icon */}
                        <div className="absolute left-[45%] top-[40%] flex flex-col items-center animate-bounce">
                            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/40 border-4 border-slate-950">
                                <Navigation className="w-6 h-6 text-slate-950 rotate-45" />
                            </div>
                            <div className="mt-2 px-3 py-1 bg-slate-900 border border-amber-500/30 rounded-full">
                                <p className="text-[10px] font-black text-white uppercase tracking-widest">{selectedRoute?.bus_number || 'BUS-001'}</p>
                            </div>
                        </div>

                        {/* Stop Points */}
                        <div className="absolute left-[60%] top-[20%] w-3 h-3 bg-slate-800 rounded-full border-2 border-slate-700" />
                        <div className="absolute left-[30%] top-[30%] w-3 h-3 bg-slate-800 rounded-full border-2 border-slate-700" />
                        <div className="absolute left-[80%] top-[60%] w-3 h-3 bg-slate-800 rounded-full border-2 border-slate-700" />
                    </div>
                </div>

                {/* Overlays */}
                <div className="absolute top-6 left-6 flex space-x-4">
                    <div className="bg-slate-950/80 backdrop-blur p-4 rounded-2xl border border-white/5">
                        <p className="text-slate-500 font-black text-[10px] uppercase">{t('current_speed', 'Vitesse Actuelle')}</p>
                        <p className="text-white text-lg font-black">42 km/h</p>
                    </div>
                    <div className="bg-slate-950/80 backdrop-blur p-4 rounded-2xl border border-white/5">
                        <p className="text-slate-500 font-black text-[10px] uppercase">{t('next_stop', 'Prochain Arrêt')}</p>
                        <p className="text-amber-500 text-lg font-black italic">Carrefour Bastos</p>
                    </div>
                </div>

                <div className="absolute bottom-6 right-6">
                    <div className="bg-slate-950/80 backdrop-blur px-4 py-2 rounded-full border border-white/5 flex items-center space-x-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-white font-black text-[10px] uppercase tracking-widest">{t('live_from_yaounde', 'En direct de Yaoundé')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-white font-black text-sm uppercase mb-4 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-blue-400" />
                        {t('passengers_overview', 'Aperçu Passagers')}
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300">{t('bus_capacity', 'Capacité Bus')}</span>
                            <span className="text-white uppercase">24 / 30 {t('seats', 'PLACES')}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300">{t('boarding_completed', 'Embarquement terminé')}</span>
                            <span className="text-emerald-500 uppercase">95%</span>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6">
                    <h3 className="text-white font-black text-sm uppercase mb-4 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-amber-500" />
                        {t('punctuality', 'Ponctualité')}
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300">{t('average_delay', 'Retard Moyen')}</span>
                            <span className="text-rose-500 uppercase">+4 {t('minutes', 'MINUTES')}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300">{t('eta_school', 'Arrivée estimée École')}</span>
                            <span className="text-white uppercase">07:42 AM</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Transport;
