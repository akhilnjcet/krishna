import React from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Services from './pages/Services';
import Projects from './pages/Projects';
import Quote from './pages/Quote';
import Blog from './pages/Blog';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const Layout = ({ children }) => (
  <div className="min-h-screen flex flex-col font-sans">
    <Navbar />
    <main className="flex-grow">
      {children}
    </main>
    <Footer />
  </div>
);

import StaffDashboard from './pages/staff/StaffDashboard';
import CustomerDashboard from './pages/customer/CustomerDashboard';

import InvoiceView from './pages/customer/InvoiceView';

import AdminProjects from './pages/admin/AdminProjects';
import AdminQuotes from './pages/admin/AdminQuotes';
import AdminStaff from './pages/admin/AdminStaff';
import AdminInvoices from './pages/admin/AdminInvoices';

const App = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/quote" element={<Quote />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="quotes" element={<AdminQuotes />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="invoices" element={<AdminInvoices />} />
          </Route>

          <Route path="/staff" element={<StaffDashboard />} />
          <Route path="/customer" element={<CustomerDashboard />} />
          <Route path="/customer/invoice/:id" element={<InvoiceView />} />

          {/* Fallback for others */}
          <Route path="*" element={<div className="p-8 text-center text-2xl h-96 flex items-center justify-center">Page Not Found</div>} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
