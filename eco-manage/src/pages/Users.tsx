import React, { useEffect, useState } from 'react';
import { UserPlus, Shield, Trash2, CheckCircle, Lock, Search } from 'lucide-react';
import type { Role } from '../types';
import { useAuth } from '../context/AuthContext';

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'TEACHER' as Role,
    classId: ''
  });

  const loadData = async () => {
    if (window.electronAPI && currentUser) {
      const u = await window.electronAPI.getUsers(currentUser.schoolId);
      const c = await window.electronAPI.getClasses(currentUser.schoolId);
      setUsers(u || []);
      setClasses(c || []);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI && currentUser) {
      await window.electronAPI.addUser({
          ...newUser,
          schoolId: currentUser.schoolId,
          assignedClasses: newUser.classId ? [parseInt(newUser.classId)] : []
      });
      setNewUser({ username: '', password: '', fullName: '', role: 'TEACHER', classId: '' });
      loadData();
    }
  };

  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Gestion du Personnel</h1>
          <p className="text-slate-400 mt-1 uppercase text-xs font-black tracking-widest">Contrôle des accès et affectations pédagogiques</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-black text-amber-500 bg-amber-500/10 px-4 py-2 rounded-full uppercase tracking-widest border border-amber-500/20">
            <Shield className="w-4 h-4" />
            <span>Serveur Sécurisé</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-6">
            <div className="glass-card p-8 shadow-2xl border-white/5">
                <div className="flex items-center space-x-3 text-amber-500 mb-8">
                    <UserPlus className="w-7 h-7" />
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">Recrutement Agent</h2>
                </div>
                <form onSubmit={handleAddUser} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom Complet</label>
                        <input
                            type="text"
                            className="input-field w-full"
                            value={newUser.fullName}
                            onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                            required
                            placeholder="Mballa Joseph"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identifiant</label>
                            <input
                                type="text"
                                className="input-field w-full text-amber-500 font-mono"
                                value={newUser.username}
                                onChange={(e) => setNewUser({...newUser, username: e.target.value.toLowerCase()})}
                                required
                                placeholder="j.mballa"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mot de passe</label>
                            <input
                                type="password"
                                className="input-field w-full"
                                value={newUser.password}
                                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fonction / Rôle</label>
                        <select
                            className="input-field w-full appearance-none cursor-pointer"
                            value={newUser.role}
                            onChange={(e) => setNewUser({...newUser, role: e.target.value as Role})}
                        >
                            <option value="DIRECTOR">Directeur</option>
                            <option value="SECRETARY">Secrétaire Général</option>
                            <option value="BURSAR">Économe</option>
                            <option value="TEACHER">Enseignant</option>
                            <option value="ADVISOR">Conseiller Pédagogique</option>
                            <option value="DRIVER">Chauffeur</option>
                        </select>
                    </div>

                    {newUser.role === 'TEACHER' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Classe Assignée</label>
                            <select
                                className="input-field w-full border-amber-500/20 bg-amber-500/5 appearance-none"
                                value={newUser.classId}
                                onChange={(e) => setNewUser({...newUser, classId: e.target.value})}
                            >
                                <option value="">Aucune affectation...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.section})</option>)}
                            </select>
                        </div>
                    )}

                    <button className="btn-primary w-full py-5 mt-4">
                        <CheckCircle className="w-5 h-5 mr-3" />
                        VALIDER L'INSCRIPTION AGENT
                    </button>
                </form>
            </div>
        </div>

        <div className="xl:col-span-8 glass-card shadow-2xl border-none overflow-hidden flex flex-col">
          <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center bg-slate-900/80 gap-4">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center italic">
                <Shield className="w-7 h-7 mr-4 text-emerald-500" />
                Répertoire du Personnel
            </h2>
            <div className="relative group min-w-[250px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Chercher un agent..."
                    className="bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-6 py-2.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                  <th className="px-8 py-6">Identité de l'Agent</th>
                  <th className="px-8 py-6">Utilisateur</th>
                  <th className="px-8 py-6">Poste / Rôle</th>
                  <th className="px-8 py-6">État Accès</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-slate-900/30">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-amber-500/[0.03] transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-500 flex items-center justify-center mr-5 text-lg font-black border border-white/5 shadow-inner group-hover:bg-amber-500 group-hover:text-slate-950 transition-all duration-300">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                            <div className="font-black text-white uppercase text-base tracking-tight group-hover:text-amber-500 transition-colors">{u.fullName}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Agent ID: #{u.id.toString().padStart(3, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                        <span className="text-[11px] font-mono font-black bg-slate-950 border border-white/5 px-3 py-1.5 rounded-xl text-slate-400 group-hover:text-amber-500 transition-colors shadow-inner">{u.username}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-1.5 bg-white/5 text-slate-300 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest group-hover:border-amber-500/30 group-hover:text-white transition-all">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                        <div className="flex items-center text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-4 py-1.5 rounded-full w-fit border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                            Actif
                        </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="p-3 text-slate-600 hover:text-amber-500 hover:bg-amber-500/10 rounded-2xl border border-transparent hover:border-amber-500/20 transition-all" title="Sécurité">
                            <Lock className="w-4 h-4" />
                        </button>
                        <button className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl border border-transparent hover:border-rose-500/20 transition-all">
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
};

export default Users;
