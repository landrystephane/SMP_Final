import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeNotification(id), type === 'error' ? 6000 : 4000);
  }, [removeNotification]);

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => {
      // Determine type based on common error words
      const msgLower = String(message).toLowerCase();
      let type: NotificationType = 'success';
      if (msgLower.includes('erreur') || msgLower.includes('error') || msgLower.includes('impossible') || msgLower.includes('échoué') || msgLower.includes('invalide')) {
        type = 'error';
      } else if (msgLower.includes('attention') || msgLower.includes('warning') || msgLower.includes('veuillez')) {
        type = 'info';
      }
      showNotification(String(message), type);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Container floating on top-right */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {notifications.map((n) => {
          let bgColor = 'bg-slate-900/80 border-slate-800 text-slate-200';
          let Icon = Info;
          let iconColor = 'text-blue-400';

          if (n.type === 'success') {
            bgColor = 'bg-emerald-950/80 border-emerald-500/30 text-emerald-100';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-400';
          } else if (n.type === 'error') {
            bgColor = 'bg-rose-950/80 border-rose-500/30 text-rose-100';
            Icon = AlertCircle;
            iconColor = 'text-rose-400';
          }

          return (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-2xl pointer-events-auto transition-all duration-300 transform translate-x-0 animate-in slide-in-from-right-5 ${bgColor}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 text-sm font-semibold">{n.message}</div>
              <button
                onClick={() => removeNotification(n.id)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
