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
    timeout: 15000, // 15s timeout to prevent infinite hangs
});


api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only redirect to login if the error is 401 AND we are not currently trying to log in
        if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
            useAuthStore.getState().logout();
            window.location.hash = '#/login';
        }
        return Promise.reject(error);
    }
);

export default api;
