import axios from 'axios';
import useAuthStore from '../stores/authStore';

import useSignalStore from '../stores/signalStore';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || useSignalStore.getState().getApiUrl(),
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
        // Only redirect to login if the error is 401 AND we are not currently trying to log in or verify face
        if (error.response?.status === 401 && !error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/verify-face')) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

const cache = {};
const originalGet = api.get;
api.get = function (url, config) {
    if (url === '/settings/public') {
        if (cache[url]) {
            return Promise.resolve(cache[url]);
        }
        return originalGet.call(this, url, config).then(res => {
            cache[url] = res;
            return res;
        });
    }
    return originalGet.call(this, url, config);
};

export default api;
