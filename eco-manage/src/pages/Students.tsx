import React, { useState, useEffect } from 'react';
import { UserPlus, Search, Filter } from 'lucide-react';
import StudentForm from '../components/StudentForm';

const Students: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);

  const loadStudents = async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getStudents();
      setStudents(data);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleAddStudent = async (data: any) => {
    if (window.electronAPI) {
      await window.electronAPI.addStudent(data);
      loadStudents();
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestion des Élèves</h1>
          <p className="text-slate-400 mt-1">Inscrivez et gérez les dossiers des élèves</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-slate-gold-gold text-slate-900 rounded-lg font-semibold hover:bg-yellow-500 transition-all"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Nouvel Élève
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un élève (Nom, Matricule...)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-slate-gold-gold outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700">
          <Filter className="w-5 h-5 mr-2" />
          Filtrer
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400 uppercase text-xs tracking-wider">
              <th className="px-4 py-3 font-medium">Matricule</th>
              <th className="px-4 py-3 font-medium">Nom complet</th>
              <th className="px-4 py-3 font-medium">Classe</th>
              <th className="px-4 py-3 font-medium">Section</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-300 divide-y divide-slate-800/50">
            {students.filter(s =>
              `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
              s.matricule.toLowerCase().includes(searchTerm.toLowerCase())
            ).map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-4 font-mono text-sm">{s.matricule}</td>
                <td className="px-4 py-4 uppercase font-semibold text-slate-100">{s.last_name} {s.first_name}</td>
                <td className="px-4 py-4">{s.class_id || 'N/A'}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                    s.section === 'FRANCOPHONE' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {s.section}
                  </span>
                </td>
                <td className="px-4 py-4 space-x-3">
                  <button className="text-slate-gold-gold hover:text-yellow-500 transition-colors text-sm font-medium">Modifier</button>
                  <button className="text-red-400 hover:text-red-300 transition-colors text-sm font-medium">Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <StudentForm
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddStudent}
        />
      )}
    </div>
  );
};

export default Students;
