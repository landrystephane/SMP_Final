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
  const [usersList, setUsersList] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState(t('internal_message_default', 'Message interne'));
  const [receiverRole, setReceiverRole] = useState('DIRECTOR');
  const [receiverId, setReceiverId] = useState<number | ''>('');
  
  const [requestType, setRequestType] = useState('STANDARD');
  const [requestData, setRequestData] = useState<any>({});
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classes, setClasses] = useState<any[]>([]);
  const [termStructure, setTermStructure] = useState<any[]>([]);

  // States for announcements
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [newAnnTarget, setNewAnnTarget] = useState<string>('ALL');

  const canPublish = ['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'SG', 'TEACHER'].includes(user?.role || '');

  const loadData = async () => {
    if (window.electronAPI && user) {
        try {
            const ticketData = await window.electronAPI.getTickets({ userId: user.id, role: user.role, schoolId: user.schoolId });
            setTickets(ticketData || []);

            const userData = await window.electronAPI.getUsers(user.schoolId);
            setUsersList(userData || []);

            const annData = await window.electronAPI.getAnnouncements(user.schoolId);
            setAnnouncements(annData || []);

            const schools = await window.electronAPI.getSchools();
            const currentSchool = schools.find((s: any) => s.id?.toString() === user.schoolId?.toString());
            if (currentSchool) {
                setSchoolName(currentSchool.name);
                if (currentSchool.term_structure) {
                    try {
                        setTermStructure(JSON.parse(currentSchool.term_structure));
                    } catch(e) {}
                }
            }
            
            const classData = await window.electronAPI.getClasses(user.schoolId);
            setClasses(classData || []);

            const studentsData = await window.electronAPI.getStudents(user.schoolId);
            setStudentsList(studentsData || []);
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
          if (requestType !== 'STANDARD') {
              await window.electronAPI.submitSystemRequest({
                  senderId: user.id,
                  requestType: requestType,
                  requestData: {
                      ...requestData,
                      message: newTicketMessage
                  }
              });
              alert(t('tick_system_request_success', "Votre demande système a été soumise avec succès ! L'administration la traitera sous peu."));
          } else {
              if (receiverRole === 'ALL_PARENTS') {
                  await window.electronAPI.sendTicket({
                      sender_id: user.id,
                      receiver_role: 'PARENT',
                      receiver_id: null,
                      subject: newTicketSubject,
                      message: newTicketMessage,
                      school_id: user.schoolId
                  });
                  await window.electronAPI.createNotification({
                      role: 'PARENT',
                      message: `Nouveau message de ${user.fullName || user.username} : ${newTicketSubject}`,
                      type: 'INFO',
                      school_id: user.schoolId
                  });
              } else if (receiverRole === 'TITULAIRE') {
                  if (!receiverId) {
                      alert(t('tick_select_child_teacher', "Veuillez sélectionner l'enfant et son enseignant."));
                      return;
                  }
                  await window.electronAPI.sendTicket({
                      sender_id: user.id,
                      receiver_id: receiverId,
                      receiver_role: null,
                      subject: newTicketSubject,
                      message: newTicketMessage,
                      school_id: user.schoolId
                  });
                  await window.electronAPI.createNotification({
                      user_id: receiverId,
                      message: `Message d'un parent (${user.fullName || user.username}) : ${newTicketSubject}`,
                      type: 'INFO',
                      school_id: user.schoolId
                  });
              } else if (receiverRole === 'CLASS_TEACHERS') {
                  if (!selectedClassId) {
                      alert(t('tick_select_a_class', "Veuillez sélectionner une classe."));
                      return;
                  }
                  const cls = classes.find(c => c.id?.toString() === selectedClassId);
                  const teacherIds = new Set<number>();
                  usersList.filter(u => u.role === 'TEACHER').forEach(u => {
                      try {
                          const assigned = typeof u.assignedClasses === 'string' ? JSON.parse(u.assignedClasses) : (u.assignedClasses || []);
                          if (assigned.includes(parseInt(selectedClassId)) || assigned.includes(selectedClassId)) teacherIds.add(u.id);
                      } catch(e) {}
                  });
                  if (cls?.main_teacher_id) teacherIds.add(cls.main_teacher_id);
                  if (cls?.assistant_teacher_id) teacherIds.add(cls.assistant_teacher_id);
                  teacherIds.delete(user.id);
                  if (teacherIds.size === 0) {
                      alert(t('tick_no_teacher_found', "Aucun autre enseignant trouvé pour cette classe."));
                      return;
                  }
                  for (const tid of teacherIds) {
                      await window.electronAPI.sendTicket({
                          sender_id: user.id,
                          receiver_id: tid,
                          receiver_role: null,
                          subject: newTicketSubject,
                          message: newTicketMessage,
                          school_id: user.schoolId
                      });
                  }
              } else if (receiverRole === 'CLASS_PARENTS') {
                  if (!selectedClassId) {
                      alert(t('tick_select_a_class', "Veuillez sélectionner une classe."));
                      return;
                  }
                  const classStudents = studentsList.filter(s => s.class_id?.toString() === selectedClassId?.toString());
                  const parentIds = new Set<number>();
                  for (const s of classStudents) {
                      const parentUser = usersList.find(u => u.role === 'PARENT' && u.username === s.parent_contact);
                      if (parentUser) parentIds.add(parentUser.id);
                  }
                  if (parentIds.size === 0) {
                      alert(t('tick_no_parent_found', "Aucun parent trouvé pour cette classe."));
                      return;
                  }
                  for (const pid of parentIds) {
                      await window.electronAPI.sendTicket({
                          sender_id: user.id,
                          receiver_id: pid,
                          receiver_role: null,
                          subject: newTicketSubject,
                          message: newTicketMessage,
                          school_id: user.schoolId
                      });
                  }
              } else {
                  await window.electronAPI.sendTicket({
                      sender_id: user.id,
                      receiver_role: receiverId ? null : receiverRole,
                      receiver_id: receiverId ? receiverId : null,
                      subject: newTicketSubject,
                      message: newTicketMessage,
                      school_id: user.schoolId
                  });
                  if (receiverId) {
                     await window.electronAPI.createNotification({
                         user_id: receiverId,
                         message: `Nouveau message de ${user.fullName || user.username} : ${newTicketSubject}`,
                         type: 'INFO',
                         school_id: user.schoolId
                     });
                  } else if (receiverRole) {
                     await window.electronAPI.createNotification({
                         message: `Nouveau message de ${user.fullName || user.username} : ${newTicketSubject}`,
                         type: 'INFO',
                         school_id: user.schoolId
                     });
                  }
              }
              alert(t('tick_message_sent', "Message envoyé !"));
          }

          setNewTicketMessage('');
          setNewTicketSubject(t('internal_message_default', 'Message interne'));
          setReceiverId('');
          setReceiverRole('DIRECTOR');
          setSelectedClassId('');
          setRequestType('STANDARD');
          setRequestData({});
          loadData();
      } catch (err: any) {
          alert(err.message);
      }
  };

  const [extensionHours, setExtensionHours] = useState<Record<number, number>>({});

  const handleResolveTicket = async (ticketId: number, status: string, requestType?: string) => {
      if (!window.electronAPI) return;
      try {
          const actionData: any = {};
          if (requestType === 'GRADE_EXTENSION' || requestType === 'GRADE_REACTIVATION') {
              actionData.hours = extensionHours[ticketId] || 24;
          }
          await window.electronAPI.resolveTicket({ ticketId, status, actionData });
          alert(t('tick_action_success', "Action effectuée avec succès !"));
          loadData();
      } catch (err: any) {
          alert(t('tick_action_error', "Erreur lors de l'action : ") + err.message);
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
      if (['SUPERADMIN', 'FOUNDER', 'DIRECTOR', 'SG'].includes(user.role)) {
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
      <div className="flex flex-wrap border-b border-white/5 space-x-4">
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
                          {t('published_by', 'Diffusé par')} <span className="text-amber-500 font-semibold">{a.sender_name || t('administration', 'Administration')}</span>
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
                      <span>{schoolName ? t('tick_school_with_name', 'Établissement {{name}}', { name: schoolName }) : t('tick_school_label', 'Établissement')}</span>
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
                    onChange={(e) => setNewAnnTarget(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                  >
                    <option value="ALL">{t('target_all_option', 'Tout le monde (Personnels)')}</option>
                    <option value="STAFF">{t('target_staff_option', 'Personnels de l\'école uniquement')}</option>
                    <option value="PARENTS">{t('tick_all_parents_option', 'Tous les parents')}</option>
                    {user?.role === 'TEACHER' && classes.filter(c => c.main_teacher_id === user?.id || c.assistant_teacher_id === user?.id).map(c => (
                        <option key={`CLASS_${c.id}`} value={`CLASS_${c.id}`}>{t('tick_class_parents_option', 'Aux parents de la classe : {{className}}', { className: c.name })}</option>
                    ))}
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
                {tickets.map((ticket) => {
                  let senderIdentity = ticket.sender_name || t('administration', 'Administration');
                  if (ticket.sender_civility) {
                      const civ = ticket.sender_civility === 'M.' ? t('mr', 'Monsieur') : (ticket.sender_civility === 'Mme' ? t('mrs', 'Madame') : ticket.sender_civility);
                      senderIdentity = `${civ} ${senderIdentity}`;
                  } else if (ticket.sender_name && ticket.sender_role !== 'SUPERADMIN') {
                      senderIdentity = `${t('tick_mr_mrs', 'Monsieur/Madame')} ${senderIdentity}`;
                  }

                  let senderContext = '';
                  if (ticket.sender_role === 'TEACHER' && ticket.teacher_classes) {
                      senderContext = t('tick_context_teacher', '(Enseignant - Salle: {{room}})', { room: ticket.teacher_classes });
                  } else if (ticket.sender_role === 'PARENT' && ticket.parent_students) {
                      senderContext = t('tick_context_parent', '(Parent de: {{students}})', { students: ticket.parent_students });
                  } else if (ticket.sender_role === 'DIRECTOR') {
                      senderContext = t('tick_context_director', '(La Direction)');
                  } else if (ticket.sender_role === 'BURSAR') {
                      senderContext = t('tick_context_bursar', '(L\'Économat)');
                  } else if (ticket.sender_role === 'DRIVER') {
                      senderContext = t('tick_context_driver', '(Chauffeur)');
                  } else if (ticket.sender_role) {
                      senderContext = `(${ticket.sender_role})`;
                  }

                  return (
                  <div key={ticket.id} className="glass-card p-6 border-l-4 border-amber-500/30 flex justify-between items-start flex-wrap gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">{ticket.subject}</h3>
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700">
                              {t('from', 'De')} : <span className="text-amber-500">{senderIdentity}</span> <span className="text-slate-500">{senderContext}</span>
                          </span>
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{ticket.message}</p>
                      <span className="text-[10px] text-slate-500 block uppercase pt-2">{new Date(ticket.created_at || Date.now()).toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          (ticket.subject === 'Alerte Système' || ticket.subject === 'Notification Système' || !ticket.request_type || ticket.request_type === 'STANDARD')
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            : ticket.status === 'OPEN'
                              ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                              : 'bg-green-500/10 text-green-500 border border-green-500/20'
                        }`}>
                          {(ticket.subject === 'Alerte Système' || ticket.subject === 'Notification Système' || !ticket.request_type || ticket.request_type === 'STANDARD')
                            ? t('status_info', 'INFORMATION')
                            : ticket.status === 'OPEN' ? t('status_pending', 'EN ATTENTE') : t('status_resolved', 'RÉSOLU')}
                        </span>
                        
                        {ticket.status === 'OPEN' && ticket.request_type && ticket.request_type !== 'STANDARD' && ticket.sender_id !== user?.id && (
                            <div className="mt-2 flex flex-col items-end gap-2 bg-slate-900/50 p-2 rounded-xl border border-white/5">
                                {ticket.request_type === 'GRADE_EXTENSION' && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">{t('tick_duration_label', 'Durée :')}</span>
                                        <select
                                            value={extensionHours[ticket.id] || 24}
                                            onChange={(e) => setExtensionHours({...extensionHours, [ticket.id]: parseInt(e.target.value)})}
                                            className="bg-slate-800 text-white text-[10px] p-1 rounded border border-slate-700 outline-none"
                                        >
                                            <option value={2}>{t('tick_2_hours', '2 Heures')}</option>
                                            <option value={12}>{t('tick_12_hours', '12 Heures')}</option>
                                            <option value={24}>{t('tick_24_hours', '24 Heures')}</option>
                                            <option value={48}>{t('tick_48_hours', '48 Heures')}</option>
                                        </select>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleResolveTicket(ticket.id, 'RESOLVED', ticket.request_type)}
                                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all shadow-lg"
                                    >
                                        {ticket.request_type === 'GRADE_EXTENSION' ? t('validate_extension', 'Valider Extension') : t('approve', 'Approuver')}
                                    </button>
                                    <button
                                        onClick={() => handleResolveTicket(ticket.id, 'REJECTED', ticket.request_type)}
                                        className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase px-3 py-1.5 rounded transition-all"
                                    >
                                        {t('tick_reject', 'Refuser')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                  </div>
                  );
                })}
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('request_subject', 'Type de Requête')}</label>
                <select
                    value={requestType}
                    onChange={(e) => {
                        const type = e.target.value;
                        setRequestType(type);
                        setNewTicketSubject(type === 'STANDARD' ? t('internal_message_default', 'Message interne') : e.target.options[e.target.selectedIndex].text);
                        if (type === 'GRADE_EXTENSION') setRequestData({ term: termStructure[0]?.term_id, sequence: termStructure[0]?.sequences?.[0]?.id, classId: classes[0]?.id });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                >
                    <option value="STANDARD">{t('tick_standard_message', 'Message standard / Autre')}</option>
                    {(user?.role === 'TEACHER' || user?.role === 'DIRECTOR') && (
                        <>
                            <option value="GRADE_EXTENSION">{t('tick_grade_extension_request', "Demande d'extension de délai (Saisie des notes)")}</option>
                            <option value="ABSENCE_JUSTIFICATION">{t('tick_absence_justification', "Justificatif de saisie d'absences")}</option>
                        </>
                    )}
                    {(user?.role === 'BURSAR' || user?.role === 'FOUNDER') && (
                        <option value="CASH_WITHDRAWAL">{t('tick_cash_withdrawal', "Demande de décaissement / retrait d'argent")}</option>
                    )}
                    {user?.role === 'SG' && (
                        <option value="PRINT_AUTHORIZATION">{t('tick_print_authorization', "Autorisation d'impression des bulletins")}</option>
                    )}
                </select>
              </div>

              {requestType === 'GRADE_EXTENSION' && (
                  <div className="grid grid-cols-1 gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('tick_class_concerned', 'Classe concernée')}</label>
                          <select
                            value={requestData.classId}
                            onChange={(e) => setRequestData({...requestData, classId: parseInt(e.target.value)})}
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none text-xs"
                          >
                              <option value="">{t('tick_select_placeholder', 'Sélectionner...')}</option>
                              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('tick_period_sequence', 'Période / Séquence')}</label>
                          <select
                            value={`${requestData.term}_${requestData.sequence}`}
                            onChange={(e) => {
                                const [t, s] = e.target.value.split('_');
                                setRequestData({...requestData, term: parseInt(t), sequence: parseInt(s)});
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none text-xs"
                          >
                              <option value="_">{t('tick_select_placeholder', 'Sélectionner...')}</option>
                              {termStructure.flatMap(t => t.sequences?.map((s: any) => (
                                  <option key={`${t.term_id}_${s.id}`} value={`${t.term_id}_${s.id}`}>{t.name} - {s.name}</option>
                              )))}
                          </select>
                      </div>
                  </div>
              )}

              {requestType === 'ABSENCE_JUSTIFICATION' && (
                  <div className="grid grid-cols-1 gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('tick_date_period', 'Date / Période')}</label>
                          <input type="date" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none text-xs" />
                      </div>
                  </div>
              )}

              {requestType === 'CASH_WITHDRAWAL' && (
                  <div className="grid grid-cols-1 gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('tick_amount_requested', 'Montant demandé')}</label>
                          <input
                            type="number"
                            placeholder="Ex: 50000"
                            value={requestData.amount || ''}
                            onChange={(e) => setRequestData({...requestData, amount: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none text-xs"
                          />
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('tick_target_role', 'Cible (Rôle)')}</label>
                    <select
                        value={receiverRole}
                        onChange={(e) => { setReceiverRole(e.target.value); setReceiverId(''); setStudentSearchTerm(''); setSelectedClassId(''); }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                    >
                        {user?.role === 'PARENT' ? (
                            <>
                                <option value="TITULAIRE">{t('titulaire_of_child', 'Enseignant Titulaire de mon enfant')}</option>
                                <option value="DIRECTOR">{t('tick_director_office', 'La Direction')}</option>
                                <option value="FOUNDER">{t('tick_founder_office', 'Le Fondateur')}</option>
                            </>
                        ) : (
                            <>
                                <option value="FOUNDER">{t('tick_founder_office', 'Le Fondateur')}</option>
                                <option value="DIRECTOR">{t('tick_director_office', 'La Direction')}</option>
                                <option value="SG">{t('tick_sg_office', 'Secrétariat Général')}</option>
                                <option value="BURSAR">{t('tick_bursar_office', 'Économat')}</option>
                                <option value="ADVISOR">{t('tick_advisor_office', 'Conseiller Pédagogique')}</option>
                                {user?.role === 'TEACHER' && classes.some(c => c.main_teacher_id === user?.id || c.assistant_teacher_id === user?.id) && (
                                    <option value="PARENT">{t('tick_parent_of_student', "Parent d'un élève (Privé)")}</option>
                                )}
                                {user?.role === 'TEACHER' && classes.some(c => c.main_teacher_id === user?.id) && (
                                    <option value="CLASS_TEACHERS">{t('class_teachers_msg', 'Enseignants de ma classe')}</option>
                                )}
                                {user?.role !== 'TEACHER' && user?.role !== 'PARENT' && (
                                    <option value="PARENT">{t('tick_parent_of_student', "Parent d'un élève (Privé)")}</option>
                                )}
                                {user?.role === 'SG' && (
                                    <>
                                        <option value="ALL_PARENTS">{t('all_parents_broadcast', 'Tous les Parents (Diffusion)')}</option>
                                        <option value="CLASS_PARENTS">{t('class_parents_specific', "Parents d'une classe spécifique")}</option>
                                        <option value="TEACHER">{t('a_teacher', 'Un Enseignant')}</option>
                                    </>
                                )}
                            </>
                        )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('tick_or_specific_person', 'Ou Personne précise')}</label>
                    <select
                        value={receiverId}
                        onChange={(e) => {
                            const val = e.target.value;
                            setReceiverId(val ? Number(val) : '');
                            if (val) setReceiverRole('');
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                    >
                        <option value="">{t('tick_ignore_use_role', '-- Ignorer (utiliser le rôle) --')}</option>
                        {Array.from(new Set(usersList.filter(u => u.role !== 'PARENT').map(u => u.role))).map(role => (
                            <optgroup key={role} label={role === 'TEACHER' ? t('tick_teachers_group', 'ENSEIGNANTS') : role === 'DIRECTOR' ? t('tick_direction_group', 'DIRECTION') : role}>
                                {usersList.filter(u => u.role === role).map(u => (
                                    <option key={u.id} value={u.id}>{u.fullName || u.full_name}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                  </div>
              </div>

              {receiverRole === 'CLASS_PARENTS' && (
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('target_class', 'Classe ciblée')}</label>
                      <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                      >
                          <option value="">{t('select_class', '-- Sélectionner une classe --')}</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level} - {c.section})</option>)}
                      </select>
                  </div>
              )}

              {receiverRole === 'TITULAIRE' && user?.role === 'PARENT' && (
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('choose_child', "Choisir l'enfant")}</label>
                      <select
                          value={receiverId}
                          onChange={(e) => setReceiverId(e.target.value ? Number(e.target.value) : '')}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                      >
                          <option value="">{t('select_option', '-- Sélectionner --')}</option>
                          {studentsList.filter(s => s.parent_contact === user?.username).map(s => {
                              const cls = classes.find(c => c.id === s.class_id);
                              const titulaire = cls ? usersList.find(u => u.id === cls.main_teacher_id) : null;
                              const suppleant = cls ? usersList.find(u => u.id === cls.assistant_teacher_id) : null;
                              return [
                                  titulaire && <option key={`tit-${s.id}`} value={titulaire.id}>{t('tick_child_main_teacher_option', '{{firstName}} {{lastName}} - Titulaire: {{teacherName}} ({{className}})', { firstName: s.first_name, lastName: s.last_name, teacherName: titulaire.fullName || titulaire.full_name, className: cls?.name })}</option>,
                                  suppleant && <option key={`sup-${s.id}`} value={suppleant.id}>{t('tick_child_assistant_teacher_option', '{{firstName}} {{lastName}} - Suppléant: {{teacherName}} ({{className}})', { firstName: s.first_name, lastName: s.last_name, teacherName: suppleant.fullName || suppleant.full_name, className: cls?.name })}</option>
                              ];
                          })}
                      </select>
                  </div>
              )}

              {receiverRole === 'CLASS_TEACHERS' && user?.role === 'TEACHER' && (
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('tick_class_concerned', 'Classe concernée')}</label>
                      <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                      >
                          <option value="">{t('select_option', '-- Sélectionner --')}</option>
                          {classes.filter(c => c.main_teacher_id === user?.id).map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.level} - {c.section})</option>
                          ))}
                      </select>
                  </div>
              )}

              {receiverRole === 'PARENT' && (
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('tick_search_student_recipient', 'Rechercher l\'élève (Destinataire: Parent)')}</label>
                      <input
                          type="text"
                          placeholder={t('tick_type_student_name', "Tapez le nom de l'élève...")}
                          value={studentSearchTerm}
                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-amber-500"
                      />
                      {studentSearchTerm && (
                          <div className="mt-1 bg-slate-800 border border-slate-700 rounded-lg max-h-40 overflow-y-auto">
                              {(() => {
                                  const teacherClassIds = user?.role === 'TEACHER' ? classes.filter(c => c.main_teacher_id === user?.id || c.assistant_teacher_id === user?.id).map(c => c.id) : null;
                                  const filtered = studentsList.filter(s => { if (teacherClassIds && !teacherClassIds.includes(s.class_id)) return false; const safeFirst = (s.first_name || '').trim(); const safeLast = (s.last_name || '').trim(); const fullName = `${safeFirst} ${safeLast}`.replace(/\s+/g, ' ').toLowerCase(); const revName = `${safeLast} ${safeFirst}`.replace(/\s+/g, ' ').toLowerCase(); const search = studentSearchTerm.replace(/\s+/g, ' ').toLowerCase().trim(); return fullName.includes(search) || revName.includes(search) || safeFirst.toLowerCase().includes(search) || safeLast.toLowerCase().includes(search); }).slice(0, 10);
                                  if (filtered.length === 0) {
                                      return <div className="p-2 text-xs text-slate-400 text-center italic">{t('tick_no_student_found_search', 'Aucun élève trouvé contenant "{{search}}" (Parmi {{total}} élèves)', { search: studentSearchTerm, total: studentsList.length })}</div>;
                                  }
                                  return filtered.map(s => (
                                      <div
                                          key={s.id}
                                          onClick={() => {
                                              setStudentSearchTerm(`${s.first_name} ${s.last_name}`);
                                              const parentUser = usersList.find(u => u.role === 'PARENT' && u.username === s.parent_contact);
                                              if (parentUser) {
                                                  setReceiverId(parentUser.id);
                                              } else {
                                                  alert(t('tick_no_parent_account', "Cet élève n'a pas de compte parent configuré (numéro de parent non trouvé)."));
                                                  setReceiverId('');
                                              }
                                          }}
                                          className="p-2 text-xs text-white cursor-pointer hover:bg-slate-700 border-b border-slate-700/50 flex justify-between items-center"
                                      >
                                          <span><span className="font-bold text-amber-500">{s.first_name} {s.last_name}</span> ({t('tick_class_label', 'Classe:')} {classes?.find(c => c.id === s.class_id)?.name || 'N/A'})</span>
                                          <span className="text-[10px] text-slate-400">{t('tick_parent_label', 'Parent:')} {s.parent_name || t('tick_unknown_parent', 'Inconnu')}</span>
                                      </div>
                                  ));
                              })()}
                          </div>
                      )}
                  </div>
              )}

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
