import axios from 'axios';
import useAuthStore from '../stores/authStore';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 
             (window.location.protocol === 'http:' && window.location.hostname === 'localhost' && !window.Capacitor ? '/api' : 'https://krishna-akhilnjcets-projects.vercel.app/api'),
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
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
