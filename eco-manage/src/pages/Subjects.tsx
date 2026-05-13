import React, { useState, useEffect } from 'react';
import { Plus, Globe, X, Save, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Subjects: React.FC = () => {
  const [globalSubjects, setGlobalSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [isAddingGlobal, setIsAddingGlobal] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: '',
    domain: '',
    level: 'PRIMAIRE',
    section: 'FRANCOPHONE'
  });

  const { hasRole, user } = useAuth();
  const isSuperAdmin = hasRole(['SUPERADMIN']);
  const canConfigClass = hasRole(['ADVISOR', 'DIRECTOR', 'FOUNDER']);

  const loadData = async () => {
    if (window.electronAPI) {
      const gSubjects = await window.electronAPI.getSchoolSubjects(user?.schoolId);
      // Filter only subjects authorized for this school by the SuperAdmin
      setGlobalSubjects(gSubjects?.filter((s: any) => s.is_active) || []);
      const cls = await window.electronAPI.getClasses(user?.schoolId);
      setClasses(cls || []);
    }
  };

  const loadClassSubjects = async (classId: number) => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getClassSubjects(classId);
      setClassSubjects(data);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadClassSubjects(selectedClassId);
    }
  }, [selectedClassId]);

  const handleAddGlobalSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
      await window.electronAPI.addGlobalSubject(newSubject);
      setNewSubject({ name: '', domain: '', level: 'PRIMAIRE', section: 'FRANCOPHONE' });
      setIsAddingGlobal(false);
      loadData();
    }
  };

  const toggleSubjectForClass = async (subjectId: number) => {
    if (!selectedClassId || !window.electronAPI) return;

    const existing = classSubjects.find(s => s.id === subjectId);
    if (existing) {
      await window.electronAPI.removeSubjectFromClass({ classId: selectedClassId, subjectId });
    } else {
      await window.electronAPI.assignSubjectToClass({
        classId: selectedClassId,
        subjectId,
        coefficient: 1,
        isOptional: false
      });
    }
    loadClassSubjects(selectedClassId);
  };

  const updateCoefficient = async (subjectId: number, coef: number) => {
    if (!selectedClassId || !window.electronAPI) return;
    const s = classSubjects.find(s => s.id === subjectId);
    await window.electronAPI.assignSubjectToClass({
        classId: selectedClassId,
        subjectId,
        coefficient: coef,
        isOptional: s?.is_optional || false
    });
    loadClassSubjects(selectedClassId);
  };

  const toggleOptional = async (subjectId: number) => {
    if (!selectedClassId || !window.electronAPI) return;
    const s = classSubjects.find(s => s.id === subjectId);
    await window.electronAPI.assignSubjectToClass({
        classId: selectedClassId,
        subjectId,
        coefficient: s?.coefficient || 1,
        isOptional: !s?.is_optional
    });
    loadClassSubjects(selectedClassId);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Programmes & Matières</h1>
          <p className="text-slate-400 mt-1 text-sm">Configuration pédagogique par classe</p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => setIsAddingGlobal(true)}
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Répertoire Global
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Liste des Classes */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">Classes</h2>
          <div className="space-y-2">
            {classes.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClassId(c.id)}
                className={`w-full text-left p-4 rounded-xl font-bold transition-all border ${
                  selectedClassId === c.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {c.name}
                <span className={`block text-[10px] uppercase mt-1 ${selectedClassId === c.id ? 'text-slate-800' : 'text-slate-600'}`}>
                    {c.section} • {c.level}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration des Matières pour la classe sélectionnée */}
        <div className="lg:col-span-2 glass-card p-6">
          {!selectedClassId ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 py-12">
              <Globe className="w-16 h-16 opacity-20" />
              <p className="font-medium">Sélectionnez une classe pour configurer son programme</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                  Matières : {classes.find(c => c.id === selectedClassId)?.name}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {globalSubjects
                  .filter(s => s.level === classes.find(c => c.id === selectedClassId)?.level && s.section === classes.find(c => c.id === selectedClassId)?.section)
                  .map(s => {
                    const isAssigned = classSubjects.some(cs => cs.id === s.id);
                    const classSub = classSubjects.find(cs => cs.id === s.id);

                    return (
                      <div
                        key={s.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isAssigned
                          ? 'bg-slate-800/80 border-amber-500/30'
                          : 'bg-slate-950/40 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="min-w-0">
                            <p className="text-white font-bold truncate">{s.name}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">{s.domain}</p>
                          </div>
                          <button
                            onClick={() => toggleSubjectForClass(s.id)}
                            className={`p-1.5 rounded-full transition-all ${
                              isAssigned ? 'text-amber-500' : 'text-slate-700 hover:text-slate-500'
                            }`}
                          >
                            {isAssigned ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                          </button>
                        </div>

                        {isAssigned && (
                          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                            <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase">Coef:</span>
                                <input
                                    type="number"
                                    className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center text-xs text-amber-500 font-black"
                                    value={classSub?.coefficient || 1}
                                    onChange={(e) => updateCoefficient(s.id, parseInt(e.target.value))}
                                />
                            </div>
                            <button
                                onClick={() => toggleOptional(s.id)}
                                className={`text-[10px] font-black px-2 py-1 rounded transition-all ${
                                    classSub?.is_optional
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                                }`}
                            >
                                {classSub?.is_optional ? 'OPTIONNELLE' : 'OBLIGATOIRE'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Ajout Matière Globale (SuperAdmin) */}
      {isAddingGlobal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white uppercase">Répertoire Global</h2>
              <button onClick={() => setIsAddingGlobal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddGlobalSubject} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom de la matière</label>
                <input
                    required
                    type="text"
                    className="input-field w-full mt-1"
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
                    className="input-field w-full mt-1"
                    placeholder="Ex: Sciences et Technologie"
                    value={newSubject.domain}
                    onChange={(e) => setNewSubject({...newSubject, domain: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Section</label>
                    <select
                        className="input-field w-full mt-1"
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
                        className="input-field w-full mt-1"
                        value={newSubject.level}
                        onChange={(e) => setNewSubject({...newSubject, level: e.target.value})}
                    >
                        <option value="PRIMAIRE">Primaire</option>
                        <option value="MATERNELLE">Maternelle</option>
                    </select>
                  </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingGlobal(false)}
                  className="flex-1 py-3 border border-slate-700 rounded-xl text-slate-400 font-bold hover:bg-slate-900 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Ajouter au Répertoire
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
