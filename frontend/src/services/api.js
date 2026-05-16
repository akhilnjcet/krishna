import axios from 'axios';
import useAuthStore from '../stores/authStore';

import useSignalStore from '../stores/signalStore';

const getApiBaseUrl = () => {
    // If explicitly provided in environment, use it
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    
    // In production, use relative path to allow Vercel rewrites to work seamlessly
    if (import.meta.env.PROD) return '/api';
    
    // Fallback to signal store for local network testing
    return useSignalStore.getState().getApiUrl();
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 8000, // Fail fast (8s) instead of hanging 20s+
    withCredentials: true 
});

// Fallback Data Repository (Ensures UI stability during backend cold-starts)
const FALLBACKS = {
    '/settings/public': {
        siteName: 'Krishna Engineering',
        theme: 'dark',
        contactEmail: 'krishnaengineeringworks0715@gmail.com'
    },
    '/portfolio/gallery': [],
    '/visits': { count: 1234 }
};

// Centralized Request Interceptor
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    const fallbackToken = !token ? (
        localStorage.getItem('auth-storage') ? 
        JSON.parse(localStorage.getItem('auth-storage'))?.state?.token : null
    ) : null;

    const finalToken = token || fallbackToken;
    if (finalToken) {
        config.headers.Authorization = `Bearer ${finalToken}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Centralized Response Interceptor with Intelligent Recovery
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;
        
        // 1. Handle Timeout (408) or Network Failure
        if (error.code === 'ECONNABORTED' || !response || response.status === 408) {
            console.warn(`[Network Recovery]: Backend sluggish/unreachable for ${config.url}. Using UI fallback.`);
            
            // Return fallback data if available for this endpoint
            for (const [key, val] of Object.entries(FALLBACKS)) {
                if (config.url.includes(key)) {
                    return Promise.resolve({ data: val, status: 200, statusText: 'OK (Fallback)', headers: {}, config });
                }
            }
        }
        
        // 2. Handle 401 Unauthorized (Session Expiry)
        if (response?.status === 401 && !config.url.includes('/auth/login')) {
            useAuthStore.getState().logout();
            window.location.hash = '#/login';
        }
        
        return Promise.reject(error);
    }
);

export default api;
