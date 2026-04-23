import React, { useState } from 'react';
import { Send, MessageSquare, History } from 'lucide-react';

const Tickets: React.FC = () => {
  const [tickets] = useState([
    { id: 1, subject: 'Déblocage de note', message: 'Erreur de saisie pour MBARGA Jean Paul', status: 'OPEN', date: '2026-04-23' },
    { id: 2, subject: 'Matériel manquant', message: 'Besoin de craies pour la SIL A', status: 'CLOSED', date: '2026-04-22' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Tickets & Requêtes</h1>
          <p className="text-slate-400 mt-1">Envoyez vos demandes à l'administration</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-slate-gold-gold text-slate-900 rounded-lg font-semibold hover:bg-yellow-500 transition-all">
          <Send className="w-5 h-5 mr-2" />
          Nouvelle Requête
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <History className="w-5 h-5 mr-2 text-slate-gold-gold" />
            Historique des demandes
          </h2>
          {tickets.map((t) => (
            <div key={t.id} className="glass-card p-6 border-l-4 border-slate-gold-gold/30">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">{t.subject}</h3>
                  <p className="text-slate-400 text-sm mt-1">{t.message}</p>
                  <span className="text-[10px] text-slate-500 mt-2 block uppercase">{t.date}</span>
                </div>
                <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                  t.status === 'OPEN' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'
                }`}>
                  {t.status === 'OPEN' ? 'EN ATTENTE' : 'RÉSOLU'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-blue-400" />
            Messagerie Interne
          </h2>
          <div className="glass-card h-80 flex flex-col">
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              <div className="bg-slate-800 p-2 rounded-lg text-xs max-w-[80%]">
                <p className="text-slate-400 font-bold mb-1">Directeur</p>
                <p className="text-white">N'oubliez pas la réunion de demain à 8h.</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg text-xs max-w-[80%] self-end ml-auto">
                <p className="text-blue-400 font-bold mb-1">Moi</p>
                <p className="text-white">Bien reçu Monsieur le Directeur.</p>
              </div>
            </div>
            <div className="p-3 border-t border-slate-700 flex space-x-2">
              <input
                placeholder="Votre message..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded p-1 text-xs text-white outline-none"
              />
              <button className="bg-slate-gold-gold p-1 rounded text-slate-900"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tickets;
