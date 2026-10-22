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
    // Keep dynamic baseURL synced with signalStore
    const dynamicBase = useSignalStore.getState().getApiUrl();
    if (dynamicBase) {
        config.baseURL = dynamicBase;
    }
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
        if (error.response?.status === 401 && 
            !error.config.url.includes('/auth/login') && 
            !error.config.url.includes('/auth/verify-face') &&
            !error.config.url.includes('/admin/reset')
        ) {
            useAuthStore.getState().logout();
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

const cache = new Map();
const pendingRequests = new Map();

// URLs that are safe to cache with short TTLs
const CACHE_CONFIG = {
    '/settings/public': 60 * 1000,           // 1 minute
    '/lodge': 30 * 1000,                     // 30 seconds
    '/lodge-billing/settings': 30 * 1000,    // 30 seconds
    '/lodge-billing/dashboard': 8 * 1000,    // 8 seconds
    '/lodge/sys/stats': 8 * 1000             // 8 seconds
};

export const clearApiCache = (urlPattern) => {
    if (!urlPattern) {
        cache.clear();
        return;
    }
    for (const key of cache.keys()) {
        if (key.includes(urlPattern)) cache.delete(key);
    }
};

api.clearCache = clearApiCache;

const originalGet = api.get;

api.get = function (url, config = {}) {
    // If request explicitly asks to skip cache (e.g. manual refresh)
    if (config.skipCache) {
        cache.delete(url);
        return originalGet.call(this, url, config);
    }

    const ttl = CACHE_CONFIG[url];
    const now = Date.now();

    // 1. Check TTL cache
    if (ttl && cache.has(url)) {
        const { timestamp, data } = cache.get(url);
        if (now - timestamp < ttl) {
            return Promise.resolve(data);
        }
        cache.delete(url);
    }

    // 2. Inflight request deduplication: if exact request is already pending, return it!
    const inflightKey = url + (config.params ? JSON.stringify(config.params) : '');
    if (pendingRequests.has(inflightKey)) {
        return pendingRequests.get(inflightKey);
    }

    // 3. Execute request and track inflight
    const promise = originalGet.call(this, url, config)
        .then(res => {
            if (ttl) {
                cache.set(url, { timestamp: Date.now(), data: res });
            }
            return res;
        })
        .finally(() => {
            pendingRequests.delete(inflightKey);
        });

    pendingRequests.set(inflightKey, promise);
    return promise;
};

// Auto-invalidate cache on mutation
['post', 'put', 'delete', 'patch'].forEach(method => {
    const orig = api[method];
    api[method] = function (url, data, config) {
        if (url.includes('/lodge')) api.clearCache('/lodge');
        if (url.includes('/settings')) api.clearCache('/settings');
        return orig.call(this, url, data, config);
    };
});

export default api;
