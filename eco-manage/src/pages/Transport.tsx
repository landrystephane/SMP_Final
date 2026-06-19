import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Users, Shield, Radio, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Transport: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  // Modals
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showAddPoint, setShowAddPoint] = useState(false);
  
  // Forms
  const [newRoute, setNewRoute] = useState({ name: '', bus_number: '', driver_id: '' });
  const [newPoint, setNewPoint] = useState({ name: '', estimatedTime: 0 });

  const loadData = async () => {
    if (window.electronAPI) {
      const r = await window.electronAPI.getBusRoutes(user?.schoolId);
      setRoutes(r || []);
      if (r && r.length > 0 && !selectedRoute) {
        setSelectedRoute(r[0]);
      }
      const u = await window.electronAPI.getUsers(user?.schoolId);
      if (u) {
          setDrivers(u.filter((x: any) => x.role === 'DRIVER'));
      }
    }
  };

  const loadPoints = async () => {
      if (window.electronAPI && selectedRoute) {
          const p = await window.electronAPI.getTransportPoints(selectedRoute.id);
          setPoints(p || []);
      }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
      loadPoints();
  }, [selectedRoute]);

  const handleAddRoute = async () => {
      if (!newRoute.name || !newRoute.bus_number) return;
      if (window.electronAPI) {
          await window.electronAPI.addBusRoute({ 
              name: newRoute.name, 
              bus_number: newRoute.bus_number,
              driver_id: newRoute.driver_id ? parseInt(newRoute.driver_id, 10) : null, 
              schoolId: user?.schoolId 
          });
          setShowAddRoute(false);
          setNewRoute({ name: '', bus_number: '', driver_id: '' });
          loadData();
      }
  };

  const handleAddPoint = async () => {
      if (!selectedRoute || !newPoint.name) return;
      if (window.electronAPI) {
          await window.electronAPI.addTransportPoint({
              routeId: selectedRoute.id,
              name: newPoint.name,
              latitude: 0,
              longitude: 0,
              estimatedTime: 0
          });
          setShowAddPoint(false);
          setNewPoint({ name: '' });
          loadPoints();
      }
  };

  const handleDeletePoint = async (id: number) => {
      if (window.electronAPI && window.confirm("Supprimer ce point ?")) {
          await window.electronAPI.deleteTransportPoint(id);
          loadPoints();
      }
  };

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

                <button onClick={() => setShowAddRoute(true)} className="w-full mt-6 py-3 bg-white/5 text-white rounded-xl font-black text-[10px] uppercase border border-white/5 hover:bg-white/10 transition-all">
                    + {t('add_line', 'Ajouter une ligne')}
                </button>
            </div>

            <div className="glass-card p-6">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">{t('fleet_stats', 'Statistiques Flotte')}</h2>
                <div className="grid grid-cols-1 gap-4">
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                        <p className="text-slate-500 font-black text-[10px] uppercase">{t('buses', 'Bus')}</p>
                        <p className="text-white text-xl font-black">{routes.length.toString().padStart(2, '0')}</p>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                        <p className="text-slate-500 font-black text-[10px] uppercase">Lignes</p>
                        <p className="text-white text-xl font-black">{routes.length.toString().padStart(2, '0')}</p>
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
                    </div>
                </div>

                {/* Overlays */}
                <div className="absolute top-6 left-6 flex space-x-4">
                    <div className="bg-slate-950/80 backdrop-blur p-4 rounded-2xl border border-white/5">
                        <p className="text-slate-500 font-black text-[10px] uppercase">Itinéraire</p>
                        <p className="text-white text-lg font-black">{selectedRoute?.name}</p>
                    </div>
                </div>

                <div className="absolute top-6 right-6 bottom-6 w-64 bg-slate-950/90 backdrop-blur-md rounded-3xl border border-white/10 p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Points d'arrêt</h3>
                        <button onClick={() => setShowAddPoint(true)} className="p-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20">+</button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {points.map((p, idx) => (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-white/5">
                                <div>
                                    <p className="text-xs font-black text-white">{p.name}</p>
                                    <p className="text-[10px] text-slate-500 font-bold">+{p.estimated_time_from_start} min</p>
                                </div>
                                <button onClick={() => handleDeletePoint(p.id)} className="text-slate-600 hover:text-rose-500 text-xs">X</button>
                            </div>
                        ))}
                        {points.length === 0 && <p className="text-[10px] text-slate-500 text-center italic mt-10">Aucun point</p>}
                    </div>
                </div>

                <div className="absolute bottom-6 right-6">
                    <div className="bg-slate-950/80 backdrop-blur px-4 py-2 rounded-full border border-white/5 flex items-center space-x-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <p className="text-white font-black text-[10px] uppercase tracking-widest">{t('live_from_yaounde', 'En direct de Yaoundé')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 grid-cols-1 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-white font-black text-sm uppercase mb-4 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-blue-400" />
                        {t('passengers_overview', 'Aperçu Passagers')}
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300">{t('bus_capacity', 'Capacité Bus')}</span>
                            <span className="text-white uppercase">--</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300">{t('boarding_completed', 'Embarquement terminé')}</span>
                            <span className="text-white uppercase">--</span>
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
                            <span className="text-white uppercase">--</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300">{t('eta_school', 'Arrivée estimée École')}</span>
                            <span className="text-white uppercase">--</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Add Route Modal */}
      {showAddRoute && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-black text-white italic tracking-tight mb-6">NOUVELLE LIGNE DE BUS</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nom de la Ligne</label>
                          <input type="text" value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm" placeholder="ex: Route Nord" />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Matricule du Bus</label>
                          <input type="text" value={newRoute.bus_number} onChange={e => setNewRoute({...newRoute, bus_number: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm" placeholder="ex: CE-1234-A" />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Chauffeur Assigné</label>
                          <select value={newRoute.driver_id} onChange={e => setNewRoute({...newRoute, driver_id: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm">
                              <option value="">Aucun chauffeur</option>
                              {drivers.map(d => (
                                  <option key={d.id} value={d.id}>{d.full_name} ({d.username})</option>
                              ))}
                          </select>
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setShowAddRoute(false)} className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-black text-white uppercase">Annuler</button>
                          <button onClick={handleAddRoute} className="flex-1 py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase">Créer</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Add Point Modal */}
      {showAddPoint && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-black text-white italic tracking-tight mb-6">AJOUTER UN POINT D'ARRÊT</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nom du Point</label>
                          <input type="text" value={newPoint.name} onChange={e => setNewPoint({...newPoint, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm" placeholder="ex: Carrefour Bastos" />
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setShowAddPoint(false)} className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-black text-white uppercase">Annuler</button>
                          <button onClick={handleAddPoint} className="flex-1 py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase">Ajouter</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Transport;
