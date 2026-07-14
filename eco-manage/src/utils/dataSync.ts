import { useEffect, useState } from 'react';

const EVENT_NAME = 'app:data-changed';

export const notifyDataChanged = () => {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export const onDataChanged = (callback: () => void) => {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
};

/**
 * Retourne true si la connexion est active.
 * Déclenche automatiquement notifyDataChanged() à la reconnexion
 * pour que toutes les pages rechargent leurs données.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Délai court pour laisser le réseau se stabiliser avant de re-fetch
      setTimeout(() => notifyDataChanged(), 800);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
