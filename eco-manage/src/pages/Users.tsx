import React, { useEffect, useState } from 'react';
import { UserPlus, Shield, Trash2 } from 'lucide-react';
import type { Role } from '../types';

const Users: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'TEACHER' as Role
  });

  const loadUsers = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getUsers();
      setUsers(data);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
      await window.electronAPI.addUser(newUser);
      setNewUser({ username: '', password: '', fullName: '', role: 'TEACHER' });
      loadUsers();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Gestion du Personnel</h1>
        <p className="text-slate-400 mt-1">Créer et gérer les accès des utilisateurs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulaire d'ajout */}
        <div className="glass-card p-6 h-fit">
          <div className="flex items-center space-x-3 text-slate-gold-gold mb-6">
            <UserPlus className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Nouvel Utilisateur</h2>
          </div>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Nom Complet</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1"
                value={newUser.fullName}
                onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Nom d'utilisateur</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1"
                value={newUser.username}
                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Mot de passe</label>
              <input
                type="password"
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Rôle</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1"
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value as Role})}
              >
                <option value="DIRECTOR">Directeur</option>
                <option value="SECRETARY">Secrétaire</option>
                <option value="BURSAR">Économe</option>
                <option value="TEACHER">Enseignant</option>
                <option value="ADVISOR">Conseiller Pédagogique</option>
              </select>
            </div>
            <button className="w-full py-2 bg-slate-gold-gold text-slate-900 rounded font-bold hover:bg-yellow-500 transition-colors">
              Créer le compte
            </button>
          </form>
        </div>

        {/* Liste des utilisateurs */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center space-x-3 text-blue-400 mb-6">
            <Shield className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Accès Actifs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 text-xs uppercase border-b border-slate-800">
                  <th className="pb-4">Nom</th>
                  <th className="pb-4">Utilisateur</th>
                  <th className="pb-4">Rôle</th>
                  <th className="pb-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-white/5 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center mr-3 text-xs font-bold">
                          {u.fullName.charAt(0)}
                        </div>
                        {u.fullName}
                      </div>
                    </td>
                    <td className="py-4 text-sm font-mono">{u.username}</td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="p-2 text-slate-500 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
