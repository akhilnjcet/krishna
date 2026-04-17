import { create } from 'zustand';
import api from '../services/api';

const useBookingStore = create((set, get) => ({
    rooms: [],
    availableRooms: [],
    userBookings: [],
    loading: false,
    error: null,

    fetchRooms: async () => {
        set({ loading: true });
        try {
            const res = await api.get('/rooms');
            set({ rooms: res.data, error: null });
        } catch (err) {
            set({ error: err.message });
        } finally {
            set({ loading: false });
        }
    },

    checkAvailability: async (checkIn, checkOut) => {
        set({ loading: true });
        try {
            const res = await api.get(`/rooms/available?check_in=${checkIn}&check_out=${checkOut}`);
            set({ availableRooms: res.data, error: null });
            return res.data;
        } catch (err) {
            set({ error: err.message });
            return [];
        } finally {
            set({ loading: false });
        }
    },

    createBooking: async (bookingData) => {
        set({ loading: true });
        try {
            const res = await api.post('/bookings', bookingData);
            set((state) => ({ 
                userBookings: [res.data, ...state.userBookings],
                error: null 
            }));
            return { success: true, data: res.data };
        } catch (err) {
            set({ error: err.response?.data?.error || err.message });
            return { success: false, error: err.response?.data?.error || err.message };
        } finally {
            set({ loading: false });
        }
    },

    fetchUserBookings: async (userId) => {
        if (!userId) return;
        set({ loading: true });
        try {
            const res = await api.get(`/bookings/user/${userId}`);
            set({ userBookings: res.data, error: null });
        } catch (err) {
            set({ error: err.message });
        } finally {
            set({ loading: false });
        }
    }
}));

export default useBookingStore;
