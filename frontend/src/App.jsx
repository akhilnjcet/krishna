import React, { useState, useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';

import { Network } from '@capacitor/network';

import { Capacitor } from '@capacitor/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense, lazy as reactLazy } from 'react';

// Detect chunk load errors caused by new deployments invalidating old asset hashes
const isChunkFetchError = (err) => {
  const msg = (err?.message || '') + ' ' + (err?.stack || '') + ' ' + String(err || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|MIME type of "text\/html"|Loading chunk/i.test(msg);
};

// Resilient lazy loader: if a new build removed the chunk, force a reload to get latest version seamlessly
const lazy = (factory) =>
  reactLazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkFetchError(error)) {
        const retryKey = `chunk_retry_${window.location.hash || 'app'}`;
        const alreadyRetried = sessionStorage.getItem(retryKey);
        if (!alreadyRetried) {
          sessionStorage.setItem(retryKey, 'true');
          if ('caches' in window) {
            try {
              const cacheNames = await caches.keys();
              await Promise.all(cacheNames.map((c) => caches.delete(c)));
            } catch (e) {}
          }
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
import { HashRouter as Router, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, WifiOff } from 'lucide-react';
import api from './services/api';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Projects from './pages/Projects';
import Quote from './pages/Quote';
import Blog from './pages/Blog';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import StaffLogin from './pages/StaffLogin';
import LegalPage from './pages/LegalPage';
import PolicyViewer from './pages/PolicyViewer';

const AdminLegalPolicies = lazy(() => import('./pages/admin/AdminLegalPolicies'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));

// Layouts (Lazy loaded on demand)
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const CustomerLayout = lazy(() => import('./layouts/CustomerLayout'));
const StaffLayout = lazy(() => import('./layouts/StaffLayout'));

// Admin Pages (Lazy loaded on demand)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProjects = lazy(() => import('./pages/admin/AdminProjects'));
const AdminPortfolio = lazy(() => import('./pages/admin/AdminPortfolio'));
const AdminQuotes = lazy(() => import('./pages/admin/AdminQuotes'));
const AdminStaff = lazy(() => import('./pages/admin/AdminStaff'));
const AdminInvoices = lazy(() => import('./pages/admin/AdminInvoices'));
const AttendanceLogs = lazy(() => import('./pages/admin/AttendanceLogs'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminLeave = lazy(() => import('./pages/admin/AdminLeave'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminFinance = lazy(() => import('./pages/admin/AdminFinance'));
const AdminProgress = lazy(() => import('./pages/admin/AdminProgress'));
const AdminBlog = lazy(() => import('./pages/admin/AdminBlog'));
const AdminAIChat = lazy(() => import('./pages/admin/AdminAIChat'));
const AdminApplications = lazy(() => import('./pages/admin/AdminApplications'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminWhatsApp = lazy(() => import('./pages/admin/AdminWhatsApp'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminTasks = lazy(() => import('./pages/admin/AdminTasks'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const Invoices = lazy(() => import('./pages/admin/Invoices'));
const Quotations = lazy(() => import('./pages/admin/Quotations'));
const LabourBillsTab = lazy(() => import('./pages/admin/LabourBillsTab'));
const RentalBills = lazy(() => import('./pages/admin/RentalBills'));
const DocumentHistory = lazy(() => import('./pages/admin/DocumentHistory'));
const AdminInventory = lazy(() => import('./pages/admin/AdminInventory'));

// Staff Pages (Lazy loaded on demand)
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard'));
const StaffTasks = lazy(() => import('./pages/staff/StaffTasks'));
const StaffLeave = lazy(() => import('./pages/staff/StaffLeave'));
const StaffFinance = lazy(() => import('./pages/staff/StaffFinance'));
const StaffProgress = lazy(() => import('./pages/staff/StaffProgress'));
const AttendanceScanner = lazy(() => import('./pages/staff/AttendanceScanner'));
const StaffTimesheets = lazy(() => import('./pages/staff/StaffTimesheets'));
const StaffContacts = lazy(() => import('./pages/staff/StaffContacts'));
const StaffApplications = lazy(() => import('./pages/staff/StaffApplications'));
const StaffAttendanceHub = lazy(() => import('./pages/staff/StaffAttendanceHub'));

// Customer Pages (Lazy loaded on demand)
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const CustomerQuotes = lazy(() => import('./pages/customer/CustomerQuotes'));
const InvoiceView = lazy(() => import('./pages/customer/InvoiceView'));
const CustomerPayments = lazy(() => import('./pages/customer/CustomerPayments'));
const CustomerProjects = lazy(() => import('./pages/customer/CustomerProjects'));

// Components
import AIChatWidget from './components/AIChatWidget';
import PermissionGuard from './components/PermissionGuard';
const Profile = lazy(() => import('./pages/Profile'));

import useAuthStore from './stores/authStore';

// Chat
const SupportHub = lazy(() => import('./pages/chat/SupportHub'));
const ChatRequestsManager = lazy(() => import('./pages/chat/ChatRequestsManager'));

// Lodge & Building Manager (Lazy loaded on demand)
const LodgeHome = lazy(() => import('./pages/lodge/LodgeHome'));
const RoomSelection = lazy(() => import('./pages/lodge/RoomSelection'));
const RoomDashboard = lazy(() => import('./pages/lodge/RoomDashboard'));
const ComplaintSystem = lazy(() => import('./pages/lodge/ComplaintSystem'));
const PaymentSystem = lazy(() => import('./pages/lodge/PaymentSystem'));
const PaymentHistory = lazy(() => import('./pages/lodge/PaymentHistory'));
const AdminLogin = lazy(() => import('./pages/lodge/AdminLogin'));
const LodgeAdminDashboard = lazy(() => import('./pages/lodge/LodgeAdminDashboard'));
const LodgeAdminManager = lazy(() => import('./pages/lodge/LodgeAdminManager'));
const TenantLogin = lazy(() => import('./pages/lodge/TenantLogin'));
const LodgeBooking = lazy(() => import('./pages/lodge/LodgeBooking'));
const LodgeSearch = lazy(() => import('./pages/lodge/LodgeSearch'));
const LodgeDetail = lazy(() => import('./pages/lodge/LodgeDetail'));
const LodgeCustomerDashboard = lazy(() => import('./pages/lodge/LodgeCustomerDashboard'));
const PrivacyPolicyPage = lazy(() => import('./pages/lodge/PrivacyPolicyPage'));
const LodgeBillingManager = lazy(() => import('./pages/lodge/LodgeBillingManager'));
const BookingVerify = lazy(() => import('./pages/lodge/BookingVerify'));

import useLodgeStore from './stores/lodgeStore';
import { notificationService } from './services/notificationService';


const LodgeNotificationManager = () => {
    const { rooms, authenticatedTenantRoom } = useLodgeStore();

    useEffect(() => {
        notificationService.requestPermissions();
    }, []);

    useEffect(() => {
        if (!authenticatedTenantRoom) return;
        const room = rooms.find(r => r.number === authenticatedTenantRoom);
        if (room) {
            notificationService.scheduleStayReminders(room);
        }
    }, [authenticatedTenantRoom, rooms]);

    return null;
};

import useSignalStore from './stores/signalStore';

const LodgeDataManager = () => {
    const pullFromCloud = useLodgeStore(state => state.pullFromCloud);
    const token = useAuthStore(state => state.token);
    const hasAttemptedPull = useRef(false);

    // Sync API Signal with Global BaseURL
    useEffect(() => {
        const unsubscribe = useSignalStore.subscribe(
            (state) => {
                api.defaults.baseURL = state.getApiUrl();
                console.log(`Signal Shifted: ${api.defaults.baseURL}`);
            }
        );
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (token && !hasAttemptedPull.current) {
            pullFromCloud();
            hasAttemptedPull.current = true;
        }
    }, [token, pullFromCloud]);

    return null;
};


const Layout = ({ children }) => {
  const location = useLocation();
  const hasTrackedVisit = useRef(false);
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    const initNetwork = async () => {
      const status = await Network.getStatus();
      setIsOffline(!status.connected);
    };
    initNetwork();

    let handlerPromise = null;
    try {
      handlerPromise = Network.addListener('networkStatusChange', status => {
        setIsOffline(!status.connected);
      });
    } catch (e) {
      console.warn("Network listener error", e);
    }

    return () => {
      if (handlerPromise && typeof handlerPromise.then === 'function') {
        handlerPromise.then(handler => {
           if (handler && handler.remove) handler.remove();
        });
      }
    };
  }, []);
  const isDashboard = location.pathname.startsWith('/admin') || 
                      location.pathname.startsWith('/staff') || 
                      location.pathname.startsWith('/customer') ||
                      location.pathname.startsWith('/lodge');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    // Only track once per app session
    if (!hasTrackedVisit.current) {
      const trackVisit = async () => {
        try {
          // If session storage has visit logged, we optionally can skip. 
          // We will just let backend handle 1-minute spam limit, but let's add basic session limit too.
          if (!sessionStorage.getItem('visit_logged')) {
            await api.post(`/visits`);
            sessionStorage.setItem('visit_logged', 'true');
          }
        } catch (error) {
          console.error("Failed to track visit", error);
        }
      };
      trackVisit();
      hasTrackedVisit.current = true;
    }
  }, []);

  useEffect(() => {
    const handleError = (event) => {
      console.error(`SYSTEM ERROR: ${event.message}\nAt: ${event.filename}:${event.lineno}`);
      // Silently log or use a toast instead of a blocking alert
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      <LodgeNotificationManager />
      <LodgeDataManager />
      <AnimatePresence>
        {isOffline && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-rose-600 text-white py-2 px-4 text-center text-[10px] font-black uppercase tracking-[0.3em] sticky top-0 z-[1000] flex items-center justify-center gap-3"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Atmospheric Link Interrupted: Manual Reconnaissance Only
          </motion.div>
        )}
      </AnimatePresence>
      {!isDashboard && <Navbar />}
      <main className="flex-grow">
        {children}
      </main>
      {!isDashboard && <Footer />}
      {!location.pathname.startsWith('/lodge') && (!Capacitor.isNativePlatform() || location.pathname !== '/') && <AIChatWidget />}
    </div>
  );
};

const SecurityWrapper = ({ children }) => {
  const { logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    // 🛡️ NATIVE BACK BUTTON LOGIC: Mandatory for Indus Appstore Approval
    const backListener = CapApp.addListener('backButton', () => {
      const path = window.location.hash;
      if (path === '#/' || path === '#/lodge') {
        CapApp.exitApp();
      } else {
        window.history.back();
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };

  }, []);

  useEffect(() => {
    // 🛡️ SESSION PURGE PROTOCOL (PHASE 3)
    // If we detect the legacy 'failsafe-admin' ID, we MUST purge storage to prevent BSON errors
    const user = useAuthStore.getState().user;
    if (user?._id === 'failsafe-admin' || user?.id === 'failsafe-admin') {
        console.warn("LEGACY SESSION DETECTED: AUTO-PURGE INITIATED");
        localStorage.clear();
        logout();
        navigate('/login', { replace: true });
        window.location.reload(); // Force full system reset
        return;
    }

    if (!isAuthenticated) return;


    let timeoutId;
    const INACTIVITY_LIMIT = 30 * 60 * 1000; // Increased to 30 mins

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Log out without an intrusive alert that blocks bots/users
        logout();
        navigate('/login', { replace: true });
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated, logout, navigate]);



  return <>{children}</>;
};

const SystemRescue = ({ error, isChunkError }) => {
  const handleReload = () => {
    try {
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {}
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B] z-[9999] flex flex-col items-center justify-center p-8 text-center font-sans overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse"></div>
      <div className="w-16 h-1 bg-blue-600 mb-10 rounded-full"></div>
      <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-3xl mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle className="w-24 h-24" />
          </div>
          <h2 className="text-4xl font-black text-white italic tracking-tighter mb-4">
            {isChunkError ? "System Updated." : "Connection Reset Required"}
          </h2>
          <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mb-8">
            {isChunkError ? "A newer application version has been deployed" : "Session synchronization needed"}
          </p>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-left mb-8 max-w-sm">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-2">Diagnostic Feed:</p>
              <p className="text-[10px] text-white/60 font-medium font-mono truncate">{error?.message || "Unhandled Logic Exception"}</p>
          </div>
          <div className="flex flex-col gap-4">
              <button 
                  onClick={handleReload}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
              >
                  {isChunkError ? "Refresh to Latest Version" : "Restart & Re-establish Connection"}
              </button>
              <button 
                  onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.href = '#/'; window.location.reload(); }}
                  className="w-full py-4 bg-white/5 text-slate-400 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all cursor-pointer"
              >
                  Purge Cache & Re-login
              </button>
          </div>
      </div>
      <p className="text-[8px] font-bold text-slate-700 uppercase tracking-[0.5em]">Emergency Protocol: REACH-RESTORE v2.1</p>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { 
    console.error("EMERGENCY INTERCEPT:", error, info);
    // Auto-reload immediately if a new deployment removed old hashed chunks
    if (isChunkFetchError(error)) {
      const lastReload = sessionStorage.getItem('chunk_error_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 3000) {
        sessionStorage.setItem('chunk_error_reload', now.toString());
        if ('caches' in window) {
          caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
        }
        window.location.reload();
      }
    }
  }
  render() {
    if (this.state.hasError) {
      const chunkErr = isChunkFetchError(this.state.error);
      return (
        <SystemRescue 
          error={this.state.error} 
          isChunkError={chunkErr}
        />
      );
    }
    return this.props.children;
  }
}


const App = () => {
  return (
    <ErrorBoundary>
        <Router>
          <PermissionGuard>
            <Layout>
              <SecurityWrapper>
                <Suspense fallback={
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }>
                  <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/engineering" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/quote" element={<Quote />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/staff-login" element={<StaffLogin />} />
            <Route path="/terms-of-service" element={<PolicyViewer defaultType="terms" />} />
            <Route path="/privacy-policy" element={<PolicyViewer defaultType="privacy" />} />
            <Route path="/terms" element={<PolicyViewer defaultType="terms" />} />
            <Route path="/privacy" element={<PolicyViewer defaultType="privacy" />} />
            <Route path="/refund-policy" element={<PolicyViewer defaultType="refund" />} />
            <Route path="/cancellation-refund-policy" element={<PolicyViewer defaultType="refund" />} />
            <Route path="/shipping-policy" element={<PolicyViewer defaultType="shipping" />} />
            <Route path="/delivery-policy" element={<PolicyViewer defaultType="shipping" />} />
            <Route path="/contact-us" element={<PolicyViewer defaultType="contact" />} />
            <Route path="/contact" element={<PolicyViewer defaultType="contact" />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/rate-us" element={<ReviewsPage />} />
            <Route path="/google-reviews" element={<ReviewsPage />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="projects" element={<AdminProjects />} />
              <Route path="portfolio" element={<AdminPortfolio />} />
              <Route path="quotes" element={<AdminQuotes />} />
              <Route path="staff" element={<AdminStaff />} />
              <Route path="invoices" element={<AdminInvoices />} />
              <Route path="logs" element={<AttendanceLogs />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="finance" element={<AdminFinance />} />
              <Route path="progress" element={<AdminProgress />} />
              <Route path="blog" element={<AdminBlog />} />
              <Route path="ai-chat" element={<AdminAIChat />} />
              <Route path="support" element={<ChatRequestsManager />} />
              <Route path="applications" element={<AdminApplications />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="whatsapp" element={<AdminWhatsApp />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="tasks" element={<AdminTasks />} />
              <Route path="live-chat" element={<SupportHub />} />
              <Route path="profile" element={<Profile />} />
              <Route path="lodge-manager" element={<LodgeAdminManager />} />
              <Route path="lodge" element={<LodgeAdminManager />} />
              <Route path="lodge-billing" element={<LodgeBillingManager />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="invoices-studio" element={<Invoices />} />
              <Route path="quotations-studio" element={<Quotations />} />
              <Route path="labour-bills" element={<LabourBillsTab />} />
              <Route path="rental-bills" element={<RentalBills />} />
              <Route path="inventory" element={<AdminInventory />} />
              <Route path="document-history" element={<DocumentHistory />} />
              <Route path="legal-policies" element={<AdminLegalPolicies />} />
            </Route>

            {/* Staff Routes */}
            <Route path="/staff" element={<StaffLayout />}>
              <Route index element={<StaffDashboard />} />
              <Route path="attendance" element={<AttendanceScanner />} />
              <Route path="attendance-hub" element={<StaffAttendanceHub />} />
              <Route path="timesheets" element={<StaffTimesheets />} />
              <Route path="tasks" element={<StaffTasks />} />
              <Route path="leave" element={<StaffLeave />} />
              <Route path="progress" element={<StaffProgress />} />
              <Route path="salary" element={<StaffFinance />} />
              <Route path="applications" element={<StaffApplications />} />
              <Route path="contacts" element={<StaffContacts />} />
              <Route path="chat" element={<SupportHub />} />
              <Route path="profile" element={<Profile />} />
            </Route>

              {/* Customer Routes */}
            <Route path="/customer" element={<CustomerLayout />}>
              <Route index element={<CustomerDashboard />} />
              <Route path="projects" element={<CustomerProjects />} />
              <Route path="quotes" element={<CustomerQuotes />} />
              <Route path="invoice/:id" element={<InvoiceView />} />
              <Route path="payments" element={<CustomerPayments />} />
              <Route path="support" element={<SupportHub />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Lodge & Building Manager Routes */}
            <Route path="/lodge">
              <Route index element={<LodgeHome />} />
              <Route path="search" element={<LodgeSearch />} />
              <Route path="manager" element={<LodgeSearch />} />
              <Route path="manager/booking" element={<LodgeSearch />} />
              <Route path="detail/:id" element={<LodgeDetail />} />
              <Route path="book/:roomId" element={<LodgeBooking />} />
              <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="tenant-login" element={<TenantLogin />} />
              <Route path="admin-login" element={<AdminLogin />} />
              <Route path="admin" element={<LodgeAdminDashboard />} />
              <Route path="dashboard" element={<LodgeCustomerDashboard />} />
              <Route path="rooms" element={<RoomSelection />} />
              <Route path="room/:roomNumber" element={<RoomDashboard />} />
              <Route path="payment/:roomNumber/:type" element={<PaymentSystem />} />
              <Route path="complaint/:roomNumber" element={<ComplaintSystem />} />
              <Route path="history/:roomNumber" element={<PaymentHistory />} />
              <Route path="billing" element={<LodgeBillingManager />} />
              <Route path="verify-booking/:id" element={<BookingVerify />} />
            </Route>

            {/* Fallback */}
            {/* Fallback */}
            <Route path="*" element={
              <div className="bg-[#050505] min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-1 bg-brand-accent mb-8"></div>
                <h1 className="text-8xl font-black text-white italic tracking-tighter mb-4">404</h1>
                <p className="text-xl text-gray-400 font-bold uppercase tracking-widest mb-12">System Link Failure: Page Not Found</p>
                <Link to="/" className="bg-brand-accent text-brand-950 px-10 py-4 font-black uppercase tracking-widest hover:bg-white transition-colors rotate-2 hover:rotate-0">
                  Return to Control Center
                </Link>
              </div>
            } />
            </Routes>
          </Suspense>
        </SecurityWrapper>
        </Layout>
      </PermissionGuard>
    </Router>
  </ErrorBoundary>
);
};

export default App;
