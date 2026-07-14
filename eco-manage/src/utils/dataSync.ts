import { useEffect, useRef, useState } from 'react';

const EVENT_NAME = 'app:data-changed';

export const notifyDataChanged = () => {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export const onDataChanged = (callback: () => void) => {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
};

/**
 * Abonne automatiquement une page à app:data-changed.
 * Utilise une ref interne pour toujours appeler la version la plus
 * récente de loadFn sans créer de boucle infinie de useEffect.
 */
export function useDataRefresh(loadFn: () => void): void {
  const ref = useRef(loadFn);
  useEffect(() => { ref.current = loadFn; });

  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);
}

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
