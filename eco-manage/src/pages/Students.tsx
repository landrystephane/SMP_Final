import React, { useEffect, useState } from 'react';
import { Search, UserPlus, Filter, Download, Trash2, Edit, FileText } from 'lucide-react';
import StudentForm from '../components/StudentForm';
import { generateRegistrationSheet } from '../utils/reports';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const Students: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<'FRANCOPHONE' | 'ANGLOPHONE' | 'ALL'>('ALL');
  const [selectedCycle, setSelectedCycle] = useState<'PRIMAIRE' | 'MATERNELLE' | 'ALL'>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);

  const loadData = async () => {
    if (window.electronAPI) {
      const s = await window.electronAPI.getStudents(user?.schoolId);
      const c = await window.electronAPI.getClasses(user?.schoolId);
      setStudents(s);
      setClasses(c);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteStudent = async (id: number) => {
      if (!window.confirm(t('confirm_delete_student'))) return;
      if (window.electronAPI) {
          try {
              await window.electronAPI.deleteStudent(id);
              loadData();
          } catch (err: any) {
              alert(err.message);
          }
      }
  };

  const filteredStudents = students.filter(s => {
    const matchSection = selectedSection === 'ALL' || s.section === selectedSection;
    const matchClass = selectedClass === 'ALL' || s.class_id.toString() === selectedClass;
    const classObj = classes.find(c => c.id === s.class_id);
    const matchCycle = selectedCycle === 'ALL' || (classObj && classObj.level === selectedCycle);
    const matchSearch = s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.matricule.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSection && matchClass && matchCycle && matchSearch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('student_management')}</h1>
          <p className="text-slate-400 mt-1">{t('student_management')} - {t('global_effectif')}</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center py-2 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {t('new_student')}
        </button>
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

        <div className="flex gap-2">
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

        <button className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white">
            <Filter className="w-4 h-4" />
        </button>
        <button className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white">
            <Download className="w-4 h-4" />
        </button>
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
                    <div className="font-bold text-white uppercase">{s.last_name}</div>
                    <div className="text-xs text-slate-500">{s.first_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.section === 'FRANCOPHONE' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                        {s.section}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    {classes.find(c => c.id === s.class_id)?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={s.gender === 'M' ? 'text-blue-400' : 'text-pink-400'}>{s.gender}</span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                        onClick={() => generateRegistrationSheet({ ...s, className: classes.find(c => c.id === s.class_id)?.name })}
                        className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-md transition-all"
                        title={t('registration_sheet_title')}
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingStudent(s)} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-md transition-all">
                        <Edit className="w-4 h-4" />
                    </button>
                    {user?.role === 'DIRECTOR' && (
                        <button
                            onClick={() => handleDeleteStudent(s.id)}
                            className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
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
                            alert(`Error: ${res.error}`);
                            return;
                        }
                        loadData();
                        setIsAdding(false);
                        setEditingStudent(null);
                    } catch (err: any) {
                        alert(err.message);
                    }
                }
            }}
        />
      )}
    </div>
  );
};

export default Students;
