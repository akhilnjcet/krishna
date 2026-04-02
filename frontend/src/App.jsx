import React from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Projects from './pages/Projects';
import Quote from './pages/Quote';
import Blog from './pages/Blog';
import Login from './pages/Login';
import StaffLogin from './pages/StaffLogin';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import CustomerLayout from './layouts/CustomerLayout';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffTasks from './pages/staff/StaffTasks';
import StaffLeave from './pages/staff/StaffLeave';
import StaffFinance from './pages/staff/StaffFinance';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerQuotes from './pages/customer/CustomerQuotes';
import InvoiceView from './pages/customer/InvoiceView';
import Register from './pages/Register';
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
import StaffProgress from './pages/staff/StaffProgress';
import LegalPage from './pages/LegalPage';
import AdminAIChat from './pages/admin/AdminAIChat';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AIChatWidget from './components/AIChatWidget';

import useAuthStore from './stores/authStore';
import { useEffect } from 'react';

const Layout = ({ children }) => (
  <div className="min-h-screen flex flex-col font-sans relative">
    <Navbar />
    <main className="flex-grow">
      {children}
    </main>
    <Footer />
    <AIChatWidget />
  </div>
);

const SecurityWrapper = ({ children }) => {
  const { logout, isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 Minutes

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert("SECURITY: Session timed out due to operational inactivity.");
        logout();
        window.location.replace('/login');
      }, INACTIVITY_LIMIT);
    };

    // Tracking frequencies
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [isAuthenticated, logout]);

  // Back-button frequency protection
  useEffect(() => {
    if (!isAuthenticated) {
        // Clear history to prevent back-button re-entry
        window.history.replaceState(null, '', window.location.href);
    }
  }, [isAuthenticated]);

  return <>{children}</>;
};

const App = () => {
  return (
    <Router>
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
            <Route path="chat" element={<AdminAIChat />} />
          </Route>

          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/staff/tasks" element={<StaffTasks />} />
          <Route path="/staff/leave" element={<StaffLeave />} />
          <Route path="/staff/progress" element={<StaffProgress />} />
          <Route path="/staff/salary" element={<StaffFinance />} />
          
          {/* Customer Routes */}
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<CustomerDashboard />} />
            <Route path="quotes" element={<CustomerQuotes />} />
            <Route path="invoice/:id" element={<InvoiceView />} />
          </Route>

          {/* Fallback for others */}
          <Route path="*" element={<div className="p-8 text-center text-2xl h-96 flex items-center justify-center">Page Not Found</div>} />
          </Routes>
        </SecurityWrapper>
      </Layout>
    </Router>
  );
};

export default App;

