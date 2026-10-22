import React, { useState, useEffect } from 'react';
import { 
    Building2, Plus, DoorOpen, List, Trash2, Edit3, UserPlus, 
    Calendar, IndianRupee, AlertTriangle, Users, CheckCircle, 
    Settings, LogOut, Clock, Link, Check, X, Building, BarChart3, ShieldAlert, ArrowLeft, Folder,
    Eye, Search, Filter, ShieldCheck, CreditCard, ChevronLeft, ChevronRight, FileText, CheckCircle2,
    RefreshCcw, LogIn
} from 'lucide-react';
import api from '../../services/api';
import { getDirectImageUrl, expandGoogleDriveFolders } from '../../utils/imageUtils';
import DriveImage from '../../components/DriveImage';
import LodgeBillingManager from './LodgeBillingManager';
import LodgeTenantPaymentModal from '../../components/lodge/LodgeTenantPaymentModal';
import ResidencyAcknowledgementModal from '../../components/ResidencyAcknowledgementModal';
import { getSocket } from '../../utils/socket';

export default function LodgeAdminManager() {
  const [selectedLodge, setSelectedLodge] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeGalleryRoom, setActiveGalleryRoom] = useState(null);

  // Core Data
  const [rooms, setRooms] = useState([]);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({ totalBookings: 0, totalRevenue: 0, totalUsers: 0, occupancyRate: 0, activeBookings: 0 });
  
  // Search, Filtering & Detail States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedRoomDetail, setSelectedRoomDetail] = useState(null);
  const [roomDetailTab, setRoomDetailTab] = useState('overview');

  // Forms & Modals
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({ 
    roomNumber: '',
    name: '',
    building: '',
    floor: '',
    type: 'Standard', 
    price: '', 
    rentCycle: 'monthly', 
    maxGuests: '', 
    description: '', 
    interiorFiles: [], 
    exteriorFiles: [],
    interiorDriveUrls: '',
    exteriorDriveUrls: '',
    videoUrl: ''
  });

  const [showLodgeEdit, setShowLodgeEdit] = useState(false);
  const [lodgeForm, setLodgeForm] = useState({ 
    name: '', 
    description: '', 
    address: '', 
    lat: '', 
    lng: '', 
    mapUrl: '',
    images: [],
    driveUrls: ''
  });

  // Edit Room
  const [editingRoom, setEditingRoom] = useState(null);

  // Edit Client / Reset Password
  const [editClient, setEditClient] = useState(null);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', password: '', status: 'active' });

  // Assign Room / New Booking Modal
  const [assignModal, setAssignModal] = useState({ 
    show: false, 
    roomId: null, 
    roomNumber: '',
    roomName: '',
    roomType: '',
    userId: '',
    checkIn: '',
    checkOut: '',
    totalAmount: '',
    securityDeposit: '',
    adminNotes: '',
    unavailableIntervals: [],
    loadingSchedule: false
  });

  // Edit Booking Modal
  const [editBookingModal, setEditBookingModal] = useState({
    show: false,
    booking: null,
    checkIn: '',
    checkOut: '',
    totalAmount: '',
    securityDeposit: '',
    adminNotes: '',
    reason: '',
    unavailableIntervals: [],
    loadingSchedule: false
  });

  // Check-Out / Close Booking Modal
  const [checkoutModal, setCheckoutModal] = useState({
    show: false,
    booking: null,
    actualCheckOut: '',
    checkoutNotes: '',
    issueRefund: false,
    refundAmount: '',
    refundMethod: 'Bank Transfer',
    refundReason: 'Security deposit refund upon tenancy closure',
    submitting: false
  });

  // Residency Acknowledgement Modal
  const [viewAckBookingId, setViewAckBookingId] = useState(null);

  // Occupancy Sub-views: 'calendar' | 'history'
  const [occupancySubView, setOccupancySubView] = useState('calendar');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [historySearch, setHistorySearch] = useState('');
  const [historyRoomFilter, setHistoryRoomFilter] = useState('All');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('All');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');

  // Add Payment
  const [paymentModal, setPaymentModal] = useState({ show: false, customerId: '', amount: '', notes: '' });

  // Security Deposit & Settlement Hub Modal
  const [settlementModalData, setSettlementModalData] = useState(null);

  useEffect(() => {
    fetchBaseLodge();
  }, []);

  useEffect(() => {
    if (selectedLodge && selectedLodge._id !== 'error_state') {
      setLodgeForm({
        name: selectedLodge.name || '',
        description: selectedLodge.description || '',
        address: selectedLodge.location?.address || '',
        lat: selectedLodge.location?.lat || '',
        lng: selectedLodge.location?.lng || '',
        mapUrl: selectedLodge.location?.mapUrl || '',
        images: [],
        driveUrls: ''
      });
    }
  }, [selectedLodge]);

  const refreshActiveTabData = (targetTab = activeTab) => {
    if (!selectedLodge || selectedLodge._id === 'error_state') return;
    const lodgeId = selectedLodge._id;
    
    // Tab-targeted fetching to eliminate redundant requests and reduce latency
    if (targetTab === 'dashboard') {
      fetchRooms(lodgeId);
      fetchBookings();
      fetchStats();
    } else if (targetTab === 'rooms') {
      fetchRooms(lodgeId);
      fetchClients();
    } else if (targetTab === 'occupancy') {
      fetchRooms(lodgeId);
      fetchBookings();
    } else if (targetTab === 'clients') {
      fetchClients();
      fetchBookings();
    } else if (targetTab === 'complaints') {
      fetchComplaints();
    }
  };

  // Initial load when selectedLodge becomes ready
  useEffect(() => {
    if (!selectedLodge || selectedLodge._id === 'error_state') return;
    refreshActiveTabData('dashboard');
  }, [selectedLodge]);

  // Tab switch: targeted fetch only for the newly selected tab
  useEffect(() => {
    if (!selectedLodge || selectedLodge._id === 'error_state') return;
    refreshActiveTabData(activeTab);
  }, [activeTab]);

  // Real-Time Socket.IO Synchronization
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleSync = () => {
        refreshActiveTabData();
      };
      socket.on('room_updated', handleSync);
      socket.on('booking_updated', handleSync);
      socket.on('payment_updated', handleSync);
      socket.on('maintenance_updated', handleSync);
      return () => {
        socket.off('room_updated', handleSync);
        socket.off('booking_updated', handleSync);
        socket.off('payment_updated', handleSync);
        socket.off('maintenance_updated', handleSync);
      };
    }
  }, [selectedLodge]);

  const fetchBaseLodge = async () => {
    try {
      console.log('[CORE] Fetching building registry...');
      const res = await api.get('/lodge');
      let lodgeList = res.data;
      
      if (lodgeList.length === 0) {
        console.log('[SYSTEM] Registry empty. Attempting auto-seeding...');
        try {
          const seedData = {
            name: 'Krishna Building', 
            description: 'Main Krishna ERP Tenancy Building Command Center',
            location: { 
              address: 'Main Street, Krishna Block', 
              lat: 12.9716, 
              lng: 77.5946 
            }, 
            amenities: ['24/7 Security', 'High-Speed Wi-Fi', 'Power Backup'], 
            images: []
          };
          console.log('[DEBUG] Sending Seed Data:', seedData);
          await api.post('/lodge', seedData);
          console.log('[SUCCESS] Building seeded. Refreshing list...');
          const secondRes = await api.get('/lodge');
          lodgeList = secondRes.data;
        } catch (postErr) {
          console.error('[CRITICAL] Seeding failed:', postErr.response?.data || postErr.message);
          throw new Error('Building database initialization failed. Access Restricted.');
        }
      }

      if (lodgeList && lodgeList.length > 0) {
         console.log('[CORE] Building Loaded:', lodgeList[0].name);
         const lodge = lodgeList[0];
         if (lodge.images) {
             lodge.images = await expandGoogleDriveFolders(lodge.images);
         }
         setSelectedLodge(lodge);
         if(activeTab === 'dashboard') fetchStats();
      } else {
         throw new Error('Database synchronization error: No building entry found after seeding.');
      }
    } catch (err) { 
        console.error('[CORE] Global Lodge Error:', err); 
        setSelectedLodge({ 
            _id: 'error_state', 
            name: 'Building System Offline', 
            errorDetail: err.response?.data?.message || err.message 
        });
    }
  };

  const fetchStats = async () => {
      try {
          const res = await api.get('/lodge/sys/stats');
          console.log('[DEBUG] Stats Received:', res.data);
          setStats(res.data);
      } catch (e) { console.error('Stats fetch error:', e); }
  };

  const fetchRooms = async (lodgeId) => {
    if (!lodgeId || lodgeId === 'error_state') return;
    const res = await api.get(`/rooms/lodge/${lodgeId}`);
    const roomsData = res.data || [];
    // Display rooms immediately so UI renders in <100ms
    setRooms(roomsData);

    // Non-blocking background folder expansion if needed
    const hasFolders = roomsData.some(r => 
        (r.interiorPhotos || []).some(p => (p.url || p).includes('/folders/')) ||
        (r.exteriorPhotos || []).some(p => (p.url || p).includes('/folders/'))
    );
    if (hasFolders) {
        Promise.all(roomsData.map(async room => {
            const expandedInterior = await expandGoogleDriveFolders(room.interiorPhotos || []);
            const expandedExterior = await expandGoogleDriveFolders(room.exteriorPhotos || []);
            return {
                ...room,
                interiorPhotos: expandedInterior,
                exteriorPhotos: expandedExterior
            };
        })).then(expanded => setRooms(expanded)).catch(e => console.warn('Background folder expansion error:', e));
    }
  };
  
  const fetchClients = async () => {
    const res = await api.get('/auth/users?role=customer');
    setClients(res.data);
  };
  const fetchPayments = async () => {
    const res = await api.get('/payments');
    setPayments(res.data);
  };
  const fetchComplaints = async () => {
    const res = await api.get('/complaints');
    setComplaints(res.data);
  };
  const fetchBookings = async () => {
    const res = await api.get('/bookings/all');
    setBookings(res.data);
  };


  // ROOM LOGIC
  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLodge || selectedLodge._id === 'error_state') {
        return alert("Cannot save room: Building system is offline or not yet initialized in database.");
    }

    try {
      const formData = new FormData();
      formData.append('type', roomForm.type);
      formData.append('roomNumber', roomForm.roomNumber || '');
      formData.append('name', roomForm.name || '');
      formData.append('building', roomForm.building || '');
      formData.append('floor', roomForm.floor || '');
      formData.append('price', roomForm.price);
      formData.append('rentCycle', roomForm.rentCycle);
      formData.append('maxGuests', roomForm.maxGuests);
      formData.append('description', roomForm.description);
      formData.append('lodgeId', selectedLodge._id);
      formData.append('videoUrl', roomForm.videoUrl || '');
      
      Array.from(roomForm.interiorFiles || []).forEach(f => formData.append('interiorPhotos', f));
      Array.from(roomForm.exteriorFiles || []).forEach(f => formData.append('exteriorPhotos', f));

      if (roomForm.interiorDriveUrls) {
          roomForm.interiorDriveUrls.split(',').forEach(u => {
              if (u.trim()) formData.append('interiorDriveUrls', u.trim());
          });
      }
      if (roomForm.exteriorDriveUrls) {
          roomForm.exteriorDriveUrls.split(',').forEach(u => {
              if (u.trim()) formData.append('exteriorDriveUrls', u.trim());
          });
      }

      if (editingRoom) {
          // Preserve existing photos
          (editingRoom.interiorPhotos || []).forEach(img => {
              formData.append('existingInterior', JSON.stringify(img));
          });
          (editingRoom.exteriorPhotos || []).forEach(img => {
              formData.append('existingExterior', JSON.stringify(img));
          });
          await api.put(`/rooms/${editingRoom._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      } else {
          await api.post('/rooms', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      }
      setShowRoomForm(false); 
      setEditingRoom(null);
      setRoomForm({ 
        roomNumber: '',
        name: '',
        building: '',
        floor: '',
        type: 'Standard', 
        price: '', 
        rentCycle: 'monthly', 
        maxGuests: '', 
        description: '', 
        interiorFiles: [], 
        exteriorFiles: [],
        interiorDriveUrls: '',
        exteriorDriveUrls: '',
        videoUrl: ''
      });
      fetchRooms(selectedLodge._id);
    } catch(err) { 
        console.error('Room Save Error:', err);
        alert(err.response?.data?.message || 'Error saving room. Check connection.'); 
    }
  };

  const handleLodgeSubmit = async (e) => {
      e.preventDefault();
      try {
          const formData = new FormData();
          formData.append('name', lodgeForm.name);
          formData.append('description', lodgeForm.description);
          formData.append('location', JSON.stringify({ 
              address: lodgeForm.address, 
              lat: parseFloat(lodgeForm.lat), 
              lng: parseFloat(lodgeForm.lng),
              mapUrl: lodgeForm.mapUrl 
          }));
          Array.from(lodgeForm.images || []).forEach(f => formData.append('newImages', f));
          
          if (lodgeForm.driveUrls) {
              lodgeForm.driveUrls.split(',').forEach(u => {
                  if (u.trim()) formData.append('driveUrls', u.trim());
              });
          }

          // Preserve existing images
          if (selectedLodge && selectedLodge.images) {
              selectedLodge.images.forEach(img => {
                  formData.append('existingImages', JSON.stringify(img));
              });
          }
          
          await api.put(`/lodge/${selectedLodge._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          alert('Building updated!');
          setShowLodgeEdit(false);
          fetchBaseLodge();
      } catch (err) {
          alert('Failed to update building');
      }
  };

  const deleteRoom = async (id) => {
     if(confirm("Confirm Deletion?")) {
         await api.delete(`/rooms/${id}`);
         fetchRooms(selectedLodge._id);
     }
  };

  // Open Assign Room Modal with live schedule & unavailable dates
  const handleOpenAssignModal = async (room) => {
    const today = new Date();
    const defaultCheckIn = today.toISOString().split('T')[0];
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);
    const defaultCheckOut = nextMonth.toISOString().split('T')[0];

    setAssignModal({
      show: true,
      roomId: room._id,
      roomNumber: room.roomNumber,
      roomName: room.displayName || room.name || (room.roomNumber ? `Room ${room.roomNumber}` : 'Unit'),
      roomType: room.type,
      userId: '',
      checkIn: defaultCheckIn,
      checkOut: defaultCheckOut,
      totalAmount: String(room.price || ''),
      securityDeposit: String(room.securityDeposit || ''),
      adminNotes: '',
      unavailableIntervals: [],
      loadingSchedule: true
    });

    try {
      const res = await api.get(`/bookings/room-schedule/${room._id}`);
      if (res.data?.intervals) {
        setAssignModal(prev => ({
          ...prev,
          unavailableIntervals: res.data.intervals,
          loadingSchedule: false
        }));
      }
    } catch (e) {
      console.warn('Failed to load room schedule:', e);
      setAssignModal(prev => ({ ...prev, loadingSchedule: false }));
    }
  };

  const assignRoomManual = async (e) => {
      e.preventDefault();
      try {
          const { roomId, userId, checkIn, checkOut, totalAmount, securityDeposit, adminNotes } = assignModal;
          if (!roomId || !userId || !checkIn || !checkOut) {
            return alert("Please select a tenant identity and both check-in & check-out dates.");
          }
          if (new Date(checkIn) >= new Date(checkOut)) {
            return alert("Check-out date must be after check-in date.");
          }

          await api.post('/bookings/admin-assign', {
              lodgeId: selectedLodge._id,
              roomId,
              userId,
              checkIn: new Date(checkIn),
              checkOut: new Date(checkOut),
              totalAmount: totalAmount !== '' ? parseFloat(totalAmount) : undefined,
              securityDeposit: securityDeposit !== '' ? parseFloat(securityDeposit) : undefined,
              adminNotes: adminNotes || undefined
          });
          alert("Room Booking Assigned Successfully!");
          setAssignModal({ show: false, roomId: null, roomNumber: '', roomName: '', roomType: '', userId: '', checkIn: '', checkOut: '', totalAmount: '', securityDeposit: '', adminNotes: '', unavailableIntervals: [], loadingSchedule: false });
          refreshActiveTabData();
      } catch(e) { 
        alert(e.response?.data?.message || "Error assigning booking. Please check for date overlaps."); 
      }
  };

  // Open Edit Booking Modal
  const handleOpenEditBooking = async (booking) => {
    const roomId = booking.roomId?._id || booking.roomId;
    setEditBookingModal({
      show: true,
      booking,
      checkIn: booking.checkIn ? new Date(booking.checkIn).toISOString().split('T')[0] : '',
      checkOut: booking.checkOut ? new Date(booking.checkOut).toISOString().split('T')[0] : '',
      totalAmount: String(booking.totalAmount || ''),
      securityDeposit: String(booking.securityDeposit || ''),
      adminNotes: booking.adminNotes || '',
      reason: '',
      unavailableIntervals: [],
      loadingSchedule: true
    });

    try {
      const res = await api.get(`/bookings/room-schedule/${roomId}`);
      if (res.data?.intervals) {
        const otherIntervals = res.data.intervals.filter(i => String(i.bookingId) !== String(booking._id));
        setEditBookingModal(prev => ({
          ...prev,
          unavailableIntervals: otherIntervals,
          loadingSchedule: false
        }));
      }
    } catch (e) {
      console.warn('Failed to load room schedule:', e);
      setEditBookingModal(prev => ({ ...prev, loadingSchedule: false }));
    }
  };

  const handleSaveEditBooking = async (e) => {
    e.preventDefault();
    try {
      const { booking, checkIn, checkOut, totalAmount, securityDeposit, adminNotes, reason } = editBookingModal;
      if (new Date(checkIn) >= new Date(checkOut)) {
        return alert("Check-out date must be after check-in date.");
      }

      await api.put(`/bookings/${booking._id}/admin-edit`, {
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        totalAmount: parseFloat(totalAmount) || 0,
        securityDeposit: parseFloat(securityDeposit) || 0,
        adminNotes,
        reason: reason || 'Booking parameters updated by Administrator'
      });

      alert("Booking parameters updated successfully!");
      setEditBookingModal(prev => ({ ...prev, show: false }));
      refreshActiveTabData();
    } catch (e) {
      alert(e.response?.data?.message || "Error updating booking.");
    }
  };

  // Open Check-Out Modal
  const handleOpenCheckout = (booking) => {
    const originalDep = parseFloat(booking.securityDeposit || booking.roomId?.securityDeposit || 0);
    const adjustments = (booking.depositAdjustments || []).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const availableDep = Math.max(0, originalDep - adjustments);

    setCheckoutModal({
      show: true,
      booking,
      actualCheckOut: new Date().toISOString().split('T')[0],
      checkoutNotes: '',
      issueRefund: availableDep > 0,
      refundAmount: String(availableDep),
      refundMethod: 'Bank Transfer',
      refundReason: 'Security deposit refund upon tenancy closure and clearance',
      submitting: false
    });
  };

  const handleConfirmCheckout = async (e) => {
    e.preventDefault();
    try {
      const { booking, actualCheckOut, checkoutNotes, issueRefund, refundAmount, refundMethod, refundReason } = checkoutModal;
      setCheckoutModal(prev => ({ ...prev, submitting: true }));

      await api.put(`/bookings/${booking._id}/checkout`, {
        actualCheckOut: actualCheckOut ? new Date(actualCheckOut) : new Date(),
        checkoutNotes: checkoutNotes.trim(),
        refundDeposit: issueRefund && parseFloat(refundAmount) > 0,
        refundAmount: parseFloat(refundAmount) || 0,
        refundMethod: refundMethod || 'Bank Transfer',
        refundReason: refundReason || 'Security deposit refund upon tenancy closure'
      });

      alert("Tenant checked out successfully! Booking closed and past payment history preserved.");
      setCheckoutModal(prev => ({ ...prev, show: false, submitting: false }));
      refreshActiveTabData();
    } catch (e) {
      alert(e.response?.data?.message || "Checkout failed.");
      setCheckoutModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // OCCUPANCY LOGIC
  const cancelBooking = async (id) => {
      if(confirm('Evict tenant and cancel booking? This marks the booking cancelled without deleting history.')) {
          await api.put(`/bookings/${id}/cancel`);
          fetchBookings();
      }
  };

  const approveExtension = async (id) => {
      if(confirm('Approve stay extension?')) {
          await api.put(`/bookings/${id}/extend/approve`);
          fetchBookings();
      }
  };

  const rejectExtension = async (id) => {
      if(confirm('Reject stay extension?')) {
          await api.put(`/bookings/${id}/extend/reject`);
          fetchBookings();
      }
  };

  // REGISTRY LOGIC
  const handleClientEdit = async (e) => {
      e.preventDefault();
      try {
          await api.put(`/auth/${editClient._id}/admin-edit`, clientForm);
          alert('Client updated successfully');
          setEditClient(null); fetchClients();
      } catch(e) { alert("Update failed"); }
  };



  // FINANCE LOGIC
  const handleVerifyPayment = async (id) => {
      if(confirm('Approve this transaction?')) {
          await api.put(`/payments/${id}/verify`);
          fetchPayments();
      }
  };
  
  const submitManualPayment = async (e) => {
      e.preventDefault();
      try {
          await api.post('/payments/manual', {
              customerId: paymentModal.customerId,
              amount: paymentModal.amount,
              notes: paymentModal.notes
          });
          alert('Cash Logged');
          setPaymentModal({ show: false, customerId: '', amount: '', notes: '' });
          fetchPayments();
      } catch(e) { alert('Logging failed'); }
  };

  // MAINTENANCE LOGIC
  const resolveComplaint = async (id) => {
      if(confirm('Mark as Resolved?')) {
          await api.put(`/complaints/${id}/resolve`);
          fetchComplaints();
      }
  };

  const TABS = [
      { id: 'dashboard', icon: BarChart3, label: 'Overview' },
      { id: 'rooms', icon: DoorOpen, label: 'Rooms' },
      { id: 'occupancy', icon: Calendar, label: 'Occupancy' },
      { id: 'registry', icon: Users, label: 'Registry' },
      { id: 'finance', icon: IndianRupee, label: 'Finance' },
      { id: 'maintenance', icon: AlertTriangle, label: 'Maintenance' },
      { id: 'billing', icon: Folder, label: 'Rent Billing' }
  ];

  if(!selectedLodge) return (
      <div className="p-20 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase text-xs">Synchronizing Building Matrix...</p>
      </div>
  );

  if (selectedLodge._id === 'error_state') {
      return (
          <div className="p-20 text-center flex flex-col items-center justify-center animate-in fade-in duration-500">
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 border-2 border-rose-100 shadow-xl shadow-rose-500/5">
                  <ShieldAlert className="w-12 h-12" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Building System Offline</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-10 max-w-lg font-medium leading-relaxed">
                  {selectedLodge.errorDetail}
              </p>
              <div className="flex gap-4">
                  <button 
                      onClick={() => { setSelectedLodge(null); fetchBaseLodge(); }}
                      className="bg-indigo-600 text-white px-10 py-5 rounded-3xl font-black shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
                  >
                      Retry Link
                  </button>
                  <button 
                      onClick={async () => {
                          try {
                              console.log('[MANUAL] Forcing database initialization...');
                              await api.post('/lodge', {
                                name: 'Krishna Building', 
                                description: 'Main Krishna ERP Tenancy Building',
                                location: { address: 'Main Street', lat: 12.0, lng: 77.0 }, 
                                amenities: ['24/7 Security'], 
                                images: []
                              });
                              fetchBaseLodge();
                          } catch (e) { 
                              console.error('[MANUAL] Force Init Failed:', e);
                              alert("Initialization failed: " + (e.response?.data?.message || e.message)); 
                          }
                      }}
                      className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-10 py-5 rounded-3xl font-black shadow-sm active:scale-95 transition-all text-sm uppercase tracking-widest hover:bg-slate-50 dark:bg-slate-800"
                  >
                      Force Initialize DB
                  </button>
              </div>
          </div>
      );
  }

  // Live Database Room Cards Enrichment (Supporting Multiple Non-overlapping Bookings)
  const now = new Date();

  const enrichedRooms = rooms.map(room => {
    const roomBookings = bookings.filter(b => {
      const bRoomId = b.roomId?._id || b.roomId;
      return String(bRoomId) === String(room._id);
    });

    // Active booking: active status and current date fits within stay, or active
    const activeBooking = roomBookings.find(b => b.status === 'active' && new Date(b.checkIn) <= now && new Date(b.checkOut) >= now)
      || roomBookings.find(b => b.status === 'active');

    const upcomingBookings = roomBookings.filter(b => b.status === 'active' && new Date(b.checkIn) > now)
      .sort((a,b) => new Date(a.checkIn) - new Date(b.checkIn));

    const pastBookings = roomBookings.filter(b => b.status === 'completed' || b.status === 'cancelled' || (b.status === 'active' && new Date(b.checkOut) < now))
      .sort((a,b) => new Date(b.checkOut) - new Date(a.checkOut));

    const occupantName = activeBooking?.userId?.name || (upcomingBookings.length > 0 ? `Upcoming: ${upcomingBookings[0].userId?.name}` : 'Vacant');
    const phone = activeBooking?.userId?.phone || activeBooking?.userId?.phoneNumber || (upcomingBookings[0]?.userId?.phone || 'N/A');
    const email = activeBooking?.userId?.email || (upcomingBookings[0]?.userId?.email || 'N/A');
    const bookingId = activeBooking?._id ? activeBooking._id.substring(activeBooking._id.length - 8).toUpperCase() : (upcomingBookings[0]?._id ? upcomingBookings[0]._id.substring(upcomingBookings[0]._id.length - 8).toUpperCase() : 'N/A');
    const checkIn = activeBooking?.checkIn ? new Date(activeBooking.checkIn).toLocaleDateString() : (upcomingBookings[0]?.checkIn ? new Date(upcomingBookings[0].checkIn).toLocaleDateString() : 'N/A');
    const checkOut = activeBooking?.checkOut ? new Date(activeBooking.checkOut).toLocaleDateString() : (upcomingBookings[0]?.checkOut ? new Date(upcomingBookings[0].checkOut).toLocaleDateString() : 'N/A');
    
    let daysRemaining = 0;
    if (activeBooking?.checkOut) {
      const diff = new Date(activeBooking.checkOut) - now;
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    const currentStatus = activeBooking ? 'Occupied' : (room.isActive === false ? 'Maintenance' : (upcomingBookings.length > 0 ? 'Reserved' : 'Available'));

    const baseRoomNum = room.roomNumber || room._id.substring(room._id.length - 3);
    const displayName = room.name || (room.roomNumber ? (room.roomNumber.toLowerCase().startsWith('room') ? room.roomNumber : `Room ${room.roomNumber}`) : `Room ${baseRoomNum}`);

    return {
      ...room,
      roomNumber: baseRoomNum,
      displayName,
      building: room.building || selectedLodge?.name || 'Krishna Building',
      floor: room.floor || 'Floor 1',
      securityDeposit: room.securityDeposit || room.price * 2,
      occupantName,
      phone,
      email,
      bookingId,
      checkIn,
      checkOut,
      daysRemaining,
      currentStatus,
      activeBooking,
      upcomingBookings,
      pastBookings,
      roomBookings,
      photos: [...(room.interiorPhotos || []), ...(room.exteriorPhotos || [])]
    };
  });

  const filteredRooms = enrichedRooms.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = 
      !searchTerm ||
      r.roomNumber.toString().toLowerCase().includes(q) ||
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.displayName && r.displayName.toLowerCase().includes(q)) ||
      r.type.toLowerCase().includes(q) ||
      r.occupantName.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.bookingId.toLowerCase().includes(q);

    const matchesStatus = 
      statusFilter === 'All' ||
      (statusFilter === 'Available' && r.occupantName === 'Vacant' && r.currentStatus === 'Available') ||
      (statusFilter === 'Occupied' && (r.occupantName !== 'Vacant' || r.currentStatus === 'Occupied')) ||
      (statusFilter === 'Reserved' && r.currentStatus === 'Reserved') ||
      (statusFilter === 'Maintenance' && r.currentStatus === 'Maintenance') ||
      (statusFilter === 'Vacant' && r.occupantName === 'Vacant') ||
      (statusFilter === 'Overdue Payment' && r.daysRemaining === 0 && r.occupantName !== 'Vacant') ||
      (statusFilter === 'Advance Paid' && r.activeBooking);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
             <button onClick={() => window.history.back()} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:bg-slate-800 transition-colors shadow-sm" title="Go Back">
                 <ArrowLeft className="w-5 h-5"/>
             </button>
             <h1 className="text-xl sm:text-3xl font-bold flex items-center text-gray-800 tracking-tight">
                 <Building2 className="w-6 h-6 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-indigo-600"/> 
                 {selectedLodge.name} Command
             </h1>
             <button onClick={() => {
                 setLodgeForm({
                     name: selectedLodge.name || '',
                     description: selectedLodge.description || '',
                     address: selectedLodge.location?.address || '',
                     lat: selectedLodge.location?.lat || '',
                     lng: selectedLodge.location?.lng || '',
                     mapUrl: selectedLodge.location?.mapUrl || '',
                     images: []
                 });
                 setShowLodgeEdit(true);
             }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors" title="Edit Building Profile">
                 <Edit3 className="w-5 h-5"/>
             </button>
         </div>
         <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl self-start sm:self-auto">System Status: Optimal</div>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-8 border-b border-gray-200 pb-2 custom-scrollbar">
         {TABS.map(tab => (
             <button 
                 key={tab.id} onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
                     activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white dark:bg-slate-900 text-gray-500 hover:bg-gray-100'
                 }`}
             >
                 <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} /> {tab.label}
             </button>
         ))}
      </div>

      {/* DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border shadow-sm group hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6"><IndianRupee className="w-6 h-6"/></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Lifetime Revenue</p>
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white font-poppins">₹{stats.totalRevenue.toLocaleString()}</h4>
                      <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center underline decoration-emerald-200">Verified Settlements Only</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border shadow-sm group hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6"><CheckCircle className="w-6 h-6"/></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Bookings</p>
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white font-poppins">{stats.totalBookings}</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-2 italic">Historical Aggregate</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border shadow-sm group hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6"><Building className="w-6 h-6"/></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Occupancy Rate</p>
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white font-poppins">{stats.occupancyRate}%</h4>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden"><div className="bg-amber-500 h-full" style={{width: `${stats.occupancyRate}%`}}></div></div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border shadow-sm group hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6"><Users className="w-6 h-6"/></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Registered Clients</p>
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white font-poppins">{stats.totalUsers}</h4>
                      <p className="text-[10px] text-indigo-500 font-bold mt-2">Active CRM Profiles</p>
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border p-10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full blur-3xl -mr-40 -mt-40 opacity-50"></div>
                  <div className="relative z-10">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Krishna Building Status</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Core telemetry for active operations.</p>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="flex items-start gap-6">
                              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border"><Clock className="w-8 h-8 text-indigo-600"/></div>
                              <div>
                                  <p className="font-black text-slate-900 dark:text-white text-lg">{stats.activeBookings} Live Residencies</p>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Tenants currently occupying units in the building.</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-6">
                              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border"><Settings className="w-8 h-8 text-amber-600"/></div>
                              <div>
                                  <p className="font-black text-slate-900 dark:text-white text-lg">System Integrity 100%</p>
                                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Auto-sync with Cloud Registry and Payment Gateway.</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Prominent Building Profile & Location Setup Form Card */}
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border p-10 shadow-sm mt-8 relative overflow-hidden animate-in fade-in duration-500">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full blur-3xl -mr-40 -mt-40 opacity-30"></div>
                  <div className="relative z-10">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                          <Settings className="w-6 h-6 text-indigo-600"/> 
                          Building Profile & Location Setup
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Configure building preview photos, address, map links, and coordinates directly.</p>
                      
                      <form onSubmit={handleLodgeSubmit} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Building Name</label>
                                  <input placeholder="Name" required className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold" value={lodgeForm.name} onChange={e => setLodgeForm({...lodgeForm, name: e.target.value})} />
                              </div>
                              <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Address</label>
                                  <input placeholder="Full Address" required className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold" value={lodgeForm.address} onChange={e => setLodgeForm({...lodgeForm, address: e.target.value})} />
                              </div>
                              <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Latitude</label>
                                  <input placeholder="Lat" type="number" step="any" required className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold" value={lodgeForm.lat} onChange={e => setLodgeForm({...lodgeForm, lat: e.target.value})} />
                              </div>
                              <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Longitude</label>
                                  <input placeholder="Lng" type="number" step="any" required className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold" value={lodgeForm.lng} onChange={e => setLodgeForm({...lodgeForm, lng: e.target.value})} />
                              </div>
                              <div className="md:col-span-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Google Maps Embed Link / URL</label>
                                  <input placeholder="https://www.google.com/maps/embed?pb=..." className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold font-poppins text-indigo-600 placeholder-slate-300" value={lodgeForm.mapUrl || ''} onChange={e => setLodgeForm({...lodgeForm, mapUrl: e.target.value})} />
                                  <p className="text-[10px] text-slate-400 mt-1.5 ml-2">Paste map embed iframe code or direct link to render it in the customer view.</p>
                              </div>
                              <div className="md:col-span-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Public Description</label>
                                  <textarea placeholder="Description" required rows="3" className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-medium" value={lodgeForm.description} onChange={e => setLodgeForm({...lodgeForm, description: e.target.value})} />
                              </div>

                              {selectedLodge.images && selectedLodge.images.length > 0 && (
                                  <div className="md:col-span-2 border-t pt-6">
                                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-2 block">Current Preview Photos (Hover & Click to Delete)</label>
                                      <div className="flex flex-wrap gap-3">
                                          {selectedLodge.images.map((img, idx) => (
                                              <div key={idx} className="relative w-20 h-20 border rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 group shadow-sm">
                                                  <DriveImage src={typeof img === 'string' ? img : img.url} alt="Lodge preview" className="w-full h-full" />
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          if (confirm('Delete this photo from building? (Takes effect after saving)')) {
                                                              setSelectedLodge({
                                                                  ...selectedLodge,
                                                                  images: selectedLodge.images.filter(i => (typeof i === 'string' ? i : i.url) !== (typeof img === 'string' ? img : img.url))
                                                              });
                                                          }
                                                      }}
                                                      className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-black uppercase tracking-wider"
                                                  >
                                                      Delete
                                                  </button>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}

                              <div className="md:col-span-2 border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Upload New photos</label>
                                      <input type="file" multiple accept="image/*" className="w-full border-2 border-slate-100 dark:border-slate-800 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 font-bold text-xs" onChange={e => setLodgeForm({...lodgeForm, images: e.target.files})} />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Connect Drive Link(s) (Comma Separated)</label>
                                      <input placeholder="https://drive.google.com/..." className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold font-poppins text-indigo-600 placeholder-slate-300" value={lodgeForm.driveUrls || ''} onChange={e => setLodgeForm({...lodgeForm, driveUrls: e.target.value})} />
                                      <p className="text-xs text-slate-400 mt-2 font-medium italic ml-2">Note: Ensure your Google Drive links (files or folders) are shared publicly as "Anyone with the link can view" so they load correctly.</p>
                                  </div>
                              </div>
                          </div>

                          <div className="flex justify-end pt-4">
                              <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4.5 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                                  Save Building Profile
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          </div>
      )}

      {/* ROOMS TAB */}
      {activeTab === 'rooms' && (
         <div className="space-y-6">
             <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border p-8 animate-in fade-in transition-all">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 className="text-xl font-bold flex items-center"><DoorOpen className="w-6 h-6 mr-2 text-indigo-500"/> Managing Rooms</h2>
                <button onClick={() => { setEditingRoom(null); setRoomForm({ roomNumber: '', name: '', building: selectedLodge?.name || 'Krishna Building', floor: 'Floor 1', type: 'Standard', price: '', rentCycle: 'monthly', maxGuests: '2', description: '', interiorFiles: [], exteriorFiles: [], interiorDriveUrls: '', exteriorDriveUrls: '', videoUrl: '' }); setShowRoomForm(!showRoomForm); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 hover:scale-105 transition-transform flex items-center">
                    <Plus className="w-4 h-4 mr-2"/> Add New Unit
                </button>
             </div>

             {showRoomForm && (
                 <form onSubmit={handleRoomSubmit} className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border mb-10 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="col-span-2 lg:col-span-2">
                        <label className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest ml-2 mb-1 block">
                            Custom Room / Unit Name *
                        </label>
                        <input 
                            placeholder="e.g. Room 5bd, Deluxe Flat 2A, Shopfloor 1, Villa 101" 
                            required 
                            className="w-full border-2 border-indigo-200 dark:border-indigo-900/60 p-3 rounded-xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-900 shadow-xs outline-none focus:ring-2 focus:ring-indigo-500" 
                            value={roomForm.name} 
                            onChange={e => {
                                const val = e.target.value;
                                setRoomForm(prev => ({
                                    ...prev,
                                    name: val,
                                    roomNumber: prev.roomNumber || val.replace(/^room\s*/i, '').trim()
                                }));
                            }} 
                        />
                    </div>
                    <div className="col-span-2 sm:col-span-1 lg:col-span-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">
                            Short Unit Code / #
                        </label>
                        <input 
                            placeholder="e.g. 5bd, 678, 101" 
                            className="w-full border p-3 rounded-xl font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 outline-none" 
                            value={roomForm.roomNumber} 
                            onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })} 
                        />
                    </div>
                    <div className="col-span-2 sm:col-span-1 lg:col-span-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">
                            Floor Level
                        </label>
                        <input 
                            placeholder="e.g. Floor 1, Ground Floor" 
                            className="w-full border p-3 rounded-xl font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 outline-none" 
                            value={roomForm.floor} 
                            onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })} 
                        />
                    </div>

                    <div className="col-span-2 lg:col-span-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Unit Type</label>
                        <select className="w-full border p-3 rounded-xl font-bold" value={roomForm.type} onChange={e => setRoomForm({...roomForm, type: e.target.value})}>
                           <option>Standard</option><option>Deluxe</option><option>Suite</option><option>Shopfloor</option><option>Quarters</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Pricing</label>
                        <input placeholder="Amount" type="number" required className="w-full border p-3 rounded-xl font-poppins font-black text-indigo-600 placeholder-slate-300" value={roomForm.price} onChange={e => setRoomForm({...roomForm, price: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Rent Cycle</label>
                        <select className="w-full border p-3 rounded-xl font-bold" value={roomForm.rentCycle} onChange={e => setRoomForm({...roomForm, rentCycle: e.target.value})}>
                           <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Capacity</label>
                        <input placeholder="Max Guests" type="number" required className="w-full border p-3 rounded-xl font-bold" value={roomForm.maxGuests} onChange={e => setRoomForm({...roomForm, maxGuests: e.target.value})} />
                    </div>
                    <div className="col-span-2 lg:col-span-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Marketing Description</label>
                        <input placeholder="Short catchy details..." required className="w-full border p-3 rounded-xl font-medium" value={roomForm.description} onChange={e => setRoomForm({...roomForm, description: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Interior Photos (Multiple Files)</label>
                        <input type="file" multiple accept="image/*" className="w-full border p-2 rounded-xl bg-white dark:bg-slate-900" onChange={e => setRoomForm({...roomForm, interiorFiles: e.target.files})} />
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Exterior Photos (Multiple Files)</label>
                        <input type="file" multiple accept="image/*" className="w-full border p-2 rounded-xl bg-white dark:bg-slate-900" onChange={e => setRoomForm({...roomForm, exteriorFiles: e.target.files})} />
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Interior G-Drive URL(s) (Comma Separated)</label>
                        <input placeholder="https://drive.google.com/..." className="w-full border p-3 rounded-xl font-medium" value={roomForm.interiorDriveUrls || ''} onChange={e => setRoomForm({...roomForm, interiorDriveUrls: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Exterior G-Drive URL(s) (Comma Separated)</label>
                        <input placeholder="https://drive.google.com/..." className="w-full border p-3 rounded-xl font-medium" value={roomForm.exteriorDriveUrls || ''} onChange={e => setRoomForm({...roomForm, exteriorDriveUrls: e.target.value})} />
                    </div>
                    <div className="col-span-2 lg:col-span-4">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Video URL (YouTube, G-Drive, or Direct link)</label>
                        <input placeholder="https://youtube.com/watch?v=... or direct mp4" className="w-full border p-3 rounded-xl font-medium" value={roomForm.videoUrl || ''} onChange={e => setRoomForm({...roomForm, videoUrl: e.target.value})} />
                    </div>
                    {editingRoom && [...(editingRoom.interiorPhotos || []), ...(editingRoom.exteriorPhotos || [])].length > 0 && (
                        <div className="col-span-2 lg:col-span-4 border-t pt-4 mt-4">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-2 block">Current Photos (Hover & Click to Delete)</label>
                            <div className="flex flex-wrap gap-3">
                                {[...(editingRoom.interiorPhotos || []), ...(editingRoom.exteriorPhotos || [])].map((img, idx) => (
                                    <div key={idx} className="relative w-20 h-20 border rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm group">
                                        <DriveImage src={img.url} alt="Current room asset" className="w-full h-full" />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (confirm('Delete this photo?')) {
                                                    try {
                                                        await api.delete(`/rooms/${editingRoom._id}/photo`, { data: { photoUrl: img.url } });
                                                        alert('Photo deleted');
                                                        const updatedRooms = await api.get(`/rooms/lodge/${selectedLodge._id}`);
                                                        setRooms(updatedRooms.data);
                                                        const updatedRoom = updatedRooms.data.find(rm => rm._id === editingRoom._id);
                                                        if (updatedRoom) {
                                                            setEditingRoom(updatedRoom);
                                                        } else {
                                                            setEditingRoom(null);
                                                        }
                                                    } catch (e) {
                                                        alert('Failed to delete photo');
                                                    }
                                                }
                                            }}
                                            className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-black uppercase tracking-wider"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="col-span-2 lg:col-span-4 flex items-center gap-3">
                        <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-wider">
                            {editingRoom ? 'Commit Changes' : 'Publish Unit Live'}
                        </button>
                        {editingRoom && (
                            <button 
                                type="button" 
                                onClick={() => {
                                    setEditingRoom(null);
                                    setShowRoomForm(false);
                                }}
                                className="px-6 py-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-sm active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                 </form>
             )}

              {/* Search & Status Filters Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 mb-6">
                 <div className="relative flex-grow">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                       type="text" 
                       placeholder="Search Room Number, Tenant Name, Phone, or Booking ID..." 
                       className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 pl-11 pr-4 py-3 rounded-xl font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
                 
                 <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                       <Filter className="w-3.5 h-3.5" /> Filter:
                    </span>
                    {['All', 'Available', 'Occupied', 'Reserved', 'Maintenance', 'Vacant', 'Overdue Payment', 'Advance Paid'].map(st => (
                       <button
                          key={st}
                          type="button"
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                             statusFilter === st 
                             ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                             : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800'
                          }`}
                       >
                          {st}
                      </button>
                    ))}
                 </div>
              </div>

              {/* Room Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredRooms.map(r => (
                     <div key={r._id} className="p-6 border rounded-[1.5rem] bg-white dark:bg-slate-900 hover:border-indigo-300 transition-all shadow-sm flex flex-col justify-between group relative overflow-hidden">
                        <div className="relative z-10 w-full space-y-4">
                           <div className="flex justify-between items-start gap-2">
                              <div>
                                 <h4 className="font-black text-slate-900 dark:text-white text-xl tracking-tight flex items-center gap-2">
                                    <span>{r.displayName}</span>
                                    <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-extrabold uppercase">
                                        {r.type}
                                    </span>
                                 </h4>
                                 <p className="text-[11px] font-bold text-slate-400 mt-0.5 flex items-center gap-2">
                                    <span>{r.building}</span> • <span>{r.floor}</span>
                                 </p>
                              </div>
                              <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-sm border ${
                                 r.currentStatus === 'Occupied' || r.occupantName !== 'Vacant' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                 r.currentStatus === 'Maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                 r.currentStatus === 'Reserved' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                 {r.currentStatus === 'Occupied' || r.occupantName !== 'Vacant' ? 'Occupied' : r.currentStatus}
                              </span>
                           </div>

                           <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 font-medium">{r.description || 'Premium Accommodation Unit with 24/7 Power Backup & Security.'}</p>

                           {/* Live Occupancy & Tenant Card Metadata */}
                           <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                              <div className="flex justify-between items-center">
                                 <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-indigo-500" /> Current Tenant:
                                 </span>
                                 <strong className={`font-black ${r.occupantName !== 'Vacant' ? 'text-slate-900 dark:text-white' : 'text-slate-400 italic'}`}>
                                    {r.occupantName}
                                 </strong>
                              </div>
                              {r.occupantName !== 'Vacant' && (
                                 <>
                                    <div className="flex justify-between items-center text-[11px]">
                                       <span className="text-slate-500 dark:text-slate-400 font-medium">Contact Signal:</span>
                                       <span className="font-bold text-slate-800 dark:text-slate-200">{r.phone}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                       <span className="text-slate-500 dark:text-slate-400 font-medium">Active Booking:</span>
                                       <span className="font-extrabold text-indigo-600 font-mono">{r.bookingId}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                       <span className="text-slate-500 dark:text-slate-400 font-medium">Lease Period:</span>
                                       <span className="font-bold text-slate-700 dark:text-slate-300">{r.checkIn} - {r.checkOut}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                       <span className="text-slate-500 dark:text-slate-400 font-medium">Stay Days Remaining:</span>
                                       <span className={`font-extrabold px-2 py-0.5 rounded ${r.daysRemaining <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                          {r.daysRemaining} Days
                                       </span>
                                    </div>
                                 </>
                              )}
                           </div>

                           {/* Photos & Videos Display */}
                           {(() => {
                               const allPhotos = r.photos || [];
                               return (
                                   <div className="mt-3 flex flex-wrap items-center gap-3">
                                       {allPhotos.slice(0, 3).map((img, idx) => (
                                           <div key={idx} className="w-12 h-12 border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 shadow-sm">
                                               <DriveImage src={img.url} alt="Room thumbnail" className="w-full h-full" />
                                           </div>
                                       ))}
                                       {allPhotos.length > 3 && (
                                           <button 
                                               type="button"
                                               onClick={() => setActiveGalleryRoom(r)}
                                               className="w-12 h-12 border bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl flex flex-col items-center justify-center font-black active:scale-95 transition-all shadow-sm text-[10px] tracking-tighter uppercase"
                                           >
                                               <span>+{allPhotos.length - 3}</span>
                                               <span>More</span>
                                           </button>
                                       )}
                                       {allPhotos.length <= 3 && allPhotos.length > 0 && (
                                           <button 
                                               type="button"
                                               onClick={() => setActiveGalleryRoom(r)}
                                               className="w-12 h-12 border bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl flex items-center justify-center font-black active:scale-95 transition-all shadow-sm text-[9px] uppercase tracking-widest"
                                           >
                                               View
                                           </button>
                                       )}
                                       {r.videoUrl && (
                                           <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 shadow-sm relative ml-1" title="Room Tour Video Loaded">
                                               <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping absolute"></span>
                                               <span className="w-2 h-2 bg-red-600 rounded-full relative"></span>
                                           </div>
                                       )}
                                   </div>
                               );
                           })()}

                           {/* Pricing & Action Toolbar */}
                           <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                              <div>
                                 <p className="font-black text-indigo-600 text-2xl font-poppins tracking-tight">₹{r.price.toLocaleString()}<span className="text-xs text-slate-400 font-bold uppercase ml-1 tracking-widest">/ {r.rentCycle}</span></p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase">Deposit: ₹{r.securityDeposit.toLocaleString()}</p>
                              </div>
                              
                              <div className="flex items-center gap-1.5 flex-wrap">
                                 <button 
                                     onClick={() => setSelectedRoomDetail(r)} 
                                     className="px-3 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-black transition-colors shadow-sm flex items-center gap-1"
                                     title="View Full Room Profile & History"
                                 >
                                     <Eye className="w-4 h-4" /> Detail
                                 </button>
                                 <button 
                                     onClick={() => handleOpenAssignModal(r)}className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors shadow-sm" 
                                     title="Assign Tenant to Room"
                                 >
                                     <UserPlus className="w-4 h-4"/>
                                 </button>
                                 <button 
                                     onClick={() => { 
                                      setEditingRoom(r); 
                                      setRoomForm({ 
                                          roomNumber: r.roomNumber || '',
                                          name: r.name || (r.roomNumber ? (r.roomNumber.toLowerCase().startsWith('room') ? r.roomNumber : `Room ${r.roomNumber}`) : ''),
                                          building: r.building || '',
                                          floor: r.floor || '',
                                          type: r.type, 
                                          price: r.price, 
                                          rentCycle: r.rentCycle || 'monthly', 
                                          maxGuests: r.maxGuests, 
                                          description: r.description || '', 
                                          interiorFiles: [], 
                                          exteriorFiles: [], 
                                          interiorDriveUrls: '', 
                                          exteriorDriveUrls: '', 
                                          videoUrl: r.videoUrl || '' 
                                      }); 
                                      setShowRoomForm(true); 
                                      window.scrollTo({ top: 300, behavior: 'smooth' });
                                  }} 
                                     className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors shadow-sm"
                                     title="Edit Room Specifications"
                                 >
                                     <Edit3 className="w-4 h-4"/>
                                 </button>
                                 <button 
                                     onClick={() => deleteRoom(r._id)} 
                                     className="p-2 sm:p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors shadow-sm"
                                     title="Deactivate Room"
                                 >
                                     <Trash2 className="w-4 h-4"/>
                                 </button>
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
              </div>
          </div>
          </div>
       )}

      {/* OCCUPANCY TAB */}
      {activeTab === 'occupancy' && (
         <div className="space-y-6 animate-in fade-in transition-all">
            {/* Top Toolbar: Sub-view Switcher & Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] shadow-xs border p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black flex items-center text-slate-900 dark:text-white">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-indigo-500 shrink-0" />
                  Room-Wise Tenancy Matrix & Booking Hub
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage multiple non-overlapping bookings per room with isolated financials and checkout audit trails.
                </p>
              </div>

              {/* Sub-view switcher */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl sm:rounded-2xl text-xs font-bold w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setOccupancySubView('calendar')}
                  className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
                    occupancySubView === 'calendar'
                      ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Room-Wise Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setOccupancySubView('history')}
                  className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
                    occupancySubView === 'history'
                      ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Searchable Booking History ({bookings.length})
                </button>
              </div>
            </div>

            {/* ═══════════ SUB-VIEW 1: ROOM-WISE CALENDAR & TIMELINE ═══════════ */}
            {occupancySubView === 'calendar' && (() => {
              const year = calendarMonth.getFullYear();
              const month = calendarMonth.getMonth();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

              const monthStart = new Date(year, month, 1, 0, 0, 0);
              const monthEnd = new Date(year, month, daysInMonth, 23, 59, 59);

              return (
                <div className="space-y-6">
                  {/* Calendar Navigation & Legend Bar */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] shadow-xs border p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                        title="Previous Month"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                      </button>

                      <div className="px-4 py-2 bg-indigo-50 dark:bg-slate-800 rounded-xl text-center">
                        <span className="text-sm font-black text-indigo-950 dark:text-white uppercase tracking-wider">
                          {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
                        title="Next Month"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setCalendarMonth(new Date())}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition ml-2"
                      >
                        Current Month
                      </button>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <span className="w-3 h-3 rounded-md bg-emerald-500"></span> Active Stay
                      </span>
                      <span className="flex items-center gap-1.5 text-purple-600">
                        <span className="w-3 h-3 rounded-md bg-purple-500"></span> Upcoming Confirmed
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-3 h-3 rounded-md bg-slate-400"></span> Completed / Past
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-3 h-3 rounded-md border border-slate-300 bg-white dark:bg-slate-800"></span> Free / Available
                      </span>
                    </div>
                  </div>

                  {/* Room Rows Grid */}
                  <div className="space-y-4">
                    {enrichedRooms.map(room => {
                      // Filter bookings overlapping with selected month
                      const roomBookingsInMonth = (room.roomBookings || []).filter(b => {
                        if (b.status === 'cancelled') return false;
                        const bStart = new Date(b.checkIn);
                        const bEnd = new Date(b.checkOut);
                        return bStart <= monthEnd && bEnd >= monthStart;
                      });

                      return (
                        <div key={room._id} className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] shadow-xs border p-4 sm:p-6 space-y-4">
                          {/* Room Header */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                  {room.displayName}
                                </h3>
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-0.5 rounded-full font-black uppercase">
                                  {room.type}
                                </span>
                                <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase border ${
                                  room.currentStatus === 'Occupied' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  room.currentStatus === 'Reserved' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                  'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                  {room.currentStatus}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                Rate: <strong className="text-indigo-600">₹{room.price.toLocaleString()}</strong> / {room.rentCycle || 'month'} • Deposit: ₹{room.securityDeposit.toLocaleString()} • {room.building}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleOpenAssignModal(room)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/10 transition active:scale-95 flex items-center gap-1.5"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Book / Assign Date Range</span>
                            </button>
                          </div>

                          {/* 30-Day Month Strip */}
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                              {calendarMonth.toLocaleString('default', { month: 'long' })} Occupancy Strip (1 - {daysInMonth})
                            </p>
                            <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 lg:grid-cols-31 gap-1 overflow-x-auto pb-1 text-center">
                              {daysArray.map(dayNum => {
                                const currentDayDate = new Date(year, month, dayNum);
                                const isToday = currentDayDate.toDateString() === new Date().toDateString();

                                // Find booking occupying this day
                                const occupyingBooking = roomBookingsInMonth.find(b => {
                                  const bStart = new Date(b.checkIn);
                                  const bEnd = new Date(b.checkOut);
                                  const dayStart = new Date(year, month, dayNum, 0, 0, 0);
                                  const dayEnd = new Date(year, month, dayNum, 23, 59, 59);
                                  return bStart <= dayEnd && bEnd >= dayStart;
                                });

                                let cellBg = 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400';
                                let tooltipText = `Day ${dayNum}: Available`;

                                if (occupyingBooking) {
                                  const nowTime = new Date();
                                  const bStart = new Date(occupyingBooking.checkIn);
                                  const bEnd = new Date(occupyingBooking.checkOut);

                                  if (occupyingBooking.status === 'completed') {
                                    cellBg = 'bg-slate-600 text-white border-slate-700 font-bold';
                                    tooltipText = `Day ${dayNum}: Checked Out - ${occupyingBooking.userId?.name || 'Resident'}`;
                                  } else if (bStart > nowTime) {
                                    cellBg = 'bg-purple-600 text-white border-purple-700 font-bold';
                                    tooltipText = `Day ${dayNum}: Upcoming - ${occupyingBooking.userId?.name || 'Resident'}`;
                                  } else {
                                    cellBg = 'bg-emerald-600 text-white border-emerald-700 font-bold';
                                    tooltipText = `Day ${dayNum}: Active Stay - ${occupyingBooking.userId?.name || 'Resident'}`;
                                  }
                                }

                                return (
                                  <div
                                    key={dayNum}
                                    title={tooltipText}
                                    className={`p-1.5 rounded-lg border text-[10px] transition-all ${cellBg} ${
                                      isToday ? 'ring-2 ring-indigo-500 font-black' : ''
                                    }`}
                                  >
                                    <span>{dayNum}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Itemized Bookings List for this Room */}
                          {roomBookingsInMonth.length > 0 ? (
                            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                Scheduled & Completed Stays This Month ({roomBookingsInMonth.length})
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {roomBookingsInMonth.map(b => {
                                  const isCompleted = b.status === 'completed';
                                  const isActive = b.status === 'active';
                                  const reqDeposit = b.securityDeposit || room.securityDeposit || 0;
                                  const usedDep = (b.depositAdjustments || []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
                                  const availDep = Math.max(0, reqDeposit - usedDep);

                                  return (
                                    <div
                                      key={b._id}
                                      className={`p-4 rounded-2xl border text-xs flex flex-col justify-between gap-3 ${
                                        isCompleted ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 opacity-90' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                      }`}
                                    >
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="font-bold text-slate-900 dark:text-white">
                                            {b.userId?.name || 'Valued Resident'}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                            isCompleted ? 'bg-blue-100 text-blue-800' :
                                            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                                          }`}>
                                            {isCompleted ? 'CHECKED OUT' : b.status}
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                          Stay: <strong className="text-slate-800 dark:text-slate-200">{new Date(b.checkIn).toLocaleDateString()}</strong> - <strong className="text-slate-800 dark:text-slate-200">{new Date(b.checkOut).toLocaleDateString()}</strong>
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                          Deposit: ₹{reqDeposit.toLocaleString()} (Avail: ₹{availDep.toLocaleString()}) • Rent: ₹{(b.totalAmount || room.price).toLocaleString()}
                                        </p>
                                        {b.actualCheckOut && (
                                          <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                            Actual Check-out: {new Date(b.actualCheckOut).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <button
                                          type="button"
                                          onClick={() => setSettlementModalData({ booking: b, initialTab: 'PAY', initialTarget: 'ALL' })}
                                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black transition flex items-center gap-1"
                                          title="Settle Dues / View Line Items"
                                        >
                                          <CreditCard className="w-3 h-3" /> Settle
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setViewAckBookingId(b._id)}
                                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-[10px] font-black transition flex items-center gap-1"
                                          title="View Residency Acknowledgement & PDF"
                                        >
                                          <FileText className="w-3 h-3" /> Agreement
                                        </button>
                                        {isActive && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenCheckout(b)}
                                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black transition flex items-center gap-1"
                                            title="Close Stay & Record Settlement"
                                          >
                                            <LogIn className="w-3 h-3 rotate-180" /> Check-Out
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditBooking(b)}
                                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition"
                                          title="Edit Booking Dates & Rent"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-1">
                              No bookings scheduled for this room in {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}. Ready to book!
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ═══════════ SUB-VIEW 2: SEARCHABLE BOOKING HISTORY DIRECTORY ═══════════ */}
            {occupancySubView === 'history' && (() => {
              // Filter bookings
              const filteredBookings = bookings.filter(b => {
                const q = historySearch.toLowerCase();
                const tenantName = (b.userId?.name || '').toLowerCase();
                const tenantPhone = (b.userId?.phone || b.userId?.phoneNumber || '').toLowerCase();
                const agreementNo = (b.agreementNumber || '').toLowerCase();
                const roomNum = String(b.roomId?.roomNumber || '').toLowerCase();

                const matchesSearch = !historySearch ||
                  tenantName.includes(q) ||
                  tenantPhone.includes(q) ||
                  agreementNo.includes(q) ||
                  roomNum.includes(q);

                const matchesRoom = historyRoomFilter === 'All' || String(b.roomId?._id || b.roomId) === historyRoomFilter;
                const matchesStatus = historyStatusFilter === 'All' || b.status === historyStatusFilter;

                let matchesDate = true;
                if (historyStartDate) {
                  matchesDate = matchesDate && new Date(b.checkOut) >= new Date(historyStartDate);
                }
                if (historyEndDate) {
                  matchesDate = matchesDate && new Date(b.checkIn) <= new Date(historyEndDate);
                }

                return matchesSearch && matchesRoom && matchesStatus && matchesDate;
              });

              return (
                <div className="space-y-5">
                  {/* Filter Toolbar */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-[2rem] shadow-xs border p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search Tenant, Phone, Agreement #..."
                          value={historySearch}
                          onChange={e => setHistorySearch(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-10 pr-3.5 py-2.5 rounded-xl font-bold text-slate-900 dark:text-white outline-none"
                        />
                      </div>

                      {/* Room Filter */}
                      <div>
                        <select
                          value={historyRoomFilter}
                          onChange={e => setHistoryRoomFilter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-slate-800 dark:text-slate-200 outline-none"
                        >
                          <option value="All">All Rooms</option>
                          {rooms.map(rm => (
                            <option key={rm._id} value={rm._id}>
                              Room {rm.roomNumber} ({rm.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div>
                        <select
                          value={historyStatusFilter}
                          onChange={e => setHistoryStatusFilter(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl font-bold text-slate-800 dark:text-slate-200 outline-none"
                        >
                          <option value="All">All Booking Statuses</option>
                          <option value="active">Active Stay</option>
                          <option value="completed">Completed / Checked Out</option>
                          <option value="cancelled">Cancelled / Evicted</option>
                        </select>
                      </div>

                      {/* Date Range Inputs */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={historyStartDate}
                          onChange={e => setHistoryStartDate(e.target.value)}
                          className="w-1/2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-2.5 rounded-xl font-bold text-slate-800 dark:text-slate-200 text-[11px] outline-none"
                          title="Filter From Date"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="date"
                          value={historyEndDate}
                          onChange={e => setHistoryEndDate(e.target.value)}
                          className="w-1/2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-2.5 rounded-xl font-bold text-slate-800 dark:text-slate-200 text-[11px] outline-none"
                          title="Filter To Date"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-bold">
                        Matching Records: <strong className="text-indigo-600">{filteredBookings.length}</strong> of {bookings.length}
                      </span>
                      {(historySearch || historyRoomFilter !== 'All' || historyStatusFilter !== 'All' || historyStartDate || historyEndDate) && (
                        <button
                          type="button"
                          onClick={() => {
                            setHistorySearch('');
                            setHistoryRoomFilter('All');
                            setHistoryStatusFilter('All');
                            setHistoryStartDate('');
                            setHistoryEndDate('');
                          }}
                          className="text-xs text-rose-600 hover:underline font-bold"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Booking Records Grid */}
                  <div className="grid gap-4">
                    {filteredBookings.map(b => {
                      const isCompleted = b.status === 'completed';
                      const isActive = b.status === 'active';
                      const reqDeposit = b.securityDeposit || b.roomId?.securityDeposit || 0;
                      const adjustments = (b.depositAdjustments || []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
                      const availDeposit = Math.max(0, reqDeposit - adjustments);

                      return (
                        <div
                          key={b._id}
                          className={`p-4 sm:p-6 border rounded-2xl sm:rounded-[2rem] bg-white dark:bg-slate-900 transition-all shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 ${
                            b.status === 'cancelled' ? 'opacity-60 grayscale bg-slate-50 dark:bg-slate-800' : ''
                          }`}
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h4 className="font-black text-slate-900 dark:text-white text-lg">
                                {b.userId?.name || 'Resident'}
                              </h4>
                              <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                isCompleted ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                'bg-slate-200 text-slate-700'
                              }`}>
                                {isCompleted ? 'CHECKED OUT' : b.status}
                              </span>
                              {b.agreementNumber && (
                                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 dark:bg-slate-800 border border-indigo-100 px-2.5 py-0.5 rounded-lg font-bold">
                                  #{b.agreementNumber}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-semibold">
                              <span>Room {b.roomId?.roomNumber || 'N/A'} ({b.roomId?.type || 'Standard'})</span>
                              <span>•</span>
                              <span>Phone: {b.userId?.phone || b.userId?.phoneNumber || 'N/A'}</span>
                              <span>•</span>
                              <span>Stay: <strong className="text-slate-800 dark:text-slate-200">{new Date(b.checkIn).toLocaleDateString()}</strong> to <strong className="text-slate-800 dark:text-slate-200">{new Date(b.checkOut).toLocaleDateString()}</strong></span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-bold text-slate-700 dark:text-slate-300">
                                Monthly Rent: ₹{(b.totalAmount || b.roomId?.price || 0).toLocaleString()}
                              </span>
                              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg font-bold">
                                Deposit: ₹{reqDeposit.toLocaleString()} (Avail: ₹{availDeposit.toLocaleString()})
                              </span>
                              {adjustments > 0 && (
                                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-bold">
                                  Deposit Used for Rent: ₹{adjustments.toLocaleString()}
                                </span>
                              )}
                            </div>

                            {/* Checkout notes display */}
                            {b.actualCheckOut && (
                              <div className="p-3 bg-blue-50/60 dark:bg-slate-800 rounded-xl border border-blue-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                                <p className="font-bold text-blue-900 dark:text-blue-300">
                                  Checked Out on {new Date(b.actualCheckOut).toLocaleDateString()} {b.checkedOutBy ? `• Admin: ${b.checkedOutBy}` : ''}
                                </p>
                                {b.checkoutNotes && (
                                  <p className="text-slate-600 dark:text-slate-400 mt-0.5 italic">"{b.checkoutNotes}"</p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action Toolbar */}
                          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
                            <button
                              type="button"
                              onClick={() => setSettlementModalData({ booking: b, initialTab: 'PAY', initialTarget: 'ALL' })}
                              className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px] touch-manipulation"
                              title="View Financial Breakdown, Payments & Refunds"
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>Payments</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setViewAckBookingId(b._id)}
                              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl text-xs font-black transition active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px] touch-manipulation"
                              title="Official Tenancy Agreement & PDF"
                            >
                              <FileText className="w-4 h-4 text-indigo-500" />
                              <span>Agreement</span>
                            </button>

                            {isActive && (
                              <button
                                type="button"
                                onClick={() => handleOpenCheckout(b)}
                                className="col-span-2 sm:col-span-1 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/20 transition active:scale-95 flex items-center justify-center gap-1.5 min-h-[40px] touch-manipulation"
                                title="Check Out & Finalize Settlement"
                              >
                                <LogIn className="w-4 h-4 rotate-180" />
                                <span>Check-Out</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEditBooking(b)}
                              className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition shadow-xs min-h-[40px] flex items-center justify-center touch-manipulation"
                              title="Edit Booking Stay Dates & Rent"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {isActive && (
                              <button
                                type="button"
                                onClick={() => cancelBooking(b._id)}
                                className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition shadow-xs min-h-[40px] flex items-center justify-center touch-manipulation"
                                title="Cancel Booking / Evict"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {filteredBookings.length === 0 && (
                      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-12 text-center text-slate-400 border border-dashed">
                        <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p className="font-bold text-sm">No booking records match the selected filters.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
         </div>
      )}

      {/* REGISTRY TAB */}
      {activeTab === 'registry' && (
         <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border p-8 animate-in fade-in transition-all">
            <h2 className="text-xl font-bold mb-8 flex items-center"><Users className="w-6 h-6 mr-2 text-indigo-500"/> Advanced Tenant CRM</h2>
            <div className="grid md:grid-cols-2 gap-6">
               {clients.map(c => (
                  <div key={c._id} className={`p-4 sm:p-6 border rounded-[1.5rem] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${c.status === 'inactive' ? 'bg-rose-50 border-rose-100 opacity-60' : 'bg-slate-50 dark:bg-slate-800 opacity-90 hover:bg-white/90 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:shadow-xl hover:scale-[1.02]'}`}>
                      <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border ${c.status === 'inactive' ? 'bg-white dark:bg-slate-900 text-rose-600 border-rose-200' : 'bg-white dark:bg-slate-900 text-indigo-600 border-indigo-100'}`}>{c.name.charAt(0)}</div>
                          <div>
                              <p className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                                {c.name}
                                {c.status === 'inactive' && <ShieldAlert className="w-4 h-4 text-rose-500" />}
                              </p>
                              <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest break-all">{c.email}</p>
                              <p className="text-[10px] font-bold text-indigo-500">{c.phone || c.phoneNumber || 'Contact Not Verified'}</p>
                          </div>
                      </div>
                      <button onClick={() => { setEditClient(c); setClientForm({ name: c.name, phone: c.phone || '', password: '', status: c.status || 'active' }); }} className="p-3 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 shadow-sm border transition-all self-end sm:self-auto">
                          <Edit3 className="w-5 h-5"/>
                      </button>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* FINANCE TAB */}
      {activeTab === 'finance' && (
         <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border p-8 animate-in fade-in transition-all">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                 <h2 className="text-xl font-bold flex items-center"><IndianRupee className="w-6 h-6 mr-2 text-indigo-500"/> Financial Settlement Matrix</h2>
                 <button onClick={() => setPaymentModal({ show: true, customerId: '', amount: '', notes: '' })} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">Inject Cash Settlement</button>
            </div>
            
            <div className="space-y-4">
                {payments.slice().reverse().map(p => (
                   <div key={p._id} className="border p-6 rounded-[1.5rem] flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-900 hover:border-emerald-200 transition-all shadow-sm">
                       <div>
                           <p className="font-black text-emerald-600 text-2xl font-poppins tracking-tighter">₹{p.amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic ml-2">Channel: {p.method}</span></p>
                           <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-widest italic flex items-center gap-3">
                                {new Date(p.createdAt).toLocaleDateString()}
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                {p.notes || "System-generated reference"}
                           </p>
                       </div>
                       <div className="flex gap-3 items-center mt-4 md:mt-0">
                           {p.receiptUrl && <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black bg-blue-50 text-blue-600 px-4 py-2 rounded-xl flex items-center tracking-widest uppercase shadow-sm border border-blue-100"><Link className="w-3 h-3 mr-1.5"/> Ledger PDF</a>}
                           {p.status === 'pending' ? (
                               <button onClick={() => handleVerifyPayment(p._id)} className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
                                   <Check className="w-4 h-4 mr-1.5"/> Authorize
                               </button>
                           ) : (
                               <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${p.status === 'verified' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>{p.status}</span>
                           )}
                       </div>
                   </div>
                ))}
            </div>
         </div>
      )}

      {/* MAINTENANCE TAB */}
      {activeTab === 'maintenance' && (
         <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border p-8 animate-in fade-in transition-all">
            <h2 className="text-xl font-bold mb-10 flex items-center"><AlertTriangle className="w-6 h-6 mr-2 text-indigo-500"/> Operational Tickets</h2>
            <div className="grid md:grid-cols-2 gap-6">
               {complaints.map(c => (
                  <div key={c._id} className={`p-4 sm:p-8 border rounded-[2.5rem] relative transition-all ${c.status==='resolved' ? 'border-indigo-100 bg-white dark:bg-slate-900 opacity-80' : 'border-amber-200 bg-amber-50 shadow-xl shadow-amber-500/5'}`}>
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h4 className="font-black text-slate-900 dark:text-white text-xl tracking-tight leading-none mb-1">{c.title}</h4>
                              <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">{c.userId?.name || "Purged Identity"}</p>
                          </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 font-medium italic leading-relaxed">"{c.description}"</p>
                      <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-6">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(c.createdAt).toLocaleDateString()}</p>
                          {c.status !== 'resolved' ? (
                              <button onClick={() => resolveComplaint(c._id)} className="bg-amber-500 text-white text-[10px] font-black px-6 py-2 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all uppercase tracking-widest">
                                  Mark Resolved
                              </button>
                          ) : <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-6 py-2 rounded-xl border border-emerald-100 shadow-sm uppercase tracking-widest flex items-center gap-2"><CheckCircle className="w-3 h-3"/> Task Closed</span>}
                      </div>
                  </div>
               ))}
               {complaints.length === 0 && <p className="text-slate-400 font-bold p-20 text-center border-4 border-dashed rounded-[3rem] col-span-2">No maintenance requests pending.</p> }
            </div>
         </div>
      )}

      {/* ALL MODALS */}
      {showLodgeEdit && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex flex-col justify-center items-center p-4">
             <form onSubmit={handleLodgeSubmit} className="bg-white dark:bg-slate-900 p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] w-full max-w-2xl relative shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                 <h3 className="text-3xl font-black mb-2 tracking-tight">Edit Building Profile</h3>
                 <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 italic">Update public registry details and core location coordinates.</p>
                 <button type="button" onClick={() => setShowLodgeEdit(false)} className="absolute top-10 right-10 text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm border border-slate-100 dark:border-slate-800"><X className="w-5 h-5"/></button>
                 
                 <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Building Name</label>
                         <input placeholder="Name" required className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold" value={lodgeForm.name} onChange={e => setLodgeForm({...lodgeForm, name: e.target.value})} />
                     </div>
                     <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Address</label>
                         <input placeholder="Full Address" required className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold" value={lodgeForm.address} onChange={e => setLodgeForm({...lodgeForm, address: e.target.value})} />
                     </div>
                     <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Latitude</label>
                         <input placeholder="Lat" type="number" step="any" required className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold" value={lodgeForm.lat} onChange={e => setLodgeForm({...lodgeForm, lat: e.target.value})} />
                     </div>
                     <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Longitude</label>
                         <input placeholder="Lng" type="number" step="any" required className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold" value={lodgeForm.lng} onChange={e => setLodgeForm({...lodgeForm, lng: e.target.value})} />
                     </div>
                     <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Google Maps Embed Link / URL</label>
                         <input placeholder="https://www.google.com/maps/embed?pb=..." className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold font-poppins text-indigo-600 placeholder-slate-300" value={lodgeForm.mapUrl || ''} onChange={e => setLodgeForm({...lodgeForm, mapUrl: e.target.value})} />
                     </div>
                     <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Public Description</label>
                         <textarea placeholder="Description" required rows="3" className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-medium" value={lodgeForm.description} onChange={e => setLodgeForm({...lodgeForm, description: e.target.value})} />
                     </div>
                     {selectedLodge && selectedLodge.images && selectedLodge.images.length > 0 && (
                          <div className="col-span-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-2 block">Current Lodge Photos (Hover & Click to Delete)</label>
                              <div className="flex flex-wrap gap-2">
                                  {selectedLodge.images.map((img, idx) => (
                                      <div key={idx} className="relative w-16 h-16 border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 group">
                                          <DriveImage src={typeof img === 'string' ? img : img.url} alt="Lodge asset" className="w-full h-full" />
                                          <button
                                              type="button"
                                              onClick={() => {
                                                  if (confirm('Delete this photo from building? (Takes effect after saving)')) {
                                                      setSelectedLodge({
                                                          ...selectedLodge,
                                                          images: selectedLodge.images.filter(i => (typeof i === 'string' ? i : i.url) !== (typeof img === 'string' ? img : img.url))
                                                      });
                                                  }
                                              }}
                                              className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] font-black uppercase tracking-widest"
                                          >
                                              Delete
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                      <div className="col-span-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Upload Lodge Photos (Multiple)</label>
                          <input type="file" multiple accept="image/*" className="w-full border-2 border-slate-100 dark:border-slate-800 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800" onChange={e => setLodgeForm({...lodgeForm, images: e.target.files})} />
                          <p className="text-xs text-slate-400 mt-2 font-medium italic ml-2">These will be appended to any existing photos.</p>
                      </div>
                     <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Connect Drive Link(s) (Comma Separated)</label>
                         <input placeholder="https://drive.google.com/..." className="w-full border-2 border-slate-100 dark:border-slate-800 p-4 rounded-2xl font-bold font-poppins text-indigo-600 placeholder-slate-300" value={lodgeForm.driveUrls || ''} onChange={e => setLodgeForm({...lodgeForm, driveUrls: e.target.value})} />
                     </div>
                 </div>
                 
                 <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[2.5rem] font-black shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all">Synchronize Building Matrix</button>
             </form>
          </div>
      )}

      {assignModal.show && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col justify-center items-center p-4">
             <form onSubmit={assignRoomManual} className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] w-full max-w-xl relative shadow-2xl animate-in zoom-in duration-300 max-h-[92vh] overflow-y-auto space-y-4">
                 <div>
                   <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                     Assign Room & Date Schedule
                   </span>
                   <h3 className="text-2xl font-black mt-2 text-slate-900 dark:text-white">
                     {assignModal.roomName || (assignModal.roomNumber ? `Room #${assignModal.roomNumber}` : 'Unit')} ({assignModal.roomType || 'Standard'})
                   </h3>
                   <p className="text-slate-500 text-xs mt-0.5">
                     Create a new confirmed booking with automatic overlap prevention.
                   </p>
                 </div>

                 <button 
                   type="button" 
                   onClick={() => setAssignModal(prev => ({ ...prev, show: false }))} 
                   className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl"
                 >
                   <X className="w-5 h-5" />
                 </button>

                 {/* Unavailable dates notice */}
                 {assignModal.loadingSchedule ? (
                   <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                     <RefreshCcw className="w-4 h-4 animate-spin" /> Loading room schedule...
                   </div>
                 ) : assignModal.unavailableIntervals?.length > 0 ? (
                   <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-2 text-xs">
                     <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                       <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                       Unavailable Booked Dates for {assignModal.roomName || `Room #${assignModal.roomNumber}`}:
                     </p>
                     <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                       {assignModal.unavailableIntervals.map((interval, i) => (
                         <div key={i} className="flex justify-between items-center text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-amber-100">
                           <span className="font-bold text-slate-800 dark:text-white">
                             {new Date(interval.checkIn).toLocaleDateString()} to {new Date(interval.checkOut).toLocaleDateString()}
                           </span>
                           <span className="text-slate-500 font-medium">({interval.tenantName || 'Resident'})</span>
                         </div>
                       ))}
                     </div>
                     <p className="text-[10px] text-amber-700 dark:text-amber-400">
                       Please choose dates that do not overlap with the intervals above.
                     </p>
                   </div>
                 ) : (
                   <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                     <span>This room has no upcoming active bookings. All dates are available!</span>
                   </div>
                 )}

                 {/* Form Fields */}
                 <div>
                   <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                     Select Tenant Identity *
                   </label>
                   <select 
                     required 
                     className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl font-bold text-slate-900 dark:text-white outline-none" 
                     value={assignModal.userId} 
                     onChange={e => setAssignModal({ ...assignModal, userId: e.target.value })}
                   >
                       <option value="" disabled>Search tenant directory...</option>
                       {clients.map(c => <option key={c._id} value={c._id}>{c.name} ({c.phone || c.email})</option>)}
                   </select>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                       Check-In Date *
                     </label>
                     <input
                       type="date"
                       required
                       value={assignModal.checkIn}
                       onChange={e => setAssignModal({ ...assignModal, checkIn: e.target.value })}
                       className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs text-slate-900 dark:text-white outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                       Check-Out Date *
                     </label>
                     <input
                       type="date"
                       required
                       value={assignModal.checkOut}
                       onChange={e => setAssignModal({ ...assignModal, checkOut: e.target.value })}
                       className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs text-slate-900 dark:text-white outline-none"
                     />
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                       Monthly Rent (₹)
                     </label>
                     <input
                       type="number"
                       placeholder="e.g. 5000"
                       value={assignModal.totalAmount}
                       onChange={e => setAssignModal({ ...assignModal, totalAmount: e.target.value })}
                       className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs text-slate-900 dark:text-white outline-none"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                       Security Deposit (₹)
                     </label>
                     <input
                       type="number"
                       placeholder="e.g. 10000"
                       value={assignModal.securityDeposit}
                       onChange={e => setAssignModal({ ...assignModal, securityDeposit: e.target.value })}
                       className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl font-bold text-xs text-slate-900 dark:text-white outline-none"
                     />
                   </div>
                 </div>

                 <div>
                   <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                     Administrator Notes (Optional)
                   </label>
                   <input
                     type="text"
                     placeholder="e.g. Assigned upon company trainee onboarding"
                     value={assignModal.adminNotes}
                     onChange={e => setAssignModal({ ...assignModal, adminNotes: e.target.value })}
                     className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                   />
                 </div>

                 <button 
                   type="submit" 
                   className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs shadow-xl shadow-indigo-600/30 active:scale-95 transition-all"
                 >
                   Confirm & Lock Room Booking
                 </button>
             </form>
          </div>
       )}

       {/* Edit Booking Parameters Modal */}
       {editBookingModal.show && (
         <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col justify-center items-center p-4">
            <form onSubmit={handleSaveEditBooking} className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] w-full max-w-xl relative shadow-2xl animate-in zoom-in duration-300 max-h-[92vh] overflow-y-auto space-y-4">
                <div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Edit Booking Stay Parameters
                  </span>
                  <h3 className="text-2xl font-black mt-2 text-slate-900 dark:text-white">
                    Agreement #{editBookingModal.booking?.agreementNumber || String(editBookingModal.booking?._id).slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Tenant: <strong>{editBookingModal.booking?.userId?.name || 'Resident'}</strong> • Room: {editBookingModal.booking?.roomId?.roomNumber}
                  </p>
                </div>

                <button 
                  type="button" 
                  onClick={() => setEditBookingModal(prev => ({ ...prev, show: false }))} 
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Overlap warnings for other stays in the room */}
                {editBookingModal.unavailableIntervals?.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1">
                    <p className="font-bold text-amber-900">Other Stays in this Room (Cannot Overlap):</p>
                    {editBookingModal.unavailableIntervals.map((inv, idx) => (
                      <p key={idx} className="text-[11px] text-amber-800">
                        • {new Date(inv.checkIn).toLocaleDateString()} to {new Date(inv.checkOut).toLocaleDateString()} ({inv.tenantName})
                      </p>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Check-In Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={editBookingModal.checkIn}
                      onChange={e => setEditBookingModal({ ...editBookingModal, checkIn: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border p-3 rounded-2xl font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Check-Out Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={editBookingModal.checkOut}
                      onChange={e => setEditBookingModal({ ...editBookingModal, checkOut: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border p-3 rounded-2xl font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Total / Monthly Rent (₹)
                    </label>
                    <input
                      type="number"
                      value={editBookingModal.totalAmount}
                      onChange={e => setEditBookingModal({ ...editBookingModal, totalAmount: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border p-3 rounded-2xl font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Security Deposit (₹)
                    </label>
                    <input
                      type="number"
                      value={editBookingModal.securityDeposit}
                      onChange={e => setEditBookingModal({ ...editBookingModal, securityDeposit: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border p-3 rounded-2xl font-bold text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Correction / Modification Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lease dates extended by 2 weeks upon mutual agreement"
                    value={editBookingModal.reason}
                    onChange={e => setEditBookingModal({ ...editBookingModal, reason: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border p-3 rounded-2xl text-xs font-semibold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">This reason is appended to agreement version history.</p>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 py-4 rounded-2xl font-black text-xs shadow-xl transition-all"
                >
                  Commit Booking Updates & Overlap Check
                </button>
            </form>
         </div>
       )}

       {/* Check-Out & Tenancy Closure Modal */}
       {checkoutModal.show && (
         <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex flex-col justify-center items-center p-4">
            <form onSubmit={handleConfirmCheckout} className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] w-full max-w-lg relative shadow-2xl animate-in zoom-in duration-300 max-h-[92vh] overflow-y-auto space-y-4">
                <div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Tenancy Check-Out & Clearance
                  </span>
                  <h3 className="text-2xl font-black mt-2 text-slate-900 dark:text-white">
                    Close Stay for {checkoutModal.booking?.userId?.name || 'Resident'}
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Room #{checkoutModal.booking?.roomId?.roomNumber} • Agreement #{checkoutModal.booking?.agreementNumber}
                  </p>
                </div>

                <button 
                  type="button" 
                  onClick={() => setCheckoutModal(prev => ({ ...prev, show: false }))} 
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scheduled Check-Out:</span>
                    <strong className="text-slate-800 dark:text-white">
                      {checkoutModal.booking?.checkOut ? new Date(checkoutModal.booking.checkOut).toLocaleDateString() : '-'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Security Deposit Held:</span>
                    <strong className="text-indigo-600">
                      ₹{(checkoutModal.booking?.securityDeposit || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Actual Check-Out Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={checkoutModal.actualCheckOut}
                    onChange={e => setCheckoutModal({ ...checkoutModal, actualCheckOut: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border p-3 rounded-2xl font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Checkout Notes & Inspection Report *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Keys handed over, meter reading recorded, room in clean condition"
                    value={checkoutModal.checkoutNotes}
                    onChange={e => setCheckoutModal({ ...checkoutModal, checkoutNotes: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border p-3 rounded-2xl text-xs font-medium"
                  />
                </div>

                {/* Refund Security Deposit Option */}
                <div className="p-4 bg-rose-50 dark:bg-slate-800 rounded-2xl border border-rose-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-rose-950 dark:text-white">Disburse Security Deposit Refund</p>
                      <p className="text-[10px] text-slate-500">Record refund transaction directly upon checkout clearance</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={checkoutModal.issueRefund}
                      onChange={e => setCheckoutModal({ ...checkoutModal, issueRefund: e.target.checked })}
                      className="w-4 h-4 text-rose-600 rounded"
                    />
                  </div>

                  {checkoutModal.issueRefund && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-100 dark:border-slate-700 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Refund Amount (₹)</label>
                        <input
                          type="number"
                          value={checkoutModal.refundAmount}
                          onChange={e => setCheckoutModal({ ...checkoutModal, refundAmount: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border p-2 rounded-xl font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Payment Method</label>
                        <select
                          value={checkoutModal.refundMethod}
                          onChange={e => setCheckoutModal({ ...checkoutModal, refundMethod: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border p-2 rounded-xl font-bold"
                        >
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cash">Cash Handover</option>
                          <option value="UPI">UPI</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={checkoutModal.submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-xs shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {checkoutModal.submitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Confirm Check-Out & Mark Booking Completed</span>
                </button>
            </form>
         </div>
       )}
       
       {editClient && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex flex-col justify-center items-center p-4">
             <form onSubmit={handleClientEdit} className="bg-white dark:bg-slate-900 p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] w-full max-w-lg relative shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                 <div className="text-center mb-10">
                     <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-2xl shadow-indigo-600/30">{clientForm.name.charAt(0)}</div>
                     <h3 className="text-3xl font-black tracking-tight mb-2">Refine Identity</h3>
                     <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest italic">Manual System Override: CRM Profile</p>
                 </div>
                 
                 <button type="button" onClick={() => setEditClient(null)} className="absolute top-10 right-10 text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm border border-slate-100 dark:border-slate-800"><X className="w-5 h-5"/></button>
                 
                 <div className="space-y-4 mb-10">
                    <input placeholder="Full Name" required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} />
                    <input placeholder="Phone Signal Address" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} />
                    <input placeholder="Reset Passcode (Leave blank to preserve)" type="password" className="w-full bg-rose-50 border-2 border-rose-100 p-5 rounded-2xl font-black text-rose-900 placeholder-rose-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all" value={clientForm.password} onChange={e => setClientForm({...clientForm, password: e.target.value})} />
                    
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex-grow">Identity Status</p>
                        <select className="bg-white dark:bg-slate-900 border p-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-indigo-600" value={clientForm.status} onChange={e => setClientForm({...clientForm, status: e.target.value})}>
                            <option value="active">Active/Authorized</option>
                            <option value="inactive">Restricted/Blocked</option>
                        </select>
                    </div>
                 </div>
                 
                 <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-sm shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all">Synchronize CRM Database</button>
             </form>
          </div>
      )}

      {paymentModal.show && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex flex-col justify-center items-center p-4">
             <form onSubmit={submitManualPayment} className="bg-white dark:bg-slate-900 p-5 sm:p-10 rounded-[2rem] sm:rounded-[3rem] w-full max-w-lg relative shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                 <h3 className="text-3xl font-black mb-2 tracking-tight">Manual Ledger Entry</h3>
                 <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 italic">Strict audit logging enabled for direct cash settlements.</p>
                 <button type="button" onClick={() => setPaymentModal({show:false, customerId: '', amount: '', notes: ''})} className="absolute top-10 right-10 text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm border border-slate-100 dark:border-slate-800"><X className="w-5 h-5"/></button>
                 
                 <div className="space-y-4 mb-10">
                    <select required className="w-full border-2 border-slate-100 dark:border-slate-800 p-5 rounded-2xl appearance-none font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 focus:border-emerald-500 transition-all outline-none" value={paymentModal.customerId} onChange={e => setPaymentModal({...paymentModal, customerId: e.target.value})}>
                        <option value="" disabled>Select Tenant for Credit...</option>
                        {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <input placeholder="Settlement Amount (₹)" type="number" required className="w-full bg-emerald-50 border-2 border-emerald-100 p-6 rounded-2xl font-black text-emerald-700 text-3xl font-poppins text-center outline-none focus:ring-4 focus:ring-emerald-500/20" value={paymentModal.amount} onChange={e => setPaymentModal({...paymentModal, amount: e.target.value})} />
                    <textarea placeholder="Audit Trail Notes (e.g., Q1 Service Dues)..." required rows="3" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-emerald-500 transition-all" value={paymentModal.notes} onChange={e => setPaymentModal({...paymentModal, notes: e.target.value})} />
                 </div>
                 
                 <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-[2.5rem] font-black text-sm shadow-2xl shadow-emerald-600/30 active:scale-95 transition-all uppercase tracking-widest">Commit Verification</button>
             </form>
          </div>
      )}

      {activeGalleryRoom && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex flex-col justify-center items-center p-4">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] w-full max-w-4xl relative shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                  <h3 className="text-3xl font-black mb-2 tracking-tight uppercase">{activeGalleryRoom.type} Room Assets</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest italic mb-6">Viewing all linked photo & video assets</p>
                  <button type="button" onClick={() => setActiveGalleryRoom(null)} className="absolute top-10 right-10 text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm border border-slate-100 dark:border-slate-800"><X className="w-5 h-5"/></button>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto pr-2 flex-grow">
                      {/* Video Player Column */}
                      {activeGalleryRoom.videoUrl && (
                          <div className="lg:col-span-5 space-y-4">
                              <h4 className="font-black text-sm uppercase text-slate-400 tracking-wider">Video Tour</h4>
                              {renderVideoPlayer(activeGalleryRoom.videoUrl)}
                          </div>
                      )}
                      
                      {/* Photos Grid Column */}
                      <div className={`${activeGalleryRoom.videoUrl ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
                          <h4 className="font-black text-sm uppercase text-slate-400 tracking-wider">Photos</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {[...(activeGalleryRoom.interiorPhotos || []), ...(activeGalleryRoom.exteriorPhotos || [])].map((img, idx) => (
                                  <div key={idx} className="relative aspect-square border rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 group">
                                      <DriveImage src={img.url} alt="Gallery asset" className="w-full h-full" />
                                      <button 
                                          onClick={async () => {
                                              if (confirm('Delete this photo?')) {
                                                  try {
                                                      await api.delete(`/rooms/${activeGalleryRoom._id}/photo`, { data: { photoUrl: img.url } });
                                                      alert('Photo deleted');
                                                      const updatedRooms = await api.get(`/rooms/lodge/${selectedLodge._id}`);
                                                      setRooms(updatedRooms.data);
                                                      const updatedRoom = updatedRooms.data.find(rm => rm._id === activeGalleryRoom._id);
                                                      if (updatedRoom) {
                                                          setActiveGalleryRoom(updatedRoom);
                                                      } else {
                                                          setActiveGalleryRoom(null);
                                                      }
                                                  } catch (e) {
                                                      alert('Failed to delete photo');
                                                  }
                                              }
                                          }}
                                          className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-black uppercase tracking-widest"
                                      >
                                          Delete
                                      </button>
                                  </div>
                              ))}
                              {[...(activeGalleryRoom.interiorPhotos || []), ...(activeGalleryRoom.exteriorPhotos || [])].length === 0 && (
                                  <p className="text-slate-400 text-xs font-bold col-span-full py-10 text-center uppercase tracking-widest italic">No photos uploaded for this room.</p>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

        {activeTab === 'billing' && (
          <div className="animate-in fade-in duration-300 bg-white dark:bg-slate-900 rounded-[2rem] p-8 border">
              <LodgeBillingManager />
          </div>
      )}

      {/* Security Deposit & Settlement Hub Modal */}
      {settlementModalData && (
        <LodgeTenantPaymentModal
          isOpen={Boolean(settlementModalData)}
          onClose={() => setSettlementModalData(null)}
          booking={settlementModalData.booking}
          isAdmin={true}
          initialTab={settlementModalData.initialTab || 'MANAGE_DEPOSIT'}
          initialTarget={settlementModalData.initialTarget || 'ALL'}
          onSuccess={() => {
            fetchBaseLodge();
          }}
        />
      )}

      {/* Official Residency Acknowledgement & PDF Viewer Modal */}
      {viewAckBookingId && (
        <ResidencyAcknowledgementModal
          bookingId={viewAckBookingId}
          onClose={() => setViewAckBookingId(null)}
        />
      )}

      {/* Selected Room Detail & Complete Tenancy History Modal */}
      {selectedRoomDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overscroll-contain">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl w-full max-w-2xl relative shadow-2xl animate-in zoom-in duration-300 max-h-[94dvh] sm:max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Room Profile & History
                </span>
                <h3 className="text-2xl font-black mt-2 text-slate-900 dark:text-white">
                  {selectedRoomDetail.displayName || `Room #${selectedRoomDetail.roomNumber}`} ({selectedRoomDetail.type})
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedRoomDetail.building} • {selectedRoomDetail.floor} • Rate: ₹{selectedRoomDetail.price.toLocaleString()} / {selectedRoomDetail.rentCycle || 'month'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Room Tenancy Bookings Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                All Bookings & Residents for {selectedRoomDetail.displayName || `Room #${selectedRoomDetail.roomNumber}`} ({selectedRoomDetail.roomBookings?.length || 0})
              </h4>

              {selectedRoomDetail.roomBookings?.length > 0 ? (
                <div className="space-y-2">
                  {selectedRoomDetail.roomBookings.map(b => (
                    <div key={b._id} className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 dark:text-white">{b.userId?.name || 'Resident'}</strong>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                            {b.status === 'completed' ? 'CHECKED OUT' : b.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Stay: {new Date(b.checkIn).toLocaleDateString()} to {new Date(b.checkOut).toLocaleDateString()}
                          {b.actualCheckOut && ` • Left: ${new Date(b.actualCheckOut).toLocaleDateString()}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomDetail(null);
                            setSettlementModalData({ booking: b, initialTab: 'PAY', initialTarget: 'ALL' });
                          }}
                          className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black"
                        >
                          Payments
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRoomDetail(null);
                            setViewAckBookingId(b._id);
                          }}
                          className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-[10px] font-black"
                        >
                          Agreement
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No bookings recorded for this room yet.</p>
              )}
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const rm = selectedRoomDetail;
                  setSelectedRoomDetail(null);
                  handleOpenAssignModal(rm);
                }}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" /> Book This Room
              </button>
            </div>
          </div>
        </div>
      )}</div>
  );
}

const renderVideoPlayer = (url) => {
    if (!url) return null;
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            videoId = match[2];
        }
        if (videoId) {
            return (
                <iframe 
                    className="w-full aspect-video rounded-2xl border shadow-sm"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                ></iframe>
            );
        }
    }
    
    // Google Drive
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let fileId = '';
        const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            fileId = fileIdMatch[1];
        } else {
            const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (idParamMatch && idParamMatch[1]) {
                fileId = idParamMatch[1];
            }
        }
        if (fileId) {
            return (
                <iframe 
                    className="w-full aspect-video rounded-2xl border shadow-sm"
                    src={`https://drive.google.com/file/d/${fileId}/preview`}
                    title="Google Drive video player"
                    frameBorder="0"
                    allow="autoplay"
                    allowFullScreen
                ></iframe>
            );
        }
    }

    // Default HTML5 video player
    return (
        <video 
            src={url} 
            controls 
            className="w-full rounded-2xl border shadow-sm animate-in fade-in"
        />
    );
};



