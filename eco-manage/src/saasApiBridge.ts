import { Capacitor } from '@capacitor/core';

// ─── Cache localStorage pour le mode hors connexion ──────────────────────────
const CACHE_PREFIX = 'eco_api_';
const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48h

function cacheKey(channel: string, args: any[]): string {
    const argStr = JSON.stringify(args).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80);
    return CACHE_PREFIX + channel + '_' + argStr;
}
function saveCache(key: string, data: any): void {
    try {
        localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch (_) {
        // localStorage plein → purger la moitié des entrées en cache
        const toDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(CACHE_PREFIX)) toDelete.push(k);
        }
        toDelete.slice(0, Math.ceil(toDelete.length / 2)).forEach(k => localStorage.removeItem(k));
        try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch (_2) { /* abandon */ }
    }
}
function readCache(key: string): any | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL_MS) { localStorage.removeItem(key); return null; }
        return data;
    } catch (_) { return null; }
}

// ─── File d'attente offline (mutations hors connexion) ───────────────────────
const QUEUE_KEY = 'eco_offline_queue';

interface QueueItem { channel: string; args: any[]; ts: number; }

function getQueue(): QueueItem[] {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function saveQueue(q: QueueItem[]): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}
function enqueue(channel: string, args: any[]): void {
    const q = getQueue();
    q.push({ channel, args, ts: Date.now() });
    saveQueue(q);
    window.dispatchEvent(new CustomEvent('eco:queue-changed', { detail: { count: q.length } }));
}
export function getOfflineQueueCount(): number {
    return getQueue().length;
}

// Rejouer la queue au retour de connexion
async function flushQueue(makeApiCall: (channel: string, args: any[]) => Promise<any>): Promise<void> {
    const q = getQueue();
    if (q.length === 0) return;

    window.dispatchEvent(new CustomEvent('eco:queue-flushing', { detail: { count: q.length } }));
    const failed: QueueItem[] = [];

    for (const item of q) {
        try {
            await makeApiCall(item.channel, item.args);
        } catch (_) {
            failed.push(item); // Réessayer à la prochaine reconnexion
        }
    }

    saveQueue(failed);
    window.dispatchEvent(new CustomEvent('eco:queue-changed', { detail: { count: failed.length } }));
    if (failed.length === 0) {
        // Tout sync → rafraîchir toutes les pages
        window.dispatchEvent(new CustomEvent('app:data-changed'));
    }
}
// ─────────────────────────────────────────────────────────────────────────────

export const initSaaSBridge = () => {
    if (window.electronAPI) return;

    console.log("[SaaS Mode] Activation du Pont API Web...");

    const API_BASE = Capacitor.isNativePlatform() ? 'https://ecomanageapp.com/api' : '/api';

    const apiCall = async (endpoint: string, method: string = 'GET', body: any = null) => {
        try {
            const token = localStorage.getItem('saas_token');
            const config: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                cache: 'no-store'
            };
            if (body) config.body = JSON.stringify(body);

            const cacheBuster = method === 'GET' ? (endpoint.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`) : '';
            const response = await fetch(`${API_BASE}${endpoint}${cacheBuster}`, config);

            if (response.status === 401) {
                localStorage.removeItem('saas_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                throw new Error('Session expirée');
            }

            const text = await response.text();
            let data: any;
            try { data = JSON.parse(text); }
            catch (_) { throw new Error(`Serveur indisponible (${response.status}). Veuillez réessayer dans quelques secondes.`); }

            if (!response.ok) throw new Error(data.error || 'Erreur réseau API');
            return data;
        } catch (error: any) {
            console.error(`[API Error] ${endpoint}:`, error);
            throw error;
        }
    };

    // Wrapper pour appeler un channel IPC directement (utilisé par flushQueue)
    const callChannel = async (channel: string, args: any[]) => {
        const res = await apiCall('/ipc', 'POST', { channel, args });
        return res?.result;
    };

    // Rejouer la queue au retour de connexion
    window.addEventListener('online', () => {
        setTimeout(() => flushQueue(callChannel), 1000);
    });
    // Rejouer aussi au démarrage si la queue n'est pas vide et qu'on est en ligne
    if (navigator.onLine && getQueue().length > 0) {
        setTimeout(() => flushQueue(callChannel), 2000);
    }

    window.electronAPI = {
        isWebMode: true,
        login: async (credentials: any) => {
            const res = await apiCall('/auth/login', 'POST', credentials);
            if (res.token) localStorage.setItem('saas_token', res.token);
            return res.user;
        },
        getSchools: async () => {
            const res = await apiCall('/ipc', 'POST', { channel: 'db:getSchools', args: [] });
            return res.result;
        },
    } as any;

    const handler = {
        get: function(target: any, prop: string) {
            if (prop in target) return target[prop];

            let channel = `db:${prop}`;
            if (prop === 'switchSchool') {
                return async (schoolId: number) => {
                    try {
                        const token = localStorage.getItem('saas_token');
                        const res = await fetch(`${API_BASE.replace('/api', '')}/api/auth/switchSchool`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                            body: JSON.stringify({ schoolId })
                        });
                        const data = await res.json();
                        if (data.token) localStorage.setItem('saas_token', data.token);
                        return true;
                    } catch (e) { return false; }
                };
            }
            if (prop === 'logout' || prop === 'restoreSession') {
                channel = `auth:${prop}`;
                if (prop === 'logout') localStorage.removeItem('saas_token');
            } else if (prop === 'showAlert') {
                return undefined;
            }

            const isReadOp = prop.startsWith('get') || prop.startsWith('fetch');

            return async (...args: any[]) => {
                const ck = isReadOp ? cacheKey(channel, args) : null;
                const isNetworkError = (err: any) =>
                    !navigator.onLine ||
                    err?.message?.includes('Failed to fetch') ||
                    err?.message?.includes('NetworkError') ||
                    err?.message?.includes('Load failed');

                try {
                    const res = await apiCall('/ipc', 'POST', { channel, args });

                    // Réponse offline du Service Worker
                    if (res && res.offline) {
                        if (isReadOp && ck) {
                            const cached = readCache(ck);
                            if (cached !== null) return cached;
                        }
                        if (!isReadOp) {
                            // Mise en file d'attente de la mutation
                            enqueue(channel, args);
                            return { queued: true };
                        }
                        return [];
                    }

                    const result = res.result;

                    // Sauvegarder les lectures en cache local
                    if (isReadOp && ck && result !== null && result !== undefined) {
                        saveCache(ck, result);
                    }

                    return result;
                } catch (error: any) {
                    console.error(`[SaaS Bridge Error] ${prop} (${channel}):`, error);

                    if (isNetworkError(error)) {
                        if (isReadOp && ck) {
                            const cached = readCache(ck);
                            if (cached !== null) {
                                console.info(`[SaaS Bridge] Cache local utilisé pour ${prop}`);
                                return cached;
                            }
                            return [];
                        }
                        // Mutation offline → mise en file d'attente
                        enqueue(channel, args);
                        console.info(`[SaaS Bridge] Mutation mise en attente offline: ${channel}`);
                        return { queued: true };
                    }

                    // Erreur métier (validation, autorisation) → relancer
                    if (error && error.message && error.message !== 'Erreur réseau API') {
                        throw error;
                    }
                    return isReadOp ? [] : { error: String(error) };
                }
            };
        }
    };

    window.electronAPI = new Proxy(window.electronAPI, handler);
};
