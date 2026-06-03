import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Users, Phone, Bell, CheckCircle2, AlertCircle, Play, Square, Map as MapIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const DriverPortal: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isDriving, setIsDriving] = useState(false);
  const [attendance, setAttendance] = useState<Record<number, boolean>>({});
  const [points, setPoints] = useState<any[]>([]);
  const [showAddPoint, setShowAddPoint] = useState(false);
  const [newPoint, setNewPoint] = useState({ name: '' });
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterClass, setFilterClass] = useState('ALL');
  const [classes, setClasses] = useState<any[]>([]);

  const loadRouteData = async () => {
    if (window.electronAPI) {
      const routes = await window.electronAPI.getBusRoutes(user?.schoolId);
      const myRoute = routes.find((r: any) => r.driver_id === user?.id) || routes[0];
      setActiveRoute(myRoute);

      if (myRoute) {
        const routeStudents = await window.electronAPI.getRouteStudents(myRoute.id);
        setStudents(routeStudents);

        const routePoints = await window.electronAPI.getTransportPoints(myRoute.id);
        if (routePoints && routePoints.length > 0) {
            setPoints(routePoints);
        } else {
            // Fallback points for simulation if none defined
            setPoints([
                { id: 'p1', name: 'Campus Eco-Manage', estimated_time_from_start: 0, latitude: 3.848, longitude: 11.502 },
                { id: 'p2', name: 'Carrefour Bastos', estimated_time_from_start: 15, latitude: 3.868, longitude: 11.512 },
                { id: 'p3', name: 'Rond-point Nlongkak', estimated_time_from_start: 25, latitude: 3.878, longitude: 11.522 },
                { id: 'p4', name: 'Carrefour Warda', estimated_time_from_start: 40, latitude: 3.858, longitude: 11.532 }
            ]);
        }
      }

      // Load eligible students that paid for transport but are not assigned
      const eligible = await window.electronAPI.getTransportEligibleStudents(user?.schoolId);
      setEligibleStudents(eligible || []);

      const c = await window.electronAPI.getClasses(user?.schoolId);
      setClasses(c || []);
    }
  };

  useEffect(() => {
    loadRouteData();
  }, [user]);

  const handleAddPoint = async () => {
      if (!activeRoute || !newPoint.name) return;
      
      setIsAdding(true);
      let lat = 0;
      let lng = 0;
      
      // Try to get GPS coordinates
      if ('geolocation' in navigator) {
          try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
              });
              lat = position.coords.latitude;
              lng = position.coords.longitude;
          } catch (err) {
              console.warn("GPS failed or denied:", err);
              // Fallback to 0,0 but alert driver
              alert("Impossible d'obtenir la position GPS exacte. L'arrêt sera créé sans coordonnées précises.");
          }
      }

      if (window.electronAPI) {
          await window.electronAPI.addTransportPoint({
              routeId: activeRoute.id,
              name: newPoint.name,
              latitude: lat,
              longitude: lng,
              estimatedTime: 0
          });
          setShowAddPoint(false);
          setNewPoint({ name: '' });
          loadRouteData();
      }
      setIsAdding(false);
  };

  const toggleActivity = async () => {
    const newState = !isDriving;
    setIsDriving(newState);

    if (window.electronAPI && activeRoute) {
      await window.electronAPI.logTransport({
        route_id: activeRoute.id,
        event_type: newState ? 'DEPARTURE' : 'ARRIVAL',
        latitude: points[currentPointIndex]?.latitude || 0,
        longitude: points[currentPointIndex]?.longitude || 0
      });

      if (newState) {
          alert(t('tour_started_alert', "Tournée ACTIVÉE. Les parents sont notifiés de votre départ."));
      }
    }
  };

  const nextStop = async () => {
    if (currentPointIndex < points.length - 1) {
      const nextIdx = currentPointIndex + 1;
      setCurrentPointIndex(nextIdx);
      if (window.electronAPI && activeRoute) {
        await window.electronAPI.logTransport({
          route_id: activeRoute.id,
          event_type: 'GPS_UPDATE',
          latitude: points[nextIdx].latitude,
          longitude: points[nextIdx].longitude
        });
        
        await window.electronAPI.notifyTransportProximity({
            pointId: points[nextIdx].id,
            driverId: user?.id
        });
      }
    } else {
      toggleActivity();
      alert(t('tour_ended_alert', 'Tournée terminée ! Arrivée au terminus.'));
    }
  };

  const togglePresence = async (studentId: number) => {
    const isPresent = !attendance[studentId];
    setAttendance(prev => ({ ...prev, [studentId]: isPresent }));
    
    if (window.electronAPI && activeRoute) {
        await window.electronAPI.logTransportAttendance({
            studentId,
            routeId: activeRoute.id,
            direction: new Date().getHours() < 12 ? 'MORNING_PICKUP' : 'EVENING_DROPOFF',
            status: isPresent ? 'PRESENT' : 'ABSENT',
            recordedBy: user?.id
        });
    }
  };

  const handleAssignStudent = async (studentId: number, pointId: number) => {
      if (window.electronAPI && activeRoute) {
          await window.electronAPI.assignStudentToTransportPoint({
              studentId,
              pointId,
              routeId: activeRoute.id
          });
          loadRouteData(); // Reload to update lists
      }
  };

  const filteredEligible = eligibleStudents.filter(s => {
      if (filterSection !== 'ALL' && s.section !== filterSection) return false;
      if (filterLevel !== 'ALL' && s.level !== filterLevel) return false;
      if (filterClass !== 'ALL' && s.class_name !== filterClass) return false;
      return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">{t('portal', 'PORTAIL')} <span className="text-amber-500">{t('driver', 'CHAUFFEUR')}</span></h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
            {activeRoute?.name || t('no_assigned_route', 'Aucune ligne assignée')} • {activeRoute?.bus_number}
          </p>
        </div>
        <button
            onClick={toggleActivity}
            className={`px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center shadow-2xl ${
                isDriving
                ? 'bg-rose-500 text-white shadow-rose-500/20'
                : 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 hover:scale-105'
            }`}
        >
            {isDriving ? (
                <><Square className="w-5 h-5 mr-3" /> {t('stop_tour', 'ARRÊTER LA TOURNÉE')}</>
            ) : (
                <><Play className="w-5 h-5 mr-3" /> {t('start_tour', 'DÉMARRER LA TOURNÉE')}</>
            )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation & Points */}
        <div className="glass-card p-8 space-y-8 bg-slate-900/40 border-none">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center">
                    <MapIcon className="w-4 h-4 mr-3 text-amber-500" /> {t('itinerary', 'Itinéraire')}
                </h2>
                <button onClick={() => setShowAddPoint(true)} className="p-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500/20 text-xs font-black transition-all">
                    + Ajouter Arrêt
                </button>
            </div>
            <div className="relative space-y-10 pl-10">
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-800" />
                {points.map((p, idx) => (
                    <div key={p.id} className="relative">
                        <div className={`absolute -left-[31px] top-1 w-6 h-6 rounded-full border-4 flex items-center justify-center ${
                            idx < currentPointIndex ? 'bg-emerald-500 border-emerald-500/20 text-slate-950' :
                            idx === currentPointIndex ? 'bg-amber-500 border-amber-500/20 animate-pulse text-slate-950' :
                            'bg-slate-900 border-slate-800 text-slate-600'
                        }`}>
                            <CheckCircle2 className="w-3 h-3" />
                        </div>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className={`font-black uppercase text-sm tracking-tight ${idx === currentPointIndex ? 'text-amber-500' : 'text-slate-400'}`}>{p.name}</p>
                                <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">{t('passage', 'Passage')} : {p.estimated_time_from_start} mins</p>
                            </div>
                            {idx === currentPointIndex && isDriving && (
                                <button
                                    onClick={nextStop}
                                    className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-amber-500/20 hover:bg-yellow-400 transition-all"
                                >
                                    {t('next_stop', 'STOP SUIVANT')}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isDriving && (
                <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center space-x-4 animate-in slide-in-from-bottom-2">
                    <div className="bg-blue-500/20 p-3 rounded-2xl">
                        <Bell className="text-blue-400 w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                        <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest">{t('parents_notification', 'Notification Parents')}</p>
                        <p className="text-white text-xs font-bold mt-0.5">{t('proximity_alert', 'Alerte Proximité')} : {points[currentPointIndex]?.name}</p>
                    </div>
                </div>
            )}
        </div>

        {/* Section Assignation des Élèves Éligibles */}
        <div className="lg:col-span-2 space-y-6">
            {eligibleStudents.length > 0 && (
                <div className="glass-card overflow-hidden border-none shadow-2xl mb-8 border border-indigo-500/20 bg-indigo-900/10">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center italic">
                                <MapPin className="w-6 h-6 mr-4 text-indigo-400" />
                                {t('assign_students', 'Assignation des Élèves')}
                            </h2>
                            <p className="text-[10px] text-indigo-300/70 font-black uppercase mt-1 tracking-widest">
                                Élèves ayant souscrit au transport
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <select 
                                className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-white uppercase outline-none"
                                value={filterSection}
                                onChange={e => setFilterSection(e.target.value)}
                            >
                                <option value="ALL">Toutes Sections</option>
                                <option value="FRANCOPHONE">Francophone</option>
                                <option value="ANGLOPHONE">Anglophone</option>
                            </select>
                            <select 
                                className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-white uppercase outline-none"
                                value={filterLevel}
                                onChange={e => { setFilterLevel(e.target.value); setFilterClass('ALL'); }}
                            >
                                <option value="ALL">Tous Cycles</option>
                                <option value="PRIMAIRE">Primaire</option>
                                <option value="MATERNELLE">Maternelle</option>
                            </select>
                            <select 
                                className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-white uppercase outline-none"
                                value={filterClass}
                                onChange={e => setFilterClass(e.target.value)}
                            >
                                <option value="ALL">Toutes Salles</option>
                                {classes
                                    .filter(c => (filterSection === 'ALL' || c.section === filterSection) && (filterLevel === 'ALL' || c.level === filterLevel))
                                    .map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 divide-y divide-white/5 bg-slate-950/40">
                        {filteredEligible.map(s => (
                            <div key={s.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between hover:bg-white/5 transition-all gap-4">
                                <div className="flex items-center space-x-5">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                                        {s.last_name[0]}
                                    </div>
                                    <div>
                                        <p className="text-white font-black uppercase text-sm tracking-tight">{s.last_name} {s.first_name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest italic">{s.neighborhood || t('undefined_neighborhood', 'Quartier non défini')}</span>
                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white font-black uppercase">{s.class_name}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <select 
                                        className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs font-black text-white flex-1 md:flex-none outline-none"
                                        onChange={(e) => handleAssignStudent(s.id, parseInt(e.target.value))}
                                        value=""
                                    >
                                        <option value="" disabled>Assigner à un arrêt...</option>
                                        {points.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                        {filteredEligible.length === 0 && (
                            <div className="py-10 text-center text-slate-500 font-black uppercase text-xs tracking-widest">
                                Aucun élève pour ces filtres
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Liste d'appel des élèves */}
            <div className="glass-card overflow-hidden border-none shadow-2xl">
                <div className="p-8 bg-slate-900/80 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center italic">
                            <Users className="w-6 h-6 mr-4 text-amber-500" />
                            {t('bus_roll_call', 'Liste d\'Appel Bus')}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-black uppercase mt-1 tracking-widest">{t('boarding_identification', 'Identification des passagers à l\'embarquement')}</p>
                    </div>
                    <div className="bg-slate-950 px-5 py-3 rounded-2xl border border-white/5">
                        <span className="text-[10px] font-black text-slate-500 uppercase block tracking-widest mb-1">{t('present', 'Présents')}</span>
                        <span className="text-xl font-black text-amber-500">{Object.values(attendance).filter(v => v).length} <span className="text-xs text-slate-700">/ {students.length}</span></span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y divide-white/5 bg-slate-950/20">
                    {students.map(s => (
                        <div key={s.id} className={`p-8 flex items-center justify-between hover:bg-white/5 transition-all group ${attendance[s.id] ? 'bg-emerald-500/[0.03]' : ''}`}>
                            <div className="flex items-center space-x-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all shadow-inner ${
                                    attendance[s.id] ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-600 border border-white/5'
                                }`}>
                                    {s.last_name[0]}
                                </div>
                                <div>
                                    <p className="text-white font-black uppercase text-base tracking-tight">{s.last_name} {s.first_name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest italic">{s.neighborhood || t('undefined_neighborhood', 'Quartier non défini')}</span>
                                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white font-black uppercase">{s.class_name}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <a href={`tel:${s.parent_contact}`} className="p-3 bg-white/5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-2xl transition-all border border-transparent hover:border-blue-400/20">
                                    <Phone className="w-5 h-5" />
                                </a>
                                <button
                                    onClick={() => togglePresence(s.id)}
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                        attendance[s.id]
                                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                                        : 'bg-slate-900 text-slate-700 border border-slate-800 hover:border-slate-600'
                                    }`}
                                >
                                    <CheckCircle2 className={`w-7 h-7 ${attendance[s.id] ? 'animate-in zoom-in duration-300' : ''}`} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {students.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-600 font-black uppercase text-xs tracking-[0.3em] italic">
                            {t('no_students_assigned_route', 'Aucun élève assigné à cette ligne')}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-8 bg-rose-500/5 border-none shadow-xl">
                    <h3 className="rose-500 font-black text-[10px] uppercase mb-6 flex items-center tracking-widest text-rose-500">
                        <AlertCircle className="w-4 h-4 mr-3" /> {t('security_reminder', 'Rappel Sécurité')}
                    </h3>
                    <ul className="text-xs text-slate-400 space-y-4 font-bold">
                        <li className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-3" /> {t('check_seatbelts', 'Vérifiez les ceintures de sécurité')}</li>
                        <li className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-3" /> {t('count_students_stops', 'Comptez les élèves à chaque arrêt')}</li>
                        <li className="flex items-center"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-3" /> {t('keep_gps_active', 'Maintenez le GPS actif pour les parents')}</li>
                    </ul>
                </div>
                <div className="glass-card p-8 flex flex-col justify-center items-center text-center space-y-4 border-none shadow-xl bg-slate-900/40">
                    <div className="p-5 bg-amber-500/10 rounded-full">
                        <Clock className="w-12 h-12 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-white font-black text-sm uppercase tracking-widest">{t('next_point_estimation', 'Estimation Prochain Point')}</p>
                        <p className="text-slate-500 text-[10px] font-black uppercase mt-2 tracking-widest italic">{t('estimated_time', '± 8 minutes (Trafic Fluide)')}</p>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Add Point Modal */}
      {showAddPoint && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-black text-white italic tracking-tight mb-6">NOUVEAU POINT DE RAMASSAGE</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nom de l'arrêt</label>
                          <input type="text" value={newPoint.name} onChange={e => setNewPoint({...newPoint, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white text-sm" placeholder="ex: Carrefour Mvog-Mbi" />
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setShowAddPoint(false)} className="flex-1 py-3 border border-white/10 rounded-xl text-xs font-black text-white uppercase" disabled={isAdding}>Annuler</button>
                          <button onClick={handleAddPoint} disabled={isAdding} className="flex-1 py-3 bg-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase disabled:opacity-50 flex justify-center items-center">
                              {isAdding ? <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> : 'Ajouter'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default DriverPortal;
