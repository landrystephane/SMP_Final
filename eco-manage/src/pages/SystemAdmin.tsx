import React, { useEffect, useState } from 'react';
import {
  Building2, Plus, Globe, Shield, Trash2, Edit, CheckCircle, Search,
  Mail, Phone, MapPin, BookOpen, X, Settings, UserPlus, ExternalLink,
  Activity, Server, Database, Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SystemAdmin: React.FC = () => {
  const { user, switchSchool } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'INSTANCES' | 'REGISTRY' | 'HEALTH'>('INSTANCES');
  const [schools, setSchools] = useState<any[]>([]);
  const [globalSubjects, setGlobalSubjects] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<any | null>(null);
  const [schoolSubjects, setSchoolSubjects] = useState<number[]>([]);
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isAddingFounder, setIsAddingFounder] = useState(false);

  // School metadata editing states
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editSchoolMotto, setEditSchoolMotto] = useState('');
  const [editSchoolAddress, setEditSchoolAddress] = useState('');
  const [editSchoolBp, setEditSchoolBp] = useState('');
  const [editSchoolEmail, setEditSchoolEmail] = useState('');
  const [editSchoolPhone, setEditSchoolPhone] = useState('');
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);

  // Founder editing states
  const [editingFounder, setEditingFounder] = useState<any | null>(null);
  const [editFounderUsername, setEditFounderUsername] = useState('');
  const [editFounderFullName, setEditFounderFullName] = useState('');
  const [editFounderPassword, setEditFounderPassword] = useState('');

  const [newSchool, setNewSchool] = useState({ name: '', address: '', contact_email: '', contact_phone: '', bp: '', motto: '' });
  const [newSubject, setNewSubject] = useState({ name: '', domain: 'Science', level: 'PRIMAIRE', section: 'FRANCOPHONE' });
  const [newFounder, setNewFounder] = useState({ username: '', password: '', fullName: '' });

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
          setNewSchool({ name: '', address: '', contact_email: '', contact_phone: '', bp: '', motto: '' });
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

  const handleAddFounder = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedSchool || !window.electronAPI) return;

      try {
          const res = await window.electronAPI.addUser({
              ...newFounder,
              role: 'FOUNDER',
              schoolId: selectedSchool.id
          });
          
          if (res && res.error) {
              alert(`Erreur de création: ${res.error}`);
              return;
          }

          setNewFounder({ username: '', password: '', fullName: '' });
          setIsAddingFounder(false);
          // Reload users for this school
          const users = await window.electronAPI.getUsers(selectedSchool.id);
          setSchoolUsers(users || []);
      } catch (err: any) {
          alert(`Erreur: ${err.message}`);
      }
  }

  const startEditFounder = (founder: any) => {
      setEditingFounder(founder);
      setEditFounderUsername(founder.username || '');
      setEditFounderFullName(founder.fullName || '');
      setEditFounderPassword('');
  };

  const handleUpdateFounder = async () => {
      if (!editingFounder || !selectedSchool || !window.electronAPI) return;
      try {
          const res = await window.electronAPI.updateUser({
              id: editingFounder.id,
              username: editFounderUsername,
              fullName: editFounderFullName,
              password: editFounderPassword || undefined
          });

          if (res && res.error) {
              alert(`Erreur de modification: ${res.error}`);
              return;
          }

          setEditingFounder(null);
          // Reload users for this school
          const users = await window.electronAPI.getUsers(selectedSchool.id);
          setSchoolUsers(users || []);
          alert("Compte fondateur modifié avec succès !");
      } catch (err: any) {
          alert(`Erreur: ${err.message}`);
      }
  };

  const openSchoolDetail = async (school: any) => {
      setSelectedSchool(school);
      setEditSchoolName(school.name || '');
      setEditSchoolMotto(school.motto || '');
      setEditSchoolAddress(school.address || '');
      setEditSchoolBp(school.bp || '');
      setEditSchoolEmail(school.contact_email || '');
      setEditSchoolPhone(school.contact_phone || '');
      setIsEditingMetadata(false);

      if (window.electronAPI) {
          const activeSubs = await window.electronAPI.getSchoolSubjects(school.id);
          setSchoolSubjects(activeSubs.filter((s: any) => s.is_active).map((s: any) => s.id));

          const users = await window.electronAPI.getUsers(school.id);
          setSchoolUsers(users || []);
      }
  }

  const handleSaveMetadata = async () => {
      if (!selectedSchool || !window.electronAPI) return;
      try {
          const res = await window.electronAPI.updateSchoolSettings({
              id: selectedSchool.id,
              name: editSchoolName,
              motto: editSchoolMotto,
              address: editSchoolAddress,
              bp: editSchoolBp,
              contact_email: editSchoolEmail,
              contact_phone: editSchoolPhone,
              primary_color: selectedSchool.primary_color || '#1e293b',
              secondary_color: selectedSchool.secondary_color || '#f59e0b',
              receipt_sig_title: selectedSchool.receipt_sig_title || "Signature de l'Économe",
              bulletin_sig_left: selectedSchool.bulletin_sig_left || "L'ENSEIGNANT (TEACHER)",
              bulletin_sig_middle: selectedSchool.bulletin_sig_middle || "PARENT / GUARDIAN",
              bulletin_sig_right: selectedSchool.bulletin_sig_right || "LE DIRECTEUR (HEADMASTER)",
              header_french: selectedSchool.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE",
              header_english: selectedSchool.header_english || "MINISTRY OF BASIC EDUCATION",
              bulletin_pdf_use_custom: selectedSchool.bulletin_pdf_use_custom || 0,
              bulletin_pdf_template: selectedSchool.bulletin_pdf_template || '',
              bulletin_pdf_mapping: selectedSchool.bulletin_pdf_mapping || '{}'
          });

          if (res && res.error) {
              throw new Error(res.error);
          }

          const updatedSchool = {
              ...selectedSchool,
              name: editSchoolName,
              motto: editSchoolMotto,
              address: editSchoolAddress,
              bp: editSchoolBp,
              contact_email: editSchoolEmail,
              contact_phone: editSchoolPhone
          };
          setSelectedSchool(updatedSchool);
          setIsEditingMetadata(false);
          loadSchools();
          alert("Métadonnées de l'établissement enregistrées avec succès !");
      } catch (err: any) {
          alert("Erreur lors de l'enregistrement des métadonnées: " + err.message);
      }
  };

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

  const handleDeleteSchool = async (id: number) => {
      if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette école ? Cette action est irréversible.")) return;
      if (window.electronAPI) {
          try {
              await window.electronAPI.deleteSchool(id);
              loadSchools();
          } catch (err: any) {
              alert(err.message);
          }
      }
  };

  const handleDeleteSubject = async (id: number) => {
      if (!window.confirm("Supprimer ce module du registre global ?")) return;
      if (window.electronAPI) {
          await window.electronAPI.deleteGlobalSubject(id);
          loadGlobalSubjects();
      }
  };

  const handleDeleteFounder = async (id: number) => {
      if (!window.confirm("Retirer cet accès fondateur ?")) return;
      if (window.electronAPI && selectedSchool) {
          await window.electronAPI.deleteUser(id);
          const users = await window.electronAPI.getUsers(selectedSchool.id);
          setSchoolUsers(users || []);
      }
  };

  if (user?.role !== 'SUPERADMIN') return (
    <div className="p-20 text-center bg-slate-950 h-screen flex flex-col items-center justify-center">
      <div className="p-6 bg-rose-500/10 rounded-full mb-6 border border-rose-500/20">
        <Lock className="w-12 h-12 text-rose-500" />
      </div>
      <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Maintenance Space Restricted</h2>
      <p className="text-slate-500 mt-4 max-w-md font-medium">This workspace is reserved for system administrators and maintenance personnel.</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Maintenance Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-500 uppercase tracking-widest">System Core v2.4.0</div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-6xl font-black text-white tracking-tighter italic">ECO-HUB <span className="text-amber-500">ROOT</span></h1>
          <p className="text-slate-500 mt-2 uppercase text-[10px] font-black tracking-[0.4em]">Infrastructure Management & Fleet Monitoring</p>
        </div>

        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-2xl">
            {[
              { id: 'INSTANCES', label: 'Instances', icon: Server },
              { id: 'REGISTRY', label: 'Global Registry', icon: Database },
              { id: 'HEALTH', label: 'Status', icon: Activity }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${activeTab === tab.id ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
        </div>
      </div>

      {activeTab === 'INSTANCES' && (
        <div className="space-y-8">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border-white/5">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Active Schools</p>
                <p className="text-5xl font-black text-white tracking-tighter">{schools.length}</p>
                <div className="mt-6 flex items-center gap-2 text-emerald-500 text-[10px] font-bold">
                  <CheckCircle className="w-4 h-4" /> All Nodes Stable
                </div>
              </div>
              <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border-white/5">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Global Storage</p>
                <p className="text-5xl font-black text-white tracking-tighter">1.2<span className="text-xl">GB</span></p>
                <div className="mt-6 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full w-[15%]" />
                </div>
              </div>
              <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-950 border-white/5 md:col-span-2">
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-4">Maintenance Summary</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>Database Backups</span>
                    <span className="text-emerald-500">Automated</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>Encryption Protocol</span>
                    <span className="text-amber-500">AES-256 Active</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                    <span>Isolation Engine</span>
                    <span className="text-white">Enabled</span>
                  </div>
                </div>
              </div>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter italic">Instance Directory</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Manage school deployments and administrative keys</p>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="px-8 py-4 bg-white text-slate-950 rounded-2xl text-[10px] font-black tracking-[0.2em] hover:bg-amber-500 transition-all flex items-center shadow-xl"
            >
              <Plus className="w-5 h-5 mr-3" /> DEPLOY NEW INSTANCE
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schools.map(s => (
              <div key={s.id} className="glass-card group hover:border-amber-500/50 transition-all p-0 overflow-hidden bg-slate-900/50">
                <div className="p-8 bg-slate-950/50 border-b border-white/5 flex items-start justify-between">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center text-2xl font-black shadow-lg transform group-hover:scale-105 transition-all">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">{s.name}</h3>
                      <p className="text-[10px] text-slate-500 font-bold tracking-widest mt-1">ID: HUB-SC-{s.id.toString().padStart(3, '0')}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Activity className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <div className="p-8 space-y-4">
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                    <MapPin className="w-4 h-4 text-slate-600" /> {s.address}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                    <Mail className="w-4 h-4 text-slate-600" /> {s.contact_email}
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button
                      onClick={() => openSchoolDetail(s)}
                      className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white hover:border-amber-500/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5" /> Config
                    </button>
                    <button
                      onClick={async () => {
                          await switchSchool(s.id);
                          navigate('/');
                      }}
                      className="flex-1 py-3 bg-amber-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-950 hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Access
                    </button>
                    <button onClick={() => handleDeleteSchool(s.id)} className="p-3 bg-white/5 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'REGISTRY' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
           <div className="flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter italic">Global Subject Registry</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Master list of Cameroon educational modules</p>
            </div>
            <button
              onClick={() => setIsAddingSubject(true)}
              className="px-8 py-4 bg-amber-500 text-slate-950 rounded-2xl text-[10px] font-black tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
            >
              <Plus className="w-5 h-5 mr-3" /> ADD TO REGISTRY
            </button>
          </div>

          <div className="glass-card p-0 overflow-hidden border-none shadow-2xl">
              <table className="w-full text-left">
                  <thead>
                      <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                          <th className="px-10 py-6">Reference</th>
                          <th className="px-10 py-6">Module Name</th>
                          <th className="px-10 py-6">Domain</th>
                          <th className="px-10 py-6">Target Level</th>
                          <th className="px-10 py-6">Section</th>
                          <th className="px-10 py-6 text-right">Ops</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-900/30">
                      {globalSubjects.map(subj => (
                          <tr key={subj.id} className="hover:bg-white/5 transition-all group">
                              <td className="px-10 py-6">
                                <span className="font-mono text-xs text-amber-500/50">SUB-{subj.id.toString().padStart(4, '0')}</span>
                              </td>
                              <td className="px-10 py-6 font-black text-white uppercase text-sm tracking-tight">{subj.name}</td>
                              <td className="px-10 py-6">
                                  <span className="px-3 py-1 bg-white/5 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-tight">{subj.domain}</span>
                              </td>
                              <td className="px-10 py-6 text-xs text-slate-400 font-bold uppercase tracking-widest">{subj.level}</td>
                              <td className="px-10 py-6">
                                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${subj.section === 'FRANCOPHONE' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                      {subj.section}
                                  </span>
                              </td>
                              <td className="px-10 py-6 text-right">
                                  <button onClick={() => handleDeleteSubject(subj.id)} className="p-3 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        </div>
      )}

      {/* Detail School Modal (Full View) */}
      {selectedSchool && (
          <div className="fixed inset-0 bg-slate-950 z-[150] overflow-y-auto animate-in fade-in duration-300">
              <div className="min-h-screen p-10 flex flex-col">
                  <div className="flex justify-between items-start mb-16">
                      <div className="flex items-center gap-8">
                        <div className="w-24 h-24 rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center text-4xl font-black shadow-2xl">
                          {selectedSchool.name.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-6xl font-black text-white tracking-tighter uppercase italic">{selectedSchool.name}</h2>
                          <div className="flex gap-4 mt-3">
                            <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-3 h-3 text-emerald-500" /> Instance Live
                            </span>
                            <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Cameroon Cluster
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedSchool(null)}
                        className="p-5 bg-white/5 hover:bg-white/10 rounded-3xl text-slate-500 hover:text-white transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest border border-white/5"
                      >
                        <X className="w-6 h-6" /> Close Instance View
                      </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 flex-1">
                      {/* Left: General Info & Admin Users */}
                      <div className="space-y-8">
                        <section className="glass-card p-10 bg-slate-900 border-white/10">
                          <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white italic tracking-tight uppercase flex items-center gap-3">
                              <Building2 className="w-6 h-6 text-amber-500" /> Metadata
                            </h3>
                            {isEditingMetadata ? (
                              <div className="flex gap-2">
                                <button onClick={() => setIsEditingMetadata(false)} className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">
                                  Annuler
                                </button>
                                <button onClick={handleSaveMetadata} className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">
                                  Enregistrer
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setIsEditingMetadata(true)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {isEditingMetadata ? (
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nom de l'école</label>
                                <input
                                  type="text"
                                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  value={editSchoolName}
                                  onChange={(e) => setEditSchoolName(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Devise</label>
                                <input
                                  type="text"
                                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  value={editSchoolMotto}
                                  onChange={(e) => setEditSchoolMotto(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Siège (Adresse)</label>
                                <input
                                  type="text"
                                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  value={editSchoolAddress}
                                  onChange={(e) => setEditSchoolAddress(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Email de contact</label>
                                <input
                                  type="email"
                                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  value={editSchoolEmail}
                                  onChange={(e) => setEditSchoolEmail(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Téléphone</label>
                                <input
                                  type="text"
                                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  value={editSchoolPhone}
                                  onChange={(e) => setEditSchoolPhone(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Boîte Postale (B.P.)</label>
                                <input
                                  type="text"
                                  className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                  value={editSchoolBp}
                                  onChange={(e) => setEditSchoolBp(e.target.value)}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Motto / Devise</p>
                                <div className="flex items-center gap-3 text-white font-black text-sm italic">
                                  {selectedSchool.motto || 'N/A'}
                                </div>
                              </div>
                              {[
                                { icon: MapPin, label: 'Headquarters', value: selectedSchool.address },
                                { icon: Globe, label: 'Contact Email', value: selectedSchool.contact_email },
                                { icon: Phone, label: 'System Phone', value: selectedSchool.contact_phone },
                                { icon: Mail, label: 'BP / Mailbox', value: selectedSchool.bp || 'N/A' },
                              ].map((item, i) => (
                                <div key={i}>
                                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">{item.label}</p>
                                  <div className="flex items-center gap-3 text-white font-black text-sm">
                                    <item.icon className="w-4 h-4 text-amber-500/50" />
                                    {item.value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>

                        <section className="glass-card p-10 bg-slate-900 border-white/10">
                          <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white italic tracking-tight uppercase flex items-center gap-3">
                              <Shield className="w-6 h-6 text-amber-500" /> Founders & Keys
                            </h3>
                            <button
                              onClick={() => setIsAddingFounder(true)}
                              className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-slate-950 rounded-xl transition-all"
                            >
                              <UserPlus className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="space-y-4">
                            {schoolUsers.filter(u => u.role === 'FOUNDER').map(u => (
                              <div key={u.id} className="p-5 bg-slate-950 rounded-2xl border border-white/5">
                                {editingFounder?.id === u.id ? (
                                  <form onSubmit={(e) => { e.preventDefault(); handleUpdateFounder(); }} className="space-y-4">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nom complet</label>
                                      <input
                                        type="text"
                                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                        value={editFounderFullName}
                                        onChange={(e) => setEditFounderFullName(e.target.value)}
                                        required
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nom d'utilisateur</label>
                                      <input
                                        type="text"
                                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                        value={editFounderUsername}
                                        onChange={(e) => setEditFounderUsername(e.target.value)}
                                        required
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Nouveau mot de passe (laisser vide si inchangé)</label>
                                      <input
                                        type="password"
                                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-amber-500"
                                        value={editFounderPassword}
                                        onChange={(e) => setEditFounderPassword(e.target.value)}
                                        placeholder="••••••••"
                                      />
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                      <button type="button" onClick={() => setEditingFounder(null)} className="px-3 py-1.5 bg-white/5 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">
                                        Annuler
                                      </button>
                                      <button type="submit" className="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all">
                                        Enregistrer
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <div className="flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-slate-400 group-hover:text-amber-500 transition-colors">
                                        F
                                      </div>
                                      <div>
                                        <p className="text-sm font-black text-white uppercase">{u.fullName}</p>
                                        <p className="text-[10px] text-slate-500 font-bold">@{u.username}</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => startEditFounder(u)} className="p-2 text-slate-500 hover:text-white"><Edit className="w-3.5 h-3.5" /></button>
                                      <button onClick={() => handleDeleteFounder(u.id)} className="p-2 text-slate-500 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                            {schoolUsers.filter(u => u.role === 'FOUNDER').length === 0 && (
                              <div className="text-center py-6 text-slate-600 border-2 border-dashed border-white/5 rounded-3xl">
                                No Founder account deployed yet
                              </div>
                            )}
                          </div>
                        </section>
                      </div>

                      {/* Right: Subject Permissions (authorized for this school) */}
                      <div className="lg:col-span-2 space-y-8">
                        <section className="glass-card p-10 bg-slate-900 border-white/10">
                          <div className="flex justify-between items-center mb-10">
                            <div>
                              <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-4">
                                <BookOpen className="w-8 h-8 text-amber-500" /> Authorized Registry
                              </h3>
                              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Subjects enabled for this instance from the global catalog</p>
                            </div>
                            <div className="px-6 py-3 bg-white/5 rounded-2xl border border-white/5 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                              {schoolSubjects.length} Modules Active
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {globalSubjects.map(subj => {
                                const isActive = schoolSubjects.includes(subj.id);
                                return (
                                    <button
                                      key={subj.id}
                                      onClick={() => toggleSchoolSubject(subj.id)}
                                      className={`p-8 rounded-3xl border-2 text-left transition-all flex items-center justify-between group ${isActive ? 'bg-amber-500/5 border-amber-500 shadow-xl shadow-amber-500/5' : 'bg-slate-950/50 border-slate-800 opacity-40 hover:opacity-100 hover:border-slate-600'}`}
                                    >
                                        <div>
                                            <p className={`font-black uppercase text-base tracking-tight ${isActive ? 'text-amber-500' : 'text-slate-300'}`}>{subj.name}</p>
                                            <p className="text-[10px] text-slate-500 font-bold mt-1 tracking-widest">{subj.section} • {subj.level}</p>
                                        </div>
                                        <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${isActive ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg' : 'border-slate-800 group-hover:border-slate-600'}`}>
                                            {isActive ? <CheckCircle className="w-6 h-6" /> : <Plus className="w-5 h-5 text-slate-600" />}
                                        </div>
                                    </button>
                                );
                            })}
                          </div>
                        </section>

                        <div className="flex justify-end pt-10">
                          <button
                            onClick={() => setSelectedSchool(null)}
                            className="px-16 py-6 bg-white text-slate-950 rounded-[2rem] font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:bg-amber-500 hover:scale-105 transition-all"
                          >
                            Finalize Configuration
                          </button>
                        </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Add School Modal */}
      {isAdding && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-6 animate-in zoom-in-95 duration-300">
              <div className="glass-card w-full max-w-2xl bg-slate-900 border-white/10 shadow-2xl p-0 overflow-hidden">
                  <div className="p-10 border-b border-white/5 bg-slate-900/50">
                      <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Deploy New Node</h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Provisioning fresh isolated resources for the fleet</p>
                  </div>
                  <form onSubmit={handleAddSchool} className="p-10 space-y-8">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">School Full Name</label>
                          <input required className="input-field w-full text-xl py-5" value={newSchool.name} onChange={e => setNewSchool({...newSchool, name: e.target.value})} placeholder="Groupe Scolaire Bilingue..." />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">City / Location</label>
                            <input required className="input-field w-full" value={newSchool.address} onChange={e => setNewSchool({...newSchool, address: e.target.value})} placeholder="Douala, Bonamoussadi" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">P.O Box (BP)</label>
                            <input className="input-field w-full" value={newSchool.bp} onChange={e => setNewSchool({...newSchool, bp: e.target.value})} placeholder="BP 450..." />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Support Email</label>
                            <input type="email" className="input-field w-full" value={newSchool.contact_email} onChange={e => setNewSchool({...newSchool, contact_email: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Support Phone</label>
                            <input className="input-field w-full" value={newSchool.contact_phone} onChange={e => setNewSchool({...newSchool, contact_phone: e.target.value})} />
                        </div>
                      </div>
                      <div className="pt-8 flex gap-4">
                          <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-5 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                          <button type="submit" className="btn-primary flex-[2] py-5 flex items-center justify-center gap-3">
                              <ExternalLink className="w-5 h-5" /> INITIALIZE INSTANCE
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Add Founder Modal */}
      {isAddingFounder && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-6 animate-in zoom-in-95 duration-300">
              <div className="glass-card w-full max-w-md bg-slate-900 border-white/10 shadow-2xl p-0 overflow-hidden">
                  <div className="p-10 border-b border-white/5 bg-slate-900/50">
                      <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Create Founder</h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">Primary owner for {selectedSchool?.name}</p>
                  </div>
                  <form onSubmit={handleAddFounder} className="p-10 space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name</label>
                          <input required className="input-field w-full" value={newFounder.fullName} onChange={e => setNewFounder({...newFounder, fullName: e.target.value})} placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Login Username</label>
                          <input required className="input-field w-full" value={newFounder.username} onChange={e => setNewFounder({...newFounder, username: e.target.value})} placeholder="admin_name" />
                      </div>
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Access Password</label>
                          <input required type="password" className="input-field w-full font-mono" value={newFounder.password} onChange={e => setNewFounder({...newFounder, password: e.target.value})} />
                      </div>
                      <div className="pt-8 flex gap-4">
                          <button type="button" onClick={() => setIsAddingFounder(false)} className="flex-1 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Cancel</button>
                          <button type="submit" className="btn-primary flex-[2] py-4">DEPLOY FOUNDER</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Add Subject Modal */}
      {isAddingSubject && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-6 animate-in zoom-in-95 duration-300">
              <div className="glass-card w-full max-w-xl bg-slate-900 border-white/10 shadow-2xl p-0 overflow-hidden">
                  <div className="p-10 border-b border-white/5 bg-slate-900/50">
                      <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic text-amber-500">Registry Entry</h2>
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Add new educational module to the central repository</p>
                  </div>
                  <form onSubmit={handleAddSubject} className="p-10 space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Module Title</label>
                          <input required className="input-field w-full" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} placeholder="Ex: Mathématiques, Éveil..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Domain</label>
                            <select className="input-field w-full" value={newSubject.domain} onChange={e => setNewSubject({...newSubject, domain: e.target.value})}>
                                <option value="Science">Science</option>
                                <option value="Langue">Langue</option>
                                <option value="Art & Culture">Art & Culture</option>
                                <option value="Sport">Sport</option>
                                <option value="Vie Pratique">Vie Pratique</option>
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
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Cycle</label>
                          <select className="input-field w-full" value={newSubject.level} onChange={e => setNewSubject({...newSubject, level: e.target.value})}>
                              <option value="MATERNELLE">Maternelle</option>
                              <option value="PRIMAIRE">Primaire</option>
                          </select>
                      </div>
                      <div className="pt-8 flex gap-4">
                          <button type="button" onClick={() => setIsAddingSubject(false)} className="flex-1 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Discard</button>
                          <button type="submit" className="btn-primary flex-[2] py-4">REGISTER MODULE</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default SystemAdmin;
