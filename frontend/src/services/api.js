import axios from 'axios';
import useAuthStore from '../stores/authStore';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 
             (window.location.hostname === 'localhost' ? '/api' : 'https://krishna-akhilnjcets-projects.vercel.app/api'),
});


api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
