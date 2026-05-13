import React, { useEffect, useState } from 'react';
import { Building2, Plus, Globe, Shield, Trash2, Edit, CheckCircle, Search, Mail, Phone, MapPin, BookOpen, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SystemAdmin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'SCHOOLS' | 'SUBJECTS'>('SCHOOLS');
  const [schools, setSchools] = useState<any[]>([]);
  const [globalSubjects, setGlobalSubjects] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [schoolSubjects, setSchoolSubjects] = useState<number[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: '', address: '', contact_email: '', contact_phone: '' });
  const [newSubject, setNewSubject] = useState({ name: '', domain: 'Science', level: 'PRIMAIRE', section: 'FRANCOPHONE' });

  const loadSchools = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getSchools();
      setSchools(data || []);
    }
  };

  const loadGlobalSubjects = async () => {
    if (window.electronAPI) {
        const data = await window.electronAPI.getGlobalSubjects();
        setGlobalSubjects(data || []);
    }
  }

  useEffect(() => {
    loadSchools();
    loadGlobalSubjects();
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

  const handleAddSubject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (window.electronAPI) {
          await window.electronAPI.addGlobalSubject(newSubject);
          setNewSubject({ name: '', domain: 'Science', level: 'PRIMAIRE', section: 'FRANCOPHONE' });
          setIsAddingSubject(false);
          loadGlobalSubjects();
      }
  }

  const deleteSubject = async (id: number) => {
      if (window.electronAPI && confirm('Supprimer définitivement cette matière du référentiel ?')) {
          await window.electronAPI.deleteGlobalSubject(id);
          loadGlobalSubjects();
      }
  }

  const openSchoolConfig = async (school: any) => {
      setSelectedSchool(school);
      if (window.electronAPI) {
          const activeSubs = await window.electronAPI.getSchoolSubjects(school.id);
          setSchoolSubjects(activeSubs.filter((s: any) => s.is_active).map((s: any) => s.id));
      }
  }

  const toggleSchoolSubject = async (subjectId: number) => {
      if (!selectedSchool || !window.electronAPI) return;
      const isActive = schoolSubjects.includes(subjectId);
      await window.electronAPI.toggleSchoolSubject({ schoolId: selectedSchool.id, subjectId, isActive: !isActive });

      if (isActive) {
          setSchoolSubjects(schoolSubjects.filter(id => id !== subjectId));
      } else {
          setSchoolSubjects([...schoolSubjects, subjectId]);
      }
  }

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
          <p className="text-slate-500 mt-2 uppercase text-xs font-black tracking-[0.3em]">Infrastructure Centrale du Système</p>
        </div>
        <div className="flex gap-4">
            <button
                onClick={() => setActiveTab('SCHOOLS')}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === 'SCHOOLS' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-white/5 text-slate-500 hover:text-white'}`}
            >
                ÉTABLISSEMENTS
            </button>
            <button
                onClick={() => setActiveTab('SUBJECTS')}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === 'SUBJECTS' ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-white/5 text-slate-500 hover:text-white'}`}
            >
                RÉFÉRENTIEL MATIÈRES
            </button>
        </div>
      </div>

      {activeTab === 'SCHOOLS' ? (
      <>
      <div className="flex justify-end">
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
                                      <button onClick={() => openSchoolConfig(s)} className="p-3 text-slate-500 hover:text-amber-500 transition-colors bg-white/5 rounded-2xl border border-white/5 shadow-sm" title="Gérer les matières autorisées"><BookOpen className="w-4 h-4" /></button>
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
      </>
      ) : (
      <>
      <div className="flex justify-end">
        <button
          onClick={() => setIsAddingSubject(true)}
          className="btn-primary flex items-center px-8 py-4 text-sm"
        >
          <Plus className="w-5 h-5 mr-3" /> NOUVELLE MATIÈRE GLOBALE
        </button>
      </div>

      <div className="glass-card border-none shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-white/5 bg-slate-900/80 flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-2xl font-black text-white tracking-tight flex items-center italic">
                <BookOpen className="w-7 h-7 mr-4 text-amber-500" />
                Référentiel des Matières du Cameroun
              </h2>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead>
                      <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                          <th className="px-8 py-6">Matière</th>
                          <th className="px-8 py-6">Domaine</th>
                          <th className="px-8 py-6">Section</th>
                          <th className="px-8 py-6">Niveau</th>
                          <th className="px-8 py-6 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-900/30">
                      {globalSubjects.map(subj => (
                          <tr key={subj.id} className="hover:bg-white/5 transition-all group">
                              <td className="px-8 py-6 font-black text-white uppercase text-sm tracking-tight">{subj.name}</td>
                              <td className="px-8 py-6">
                                  <span className="px-3 py-1 bg-white/5 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-tight">{subj.domain}</span>
                              </td>
                              <td className="px-8 py-6">
                                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${subj.section === 'FRANCOPHONE' ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                      {subj.section}
                                  </span>
                              </td>
                              <td className="px-8 py-6 text-xs text-slate-500 font-black uppercase tracking-widest">{subj.level}</td>
                              <td className="px-8 py-6 text-right">
                                  <button onClick={() => deleteSubject(subj.id)} className="p-3 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
      </>
      )}

      {selectedSchool && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[150] flex items-center justify-center p-6 animate-in fade-in duration-300">
              <div className="glass-card w-full max-w-4xl bg-slate-900 border-white/10 shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-10 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                      <div>
                          <h2 className="text-3xl font-black text-white tracking-tighter">Configuration : {selectedSchool.name}</h2>
                          <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Activation des matières du référentiel pour cet établissement</p>
                      </div>
                      <button onClick={() => setSelectedSchool(null)} className="p-4 bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="p-10 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                      {globalSubjects.map(subj => {
                          const isActive = schoolSubjects.includes(subj.id);
                          return (
                              <button
                                key={subj.id}
                                onClick={() => toggleSchoolSubject(subj.id)}
                                className={`p-6 rounded-3xl border-2 text-left transition-all flex items-center justify-between group ${isActive ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/5' : 'bg-slate-950/50 border-slate-800 opacity-60 hover:opacity-100'}`}
                              >
                                  <div>
                                      <p className={`font-black uppercase text-sm tracking-tight ${isActive ? 'text-amber-500' : 'text-white'}`}>{subj.name}</p>
                                      <p className="text-[10px] text-slate-500 font-bold mt-1">{subj.section} • {subj.level}</p>
                                  </div>
                                  <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${isActive ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'border-slate-800 group-hover:border-slate-600'}`}>
                                      {isActive && <CheckCircle className="w-5 h-5" />}
                                  </div>
                              </button>
                          );
                      })}
                  </div>
                  <div className="p-8 border-t border-white/5 bg-slate-950/50 flex justify-end">
                      <button onClick={() => setSelectedSchool(null)} className="btn-primary px-12 py-4">TERMINER LA CONFIGURATION</button>
                  </div>
              </div>
          </div>
      )}

      {isAddingSubject && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-6 animate-in zoom-in-95 duration-300">
              <div className="glass-card w-full max-w-xl bg-slate-900 border-white/10 shadow-2xl p-0 overflow-hidden">
                  <div className="p-10 border-b border-white/5 bg-slate-900/50">
                      <h2 className="text-3xl font-black text-white tracking-tighter">Ajouter au Référentiel</h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Définir une nouvelle matière pour l'ensemble du parc</p>
                  </div>
                  <form onSubmit={handleAddSubject} className="p-10 space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Intitulé de la Matière</label>
                          <input required className="input-field w-full" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} placeholder="Ex: Mathématiques, Éveil..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Domaine</label>
                            <select className="input-field w-full" value={newSubject.domain} onChange={e => setNewSubject({...newSubject, domain: e.target.value})}>
                                <option>Science</option>
                                <option>Langue</option>
                                <option>Art & Culture</option>
                                <option>Sport</option>
                                <option>Vie Pratique</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section</label>
                            <select className="input-field w-full" value={newSubject.section} onChange={e => setNewSubject({...newSubject, section: e.target.value})}>
                                <option value="FRANCOPHONE">Francophone</option>
                                <option value="ANGLOPHONE">Anglophone</option>
                            </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Niveau d'Enseignement</label>
                          <select className="input-field w-full" value={newSubject.level} onChange={e => setNewSubject({...newSubject, level: e.target.value})}>
                              <option value="MATERNELLE">Maternelle</option>
                              <option value="PRIMAIRE">Primaire</option>
                          </select>
                      </div>
                      <div className="pt-8 flex gap-4">
                          <button type="button" onClick={() => setIsAddingSubject(false)} className="flex-1 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Annuler</button>
                          <button type="submit" className="btn-primary flex-[2] py-4">ENREGISTRER LA MATIÈRE</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

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
