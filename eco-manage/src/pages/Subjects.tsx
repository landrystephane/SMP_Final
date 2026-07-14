import React, { useState, useEffect } from 'react';
import { Plus, Globe, X, Save, Trash2, CheckCircle2, Circle, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../context/NotificationContext';
import { useDataRefresh } from '../utils/dataSync';

const Subjects: React.FC = () => {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [globalSubjects, setGlobalSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [isManagingGlobal, setIsManagingGlobal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterSection, setFilterSection] = useState<string>('');
  const [pendingSubjects, setPendingSubjects] = useState<any[]>([]);
  const [newSubject, setNewSubject] = useState({
    name: '',
    domain: '',
    level: 'PRIMAIRE',
    section: 'FRANCOPHONE'
  });
  const [requiresCode, setRequiresCode] = useState(false);
  const [coefInputs, setCoefInputs] = useState<Record<number, string>>({});

  const { hasRole, user } = useAuth();
  const canManageRegistry = hasRole(['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'SG']);

  const loadData = async () => {
    if (window.electronAPI) {
      const gSubjects = await window.electronAPI.getSchoolSubjects(user?.schoolId);
      // Filter only subjects authorized for this school by the SuperAdmin
      setGlobalSubjects(gSubjects?.filter((s: any) => s.is_active) || []);
      const cls = await window.electronAPI.getClasses(user?.schoolId);
      setClasses(cls || []);

      const schools = await window.electronAPI.getSchools();
      const mySchool = schools.find((s: any) => s.id === user?.schoolId);
      if (mySchool && mySchool.requires_subject_code === 1) {
          setRequiresCode(true);
      }
    }
  };

  const loadClassSubjects = async (classId: number) => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getClassSubjects(classId);
      setClassSubjects(data || []);
    }
  };

  const loadPendingSubjects = async () => {
    if (window.electronAPI && user?.schoolId) {
      try {
        const pending = await (window.electronAPI as any).getPendingSubjects(user.schoolId);
        setPendingSubjects(pending || []);
      } catch (e) {
        console.error("Failed to load pending subjects", e);
      }
    }
  };

  const handleCancelPendingSubject = async (id: number) => {
    if (!window.confirm(t('subj_confirm_cancel_request', 'Êtes-vous sûr de vouloir annuler cette demande ?'))) return;
    if (window.electronAPI) {
      try {
        await (window.electronAPI as any).cancelPendingSubject(id);
        showNotification(t('subj_request_cancelled', 'Demande annulée avec succès'), "success");
        loadPendingSubjects();
      } catch (err: any) {
        showNotification(err.message, "error");
      }
    }
  };

  useEffect(() => {
    loadData();
    loadPendingSubjects();
  }, []);
  useDataRefresh(loadData);

  useEffect(() => {
    if (selectedClassId) {
      loadClassSubjects(selectedClassId);
    }
  }, [selectedClassId]);

  const handleAddGlobalSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.addGlobalSubject(newSubject);
        const addedName = newSubject.name;
        setNewSubject({ name: '', domain: '', level: 'PRIMAIRE', section: 'FRANCOPHONE' });
        if (res && res.pending) {
          showNotification(res.message, "info");
          loadPendingSubjects();
        } else {
          showNotification(t('subj_added_success', 'La matière "{{name}}" a été ajoutée avec succès !', { name: addedName }), "success");
        }
        loadData();
      } catch (err: any) {
        showNotification(err.message, "error");
      }
    }
  };

  const handleUpdateGlobalSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.electronAPI && editingSubject) {
      try {
        const updatedName = editingSubject.name;
        await window.electronAPI.updateGlobalSubject(editingSubject);
        showNotification(t('subj_updated_success', 'Les modifications pour la matière "{{name}}" ont été enregistrées.', { name: updatedName }), "success");
        setEditingSubject(null);
        loadData();
      } catch (err: any) {
        showNotification(err.message, "error");
      }
    }
  };

  const handleDeleteGlobalSubject = async (id: number, name: string) => {
    if (!window.confirm(t('subj_confirm_delete', 'Voulez-vous vraiment supprimer la matière "{{name}}" de votre répertoire ?', { name }))) return;
    if (window.electronAPI) {
      try {
        await window.electronAPI.deleteGlobalSubject(id);
        showNotification(t('subj_deleted_success', 'La matière "{{name}}" a été définitivement supprimée.', { name }), "success");
        loadData();
      } catch (err: any) {
        showNotification(err.message, "error");
      }
    }
  };

  const toggleSubjectForClass = async (subjectId: number) => {
    if (!selectedClassId || !window.electronAPI) return;

    const existing = classSubjects.find(s => s.id === subjectId);
    try {
      if (existing) {
        await window.electronAPI.removeSubjectFromClass({ classId: selectedClassId, subjectId });
        showNotification(t('subj_removed_from_class', 'Matière retirée de la classe'), "success");
      } else {
        await window.electronAPI.assignSubjectToClass({
          classId: selectedClassId,
          subjectId,
          coefficient: 1,
          isOptional: false
        });
        showNotification(t('subj_assigned_to_class', 'Matière assignée à la classe'), "success");
      }
    } catch (err: any) {
      showNotification(t('subj_error_prefix', 'Erreur: ') + err.message, "error");
    }
    loadClassSubjects(selectedClassId);
  };

  const updateCoefficient = async (subjectId: number, coef: number) => {
    if (!selectedClassId || !window.electronAPI) return;
    const s = classSubjects.find(s => s.id === subjectId);
    try {
      await window.electronAPI.assignSubjectToClass({
          classId: selectedClassId,
          subjectId,
          coefficient: coef,
          isOptional: s?.is_optional || false
      });
      showNotification(t('subj_coefficient_updated', 'Coefficient mis à jour'), "success");
    } catch (err: any) {
      showNotification(t('subj_error_prefix', 'Erreur: ') + err.message, "error");
    }
    loadClassSubjects(selectedClassId);
  };

  const toggleOptional = async (subjectId: number) => {
    if (!selectedClassId || !window.electronAPI) return;
    const s = classSubjects.find(s => s.id === subjectId);
    try {
      await window.electronAPI.assignSubjectToClass({
          classId: selectedClassId,
          subjectId,
          coefficient: s?.coefficient || 1,
          isOptional: !s?.is_optional
      });
      showNotification(s?.is_optional ? t('subj_set_mandatory', 'Matière définie comme obligatoire') : t('subj_set_optional', 'Matière définie comme optionnelle'), "success");
    } catch (err: any) {
      showNotification(t('subj_error_prefix', 'Erreur: ') + err.message, "error");
    }
    loadClassSubjects(selectedClassId);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('subjects_title', 'Programmes & Matières')}</h1>
          <p className="text-slate-400 mt-1 text-sm">{t('subjects_subtitle', 'Configuration pédagogique par classe')}</p>
        </div>
        {canManageRegistry && (
          <button
            onClick={() => setIsManagingGlobal(true)}
            className="btn-primary flex items-center"
          >
            <Globe className="w-5 h-5 mr-2" />
            {t('global_directory', 'Répertoire Global')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider">{t('classes')}</h2>
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
                    {t(`section_${c.section?.toLowerCase()}`)} • {t(`cycle_${c.level?.toLowerCase()}`)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 glass-card p-6">
          {!selectedClassId ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 py-12">
              <Globe className="w-16 h-16 opacity-20" />
              <p className="font-medium">{t('select_class_for_program', 'Sélectionnez une classe pour configurer son programme')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                  {t('subjects')} : {classes.find(c => c.id === selectedClassId)?.name}
                </h2>
              </div>

              <div className="grid grid-cols-1 grid-cols-1 gap-4">
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
                                <span className="text-[10px] font-black text-slate-500 uppercase">{t('coef', 'Coef:')}</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center text-xs text-amber-500 font-black"
                                    value={coefInputs[s.id] !== undefined ? coefInputs[s.id] : (classSub?.coefficient ?? '')}
                                    onChange={(e) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setCoefInputs(prev => ({ ...prev, [s.id]: v })); }}
                                    onBlur={() => { const v = coefInputs[s.id]; if (v !== undefined) { updateCoefficient(s.id, v === '' ? 1 : parseInt(v)); setCoefInputs(prev => { const next = { ...prev }; delete next[s.id]; return next; }); } }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
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
                                {classSub?.is_optional ? t('optional', 'OPTIONNELLE') : t('mandatory', 'OBLIGATOIRE')}
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

      {isManagingGlobal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white uppercase">{t('global_directory', 'Répertoire Global')}</h2>
              <button onClick={() => setIsManagingGlobal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-8">
                <div className="flex-1 overflow-x-auto">
                    {pendingSubjects.length > 0 && (
                      <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                        <h3 className="text-xs font-black text-amber-500 mb-3 uppercase tracking-wider">{t('subj_pending_activation_title', 'Matières en attente d\'activation')}</h3>
                        <div className="space-y-3">
                          {pendingSubjects.map(ps => (
                            <div key={ps.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                              <div>
                                <div className="font-bold text-white text-sm">{ps.name}</div>
                                <div className="text-[10px] text-slate-500 font-bold uppercase">{ps.domain} • {ps.level} - {ps.section}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  maxLength={6}
                                  placeholder={t('subj_code_6_letters_placeholder', 'Code à 6 lettres')}
                                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-500 font-mono text-center w-32 uppercase"
                                  id={`code-input-${ps.id}`}
                                />
                                {ps.status === 'FAILED' ? (
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await (window.electronAPI as any).resendSubjectCode(ps.id);
                                          if (res?.error) throw new Error(res.error);
                                          showNotification(t('subj_resend_code_request_sent', 'Une nouvelle demande de code a été envoyée au développeur.'), "info");
                                          loadPendingSubjects();
                                        } catch (err: any) {
                                          showNotification(err.message, "error");
                                        }
                                      }}
                                      className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all"
                                    >
                                      {t('subj_resend_code', 'Renvoyer un code')}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        const inputEl = document.getElementById(`code-input-${ps.id}`) as HTMLInputElement;
                                        const code = inputEl?.value?.trim()?.toUpperCase();
                                        if (!code) {
                                          showNotification(t('subj_enter_code_prompt', 'Veuillez saisir le code'), "error");
                                          return;
                                        }
                                        try {
                                          const res = await (window.electronAPI as any).validateSubjectCode({ pendingId: ps.id, code });
                                          if (res?.error) throw new Error(res.error);
                                          showNotification(t('subj_validated_activated', 'Matière validée et activée avec succès !'), "success");
                                          loadPendingSubjects();
                                          loadData();
                                        } catch (err: any) {
                                          showNotification(err.message, "error");
                                          loadPendingSubjects();
                                        }
                                      }}
                                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition-all"
                                    >
                                      {t('subj_activate', 'Activer')}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleCancelPendingSubject(ps.id)}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all"
                                    title={t('subj_cancel_request_tooltip', 'Annuler la demande')}
                                  >
                                    {t('cancel', 'Annuler')}
                                  </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                      <h3 className="text-sm font-bold text-amber-500 uppercase">{t('subj_registered_subjects', 'Matières Enregistrées')}</h3>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <select
                          className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 flex-1"
                          value={filterLevel}
                          onChange={(e) => setFilterLevel(e.target.value)}
                        >
                          <option value="">{t('subj_all_levels', 'Tous Niveaux')}</option>
                          <option value="PRIMAIRE">{t('cycle_primary_label', 'Primaire')}</option>
                          <option value="MATERNELLE">{t('cycle_nursery_label', 'Maternelle')}</option>
                        </select>
                        <select
                          className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 flex-1"
                          value={filterSection}
                          onChange={(e) => setFilterSection(e.target.value)}
                        >
                          <option value="">{t('subj_all_sections', 'Toutes Sections')}</option>
                          <option value="FRANCOPHONE">{t('section_francophone_label', 'Francophone')}</option>
                          <option value="ANGLOPHONE">{t('section_anglophone_label', 'Anglophone')}</option>
                        </select>
                      </div>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-900 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
                                <th className="px-4 py-3">{t('subj_name_col', 'Nom')}</th>
                                <th className="px-4 py-3">{t('subj_level_section_col', 'Niveau / Section')}</th>
                                <th className="px-4 py-3 text-right">{t('actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 text-slate-300">
                            {globalSubjects
                                .filter(subj => (filterLevel ? subj.level === filterLevel : true))
                                .filter(subj => (filterSection ? subj.section === filterSection : true))
                                .map(subj => (
                                <tr key={subj.id} className="hover:bg-slate-800/50">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-sm text-white">{subj.name}</div>
                                        <div className="text-[10px] text-slate-500">{subj.domain}</div>
                                    </td>
                                    <td className="px-4 py-3 text-[10px] font-bold">
                                        {subj.level} - {subj.section}
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        <button onClick={() => setEditingSubject(subj)} className="p-1.5 text-slate-400 hover:text-amber-500"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteGlobalSubject(subj.id, subj.name)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                            {globalSubjects.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-xs italic">{t('subj_no_subject', 'Aucune matière.')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="w-full md:w-80 shrink-0">
                    <form onSubmit={editingSubject ? handleUpdateGlobalSubject : handleAddGlobalSubject} className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
                        <h3 className="text-sm font-bold text-white mb-4 uppercase flex items-center">
                            {editingSubject ? <Edit className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                            {editingSubject ? t('subj_edit_title', 'Modifier Matière') : t('subj_new_title', 'Nouvelle Matière')}
                        </h3>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('subject_name', 'Nom de la matière')}</label>
                            <input
                                required
                                type="text"
                                className="input-field w-full mt-1"
                                placeholder={t('subject_name_placeholder', 'Ex: Mathématiques')}
                                value={editingSubject ? editingSubject.name : newSubject.name}
                                onChange={(e) => editingSubject ? setEditingSubject({...editingSubject, name: e.target.value}) : setNewSubject({...newSubject, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('subject_domain', 'Domaine / Compétence')}</label>
                            <input
                                required
                                type="text"
                                className="input-field w-full mt-1"
                                placeholder={t('subject_domain_placeholder', 'Ex: Sciences et Technologie')}
                                value={editingSubject ? editingSubject.domain : newSubject.domain}
                                onChange={(e) => editingSubject ? setEditingSubject({...editingSubject, domain: e.target.value}) : setNewSubject({...newSubject, domain: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('section', 'Section')}</label>
                            <select
                                className="input-field w-full mt-1"
                                value={editingSubject ? editingSubject.section : newSubject.section}
                                onChange={(e) => editingSubject ? setEditingSubject({...editingSubject, section: e.target.value}) : setNewSubject({...newSubject, section: e.target.value})}
                            >
                                <option value="FRANCOPHONE">{t('section_francophone_label', 'Francophone')}</option>
                                <option value="ANGLOPHONE">{t('section_anglophone_label', 'Anglophone')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('cycle', 'Niveau')}</label>
                            <select
                                className="input-field w-full mt-1"
                                value={editingSubject ? editingSubject.level : newSubject.level}
                                onChange={(e) => editingSubject ? setEditingSubject({...editingSubject, level: e.target.value}) : setNewSubject({...newSubject, level: e.target.value})}
                            >
                                <option value="PRIMAIRE">{t('cycle_primary_label', 'Primaire')}</option>
                                <option value="MATERNELLE">{t('cycle_nursery_label', 'Maternelle')}</option>
                            </select>
                        </div>
                        
                        <div className="pt-2 flex gap-2">
                            {editingSubject && (
                                <button
                                    type="button"
                                    onClick={() => setEditingSubject(null)}
                                    className="px-4 py-3 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all"
                                >
                                    {t('cancel', 'Annuler')}
                                </button>
                            )}
                            <button
                                type="submit"
                                className="btn-primary flex-1 flex items-center justify-center"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {editingSubject ? t('update', 'Mettre à jour') : (requiresCode ? t('request_code', 'Demander un code') : t('add', 'Ajouter'))}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subjects;

