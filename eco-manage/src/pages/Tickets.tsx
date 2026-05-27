import React, { useState, useEffect } from 'react';
import { Send, MessageSquare, History, Megaphone, Users, Award, ShieldAlert, CheckCircle, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const Tickets: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'announcements' | 'tickets'>('announcements');
  
  // States for tickets/requests
  const [tickets, setTickets] = useState<any[]>([]);
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState(t('internal_message_default', 'Message interne'));

  // States for announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnTarget, setNewAnnTarget] = useState<'ALL' | 'STAFF' | 'PARENTS'>('ALL');

  const canPublish = ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'SG', 'SECRETARY'].includes(user?.role || '');

  const loadData = async () => {
    if (window.electronAPI && user) {
        try {
            const ticketData = await window.electronAPI.getTickets({ userId: user.id, role: user.role, schoolId: user.schoolId });
            setTickets(ticketData || []);

            const annData = await window.electronAPI.getAnnouncements(user.schoolId);
            setAnnouncements(annData || []);
        } catch (err) {
            console.error('Failed to load data', err);
        }
    }
  };

  useEffect(() => {
      loadData();
  }, [user]);

  const handleSendTicket = async () => {
      if (!newTicketMessage.trim() || !window.electronAPI || !user) return;
      try {
          await window.electronAPI.sendTicket({
              sender_id: user.id,
              receiver_role: 'DIRECTOR',
              subject: newTicketSubject,
              message: newTicketMessage,
              school_id: user.schoolId
          });
          setNewTicketMessage('');
          setNewTicketSubject('Message interne');
          loadData();
      } catch (err: any) {
          alert(err.message);
      }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAnnTitle.trim() || !newAnnContent.trim() || !window.electronAPI || !user) return;
      try {
          await window.electronAPI.sendAnnouncement({
              sender_id: user.id,
              target: newAnnTarget,
              title: newAnnTitle,
              content: newAnnContent,
              school_id: user.schoolId
          });
          setNewAnnTitle('');
          setNewAnnContent('');
          setNewAnnTarget('ALL');
          alert(t('announcement_success', 'Communiqué diffusé avec succès !'));
          loadData();
      } catch (err: any) {
          alert(err.message);
      }
  };

  const visibleAnnouncements = announcements.filter(a => {
      if (!user) return false;
      if (['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'SG', 'SECRETARY'].includes(user.role)) {
          return true; // Administrators see everything
      }
      if (a.target === 'ALL') return true;
      if (a.target === 'STAFF' && user.role !== 'PARENT') return true;
      if (a.target === 'PARENTS' && user.role === 'PARENT') return true;
      return false;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header de la page */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-amber-500" />
            {t('communication_center', 'Centre de Communication')}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">{t('communication_desc', 'Diffusez des communiqués ciblés ou envoyez vos requêtes administratives')}</p>
        </div>
      </div>

      {/* Navigation Onglets */}
      <div className="flex border-b border-white/5 space-x-4">
        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all gap-2 ${
            activeTab === 'announcements'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          {t('tab_announcements', 'Communiqués & Diffusions')}
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center pb-4 px-2 text-sm font-black uppercase tracking-widest border-b-2 transition-all gap-2 ${
            activeTab === 'tickets'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          {t('tab_tickets', 'Tickets & Requêtes internes')}
        </button>
      </div>

      {/* Rendu des Onglets */}
      {activeTab === 'announcements' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Flux de communiqués */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-500" />
              {t('announcements_feed', 'Flux d\'Annonces & Communiqués')}
            </h2>

            {visibleAnnouncements.length === 0 ? (
              <div className="glass-card p-12 text-center text-slate-500 italic rounded-2xl border border-white/5">
                {t('no_announcements', 'Aucun communiqué n\'a été publié pour le moment.')}
              </div>
            ) : (
              <div className="space-y-4">
                {visibleAnnouncements.map((a) => (
                  <div key={a.id} className="glass-card p-6 border-l-4 border-amber-500/50 hover:border-amber-500 transition-all space-y-3">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">{a.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t('published_by', 'Diffusé par')} <span className="text-amber-500 font-semibold">{a.sender_name || t('administration')}</span>
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        a.target === 'ALL' 
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                          : a.target === 'STAFF' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : 'bg-green-500/10 text-green-400 border border-green-500/20'
                      }`}>
                        {t('target_audience', 'Cible')} : {a.target === 'ALL' ? t('target_all', 'Tous') : a.target === 'STAFF' ? t('target_staff', 'Personnels') : t('target_parents', 'Parents')}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{a.content}</p>

                    <div className="text-[10px] text-slate-500 flex justify-between items-center pt-2 border-t border-white/5">
                      <span>Établissement Eco-Hub</span>
                      <span>{new Date(a.created_at).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulaire de Publication (Administratifs seulement) */}
          <div className="space-y-6">
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              {t('admin_broadcast', 'Diffusion Administrative')}
            </h2>

            {canPublish ? (
              <form onSubmit={handleSendAnnouncement} className="glass-card p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('announcement_title', 'Titre du Communiqué')}</label>
                  <input
                    required
                    value={newAnnTitle}
                    onChange={(e) => setNewAnnTitle(e.target.value)}
                    placeholder={t('ann_title_placeholder', 'Ex: Réunion de rentrée scolaire')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('target_audience_label', 'Audience Cible')}</label>
                  <select
                    value={newAnnTarget}
                    onChange={(e) => setNewAnnTarget(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                  >
                    <option value="ALL">{t('target_all_option', 'Tout le monde (Personnels & Parents)')}</option>
                    <option value="STAFF">{t('target_staff_option', 'Personnels de l\'école uniquement')}</option>
                    <option value="PARENTS">{t('target_parents_option', 'Parents d\'élèves uniquement')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('message_content', 'Contenu du message')}</label>
                  <textarea
                    required
                    rows={6}
                    value={newAnnContent}
                    onChange={(e) => setNewAnnContent(e.target.value)}
                    placeholder={t('message_content_placeholder', 'Saisissez ici le texte officiel à communiquer...')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center py-2.5 px-4 bg-amber-500 text-slate-900 rounded-lg font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-xs uppercase tracking-widest"
                >
                  <Megaphone className="w-4 h-4 mr-2" />
                  {t('broadcast_announcement', 'Diffuser le Communiqué')}
                </button>
              </form>
            ) : (
              <div className="glass-card p-6 border-l-4 border-yellow-500/30 text-slate-400 text-xs leading-relaxed space-y-2">
                <ShieldAlert className="w-5 h-5 text-yellow-500" />
                <p className="font-bold text-white">{t('read_only', 'Lecture seule')}</p>
                <p>{t('read_only_desc', 'Votre rôle ne vous autorise pas à émettre de communiqués officiels. Vous pouvez cependant consulter toutes les diffusions qui vous concernent.')}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Historique des requêtes */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <History className="w-5 h-5 text-amber-500" />
              {t('requests_history', 'Historique des requêtes')}
            </h2>

            {tickets.length === 0 ? (
              <div className="glass-card p-12 text-center text-slate-500 italic rounded-2xl border border-white/5">
                {t('no_requests', 'Aucune requête administrative envoyée pour l\'instant.')}
              </div>
            ) : (
              <div className="space-y-4">
                {tickets.map((t) => (
                  <div key={t.id} className="glass-card p-6 border-l-4 border-amber-500/30 flex justify-between items-start flex-wrap gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-white">{t.subject}</h3>
                      <p className="text-slate-400 text-xs leading-relaxed">{t.message}</p>
                      <span className="text-[10px] text-slate-500 block uppercase pt-2">{new Date(t.created_at || Date.now()).toLocaleString('fr-FR')}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      t.status === 'OPEN' 
                        ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' 
                        : 'bg-green-500/10 text-green-500 border border-green-500/20'
                    }`}>
                      {t.status === 'OPEN' ? t('status_pending', 'EN ATTENTE') : t('status_resolved', 'RÉSOLU')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Formulaire de Requête */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              {t('new_request', 'Nouvelle requête')}
            </h2>
            <div className="glass-card p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('request_subject', 'Sujet de la Requête')}</label>
                <input
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder={t('request_subject_placeholder', 'Ex: Problème d\'accès informatique')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('message_for_direction', 'Message pour la direction')}</label>
                <textarea
                  rows={4}
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  placeholder={t('message_direction_placeholder', 'Expliquez en détail votre demande ou votre problème...')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <button
                onClick={handleSendTicket}
                className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-xs uppercase tracking-widest"
              >
                <Send className="w-4 h-4 mr-2" />
                {t('send_request', 'Envoyer la Requête')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
