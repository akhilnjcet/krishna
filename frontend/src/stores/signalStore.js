import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSignalStore = create(
  persist(
    (set, get) => ({
      activeSignal: 'cloud', // 'cloud' or 'local'
      localIp: '192.168.1.100', // Default placeholder
      cloudUrl: 'https://krishna-akhilnjcets-projects.vercel.app/api',
      
      toggleSignal: (type) => set({ activeSignal: type }),
      setLocalIp: (ip) => set({ localIp: ip }),
      
      getApiUrl: () => {
        const state = get();
        if (state.activeSignal === 'local') {
          return `http://${state.localIp}:5000/api`;
        }
        return state.cloudUrl;
      }
    }),
    {
      name: 'krishna-signal-storage',
    }
  )
);

export default useSignalStore;
