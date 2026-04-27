import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ShieldCheck, CheckCircle2, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdminWorkflow: React.FC = () => {
  const { t: _t } = useTranslation();
  const [isSgActing, setIsSgActing] = useState(false);
  const [period, _setPeriod] = useState({
    term: 1,
    start: '2026-04-20',
    end: '2026-05-15',
    active: true,
    editingAllowed: true
  });

  const loadActingStatus = async () => {
    if (window.electronAPI) {
        const status = await window.electronAPI.getSetting('sg_acting_director');
        setIsSgActing(status === 'true');
    }
  };

  useEffect(() => {
    loadActingStatus();
  }, []);

  const toggleSgActing = async () => {
    if (window.electronAPI) {
        const newValue = !isSgActing;
        await window.electronAPI.setSetting({ key: 'sg_acting_director', value: newValue.toString() });
        setIsSgActing(newValue);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Contrôle Administratif</h1>
        <p className="text-slate-400 mt-1">Gestion des périodes de saisie et validations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Evaluation Period Control */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center space-x-3 text-slate-gold-gold">
            <Calendar className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Période d'Évaluation</h2>
          </div>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs uppercase text-slate-500 font-bold">Début</label>
                <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1" value={period.start} readOnly />
              </div>
              <div>
                <label className="text-xs uppercase text-slate-500 font-bold">Fin</label>
                <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white mt-1" value={period.end} readOnly />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-300">Autoriser la saisie des notes</span>
              <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${period.editingAllowed ? 'bg-green-500' : 'bg-slate-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${period.editingAllowed ? 'translate-x-6' : ''}`} />
              </div>
            </div>
            <button className="w-full py-2 bg-slate-gold-gold text-slate-900 rounded font-bold hover:bg-yellow-500 transition-colors">
              Mettre à jour la période
            </button>
          </div>
        </div>

        {/* SG Acting Director Toggle */}
        <div className="glass-card p-6 space-y-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-purple-400">
                <UserCheck className="w-6 h-6" />
                <h2 className="text-xl font-semibold">Suppléance du Directeur</h2>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            Activez cette option pour permettre au **Secrétaire Général** de valider les notes et les bulletins en l'absence du Directeur.
          </p>
          <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <div>
                <span className="text-white font-bold block text-sm">Mode Suppléance SG</span>
                <span className="text-[10px] text-slate-500 uppercase font-black">Actuellement: {isSgActing ? 'ACTIVÉ' : 'DÉSACTIVÉ'}</span>
            </div>
            <div
                onClick={toggleSgActing}
                className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-all duration-300 ${isSgActing ? 'bg-purple-500' : 'bg-slate-700'}`}
            >
                <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 ${isSgActing ? 'translate-x-7' : ''}`} />
            </div>
          </div>
        </div>

        {/* Validation Status */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center space-x-3 text-blue-400">
            <ShieldCheck className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Validation des Bulletins</h2>
          </div>
          <div className="space-y-3">
            {[
              { class: 'SIL A', status: 'READY', progress: 100 },
              { class: 'SIL B', status: 'IN_PROGRESS', progress: 75 },
              { class: 'CP', status: 'PENDING', progress: 10 },
            ].map((item) => (
              <div key={item.class} className="flex items-center justify-between p-3 border border-slate-700 rounded-lg">
                <div>
                  <span className="text-white font-medium">{item.class}</span>
                  <div className="w-32 h-1 bg-slate-700 rounded-full mt-1">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
                {item.status === 'READY' ? (
                  <button className="flex items-center text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded border border-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Valider
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 font-bold uppercase italic">En attente</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secretary Print Authorization */}
      <div className="glass-card p-6">
        <div className="flex items-center space-x-3 text-purple-400 mb-6">
          <Clock className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Autorisations d'Impression</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="pb-4">Classe</th>
                <th className="pb-4">Section</th>
                <th className="pb-4">Statut Directeur</th>
                <th className="pb-4">Action Secrétariat</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-slate-800">
                <td className="py-4 font-bold">SIL A</td>
                <td className="py-4">Francophone</td>
                <td className="py-4">
                  <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold">APPROUVÉ</span>
                </td>
                <td className="py-4">
                  <button className="text-slate-gold-gold hover:underline text-sm font-semibold">Lancer les impressions</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminWorkflow;
