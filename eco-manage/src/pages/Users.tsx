import React, { useEffect, useState } from 'react';
import { UserPlus, Shield, Trash2, CheckCircle, Lock, Search, Edit, X } from 'lucide-react';
import type { Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Users: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'TEACHER' as Role,
    classId: '',
    civility: 'M.',
    section: 'FRANCOPHONE',
    cycle: 'PRIMAIRE',
    gender: 'M',
    phone: ''
  });
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    civility: 'M.',
    fullName: '',
    username: '',
    phone: '',
    role: 'TEACHER' as Role,
    password: '',
    section: 'FRANCOPHONE',
    cycle: 'PRIMAIRE',
    gender: 'M',
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

  useEffect(() => {
    if (editingUser) {
        let assignedClassId = '';
        let classLevel = 'PRIMAIRE';
        if (editingUser.assignedClasses) {
            try {
                const parsed = typeof editingUser.assignedClasses === 'string' ? JSON.parse(editingUser.assignedClasses) : editingUser.assignedClasses;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    assignedClassId = parsed[0].toString();
                    const cls = classes.find(c => c.id.toString() === assignedClassId);
                    if (cls) {
                        classLevel = cls.level || 'PRIMAIRE';
                    }
                }
            } catch (e) {
                console.error("Failed to parse assigned classes:", e);
            }
        }

        setEditUserForm({
            civility: editingUser.civility || 'M.',
            fullName: editingUser.fullName || '',
            username: editingUser.username || '',
            phone: editingUser.phone || '',
            role: editingUser.role || 'TEACHER',
            password: '',
            section: editingUser.section || 'FRANCOPHONE',
            cycle: classLevel,
            gender: editingUser.gender || 'M',
            classId: assignedClassId
        });
    }
  }, [editingUser, classes]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Name validation
    const nameRegex = /^[A-Za-zÀ-ÿ\s\-]+$/;
    if (!nameRegex.test(newUser.fullName.trim())) {
        alert("🚨 ERREUR DE SAISIE :\nLe Nom de l'agent ne doit contenir que des lettres.");
        return;
    }
    if (!nameRegex.test(newUser.username.trim())) {
        alert("🚨 ERREUR DE SAISIE :\nLe nom d'utilisateur (Identifiant) ne doit contenir que des lettres.");
        return;
    }

    // Phone validation
    let cleanPhone = newUser.phone.replace(/[\s\-\(\)\+]/g, '');
    if (cleanPhone.startsWith('237') && cleanPhone.length > 9) {
        cleanPhone = cleanPhone.slice(3);
    }
    if (!/^(2|6)\d{8}$/.test(cleanPhone)) {
        alert(t('alert_invalid_phone'));
        return;
    }

    if (window.electronAPI && currentUser) {
      const res = await window.electronAPI.addUser({
          ...newUser,
          phone: cleanPhone,
          schoolId: currentUser.schoolId,
          assignedClasses: newUser.classId ? [parseInt(newUser.classId)] : []
      });
      if (res && res.error) {
          alert(`${t('alert_error')}: ${res.error}`);
          return;
      }
      setNewUser({ 
          username: '', 
          password: '', 
          fullName: '', 
          role: 'TEACHER', 
          classId: '', 
          civility: 'M.', 
          section: 'FRANCOPHONE', 
          cycle: 'PRIMAIRE',
          gender: 'M',
          phone: ''
      });
      loadData();
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;

      const nameRegex = /^[A-Za-zÀ-ÿ\s\-]+$/;
      if (!nameRegex.test(editUserForm.fullName.trim())) {
          alert("🚨 ERREUR DE SAISIE :\nLe Nom de l'agent ne doit contenir que des lettres.");
          return;
      }
      if (!nameRegex.test(editUserForm.username.trim())) {
          alert("🚨 ERREUR DE SAISIE :\nLe nom d'utilisateur (Identifiant) ne doit contenir que des lettres.");
          return;
      }

      let cleanPhone = editUserForm.phone.replace(/[\s\-\(\)\+]/g, '');
      if (cleanPhone.startsWith('237') && cleanPhone.length > 9) {
          cleanPhone = cleanPhone.slice(3);
      }
      if (!/^(2|6)\d{8}$/.test(cleanPhone)) {
          alert(t('alert_invalid_phone'));
          return;
      }

      if (window.electronAPI) {
          try {
              const res = await window.electronAPI.updateUser({
                  id: editingUser.id,
                  civility: editUserForm.civility,
                  fullName: editUserForm.fullName,
                  username: editUserForm.username,
                  phone: cleanPhone,
                  role: editUserForm.role,
                  password: editUserForm.password || undefined,
                  section: editUserForm.section,
                  gender: editUserForm.gender,
                  assignedClasses: editUserForm.classId ? [parseInt(editUserForm.classId)] : []
              });

              if (res && res.error) {
                  alert(`${t('alert_update_error')}: ${res.error}`);
                  return;
              }

              setEditingUser(null);
              loadData();
              alert(t('alert_agent_updated'));
          } catch (err: any) {
              alert(err.message);
          }
      }
  };

  const handleDeleteUser = async (id: number, name: string) => {
      if (!window.confirm(t('confirm_delete_user', { name }))) return;
      if (window.electronAPI) {
          try {
              const res = await window.electronAPI.deleteUser(id);
              if (res && res.error) {
                  alert(res.error);
              } else {
                  loadData();
              }
          } catch (err: any) {
              alert(err.message);
          }
      }
  };

  const filteredUsers = users.filter(u =>
    (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">{t('staff_management_title')}</h1>
          <p className="text-slate-400 mt-1 uppercase text-xs font-black tracking-widest">{t('staff_management_subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-black text-amber-500 bg-amber-500/10 px-4 py-2 rounded-full uppercase tracking-widest border border-amber-500/20">
            <Shield className="w-4 h-4" />
            <span>{t('secure_server')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-4 space-y-6">
            <div className="glass-card p-8 shadow-2xl border-white/5">
                <div className="flex items-center space-x-3 text-amber-500 mb-8">
                    <UserPlus className="w-7 h-7" />
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">{t('add_agent_title')}</h2>
                </div>
                <form onSubmit={handleAddUser} className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('civility_label')}</label>
                            <select
                                className="input-field w-full appearance-none cursor-pointer"
                                value={newUser.civility}
                                onChange={(e) => {
                                    const civ = e.target.value;
                                    setNewUser({...newUser, civility: civ, gender: civ === 'M.' ? 'M' : 'F'});
                                }}
                            >
                                <option value="M.">M.</option>
                                <option value="Mme">Mme</option>
                            </select>
                        </div>
                         <div className="col-span-2 space-y-2">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('full_name')}</label>
                             <input
                                 type="text"
                                 className="input-field w-full"
                                 value={newUser.fullName}
                                 onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                                 required
                                 placeholder="Joseph Mballa"
                             />
                         </div>
                     </div>
                     <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('cameroonian_phone_label')}</label>
                         <input
                             type="text"
                             className="input-field w-full text-amber-500 font-mono"
                             value={newUser.phone}
                             onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                             required
                             placeholder="Ex: 699000000"
                         />
                     </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('username')}</label>
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
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('password')}</label>
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
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('role_label')}</label>
                        <select
                            className="input-field w-full appearance-none cursor-pointer"
                            value={newUser.role}
                            onChange={(e) => setNewUser({...newUser, role: e.target.value as Role})}
                        >
                            {(user?.role === 'SUPERADMIN' || user?.role === 'FOUNDER') && (
                                <option value="FOUNDER">{t('role_FOUNDER')}</option>
                            )}
                            <option value="DIRECTOR">{t('role_DIRECTOR')}</option>
                            <option value="SECRETARY">{t('role_SG')}</option>
                            <option value="BURSAR">{t('role_BURSAR')}</option>
                            <option value="TEACHER">{t('role_TEACHER')}</option>
                            <option value="ADVISOR">{t('role_ADVISOR')}</option>
                            <option value="DRIVER">{t('role_DRIVER')}</option>
                        </select>
                    </div>

                    {newUser.role === 'TEACHER' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">{t('section')}</label>
                                    <select
                                        className="input-field w-full border-amber-500/20 bg-amber-500/5 appearance-none"
                                        value={newUser.section}
                                        onChange={(e) => setNewUser({...newUser, section: e.target.value, classId: ''})}
                                    >
                                        <option value="FRANCOPHONE">{t('section_francophone')}</option>
                                        <option value="ANGLOPHONE">{t('section_anglophone')}</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">{t('cycle')}</label>
                                    <select
                                        className="input-field w-full border-amber-500/20 bg-amber-500/5 appearance-none"
                                        value={newUser.cycle || 'PRIMAIRE'}
                                        onChange={(e) => setNewUser({...newUser, cycle: e.target.value, classId: ''})}
                                    >
                                        <option value="PRIMAIRE">{t('cycle_primary_label')}</option>
                                        <option value="MATERNELLE">{t('cycle_nursery_label')}</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">{t('assigned_class_label')}</label>
                                <select
                                    className="input-field w-full border-amber-500/20 bg-amber-500/5 appearance-none"
                                    value={newUser.classId}
                                    onChange={(e) => setNewUser({...newUser, classId: e.target.value})}
                                >
                                    <option value="">{t('no_assignment')}</option>
                                    {classes
                                        .filter(c => c.section === newUser.section && c.level === (newUser.cycle || 'PRIMAIRE'))
                                        .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <button className="btn-primary w-full py-5 mt-4">
                        <CheckCircle className="w-5 h-5 mr-3" />
                        {t('register_agent_button')}
                    </button>
                </form>
            </div>
        </div>

        <div className="xl:col-span-8 glass-card shadow-2xl border-none overflow-hidden flex flex-col">
          <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center bg-slate-900/80 gap-4">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center italic">
                <Shield className="w-7 h-7 mr-4 text-emerald-500" />
                {t('staff_directory_title')}
            </h2>
            <div className="relative group min-w-[250px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                <input
                    type="text"
                    placeholder={t('search_agent_placeholder')}
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
                  <th className="px-8 py-6">{t('agent_identity_header')}</th>
                  <th className="px-8 py-6">{t('username')}</th>
                  <th className="px-8 py-6">{t('role_label')}</th>
                  <th className="px-8 py-6">{t('access_status_header')}</th>
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
                            <div className="font-black text-white uppercase text-base tracking-tight group-hover:text-amber-500 transition-colors">
                                {u.civility ? `${u.civility} ` : ''}{u.fullName}
                            </div>
                             <div className="flex flex-wrap gap-x-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                 <span className="text-amber-500/80">MATRICULE: {u.matricule || `STF-${u.id}`}</span>
                                 {u.phone && <span className="text-slate-400">• TEL: {u.phone}</span>}
                                 {u.role === 'TEACHER' && u.section && (
                                     <>
                                         <span>•</span>
                                         <span>{u.section}</span>
                                     </>
                                 )}
                             </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                        <span className="text-[11px] font-mono font-black bg-slate-950 border border-white/5 px-3 py-1.5 rounded-xl text-slate-400 group-hover:text-amber-500 transition-colors shadow-inner">{u.username}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-1.5 bg-white/5 text-slate-300 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest group-hover:border-amber-500/30 group-hover:text-white transition-all">
                        {t(`role_${u.role}`)}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                        <div className="flex items-center text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-4 py-1.5 rounded-full w-fit border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                            {t('status_active')}
                        </div>
                    </td>
                     <td className="px-8 py-6 text-right">
                       <div className="flex items-center justify-end space-x-2">
                         {((currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'FOUNDER') || (currentUser?.role === 'DIRECTOR' && u.role !== 'FOUNDER' && u.role !== 'SUPERADMIN')) && (
                             <button onClick={() => setEditingUser(u)} className="p-3 text-slate-600 hover:text-amber-500 hover:bg-amber-500/10 rounded-2xl border border-transparent hover:border-amber-500/20 transition-all shadow-md" title={t('save')}>
                                 <Edit className="w-4 h-4" />
                             </button>
                         )}
                         {((currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'FOUNDER') || (currentUser?.role === 'DIRECTOR' && u.role !== 'FOUNDER' && u.role !== 'SUPERADMIN')) && (
                             <button onClick={() => handleDeleteUser(u.id, u.fullName)} className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl border border-transparent hover:border-rose-500/20 transition-all" title={t('cancel')}>
                                 <Trash2 className="w-4 h-4" />
                             </button>
                         )}
                       </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Edit User Modal */}
      {editingUser && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-300">
              <div className="glass-card w-full max-w-lg bg-slate-900 border border-white/10 shadow-2xl p-0 overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-slate-950/50 flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-black text-white tracking-tight">{t('edit_agent_title')}</h2>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{t('edit_agent_subtitle')} ({editingUser.fullName})</p>
                      </div>
                      <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/5 rounded-full transition-all"><X className="w-6 h-6 text-slate-500" /></button>
                  </div>
                  <form onSubmit={handleUpdateUser} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                      <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-1 space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('civility_label')}</label>
                              <select
                                  className="input-field w-full appearance-none cursor-pointer"
                                  value={editUserForm.civility}
                                  onChange={(e) => {
                                      const civ = e.target.value;
                                      setEditUserForm({...editUserForm, civility: civ, gender: civ === 'M.' ? 'M' : 'F'});
                                  }}
                              >
                                  <option value="M.">M.</option>
                                  <option value="Mme">Mme</option>
                              </select>
                          </div>
                          <div className="col-span-2 space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('full_name')}</label>
                              <input
                                  type="text"
                                  className="input-field w-full"
                                  value={editUserForm.fullName}
                                  onChange={(e) => setEditUserForm({...editUserForm, fullName: e.target.value})}
                                  required
                              />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('username')}</label>
                              <input
                                  type="text"
                                  className="input-field w-full text-amber-500 font-mono"
                                  value={editUserForm.username}
                                  onChange={(e) => setEditUserForm({...editUserForm, username: e.target.value.toLowerCase()})}
                                  required
                              />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('cameroonian_phone_label')}</label>
                              <input
                                  type="text"
                                  className="input-field w-full text-amber-500 font-mono"
                                  value={editUserForm.phone}
                                  onChange={(e) => setEditUserForm({...editUserForm, phone: e.target.value})}
                                  required
                              />
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('role_label')}</label>
                                  <select
                                      className="input-field w-full appearance-none"
                                      value={editUserForm.role}
                                      onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value as Role})}
                                  >
                                    {(user?.role === 'SUPERADMIN' || user?.role === 'FOUNDER') && (
                                        <option value="FOUNDER">{t('role_FOUNDER')}</option>
                                    )}
                                    <option value="DIRECTOR">{t('role_DIRECTOR')}</option>
                                    <option value="SECRETARY">{t('role_SG')}</option>
                                    <option value="BURSAR">{t('role_BURSAR')}</option>
                                    <option value="TEACHER">{t('role_TEACHER')}</option>
                                    <option value="ADVISOR">{t('role_ADVISOR')}</option>
                                    <option value="DRIVER">{t('role_DRIVER')}</option>
                                  </select>
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('new_password_optional')}</label>
                              <input
                                  type="password"
                                  className="input-field w-full"
                                  value={editUserForm.password}
                                  onChange={(e) => setEditUserForm({...editUserForm, password: e.target.value})}
                                  placeholder={t('leave_empty_to_keep_unchanged')}
                              />
                          </div>
                      </div>

                      {editUserForm.role === 'TEACHER' && (
                          <div className="space-y-4 pt-2">
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">{t('section')}</label>
                                      <select
                                          className="input-field w-full bg-amber-500/5 appearance-none"
                                          value={editUserForm.section}
                                          onChange={(e) => setEditUserForm({...editUserForm, section: e.target.value, classId: ''})}
                                      >
                                          <option value="FRANCOPHONE">{t('section_francophone')}</option>
                                          <option value="ANGLOPHONE">{t('section_anglophone')}</option>
                                      </select>
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">{t('cycle')}</label>
                                      <select
                                          className="input-field w-full bg-amber-500/5 appearance-none"
                                          value={editUserForm.cycle}
                                          onChange={(e) => setEditUserForm({...editUserForm, cycle: e.target.value, classId: ''})}
                                      >
                                          <option value="PRIMAIRE">{t('cycle_primary_label')}</option>
                                          <option value="MATERNELLE">{t('cycle_nursery_label')}</option>
                                      </select>
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">{t('assigned_class_label')}</label>
                                  <select
                                      className="input-field w-full bg-amber-500/5 appearance-none"
                                      value={editUserForm.classId}
                                      onChange={(e) => setEditUserForm({...editUserForm, classId: e.target.value})}
                                  >
                                      <option value="">{t('no_assignment')}</option>
                                      {classes
                                          .filter(c => c.section === editUserForm.section && c.level === editUserForm.cycle)
                                          .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                              </div>
                          </div>
                      )}

                      <div className="pt-6 flex justify-end space-x-3">
                          <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-2.5 text-xs font-black text-slate-500 uppercase tracking-widest">{t('cancel')}</button>
                          <button type="submit" className="btn-primary py-2.5 px-8">{t('save_user')}</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default Users;
