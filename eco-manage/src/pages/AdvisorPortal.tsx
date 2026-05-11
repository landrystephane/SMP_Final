import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, MapPin, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdvisorPortal: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'PLANNING' | 'TRANSPORT' | 'EVALUATIONS'>('PLANNING');
    const [classes, setClasses] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);

    const [selectedRoute, setSelectedRoute] = useState<string>('');

    const loadData = async () => {
        if (window.electronAPI && user) {
            const [c, r, studs] = await Promise.all([
                window.electronAPI.getClasses(user.schoolId),
                window.electronAPI.getBusRoutes(user.schoolId),
                window.electronAPI.getStudents(user.schoolId)
            ]);
            setClasses(c);
            setRoutes(r);
            setStudents(studs);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Conseiller Pédagogique</h1>
                    <p className="text-slate-500 mt-1 uppercase text-xs font-black tracking-widest italic">Pilotage de la qualité et logistique scolaire</p>
                </div>
                <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
                    <button onClick={() => setActiveTab('PLANNING')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'PLANNING' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Plannings</button>
                    <button onClick={() => setActiveTab('EVALUATIONS')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'EVALUATIONS' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Évaluations</button>
                    <button onClick={() => setActiveTab('TRANSPORT')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${activeTab === 'TRANSPORT' ? 'bg-amber-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Transport</button>
                </div>
            </div>

            {activeTab === 'PLANNING' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-6">
                        <div className="glass-card p-6">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-black text-white flex items-center">
                                    <Calendar className="w-6 h-6 mr-3 text-amber-500" />
                                    Emploi du Temps Hebdomadaire
                                </h2>
                                <button className="btn-primary text-[10px]">PROGRAMMER COURS</button>
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                                <div className="p-2 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">Heure</div>
                                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].map(d => (
                                    <div key={d} className="p-2 text-[10px] font-black text-slate-500 uppercase text-center border-b border-white/5">{d}</div>
                                ))}
                                <div className="p-4 bg-slate-950/50 rounded-xl text-[10px] font-bold text-slate-600 text-center">08:00 - 10:00</div>
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <div className="text-[10px] font-black text-amber-500 uppercase">Maths</div>
                                    <div className="text-[9px] text-white/50 mt-1 uppercase font-bold">Mballa J.</div>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl"></div>
                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <div className="text-[10px] font-black text-blue-400 uppercase">Français</div>
                                    <div className="text-[9px] text-white/50 mt-1 uppercase font-bold">Ngo J.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'TRANSPORT' && (
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    <div className="space-y-6">
                        <div className="glass-card p-6">
                            <h2 className="text-xl font-black text-white mb-6 flex items-center tracking-tight">
                                <Truck className="w-6 h-6 mr-3 text-amber-500" />
                                Affectation Bus
                            </h2>
                            <div className="space-y-4">
                                {routes.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedRoute(r.id.toString())}
                                        className={`w-full p-4 rounded-2xl border transition-all text-left group ${selectedRoute === r.id.toString() ? 'bg-amber-500 border-amber-400 text-slate-950' : 'bg-white/5 border-white/5 text-slate-400 hover:border-amber-500/50'}`}
                                    >
                                        <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Route ID #{r.id}</div>
                                        <div className="font-black text-sm uppercase tracking-tight">{r.name}</div>
                                        <div className={`text-[9px] mt-2 font-bold uppercase flex items-center ${selectedRoute === r.id.toString() ? 'text-slate-900' : 'text-slate-600'}`}>
                                            <MapPin className="w-3 h-3 mr-1" /> Quartier Central
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="xl:col-span-3 space-y-6">
                        {selectedRoute ? (
                            <div className="glass-card border-none shadow-2xl overflow-hidden">
                                <div className="p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight italic">Passagers : {routes.find(r => r.id.toString() === selectedRoute)?.name}</h2>
                                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Affectation des élèves au transport</p>
                                    </div>
                                    <button className="btn-primary text-[10px]">AJOUTER PASSAGER</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                                                <th className="px-8 py-6">Élève</th>
                                                <th className="px-8 py-6">Classe</th>
                                                <th className="px-8 py-6 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 bg-slate-900/30">
                                            {students.filter(s => s.bus_route_id?.toString() === selectedRoute).map(s => (
                                                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="font-black text-white uppercase text-sm tracking-tight">{s.last_name} {s.first_name}</div>
                                                        <div className="text-[10px] text-amber-500 font-bold tracking-tighter">Mat: {s.matricule}</div>
                                                    </td>
                                                    <td className="px-8 py-6 text-xs text-slate-400 font-black uppercase">{classes.find(c => c.id === s.class_id)?.name}</td>
                                                    <td className="px-8 py-6 text-right">
                                                        <button className="p-2.5 text-slate-500 hover:text-rose-500 transition-colors bg-white/5 rounded-xl border border-white/10"><Trash2 className="w-4 h-4" /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card p-20 flex flex-col items-center justify-center text-center opacity-30 border-2 border-dashed border-white/5">
                                <Truck className="w-20 h-20 mb-6" />
                                <p className="text-xl font-black uppercase tracking-widest">Sélectionnez une route pour gérer les passagers</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvisorPortal;
