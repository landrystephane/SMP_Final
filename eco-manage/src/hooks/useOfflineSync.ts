import { useState, useEffect } from 'react';

export function useOfflineSync<T>(key: string, initialValue: T) {
  const [data, setData] = useState<T>(() => {
    const saved = localStorage.getItem(`sync_${key}`);
    return saved ? JSON.parse(saved) : initialValue;
  });

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem(`sync_${key}`, JSON.stringify(data));
  }, [data, key]);

  const syncWithDatabase = async (syncFn: (data: T) => Promise<void>) => {
    setIsSyncing(true);
    try {
      await syncFn(data);
      // If sync successful, we could clear local storage or keep it as cache
      console.log(`Sync successful for ${key}`);
    } catch (error) {
      console.error(`Sync failed for ${key}, data is safe in localStorage`);
    } finally {
      setIsSyncing(false);
    }
  };

  return { data, setData, isSyncing, syncWithDatabase };
}
