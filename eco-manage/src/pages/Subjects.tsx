import React, { useState, useEffect } from 'react';
import { Plus, Globe, X, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: '',
    domain: '',
    level: 'PRIMAIRE',
    section: 'FRANCOPHONE',
    coefficient: 1
  });
  const { hasRole } = useAuth();
  const canEdit = hasRole(['FOUNDER', 'DIRECTOR']);

  const loadSubjects = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getSubjects();
      setSubjects(data);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
      await window.electronAPI.addSubject(newSubject);
      setNewSubject({ name: '', domain: '', level: 'PRIMAIRE', section: 'FRANCOPHONE', coefficient: 1 });
      setIsAdding(false);
      loadSubjects();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestion des Matières</h1>
          <p className="text-slate-400 mt-1 text-sm">Définissez les programmes officiels par section et par niveau</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center px-4 py-2 bg-slate-gold-gold text-slate-900 rounded-lg font-bold hover:bg-yellow-500 transition-all shadow-lg active:scale-95"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle Matière
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Section Francophone */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3 text-blue-400">
                <Globe className="w-6 h-6" />
                <h2 className="text-xl font-bold uppercase tracking-tight">Section Francophone</h2>
              </div>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded font-bold">FR</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.filter(s => s.section === 'FRANCOPHONE').length > 0 ? (
                subjects.filter(s => s.section === 'FRANCOPHONE').map(s => (
                    <div key={s.id} className="group p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl flex justify-between items-center hover:border-slate-gold-gold/50 transition-all">
                        <div className="min-w-0">
                            <p className="text-white font-bold truncate">{s.name}</p>
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">{s.domain}</p>
                            <p className="text-[8px] text-blue-400 font-bold">{s.level}</p>
                        </div>
                        <div className="flex items-center space-x-3 ml-4">
                            <span className="bg-slate-900/80 text-slate-gold-gold px-2 py-1 rounded text-[10px] font-black border border-slate-700">COEF: {s.coefficient}</span>
                            {canEdit && (
                                <button className="text-slate-600 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-span-full py-12 text-center text-slate-500 italic border-2 border-dashed border-slate-800 rounded-2xl">
                    Aucune matière configurée
                </div>
            )}
          </div>
        </div>

        {/* Section Anglophone */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3 text-emerald-400">
                <Globe className="w-6 h-6" />
                <h2 className="text-xl font-bold uppercase tracking-tight">Anglophone Section</h2>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold">EN</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.filter(s => s.section === 'ANGLOPHONE').length > 0 ? (
                subjects.filter(s => s.section === 'ANGLOPHONE').map(s => (
                    <div key={s.id} className="group p-4 bg-slate-800/40 border border-slate-700/50 rounded-xl flex justify-between items-center hover:border-slate-gold-gold/50 transition-all">
                        <div className="min-w-0">
                            <p className="text-white font-bold truncate">{s.name}</p>
                            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">{s.domain}</p>
                            <p className="text-[8px] text-emerald-400 font-bold">{s.level}</p>
                        </div>
                        <div className="flex items-center space-x-3 ml-4">
                            <span className="bg-slate-900/80 text-slate-gold-gold px-2 py-1 rounded text-[10px] font-black border border-slate-700">COEF: {s.coefficient}</span>
                            {canEdit && (
                                <button className="text-slate-600 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-span-full py-12 text-center text-slate-500 italic border-2 border-dashed border-slate-800 rounded-2xl">
                    Aucune matière configurée
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Ajout Matière */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Ajouter une Matière</h2>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddSubject} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom de la matière</label>
                <input
                    required
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white mt-1 outline-none focus:border-slate-gold-gold transition-colors"
                    placeholder="Ex: Mathématiques"
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Domaine / Compétence</label>
                <input
                    required
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white mt-1 outline-none focus:border-slate-gold-gold transition-colors"
                    placeholder="Ex: Sciences et Technologie"
                    value={newSubject.domain}
                    onChange={(e) => setNewSubject({...newSubject, domain: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section</label>
                    <select
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white mt-1 outline-none focus:border-slate-gold-gold"
                        value={newSubject.section}
                        onChange={(e) => setNewSubject({...newSubject, section: e.target.value})}
                    >
                        <option value="FRANCOPHONE">Francophone</option>
                        <option value="ANGLOPHONE">Anglophone</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Niveau</label>
                    <select
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white mt-1 outline-none focus:border-slate-gold-gold"
                        value={newSubject.level}
                        onChange={(e) => setNewSubject({...newSubject, level: e.target.value})}
                    >
                        <option value="PRIMAIRE">Primaire</option>
                        <option value="MATERNELLE">Maternelle</option>
                    </select>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coefficient</label>
                    <input
                        required
                        type="number"
                        min="1"
                        max="10"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white mt-1 outline-none focus:border-slate-gold-gold"
                        value={newSubject.coefficient}
                        onChange={(e) => setNewSubject({...newSubject, coefficient: parseInt(e.target.value)})}
                    />
                  </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 border border-slate-700 rounded-lg text-slate-400 font-bold hover:bg-slate-800 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-slate-gold-gold text-slate-900 rounded-lg font-black hover:bg-yellow-500 transition-all flex items-center justify-center"
                >
                  <Save className="w-5 h-5 mr-2" />
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

export default Subjects;
