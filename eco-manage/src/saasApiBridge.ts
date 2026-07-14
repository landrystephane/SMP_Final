import { Capacitor } from '@capacitor/core';

// ─── Cache localStorage pour le mode hors connexion ──────────────────────────
const CACHE_PREFIX = 'eco_api_';
const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48h — données restent accessibles 2 jours

function cacheKey(channel: string, args: any[]): string {
    // Clé unique par channel + arguments sérialisés (tronqué à 80 chars)
    const argStr = JSON.stringify(args).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 80);
    return CACHE_PREFIX + channel + '_' + argStr;
}

function saveCache(key: string, data: any): void {
    try {
        localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch (_) {
        // localStorage plein → on nettoie les entrées expirées
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
// ─────────────────────────────────────────────────────────────────────────────

export const initSaaSBridge = () => {
    // Si electronAPI est déjà défini (on est dans l'appli de bureau), on ne fait rien.
    if (window.electronAPI) {
        return;
    }

    console.log("[SaaS Mode] Activation du Pont API Web...");

    // Sur le Cloud, l'API Express répond sous /api
    // Si on est sur Mobile (Android/iOS via Capacitor), on force l'URL absolue du domaine
    const API_BASE = Capacitor.isNativePlatform() ? 'https://ecomanageapp.com/api' : '/api';

    // Fonction utilitaire pour faire des requêtes vers server.js
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
            if (body) {
                config.body = JSON.stringify(body);
            }

            const cacheBuster = method === 'GET' ? (endpoint.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`) : '';
            const finalUrl = `${API_BASE}${endpoint}${cacheBuster}`;

            const response = await fetch(finalUrl, config);

            if (response.status === 401) {
                localStorage.removeItem('saas_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                throw new Error('Session expirée');
            }

            const text = await response.text();
            let data: any;
            try {
                data = JSON.parse(text);
            } catch(_) {
                throw new Error(`Serveur indisponible (${response.status}). Veuillez réessayer dans quelques secondes.`);
            }

            if (!response.ok) {
                throw new Error(data.error || 'Erreur réseau API');
            }

            return data;
        } catch (error: any) {
            console.error(`[API Error] ${endpoint}:`, error);
            throw error;
        }
    };

    // On crée une fausse variable electronAPI pour tromper React
    window.electronAPI = {
        isWebMode: true,
        login: async (credentials: any) => {
            const res = await apiCall('/auth/login', 'POST', credentials);
            if (res.token) {
                localStorage.setItem('saas_token', res.token);
            }
            return res.user;
        },

        getSchools: async () => {
            const res = await apiCall('/ipc', 'POST', { channel: 'db:getSchools', args: [] });
            return res.result;
        },

    } as any;

    // Pour intercepter toutes les requêtes (getStudents, saveGrades, etc.)
    const handler = {
        get: function(target: any, prop: string) {
            if (prop in target) {
                return target[prop];
            }

            // Déterminer le channel IPC
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
                if (prop === 'logout') {
                    localStorage.removeItem('saas_token');
                }
            } else if (prop === 'showAlert') {
                return undefined;
            }

            // Les opérations de lecture sont cachées localement pour le mode offline
            const isReadOp = prop.startsWith('get') || prop.startsWith('fetch');

            return async (...args: any[]) => {
                const ck = isReadOp ? cacheKey(channel, args) : null;
                try {
                    const res = await apiCall('/ipc', 'POST', {
                        channel: channel,
                        args: args
                    });

                    // Réponse offline émise par le Service Worker (hors connexion)
                    if (res && res.offline) {
                        console.warn(`[SaaS Bridge] Hors connexion — lecture du cache local pour ${prop}`);
                        if (ck) {
                            const cached = readCache(ck);
                            if (cached !== null) return cached;
                        }
                        return isReadOp ? [] : null;
                    }

                    const result = res.result;

                    // Sauvegarder les résultats de lecture dans le cache local
                    if (isReadOp && ck && result !== null && result !== undefined) {
                        saveCache(ck, result);
                    }

                    return result;
                } catch (error: any) {
                    console.error(`[SaaS Bridge Error] ${prop} (${channel}):`, error);

                    // En cas d'erreur réseau (offline), tenter le cache local
                    if (isReadOp && ck && (!navigator.onLine || error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError'))) {
                        const cached = readCache(ck);
                        if (cached !== null) {
                            console.info(`[SaaS Bridge] Cache local utilisé pour ${prop}`);
                            return cached;
                        }
                    }

                    // Si c'est une erreur métier (validation, autorisation), on la relance
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
