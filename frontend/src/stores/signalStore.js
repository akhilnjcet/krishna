import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSignalStore = create(
  persist(
    (set, get) => ({
      activeSignal: 'local', // Forced to local to connect to your updated backend
      localIp: 'localhost', 
      cloudUrl: 'https://krishna-akhilnjcets-projects.vercel.app/api',
      
      toggleSignal: (type) => set({ activeSignal: type }),
      setLocalIp: (ip) => set({ localIp: ip }),
      
      getApiUrl: () => {
        const state = get();
        if (state.activeSignal === 'local') {
          return `http://localhost:5000/api`;
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
