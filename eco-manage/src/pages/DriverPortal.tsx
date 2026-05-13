import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Users, Phone, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DriverPortal: React.FC = () => {
  const { user } = useAuth();
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isDriving, setIsDriving] = useState(false);
  const [attendance, setAttendance] = useState<Record<number, boolean>>({});

  const points = [
    { id: 1, name: 'Campus Eco-Manage', lat: 3.848, lng: 11.502, time: '00:00' },
    { id: 2, name: 'Carrefour Bastos', lat: 3.868, lng: 11.512, time: '15:00' },
    { id: 3, name: 'Rond-point Nlongkak', lat: 3.878, lng: 11.522, time: '25:00' },
    { id: 4, name: 'Carrefour Warda', lat: 3.858, lng: 11.532, time: '40:00' }
  ];

  const loadRouteData = async () => {
    if (window.electronAPI) {
      const routes = await window.electronAPI.getBusRoutes();
      const myRoute = routes.find((r: any) => r.driver_id === user?.id) || routes[0];
      setActiveRoute(myRoute);
      if (myRoute) {
        const routeStudents = await window.electronAPI.getRouteStudents(myRoute.id);
        setStudents(routeStudents);
      }
    }
  };

  useEffect(() => {
    loadRouteData();
  }, []);

  const startTour = () => {
    setIsDriving(true);
    setCurrentPointIndex(0);
    if (window.electronAPI && activeRoute) {
      window.electronAPI.logTransport({
        route_id: activeRoute.id,
        event_type: 'DEPARTURE',
        latitude: points[0].lat,
        longitude: points[0].lng
      });
    }
  };

  const nextPoint = () => {
    if (currentPointIndex < points.length - 1) {
      const nextIdx = currentPointIndex + 1;
      setCurrentPointIndex(nextIdx);
      if (window.electronAPI && activeRoute) {
        window.electronAPI.logTransport({
          route_id: activeRoute.id,
          event_type: 'GPS_UPDATE',
          latitude: points[nextIdx].lat,
          longitude: points[nextIdx].lng
        });
      }
    } else {
      setIsDriving(false);
      alert('Tournée terminée !');
    }
  };

  const togglePresence = (studentId: number) => {
    setAttendance(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Portail Chauffeur</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            {activeRoute?.name || 'Aucune ligne assignée'} • {activeRoute?.bus_number}
          </p>
        </div>
        {!isDriving ? (
            <button
                onClick={startTour}
                className="px-8 py-3 bg-emerald-500 text-slate-950 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
            >
                Démarrer la Tournée
            </button>
        ) : (
            <span className="flex items-center px-4 py-2 bg-amber-500 text-slate-950 rounded-2xl text-xs font-black uppercase border border-amber-400">
                <Navigation className="w-4 h-4 mr-2 animate-pulse" />
                Tournée en cours
            </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation & Points */}
        <div className="glass-card p-6 space-y-6">
            <h2 className="text-lg font-black text-white uppercase tracking-widest border-b border-white/5 pb-4">Itinéraire</h2>
            <div className="relative space-y-8 pl-8">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-800" />
                {points.map((p, idx) => (
                    <div key={p.id} className="relative">
                        <div className={`absolute -left-[26px] top-1 w-4 h-4 rounded-full border-4 ${
                            idx < currentPointIndex ? 'bg-emerald-500 border-emerald-500/20' :
                            idx === currentPointIndex ? 'bg-amber-500 border-amber-500/20 animate-pulse' :
                            'bg-slate-900 border-slate-800'
                        }`} />
                        <div className="flex justify-between items-start">
                            <div>
                                <p className={`font-black uppercase text-sm ${idx === currentPointIndex ? 'text-amber-500' : 'text-slate-400'}`}>{p.name}</p>
                                <p className="text-[10px] text-slate-600 font-bold">Heure prévue : {p.time}</p>
                            </div>
                            {idx === currentPointIndex && isDriving && (
                                <button
                                    onClick={nextPoint}
                                    className="p-2 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20 hover:bg-amber-500 hover:text-slate-950 transition-all"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isDriving && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center space-x-3">
                    <Bell className="text-blue-400 w-6 h-6 animate-bounce" />
                    <div>
                        <p className="text-blue-400 font-black text-[10px] uppercase">Notification Parents</p>
                        <p className="text-white text-xs font-bold">Alerte envoyée : Prochain arrêt Bastos</p>
                    </div>
                </div>
            )}
        </div>

        {/* Liste d'appel des élèves */}
        <div className="lg:col-span-2 space-y-6">
            <div className="glass-card overflow-hidden">
                <div className="p-6 bg-slate-900/50 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center">
                        <Users className="w-5 h-5 mr-3 text-amber-500" />
                        Liste d'Appel Bus ({students.length})
                    </h2>
                    <div className="text-[10px] font-black text-slate-500 uppercase">
                        Présents : {Object.values(attendance).filter(v => v).length} / {students.length}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-y divide-white/5 bg-slate-950/20">
                    {students.map(s => (
                        <div key={s.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all">
                            <div className="flex items-center space-x-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                                    attendance[s.id] ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'
                                }`}>
                                    {s.last_name[0]}
                                </div>
                                <div>
                                    <p className="text-white font-black uppercase text-sm">{s.last_name} {s.first_name}</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">{s.neighborhood || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <a href={`tel:${s.parent_contact}`} className="p-2 text-slate-500 hover:text-blue-400 transition-colors">
                                    <Phone className="w-5 h-5" />
                                </a>
                                <button
                                    onClick={() => togglePresence(s.id)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                        attendance[s.id] ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'bg-slate-800 text-slate-600 border border-slate-700'
                                    }`}
                                >
                                    <CheckCircle2 className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {students.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-600 italic">
                            Aucun élève assigné à cette ligne
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 bg-rose-500/5 border-rose-500/10">
                    <h3 className="text-rose-500 font-black text-[10px] uppercase mb-4 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" /> Rappel Sécurité
                    </h3>
                    <ul className="text-xs text-slate-400 space-y-2 font-bold">
                        <li>• Vérifiez les ceintures de sécurité</li>
                        <li>• Comptez les élèves à chaque arrêt</li>
                        <li>• Maintenez le GPS actif pour les parents</li>
                    </ul>
                </div>
                <div className="glass-card p-6 flex flex-col justify-center items-center text-center space-y-3">
                    <Clock className="w-10 h-10 text-amber-500/20" />
                    <div>
                        <p className="text-white font-black text-sm uppercase">Temps Estimé</p>
                        <p className="text-slate-500 text-[10px] font-bold">Prochain arrêt : 8 mins</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DriverPortal;
