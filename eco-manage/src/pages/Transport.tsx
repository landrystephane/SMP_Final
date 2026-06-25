import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Users, Shield, Radio, Activity, Pencil, Trash2, X, History, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, shadowUrl: markerShadow });

const Transport: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routeStudents, setRouteStudents] = useState<any[]>([]);
  // New states
  const [transportHistory, setTransportHistory] = useState<any[]>([]);
  const [busPositions, setBusPositions] = useState<Record<number, any>>({});
  const [selectedDate, setSelectedDate] = useState('');
  // Modals
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [showAddPoint, setShowAddPoint] = useState(false);
  const [showEditRoute, setShowEditRoute] = useState(false);

  // Forms
  const [newRoute, setNewRoute] = useState({ name: '', bus_number: '', driver_id: '' });
  const [editRoute, setEditRoute] = useState({ id: 0, name: '', bus_number: '', driver_id: '' });
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
      // Load bus positions for all routes
      if (r && r.length > 0) {
        const positions: Record<number, any> = {};
        for (const route of r) {
          try {
            const pos = await window.electronAPI.getLatestBusPosition({ routeId: route.id });
            if (pos) positions[route.id] = pos;
          } catch (e) { /* ignore */ }
        }
        setBusPositions(positions);
      }
    }
  };

  const loadPoints = async () => {
      if (window.electronAPI && selectedRoute) {
          const p = await window.electronAPI.getTransportPoints(selectedRoute.id);
          setPoints(p || []);
          const s = await window.electronAPI.getRouteStudents(selectedRoute.id);
          setRouteStudents(s || []);
      }
  };

  const loadHistory = async () => {
    if (window.electronAPI && selectedRoute) {
      try {
        const h = await window.electronAPI.getTransportHistory({
          routeId: selectedRoute.id,
          date: selectedDate || undefined
        });
        setTransportHistory(h || []);
      } catch (e) {
        setTransportHistory([]);
      }
    }
  };

  const loadBusPosition = async () => {
    if (window.electronAPI && selectedRoute) {
      try {
        const pos = await window.electronAPI.getLatestBusPosition({ routeId: selectedRoute.id });
        if (pos) {
          setBusPositions(prev => ({ ...prev, [selectedRoute.id]: pos }));
        }
      } catch (e) { /* ignore */ }
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
      loadPoints();
      loadHistory();
      loadBusPosition();
  }, [selectedRoute]);

  useEffect(() => {
    loadHistory();
  }, [selectedDate]);

  // Check if a bus is currently "en route" (GPS update within the last 30 minutes)
  const isBusEnRoute = (routeId: number): boolean => {
    const pos = busPositions[routeId];
    if (!pos || !pos.created_at) return false;
    const lastUpdate = new Date(pos.created_at).getTime();
    const now = Date.now();
    return (now - lastUpdate) < 30 * 60 * 1000; // 30 minutes
  };

  // Check if selected route has stops with valid coordinates for the map
  const hasValidMapPoints = (): boolean => {
    return points.some(p => p.latitude && p.longitude && (p.latitude !== 0 || p.longitude !== 0));
  };

  const getMapCenter = (): [number, number] => {
    // Try to center on the bus position first
    const pos = selectedRoute ? busPositions[selectedRoute.id] : null;
    if (pos && pos.latitude && pos.longitude) return [pos.latitude, pos.longitude];
    // Then try the first valid stop
    const validPoint = points.find(p => p.latitude && p.longitude && (p.latitude !== 0 || p.longitude !== 0));
    if (validPoint) return [validPoint.latitude, validPoint.longitude];
    // Default: Yaounde
    return [3.848, 11.502];
  };

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
      if (window.electronAPI && window.confirm(t('confirm_delete_point', "Supprimer ce point ?"))) {
          await window.electronAPI.deleteTransportPoint(id);
          loadPoints();
      }
  };

  const handleOpenEditRoute = (route: any) => {
      setEditRoute({
          id: route.id,
          name: route.name,
          bus_number: route.bus_number,
          driver_id: route.driver_id ? String(route.driver_id) : ''
      });
      setShowEditRoute(true);
  };

  const handleUpdateRoute = async () => {
      if (!editRoute.name || !editRoute.bus_number) return;
      if (window.electronAPI) {
          await window.electronAPI.updateBusRoute({
              id: editRoute.id,
              name: editRoute.name,
              bus_number: editRoute.bus_number,
              driver_id: editRoute.driver_id ? parseInt(editRoute.driver_id, 10) : null
          });
          setShowEditRoute(false);
          const wasSelected = selectedRoute?.id === editRoute.id;
          setSelectedRoute(null);
          await loadData();
          if (wasSelected) {
              const r = await window.electronAPI.getBusRoutes(user?.schoolId);
              const updated = (r || []).find((rt: any) => rt.id === editRoute.id);
              if (updated) setSelectedRoute(updated);
          }
      }
  };

  const handleDeleteRoute = async (routeId: number) => {
      if (window.electronAPI && window.confirm(t('confirm_delete_route', 'Supprimer cette ligne de bus et tous ses points ? Cette action est irreversible.'))) {
          await window.electronAPI.deleteBusRoute(routeId);
          if (selectedRoute?.id === routeId) {
              setSelectedRoute(null);
              setPoints([]);
              setRouteStudents([]);
              setTransportHistory([]);
          }
          loadData();
      }
  };

  const handleUnassignStudent = async (studentId: number) => {
      if (window.electronAPI && window.confirm(t('confirm_unassign_student', 'Retirer cet eleve de la ligne de transport ?'))) {
          await window.electronAPI.unassignStudentFromTransport(studentId);
          loadPoints();
      }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'PRESENT': return { label: t('present', 'Present'), color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
      case 'ABSENT': return { label: t('absent', 'Absent'), color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' };
      case 'LATE': return { label: t('late', 'En retard'), color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
      default: return { label: status, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    }
  };

  const formatDirection = (dir: string) => {
    switch (dir) {
      case 'TO_SCHOOL': return t('to_school', 'Aller');
      case 'FROM_SCHOOL': return t('from_school', 'Retour');
      default: return dir;
    }
  };

  const currentBusPos = selectedRoute ? busPositions[selectedRoute.id] : null;

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
                {t('gps_server_connected', 'Serveur GPS Connecte')}
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
                    {routes.map(r => {
                        const enRoute = isBusEnRoute(r.id);
                        return (
                        <div
                            key={r.id}
                            className={`w-full p-4 rounded-2xl text-left transition-all border ${
                                selectedRoute?.id === r.id
                                ? 'bg-amber-500/10 border-amber-500/50'
                                : 'bg-slate-900/50 border-white/5 hover:bg-white/5'
                            }`}
                        >
                            <div className="cursor-pointer" onClick={() => setSelectedRoute(r)}>
                                <p className={`font-black text-xs uppercase ${selectedRoute?.id === r.id ? 'text-amber-500' : 'text-white'}`}>
                                    {r.name}
                                </p>
                                <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-bold">
                                    <span>{r.bus_number}</span>
                                    {enRoute ? (
                                        <span className="flex items-center text-emerald-500">
                                            <Activity className="w-3 h-3 mr-1 animate-pulse" /> {t('en_route', 'EN ROUTE')}
                                        </span>
                                    ) : (
                                        <span className="flex items-center text-slate-500">
                                            <Activity className="w-3 h-3 mr-1" /> {t('parked', 'GARE')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                <button
                                    onClick={() => handleOpenEditRoute(r)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    <Pencil className="w-3 h-3" /> {t('edit', 'Modifier')}
                                </button>
                                <button
                                    onClick={() => handleDeleteRoute(r.id)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    <Trash2 className="w-3 h-3" /> {t('delete', 'Supprimer')}
                                </button>
                            </div>
                        </div>
                        );
                    })}
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
                        <p className="text-slate-500 font-black text-[10px] uppercase">{t('passengers', 'Passagers')}</p>
                        <p className="text-white text-xl font-black">{selectedRoute ? routeStudents.length.toString().padStart(2, '0') : '--'}</p>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5">
                        <p className="text-slate-500 font-black text-[10px] uppercase">{t('stops', 'Arrets')}</p>
                        <p className="text-white text-xl font-black">{selectedRoute ? points.length.toString().padStart(2, '0') : '--'}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Main: Map & Details */}
        <div className="lg:col-span-3 space-y-6">
            {/* Real Leaflet Map or placeholder */}
            <div className="glass-card overflow-hidden bg-slate-950">
                {selectedRoute && (hasValidMapPoints() || currentBusPos) ? (
                    <div style={{ position: 'relative' }}>
                        <MapContainer
                            center={getMapCenter()}
                            zoom={14}
                            style={{ height: '400px', width: '100%', zIndex: 1 }}
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {/* Stop point markers */}
                            {points.filter(p => p.latitude && p.longitude && (p.latitude !== 0 || p.longitude !== 0)).map(p => (
                                <Marker key={p.id} position={[p.latitude, p.longitude]}>
                                    <Popup>
                                        <strong>{p.name}</strong><br />
                                        +{p.estimated_time_from_start} min
                                    </Popup>
                                </Marker>
                            ))}
                            {/* Bus position as blue circle */}
                            {currentBusPos && currentBusPos.latitude && currentBusPos.longitude && (
                                <CircleMarker
                                    center={[currentBusPos.latitude, currentBusPos.longitude]}
                                    radius={12}
                                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.8, weight: 3 }}
                                >
                                    <Popup>
                                        <strong>{selectedRoute.bus_number}</strong><br />
                                        {t('last_update', 'Derniere mise a jour')}: {new Date(currentBusPos.created_at).toLocaleTimeString()}
                                    </Popup>
                                </CircleMarker>
                            )}
                        </MapContainer>
                        {/* Overlays on top of the map */}
                        <div className="absolute top-4 left-4 z-[1000]">
                            <div className="bg-slate-950/80 backdrop-blur p-3 rounded-2xl border border-white/5">
                                <p className="text-slate-500 font-black text-[10px] uppercase">{t('route', 'Itineraire')}</p>
                                <p className="text-white text-lg font-black">{selectedRoute?.name}</p>
                            </div>
                        </div>
                        <div className="absolute bottom-4 right-4 z-[1000]">
                            <div className="bg-slate-950/80 backdrop-blur px-4 py-2 rounded-full border border-white/5 flex items-center space-x-2">
                                {isBusEnRoute(selectedRoute.id) ? (
                                    <>
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        <p className="text-white font-black text-[10px] uppercase tracking-widest">{t('en_route', 'EN ROUTE')}</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-2 h-2 bg-slate-500 rounded-full" />
                                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{t('parked', 'GARE')}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-[400px] relative overflow-hidden">
                        {/* Background Map Placeholder */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none"
                             style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

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
                            </div>
                        </div>

                        {/* Overlays */}
                        <div className="absolute top-6 left-6 flex space-x-4">
                            <div className="bg-slate-950/80 backdrop-blur p-4 rounded-2xl border border-white/5">
                                <p className="text-slate-500 font-black text-[10px] uppercase">{t('route', 'Itineraire')}</p>
                                <p className="text-white text-lg font-black">{selectedRoute?.name || t('select_route', 'Selectionnez une ligne')}</p>
                            </div>
                        </div>

                        <div className="absolute bottom-6 right-6">
                            <div className="bg-slate-950/80 backdrop-blur px-4 py-2 rounded-full border border-white/5 flex items-center space-x-2">
                                <div className="w-2 h-2 bg-slate-500 rounded-full" />
                                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{t('no_gps_data', 'Pas de donnees GPS')}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stop points sidebar on the map */}
                {selectedRoute && (
                    <div className="absolute top-0 right-0 bottom-0 w-64 bg-slate-950/90 backdrop-blur-md border-l border-white/10 p-4 flex flex-col" style={{ zIndex: 1001 }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest">{t('stop_points', "Points d'arret")}</h3>
                            <button onClick={() => setShowAddPoint(true)} className="p-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20">+</button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {points.map((p) => (
                                <div key={p.id} className="flex justify-between items-center p-3 bg-slate-900 rounded-xl border border-white/5">
                                    <div>
                                        <p className="text-xs font-black text-white">{p.name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold">+{p.estimated_time_from_start} min</p>
                                    </div>
                                    <button onClick={() => handleDeletePoint(p.id)} className="text-slate-600 hover:text-rose-500 text-xs">X</button>
                                </div>
                            ))}
                            {points.length === 0 && <p className="text-[10px] text-slate-500 text-center italic mt-10">{t('no_stops', 'Aucun point')}</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Route Students */}
            {selectedRoute && (
                <div className="glass-card overflow-hidden border-none shadow-2xl">
                    <div className="p-6 bg-slate-900/80 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-white font-black text-sm uppercase flex items-center tracking-widest">
                            <Users className="w-4 h-4 mr-3 text-blue-400" />
                            {t('assigned_students', 'Eleves Assignes')}
                        </h3>
                        <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-white/5">
                            <span className="text-xs font-black text-amber-500">{routeStudents.length}</span>
                            <span className="text-[10px] text-slate-500 font-black uppercase ml-1">{t('students', 'eleves')}</span>
                        </div>
                    </div>
                    <div className="divide-y divide-white/5 bg-slate-950/20">
                        {routeStudents.map(s => (
                            <div key={s.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm bg-blue-500/20 text-blue-400 border border-blue-500/20">
                                        {s.last_name?.[0]}
                                    </div>
                                    <div>
                                        <p className="text-white font-black uppercase text-xs tracking-tight">{s.last_name} {s.first_name}</p>
                                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-400 font-black uppercase">{s.class_name}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleUnassignStudent(s.id)}
                                    title={t('remove_from_route', 'Retirer de la ligne')}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-900 text-slate-600 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {routeStudents.length === 0 && (
                            <div className="py-12 text-center text-slate-600 font-black uppercase text-[10px] tracking-widest italic">
                                {t('no_students_on_route', 'Aucun eleve assigne a cette ligne')}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Transport History Section */}
            {selectedRoute && (
                <div className="glass-card overflow-hidden border-none shadow-2xl">
                    <div className="p-6 bg-slate-900/80 border-b border-white/5">
                        <div className="flex justify-between items-center">
                            <h3 className="text-white font-black text-sm uppercase flex items-center tracking-widest">
                                <History className="w-4 h-4 mr-3 text-amber-500" />
                                {t('transport_history', 'Historique Transport')}
                            </h3>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={e => setSelectedDate(e.target.value)}
                                        title={t('filter_by_date', 'Filtrer par date')}
                                        placeholder={t('select_date', 'Choisir une date')}
                                        className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white text-xs font-bold"
                                    />
                                </div>
                                {selectedDate && (
                                    <button
                                        onClick={() => setSelectedDate('')}
                                        className="px-3 py-2 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase hover:bg-slate-700 transition-all"
                                    >
                                        {t('clear_filter', 'Effacer')}
                                    </button>
                                )}
                                <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-white/5">
                                    <span className="text-xs font-black text-amber-500">{transportHistory.length}</span>
                                    <span className="text-[10px] text-slate-500 font-black uppercase ml-1">{t('records', 'enregistrements')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {transportHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('date', 'Date')}</th>
                                        <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('student', 'Eleve')}</th>
                                        <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('stop', 'Arret')}</th>
                                        <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('direction', 'Direction')}</th>
                                        <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('status', 'Statut')}</th>
                                        <th className="text-left p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('time', 'Heure')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {transportHistory.map((h: any, idx: number) => {
                                        const statusInfo = formatStatus(h.status);
                                        return (
                                            <tr key={idx} className="hover:bg-white/5 transition-all">
                                                <td className="p-4 text-xs text-white font-bold">{h.date}</td>
                                                <td className="p-4">
                                                    <p className="text-xs font-black text-white uppercase">{h.last_name} {h.first_name}</p>
                                                </td>
                                                <td className="p-4 text-xs text-slate-400 font-bold">{h.stop_name || '--'}</td>
                                                <td className="p-4 text-xs text-slate-300 font-bold">{formatDirection(h.direction)}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs text-slate-400 font-bold">
                                                    {h.recorded_at ? new Date(h.recorded_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-600 font-black uppercase text-[10px] tracking-widest italic">
                            {t('no_transport_history', 'Aucun historique de transport pour cette ligne')}
                        </div>
                    )}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-white font-black text-sm uppercase mb-4 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-blue-400" />
                        {t('passengers_overview', 'Apercu Passagers')}
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300">{t('assigned_students_count', 'Eleves assignes')}</span>
                            <span className="text-white uppercase font-black">{selectedRoute ? routeStudents.length : '--'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300">{t('stop_count', "Nombre d'arrets")}</span>
                            <span className="text-white uppercase font-black">{selectedRoute ? points.length : '--'}</span>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-6">
                    <h3 className="text-white font-black text-sm uppercase mb-4 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-amber-500" />
                        {t('bus_status', 'Statut Bus')}
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300">{t('current_status', 'Statut actuel')}</span>
                            {selectedRoute ? (
                                isBusEnRoute(selectedRoute.id) ? (
                                    <span className="text-emerald-500 uppercase font-black flex items-center">
                                        <Activity className="w-3 h-3 mr-1 animate-pulse" /> {t('en_route', 'EN ROUTE')}
                                    </span>
                                ) : (
                                    <span className="text-slate-500 uppercase font-black">{t('parked', 'GARE')}</span>
                                )
                            ) : (
                                <span className="text-white uppercase font-black">--</span>
                            )}
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold p-3 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-slate-300">{t('last_gps_update', 'Derniere MAJ GPS')}</span>
                            <span className="text-white uppercase font-black">
                                {selectedRoute && currentBusPos?.created_at
                                    ? new Date(currentBusPos.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                                    : '--'}
                            </span>
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
                  <h3 className="text-xl font-black text-white italic tracking-tight mb-6">{t('new_bus_line', 'NOUVELLE LIGNE DE BUS')}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('line_name', 'Nom de la Ligne')}</label>
                          <input type="text" value={newRoute.name} onChange={e => setNewRoute({...newRoute, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm" placeholder="ex: Route Nord" />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('bus_plate', 'Matricule du Bus')}</label>
                          <input type="text" value={newRoute.bus_number} onChange={e => setNewRoute({...newRoute, bus_number: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm" placeholder="ex: CE-1234-A" />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('assigned_driver', 'Chauffeur Assigne')}</label>
                          <select value={newRoute.driver_id} onChange={e => setNewRoute({...newRoute, driver_id: e.target.value})} title={t('assigned_driver', 'Chauffeur Assigne')} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm">
                              <option value="">{t('no_driver', 'Aucun chauffeur')}</option>
                              {drivers.map(d => (
                                  <option key={d.id} value={d.id}>{d.full_name} ({d.username})</option>
                              ))}
                          </select>
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setShowAddRoute(false)} className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-black text-white uppercase">{t('cancel', 'Annuler')}</button>
                          <button onClick={handleAddRoute} className="flex-1 py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase">{t('create', 'Creer')}</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Add Point Modal */}
      {showAddPoint && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-black text-white italic tracking-tight mb-6">{t('add_stop_point', "AJOUTER UN POINT D'ARRET")}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('point_name', 'Nom du Point')}</label>
                          <input type="text" value={newPoint.name} onChange={e => setNewPoint({...newPoint, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm" placeholder="ex: Carrefour Bastos" />
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setShowAddPoint(false)} className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-black text-white uppercase">{t('cancel', 'Annuler')}</button>
                          <button onClick={handleAddPoint} className="flex-1 py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase">{t('add', 'Ajouter')}</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Route Modal */}
      {showEditRoute && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-black text-white italic tracking-tight mb-6">{t('edit_line', 'MODIFIER LA LIGNE')}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('line_name', 'Nom de la Ligne')}</label>
                          <input type="text" value={editRoute.name} onChange={e => setEditRoute({...editRoute, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm" placeholder="ex: Route Nord" />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('bus_plate', 'Matricule du Bus')}</label>
                          <input type="text" value={editRoute.bus_number} onChange={e => setEditRoute({...editRoute, bus_number: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm" placeholder="ex: CE-1234-A" />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">{t('assigned_driver', 'Chauffeur Assigne')}</label>
                          <select value={editRoute.driver_id} onChange={e => setEditRoute({...editRoute, driver_id: e.target.value})} title={t('assigned_driver', 'Chauffeur Assigne')} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm">
                              <option value="">{t('no_driver', 'Aucun chauffeur')}</option>
                              {drivers.map(d => (
                                  <option key={d.id} value={d.id}>{d.full_name} ({d.username})</option>
                              ))}
                          </select>
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setShowEditRoute(false)} className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-black text-white uppercase">{t('cancel', 'Annuler')}</button>
                          <button onClick={handleUpdateRoute} className="flex-1 py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase">{t('save', 'Enregistrer')}</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Transport;
