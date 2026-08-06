import axios from 'axios';
import useAuthStore from '../stores/authStore';

import useSignalStore from '../stores/signalStore';

// Determine the correct base URL:
// - On production (Vercel), always use the cloud URL regardless of VITE_API_URL
// - On localhost, use VITE_API_URL if set, else fall back to signalStore
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.')
);

const resolveBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  // If VITE_API_URL points to localhost but we're on production → ignore it
  if (envUrl && isLocalhost) return envUrl;
  return useSignalStore.getState().getApiUrl();
};

const api = axios.create({
    baseURL: resolveBaseUrl(),
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
