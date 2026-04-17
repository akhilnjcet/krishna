import { create } from 'zustand';
import api from '../services/api';

const STORAGE_KEY = 'krishna_lodge_data';

const defaultRooms = [
  {
    id: 'room-101',
    number: '101',
    status: 'available', // available | occupied | maintenance
    rent: 5000,
    tenant: null,
    pin: null,
    dueDate: null,
    advance: 0,
    electricityBill: 0,
    waterBill: 0,
    electricityStatus: 'pending',
    waterStatus: 'pending',
    notes: '',
    checkIn: null,
    checkOut: null,
  },
  {
    id: 'room-102',
    number: '102',
    status: 'available',
    rent: 5000,
    tenant: null,
    pin: null,
    dueDate: null,
    advance: 0,
    electricityBill: 0,
    waterBill: 0,
    electricityStatus: 'pending',
    waterStatus: 'pending',
    notes: '',
    checkIn: null,
    checkOut: null,
  },
];

const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        const data = JSON.parse(raw);
        // Persistence logic: Check if login was recent (within 24h)
        const now = Date.now();
        const loginExpiry = 24 * 60 * 60 * 1000; // 24 hours
        if (data.loginTimestamp && (now - data.loginTimestamp < loginExpiry)) {
            data.isAdminLoggedIn = true;
        } else {
            data.isAdminLoggedIn = false;
        }
        return data;
    }
  } catch (e) {
    console.error('Lodge store load error:', e);
  }
  return null;
};

const saveData = (state) => {
  try {
    const toSave = {
      rooms: state.rooms,
      payments: state.payments,
      complaints: state.complaints,
      adminPin: state.adminPin,
      appSettings: state.appSettings,
      loginTimestamp: state.isAdminLoggedIn ? (state.loginTimestamp || Date.now()) : null,
      lastSynced: state.lastSynced
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    
    // Auto-sync to cloud if possible (requires ERP auth token)
    const token = useAuthStore.getState().token;
    if (token) {
        state.pushToCloud();
    }
  } catch (e) {
    console.error('Lodge store save error:', e);
  }
};

const saved = loadData();

const useLodgeStore = create((set, get) => ({
  // --- State ---
  rooms: defaultRooms,
  payments: [],
  complaints: [],
  adminPin: '1234',
  appSettings: {
    upiId: 'krishnaengineering@upi',
    buildingLocation: '123 Krishna Building, Main Street',
    mapUrl: ''
  },
  isAdminLoggedIn: false,
  authenticatedTenantRoom: null, 
  isSyncing: false,
  lastSynced: saved?.lastSynced || null,


  // --- Cloud Sync ---
  pushToCloud: async () => {
    const state = get();
    const { user } = useAuthStore.getState();
    const userId = user?._id || user?.id;

    if (!userId) return;
    
    // Shield: Block stale failsafe sessions from hitting the remote DB
    if (userId === 'failsafe-admin') {
        console.warn("Cloud Sync Blocked: Administrative Legacy Session Active.");
        return; // Silent fail to prevent 'Check-in failed' alert
    }

    set({ isSyncing: true });
    try {
        const toSave = {
            rooms: state.rooms,
            payments: state.payments,
            complaints: state.complaints,
            adminPin: state.adminPin,
            appSettings: state.appSettings,
        };
        const res = await api.post('/lodge/sync', toSave);
        if (res.data.success) {
            set({ lastSynced: res.data.lastSynced });
        }
    } catch (e) {
        console.error('Cloud Sync Fail:', e);
    } finally {
        set({ isSyncing: false });
    }
  },

  pullFromCloud: async () => {
    // Only pull if we have a token
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isSyncing: true });
    try {
        const res = await api.get('/lodge');
        if (res.data && res.data.rooms && res.data.rooms.length > 0) {
            // Merge logic or direct set
            set({
                rooms: res.data.rooms,
                payments: res.data.payments || [],
                complaints: res.data.complaints || [],
                adminPin: res.data.adminPin || '1234',
                appSettings: res.data.appSettings || get().appSettings,
                lastSynced: res.data.lastSynced
            });
            // Also update local storage silently
            const toSave = {
                rooms: res.data.rooms,
                payments: res.data.payments || [],
                complaints: res.data.complaints || [],
                adminPin: res.data.adminPin || '1234',
                appSettings: res.data.appSettings || get().appSettings,
                lastSynced: res.data.lastSynced,
                loginTimestamp: get().loginTimestamp,
                isAdminLoggedIn: get().isAdminLoggedIn
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        }
    } catch (e) {
        console.error('Cloud Pull Fail:', e);
    } finally {
        set({ isSyncing: false });
    }
  },

  // --- Admin Settings ---
  updateAppSettings: (newSettings) => {
    set((state) => ({ appSettings: { ...state.appSettings, ...newSettings } }));
    saveData(get());
  },

  // --- Admin Auth ---
  loginAdmin: (pin) => {
    const state = get();
    if (pin === state.adminPin) {
      set({ isAdminLoggedIn: true, loginTimestamp: Date.now() });
      get().pullFromCloud(); // Sync on login
      saveData(get());
      return true;
    }
    return false;
  },
  logoutAdmin: () => {
    set({ isAdminLoggedIn: false, loginTimestamp: null });
    saveData(get());
  },

  changePin: (newPin) => {
    set({ adminPin: newPin });
    saveData(get());
  },

  // --- Tenant Auth ---
  loginTenant: (roomNumber, pin) => {
    const room = get().rooms.find(r => r.number === roomNumber && r.status === 'occupied');
    if (room && room.pin === pin) {
      set({ authenticatedTenantRoom: roomNumber });
      return true;
    }
    return false;
  },
  logoutTenant: () => set({ authenticatedTenantRoom: null }),

  // --- Room Management ---
    // Unified Room CRUD for Administrator (Dual Sync: REST API + LodgeData Blob)
    addRoom: async (number, rent) => {
        try {
            const res = await api.post('/rooms', { 
                number, 
                price: parseFloat(rent),
                status: 'active'
            });
            
            const newRoom = {
                id: res.data._id || Date.now().toString(),
                number,
                rent: parseFloat(rent),
                status: 'available',
                tenant: null,
                pin: Math.floor(1000 + Math.random() * 9000).toString(),
                checkIn: null,
                advance: 0
            };
            
            set(state => ({ rooms: [...state.rooms, newRoom] }));
            get().pushToCloud();
            alert('Room Integrated into ERP Grid');
        } catch (e) {
            console.error(e);
            alert('Cloud Registration Failed');
        }
    },

    editRoomDetails: async (id, number, rent) => {
        try {
            await api.put(`/rooms/${id}`, { 
                number, 
                price: parseFloat(rent) 
            });
            
            set(state => ({
                rooms: state.rooms.map(r => r.id === id ? { ...r, number, rent: parseFloat(rent) } : r)
            }));
            get().pushToCloud();
        } catch (e) {
            console.error(e);
        }
    },

    deleteRoomManual: async (id) => {
        // Optimistic Deletion: Purge from UI instantly
        set(state => ({ rooms: state.rooms.filter(r => r.id !== id) }));
        
        try {
            await api.delete(`/rooms/${id}`);
            // Force Cloud Sync to persist the purge
            get().pushToCloud();
        } catch (e) {
            console.warn("Server-side deletion skipped or failed, local purge sustained.", e);
            // We do NOT roll back the UI delete because the room must go away regardless
            get().pushToCloud();
        }
    },

  assignTenant: async (roomId, tenantName, rent, dueDate, advance = 0) => {
    // Generate 4-digit PIN (Note: New logic uses server PINs for bookings, this is for active legacy stays)
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              tenant: tenantName,
              pin: newPin,
              rent,
              dueDate,
              advance,
              status: 'occupied',
              checkIn: new Date().toISOString(),
              checkOut: null,
            }
          : r
      ),
    }));
    await get().pushToCloud();
    return newPin;
  },

  checkOutRoom: async (roomId) => {
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              status: 'available',
              tenant: null,
              pin: null, 
              dueDate: null,
              advance: 0,
              electricityBill: 0,
              waterBill: 0,
              electricityStatus: 'pending',
              waterStatus: 'pending',
              checkOut: new Date().toISOString(),
            }
          : r
      ),
    }));
    await get().pushToCloud();
  },

  setRoomStatus: (roomId, status) => {
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, status } : r
      ),
    }));
    saveData(get());
  },

  // --- Payments ---
  addPayment: (payment) => {
    const newPayment = {
      ...payment,
      id: 'pay-' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      payments: [newPayment, ...state.payments],
    }));
    saveData(get());
    return newPayment;
  },

  approvePayment: (paymentId) => {
    const state = get();
    const payment = state.payments.find(p => p.id === paymentId);
    if (!payment) return;

    set((state) => ({
      payments: state.payments.map((p) =>
        p.id === paymentId ? { ...p, status: 'Completed' } : p
      ),
    }));

    if (payment.type === 'electricity' || payment.type === 'water') {
        const room = state.rooms.find(r => r.number === payment.roomNumber);
        if (room) {
            get().markBillPaid(room.id, payment.type, payment.amount);
        }
    }
    saveData(get());
  },

  rejectPayment: (paymentId) => {
    set((state) => ({
      payments: state.payments.map((p) =>
        p.id === paymentId ? { ...p, status: 'Rejected' } : p
      ),
    }));
    saveData(get());
  },

  getPaymentsByRoom: (roomNumber) => {
    return get().payments.filter((p) => p.roomNumber === roomNumber);
  },

  getTotalIncome: () => {
    return get().payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  },

  // --- Reports & Analytics ---
  getMonthlyReport: () => {
    const payments = get().payments;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyPayments = payments.filter(p => {
      const d = new Date(p.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const incomeByType = monthlyPayments.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + p.amount;
      return acc;
    }, {});

    return {
      monthlyTotal: monthlyPayments.reduce((sum, p) => sum + p.amount, 0),
      incomeByType,
      pendingDues: get().getPendingDues(),
      occupiedCount: get().getOccupiedCount()
    };
  },

  getPendingDues: () => {
    const state = get();
    return state.rooms.reduce((sum, r) => {
      if (r.status === 'occupied' && r.dueDate) {
        const due = new Date(r.dueDate);
        const now = new Date();
        if (due <= now) {
          // Check if rent was paid this month
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();
          const paidThisMonth = state.payments.some(
            (p) =>
              p.roomNumber === r.number &&
              p.type === 'rent' &&
              new Date(p.timestamp).getMonth() === thisMonth &&
              new Date(p.timestamp).getFullYear() === thisYear
          );
          if (!paidThisMonth) return sum + r.rent;
        }
      }
      return sum;
    }, 0);
  },

  // --- Complaints ---
  addComplaint: (complaint) => {
    const newComplaint = {
      ...complaint,
      id: 'comp-' + Date.now(),
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    set((state) => ({
      complaints: [newComplaint, ...state.complaints],
    }));
    saveData(get());
    return newComplaint;
  },

  resolveComplaint: (complaintId) => {
    set((state) => ({
      complaints: state.complaints.map((c) =>
        c.id === complaintId
          ? { ...c, resolved: true, resolvedAt: new Date().toISOString() }
          : c
      ),
    }));
    saveData(get());
  },

  getComplaintsByRoom: (roomNumber) => {
    return get().complaints.filter((c) => c.roomNumber === roomNumber);
  },

  getUnresolvedComplaints: () => {
    return get().complaints.filter((c) => !c.resolved);
  },

  // --- Bills ---
  setBill: (roomId, billType, amount) => {
    const field = billType === 'electricity' ? 'electricityBill' : 'waterBill';
    const statusField =
      billType === 'electricity' ? 'electricityStatus' : 'waterStatus';
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, [field]: amount, [statusField]: 'pending' } : r
      ),
    }));
    saveData(get());
  },

  markBillPaid: (roomId, billType, amountPaid) => {
    const field = billType === 'electricity' ? 'electricityBill' : 'waterBill';
    const statusField =
      billType === 'electricity' ? 'electricityStatus' : 'waterStatus';
    set((state) => ({
      rooms: state.rooms.map((r) => {
        if (r.id === roomId) {
          const currentBill = r[field] || 0;
          let paidAmt = amountPaid !== undefined ? parseFloat(amountPaid) : currentBill;
          if (isNaN(paidAmt)) paidAmt = 0;
          const newAmount = Math.max(0, currentBill - paidAmt);
          return {
            ...r,
            [field]: newAmount,
            [statusField]: newAmount === 0 ? 'paid' : 'pending'
          };
        }
        return r;
      }),
    }));
    saveData(get());
  },

  // --- Utility ---
  getRoomByNumber: (number) => {
    return get().rooms.find((r) => String(r.number) === String(number));
  },

  getOccupiedCount: () => {
    return get().rooms.filter((r) => r.status === 'occupied').length;
  },
}));

export default useLodgeStore;
