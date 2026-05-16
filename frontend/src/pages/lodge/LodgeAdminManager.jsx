import React, { useState, useEffect } from 'react';
import { 
    Building2, Plus, DoorOpen, List, Trash2, Edit3, UserPlus, 
    Calendar, IndianRupee, AlertTriangle, Users, CheckCircle, 
    Settings, LogOut, Clock, Link, Check, X, Building, BarChart3, Star, ShieldAlert
} from 'lucide-react';
import api from '../../services/api';

export default function LodgeAdminManager() {
  const [selectedLodge, setSelectedLodge] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Core Data
  const [rooms, setRooms] = useState([]);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ totalBookings: 0, totalRevenue: 0, totalUsers: 0, occupancyRate: 0, activeBookings: 0 });

  // Forms & Modals
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({ type: 'Standard', price: '', rentCycle: 'monthly', maxGuests: '', description: '', interiorFiles: [], exteriorFiles: [] });

  const [showLodgeEdit, setShowLodgeEdit] = useState(false);
  const [lodgeForm, setLodgeForm] = useState({ name: '', description: '', address: '', lat: '', lng: '', images: [] });

  // Edit Room
  const [editingRoom, setEditingRoom] = useState(null);

  // Edit Client / Reset Password
  const [editClient, setEditClient] = useState(null);
  const [clientForm, setClientForm] = useState({ id: '', name: '', phone: '', email: '', password: '', status: 'active' });

  // Assign Room
  const [assignModal, setAssignModal] = useState({ show: false, roomId: null, userId: '' });

  // Add Payment
  const [paymentModal, setPaymentModal] = useState({ show: false, customerId: '', amount: '', notes: '' });

  useEffect(() => {
    fetchBaseLodge();
  }, []);

  useEffect(() => {
    if(!selectedLodge) return;
    if(activeTab === 'dashboard') fetchStats();
    if(activeTab === 'rooms') fetchRooms(selectedLodge._id);
    if(activeTab === 'registry') fetchClients();
    if(activeTab === 'finance') fetchPayments();
    if(activeTab === 'maintenance') fetchComplaints();
    if(activeTab === 'occupancy') fetchBookings();
    if(activeTab === 'reviews') fetchReviews();
  }, [activeTab, selectedLodge]);

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
         setSelectedLodge(lodgeList[0]);
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
    setRooms(res.data);
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
  const fetchReviews = async () => {
      try {
          const res = await api.get('/lodge-extras/reviews');
          setReviews(res.data);
      } catch (e) { console.error(e); }
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
      formData.append('price', roomForm.price);
      formData.append('rentCycle', roomForm.rentCycle);
      formData.append('maxGuests', roomForm.maxGuests);
      formData.append('description', roomForm.description);
      formData.append('lodgeId', selectedLodge._id);
      
      Array.from(roomForm.interiorFiles || []).forEach(f => formData.append('interiorPhotos', f));
      Array.from(roomForm.exteriorFiles || []).forEach(f => formData.append('exteriorPhotos', f));

      if(editingRoom) {
          await api.put(`/rooms/${editingRoom._id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      } else {
          await api.post('/rooms', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      }
      setShowRoomForm(false); 
      setEditingRoom(null);
      setRoomForm({ type: 'Standard', price: '', rentCycle: 'monthly', maxGuests: '', description: '', interiorFiles: [], exteriorFiles: [] });
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
          formData.append('location', JSON.stringify({ address: lodgeForm.address, lat: lodgeForm.lat, lng: lodgeForm.lng }));
          Array.from(lodgeForm.images || []).forEach(f => formData.append('newImages', f));
          
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

  const assignRoomManual = async (e) => {
      e.preventDefault();
      try {
          const checkIn = new Date();
          const checkOut = new Date();
          checkOut.setFullYear(checkOut.getFullYear() + 1);

          await api.post('/bookings/admin-assign', {
              lodgeId: selectedLodge._id,
              roomId: assignModal.roomId,
              userId: assignModal.userId,
              checkIn, checkOut,
              totalAmount: 0 
          });
          alert("Room Assigned! Locked online booking for 1 year.");
          setAssignModal({ show:false, roomId: null, userId: '' });
      } catch(e) { alert("Error assigning"); }
  };

  // OCCUPANCY LOGIC
  const cancelBooking = async (id) => {
      if(confirm('Evict tenant and cancel booking? This frees the room immediately.')) {
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
          alert('Krisha Buildings: Tenant Profile Updated.');
          setEditClient(null); fetchClients();
      } catch(e) { alert("Krisha Buildings: Update Synchronization Failed"); }
  };

  const deleteReview = async (id) => {
      if(confirm('Delete this review permanently?')) {
          await api.delete(`/lodge-extras/reviews/${id}`);
          fetchReviews();
      }
  }

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
      { id: 'reviews', icon: Star, label: 'Reviews' },
      { id: 'maintenance', icon: AlertTriangle, label: 'Maintenance' }
  ];

  if(!selectedLodge) return (
      <div className="p-20 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Synchronizing Building Matrix...</p>
      </div>
  );

  if (selectedLodge._id === 'error_state') {
      return (
          <div className="p-20 text-center flex flex-col items-center justify-center animate-in fade-in duration-500">
              <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 border-2 border-rose-100 shadow-xl shadow-rose-500/5">
                  <ShieldAlert className="w-12 h-12" />
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Building System Offline</h2>
              <p className="text-slate-500 mb-10 max-w-lg font-medium leading-relaxed">
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
                      className="bg-white border-2 border-slate-200 text-slate-600 px-10 py-5 rounded-3xl font-black shadow-sm active:scale-95 transition-all text-sm uppercase tracking-widest hover:bg-slate-50"
                  >
                      Force Initialize DB
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8 flex justify-between items-center">
         <div className="flex items-center gap-4">
             <h1 className="text-3xl font-bold flex items-center text-gray-800 tracking-tight">
                 <Building2 className="w-8 h-8 mr-3 text-indigo-600"/> 
                 {selectedLodge.name} Command
             </h1>
             <button onClick={() => {
                 setLodgeForm({
                     name: selectedLodge.name || '',
                     description: selectedLodge.description || '',
                     address: selectedLodge.location?.address || '',
                     lat: selectedLodge.location?.lat || '',
                     lng: selectedLodge.location?.lng || '',
                     images: []
                 });
                 setShowLodgeEdit(true);
             }} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors" title="Edit Building Profile">
                 <Edit3 className="w-5 h-5"/>
             </button>
         </div>
         <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-4 py-2 rounded-xl">System Status: Optimal</div>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-8 border-b border-gray-200 pb-2 custom-scrollbar">
         {TABS.map(tab => (
             <button 
                 key={tab.id} onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
                     activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white text-gray-500 hover:bg-gray-100'
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
                  <div className="bg-white p-8 rounded-[2rem] border shadow-sm group hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6"><IndianRupee className="w-6 h-6"/></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Lifetime Revenue</p>
                      <h4 className="text-3xl font-black text-slate-900 font-poppins">₹{stats.totalRevenue.toLocaleString()}</h4>
                      <p className="text-[10px] text-emerald-500 font-bold mt-2 flex items-center underline decoration-emerald-200">Verified Settlements Only</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border shadow-sm group hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6"><CheckCircle className="w-6 h-6"/></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Bookings</p>
                      <h4 className="text-3xl font-black text-slate-900 font-poppins">{stats.totalBookings}</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-2 italic">Historical Aggregate</p>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border shadow-sm group hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6"><Building className="w-6 h-6"/></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Occupancy Rate</p>
                      <h4 className="text-3xl font-black text-slate-900 font-poppins">{stats.occupancyRate}%</h4>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden"><div className="bg-amber-500 h-full" style={{width: `${stats.occupancyRate}%`}}></div></div>
                  </div>
                  <div className="bg-white p-8 rounded-[2rem] border shadow-sm group hover:shadow-xl transition-all">
                      <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6"><Users className="w-6 h-6"/></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Registered Clients</p>
                      <h4 className="text-3xl font-black text-slate-900 font-poppins">{stats.totalUsers}</h4>
                      <p className="text-[10px] text-indigo-500 font-bold mt-2">Active CRM Profiles</p>
                  </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border p-10 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50 rounded-full blur-3xl -mr-40 -mt-40 opacity-50"></div>
                  <div className="relative z-10">
                      <h3 className="text-2xl font-black text-slate-900 mb-2">Krishna Building Status</h3>
                      <p className="text-slate-500 mb-8 font-medium">Core telemetry for active operations.</p>
                      <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="flex items-start gap-6">
                              <div className="bg-white p-4 rounded-2xl shadow-sm border"><Clock className="w-8 h-8 text-indigo-600"/></div>
                              <div>
                                  <p className="font-black text-slate-900 text-lg">{stats.activeBookings} Live Residencies</p>
                                  <p className="text-sm text-slate-500 font-medium">Tenants currently occupying units in the building.</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-6">
                              <div className="bg-white p-4 rounded-2xl shadow-sm border"><Settings className="w-8 h-8 text-amber-600"/></div>
                              <div>
                                  <p className="font-black text-slate-900 text-lg">System Integrity 100%</p>
                                  <p className="text-sm text-slate-500 font-medium">Auto-sync with Cloud Registry and Payment Gateway.</p>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ROOMS TAB */}
      {activeTab === 'rooms' && (
         <div className="bg-white rounded-[2rem] shadow-sm border p-8 animate-in fade-in transition-all">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold flex items-center"><DoorOpen className="w-6 h-6 mr-2 text-indigo-500"/> Managing Rooms</h2>
                <button onClick={() => { setEditingRoom(null); setRoomForm({ type: 'Standard', price: '', rentCycle: 'monthly', maxGuests: '', description: '', interiorFiles: [], exteriorFiles: [] }); setShowRoomForm(!showRoomForm); }} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 hover:scale-105 transition-transform flex items-center">
                    <Plus className="w-4 h-4 mr-2"/> Add New Unit
                </button>
             </div>

             {showRoomForm && (
                 <form onSubmit={handleRoomSubmit} className="bg-slate-50 p-6 rounded-3xl border mb-10 grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
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
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Interior Photos (Multiple)</label>
                        <input type="file" multiple accept="image/*" className="w-full border p-2 rounded-xl bg-white" onChange={e => setRoomForm({...roomForm, interiorFiles: e.target.files})} />
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 mb-1 block">Exterior Photos (Multiple)</label>
                        <input type="file" multiple accept="image/*" className="w-full border p-2 rounded-xl bg-white" onChange={e => setRoomForm({...roomForm, exteriorFiles: e.target.files})} />
                    </div>
                    <button type="submit" className="bg-indigo-600 text-white p-4 rounded-2xl col-span-2 lg:col-span-4 font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                        {editingRoom ? 'Commit Changes' : 'Publish Unit Live'}
                    </button>
                 </form>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {rooms.map(r => (
                    <div key={r._id} className="p-6 border rounded-[1.5rem] bg-white hover:border-indigo-200 transition-all shadow-sm flex flex-col md:flex-row justify-between items-center group relative overflow-hidden">
                       <div className="relative z-10 w-full">
                          <h4 className="font-black text-slate-900 text-xl tracking-tight uppercase">{r.type} <span className="text-[10px] text-slate-400 border border-slate-200 px-3 py-1 rounded-full font-bold ml-3 bg-slate-50 uppercase tracking-widest">Cap: {r.maxGuests}</span></h4>
                          <p className="text-sm text-slate-500 mt-2 line-clamp-1 font-medium">{r.description}</p>
                          <div className="mt-6 flex items-center gap-4">
                             <p className="font-black text-indigo-600 text-2xl font-poppins tracking-tighter">₹{r.price.toLocaleString()}<span className="text-xs text-slate-400 font-bold uppercase ml-1 tracking-widest">/ {r.rentCycle}</span></p>
                             <div className="h-4 w-[1px] bg-slate-200 mx-2"></div>
                             <div className="flex gap-2">
                                <button onClick={() => setAssignModal({ show:true, roomId: r._id, userId: '' })} className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm" title="Manually Assign Tenant">
                                    <UserPlus className="w-5 h-5"/>
                                </button>
                                <button onClick={() => { setEditingRoom(r); setRoomForm({ type: r.type, price: r.price, rentCycle: r.rentCycle || 'monthly', maxGuests: r.maxGuests, description: r.description, interiorFiles: [], exteriorFiles: [] }); setShowRoomForm(true); }} className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-amber-50 hover:text-amber-600 transition-colors shadow-sm">
                                    <Edit3 className="w-5 h-5"/>
                                </button>
                                <button onClick={() => deleteRoom(r._id)} className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm">
                                    <Trash2 className="w-5 h-5"/>
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
                 ))}
             </div>
         </div>
      )}

      {/* REVIEWS TAB */}
      {activeTab === 'reviews' && (
          <div className="bg-white rounded-[2rem] shadow-sm border p-8 animate-in fade-in transition-all">
              <h2 className="text-xl font-bold mb-8 flex items-center"><Star className="w-6 h-6 mr-2 text-indigo-500"/> Managing Feedback</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.map(rev => (
                      <div key={rev._id} className="p-8 border rounded-[2rem] bg-indigo-50/20 relative group hover:border-indigo-200 transition-all">
                          <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-indigo-100">{rev.userId?.name?.charAt(0) || 'U'}</div>
                              <div>
                                  <p className="font-black text-slate-900">{rev.userId?.name}</p>
                                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">{new Date(rev.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div className="ml-auto flex gap-0.5">
                                  {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${rev.rating >= s ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}
                              </div>
                          </div>
                          <p className="text-slate-600 font-medium leading-relaxed italic text-sm">"{rev.comment}"</p>
                          <button onClick={() => deleteReview(rev._id)} className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-rose-500 hover:bg-rose-50 rounded-xl">
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  ))}
                  {reviews.length === 0 && <p className="text-slate-400 font-bold p-20 text-center border-4 border-dashed rounded-[3rem] col-span-2">No reviews cataloged yet.</p> }
              </div>
          </div>
      )}

      {/* OCCUPANCY TAB */}
      {activeTab === 'occupancy' && (
         <div className="bg-white rounded-[2rem] shadow-sm border p-8 animate-in fade-in transition-all">
            <h2 className="text-xl font-bold mb-8 flex items-center"><Calendar className="w-6 h-6 mr-2 text-indigo-500"/> Live Occupancy Directory</h2>
            <div className="grid gap-4">
               {bookings.map(b => (
                  <div key={b._id} className={`p-6 border rounded-[1.5rem] flex flex-col md:flex-row justify-between items-start md:items-center ${b.status === 'cancelled' ? 'bg-slate-50 border-slate-100 opacity-60 grayscale' : 'bg-white hover:border-indigo-200 transition-all shadow-sm'}`}>
                      <div className="mb-4 md:mb-0">
                          <p className="font-black text-slate-900 text-lg flex items-center gap-3">
                              {b.userId?.name || 'Purged User Record'}
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{b.status}</span>
                          </p>
                          <div className="flex flex-wrap gap-4 mt-2">
                             <p className="text-xs font-bold text-slate-400 flex items-center uppercase tracking-widest"><Building className="w-4 h-4 mr-1 text-indigo-400"/> {b.roomId?.type || 'Suite'} Unit</p>
                             <div className="h-3 w-[1px] bg-slate-200"></div>
                             <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Rate: ₹{b.roomId?.price || 0} / {b.roomId?.rentCycle || 'monthly'}</p>
                          </div>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                           <button onClick={() => { setActiveTab('finance'); setPaymentModal({ show: true, customerId: b.userId?._id, amount: b.roomId?.price || '', notes: `Manual Rent Settlement: ${b.roomId?.type || 'Unit'}` }); }} className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg shadow-slate-900/10 active:scale-95 transition-all">Collect Rent</button>
                           {b.status === 'active' && (
                               <button onClick={() => cancelBooking(b._id)} className="flex-1 md:flex-none border border-rose-100 bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl text-xs font-black shadow-lg shadow-rose-500/5 hover:bg-rose-100 active:scale-95 transition-all">Evict Tenant</button>
                           )}
                      </div>
                      
                      {b.extensionRequest?.status === 'pending' && (
                          <div className="w-full mt-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col md:flex-row justify-between items-center animate-in zoom-in duration-300">
                              <div className="mb-4 md:mb-0">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center mb-1"><Clock className="w-3 h-3 mr-1"/> Extension Request Pending</p>
                                  <p className="font-bold text-slate-800 text-sm">Requested CheckOut: {new Date(b.extensionRequest.requestedCheckOut).toLocaleDateString()}</p>
                                  <p className="text-xs font-bold text-indigo-600 font-poppins">Additional Bill: ₹{b.extensionRequest.additionalAmount.toLocaleString()}</p>
                              </div>
                              <div className="flex gap-2 w-full md:w-auto">
                                  <button onClick={() => approveExtension(b._id)} className="flex-1 md:flex-none bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all">Approve</button>
                                  <button onClick={() => rejectExtension(b._id)} className="flex-1 md:flex-none bg-white text-rose-600 border border-rose-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-rose-50 transition-all">Reject</button>
                              </div>
                          </div>
                      )}
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* REGISTRY TAB */}
      {activeTab === 'registry' && (
         <div className="bg-white rounded-[2rem] shadow-sm border p-8 animate-in fade-in transition-all">
            <h2 className="text-xl font-bold mb-8 flex items-center"><Users className="w-6 h-6 mr-2 text-indigo-500"/> Advanced Tenant CRM</h2>
            <div className="grid md:grid-cols-2 gap-6">
               {clients.map(c => (
                  <div key={c._id} className={`p-6 border rounded-[1.5rem] flex justify-between items-center transition-all ${c.status === 'inactive' ? 'bg-rose-50 border-rose-100 opacity-60' : 'bg-slate-50 opacity-90 hover:bg-white hover:shadow-xl hover:scale-[1.02]'}`}>
                      <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border ${c.status === 'inactive' ? 'bg-white text-rose-600 border-rose-200' : 'bg-white text-indigo-600 border-indigo-100'}`}>{c.name?.charAt(0) || 'U'}</div>
                          <div>
                              <p className="font-black text-slate-900 flex items-center gap-2">
                                {c.name}
                                {c.status === 'inactive' && <ShieldAlert className="w-4 h-4 text-rose-500" />}
                              </p>
                              <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest">{c.email}</p>
                              <p className="text-[10px] font-bold text-indigo-500">{c.phone || c.phoneNumber || 'Contact Not Verified'}</p>
                          </div>
                      </div>
                      <button onClick={() => { 
                              setEditClient(true); 
                              setClientForm({ id: c._id, name: c.name, phone: c.phone || c.phoneNumber || '', email: c.email || '', status: c.status || 'active', password: '' }); 
                          }} className="p-3 bg-white text-slate-600 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 shadow-sm border transition-all">
                          <Edit3 className="w-5 h-5"/>
                      </button>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* FINANCE TAB */}
      {activeTab === 'finance' && (
         <div className="bg-white rounded-[2rem] shadow-sm border p-8 animate-in fade-in transition-all">
            <div className="flex justify-between items-center mb-10">
                 <h2 className="text-xl font-bold flex items-center"><IndianRupee className="w-6 h-6 mr-2 text-indigo-500"/> Financial Settlement Matrix</h2>
                 <button onClick={() => setPaymentModal({ show: true, customerId: '', amount: '', notes: '' })} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">Inject Cash Settlement</button>
            </div>
            
            <div className="space-y-4">
                {payments.slice().reverse().map(p => (
                   <div key={p._id} className="border p-6 rounded-[1.5rem] flex flex-col md:flex-row justify-between items-start md:items-center bg-white hover:border-emerald-200 transition-all shadow-sm">
                       <div>
                           <p className="font-black text-emerald-600 text-2xl font-poppins tracking-tighter">₹{p.amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic ml-2">Channel: {p.method}</span></p>
                           <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest italic flex items-center gap-3">
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
         <div className="bg-white rounded-[2rem] shadow-sm border p-8 animate-in fade-in transition-all">
            <h2 className="text-xl font-bold mb-10 flex items-center"><AlertTriangle className="w-6 h-6 mr-2 text-indigo-500"/> Operational Tickets</h2>
            <div className="grid md:grid-cols-2 gap-6">
               {complaints.map(c => (
                  <div key={c._id} className={`p-8 border rounded-[2.5rem] relative transition-all ${c.status==='resolved' ? 'border-indigo-100 bg-white opacity-80' : 'border-amber-200 bg-amber-50 shadow-xl shadow-amber-500/5'}`}>
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h4 className="font-black text-slate-900 text-xl tracking-tight leading-none mb-1">{c.title}</h4>
                              <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">{c.userId?.name || "Purged Identity"}</p>
                          </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-8 font-medium italic leading-relaxed">"{c.description}"</p>
                      <div className="flex justify-between items-center border-t border-slate-100 pt-6">
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
             <form onSubmit={handleLodgeSubmit} className="bg-white p-10 rounded-[3rem] w-full max-w-2xl relative shadow-2xl animate-in zoom-in duration-300">
                 <h3 className="text-3xl font-black mb-2 tracking-tight">Edit Building Profile</h3>
                 <p className="text-slate-500 font-medium mb-8 italic">Update public registry details and core location coordinates.</p>
                 <button type="button" onClick={() => setShowLodgeEdit(false)} className="absolute top-10 right-10 text-slate-400 bg-slate-50 p-3 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm border border-slate-100"><X className="w-5 h-5"/></button>
                 
                 <div className="grid grid-cols-2 gap-4 mb-8">
                     <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Building Name</label>
                         <input placeholder="Name" required className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold" value={lodgeForm.name} onChange={e => setLodgeForm({...lodgeForm, name: e.target.value})} />
                     </div>
                     <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Address</label>
                         <input placeholder="Full Address" required className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold" value={lodgeForm.address} onChange={e => setLodgeForm({...lodgeForm, address: e.target.value})} />
                     </div>
                     <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Latitude</label>
                         <input placeholder="Lat" type="number" step="any" required className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold" value={lodgeForm.lat} onChange={e => setLodgeForm({...lodgeForm, lat: e.target.value})} />
                     </div>
                     <div>
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Longitude</label>
                         <input placeholder="Lng" type="number" step="any" required className="w-full border-2 border-slate-100 p-4 rounded-2xl font-bold" value={lodgeForm.lng} onChange={e => setLodgeForm({...lodgeForm, lng: e.target.value})} />
                     </div>
                     <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Public Description</label>
                         <textarea placeholder="Description" required rows="3" className="w-full border-2 border-slate-100 p-4 rounded-2xl font-medium" value={lodgeForm.description} onChange={e => setLodgeForm({...lodgeForm, description: e.target.value})} />
                     </div>
                     <div className="col-span-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 ml-2 block">Upload Lodge Photos (Multiple)</label>
                         <input type="file" multiple accept="image/*" className="w-full border-2 border-slate-100 p-3 rounded-2xl bg-slate-50" onChange={e => setLodgeForm({...lodgeForm, images: e.target.files})} />
                         <p className="text-xs text-slate-400 mt-2 font-medium italic ml-2">These will be appended to any existing photos.</p>
                     </div>
                 </div>
                 
                 <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-[2.5rem] font-black shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all">Synchronize Building Matrix</button>
             </form>
          </div>
      )}

      {assignModal.show && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex flex-col justify-center items-center p-4">
             <form onSubmit={assignRoomManual} className="bg-white p-10 rounded-[3rem] w-full max-w-lg relative shadow-2xl animate-in zoom-in duration-300">
                 <h3 className="text-3xl font-black mb-2 tracking-tight">Manual Override</h3>
                 <p className="text-slate-500 font-medium mb-10 italic">Injecting tenant into residency matrix #BypassEnforced</p>
                 <button type="button" onClick={() => setAssignModal({show:false, roomId: null, userId: ''})} className="absolute top-10 right-10 text-slate-400 bg-slate-50 p-3 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm border border-slate-100"><X className="w-5 h-5"/></button>
                 
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4 mb-2 block font-poppins">Select Tenant Identity</label>
                 <select required className="w-full border-2 border-slate-100 p-5 rounded-3xl mb-10 appearance-none font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all" value={assignModal.userId} onChange={e => setAssignModal({...assignModal, userId: e.target.value})}>
                     <option value="" disabled>Search DB for identities...</option>
                     {clients.map(c => <option key={c._id} value={c._id}>{c.name} ({c.email})</option>)}
                 </select>
                 
                 <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black text-sm shadow-2xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all">Lock Unit for 365 Days</button>
             </form>
          </div>
      )}

      {editClient && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex flex-col justify-center items-center p-4">
             <form onSubmit={handleClientEdit} className="bg-white p-10 rounded-[3rem] w-full max-w-lg relative shadow-2xl animate-in zoom-in duration-300">
                 <div className="text-center mb-10">
                     <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center text-4xl font-black mx-auto mb-6 shadow-2xl shadow-indigo-600/30">{clientForm.name?.charAt(0) || 'U'}</div>
                     <h3 className="text-3xl font-black tracking-tight mb-2">Refine Identity</h3>
                     <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest italic">Manual System Override: CRM Profile</p>
                 </div>
                 
                 <button type="button" onClick={() => setEditClient(null)} className="absolute top-10 right-10 text-slate-400 bg-slate-50 p-3 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm border border-slate-100"><X className="w-5 h-5"/></button>
                 
                 <div className="space-y-4 mb-10">
                    <input placeholder="Full Name" required className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} />
                    <input placeholder="Electronic Mail" required type="email" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
                    <input placeholder="Phone Signal Address" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} />
                    <input placeholder="Reset Passcode (Leave blank to preserve)" type="password" className="w-full bg-rose-50 border-2 border-rose-100 p-5 rounded-2xl font-black text-rose-900 placeholder-rose-200 outline-none focus:ring-2 focus:ring-rose-500 transition-all" value={clientForm.password} onChange={e => setClientForm({...clientForm, password: e.target.value})} />
                    
                    <div className="flex items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex-grow">Identity Status</p>
                        <select className="bg-white border p-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-indigo-600" value={clientForm.status} onChange={e => setClientForm({...clientForm, status: e.target.value})}>
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
             <form onSubmit={submitManualPayment} className="bg-white p-10 rounded-[3rem] w-full max-w-lg relative shadow-2xl animate-in zoom-in duration-300">
                 <h3 className="text-3xl font-black mb-2 tracking-tight">Manual Ledger Entry</h3>
                 <p className="text-slate-500 font-medium mb-10 italic">Strict audit logging enabled for direct cash settlements.</p>
                 <button type="button" onClick={() => setPaymentModal({show:false, customerId: '', amount: '', notes: ''})} className="absolute top-10 right-10 text-slate-400 bg-slate-50 p-3 rounded-full hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm border border-slate-100"><X className="w-5 h-5"/></button>
                 
                 <div className="space-y-4 mb-10">
                    <select required className="w-full border-2 border-slate-100 p-5 rounded-2xl appearance-none font-black text-slate-900 bg-slate-50 focus:border-emerald-500 transition-all outline-none" value={paymentModal.customerId} onChange={e => setPaymentModal({...paymentModal, customerId: e.target.value})}>
                        <option value="" disabled>Select Tenant for Credit...</option>
                        {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <input placeholder="Settlement Amount (₹)" type="number" required className="w-full bg-emerald-50 border-2 border-emerald-100 p-6 rounded-2xl font-black text-emerald-700 text-3xl font-poppins text-center outline-none focus:ring-4 focus:ring-emerald-500/20" value={paymentModal.amount} onChange={e => setPaymentModal({...paymentModal, amount: e.target.value})} />
                    <textarea placeholder="Audit Trail Notes (e.g., Q1 Service Dues)..." required rows="3" className="w-full bg-slate-50 border border-slate-100 p-5 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-emerald-500 transition-all" value={paymentModal.notes} onChange={e => setPaymentModal({...paymentModal, notes: e.target.value})} />
                 </div>
                 
                 <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-[2.5rem] font-black text-sm shadow-2xl shadow-emerald-600/30 active:scale-95 transition-all uppercase tracking-widest">Commit Verification</button>
             </form>
          </div>
      )}

    </div>
  )
}
