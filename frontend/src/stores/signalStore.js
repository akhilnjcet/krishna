import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Capacitor } from '@capacitor/core';

const CLOUD_URL = 'https://krishna-akhilnjcets-projects.vercel.app/api';

const isNativePlatform = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(
    Capacitor?.isNativePlatform?.() ||
    window.Capacitor?.isNativePlatform?.() ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:'
  );
};

const isLocalBrowser = () => {
  if (typeof window === 'undefined') return false;
  if (isNativePlatform()) return false; // Native APK is NEVER a local desktop browser
  return Boolean(
    window.location.hostname.includes('localhost') ||
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.includes('192.168.')
  );
};

// On Native Android APK or production web, always consider production
const isProduction = typeof window !== 'undefined' && !isLocalBrowser();

const useSignalStore = create(
  persist(
    (set, get) => ({
      // Auto-set to 'cloud' on production & Native Mobile APK, 'local' only on local dev browser
      activeSignal: isProduction ? 'cloud' : 'local',
      localIp: 'localhost',
      cloudUrl: CLOUD_URL,

      toggleSignal: (type) => set({ activeSignal: type }),
      setLocalIp: (ip) => set({ localIp: ip }),

      getApiUrl: () => {
        const state = get();
        const isNative = isNativePlatform();

        // Self-heal stale / defunct cloud URLs (e.g. old krishna-eng.vercel.app)
        const activeCloudUrl = (!state.cloudUrl || state.cloudUrl.includes('krishna-eng.vercel.app'))
          ? CLOUD_URL
          : state.cloudUrl;

        // 1. In native mobile APK:
        if (isNative) {
          // If developer explicitly specified a LAN IP (e.g. 192.168.1.15), use it for testing
          if (state.activeSignal === 'local' && state.localIp && state.localIp !== 'localhost' && state.localIp !== '127.0.0.1') {
            return `http://${state.localIp}:5000/api`;
          }
          // Default on mobile APK MUST always be the verified cloud API URL
          return activeCloudUrl;
        }

        // 2. In local desktop development browser:
        if (state.activeSignal === 'local') {
          return `http://${state.localIp || 'localhost'}:5000/api`;
        }

        // 3. In web browser on production website: use relative /api for same-origin
        if (isProduction && !isNative) {
          return '/api';
        }

        return activeCloudUrl;
      }
    }),
    {
      name: 'krishna-signal-storage'
    }
  )
);

export default useSignalStore;
