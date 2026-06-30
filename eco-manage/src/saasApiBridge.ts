import { Capacitor } from '@capacitor/core';

export const initSaaSBridge = () => {
    // Si electronAPI est déjà défini (on est dans l'appli de bureau), on ne fait rien.
    if (window.electronAPI) {
        return;
    }

    console.log("[SaaS Mode] Activation du Pont API Web...");

    // Sur le Cloud, l'API Express répond sous /api
    // Si on est sur Mobile (Android/iOS via Capacitor), on force l'URL absolue du VPS
    const API_BASE = Capacitor.isNativePlatform() ? 'http://2.24.15.119:8080/api' : '/api';

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
            
            // Ajouter un cache buster pour les requêtes GET pour forcer le rafraîchissement
            const cacheBuster = method === 'GET' ? (endpoint.includes('?') ? `&_t=${Date.now()}` : `?_t=${Date.now()}`) : '';
            const finalUrl = `${API_BASE}${endpoint}${cacheBuster}`;
            
            const response = await fetch(finalUrl, config);
            const data = await response.json();
            
            if (response.status === 401) {
                localStorage.removeItem('saas_token');
                localStorage.removeItem('user');
                window.location.href = '/login';
                throw new Error('Session expirée');
            }
            if (!response.ok) {
                throw new Error(data.error || 'Erreur réseau API');
            }
            
            // On s'assure de renvoyer le même format que l'ancien IPC Electron
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
            const res = await apiCall('/saas/schools', 'GET');
            return res.schools;
        },

        // Les autres méthodes (getStudents, getGrades...) renverront un tableau vide ou null
        // le temps que nous les programmions dans server.js, pour ne pas faire planter React.
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

            return async (...args: any[]) => {
                try {
                    const res = await apiCall('/ipc', 'POST', {
                        channel: channel,
                        args: args
                    });
                    return res.result;
                } catch (error: any) {
                    console.error(`[SaaS Bridge Error] ${prop} (${channel}):`, error);
                    // Si c'est une erreur de validation ou métier venant du backend, on la relance
                    if (error && error.message && error.message !== 'Erreur réseau API') {
                        throw error;
                    }
                    // Pour éviter que l'UI crashe brutalement si une route n'est pas encore prête
                    return prop.startsWith('get') ? [] : { error: String(error) };
                }
            };
        }
    };

    window.electronAPI = new Proxy(window.electronAPI, handler);
};
