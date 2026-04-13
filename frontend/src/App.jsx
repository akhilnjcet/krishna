import React, { useState, useEffect, useRef } from 'react';
import { Network } from '@capacitor/network';
import { motion, AnimatePresence } from 'framer-motion';
import { loadFaceModels } from './utils/faceApiLoader';
import { HashRouter as Router, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
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

// Layouts
import AdminLayout from './layouts/AdminLayout';
import CustomerLayout from './layouts/CustomerLayout';
import StaffLayout from './layouts/StaffLayout';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProjects from './pages/admin/AdminProjects';
import AdminPortfolio from './pages/admin/AdminPortfolio';
import AdminQuotes from './pages/admin/AdminQuotes';
import AdminStaff from './pages/admin/AdminStaff';
import AdminInvoices from './pages/admin/AdminInvoices';
import AttendanceLogs from './pages/admin/AttendanceLogs';
import AdminReports from './pages/admin/AdminReports';
import AdminLeave from './pages/admin/AdminLeave';
import AdminSettings from './pages/admin/AdminSettings';
import AdminFinance from './pages/admin/AdminFinance';
import AdminProgress from './pages/admin/AdminProgress';
import AdminBlog from './pages/admin/AdminBlog';
import AdminAIChat from './pages/admin/AdminAIChat';
import AdminApplications from './pages/admin/AdminApplications';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminWhatsApp from './pages/admin/AdminWhatsApp';

// Staff Pages
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffTasks from './pages/staff/StaffTasks';
import StaffLeave from './pages/staff/StaffLeave';
import StaffFinance from './pages/staff/StaffFinance';
import StaffProgress from './pages/staff/StaffProgress';
import AttendanceScanner from './pages/staff/AttendanceScanner';
import StaffTimesheets from './pages/staff/StaffTimesheets';
import StaffContacts from './pages/staff/StaffContacts';
import StaffApplications from './pages/staff/StaffApplications';

// Customer Pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerQuotes from './pages/customer/CustomerQuotes';
import InvoiceView from './pages/customer/InvoiceView';
import CustomerPayments from './pages/customer/CustomerPayments';

// Components
import AIChatWidget from './components/AIChatWidget';
import Profile from './pages/Profile';

import useAuthStore from './stores/authStore';

// Chat
import SupportHub from './pages/chat/SupportHub';
import ChatRequestsManager from './pages/chat/ChatRequestsManager';

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

    const handler = Network.addListener('networkStatusChange', status => {
      setIsOffline(!status.connected);
    });

    return () => handler.remove();
  }, []);
  const isDashboard = location.pathname.startsWith('/admin') || 
                      location.pathname.startsWith('/staff') || 
                      location.pathname.startsWith('/customer');

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
      // Pre-load face models for attendance and registration
      loadFaceModels();
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
      <AIChatWidget />
    </div>
  );
};

const SecurityWrapper = ({ children }) => {
  const { logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
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

import PermissionGuard from './components/PermissionGuard';

const App = () => {
  return (
    <Router>
      <PermissionGuard>
        <Layout>
          <SecurityWrapper>
            <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/quote" element={<Quote />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/staff-login" element={<StaffLogin />} />
            <Route path="/terms" element={<LegalPage type="terms" />} />
            <Route path="/privacy" element={<LegalPage type="privacy" />} />

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
              <Route path="live-chat" element={<SupportHub />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Staff Routes */}
            <Route path="/staff" element={<StaffLayout />}>
              <Route index element={<StaffDashboard />} />
              <Route path="attendance" element={<AttendanceScanner />} />
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
              <Route path="quotes" element={<CustomerQuotes />} />
              <Route path="invoice/:id" element={<InvoiceView />} />
              <Route path="payments" element={<CustomerPayments />} />
              <Route path="support" element={<SupportHub />} />
              <Route path="profile" element={<Profile />} />
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
        </SecurityWrapper>
      </Layout>
    </PermissionGuard>
  </Router>
);
};

export default App;
