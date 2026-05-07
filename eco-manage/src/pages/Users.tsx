import React, { useEffect, useState } from 'react';
import { UserPlus, Shield, Trash2, CheckCircle, Info, Lock } from 'lucide-react';
import type { Role } from '../types';

const Users: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'TEACHER' as Role,
    classId: ''
  });

  const loadData = async () => {
    if (window.electronAPI) {
      const u = await window.electronAPI.getUsers();
      const c = await window.electronAPI.getClasses();
      setUsers(u);
      setClasses(c);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
      await window.electronAPI.addUser(newUser);
      setNewUser({ username: '', password: '', fullName: '', role: 'TEACHER', classId: '' });
      loadData();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Gestion du Personnel</h1>
          <p className="text-slate-500 mt-1">Contrôlez les accès et affectez les enseignants aux classes</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full uppercase tracking-widest">
            <Shield className="w-3 h-3" />
            <span>Sécurisé par Eco-Manage</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Formulaire d'ajout */}
        <div className="xl:col-span-4 space-y-6">
            <div className="glass-card p-6 shadow-xl border-none">
                <div className="flex items-center space-x-3 text-blue-600 mb-6">
                    <UserPlus className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Ajouter un Membre</h2>
                </div>
                <form onSubmit={handleAddUser} className="space-y-4">
                    <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom Complet (Identité Officielle)</label>
                    <input
                        type="text"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-blue-600 font-bold"
                        value={newUser.fullName}
                        onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                        required
                        placeholder="Ex: Mballa Joseph"
                    />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom d'utilisateur</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-blue-600"
                                value={newUser.username}
                                onChange={(e) => setNewUser({...newUser, username: e.target.value.toLowerCase()})}
                                required
                                placeholder="ex: j.mballa"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mot de passe</label>
                            <input
                                type="password"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-blue-600"
                                value={newUser.password}
                                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rôle & Permissions</label>
                    <select
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-blue-600 font-bold"
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value as Role})}
                    >
                        <option value="DIRECTOR">Directeur (Full Access Pédagogie)</option>
                        <option value="SECRETARY">Secrétaire Général (Archives & Intérim)</option>
                        <option value="ADMIN">Administrateur (Gestion Globale)</option>
                        <option value="BURSAR">Économe (Gestion Financière)</option>
                        <option value="TEACHER">Enseignant (Saisie Notes & Présences)</option>
                        <option value="ADVISOR">Conseiller Pédagogique</option>
                        <option value="DRIVER">Chauffeur (Suivi Bus)</option>
                    </select>
                    </div>

                    {newUser.role === 'TEACHER' && (
                        <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Classe Titulaire (Optionnel)</label>
                            <select
                                className="w-full bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-100 dark:border-blue-800 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-blue-600 font-bold"
                                value={newUser.classId}
                                onChange={(e) => setNewUser({...newUser, classId: e.target.value})}
                            >
                                <option value="">Aucune affectation...</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.section})</option>)}
                            </select>
                        </div>
                    )}

                    <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        CRÉER LE COMPTE AGENT
                    </button>
                </form>
            </div>

            <div className="glass-card p-6 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                <div className="flex items-start space-x-3 text-amber-700 dark:text-amber-500">
                    <Info className="w-5 h-5 mt-1 flex-shrink-0" />
                    <div className="text-xs space-y-2">
                        <p className="font-bold uppercase tracking-wider">Note de Sécurité</p>
                        <p>Les identifiants créés ici permettront au personnel de se connecter soit sur ce PC, soit via l'application mobile en local.</p>
                        <p>Assurez-vous que chaque employé dispose de son propre compte pour la traçabilité des saisies.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Liste des utilisateurs */}
        <div className="xl:col-span-8 glass-card shadow-xl border-none">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center">
                <Shield className="w-6 h-6 mr-3 text-emerald-500" />
                Répertoire du Personnel
            </h2>
            <span className="text-[10px] font-black text-slate-400 uppercase">{users.length} Comptes actifs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-5">Identité de l'Agent</th>
                  <th className="px-6 py-5">Utilisateur</th>
                  <th className="px-6 py-5">Poste / Rôle</th>
                  <th className="px-6 py-5">État Accès</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mr-4 text-sm font-black shadow-sm">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 dark:text-white uppercase text-sm">{u.fullName}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400">{u.username}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center text-[10px] font-black text-emerald-500 uppercase">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                            Actif
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Réinitialiser mot de passe">
                            <Lock className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
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
