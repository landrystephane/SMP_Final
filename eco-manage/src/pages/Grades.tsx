import React, { useState } from 'react';
import { Save, Lock, Unlock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Grades: React.FC = () => {
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [grades, setGrades] = useState([
    { id: 1, name: 'MBARGA Jean Paul', note: '' },
    { id: 2, name: 'ATANGANA Marie', note: '' },
  ]);

  const handleSave = () => {
    setIsLocked(true);
    console.log('Notes enregistrées et verrouillées');
  };

  const handleUnlock = () => {
    if (user?.role === 'DIRECTOR' || user?.role === 'FOUNDER') {
      setIsLocked(false);
    } else {
      alert('Seul le directeur peut déverrouiller les notes.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Saisie des Notes</h1>
          <p className="text-slate-400 mt-1">Mois: Octobre | Matière: Mathématiques | Classe: SIL</p>
        </div>
        <div className="flex space-x-3">
          {isLocked ? (
            <button
              onClick={handleUnlock}
              className="flex items-center px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg font-semibold hover:bg-red-500/20 transition-all"
            >
              <Unlock className="w-5 h-5 mr-2" />
              Déverrouiller
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
            >
              <Save className="w-5 h-5 mr-2" />
              Enregistrer
            </button>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-slate-400 uppercase text-xs tracking-wider">
              <th className="px-6 py-4 font-medium">Nom de l'élève</th>
              <th className="px-6 py-4 font-medium w-32">Note / 20</th>
              <th className="px-6 py-4 font-medium">Appréciation</th>
              <th className="px-6 py-4 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="text-slate-300 divide-y divide-slate-800/50">
            {grades.map((student) => (
              <tr key={student.id}>
                <td className="px-6 py-4 font-semibold">{student.name}</td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    disabled={isLocked}
                    className="w-20 bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none focus:border-slate-gold-gold disabled:opacity-50 disabled:cursor-not-allowed"
                    value={student.note}
                    onChange={(e) => {
                        const newGrades = grades.map(g => g.id === student.id ? {...g, note: e.target.value} : g);
                        setGrades(newGrades);
                    }}
                  />
                </td>
                <td className="px-6 py-4">
                  {student.note && (
                    <span className="text-sm font-medium">
                      {parseFloat(student.note) >= 18 ? 'Expert' :
                       parseFloat(student.note) >= 15 ? 'Acquis' :
                       parseFloat(student.note) >= 11 ? 'En cours d\'acquisition' : 'Non acquis'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {isLocked ? (
                    <span className="flex items-center text-red-400 text-xs font-bold uppercase">
                      <Lock className="w-3 h-3 mr-1" /> Verrouillé
                    </span>
                  ) : (
                    <span className="flex items-center text-green-400 text-xs font-bold uppercase">
                      <Unlock className="w-3 h-3 mr-1" /> Éditable
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Grades;
