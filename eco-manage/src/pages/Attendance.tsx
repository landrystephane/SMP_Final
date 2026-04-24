import React, { useState, useEffect } from 'react';
import { Search, Calendar } from 'lucide-react';

const Attendance: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadClasses = async () => {
      if (window.electronAPI) {
        const c = await window.electronAPI.getClasses();
        setClasses(c);
      }
    };
    loadClasses();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      if (window.electronAPI && selectedClass) {
        const allStudents = await window.electronAPI.getStudents();
        setStudents(allStudents.filter((s: any) => s.class_id.toString() === selectedClass));
      }
    };
    loadStudents();
  }, [selectedClass]);

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Appel & Présences</h1>
          <p className="text-slate-400 mt-1">Suivi quotidien de l'assiduité par salle de classe</p>
        </div>
        <div className="flex items-center bg-slate-800 border border-slate-700 p-2 rounded-lg text-white">
            <Calendar className="w-4 h-4 mr-2 text-slate-gold-gold" />
            <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="bg-transparent outline-none text-sm font-bold"
            />
        </div>
      </div>

      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <option value="">Choisir la section...</option>
            <option value="FRANCOPHONE">FRANCOPHONE</option>
            <option value="ANGLOPHONE">ANGLOPHONE</option>
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
            <option value="">Choisir la classe...</option>
            {classes.filter(c => c.section === selectedSection).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedClass ? (
          <div className="glass-card p-12 text-center text-slate-500 border-2 border-dashed border-slate-800">
              Veuillez sélectionner une salle de classe pour faire l'appel.
          </div>
      ) : (
          <div className="glass-card overflow-hidden">
            <div className="p-4 bg-white/5 flex items-center justify-between border-b border-white/5">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" placeholder="Rechercher un élève..." className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm" />
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-600 transition-all uppercase">
                        Tous présents
                    </button>
                    <button className="px-4 py-2 bg-slate-gold-gold text-slate-900 rounded-lg text-xs font-bold hover:bg-yellow-500 transition-all uppercase">
                        Enregistrer l'appel
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] uppercase text-slate-500 font-black border-b border-white/5">
                            <th className="px-6 py-4">Élève</th>
                            <th className="px-6 py-4 text-center">Présent</th>
                            <th className="px-6 py-4 text-center">Absent</th>
                            <th className="px-6 py-4 text-center">En retard</th>
                            <th className="px-6 py-4">Justification</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {students.map(student => (
                            <tr key={student.id} className="hover:bg-white/5">
                                <td className="px-6 py-4">
                                    <div className="text-white font-bold uppercase text-sm">{student.last_name}</div>
                                    <div className="text-[10px] text-slate-500">{student.first_name}</div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <input type="radio" name={`status-${student.id}`} className="w-4 h-4 accent-green-500" defaultChecked />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <input type="radio" name={`status-${student.id}`} className="w-4 h-4 accent-red-500" />
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <input type="radio" name={`status-${student.id}`} className="w-4 h-4 accent-yellow-500" />
                                </td>
                                <td className="px-6 py-4">
                                    <input type="text" placeholder="Note..." className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white w-full max-w-[150px]" />
                                </td>
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

export default Attendance;
