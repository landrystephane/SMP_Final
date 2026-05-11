import React, { useState, useEffect } from 'react';
import { Bus, CheckCircle2, Navigation, AlertTriangle, MapPin, Play } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DriverPortal: React.FC = () => {
    const { user } = useAuth();
    const [routes, setRoutes] = useState<any[]>([]);
    const [selectedRoute, setSelectedRoute] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [isTripActive, setIsTripActive] = useState(false);
    const [departureTime, setDepartureTime] = useState<string | null>(null);
    const [attendance, setAttendance] = useState<Record<number, boolean>>({});

    const loadData = async () => {
        if (window.electronAPI && user) {
            const r = await window.electronAPI.getBusRoutes(user.schoolId);
            setRoutes(r);
        }
    };

    const loadStudents = async (routeId: number) => {
        if (window.electronAPI) {
            const s = await window.electronAPI.getRouteStudents(routeId);
            setStudents(s);
            const initial: Record<number, boolean> = {};
            s.forEach((stud: any) => initial[stud.id] = false);
            setAttendance(initial);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const handleStartTrip = async () => {
        if (window.electronAPI && selectedRoute) {
            setIsTripActive(true);
            const now = new Date();
            setDepartureTime(now.toLocaleTimeString());
            await window.electronAPI.logTransport({
                route_id: selectedRoute.id,
                event_type: 'DEPARTURE',
                latitude: 3.848,
                longitude: 11.502
            });
        }
    };

    const toggleStudent = (id: number) => {
        setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Portail Chauffeur</h1>
                    <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest italic">Suivi des trajets et sécurité des passagers</p>
                </div>
                {isTripActive && (
                    <div className="flex items-center bg-emerald-500 text-slate-950 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl animate-pulse">
                        <Navigation className="w-4 h-4 mr-2" /> Trajet en cours • Départ: {departureTime}
                    </div>
                )}
            </div>

            {!selectedRoute ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {routes.map(r => (
                        <div key={r.id} className="glass-card p-8 hover:border-amber-500/50 transition-all cursor-pointer group" onClick={() => { setSelectedRoute(r); loadStudents(r.id); }}>
                            <div className="p-4 bg-amber-500/10 rounded-2xl w-fit mb-6 group-hover:bg-amber-500 transition-colors">
                                <Bus className="w-8 h-8 text-amber-500 group-hover:text-slate-950" />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase">{r.name}</h2>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Véhicule: {r.bus_number || 'B-992-CM'}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-8 space-y-6">
                        <div className="glass-card shadow-2xl border-none overflow-hidden">
                            <div className="p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">{selectedRoute.name}</h2>
                                <button className="p-2 text-slate-500 hover:text-white" onClick={() => setSelectedRoute(null)}>Changer Route</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                            <th className="px-8 py-6">Élève</th>
                                            <th className="px-8 py-6">Position</th>
                                            <th className="px-8 py-6 text-center">Présence à bord</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 bg-slate-900/30">
                                        {students.map(s => (
                                            <tr key={s.id}>
                                                <td className="px-8 py-6 text-white font-black uppercase text-sm">{s.last_name} {s.first_name}</td>
                                                <td className="px-8 py-6 text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center">
                                                    <MapPin className="w-3 h-3 mr-2 text-amber-500" /> {s.neighborhood || 'Arrêt'}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => toggleStudent(s.id)}
                                                            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${attendance[s.id] ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'border-white/5 text-slate-800'}`}
                                                        >
                                                            <CheckCircle2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="xl:col-span-4 space-y-6">
                        <div className="glass-card p-8 border-none bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl">
                            <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tight">Contrôle de Route</h3>
                            <div className="space-y-6">
                                <button
                                    onClick={handleStartTrip}
                                    disabled={isTripActive}
                                    className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all ${!isTripActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-600'}`}
                                >
                                    <Play className="w-5 h-5 mr-3" /> DÉMARRER ROTATION
                                </button>
                                {isTripActive && (
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-center font-black uppercase text-[10px]">
                                        Signal GPS Actif
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="glass-card p-6 border-l-4 border-l-amber-500 bg-amber-500/5">
                            <div className="flex items-center text-amber-500 mb-2">
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                <span className="text-[10px] font-black uppercase">Sécurité</span>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Signaler tout incident via le terminal.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverPortal;
