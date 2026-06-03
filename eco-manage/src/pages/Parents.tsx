import React, { useEffect, useState } from 'react';
import { Shield, Search, Users as UsersIcon, Filter, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { generateParentsListReport } from '../utils/reports';

const Parents: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [parents, setParents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [school, setSchool] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCycle, setFilterCycle] = useState('ALL');
  const [filterSection, setFilterSection] = useState('ALL');
  const [filterClass, setFilterClass] = useState('ALL');
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementSubject, setAnnouncementSubject] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [targetStudentId, setTargetStudentId] = useState<number | null>(null);

  const loadData = async () => {
    if (window.electronAPI && currentUser) {
      const p = await window.electronAPI.getParentsDirectory(currentUser.schoolId);
      const c = await window.electronAPI.getClasses(currentUser.schoolId);
      const schools = await window.electronAPI.getSchools();
      
      setParents(Array.isArray(p) ? p : []);
      setClasses(Array.isArray(c) ? c : []);
      
      const currentSchool = schools.find((s: any) => s.id?.toString() === currentUser.schoolId?.toString());
      setSchool(currentSchool);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const filteredParents = parents.filter(p => {
        const matchesSearch = (p.parent_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (p.parent_contact || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (p.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (p.last_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCycle = filterCycle === 'ALL' || p.cycle === filterCycle;
        const matchesSection = filterSection === 'ALL' || p.section === filterSection;
        const matchesClass = filterClass === 'ALL' || p.class_name === filterClass;

        return matchesSearch && matchesCycle && matchesSection && matchesClass;
  });

  const handlePrint = async () => {
      setIsPrinting(true);
      try {
          const title = `Liste des Parents ${filterClass !== 'ALL' ? '- ' + filterClass : (filterCycle !== 'ALL' ? '- ' + filterCycle : '')}`;
          await generateParentsListReport(filteredParents, school, title);
      } catch (err) {
          console.error("Erreur d'impression:", err);
      } finally {
          setIsPrinting(false);
      }
  };

  const handleSendAnnouncement = async () => {
      if (!window.electronAPI || !currentUser) return;
      if (!announcementSubject.trim() || !announcementMessage.trim()) {
          alert("Veuillez remplir le sujet et le message.");
          return;
      }
      setIsSending(true);
      try {
          const res = await window.electronAPI.sendParentAnnouncement({
              sender_id: currentUser.id,
              school_id: currentUser.schoolId,
              subject: announcementSubject,
              message: announcementMessage,
              filter_cycle: filterCycle,
              filter_section: filterSection,
              filter_class: filterClass,
              target_student_id: targetStudentId
          });
          
          if (res && res.success) {
              alert(`Communiqué envoyé avec succès à ${res.count} parent(s).`);
              setShowAnnouncementModal(false);
              setAnnouncementSubject('');
              setAnnouncementMessage('');
              setTargetStudentId(null);
          } else {
              alert("Erreur lors de l'envoi du communiqué.");
          }
      } catch (err) {
          console.error(err);
          alert("Une erreur s'est produite.");
      } finally {
          setIsSending(false);
      }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Répertoire des Parents</h1>
          <p className="text-slate-400 mt-1 uppercase text-xs font-black tracking-widest">Liste générée automatiquement à partir des élèves inscrits</p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-black text-amber-500 bg-amber-500/10 px-4 py-2 rounded-full uppercase tracking-widest border border-amber-500/20">
            <Shield className="w-4 h-4" />
            <span>{t('secure_server')}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-6 shadow-xl flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Cycle</label>
              <select className="input-field w-full" value={filterCycle} onChange={e => { setFilterCycle(e.target.value); setFilterClass('ALL'); }}>
                  <option value="ALL">Tous les cycles</option>
                  <option value="PRIMAIRE">Primaire</option>
                  <option value="MATERNELLE">Maternelle</option>
              </select>
          </div>
          <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Section</label>
              <select className="input-field w-full" value={filterSection} onChange={e => { setFilterSection(e.target.value); setFilterClass('ALL'); }}>
                  <option value="ALL">Toutes les sections</option>
                  <option value="FRANCOPHONE">Francophone</option>
                  <option value="ANGLOPHONE">Anglophone</option>
              </select>
          </div>
          <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Salle de classe</label>
              <select className="input-field w-full" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                  <option value="ALL">Toutes les classes</option>
                  {classes
                      .filter(c => (filterCycle === 'ALL' || c.level === filterCycle) && (filterSection === 'ALL' || c.section === filterSection))
                      .map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                  }
              </select>
          </div>
               <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
              <button 
                  onClick={() => { setTargetStudentId(null); setShowAnnouncementModal(true); }}
                  disabled={filteredParents.length === 0}
                  className="btn-secondary h-[46px] px-6 disabled:opacity-50 flex items-center justify-center flex-1 md:flex-none whitespace-nowrap"
              >
                  <Shield className="w-4 h-4 mr-2" />
                  Communiqué
              </button>
              <button 
                  onClick={handlePrint}
                  disabled={isPrinting || filteredParents.length === 0}
                  className="btn-primary h-[46px] px-6 disabled:opacity-50 flex items-center justify-center flex-1 md:flex-none whitespace-nowrap"
              >
                  <Printer className="w-4 h-4 mr-2" />
                  {isPrinting ? "Génération..." : "Imprimer"}
              </button>
          </div>
      </div>

      <div className="glass-card shadow-2xl border-none overflow-hidden flex flex-col">
          <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center bg-slate-900/80 gap-4">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center italic">
                <UsersIcon className="w-7 h-7 mr-4 text-emerald-500" />
                Liste des Parents ({filteredParents.length})
            </h2>
            <div className="relative group min-w-[250px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                <input
                    type="text"
                    placeholder="Rechercher par nom ou numéro..."
                    className="bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-6 py-2.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500 transition-all w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                  <th className="px-8 py-6">Identité du Parent</th>
                  <th className="px-8 py-6">Contact / Login</th>
                  <th className="px-8 py-6">Enfant(s) rattaché(s)</th>
                  <th className="px-8 py-6">Salle de Classe</th>
                  <th className="px-8 py-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-slate-900/30">
                {filteredParents.map((p, index) => (
                  <tr key={`${p.student_id}-${index}`} className="hover:bg-amber-500/[0.03] transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-500 flex items-center justify-center mr-5 text-lg font-black border border-white/5 shadow-inner group-hover:bg-amber-500 group-hover:text-slate-950 transition-all duration-300">
                          {(p.parent_name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-black text-white uppercase text-base tracking-tight group-hover:text-amber-500 transition-colors">
                                {p.parent_name || 'Non renseigné'}
                            </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                        <span className="text-[11px] font-mono font-black bg-slate-950 border border-white/5 px-3 py-1.5 rounded-xl text-slate-400 group-hover:text-amber-500 transition-colors shadow-inner">{p.parent_contact || 'N/A'}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-bold text-slate-300 group-hover:text-white transition-colors">
                        {p.first_name} {p.last_name}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:border-amber-500/30 group-hover:text-amber-500 transition-all">
                            {p.class_name} ({p.section})
                        </span>
                    </td>
                    <td className="px-8 py-6">
                        <button
                            onClick={() => { setTargetStudentId(p.student_id); setShowAnnouncementModal(true); }}
                            className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-slate-950 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center"
                        >
                            <Shield className="w-3 h-3 mr-1" /> Message
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>

      {/* Announcement Modal */}
      {showAnnouncementModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-white/5 bg-slate-800/50 flex items-center justify-between">
                      <div>
                          <h3 className="text-xl font-black text-white">Envoyer un Communiqué</h3>
                          <p className="text-xs text-slate-400 mt-1">
                              Destinataires: {targetStudentId ? "1 parent" : `${filteredParents.length} parent(s) correspondant aux filtres`}
                          </p>
                      </div>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Sujet de l'annonce</label>
                          <input 
                              type="text"
                              value={announcementSubject}
                              onChange={(e) => setAnnouncementSubject(e.target.value)}
                              placeholder="Ex: Réunion des parents, Jour férié..."
                              className="input-field w-full text-sm font-bold"
                          />
                      </div>
                      <div>
                          <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Contenu du message</label>
                          <textarea 
                              value={announcementMessage}
                              onChange={(e) => setAnnouncementMessage(e.target.value)}
                              placeholder="Écrivez votre message ici..."
                              className="input-field w-full h-32 text-sm resize-none"
                          ></textarea>
                      </div>
                  </div>
                  <div className="p-6 border-t border-white/5 bg-slate-950 flex justify-end gap-3">
                      <button 
                          onClick={() => { setShowAnnouncementModal(false); setTargetStudentId(null); }}
                          className="flex-1 px-6 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                      >
                          Annuler
                      </button>
                      <button 
                          onClick={handleSendAnnouncement}
                          disabled={isSending || !announcementSubject || !announcementMessage}
                          className="btn-primary px-8 py-2 disabled:opacity-50 flex items-center"
                      >
                          {isSending ? "Envoi..." : "Envoyer"}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Parents;
