import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auto-detect: if running on Vercel/production, always use cloud URL
const isProduction = typeof window !== 'undefined' && 
  !window.location.hostname.includes('localhost') && 
  !window.location.hostname.includes('127.0.0.1') &&
  !window.location.hostname.includes('192.168.');

const CLOUD_URL = 'https://krishna-akhilnjcets-projects.vercel.app/api';

const useSignalStore = create(
  persist(
    (set, get) => ({
      // Auto-set to 'cloud' on production, 'local' on localhost
      activeSignal: isProduction ? 'cloud' : 'local',
      localIp: 'localhost',
      cloudUrl: CLOUD_URL,

      toggleSignal: (type) => set({ activeSignal: type }),
      setLocalIp: (ip) => set({ localIp: ip }),

      getApiUrl: () => {
        const state = get();
        // On production, ALWAYS use cloud — ignore any stale localStorage value
        if (isProduction) {
          return state.cloudUrl || CLOUD_URL;
        }
        if (state.activeSignal === 'local') {
          return `http://${state.localIp || 'localhost'}:5000/api`;
        }
        return state.cloudUrl || CLOUD_URL;
      }
    }),
    {
      name: 'krishna-signal-storage',
      // On production, override any stale 'local' signal saved from a previous session
      onRehydrateStorage: () => (state) => {
        if (isProduction && state && state.activeSignal === 'local') {
          state.activeSignal = 'cloud';
        }
      }
    }
  )
);

export default useSignalStore;
