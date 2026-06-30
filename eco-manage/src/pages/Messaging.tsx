import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Search, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useTranslation } from 'react-i18next';
import { getRoleLabel } from '../utils/roleLabels';
import { notifyDataChanged, onDataChanged } from '../utils/dataSync';

const Messaging: React.FC = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { t, i18n } = useTranslation();

  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadContacts = async () => {
    if (!window.electronAPI) return;
    try {
      const data = await (window.electronAPI as any).getStaffContacts();
      setContacts(data || []);
    } catch (err: any) {
      console.error('Failed to load contacts', err);
    }
  };

  const loadConversation = async (contactId: number) => {
    if (!window.electronAPI) return;
    try {
      const data = await (window.electronAPI as any).getConversation({ contactId });
      setMessages(data || []);
      loadContacts();
    } catch (err: any) {
      console.error('Failed to load conversation', err);
    }
  };

  useEffect(() => {
    loadContacts();
    const interval = setInterval(loadContacts, 15000);
    const unsubscribe = onDataChanged(loadContacts);
    return () => { clearInterval(interval); unsubscribe(); };
  }, [user]);

  useEffect(() => {
    if (selectedContact) {
      loadConversation(selectedContact.id);
      const interval = setInterval(() => loadConversation(selectedContact.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedContact?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact || !window.electronAPI) return;
    setIsSending(true);
    try {
      await (window.electronAPI as any).sendInternalMessage({ receiverId: selectedContact.id, message: newMessage.trim() });
      setNewMessage('');
      await loadConversation(selectedContact.id);
      notifyDataChanged();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
    setIsSending(false);
  };

  const filteredContacts = contacts.filter(c =>
    (c.fullName || c.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-140px)] flex flex-col">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <MessageCircle className="w-7 h-7 text-amber-500" />
          {t('msg_title', 'Messagerie Interne')}
        </h1>
        <p className="text-slate-500 mt-1 text-xs font-bold uppercase tracking-widest">{t('msg_subtitle', 'Échangez directement avec le personnel de votre établissement')}</p>
      </div>

      <div className="flex-1 glass-card overflow-hidden flex min-h-0">
        {/* Contact list */}
        <div className={`w-full md:w-80 border-r border-white/5 flex flex-col ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('msg_search_contact', 'Rechercher...')}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredContacts.length === 0 ? (
              <p className="text-center text-slate-600 text-xs font-bold uppercase p-8">{t('msg_no_contacts', 'Aucun contact disponible')}</p>
            ) : (
              filteredContacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedContact(c)}
                  className={`w-full text-left p-4 flex items-center gap-3 border-b border-white/5 hover:bg-white/5 transition-all ${selectedContact?.id === c.id ? 'bg-amber-500/10' : ''}`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-amber-500 font-black text-sm flex-shrink-0">
                    {(c.fullName || c.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-bold text-sm truncate">{c.fullName || c.username}</p>
                      {c.unreadCount > 0 && (
                        <span className="bg-amber-500 text-slate-950 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{c.unreadCount}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{getRoleLabel(c.role, i18n.language)}</p>
                    {c.lastMessage && <p className="text-xs text-slate-500 truncate mt-0.5">{c.lastMessage}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className={`flex-1 flex-col min-h-0 ${selectedContact ? 'flex' : 'hidden md:flex'}`}>
          {!selectedContact ? (
            <div className="flex-1 flex items-center justify-center text-slate-600">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">{t('msg_select_contact', 'Sélectionnez un contact pour démarrer')}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setSelectedContact(null)} className="md:hidden text-slate-400" title={t('back', 'Retour')}>
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-amber-500 font-black text-sm">
                  {(selectedContact.fullName || selectedContact.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{selectedContact.fullName || selectedContact.username}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{getRoleLabel(selectedContact.role, i18n.language)}</p>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                {messages.length === 0 ? (
                  <p className="text-center text-slate-600 text-xs font-bold uppercase mt-10">{t('msg_no_messages', 'Aucun message. Démarrez la conversation.')}</p>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${m.sender_id === user?.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-white'}`}>
                        <p className="text-sm font-medium whitespace-pre-wrap break-words">{m.message}</p>
                        <p className={`text-[10px] mt-1 font-bold ${m.sender_id === user?.id ? 'text-slate-950/60' : 'text-slate-500'}`}>{formatTime(m.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSend} className="p-4 border-t border-white/5 flex items-center gap-3 flex-shrink-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('msg_type_placeholder', 'Écrire un message...')}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-amber-500"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={isSending || !newMessage.trim()}
                  className="p-3 bg-amber-500 text-slate-950 rounded-2xl hover:bg-amber-400 transition-all disabled:opacity-50"
                  title={t('msg_send', 'Envoyer')}
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messaging;
