import React, { useState, useEffect } from 'react';
import { Save, Lock, Unlock, FileText } from 'lucide-react';
import { generateReportCard } from '../utils/reports';

const Grades: React.FC = () => {
  const [sections, _setSections] = useState(['FRANCOPHONE', 'ANGLOPHONE']);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [selectedSection, setSelectedSection] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('Octobre');

  const [grades, setGrades] = useState<Record<string, number>>({});
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (window.electronAPI) {
        const c = await window.electronAPI.getClasses();
        const s = await window.electronAPI.getSubjects();
        setClasses(c);
        setSubjects(s);
      }
    };
    init();
  }, []);

  const handleLoadStudents = async () => {
    if (window.electronAPI && selectedClass) {
        const allStudents = await window.electronAPI.getStudents();
        setStudents(allStudents.filter((s: any) => s.class_id.toString() === selectedClass));

        const existingGrades = await window.electronAPI.getGrades({
            classId: parseInt(selectedClass),
            term: selectedTerm
        });

        const gradeMap: Record<string, number> = {};
        existingGrades.forEach((g: any) => {
            if (g.month === selectedMonth) {
                gradeMap[`${g.student_id}-${g.subject_id}`] = g.score;
                if (g.locked) setIsLocked(true);
            }
        });
        setGrades(gradeMap);
    }
  };

  useEffect(() => {
    if (selectedClass && selectedMonth) {
        handleLoadStudents();
        setIsLocked(false);
    }
  }, [selectedClass, selectedMonth, selectedTerm]);

  const handleSave = async () => {
    const formattedGrades = Object.entries(grades).map(([key, score]) => {
        const [studentId, subjectId] = key.split('-');
        return {
          student_id: parseInt(studentId),
          subject_id: parseInt(subjectId),
          class_id: parseInt(selectedClass),
          term: selectedTerm,
          month: selectedMonth,
          score: score,
          teacher_id: 1 // TODO: get from auth
        };
      });

    if (window.electronAPI) {
      const result = await window.electronAPI.saveGrades(formattedGrades);
      if (result.success) {
        setIsLocked(true);
        alert('Notes enregistrées et verrouillées !');
      } else {
        alert('Erreur: ' + result.error);
      }
    } else {
        // Mode Mobile (Smartphone Browser) - Sauvegarde locale avant synchronisation
        // On simule la sauvegarde pour l'utilisateur
        localStorage.setItem(`pending_grades_${selectedClass}_${selectedMonth}`, JSON.stringify(formattedGrades));
        alert('Notes sauvegardées localement sur votre téléphone. N\'oubliez pas de synchroniser dès que vous êtes connecté au réseau Wi-Fi de l\'école.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Saisie des Notes</h1>
          <p className="text-slate-400 mt-1">Évaluation mensuelle et trimestrielle</p>
        </div>
        <div className="flex space-x-2">
            <button
                onClick={() => generateReportCard({ lastName: 'EXEMPLE', firstName: 'Élève' } as any, [], "")}
                className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-lg font-bold text-xs hover:bg-blue-500/20 transition-all flex items-center"
            >
                <FileText className="w-4 h-4 mr-2" /> Aperçu Bulletin
            </button>
        </div>
      </div>

      {/* Sélecteurs de Contexte */}
      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Section</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1"
            value={selectedSection}
            onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedClass('');
            }}
          >
            <option value="">Choisir...</option>
            {sections.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Salle de Classe</label>
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1 disabled:opacity-50"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            disabled={!selectedSection}
          >
            <option value="">Choisir...</option>
            {classes.filter(c => c.section === selectedSection).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Trimestre</label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1"
            value={selectedTerm} onChange={(e) => setSelectedTerm(parseInt(e.target.value))}>
            <option value={1}>Trimestre 1</option>
            <option value={2}>Trimestre 2</option>
            <option value={3}>Trimestre 3</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Mois d'Évaluation</label>
          <select className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1"
            value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option>Octobre</option>
            <option>Novembre</option>
            <option>Décembre</option>
            <option>Janvier</option>
          </select>
        </div>
      </div>

      {!selectedClass ? (
          <div className="glass-card p-12 text-center text-slate-500">
              Veuillez sélectionner une section et une salle de classe pour commencer la saisie.
          </div>
      ) : (
          <div className="glass-card overflow-hidden">
            <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    {isLocked ? (
                        <span className="flex items-center text-xs font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full">
                            <Lock className="w-3 h-3 mr-1" /> VERROUILLÉ
                        </span>
                    ) : (
                        <span className="flex items-center text-xs font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full">
                            <Unlock className="w-3 h-3 mr-1" /> MODIFICATION AUTORISÉE
                        </span>
                    )}
                </div>
                <div className="space-x-4">
                    {!isLocked && (
                        <button
                            onClick={handleSave}
                            className="bg-slate-gold-gold text-slate-900 px-4 py-1.5 rounded-lg font-bold text-sm hover:bg-yellow-500 transition-colors inline-flex items-center"
                        >
                            <Save className="w-4 h-4 mr-2" /> Enregistrer & Verrouiller
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase text-slate-500 font-black border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 sticky left-0 bg-slate-900/50 backdrop-blur-md">Élèves</th>
                    {subjects.filter(s =>
                      s.level === classes.find(c => c.id.toString() === selectedClass)?.level &&
                      s.section === selectedSection
                    ).map(s => (
                      <th key={s.id} className="px-4 py-4 text-center min-w-[120px]">
                        <div className="truncate max-w-[100px] mx-auto">{s.name}</div>
                        <div className="text-[8px] text-slate-600">Coef: {s.coefficient}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {students.map(student => (
                    <tr key={student.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 sticky left-0 bg-slate-900/50 backdrop-blur-md">
                        <div className="text-white font-bold uppercase text-sm">{student.last_name}</div>
                        <div className="text-[10px] text-slate-500">{student.first_name}</div>
                      </td>
                      {subjects.filter(s =>
                        s.level === classes.find(c => c.id.toString() === selectedClass)?.level &&
                        s.section === selectedSection
                      ).map(subject => (
                        <td key={subject.id} className="px-4 py-4">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            disabled={isLocked}
                            value={grades[`${student.id}-${subject.id}`] || ''}
                            onChange={(e) => setGrades({
                                ...grades,
                                [`${student.id}-${subject.id}`]: parseFloat(e.target.value)
                            })}
                            className="w-16 bg-slate-800 border border-slate-700 rounded p-1.5 text-center text-white text-sm focus:border-slate-gold-gold outline-none disabled:opacity-50 disabled:bg-slate-900"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      )}
    </div>
  );
};

export default Grades;
