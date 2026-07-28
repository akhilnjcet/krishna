import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, Settings, Receipt, BarChart3, Search, Filter, 
    Download, Printer, Share2, Eye, Plus, CreditCard, Archive, 
    Trash2, ChevronLeft, ChevronRight, X, Info, Check, CheckCircle2, 
    TrendingUp, ShieldAlert, Award, FileText, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';

const LodgeBillingManager = () => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';

    // Tabs
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, settings, history, reports

    // Settings State
    const [settings, setSettings] = useState({
        defaultBillingCycle: 'Monthly',
        customBillingDays: 30,
        generationTime: 8,
        gracePeriodDays: 5,
        lateFeeAmount: 200,
        lateFeePercent: 2,
        lateFeeType: 'Fixed',
        currency: 'INR',
        taxPercent: 18,
        dueDaysCalculation: 7,
        autoNotificationChannels: ['WhatsApp'],
        autoPdfGeneration: true
    });
    const [savingSettings, setSavingSettings] = useState(false);

    // Dashboard Stats State
    const [stats, setStats] = useState({
        totalRooms: 0,
        occupiedRooms: 0,
        vacantRooms: 0,
        billsGenerated: 0,
        paidBills: 0,
        dueBills: 0,
        monthlyRevenue: 0,
        outstandingAmount: 0
    });

    // History Bills State
    const [bills, setBills] = useState([]);
    const [totalBills, setTotalBills] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loadingBills, setLoadingBills] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [sortFilter, setSortFilter] = useState('Newest First');
    const [viewArchived, setViewArchived] = useState(false);

    // Payment Modal State
    const [payingBill, setPayingBill] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        paymentMethod: 'Cash',
        transactionId: '',
        electricityCharges: 0,
        waterCharges: 0,
        maintenanceCharges: 0,
        extraCharges: 0,
        discount: 0
    });
    const [submittingPayment, setSubmittingPayment] = useState(false);

    // Preview Bill Watermark State (Paid/Due Toggle)
    const [previewWatermark, setPreviewWatermark] = useState('Due');

    // Fetch Stats
    const fetchStats = async () => {
        try {
            const res = await api.get('/lodge-billing/dashboard');
            setStats(res.data);
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
        }
    };

    // Fetch Settings
    const fetchSettings = async () => {
        try {
            const res = await api.get('/lodge-billing/settings');
            if (res.data) setSettings(res.data);
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };

    // Fetch Bills
    const fetchBills = async () => {
        setLoadingBills(true);
        try {
            const params = {
                page,
                limit: 15,
                search: searchTerm,
                status: statusFilter,
                dateRange: dateFilter,
                sort: sortFilter,
                archived: viewArchived ? 'true' : 'false'
            };
            const res = await api.get('/lodge-billing/bills', { params });
            setBills(res.data.bills || []);
            setTotalBills(res.data.total || 0);
            setPages(res.data.pages || 1);
        } catch (err) {
            console.error('Error fetching bills:', err);
        } finally {
            setLoadingBills(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'dashboard') fetchStats();
        if (activeTab === 'settings') fetchSettings();
        if (activeTab === 'history') fetchBills();
    }, [activeTab, page, statusFilter, dateFilter, sortFilter, viewArchived]);

    // Save Settings
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
            await api.post('/lodge-billing/settings', settings);
            alert('Billing settings updated successfully!');
        } catch (err) {
            console.error('Failed to save settings:', err);
            alert('Failed to update settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    // Record Payment
    const handleRecordPayment = async (e) => {
        e.preventDefault();
        setSubmittingPayment(true);
        try {
            await api.post(`/lodge-billing/bills/${payingBill._id}/pay`, paymentForm);
            setPayingBill(null);
            fetchBills();
            fetchStats();
            alert('Rent bill paid successfully!');
        } catch (err) {
            console.error('Failed to record payment:', err);
            alert('Payment failed.');
        } finally {
            setSubmittingPayment(false);
        }
    };

    // Toggle Archive
    const handleToggleArchive = async (id) => {
        try {
            await api.post(`/lodge-billing/bills/${id}/archive`);
            fetchBills();
        } catch (err) {
            console.error('Failed to toggle archive status:', err);
        }
    };

    // Generate and Download PDF Bill using jsPDF
    const handleGeneratePDF = async (bill) => {
        try {
            // Dynamically import jsPDF
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            // Header Banner
            doc.setFillColor(15, 23, 42); // Dark slate background
            doc.rect(0, 0, 210, 40, 'F');

            // Lodge Branding Title
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('KRISHNA LODGE RESIDENCY', 15, 18);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Premium Accommodation & Quality Living Solutions', 15, 24);
            doc.text('Thiruvazhiyode, Palakkad, Kerala | GSTIN: 32ABCDE1234F1Z5', 15, 29);

            // Invoice Type Banner
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('LODGE RENT INVOICE', 195, 18, { align: 'right' });
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Bill No: ${bill.billNumber}`, 195, 24, { align: 'right' });
            doc.text(`Generated Date: ${new Date(bill.createdAt).toLocaleDateString()}`, 195, 29, { align: 'right' });

            // Watermark check
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.1 }));
            doc.setFontSize(36);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(bill.status === 'Paid' ? [16, 185, 129] : [239, 68, 68]); // green or red
            doc.text(bill.status === 'Paid' ? 'PAID RECEIVED' : 'PAYMENT DUE', 105, 140, { align: 'center', angle: 45 });
            doc.restoreGraphicsState();

            // Reset Text Color
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(9.5);

            // Left Block: Tenant Details
            let y = 50;
            doc.setFont('helvetica', 'bold');
            doc.text('TENANT INFORMATION:', 15, y);
            doc.setFont('helvetica', 'normal');
            doc.text(`Name: ${bill.userId?.name || 'N/A'}`, 15, y + 6);
            doc.text(`Phone: ${bill.userId?.phone || 'N/A'}`, 15, y + 11);
            doc.text(`Email: ${bill.userId?.email || 'N/A'}`, 15, y + 16);
            doc.text(`Address: ${bill.userId?.address || 'N/A'}`, 15, y + 21);

            // Right Block: Room Specifications
            doc.setFont('helvetica', 'bold');
            doc.text('ACCOMMODATION DETAILS:', 120, y);
            doc.setFont('helvetica', 'normal');
            doc.text(`Room Number: ${bill.roomId?.type || 'N/A'}`, 120, y + 6);
            doc.text(`Room Type: ${bill.roomId?.type || 'Suite'}`, 120, y + 11);
            doc.text(`Monthly Rent: INR ${bill.rentAmount}`, 120, y + 16);
            doc.text(`Billing Cycle: ${bill.billingCycle}`, 120, y + 21);

            // Divider Line
            doc.setDrawColor(226, 232, 240);
            doc.line(15, y + 28, 195, y + 28);

            // Billing Period
            y = y + 36;
            doc.setFont('helvetica', 'bold');
            doc.text(`Billing Period: ${new Date(bill.billingPeriodStart).toLocaleDateString()} to ${new Date(bill.billingPeriodEnd).toLocaleDateString()}`, 15, y);
            doc.text(`Due Date: ${new Date(bill.dueDate).toLocaleDateString()}`, 195, y, { align: 'right' });

            // Table of Charges
            y = y + 8;
            doc.setFillColor(248, 250, 252);
            doc.rect(15, y, 180, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('Charge description', 18, y + 5.5);
            doc.text('Amount (INR)', 192, y + 5.5, { align: 'right' });

            doc.setFont('helvetica', 'normal');
            let itemY = y + 14;
            const addRow = (label, amt) => {
                doc.text(label, 18, itemY);
                doc.text(`INR ${amt.toFixed(2)}`, 192, itemY, { align: 'right' });
                itemY += 6;
            };

            addRow('Base Room Rent', bill.rentAmount);
            addRow('Electricity utility allocation', bill.electricityCharges || 0);
            addRow('Water allocation', bill.waterCharges || 0);
            addRow('General maintenance charges', bill.maintenanceCharges || 0);
            addRow('Extra logistical charges', bill.extraCharges || 0);
            if (bill.discount > 0) addRow('Applied discount', -bill.discount);
            addRow('GST / Tax allocation', bill.taxAmount || 0);
            if (bill.lateFeeApplied > 0) addRow('Overdue Late Fees', bill.lateFeeApplied);

            // Table border bottom
            doc.line(15, itemY - 2, 195, itemY - 2);

            // Grand Total block
            doc.setFillColor(248, 250, 252);
            doc.rect(110, itemY + 2, 85, 12, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('GRAND TOTAL DUE:', 113, itemY + 9.5);
            doc.text(`INR ${bill.totalAmount.toFixed(2)}`, 192, itemY + 9.5, { align: 'right' });

            // Terms
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text('1. Please settle all outstanding due payments within the grace period to avoid late fee charges.', 15, 260);
            doc.text('2. This is an official system generated bill and requires no physical seal.', 15, 265);

            // Download PDF
            // Check if native Android bridge is available for local downloads
            const safeFilename = `ResidencyBill_${bill.billNumber}.pdf`;
            const pdfOutput = doc.output('datauristring');
            const base64Data = pdfOutput.split(',')[1];

            if (window.Android && typeof window.Android.downloadBase64File === 'function') {
                window.Android.downloadBase64File(base64Data, safeFilename, 'application/pdf');
            } else {
                doc.save(safeFilename);
            }

        } catch (err) {
            console.error('PDF Generation Failure:', err);
            alert('Failed to generate PDF bill.');
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen relative font-sans">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Lodge Rent Billing Control</h1>
                    <p className="text-slate-500 font-medium">Configure automated billing cycles, allocate utilities, track outstanding balances, and generate PDF invoices.</p>
                </div>
            </div>

            {/* Quick Actions & Tabs */}
            <div className="flex flex-wrap gap-2 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200 w-fit">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    <LayoutDashboard className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    <Receipt className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Invoices History
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Settings className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Billing Settings
                    </button>
                )}
            </div>

            {/* Tab: Dashboard */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Occupied Rooms', value: `${stats.occupiedRooms} / ${stats.totalRooms}`, color: 'indigo' },
                            { label: 'Unpaid Invoices', value: stats.dueBills, color: 'rose' },
                            { label: 'Collected Revenue', value: `₹ ${stats.monthlyRevenue.toLocaleString('en-IN')}`, color: 'emerald' },
                            { label: 'Outstanding Dues', value: `₹ ${stats.outstandingAmount.toLocaleString('en-IN')}`, color: 'amber' }
                        ].map((s, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">{s.label}</span>
                                <h3 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">{s.value}</h3>
                            </div>
                        ))}
                    </div>

                    {/* Room status card lists */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-500" /> Operational Lodge Overview
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-slate-600">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                                <p className="font-bold text-slate-900 uppercase">Billing Engine Rationale</p>
                                <p className="leading-relaxed">The scheduler evaluates active room leases hourly. Rent invoices are generated automatically on the due date and formatted using the active cycle settings.</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                                <p className="font-bold text-slate-900 uppercase">Late Fee Policy</p>
                                <p className="leading-relaxed">Overdue balances extending beyond the grace period threshold automatically incur a late fee adjustment to ensure timely collections.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Settings */}
            {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg space-y-6 max-w-4xl">
                    <h3 className="text-xl font-black text-slate-900 uppercase">Lodge Billing Configuration</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        <div className="space-y-2">
                            <label className="font-black uppercase text-slate-400 tracking-wider block">Default Billing Cycle</label>
                            <select
                                value={settings.defaultBillingCycle}
                                onChange={(e) => setSettings({ ...settings, defaultBillingCycle: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold uppercase text-slate-700"
                            >
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Half-Yearly">Half-Yearly</option>
                                <option value="Yearly">Yearly</option>
                                <option value="Custom">Custom Days</option>
                            </select>
                        </div>

                        {settings.defaultBillingCycle === 'Custom' && (
                            <div className="space-y-2">
                                <label className="font-black uppercase text-slate-400 tracking-wider block">Custom Days Threshold</label>
                                <input
                                    type="number"
                                    value={settings.customBillingDays}
                                    onChange={(e) => setSettings({ ...settings, customBillingDays: parseInt(e.target.value) })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="font-black uppercase text-slate-400 tracking-wider block">Grace Period (Days)</label>
                            <input
                                type="number"
                                value={settings.gracePeriodDays}
                                onChange={(e) => setSettings({ ...settings, gracePeriodDays: parseInt(e.target.value) })}
                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="font-black uppercase text-slate-400 tracking-wider block">Late Fee Type</label>
                            <select
                                value={settings.lateFeeType}
                                onChange={(e) => setSettings({ ...settings, lateFeeType: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold uppercase text-slate-700"
                            >
                                <option value="Fixed">Fixed Amount</option>
                                <option value="Percentage">Percentage of Rent</option>
                            </select>
                        </div>

                        {settings.lateFeeType === 'Fixed' ? (
                            <div className="space-y-2">
                                <label className="font-black uppercase text-slate-400 tracking-wider block">Late Fee Amount (INR)</label>
                                <input
                                    type="number"
                                    value={settings.lateFeeAmount}
                                    onChange={(e) => setSettings({ ...settings, lateFeeAmount: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold"
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="font-black uppercase text-slate-400 tracking-wider block">Late Fee Percent (%)</label>
                                <input
                                    type="number"
                                    value={settings.lateFeePercent}
                                    onChange={(e) => setSettings({ ...settings, lateFeePercent: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="font-black uppercase text-slate-400 tracking-wider block">GST / Tax Allocation (%)</label>
                            <input
                                type="number"
                                value={settings.taxPercent}
                                onChange={(e) => setSettings({ ...settings, taxPercent: parseFloat(e.target.value) })}
                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="font-black uppercase text-slate-400 tracking-wider block">Due Date Calculation (Days from Start)</label>
                            <input
                                type="number"
                                value={settings.dueDaysCalculation}
                                onChange={(e) => setSettings({ ...settings, dueDaysCalculation: parseInt(e.target.value) })}
                                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={savingSettings}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                    >
                        {savingSettings ? 'Saving Settings...' : 'Save Configuration'}
                    </button>
                </form>
            )}

            {/* Tab: Invoices History */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {/* Filters panel */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                                <Search className="w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by bill number, occupant name..."
                                    className="bg-transparent border-0 w-full p-0 focus:ring-0 text-sm font-bold text-slate-800 placeholder:text-slate-300"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setPage(1)} 
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition"
                                >
                                    Filter
                                </button>
                                <button 
                                    onClick={() => setViewArchived(!viewArchived)}
                                    className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border transition ${viewArchived ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    Archived
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                            <div className="space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] pl-1">Payment Status</span>
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl outline-none font-bold uppercase text-slate-700"
                                >
                                    <option value="">All</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Due">Due</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] pl-1">Generation Date</span>
                                <select 
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl outline-none font-bold uppercase text-slate-700"
                                >
                                    <option value="">Any Date</option>
                                    <option value="Today">Today</option>
                                    <option value="Yesterday">Yesterday</option>
                                    <option value="This Week">This Week</option>
                                    <option value="This Month">This Month</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] pl-1">Sort Metric</span>
                                <select 
                                    value={sortFilter}
                                    onChange={(e) => setSortFilter(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl outline-none font-bold uppercase text-slate-700"
                                >
                                    <option value="Newest First">Newest First</option>
                                    <option value="Oldest First">Oldest First</option>
                                    <option value="Highest Amount">Highest Amount</option>
                                    <option value="Lowest Amount">Lowest Amount</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Bills Table */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">Bill Number</th>
                                        <th className="px-6 py-4">Room & Occupant</th>
                                        <th className="px-6 py-4">Billing Period</th>
                                        <th className="px-6 py-4">Outstanding Amount</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                    {loadingBills ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center text-slate-400">
                                                <div className="w-8 h-8 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
                                                Decrypting billing databases...
                                            </td>
                                        </tr>
                                    ) : bills.length > 0 ? bills.map(bill => (
                                        <tr key={bill._id} className="hover:bg-slate-50/30 transition">
                                            <td className="px-6 py-5 font-bold text-slate-900">{bill.billNumber}</td>
                                            <td className="px-6 py-5">
                                                <p className="font-bold text-slate-800">{bill.userId?.name || 'N/A'}</p>
                                                <p className="text-[10px] text-slate-400">{bill.roomId?.type || 'Room'}</p>
                                            </td>
                                            <td className="px-6 py-5 text-slate-500">
                                                {new Date(bill.billingPeriodStart).toLocaleDateString()} to {new Date(bill.billingPeriodEnd).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-5 text-slate-900 font-black">
                                                ₹ {bill.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                                                    bill.status === 'Paid' 
                                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                                                }`}>
                                                    {bill.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleGeneratePDF(bill)}
                                                        className="p-2 hover:bg-slate-100 text-indigo-600 rounded-lg transition"
                                                        title="Download Invoices PDF"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                    {bill.status === 'Due' && (
                                                        <button 
                                                            onClick={() => {
                                                                setPayingBill(bill);
                                                                setPaymentForm({
                                                                    paymentMethod: 'Cash',
                                                                    transactionId: '',
                                                                    electricityCharges: 0,
                                                                    waterCharges: 0,
                                                                    maintenanceCharges: 0,
                                                                    extraCharges: 0,
                                                                    discount: 0
                                                                });
                                                            }}
                                                            className="p-2 hover:bg-slate-100 text-emerald-600 rounded-lg transition"
                                                            title="Record Payment"
                                                        >
                                                            <CreditCard className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleToggleArchive(bill._id)}
                                                        className="p-2 hover:bg-slate-100 text-slate-400 rounded-lg transition"
                                                        title="Archive"
                                                    >
                                                        <Archive className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="py-16 text-center text-slate-400 font-bold italic">
                                                No generated bills match query criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {pages > 1 && (
                            <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex items-center justify-between">
                                <button 
                                    disabled={page === 1}
                                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                    className="p-2 border border-slate-200 bg-white rounded-xl disabled:opacity-50 text-slate-600"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {page} of {pages}</span>
                                <button 
                                    disabled={page === pages}
                                    onClick={() => setPage(prev => Math.min(pages, prev + 1))}
                                    className="p-2 border border-slate-200 bg-white rounded-xl disabled:opacity-50 text-slate-600"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Record Payment Dialog */}
            <AnimatePresence>
                {payingBill && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPayingBill(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="bg-indigo-600 p-8 text-white relative">
                                <h3 className="text-2xl font-bold mb-1">Record Rent Payment</h3>
                                <p className="text-indigo-100 text-xs font-semibold tracking-widest uppercase">Bill: {payingBill.billNumber}</p>
                            </div>
                            
                            <form onSubmit={handleRecordPayment} className="p-8 space-y-4 text-xs font-semibold">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Electricity (₹)</label>
                                        <input
                                            type="number"
                                            value={paymentForm.electricityCharges}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, electricityCharges: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Water (₹)</label>
                                        <input
                                            type="number"
                                            value={paymentForm.waterCharges}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, waterCharges: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Maintenance (₹)</label>
                                        <input
                                            type="number"
                                            value={paymentForm.maintenanceCharges}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, maintenanceCharges: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Discount (₹)</label>
                                        <input
                                            type="number"
                                            value={paymentForm.discount}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, discount: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl outline-none text-rose-600"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Payment Method</label>
                                        <select
                                            value={paymentForm.paymentMethod}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl outline-none uppercase font-bold text-slate-700"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="UPI">UPI Transfer</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Stripe / Card">Card / Stripe</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Transaction / UTR ID</label>
                                        <input
                                            type="text"
                                            value={paymentForm.transactionId}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                                            placeholder="e.g. TXN9988220"
                                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        type="button"
                                        onClick={() => setPayingBill(null)}
                                        className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={submittingPayment}
                                        className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                                    >
                                        {submittingPayment ? 'Processing...' : 'Settle Bill'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LodgeBillingManager;
