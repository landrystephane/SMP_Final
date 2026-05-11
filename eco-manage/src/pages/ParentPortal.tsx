import React, { useState, useEffect } from 'react';
import { User, Bell, ClipboardList, MapPin, Bus, Activity, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ParentPortal: React.FC = () => {
    const { user } = useAuth();
    const [selectedChild, setSelectedChild] = useState<any>(null);

    const loadData = async () => {
        if (window.electronAPI && user) {
            const studs = await window.electronAPI.getStudents(user.schoolId);
            if (studs.length > 0) setSelectedChild(studs[0]);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    if (!selectedChild) return <div className="p-20 text-center text-slate-500 font-black uppercase tracking-widest animate-pulse">Initialisation du Portail Parent...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-4xl mx-auto">
            <div className="flex justify-between items-center bg-slate-900/50 p-6 rounded-3xl border border-white/5 shadow-2xl">
                <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight">{selectedChild.last_name} {selectedChild.first_name}</h1>
                        <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Espace Parent Sécurisé</p>
                    </div>
                </div>
                <button className="p-4 bg-white/5 rounded-2xl relative text-slate-400">
                    <Bell className="w-6 h-6" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-8 space-y-6 bg-gradient-to-br from-slate-900 to-slate-950">
                    <div className="flex items-center space-x-3 text-amber-500">
                        <Activity className="w-6 h-6" />
                        <h2 className="text-xl font-black uppercase text-white">Performance</h2>
                    </div>
                    <div className="p-6 bg-slate-950 rounded-2xl border border-white/5">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Moyenne Trimestrielle</p>
                        <p className="text-3xl font-black text-emerald-500">14.50 <span className="text-xs text-slate-600">/ 20</span></p>
                        <button className="w-full mt-6 py-4 bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center justify-center shadow-lg">
                            <ClipboardList className="w-4 h-4 mr-2" /> BULLETIN PDF
                        </button>
                    </div>
                </div>

                <div className="glass-card p-8 space-y-6 relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950">
                    <div className="flex items-center space-x-3 text-amber-500">
                        <Bus className="w-6 h-6" />
                        <h2 className="text-xl font-black uppercase text-white">Suivi Bus</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase">Localisation</p>
                                <p className="text-sm font-black text-white">Quartier Bastos</p>
                            </div>
                        </div>
                        <button className="w-full py-4 bg-emerald-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                            CARTE EN DIRECT
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 border-l-4 border-l-amber-500 bg-amber-500/5">
                <div className="flex items-center text-amber-500 mb-2">
                    <Info className="w-4 h-4 mr-2" />
                    <span className="text-[10px] font-black uppercase">Note École</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Réunion parents-enseignants ce Samedi 10H.</p>
            </div>
        </div>
    );
};

export default ParentPortal;
