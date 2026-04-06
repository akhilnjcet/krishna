import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            login: (userData, token) => {
                set({ user: userData, token, isAuthenticated: true });
            },

            logout: () => {
                set({ user: null, token: null, isAuthenticated: false });
            },

            setUser: (user) => set({ user }),
        }),
        {
            name: 'auth-storage',
            getStorage: () => localStorage, // Persist across sessions for mobile stability
        }
    )
);

export default useAuthStore;
