import React, { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, Download, Trash2, Edit, FileText, Lock, Unlock, Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import StudentForm from '../components/StudentForm';
import { generateRegistrationSheet, generateStudentsListReport } from '../utils/reports';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { notifyDataChanged } from '../utils/dataSync';

const Students: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE' | 'ALL'>('ALL');
  const [selectedCycle, setSelectedCycle] = useState<'PRIMAIRE' | 'MATERNELLE' | 'ALL'>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: { row: number; message: string }[] } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    if (window.electronAPI) {
      const s = await window.electronAPI.getStudents(user?.schoolId);
      const c = await window.electronAPI.getClasses(user?.schoolId);
      const schools = await window.electronAPI.getSchools();
      const currentSchool = schools.find((sch: any) => Number(sch.id) === Number(user?.schoolId));
      
      setStudents(s);
      setClasses(c);
      setSchoolInfo(currentSchool);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.schoolId]);

  const handleDeleteStudent = async (id: number) => {
      if (!window.confirm(t('confirm_delete_student', "Êtes-vous sûr de vouloir supprimer cet élève ?"))) return;
      if (window.electronAPI) {
          try {
              await window.electronAPI.deleteStudent(id);
              showNotification(t('student_deleted_success', "Élève supprimé avec succès"), "success");
              loadData();
              notifyDataChanged();
          } catch (err: any) {
              showNotification(err.message, "error");
          }
      }
  };

  const handleToggleBlockStatus = async (student: any) => {
      const newStatus = student.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
      const confirmMsg = newStatus === 'BLOCKED'
          ? t('confirm_block_student', "Voulez-vous vraiment bloquer cet élève ? Il n'aura plus accès à certaines fonctionnalités.")
          : t('confirm_unblock_student', "Voulez-vous débloquer cet élève ?");
      if (!window.confirm(confirmMsg)) return;

      if (window.electronAPI) {
          try {
              await window.electronAPI.updateStudentStatus({ id: student.id, status: newStatus });
              showNotification(
                  newStatus === 'BLOCKED'
                      ? t('student_blocked_success', 'Élève bloqué avec succès')
                      : t('student_unblocked_success', 'Élève débloqué avec succès'),
                  "success"
              );
              loadData();
              notifyDataChanged();
          } catch (err: any) {
              showNotification(err.message, "error");
          }
      }
  };

  const filteredStudents = students.filter(s => {
    const matchSection = selectedSection === 'ALL' || s.section === selectedSection;
    const matchClass = selectedClass === 'ALL' || s.class_id?.toString() === selectedClass?.toString();
    const classObj = classes.find(c => c.id === s.class_id);
    const matchCycle = selectedCycle === 'ALL' || (classObj && classObj.level === selectedCycle);
    const matchSearch = (s.last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (s.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (s.matricule || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchSection && matchClass && matchCycle && matchSearch;
  });

  const parseCSV = (text: string): any[] => {
    const clean = text.replace(/^﻿/, '');
    const lines = clean.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === ',' && !inQ) {
          result.push(cur.trim()); cur = '';
        } else { cur += ch; }
      }
      result.push(cur.trim());
      return result;
    };

    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '_');

    const colMap: Record<string, string> = {
      prenom: 'firstName', nom: 'lastName',
      date_naissance: 'birthDate', date_de_naissance: 'birthDate',
      lieu_naissance: 'birthPlace', lieu_de_naissance: 'birthPlace',
      genre: 'gender', sexe: 'gender',
      section: 'section',
      classe: 'className', class: 'className',
      nom_parent: 'parentName', nom_du_parent: 'parentName',
      contact_parent: 'parentContact', telephone_parent: 'parentContact',
      contact_urgence: 'emergencyContact',
      quartier: 'neighborhood', adresse: 'neighborhood',
    };

    const headers = parseRow(lines[0]).map(normalize);

    const normalizeDate = (d: string): string => {
      if (!d) return '';
      const parts = d.split('/');
      if (parts.length === 3 && parts[2].length === 4)
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      return d;
    };

    return lines.slice(1).map((line, i) => {
      const vals = parseRow(line);
      const row: any = { _row: i + 2 };
      headers.forEach((h, idx) => { row[colMap[h] || h] = vals[idx] || ''; });
      if (row.birthDate) row.birthDate = normalizeDate(row.birthDate);
      if (row.gender) row.gender = row.gender.toUpperCase().charAt(0);
      if (row.section) row.section = row.section.toUpperCase();
      return row;
    });
  };

  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target?.result as string);
      setCsvRows(rows);
      setImportResult(null);
      setImportModalOpen(true);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!window.electronAPI) return;
    setIsImporting(true);
    try {
      const result = await (window.electronAPI as any).importStudents({ rows: csvRows, schoolId: user?.schoolId });
      setImportResult(result);
      if (result.success > 0) { loadData(); notifyDataChanged(); }
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'Prenom,Nom,Date_Naissance,Lieu_Naissance,Genre,Section,Classe,Nom_Parent,Contact_Parent,Contact_Urgence,Quartier\nJean,Dupont,2015-03-12,Yaoundé,M,FRANCOPHONE,CP1,Marie Dupont,+237612345678,,Bastos';
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'modele_import_eleves.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const getReportTitle = () => {
      let title = t('students_list', 'LISTE DES ÉLÈVES');
      if (selectedClass !== 'ALL') {
          const c = classes.find(c => c.id?.toString() === selectedClass?.toString());
          if (c) title += ` - ${t('class_header')} ${c.name}`;
      } else if (selectedCycle !== 'ALL' || selectedSection !== 'ALL') {
          title += ` - ${selectedCycle !== 'ALL' ? selectedCycle : ''} ${selectedSection !== 'ALL' ? selectedSection : ''}`.trim();
      }
      return title;
  };

  const stats = {
      total: filteredStudents.length,
      boys: filteredStudents.filter(s => s.gender === 'M').length,
      girls: filteredStudents.filter(s => s.gender === 'F').length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('student_management')}</h1>
          <p className="text-slate-400 mt-1">{t('student_management')} - {t('global_effectif')}</p>
        </div>
        {['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'SG'].includes(user?.role || '') && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center justify-center py-2 px-4 bg-slate-700 text-slate-300 rounded-lg font-bold hover:bg-slate-600 transition-colors text-sm"
              title="Télécharger le modèle CSV"
            >
              <Download className="w-4 h-4 mr-2" />
              Modèle CSV
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex items-center justify-center py-2 px-4 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors text-sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importer CSV
            </button>
            <input ref={importInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFile} />
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center py-2 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t('new_student')}
            </button>
          </div>
        )}
      </div>

      {/* Barre de Filtres */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
            <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-bold uppercase"
                value={selectedSection}
                onChange={(e) => {
                    setSelectedSection(e.target.value as any);
                    setSelectedClass('ALL');
                }}
            >
                <option value="ALL">{t('all_sections')}</option>
                <option value="FRANCOPHONE">{t('section_francophone')}</option>
                <option value="ANGLOPHONE">{t('section_anglophone')}</option>
            </select>

            <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-bold uppercase"
                value={selectedCycle}
                onChange={(e) => {
                    setSelectedCycle(e.target.value as any);
                    setSelectedClass('ALL');
                }}
            >
                <option value="ALL">{t('all_cycles')}</option>
                <option value="PRIMAIRE">{t('cycle_primary')}</option>
                <option value="MATERNELLE">{t('cycle_nursery')}</option>
            </select>

            <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-bold uppercase"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
            >
                <option value="ALL">{t('all_classes')}</option>
                {classes
                    .filter(c => (selectedSection === 'ALL' || c.section === selectedSection) && (selectedCycle === 'ALL' || c.level === selectedCycle))
                    .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                }
            </select>
        </div>

        <button 
            onClick={() => generateStudentsListReport({ students: filteredStudents, classes, school: schoolInfo, title: getReportTitle() })}
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white"
            title={t('download_list', 'Télécharger la liste')}
        >
            <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Statistiques Rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="glass-card p-4 text-center">
              <div className="text-sm text-slate-400 font-bold uppercase tracking-wider">{t('total_students', 'Effectif Total')}</div>
              <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
          </div>
          <div className="glass-card p-4 text-center">
              <div className="text-sm text-blue-400 font-bold uppercase tracking-wider">{t('boys', 'Garçons')}</div>
              <div className="text-2xl font-black text-blue-400 mt-1">{stats.boys}</div>
          </div>
          <div className="glass-card p-4 text-center">
              <div className="text-sm text-pink-400 font-bold uppercase tracking-wider">{t('girls', 'Filles')}</div>
              <div className="text-2xl font-black text-pink-400 mt-1">{stats.girls}</div>
          </div>
      </div>

      {/* Liste des Élèves */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-white/5">
                <th className="px-6 py-4">{t('matricule')}</th>
                <th className="px-6 py-4">{t('full_name')}</th>
                <th className="px-6 py-4">{t('section')}</th>
                <th className="px-6 py-4">{t('class')}</th>
                <th className="px-6 py-4">{t('gender_header')}</th>
                <th className="px-6 py-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 divide-y divide-white/5">
              {filteredStudents.length > 0 ? filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono text-blue-400">{s.matricule}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="font-bold text-white uppercase">{s.last_name}</div>
                        {s.status === 'BLOCKED' && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20" title={t('blocked_tooltip', "Cet élève a été bloqué par l'administration.")}>
                                {t('blocked_badge', 'Bloqué')}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-slate-500">{s.first_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.section === 'FRANCOPHONE' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                        {s.section}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    <div className="flex items-center gap-2">
                        {classes.find(c => c.id === s.class_id)?.name || 'N/A'}
                        {s.has_paid_registration === 0 && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20" title={t('not_registered_tooltip', "Cet élève n'a pas encore payé son inscription complète et est donc inactif dans la salle de classe.")}>
                                {t('not_registered_badge', 'Non-Inscrit')}
                            </span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={s.gender === 'M' ? 'text-blue-400' : 'text-pink-400'}>{s.gender}</span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {s.has_paid_registration === 1 && (
                    <button
                        onClick={() => {
                            if (s.status === 'BLOCKED') {
                                showNotification(t('student_blocked_no_action', "Cet élève est bloqué. Aucune action n'est possible (y compris l'impression)."), "error");
                                return;
                            }
                            generateRegistrationSheet({ ...s, className: classes.find(c => c.id === s.class_id)?.name }, schoolInfo);
                        }}
                        className={`p-1.5 rounded-md transition-all ${s.status === 'BLOCKED' ? 'text-slate-700 cursor-not-allowed' : 'text-blue-400 hover:text-white hover:bg-blue-500/20'}`}
                        title={s.status === 'BLOCKED' ? t('student_blocked_no_action', "Cet élève est bloqué. Aucune action n'est possible (y compris l'impression).") : t('registration_sheet_title')}
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                    )}
                    {['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'SG'].includes(user?.role || '') && (
                    <button onClick={() => setEditingStudent(s)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-all">
                        <Edit className="w-4 h-4" />
                    </button>
                    )}
                    {['SUPERADMIN', 'FOUNDER', 'DIRECTOR'].includes(user?.role || '') && (
                        <>
                            <button
                                onClick={() => handleToggleBlockStatus(s)}
                                className={`p-1.5 rounded-md transition-all ${s.status === 'BLOCKED' ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-400' : 'text-amber-500 hover:bg-amber-500/10 hover:text-amber-400'}`}
                                title={s.status === 'BLOCKED' ? t('unblock_student_tooltip', 'Débloquer cet élève') : t('block_student_tooltip', 'Bloquer cet élève')}
                            >
                                {s.status === 'BLOCKED' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={() => handleDeleteStudent(s.id)}
                                className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                title={t('delete_student_tooltip', 'Supprimer cet élève')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                        {t('no_students_found')}
                    </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {importModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-white">
                {importResult ? 'Résultat de l\'import' : `Aperçu — ${csvRows.length} élève${csvRows.length > 1 ? 's' : ''} à importer`}
              </h2>
              <button onClick={() => { setImportModalOpen(false); setImportResult(null); setCsvRows([]); }} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!importResult ? (
              <>
                <div className="overflow-x-auto mb-6 rounded-xl border border-white/5">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-white/5 text-slate-500 uppercase font-black">
                      <tr>
                        <th className="px-3 py-2">Ligne</th>
                        <th className="px-3 py-2">Prénom</th>
                        <th className="px-3 py-2">Nom</th>
                        <th className="px-3 py-2">Naissance</th>
                        <th className="px-3 py-2">G</th>
                        <th className="px-3 py-2">Section</th>
                        <th className="px-3 py-2">Classe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {csvRows.slice(0, 8).map((r, i) => (
                        <tr key={i} className="hover:bg-white/5">
                          <td className="px-3 py-2 text-slate-500">{r._row}</td>
                          <td className="px-3 py-2">{r.firstName}</td>
                          <td className="px-3 py-2 font-bold text-white">{r.lastName}</td>
                          <td className="px-3 py-2">{r.birthDate}</td>
                          <td className="px-3 py-2">{r.gender}</td>
                          <td className="px-3 py-2">{r.section}</td>
                          <td className="px-3 py-2 text-blue-400">{r.className}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvRows.length > 8 && (
                    <p className="text-center text-slate-500 text-xs py-2">… et {csvRows.length - 8} autres élèves</p>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-6">
                  Colonnes obligatoires : <span className="text-amber-400 font-bold">Prenom, Nom, Date_Naissance, Genre, Section, Classe</span>.<br />
                  Optionnelles : Lieu_Naissance, Nom_Parent, Contact_Parent, Contact_Urgence, Quartier.
                </p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setImportModalOpen(false); setCsvRows([]); }} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold hover:bg-slate-600">
                    Annuler
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={isImporting || csvRows.length === 0}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-black hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {isImporting ? 'Import en cours…' : `Importer ${csvRows.length} élève${csvRows.length > 1 ? 's' : ''}`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${importResult.success > 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800'}`}>
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <p className="text-white font-bold">
                    <span className="text-emerald-400 text-xl">{importResult.success}</span> élève{importResult.success > 1 ? 's' : ''} importé{importResult.success > 1 ? 's' : ''} avec succès
                  </p>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <p className="text-rose-400 font-black text-xs uppercase tracking-widest">{importResult.errors.length} erreur{importResult.errors.length > 1 ? 's' : ''}</p>
                    </div>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                      {importResult.errors.map((e, i) => (
                        <li key={i} className="text-xs text-slate-400">{e.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={() => { setImportModalOpen(false); setImportResult(null); setCsvRows([]); }} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-black hover:bg-blue-700">
                    Fermer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {(isAdding || editingStudent) && (
        <StudentForm
            student={editingStudent}
            onClose={() => { setIsAdding(false); setEditingStudent(null); }}
            onSubmit={async (data) => {
                if (window.electronAPI) {
                    try {
                        let res;
                        if (editingStudent) {
                            res = await window.electronAPI.updateStudent({ ...data, id: editingStudent.id });
                        } else {
                            res = await window.electronAPI.addStudent({ ...data, schoolId: user?.schoolId });
                        }
                        if (res && res.error) {
                            showNotification(`${t('error_prefix', 'Erreur')}: ${res.error}`, "error");
                            return;
                        }
                        showNotification(
                            editingStudent
                                ? t('student_updated_success', "Informations de l'élève mises à jour avec succès")
                                : t('student_added_success', "L'élève a été enregistré avec succès"),
                            "success"
                        );
                        loadData();
                        notifyDataChanged();
                        setIsAdding(false);
                        setEditingStudent(null);
                    } catch (err: any) {
                        showNotification(err.message, "error");
                    }
                }
            }}
        />
      )}
    </div>
  );
};

export default Students;
