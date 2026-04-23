import React, { useState } from 'react';
import { UserCheck, UserX, Search, Save } from 'lucide-react';

const Attendance: React.FC = () => {
  const [students, setStudents] = useState([
    { id: 1, name: 'MBARGA Jean Paul', status: 'PRESENT' },
    { id: 2, name: 'ATANGANA Marie', status: 'ABSENT' },
    { id: 3, name: 'BEKONO Alain', status: 'PRESENT' },
  ]);

  const toggleStatus = (id: number) => {
    setStudents(students.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'PRESENT' ? 'ABSENT' : 'PRESENT' };
      }
      return s;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Appel Quotidien</h1>
          <p className="text-slate-400 mt-1">Classe: SIL A | Date: {new Date().toLocaleDateString()}</p>
        </div>
        <button className="flex items-center px-6 py-2 bg-slate-gold-gold text-slate-900 rounded-lg font-bold hover:bg-yellow-500 transition-all">
          <Save className="w-5 h-5 mr-2" />
          Enregistrer l'appel
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Rechercher un élève..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-slate-gold-gold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => (
          <div
            key={student.id}
            onClick={() => toggleStatus(student.id)}
            className={`glass-card p-4 flex items-center justify-between cursor-pointer transition-all border-l-4 ${
              student.status === 'PRESENT' ? 'border-green-500 bg-green-500/5' : 'border-red-500 bg-red-500/5'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${student.status === 'PRESENT' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                {student.status === 'PRESENT' ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
              </div>
              <span className="font-semibold text-white">{student.name}</span>
            </div>
            <span className={`text-[10px] font-bold uppercase ${student.status === 'PRESENT' ? 'text-green-500' : 'text-red-500'}`}>
              {student.status === 'PRESENT' ? 'Présent' : 'Absent'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Attendance;
