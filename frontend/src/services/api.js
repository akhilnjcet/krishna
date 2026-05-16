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
    timeout: 20000, 
    withCredentials: true // Support for secure authentication cookies/headers
});

// Centralized Request Interceptor
api.interceptors.request.use((config) => {
    // 1. Check for token in AuthStore (Primary)
    const token = useAuthStore.getState().token;
    
    // 2. Fallback to localStorage if store is not yet hydrated
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

// Centralized Response Interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.message || error.message || 'Network connectivity issue detected.';
        console.error('[API Failure]:', message);
        
        // Handle 401 Unauthorized (Session Expiry)
        // Only redirect if not already on the login page
        if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
            useAuthStore.getState().logout();
            // Using hash routing fallback if needed
            window.location.hash = '#/login';
        }
        
        return Promise.reject(error);
    }
);

export default api;
