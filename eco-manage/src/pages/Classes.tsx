import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Building2, Plus, Edit2, Trash2, Users, Search, Save, X, Copy } from 'lucide-react';

const Classes: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [classes, setClasses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        id: null as number | null,
        name: '',
        code: '',
        section: 'FRANCOPHONE',
        level: 'PRIMAIRE',
        mainTeacherId: '',
        assistantTeacherId: '',
        baseClassId: ''
    });

    const loadData = async () => {
        if (window.electronAPI && user) {
            const cls = await window.electronAPI.getClasses(user.schoolId);
            setClasses(cls || []);
            
            const users = await window.electronAPI.getUsers(user.schoolId);
            const staff = users.filter((u: any) => u.role === 'TEACHER');
            setTeachers(staff || []);
        }
    };

    useEffect(() => {
        loadData();
    }, [user]);

    const handleOpenModal = (cls?: any) => {
        if (cls) {
            setFormData({
                id: cls.id,
                name: cls.name,
                code: cls.code,
                section: cls.section,
                level: cls.level,
                mainTeacherId: cls.main_teacher_id?.toString() || '',
                assistantTeacherId: cls.assistant_teacher_id?.toString() || '',
                baseClassId: ''
            });
        } else {
            setFormData({
                id: null,
                name: '',
                code: '',
                section: 'FRANCOPHONE',
                level: 'PRIMAIRE',
                mainTeacherId: '',
                assistantTeacherId: '',
                baseClassId: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!window.electronAPI || !user) return;

        try {
            const dataToSave = {
                ...formData,
                schoolId: user.schoolId,
                mainTeacherId: formData.mainTeacherId ? parseInt(formData.mainTeacherId) : null,
                assistantTeacherId: formData.assistantTeacherId ? parseInt(formData.assistantTeacherId) : null,
                baseClassId: formData.baseClassId ? parseInt(formData.baseClassId) : null
            };

            if (formData.id) {
                const res = await (window.electronAPI as any).updateClass(dataToSave);
                if (res.error) throw new Error(res.error);
            } else {
                const res = await (window.electronAPI as any).addClass(dataToSave);
                if (res.error) throw new Error(res.error);
            }
            await loadData();
            setIsModalOpen(false);
        } catch (err: any) {
            alert("Erreur : " + err.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette classe ? Toute sa configuration sera perdue.")) return;
        if (!window.electronAPI) return;

        try {
            const res = await (window.electronAPI as any).deleteClass(id);
            if (res.error) throw new Error(res.error);
            await loadData();
        } catch (err: any) {
            alert("Erreur : " + err.message);
        }
    };

    const filteredClasses = classes.filter(c => 
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTeacherName = (id: number) => {
        const t = teachers.find(teach => teach.id === id);
        return t ? t.fullName : 'Non assigné';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-amber-500" />
                        Salles de classe
                    </h1>
                    <p className="text-slate-400 mt-1">Gestion des classes et de leurs configurations.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="px-4 py-2 bg-amber-500 text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Nouvelle Classe
                </button>
            </div>

            <div className="glass-card p-6">
                <div className="flex mb-6 relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Rechercher une classe..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-slate-500 text-xs uppercase bg-slate-900/50">
                            <tr>
                                <th className="p-4 rounded-tl-xl">Classe</th>
                                <th className="p-4">Code</th>
                                <th className="p-4">Section / Niveau</th>
                                <th className="p-4">Titulaire</th>
                                <th className="p-4 rounded-tr-xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-300">
                            {filteredClasses.map((c) => (
                                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                    <td className="p-4 font-bold text-white">{c.name}</td>
                                    <td className="p-4 text-slate-400">{c.code}</td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-wider text-amber-500 mr-2">
                                            {c.section}
                                        </span>
                                        <span className="text-xs text-slate-400">{c.level}</span>
                                    </td>
                                    <td className="p-4 flex items-center gap-2 text-sm">
                                        <Users className="w-4 h-4 text-slate-500" />
                                        {getTeacherName(c.main_teacher_id)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpenModal(c)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClasses.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        Aucune classe trouvée.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-slate-800/50">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                {formData.id ? 'Modifier la classe' : 'Nouvelle classe'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            {!formData.id && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4">
                                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                                        <Copy className="w-3 h-3" />
                                        Dupliquer à partir de (Optionnel)
                                    </label>
                                    <select
                                        className="input-field w-full mt-1 border-amber-500/30"
                                        value={formData.baseClassId}
                                        onChange={(e) => setFormData({...formData, baseClassId: e.target.value})}
                                    >
                                        <option value="">-- Ne rien copier (Classe vide) --</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-amber-500/70 mt-1">Copiera les matières, les coefficients et les frais de scolarité.</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom de la classe</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: SIL B"
                                        className="input-field w-full mt-1"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Code Unique</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: SIL-B"
                                        className="input-field w-full mt-1"
                                        value={formData.code}
                                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section</label>
                                    <select
                                        className="input-field w-full mt-1"
                                        value={formData.section}
                                        onChange={(e) => setFormData({...formData, section: e.target.value})}
                                    >
                                        <option value="FRANCOPHONE">Francophone</option>
                                        <option value="ANGLOPHONE">Anglophone</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Niveau</label>
                                    <select
                                        className="input-field w-full mt-1"
                                        value={formData.level}
                                        onChange={(e) => setFormData({...formData, level: e.target.value})}
                                    >
                                        <option value="PRIMAIRE">Primaire</option>
                                        <option value="MATERNELLE">Maternelle</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Titulaire de la classe</label>
                                <select
                                    className="input-field w-full mt-1"
                                    value={formData.mainTeacherId}
                                    onChange={(e) => setFormData({...formData, mainTeacherId: e.target.value})}
                                >
                                    <option value="">-- Sélectionner un enseignant --</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.fullName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-amber-500 text-slate-900 rounded-xl font-bold hover:bg-amber-400 transition-colors flex justify-center items-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Classes;
