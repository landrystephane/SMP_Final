import React, { useEffect, useState } from 'react';
import { Building2, Plus, Globe, Shield, Trash2, Edit, CheckCircle, Search, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SystemAdmin: React.FC = () => {
  const { user } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: '', address: '', contact_email: '', contact_phone: '' });

  const loadSchools = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getSchools();
      setSchools(data || []);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  const handleAddSchool = async (e: React.FormEvent) => {
      e.preventDefault();
      if (window.electronAPI) {
          await window.electronAPI.addSchool(newSchool);
          setNewSchool({ name: '', address: '', contact_email: '', contact_phone: '' });
          setIsAdding(false);
          loadSchools();
      }
  };

  if (user?.role !== 'SUPERADMIN') return <div className="p-20 text-center text-rose-500 font-black uppercase tracking-widest bg-slate-950 h-screen flex flex-col items-center justify-center">
      <Shield className="w-16 h-16 mb-4 opacity-50" />
      <h2 className="text-2xl">Accès Restreint</h2>
      <p className="text-xs mt-2 opacity-70">Cette section est réservée à l'administration technique du système.</p>
  </div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter italic">ECO-HUB <span className="text-amber-500">ADMIN</span></h1>
          <p className="text-slate-500 mt-2 uppercase text-xs font-black tracking-[0.3em]">Gestion du Parc des Établissements</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center px-8 py-4 text-sm"
        >
          <Plus className="w-5 h-5 mr-3" /> DÉPLOYER UNE INSTANCE
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-8 border-l-4 border-l-amber-500 bg-gradient-to-br from-slate-900 to-slate-950">
              <div className="p-3 bg-amber-500/10 rounded-2xl w-fit mb-6">
                <Globe className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Établissements Actifs</p>
              <p className="text-5xl font-black text-white mt-2 tracking-tighter">{schools.length}</p>
          </div>
          <div className="glass-card p-8 border-l-4 border-l-emerald-500 bg-gradient-to-br from-slate-900 to-slate-950">
              <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit mb-6">
                <Shield className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Serveurs en Ligne</p>
              <div className="flex items-center mt-2">
                <p className="text-5xl font-black text-white tracking-tighter">{schools.length}</p>
                <div className="ml-4 flex flex-col justify-center">
                    <span className="text-[10px] text-emerald-500 font-black uppercase flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-ping" />
                        Live
                    </span>
                </div>
              </div>
          </div>
          <div className="glass-card p-8 border-l-4 border-l-blue-500 bg-gradient-to-br from-slate-900 to-slate-950 col-span-1 md:col-span-2">
              <div className="p-3 bg-blue-500/10 rounded-2xl w-fit mb-6">
                <Plus className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Capacité Système</p>
              <p className="text-xl font-black text-white mt-2 italic">Infrastructure prête pour l'expansion régionale.</p>
              <p className="text-[10px] text-blue-400 font-bold uppercase mt-2 tracking-widest">Multi-tenant isolation active</p>
          </div>
      </div>

      <div className="glass-card border-none shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-white/5 bg-slate-900/80 flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center italic">
                <Building2 className="w-7 h-7 mr-4 text-amber-500" />
                Répertoire des Instances Déployées
              </h2>
              <div className="relative group min-w-[300px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                  <input type="text" placeholder="Filtrer une école..." className="bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-6 py-3 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-inner w-full" />
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead>
                      <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                          <th className="px-8 py-6">Établissement</th>
                          <th className="px-8 py-6">Emplacement</th>
                          <th className="px-8 py-6">Canaux de Support</th>
                          <th className="px-8 py-6">Status Licence</th>
                          <th className="px-8 py-6 text-right">Actions Système</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-900/30">
                      {schools.map(s => (
                          <tr key={s.id} className="hover:bg-white/5 transition-all group">
                              <td className="px-8 py-6">
                                  <div className="flex items-center">
                                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center mr-5 text-lg font-black shadow-lg transform group-hover:rotate-6 transition-transform">
                                          {s.name.charAt(0)}
                                      </div>
                                      <div>
                                          <div className="font-black text-white uppercase text-base tracking-tight">{s.name}</div>
                                          <div className="text-[10px] text-amber-500/70 font-black uppercase tracking-widest mt-1">Tenant Hash: CS-{s.id.toString(16).toUpperCase()}-99</div>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-8 py-6">
                                  <div className="flex items-center text-xs text-slate-400 font-bold uppercase tracking-tight">
                                      <MapPin className="w-3.5 h-3.5 mr-2 text-slate-600" />
                                      {s.address}
                                  </div>
                              </td>
                              <td className="px-8 py-6">
                                  <div className="space-y-1.5">
                                      <div className="text-[10px] text-amber-500 font-black flex items-center">
                                          <Mail className="w-3 h-3 mr-2" /> {s.contact_email}
                                      </div>
                                      <div className="text-[10px] text-white font-black flex items-center">
                                          <Phone className="w-3 h-3 mr-2 text-slate-600" /> {s.contact_phone}
                                      </div>
                                  </div>
                              </td>
                              <td className="px-8 py-6">
                                  <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                                      PERPÉTUELLE
                                  </span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                  <div className="flex justify-end space-x-2">
                                      <button className="p-3 text-slate-500 hover:text-white transition-colors bg-white/5 rounded-2xl border border-white/5 shadow-sm" title="Configurer l'instance"><Edit className="w-4 h-4" /></button>
                                      <button className="p-3 text-slate-500 hover:text-rose-500 transition-colors bg-white/5 rounded-2xl border border-white/5 shadow-sm" title="Suspendre l'école"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {isAdding && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-6 animate-in zoom-in-95 duration-300">
              <div className="glass-card w-full max-w-xl bg-slate-900 border-white/10 shadow-2xl p-0 overflow-hidden">
                  <div className="p-10 border-b border-white/5 bg-slate-900/50">
                      <h2 className="text-3xl font-black text-white tracking-tighter">Déploiement d'Instance</h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">Initialisation des ressources isolées pour un nouvel établissement</p>
                  </div>
                  <form onSubmit={handleAddSchool} className="p-10 space-y-8">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                            <Building2 className="w-3 h-3 mr-2" /> Nom officiel de l'école
                          </label>
                          <input required className="input-field w-full text-lg py-4" value={newSchool.name} onChange={e => setNewSchool({...newSchool, name: e.target.value})} placeholder="Ex: Groupe Scolaire Bilingue..." />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                            <MapPin className="w-3 h-3 mr-2" /> Ville & Quartier
                          </label>
                          <input className="input-field w-full" value={newSchool.address} onChange={e => setNewSchool({...newSchool, address: e.target.value})} placeholder="Ex: Douala, Akwa" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                                <Mail className="w-3 h-3 mr-2" /> Email Admin
                            </label>
                            <input className="input-field w-full" type="email" value={newSchool.contact_email} onChange={e => setNewSchool({...newSchool, contact_email: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                                <Phone className="w-3 h-3 mr-2" /> Téléphone
                            </label>
                            <input className="input-field w-full" value={newSchool.contact_phone} onChange={e => setNewSchool({...newSchool, contact_phone: e.target.value})} />
                        </div>
                      </div>
                      <div className="pt-8 flex flex-col md:flex-row gap-4">
                          <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-5 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all order-2 md:order-1">Annuler</button>
                          <button type="submit" className="btn-primary flex-[2] py-5 order-1 md:order-2 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 mr-3" /> INITIALISER L'INSTANCE
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default SystemAdmin;
