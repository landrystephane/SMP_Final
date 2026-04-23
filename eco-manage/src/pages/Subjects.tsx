import React, { useState } from 'react';
import { Plus, Globe } from 'lucide-react';

const Subjects: React.FC = () => {
  const [subjects] = useState([
    { id: 1, name: 'Langue Française', section: 'FRANCOPHONE', domain: 'Langues et Communication', coef: 5 },
    { id: 2, name: 'English Language', section: 'ANGLOPHONE', domain: 'Languages & Communication', coef: 5 },
    { id: 3, name: 'Mathématiques', section: 'FRANCOPHONE', domain: 'Sciences et Techno', coef: 4 },
    { id: 4, name: 'Mathematics', section: 'ANGLOPHONE', domain: 'Science & Tech', coef: 4 },
    { id: 5, name: 'Activités Langagières', section: 'FRANCOPHONE', level: 'MATERNELLE', domain: 'Langue', coef: 1 },
    { id: 6, name: 'Language Activities', section: 'ANGLOPHONE', level: 'MATERNELLE', domain: 'Language', coef: 1 },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestion des Matières</h1>
          <p className="text-slate-400 mt-1">Définissez les programmes par section et par niveau</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-slate-gold-gold text-slate-900 rounded-lg font-semibold hover:bg-yellow-500 transition-all">
          <Plus className="w-5 h-5 mr-2" />
          Nouvelle Matière
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Francophone Section */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-6 text-blue-400">
            <Globe className="w-6 h-6" />
            <h2 className="text-xl font-bold uppercase tracking-tight">Section Francophone</h2>
          </div>
          <div className="space-y-4">
            {subjects.filter(s => s.section === 'FRANCOPHONE').map(s => (
              <div key={s.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-white font-semibold">{s.name}</p>
                  <p className="text-[10px] text-slate-500 italic">{s.domain}</p>
                </div>
                <span className="bg-slate-700 text-slate-gold-gold px-2 py-1 rounded text-xs font-bold">Coef: {s.coef}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Anglophone Section */}
        <div className="glass-card p-6">
          <div className="flex items-center space-x-3 mb-6 text-red-400">
            <Globe className="w-6 h-6" />
            <h2 className="text-xl font-bold uppercase tracking-tight">Anglophone Section</h2>
          </div>
          <div className="space-y-4">
            {subjects.filter(s => s.section === 'ANGLOPHONE').map(s => (
              <div key={s.id} className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-white font-semibold">{s.name}</p>
                  <p className="text-[10px] text-slate-500 italic">{s.domain}</p>
                </div>
                <span className="bg-slate-700 text-slate-gold-gold px-2 py-1 rounded text-xs font-bold">Coef: {s.coef}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subjects;
