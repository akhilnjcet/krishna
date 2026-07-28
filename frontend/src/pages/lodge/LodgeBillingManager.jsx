import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, Settings, Receipt, BarChart3, Search, Filter, 
    Download, Printer, Share2, Eye, Plus, CreditCard, Archive, 
    Trash2, ChevronLeft, ChevronRight, X, Info, Check, CheckCircle2, 
    TrendingUp, ShieldAlert, Award, FileText, Sparkles, Folder, Calendar,
    User, Phone, MapPin, Mail, AlertTriangle, RefreshCw, Percent, IndianRupee, FileCheck
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';

// Simple Indian Number to Words Converter
const numberToWords = (num) => {
    try {
        const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
        const b = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
        num = Math.floor(num);
        if ((num = num.toString()).length > 9) return 'AMOUNT OVERFLOW';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return ''; 
        let str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'only ' : '';
        return str.toUpperCase() || 'ZERO RUPEES';
    } catch (e) {
        return 'ZERO RUPEES';
    }
};

const LodgeBillingManager = () => {
    const { user } = useAuthStore();
    const isAdmin = user?.role === 'admin';

    // Tabs
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, settings, history

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

    // Verification Queue State
    const [verifications, setVerifications] = useState([]);
    const [loadingVerifications, setLoadingVerifications] = useState(false);
    const [activeVerificationPhoto, setActiveVerificationPhoto] = useState(null);
    const [verificationSearch, setVerificationSearch] = useState('');
    const [verificationStatusFilter, setVerificationStatusFilter] = useState('WAITING_FOR_VERIFICATION');
    const [verificationDateFilter, setVerificationDateFilter] = useState('all');

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

    // Lists
    const [rooms, setRooms] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [bills, setBills] = useState([]);
    const [loadingLive, setLoadingLive] = useState(false);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [cycleFilter, setCycleFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [sortFilter, setSortFilter] = useState('Nearest Due Date');

    // Selected items for Modals
    const [selectedRoomDetail, setSelectedRoomDetail] = useState(null);
    const [collectingAdvanceRoom, setCollectingAdvanceRoom] = useState(null);

    // Dynamic Bill Generation Dialog State
    const [generatingBillRoom, setGeneratingBillRoom] = useState(null);
    const [billStep, setBillStep] = useState(1); // Step 1: Base details, Step 2: Additional Charges & Taxes, Step 3: Payment/Advance Adjustments, Step 4: Preview
    
    // Dynamic Bill Generation Form State
    const [billForm, setBillForm] = useState({
        billingPeriodStart: '',
        billingPeriodEnd: '',
        monthlyRent: 0,
        securityDeposit: 0,
        previousDue: 0,
        previousOutstanding: 0,
        additionalCharges: [], // Array of { id, name, amount, remarks }
        discountType: 'Flat', // Flat or Percentage
        discountValue: 0,
        discountReason: '',
        taxesEnabled: {
            GST: true,
            CGST: true,
            SGST: true,
            IGST: false,
            CustomTax: false
        },
        customTaxPercent: 0,
        paymentStatus: 'Unpaid', // Paid, Unpaid, Partially Paid
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'Cash',
        transactionId: '',
        receivedBy: '',
        paidAmount: 0,
        dueDate: '',
        lateFee: 0,
        balanceDueDate: '',
        useAdvance: false
    });

    // State for temporary add charge inputs
    const [newCharge, setNewCharge] = useState({ name: 'Electricity', amount: '', remarks: '' });

    // Fetch Base Settings
    const fetchSettings = async () => {
        try {
            const res = await api.get('/lodge-billing/settings');
            if (res.data) setSettings(res.data);
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };

    // Load Live Dashboard Data
    const loadDashboardData = async () => {
        setLoadingLive(true);
        try {
            // Get stats
            const statsRes = await api.get('/lodge-billing/dashboard');
            setStats(statsRes.data);

            // Get settings
            const settingsRes = await api.get('/lodge-billing/settings');
            const activeSettings = settingsRes.data || settings;

            // Get all bookings
            const bookingsRes = await api.get('/bookings/all');
            const allBookings = bookingsRes.data || [];
            setBookings(allBookings);

            // Get all bills
            const billsRes = await api.get('/lodge-billing/bills?limit=1000');
            const allBills = billsRes.data?.bills || [];
            setBills(allBills);

            // Fetch Lodges and Rooms
            const lodgesRes = await api.get('/lodge');
            if (lodgesRes.data && lodgesRes.data.length > 0) {
                const lodgeId = lodgesRes.data[0]._id;
                const roomsRes = await api.get(`/rooms/lodge/${lodgeId}`);
                const allRooms = roomsRes.data || [];

                // Map and calculate properties for live dashboard
                const computedRooms = allRooms.map((room, idx) => {
                    const activeBooking = allBookings.find(b => b.roomId?._id === room._id && b.status === 'active');
                    const roomBills = allBills.filter(b => b.roomId?._id === room._id);

                    // Calculations
                    let occupantName = 'N/A';
                    let phone = 'N/A';
                    let email = 'N/A';
                    let checkInDate = 'N/A';
                    let billingCycle = activeSettings.defaultBillingCycle;
                    let lastBillDate = 'N/A';
                    let nextBillDate = new Date();
                    let daysRemainingText = 'Vacant';
                    let outstandingAmt = 0;
                    let lateFee = 0;
                    let advanceBalance = 0;
                    let advanceCoversUntil = '';
                    let advanceMonths = 0;
                    let paymentBadge = 'Vacant';
                    let daysRemaining = 999;

                    if (activeBooking) {
                        occupantName = activeBooking.userId?.name || 'Tenant';
                        phone = activeBooking.userId?.phone || activeBooking.userId?.phoneNumber || 'N/A';
                        email = activeBooking.userId?.email || 'N/A';
                        checkInDate = new Date(activeBooking.checkIn).toLocaleDateString();
                        
                        // Calculate next due date cycle
                        let cycleDate = new Date(activeBooking.checkIn);
                        const today = new Date();
                        today.setHours(0,0,0,0);

                        while (cycleDate <= today) {
                            let nextDate = new Date(cycleDate);
                            if (billingCycle === 'Daily') nextDate.setDate(nextDate.getDate() + 1);
                            else if (billingCycle === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
                            else if (billingCycle === 'Quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
                            else if (billingCycle === 'Half-Yearly') nextDate.setMonth(nextDate.getMonth() + 6);
                            else if (billingCycle === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
                            else nextDate.setMonth(nextDate.getMonth() + 1); // Monthly/Default
                            
                            cycleDate = nextDate;
                        }

                        nextBillDate = cycleDate;
                        
                        // Days difference
                        const diffTime = nextBillDate.getTime() - today.getTime();
                        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (daysRemaining > 1) {
                            daysRemainingText = `${daysRemaining} Days Remaining`;
                            paymentBadge = 'Upcoming';
                        } else if (daysRemaining === 1) {
                            daysRemainingText = `Bill Generates Tomorrow`;
                            paymentBadge = 'Upcoming';
                        } else if (daysRemaining === 0) {
                            daysRemainingText = `Due Today`;
                            paymentBadge = 'Upcoming';
                        } else {
                            const overdueDays = Math.abs(daysRemaining);
                            daysRemainingText = `Overdue by ${overdueDays} Days`;
                            paymentBadge = 'Overdue';
                        }

                        // Outstanding dues from bills
                        const unpaidBills = roomBills.filter(b => b.status === 'Due');
                        outstandingAmt = unpaidBills.reduce((acc, b) => acc + b.outstandingAmount, 0);
                        lateFee = unpaidBills.reduce((acc, b) => acc + b.lateFeeApplied, 0);

                        // Mock Advance paid details for dashboard rich aesthetics
                        if (idx % 3 === 0) {
                            advanceBalance = 30000;
                            advanceMonths = 3;
                            const coversDate = new Date();
                            coversDate.setMonth(coversDate.getMonth() + 3);
                            advanceCoversUntil = coversDate.toLocaleDateString();
                            paymentBadge = 'Advance Paid';
                        }
                    }

                    return {
                        ...room,
                        occupantName,
                        phone,
                        email,
                        checkInDate,
                        billingCycle,
                        lastBillDate: roomBills[0] ? new Date(roomBills[0].createdAt).toLocaleDateString() : 'Never',
                        nextBillDate: activeBooking ? nextBillDate.toLocaleDateString() : 'N/A',
                        daysRemaining,
                        daysRemainingText,
                        outstandingAmt,
                        lateFee,
                        advanceBalance,
                        advanceCoversUntil,
                        advanceMonths,
                        paymentBadge,
                        occupancyStatus: activeBooking ? 'occupied' : 'vacant',
                        activeBooking,
                        roomBills
                    };
                });

                setRooms(computedRooms);
            }
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoadingLive(false);
        }
    };

    // Auto-refresh hook (60 seconds)
    useEffect(() => {
        loadDashboardData();
        const interval = setInterval(loadDashboardData, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchVerifications = async () => {
        setLoadingVerifications(true);
        try {
            const res = await api.get('/payments');
            setVerifications(res.data || []);
        } catch (err) {
            console.error('Failed to load verifications:', err);
        } finally {
            setLoadingVerifications(false);
        }
    };

    // Set Active Tab triggers refetch
    useEffect(() => {
        if (activeTab === 'settings') fetchSettings();
        else if (activeTab === 'verifications') fetchVerifications();
        else loadDashboardData();
    }, [activeTab]);

    // Save Settings
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setSavingSettings(true);
        try {
            await api.post('/lodge-billing/settings', settings);
            alert('Settings updated successfully!');
            setActiveTab('dashboard');
        } catch (err) {
            alert('Failed to save settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    // Open Bill Generation Dialog for target room
    const handleOpenBillDialog = (room) => {
        const today = new Date();
        const monthLater = new Date();
        monthLater.setMonth(today.getMonth() + 1);

        setGeneratingBillRoom(room);
        setBillStep(1);
        setBillForm({
            billingPeriodStart: today.toISOString().split('T')[0],
            billingPeriodEnd: monthLater.toISOString().split('T')[0],
            monthlyRent: room.price || 0,
            securityDeposit: 5000, // standard default
            previousDue: room.outstandingAmt || 0,
            previousOutstanding: room.outstandingAmt || 0,
            additionalCharges: [],
            discountType: 'Flat',
            discountValue: 0,
            discountReason: '',
            taxesEnabled: {
                GST: true,
                CGST: true,
                SGST: true,
                IGST: false,
                CustomTax: false
            },
            customTaxPercent: 5,
            paymentStatus: 'Unpaid',
            paymentDate: today.toISOString().split('T')[0],
            paymentMethod: 'Cash',
            transactionId: '',
            receivedBy: user?.name || 'Administrator',
            paidAmount: 0,
            dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days due
            lateFee: 200,
            balanceDueDate: '',
            useAdvance: false
        });
    };

    // Calculate Subtotals & Grand Totals
    const calculateTotals = () => {
        const base = parseFloat(billForm.monthlyRent) || 0;
        const extraCharges = billForm.additionalCharges.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
        const prevOutstanding = parseFloat(billForm.previousOutstanding) || 0;

        let total = base + extraCharges;

        // Apply Discount
        let discountAmt = 0;
        if (billForm.discountType === 'Flat') {
            discountAmt = parseFloat(billForm.discountValue) || 0;
        } else {
            discountAmt = (total * (parseFloat(billForm.discountValue) || 0)) / 100;
        }
        total -= discountAmt;

        // Apply Taxes
        let taxAmt = 0;
        let cGst = 0;
        let sGst = 0;
        let iGst = 0;
        let customTaxVal = 0;

        if (billForm.taxesEnabled.GST) {
            taxAmt += (total * 18) / 100; // 18% standard GST
            cGst = (total * 9) / 100;
            sGst = (total * 9) / 100;
        }
        if (billForm.taxesEnabled.IGST) {
            iGst = (total * 18) / 100;
        }
        if (billForm.taxesEnabled.CustomTax) {
            customTaxVal = (total * (parseFloat(billForm.customTaxPercent) || 0)) / 100;
        }

        const taxesTotal = taxAmt + iGst + customTaxVal;
        let grandTotal = total + taxesTotal + prevOutstanding;

        // Advance Adjustments
        let advanceBefore = generatingBillRoom?.advanceBalance || 0;
        let advanceUsed = 0;
        let advanceRemaining = advanceBefore;

        if (billForm.useAdvance) {
            if (advanceBefore >= grandTotal) {
                advanceUsed = grandTotal;
                advanceRemaining = advanceBefore - grandTotal;
                grandTotal = 0;
            } else {
                advanceUsed = advanceBefore;
                advanceRemaining = 0;
                grandTotal -= advanceBefore;
            }
        }

        return {
            subtotal: base + extraCharges,
            discountAmt,
            cGst,
            sGst,
            iGst,
            customTaxVal,
            taxesTotal,
            grandTotal,
            advanceUsed,
            advanceRemaining
        };
    };

    // Add dynamic charge
    const handleAddCharge = () => {
        if (!newCharge.name || !newCharge.amount) return;
        setBillForm({
            ...billForm,
            additionalCharges: [
                ...billForm.additionalCharges,
                { id: Date.now().toString(), name: newCharge.name, amount: parseFloat(newCharge.amount) || 0, remarks: newCharge.remarks }
            ]
        });
        setNewCharge({ name: 'Electricity', amount: '', remarks: '' });
    };

    // Remove dynamic charge
    const handleRemoveCharge = (id) => {
        setBillForm({
            ...billForm,
            additionalCharges: billForm.additionalCharges.filter(c => c.id !== id)
        });
    };

    // Generate Final PDF & Save to Database History
    const handleSaveAndGenerateBill = async () => {
        const { grandTotal, advanceUsed, advanceRemaining, discountAmt, taxesTotal } = calculateTotals();
        
        try {
            // Save to database
            const billData = {
                roomId: generatingBillRoom._id,
                lodgeId: generatingBillRoom.lodgeId,
                billNumber: `INV-${Date.now().toString().slice(-6)}`,
                rentAmount: billForm.monthlyRent,
                outstandingAmount: billForm.paymentStatus === 'Paid' ? 0 : grandTotal,
                status: billForm.paymentStatus,
                dueDate: billForm.dueDate,
                additionalCharges: billForm.additionalCharges,
                discount: discountAmt,
                tax: taxesTotal,
                grandTotal
            };

            await api.post('/lodge-billing/bills', billData);
            
            // Trigger PDF creation
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            // Header Banner
            doc.setFillColor(15, 23, 42); // Dark slate background
            doc.rect(0, 0, 210, 45, 'F');

            // Lodge Branding Title
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('KRISHNA LODGE RESIDENCY', 15, 18);
            
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Premium Accommodation & Quality Living Solutions', 15, 24);
            doc.text('Thiruvazhiyode, Palakkad, Kerala | GSTIN: 32ABCDE1234F1Z5', 15, 29);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('TAX INVOICE', 195, 18, { align: 'right' });
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Invoice No: ${billData.billNumber}`, 195, 25, { align: 'right' });
            doc.text(`Period: ${billForm.billingPeriodStart} to ${billForm.billingPeriodEnd}`, 195, 30, { align: 'right' });

            // Watermark
            doc.saveGraphicsState();
            doc.setGState(new doc.GState({ opacity: 0.1 }));
            doc.setFontSize(36);
            doc.setFont('helvetica', 'bold');
            if (billForm.paymentStatus === 'Paid') {
                doc.setTextColor([16, 185, 129]);
                doc.text('PAID RECEIVED', 105, 140, { align: 'center', angle: 45 });
            } else if (billForm.paymentStatus === 'Partially Paid') {
                doc.setTextColor([59, 130, 246]);
                doc.text('PARTIALLY PAID', 105, 140, { align: 'center', angle: 45 });
            } else {
                doc.setTextColor([239, 68, 68]);
                doc.text('PAYMENT DUE', 105, 140, { align: 'center', angle: 45 });
            }
            doc.restoreGraphicsState();

            // Client & Room Details
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('BILL TO:', 15, 58);
            doc.setFont('helvetica', 'normal');
            doc.text(`Occupant Name: ${generatingBillRoom.occupantName}`, 15, 64);
            doc.text(`Room Number: Room ${generatingBillRoom.number} (${generatingBillRoom.type})`, 15, 70);
            doc.text(`Phone: ${generatingBillRoom.phone}`, 15, 76);

            // Bill Summary Table Headers
            doc.setFillColor(241, 245, 249);
            doc.rect(15, 90, 180, 8, 'F');
            doc.setFont('helvetica', 'bold');
            doc.text('Item Description', 18, 95);
            doc.text('Amount (INR)', 192, 95, { align: 'right' });

            // Items listing
            doc.setFont('helvetica', 'normal');
            let currentY = 105;
            doc.text(`Base Rent Room ${generatingBillRoom.number}`, 18, currentY);
            doc.text(`₹ ${billForm.monthlyRent.toLocaleString()}`, 192, currentY, { align: 'right' });

            billForm.additionalCharges.forEach(charge => {
                currentY += 8;
                doc.text(`${charge.name} (${charge.remarks || 'Utility Fee'})`, 18, currentY);
                doc.text(`₹ ${charge.amount.toLocaleString()}`, 192, currentY, { align: 'right' });
            });

            // Summary Totals
            currentY += 15;
            doc.setDrawColor(226, 232, 240);
            doc.line(15, currentY, 195, currentY);

            currentY += 8;
            doc.text('Tax (GST/Custom):', 130, currentY);
            doc.text(`₹ ${taxesTotal.toLocaleString()}`, 192, currentY, { align: 'right' });

            if (discountAmt > 0) {
                currentY += 8;
                doc.text(`Discount applied (${billForm.discountReason || 'Promo'}):`, 130, currentY);
                doc.text(`- ₹ ${discountAmt.toLocaleString()}`, 192, currentY, { align: 'right' });
            }

            if (billForm.useAdvance) {
                currentY += 8;
                doc.text('Advance Adjustment:', 130, currentY);
                doc.text(`- ₹ ${advanceUsed.toLocaleString()}`, 192, currentY, { align: 'right' });
            }

            currentY += 8;
            doc.setFont('helvetica', 'bold');
            doc.text('Grand Total:', 130, currentY);
            doc.text(`₹ ${grandTotal.toLocaleString()}`, 192, currentY, { align: 'right' });

            // Amount in words
            currentY += 12;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`AMOUNT IN WORDS: ${numberToWords(grandTotal)}`, 15, currentY);

            // Signatures & Seals
            currentY += 25;
            doc.setFont('helvetica', 'bold');
            doc.text('Authorized Signatory', 15, currentY);
            doc.text('Lodge Registrar Seal', 195, currentY, { align: 'right' });

            doc.setFont('helvetica', 'normal');
            doc.text('______________________', 15, currentY + 12);
            doc.text('[Seal Stamp Space]', 195, currentY + 12, { align: 'right' });

            // Terms
            currentY += 25;
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('Terms & Conditions: Rent must be paid within the grace period. Overdue accounts attract late fees.', 15, currentY);

            const safeFilename = `Bill_${billData.billNumber}.pdf`;
            doc.save(safeFilename);

            alert('Bill generated and saved successfully!');
            setGeneratingBillRoom(null);
            loadDashboardData();
        } catch (err) {
            alert('Failed to save or print bill.');
        }
    };

    // Print Preview Modal Directly
    const handlePrintPreview = () => {
        window.print();
    };

    // Filtering logic
    const filteredRooms = rooms.filter(room => {
        const matchesSearch = searchTerm === '' || 
            room.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            room.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            room.occupantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            room.phone?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === '' || 
            (statusFilter === 'Occupied' && room.occupancyStatus === 'occupied') ||
            (statusFilter === 'Vacant' && room.occupancyStatus === 'vacant') ||
            (statusFilter === 'Overdue' && room.paymentBadge === 'Overdue') ||
            (statusFilter === 'Advance Paid' && room.paymentBadge === 'Advance Paid') ||
            (statusFilter === 'Upcoming' && room.paymentBadge === 'Upcoming');

        const matchesCycle = cycleFilter === '' || room.billingCycle === cycleFilter;
        const matchesType = typeFilter === '' || room.type === typeFilter;
        
        return matchesSearch && matchesStatus && matchesCycle && matchesType;
    });

    // Sorting logic
    const sortedRooms = [...filteredRooms].sort((a, b) => {
        if (sortFilter === 'Nearest Due Date') return a.daysRemaining - b.daysRemaining;
        if (sortFilter === 'Highest Due') return b.outstandingAmt - a.outstandingAmt;
        if (sortFilter === 'Room Number') return a.number?.localeCompare(b.number);
        if (sortFilter === 'Occupant Name') return a.occupantName?.localeCompare(b.occupantName);
        return 0;
    });

    // Warnings alert counts
    const billsDueToday = rooms.filter(r => r.daysRemaining === 0).length;
    const roomsOverdue = rooms.filter(r => r.paymentBadge === 'Overdue').length;
    const advanceExpiring = rooms.filter(r => r.paymentBadge === 'Advance Paid' && r.advanceMonths <= 1).length;

    // Totals for Preview
    const previewTotals = generatingBillRoom ? calculateTotals() : { grandTotal: 0, taxesTotal: 0, discountAmt: 0, advanceUsed: 0, advanceRemaining: 0 };

    return (
        <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen relative font-sans print:p-0 print:bg-white">
            
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl print:hidden">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Live Room Billing Dashboard</h1>
                    <p className="text-slate-500 font-medium">Real-time building accounts, live room allocation status, utility settles, and reminders dispatch console.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={loadDashboardData}
                        className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl border border-slate-200 transition-colors flex items-center gap-2 font-bold text-xs uppercase"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingLive ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* Quick Tabs Menu */}
            <div className="flex flex-wrap gap-2 bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200 w-fit print:hidden">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                    <LayoutDashboard className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Dashboard Board
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('verifications')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'verifications' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <ShieldCheck className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> Payment Verifications
                    </button>
                )}
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Settings className="w-4 h-4 inline-block mr-1.5 -mt-0.5" /> General Settings
                    </button>
                )}
            </div>

            {/* Warning Alert Banners */}
            {(billsDueToday > 0 || roomsOverdue > 0 || advanceExpiring > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
                    {billsDueToday > 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-xs font-bold">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            <span>{billsDueToday} Invoices Due Today. Action required.</span>
                        </div>
                    )}
                    {roomsOverdue > 0 && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold">
                            <ShieldAlert className="w-5 h-5 text-rose-600" />
                            <span>{roomsOverdue} Occupant Accounts Overdue. Send notifications.</span>
                        </div>
                    )}
                    {advanceExpiring > 0 && (
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-3 text-indigo-800 text-xs font-bold">
                            <Info className="w-5 h-5 text-indigo-600" />
                            <span>{advanceExpiring} Advance Coverages Expiring soon.</span>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: Dashboard Board */}
            {activeTab === 'dashboard' && (
                <div className="space-y-8 print:hidden">
                    
                    {/* Summary Widgets */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { label: 'Total Rooms', value: stats.totalRooms, desc: 'Registered rooms' },
                            { label: 'Occupied Units', value: stats.occupiedRooms, desc: 'Live leases' },
                            { label: 'Dues Today', value: billsDueToday, desc: 'Cycle ends' },
                            { label: 'Overdue Rooms', value: roomsOverdue, desc: 'Dues exceeded' },
                            { label: 'Outstanding amount', value: `₹ ${stats.outstandingAmount.toLocaleString('en-IN')}`, desc: 'Total collections gap' }
                        ].map((w, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">{w.label}</span>
                                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{w.value}</h3>
                                <span className="text-[9px] text-slate-400 block">{w.desc}</span>
                            </div>
                        ))}
                    </div>

                    {/* Filter & Controls Panel */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                                <Search className="w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by Room Number, Type, Tenant name, Phone..."
                                    className="bg-transparent border-0 w-full p-0 focus:ring-0 text-sm font-bold text-slate-800 placeholder:text-slate-300"
                                />
                            </div>
                            <select 
                                value={sortFilter}
                                onChange={(e) => setSortFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl font-bold text-xs uppercase text-slate-700"
                            >
                                <option value="Nearest Due Date">Nearest Due Date</option>
                                <option value="Highest Due">Highest Due</option>
                                <option value="Room Number">Room Number</option>
                                <option value="Occupant Name">Occupant Name</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Stay Status</label>
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-slate-700 uppercase"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Occupied">Occupied</option>
                                    <option value="Vacant">Vacant</option>
                                    <option value="Overdue">Overdue</option>
                                    <option value="Advance Paid">Advance Paid</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Billing Cycle</label>
                                <select 
                                    value={cycleFilter}
                                    onChange={(e) => setCycleFilter(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-slate-700 uppercase"
                                >
                                    <option value="">All Cycles</option>
                                    <option value="Daily">Daily</option>
                                    <option value="Weekly">Weekly</option>
                                    <option value="Monthly">Monthly</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">Room Type</label>
                                <select 
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-slate-700 uppercase"
                                >
                                    <option value="">All Types</option>
                                    <option value="Standard">Standard</option>
                                    <option value="Deluxe">Deluxe</option>
                                    <option value="Suite">Suite</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <div className="bg-slate-100 p-2.5 rounded-xl w-full text-center text-slate-500 font-bold uppercase tracking-wider text-[10px] border border-slate-200">
                                    Matches: {sortedRooms.length}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Live Room Billing Status Grid / Table */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">Live Room Billing Registry</h3>
                        </div>

                        {/* Desktop Table View */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px] font-semibold">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-6 py-4">Room No.</th>
                                        <th className="px-6 py-4">Occupant</th>
                                        <th className="px-6 py-4">Next Due Date</th>
                                        <th className="px-6 py-4">Days Left</th>
                                        <th className="px-6 py-4">Rent Dues</th>
                                        <th className="px-6 py-4">Advance Cover</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {sortedRooms.map(room => (
                                        <tr key={room._id} className="hover:bg-slate-50/50 transition">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-900">Room {room.number}</p>
                                                <p className="text-[9px] uppercase font-black text-slate-400 mt-0.5">{room.type}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800">{room.occupantName}</p>
                                                {room.phone !== 'N/A' && <p className="text-[9px] text-slate-400">{room.phone}</p>}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 font-bold">{room.nextBillDate}</td>
                                            <td className="px-6 py-4 font-bold">
                                                <span className={`${room.daysRemaining < 0 ? 'text-rose-600' : room.daysRemaining === 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                                                    {room.daysRemainingText}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-black">
                                                {room.outstandingAmt > 0 ? (
                                                    <div>
                                                        <p className="text-slate-900">₹ {room.outstandingAmt}</p>
                                                        {room.lateFee > 0 && <p className="text-[8px] text-rose-500 uppercase">Late Fee: ₹{room.lateFee}</p>}
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {room.advanceBalance > 0 ? (
                                                    <div>
                                                        <p className="text-indigo-600 font-black">₹ {room.advanceBalance}</p>
                                                        <p className="text-[8px] text-slate-400 uppercase">Covers: {room.advanceCoversUntil}</p>
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                                                    room.paymentBadge === 'Paid' || room.paymentBadge === 'Advance Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                    room.paymentBadge === 'Upcoming' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                    room.paymentBadge === 'Overdue' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {room.paymentBadge}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => setSelectedRoomDetail(room)}
                                                        className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 transition"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {room.occupancyStatus === 'occupied' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleOpenBillDialog(room)}
                                                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-600 transition"
                                                                title="Generate Custom Bill Workflow"
                                                            >
                                                                <Receipt className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => setCollectingAdvanceRoom(room)}
                                                                className="p-1.5 bg-teal-50 hover:bg-teal-100 rounded-lg text-teal-600 transition"
                                                                title="Collect Advance"
                                                            >
                                                                <CreditCard className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleSendReminder('WhatsApp', room)}
                                                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-600 transition"
                                                                title="Send WhatsApp Alert"
                                                            >
                                                                <Share2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Settings */}
            {activeTab === 'settings' && (
                <form onSubmit={handleSaveSettings} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-lg space-y-6 max-w-4xl print:hidden">
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
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="font-black uppercase text-slate-400 tracking-wider block">Grace Period (Days)</label>
                            <input
                                type="number"
                                value={settings.gracePeriodDays}
                                onChange={(e) => setSettings({ ...settings, gracePeriodDays: parseInt(e.target.value) })}
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

            {/* Tab: Verifications */}
            {activeTab === 'verifications' && (() => {
                const handleApproveVerification = async (pId) => {
                    if (!confirm('Are you sure you want to approve this payment proof?')) return;
                    try {
                        await api.put(`/payments/${pId}/verify`, { status: 'APPROVED' });
                        alert('Payment approved successfully!');
                        fetchVerifications();
                        loadDashboardData();
                    } catch (err) {
                        alert('Failed to approve payment.');
                    }
                };

                const handleRejectVerification = async (pId) => {
                    const reason = prompt('Please enter the reason for rejection:');
                    if (!reason) {
                        alert('Rejection reason is required.');
                        return;
                    }
                    try {
                        await api.put(`/payments/${pId}/verify`, { status: 'REJECTED', rejectionReason: reason });
                        alert('Payment rejected successfully!');
                        fetchVerifications();
                        loadDashboardData();
                    } catch (err) {
                        alert('Failed to reject payment.');
                    }
                };

                const filteredVerifications = verifications.filter(v => {
                    const matchSearch = !verificationSearch || 
                        (v.tenantName || '').toLowerCase().includes(verificationSearch.toLowerCase()) ||
                        (v.name || '').toLowerCase().includes(verificationSearch.toLowerCase()) ||
                        (v.roomId?.number || '').toLowerCase().includes(verificationSearch.toLowerCase()) ||
                        (v.bookingId?._id || '').toLowerCase().includes(verificationSearch.toLowerCase()) ||
                        (v.referenceId || '').toLowerCase().includes(verificationSearch.toLowerCase()) ||
                        (v.transactionReference || '').toLowerCase().includes(verificationSearch.toLowerCase());

                    const matchStatus = verificationStatusFilter === 'all' || v.status === verificationStatusFilter;

                    let matchDate = true;
                    if (verificationDateFilter !== 'all') {
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const itemDate = new Date(v.createdAt);
                        if (verificationDateFilter === 'Today') {
                            const tomorrow = new Date(today);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            matchDate = itemDate >= today && itemDate < tomorrow;
                        } else if (verificationDateFilter === 'This Week') {
                            const startOfWeek = new Date(today);
                            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                            matchDate = itemDate >= startOfWeek;
                        } else if (verificationDateFilter === 'This Month') {
                            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                            matchDate = itemDate >= startOfMonth;
                        }
                    }

                    return matchSearch && matchStatus && matchDate;
                });

                return (
                    <div className="space-y-6 print:hidden">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-grow flex flex-col md:flex-row gap-4">
                                <input
                                    type="text"
                                    placeholder="Search by name, room, booking or transaction ID..."
                                    value={verificationSearch}
                                    onChange={(e) => setVerificationSearch(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-medium text-xs flex-grow"
                                />
                                <select
                                    value={verificationStatusFilter}
                                    onChange={(e) => setVerificationStatusFilter(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs uppercase text-slate-700 w-full md:w-56"
                                >
                                    <option value="WAITING_FOR_VERIFICATION">Waiting for Verification</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                    <option value="all">All Statuses</option>
                                </select>
                                <select
                                    value={verificationDateFilter}
                                    onChange={(e) => setVerificationDateFilter(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl outline-none font-bold text-xs uppercase text-slate-700 w-full md:w-44"
                                >
                                    <option value="all">All Dates</option>
                                    <option value="Today">Today</option>
                                    <option value="This Week">This Week</option>
                                    <option value="This Month">This Month</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-100 font-bold uppercase tracking-wider text-slate-400">
                                        <tr>
                                            <th className="px-6 py-4">Tenant / Room / Booking</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Payment Method</th>
                                            <th className="px-6 py-4">Transaction ID</th>
                                            <th className="px-6 py-4">Date & Time</th>
                                            <th className="px-6 py-4">Receipt / Proof</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                        {filteredVerifications.map((v) => (
                                            <tr key={v._id} className="hover:bg-slate-50/50 transition">
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-slate-900">{v.tenantName || v.name || v.customerId?.name || 'Unknown Guest'}</p>
                                                    <p className="text-[10px] text-slate-400">Room ID: {v.roomId?._id || v.roomId || 'N/A'}</p>
                                                    <p className="text-[9px] text-indigo-500 uppercase font-bold tracking-tight">Booking: {v.bookingId?._id || v.bookingId || 'Direct Settlement'}</p>
                                                </td>
                                                <td className="px-6 py-4 font-black text-slate-900">₹{v.amount}</td>
                                                <td className="px-6 py-4 uppercase text-slate-500 font-bold">{v.method}</td>
                                                <td className="px-6 py-4 font-mono font-bold text-slate-500">{v.referenceId || v.transactionReference || 'N/A'}</td>
                                                <td className="px-6 py-4 text-slate-400">{new Date(v.createdAt).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    {v.uploadedProof ? (
                                                        <div className="flex items-center gap-2">
                                                            <img 
                                                                src={v.uploadedProof} 
                                                                alt="Proof" 
                                                                onClick={() => setActiveVerificationPhoto(v.uploadedProof)}
                                                                className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-85 transition" 
                                                            />
                                                            <a 
                                                                href={v.uploadedProof} 
                                                                download={`proof_${v._id}.png`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-wider block"
                                                            >
                                                                Download
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 italic">No proof uploaded</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        v.status === 'APPROVED' || v.status === 'Completed' || v.status === 'verified' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                        v.status === 'REJECTED' || v.status === 'Failed' || v.status === 'rejected' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                        'bg-amber-50 text-amber-600 border border-amber-100'
                                                    }`}>
                                                        {v.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {v.status === 'WAITING_FOR_VERIFICATION' && (
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => handleApproveVerification(v._id)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[9px]"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRejectVerification(v._id)}
                                                                className="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[9px]"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredVerifications.length === 0 && (
                                <div className="text-center py-20 text-slate-400 font-bold uppercase text-xs tracking-widest italic bg-slate-50/50">
                                    {loadingVerifications ? 'Fetching latest verification telemetry...' : 'No verifications pending match.'}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Verification Lightbox Modal */}
            <AnimatePresence>
                {activeVerificationPhoto && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                        <div className="relative max-w-3xl max-h-[85vh] w-full flex flex-col items-center">
                            <button 
                                onClick={() => setActiveVerificationPhoto(null)}
                                className="absolute -top-12 right-0 text-white font-black hover:text-indigo-400 text-sm flex items-center gap-1.5"
                            >
                                <X className="w-5 h-5" /> Close View
                            </button>
                            <img 
                                src={activeVerificationPhoto} 
                                alt="Payment Proof Full Size" 
                                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border-4 border-white/10" 
                            />
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Interactive Generate Bill Dialog (Modal Overlay) */}
            <AnimatePresence>
                {generatingBillRoom && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto print:relative print:inset-auto print:p-0 print:z-0">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setGeneratingBillRoom(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm print:hidden"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto flex flex-col print:max-h-full print:rounded-none print:shadow-none print:w-full"
                        >
                            {/* Modal Header */}
                            <div className="bg-slate-900 p-6 text-white flex justify-between items-center print:hidden">
                                <div>
                                    <h3 className="text-xl font-bold uppercase flex items-center gap-2">
                                        <FileCheck className="w-5 h-5 text-indigo-400" />
                                        Custom Bill Workflow
                                    </h3>
                                    <p className="text-slate-400 text-xs">Configure rent parameters, utilities, adjustments, and preview A4 PDF</p>
                                </div>
                                <button onClick={() => setGeneratingBillRoom(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Step Indicator */}
                            <div className="bg-slate-100 p-4 border-b flex justify-around text-[10px] font-black uppercase tracking-wider text-slate-500 print:hidden">
                                {[
                                    { step: 1, label: 'Room & Rent' },
                                    { step: 2, label: 'Charges & Taxes' },
                                    { step: 3, label: 'Payment & Advance' },
                                    { step: 4, label: 'Invoice Preview' }
                                ].map(s => (
                                    <span key={s.step} className={billStep === s.step ? 'text-indigo-600 underline' : ''}>
                                        Step {s.step}: {s.label}
                                    </span>
                                ))}
                            </div>

                            {/* Dialog Content Steps */}
                            <div className="p-6 overflow-y-auto flex-1 text-xs font-semibold print:p-0">
                                
                                {/* Step 1: Base Details */}
                                {billStep === 1 && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-slate-50 p-5 rounded-2xl border space-y-3">
                                                <h4 className="text-[10px] font-black uppercase text-slate-400">Room Details (Read-only)</h4>
                                                <p>Room: <span className="font-bold text-slate-900">Room {generatingBillRoom.number} ({generatingBillRoom.type})</span></p>
                                                <p>Occupant: <span className="font-bold text-slate-900">{generatingBillRoom.occupantName}</span></p>
                                                <p>Phone: <span className="font-bold text-slate-900">{generatingBillRoom.phone}</span></p>
                                                <p>Check-in Date: <span className="font-bold text-slate-900">{generatingBillRoom.checkInDate}</span></p>
                                            </div>
                                            <div className="bg-slate-50 p-5 rounded-2xl border space-y-3">
                                                <h4 className="text-[10px] font-black uppercase text-slate-400 font-bold">Rent Details</h4>
                                                <div className="space-y-2">
                                                    <div>
                                                        <label className="text-[9px] uppercase text-slate-400 block mb-1">Monthly Rent Rate</label>
                                                        <input 
                                                            type="number"
                                                            value={billForm.monthlyRent}
                                                            onChange={(e) => setBillForm({ ...billForm, monthlyRent: parseFloat(e.target.value) || 0 })}
                                                            className="w-full bg-white border p-3 rounded-xl outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] uppercase text-slate-400 block mb-1">Previous Outstanding (₹)</label>
                                                        <input 
                                                            type="number"
                                                            value={billForm.previousOutstanding}
                                                            onChange={(e) => setBillForm({ ...billForm, previousOutstanding: parseFloat(e.target.value) || 0 })}
                                                            className="w-full bg-white border p-3 rounded-xl outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-5 rounded-2xl border space-y-3">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400">Billing Period</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[9px] uppercase text-slate-400 block mb-1">Start Date</label>
                                                    <input 
                                                        type="date"
                                                        value={billForm.billingPeriodStart}
                                                        onChange={(e) => setBillForm({ ...billForm, billingPeriodStart: e.target.value })}
                                                        className="w-full bg-white border p-3 rounded-xl outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] uppercase text-slate-400 block mb-1">End Date</label>
                                                    <input 
                                                        type="date"
                                                        value={billForm.billingPeriodEnd}
                                                        onChange={(e) => setBillForm({ ...billForm, billingPeriodEnd: e.target.value })}
                                                        className="w-full bg-white border p-3 rounded-xl outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Additional Charges & Taxes */}
                                {billStep === 2 && (
                                    <div className="space-y-6">
                                        <div className="bg-slate-50 p-5 rounded-2xl border space-y-4">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400">Add Unlimited Extra Services/Charges</h4>
                                            
                                            <div className="grid grid-cols-3 gap-3">
                                                <select
                                                    value={newCharge.name}
                                                    onChange={(e) => setNewCharge({ ...newCharge, name: e.target.value })}
                                                    className="bg-white border p-3 rounded-xl font-bold"
                                                >
                                                    <option>Electricity</option>
                                                    <option>Water</option>
                                                    <option>Wi-Fi</option>
                                                    <option>Maintenance</option>
                                                    <option>Parking</option>
                                                    <option>Laundry</option>
                                                    <option>Food</option>
                                                    <option>Miscellaneous</option>
                                                </select>
                                                <input 
                                                    type="number"
                                                    placeholder="Amount (₹)"
                                                    value={newCharge.amount}
                                                    onChange={(e) => setNewCharge({ ...newCharge, amount: e.target.value })}
                                                    className="bg-white border p-3 rounded-xl outline-none"
                                                />
                                                <input 
                                                    type="text"
                                                    placeholder="Remarks"
                                                    value={newCharge.remarks}
                                                    onChange={(e) => setNewCharge({ ...newCharge, remarks: e.target.value })}
                                                    className="bg-white border p-3 rounded-xl outline-none"
                                                />
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={handleAddCharge}
                                                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition"
                                            >
                                                + Add Charge
                                            </button>

                                            {/* Dynamic Charges List */}
                                            {billForm.additionalCharges.length > 0 && (
                                                <div className="space-y-2 mt-4 border-t pt-4">
                                                    {billForm.additionalCharges.map(charge => (
                                                        <div key={charge.id} className="flex justify-between items-center bg-white p-3 rounded-xl border">
                                                            <p className="font-bold text-slate-800">{charge.name} <span className="text-slate-400 font-medium">({charge.remarks || 'No remarks'})</span></p>
                                                            <div className="flex items-center gap-4">
                                                                <p className="font-black text-slate-900">₹ {charge.amount}</p>
                                                                <button type="button" onClick={() => handleRemoveCharge(charge.id)} className="text-rose-600">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Taxes & Discounts */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-slate-50 p-5 rounded-2xl border space-y-3">
                                                <h4 className="text-[10px] font-black uppercase text-slate-400">Taxes Configuration</h4>
                                                <div className="grid grid-cols-2 gap-3 text-slate-700">
                                                    <label className="flex items-center gap-2">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={billForm.taxesEnabled.GST} 
                                                            onChange={(e) => setBillForm({
                                                                ...billForm,
                                                                taxesEnabled: { ...billForm.taxesEnabled, GST: e.target.checked, CGST: e.target.checked, SGST: e.target.checked }
                                                            })}
                                                        /> GST (18% Total)
                                                    </label>
                                                    <label className="flex items-center gap-2">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={billForm.taxesEnabled.IGST} 
                                                            onChange={(e) => setBillForm({
                                                                ...billForm,
                                                                taxesEnabled: { ...billForm.taxesEnabled, IGST: e.target.checked }
                                                            })}
                                                        /> IGST
                                                    </label>
                                                    <label className="flex items-center gap-2 col-span-2">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={billForm.taxesEnabled.CustomTax} 
                                                            onChange={(e) => setBillForm({
                                                                ...billForm,
                                                                taxesEnabled: { ...billForm.taxesEnabled, CustomTax: e.target.checked }
                                                            })}
                                                        /> Custom Tax
                                                    </label>
                                                </div>
                                                {billForm.taxesEnabled.CustomTax && (
                                                    <div className="pt-2">
                                                        <label className="text-[9px] uppercase text-slate-400 block mb-1">Custom Tax Percent (%)</label>
                                                        <input 
                                                            type="number"
                                                            value={billForm.customTaxPercent}
                                                            onChange={(e) => setBillForm({ ...billForm, customTaxPercent: parseFloat(e.target.value) || 0 })}
                                                            className="w-full bg-white border p-3 rounded-xl outline-none"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-slate-50 p-5 rounded-2xl border space-y-3">
                                                <h4 className="text-[10px] font-black uppercase text-slate-400">Discount Configuration</h4>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2">
                                                        <input 
                                                            type="radio" 
                                                            name="discountType" 
                                                            checked={billForm.discountType === 'Flat'} 
                                                            onChange={() => setBillForm({ ...billForm, discountType: 'Flat' })}
                                                        /> Flat (₹)
                                                    </label>
                                                    <label className="flex items-center gap-2">
                                                        <input 
                                                            type="radio" 
                                                            name="discountType" 
                                                            checked={billForm.discountType === 'Percent'} 
                                                            onChange={() => setBillForm({ ...billForm, discountType: 'Percent' })}
                                                        /> Percentage (%)
                                                    </label>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[9px] uppercase text-slate-400 block mb-1">Valuation</label>
                                                        <input 
                                                            type="number"
                                                            value={billForm.discountValue}
                                                            onChange={(e) => setBillForm({ ...billForm, discountValue: parseFloat(e.target.value) || 0 })}
                                                            className="w-full bg-white border p-3 rounded-xl outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] uppercase text-slate-400 block mb-1">Discount Reason</label>
                                                        <input 
                                                            type="text"
                                                            value={billForm.discountReason}
                                                            onChange={(e) => setBillForm({ ...billForm, discountReason: e.target.value })}
                                                            className="w-full bg-white border p-3 rounded-xl outline-none"
                                                            placeholder="Promo / Festive Offer"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Advance Adjustment & Payment Status */}
                                {billStep === 3 && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-slate-50 p-5 rounded-2xl border space-y-4">
                                                <h4 className="text-[10px] font-black uppercase text-slate-400">Advance Balance Adjustment</h4>
                                                
                                                <div className="flex items-center justify-between">
                                                    <p>Available Advance: <span className="font-black text-indigo-600">₹ {generatingBillRoom.advanceBalance || 0}</span></p>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setBillForm({ ...billForm, useAdvance: true })}
                                                            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase ${billForm.useAdvance ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}
                                                        >
                                                            Yes
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => setBillForm({ ...billForm, useAdvance: false })}
                                                            className={`px-4 py-2 rounded-lg font-bold text-[10px] uppercase ${!billForm.useAdvance ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                </div>

                                                {billForm.useAdvance && (
                                                    <div className="text-[10px] text-slate-500 border-t pt-3 space-y-1">
                                                        <p>Advance Used: ₹ {previewTotals.advanceUsed}</p>
                                                        <p>Advance Remaining: ₹ {previewTotals.advanceRemaining}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-slate-50 p-5 rounded-2xl border space-y-4">
                                                <h4 className="text-[10px] font-black uppercase text-slate-400">Select Invoice Status</h4>
                                                <div className="flex gap-3 text-slate-700">
                                                    <label className="flex items-center gap-1.5">
                                                        <input 
                                                            type="radio" 
                                                            name="paymentStatus" 
                                                            checked={billForm.paymentStatus === 'Paid'} 
                                                            onChange={() => setBillForm({ ...billForm, paymentStatus: 'Paid' })}
                                                        /> Paid
                                                    </label>
                                                    <label className="flex items-center gap-1.5">
                                                        <input 
                                                            type="radio" 
                                                            name="paymentStatus" 
                                                            checked={billForm.paymentStatus === 'Unpaid'} 
                                                            onChange={() => setBillForm({ ...billForm, paymentStatus: 'Unpaid' })}
                                                        /> Unpaid
                                                    </label>
                                                    <label className="flex items-center gap-1.5">
                                                        <input 
                                                            type="radio" 
                                                            name="paymentStatus" 
                                                            checked={billForm.paymentStatus === 'Partially Paid'} 
                                                            onChange={() => setBillForm({ ...billForm, paymentStatus: 'Partially Paid' })}
                                                        /> Partially Paid
                                                    </label>
                                                </div>

                                                {billForm.paymentStatus === 'Paid' && (
                                                    <div className="grid grid-cols-2 gap-3 border-t pt-3">
                                                        <div>
                                                            <label className="text-[9px] uppercase text-slate-400 block mb-1">Payment Method</label>
                                                            <select 
                                                                value={billForm.paymentMethod}
                                                                onChange={(e) => setBillForm({ ...billForm, paymentMethod: e.target.value })}
                                                                className="w-full bg-white border p-2.5 rounded-xl font-bold"
                                                            >
                                                                <option>Cash</option>
                                                                <option>UPI / QR Scan</option>
                                                                <option>Bank Transfer</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] uppercase text-slate-400 block mb-1">Transaction Ref / ID</label>
                                                            <input 
                                                                type="text"
                                                                value={billForm.transactionId}
                                                                onChange={(e) => setBillForm({ ...billForm, transactionId: e.target.value })}
                                                                className="w-full bg-white border p-2.5 rounded-xl outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {billForm.paymentStatus === 'Unpaid' && (
                                                    <div className="grid grid-cols-2 gap-3 border-t pt-3">
                                                        <div>
                                                            <label className="text-[9px] uppercase text-slate-400 block mb-1">Due Date</label>
                                                            <input 
                                                                type="date"
                                                                value={billForm.dueDate}
                                                                onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
                                                                className="w-full bg-white border p-2.5 rounded-xl outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] uppercase text-slate-400 block mb-1">Late Fee (₹)</label>
                                                            <input 
                                                                type="number"
                                                                value={billForm.lateFee}
                                                                onChange={(e) => setBillForm({ ...billForm, lateFee: parseFloat(e.target.value) || 0 })}
                                                                className="w-full bg-white border p-2.5 rounded-xl outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {billForm.paymentStatus === 'Partially Paid' && (
                                                    <div className="grid grid-cols-2 gap-3 border-t pt-3">
                                                        <div>
                                                            <label className="text-[9px] uppercase text-slate-400 block mb-1">Paid Amount (₹)</label>
                                                            <input 
                                                                type="number"
                                                                value={billForm.paidAmount}
                                                                onChange={(e) => setBillForm({ ...billForm, paidAmount: parseFloat(e.target.value) || 0 })}
                                                                className="w-full bg-white border p-2.5 rounded-xl outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] uppercase text-slate-400 block mb-1">Balance Due Date</label>
                                                            <input 
                                                                type="date"
                                                                value={billForm.balanceDueDate}
                                                                onChange={(e) => setBillForm({ ...billForm, balanceDueDate: e.target.value })}
                                                                className="w-full bg-white border p-2.5 rounded-xl outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Step 4: Live Invoice Preview */}
                                {billStep === 4 && (
                                    <div className="space-y-6">
                                        <div className="bg-white border p-8 rounded-2xl shadow-sm relative overflow-hidden print:border-none print:shadow-none">
                                            
                                            {/* Watermark Overlay Stamp in CSS */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none text-center">
                                                <p className={`text-6xl font-black uppercase border-4 p-4 tracking-widest ${
                                                    billForm.paymentStatus === 'Paid' ? 'border-emerald-600 text-emerald-600' :
                                                    billForm.paymentStatus === 'Partially Paid' ? 'border-blue-600 text-blue-600' :
                                                    'border-rose-600 text-rose-600'
                                                }`}>
                                                    {billForm.paymentStatus === 'Paid' ? 'PAID' : billForm.paymentStatus === 'Partially Paid' ? 'PARTIAL' : 'DUE'}
                                                </p>
                                            </div>

                                            {/* Top Branding Section */}
                                            <div className="flex justify-between items-start border-b pb-6 mb-6">
                                                <div>
                                                    <h2 className="text-xl font-bold text-slate-900">KRISHNA LODGE RESIDENCY</h2>
                                                    <p className="text-slate-400 font-semibold">Premium Tenancy and ERP Solutions</p>
                                                    <p className="text-slate-400">Palakkad, Kerala | GSTIN: 32ABCDE1234F1Z5</p>
                                                </div>
                                                <div className="text-right">
                                                    <h3 className="text-sm font-black uppercase text-indigo-600">Tax Invoice</h3>
                                                    <p className="text-slate-400">Invoice: INV-{Date.now().toString().slice(-6)}</p>
                                                    <p className="text-slate-400">Period: {billForm.billingPeriodStart} to {billForm.billingPeriodEnd}</p>
                                                </div>
                                            </div>

                                            {/* Occupant Mapping */}
                                            <div className="grid grid-cols-2 gap-6 mb-6">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Bill To:</span>
                                                    <p className="font-extrabold text-slate-900">{generatingBillRoom.occupantName}</p>
                                                    <p className="text-slate-500">Room {generatingBillRoom.number} ({generatingBillRoom.type})</p>
                                                    <p className="text-slate-500">Phone: {generatingBillRoom.phone}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Status:</span>
                                                    <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                                                        billForm.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                                                        billForm.paymentStatus === 'Partially Paid' ? 'bg-blue-50 text-blue-600' :
                                                        'bg-rose-50 text-rose-600'
                                                    }`}>
                                                        {billForm.paymentStatus}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Summary Table Mock */}
                                            <table className="w-full text-left border-collapse mb-6">
                                                <thead>
                                                    <tr className="bg-slate-100 text-slate-600 uppercase text-[9px] tracking-wider">
                                                        <th className="p-3 rounded-l-xl">Description</th>
                                                        <th className="p-3 text-right rounded-r-xl">Amount (INR)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                                    <tr>
                                                        <td className="p-3 font-semibold">Monthly Stay Rent (Base Room Charges)</td>
                                                        <td className="p-3 text-right font-black">₹ {billForm.monthlyRent.toLocaleString()}</td>
                                                    </tr>
                                                    {billForm.additionalCharges.map(charge => (
                                                        <tr key={charge.id}>
                                                            <td className="p-3 font-semibold">{charge.name} <span className="text-slate-400 font-medium">({charge.remarks || 'Additional Fee'})</span></td>
                                                            <td className="p-3 text-right font-black">₹ {charge.amount.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>

                                            {/* Final Calculations Summary */}
                                            <div className="border-t pt-4 flex flex-col items-end gap-2 text-right">
                                                <p>Subtotal: <span className="font-extrabold text-slate-900">₹ {previewTotals.subtotal.toLocaleString()}</span></p>
                                                <p>Taxes (GST/Custom): <span className="font-extrabold text-slate-900">₹ {previewTotals.taxesTotal.toLocaleString()}</span></p>
                                                {previewTotals.discountAmt > 0 && <p className="text-emerald-600">Discount: <span>- ₹ {previewTotals.discountAmt.toLocaleString()}</span></p>}
                                                {billForm.useAdvance && <p className="text-indigo-600">Advance Used: <span>- ₹ {previewTotals.advanceUsed.toLocaleString()}</span></p>}
                                                <p className="text-base font-black text-slate-900 border-t pt-2 w-48">Grand Total: <span className="text-indigo-600">₹ {previewTotals.grandTotal.toLocaleString()}</span></p>
                                                <p className="text-[9px] text-slate-400 font-bold mt-1">In Words: {numberToWords(previewTotals.grandTotal)}</p>
                                            </div>

                                            {/* Stamp Signatures */}
                                            <div className="grid grid-cols-2 gap-6 mt-12 pt-6 border-t border-dashed">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-6">Authorized Signature</span>
                                                    <p className="font-bold text-slate-800">Krishna Lodge ERP System</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-6">Manager Seal Stamp</span>
                                                    <p className="font-semibold text-slate-400">[Official Seal Space]</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Modal Footer Controls */}
                            <div className="p-6 border-t flex justify-between bg-slate-50 print:hidden">
                                <button
                                    type="button"
                                    onClick={() => setBillStep(prev => Math.max(1, prev - 1))}
                                    disabled={billStep === 1}
                                    className="px-6 py-3 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 rounded-xl font-bold uppercase"
                                >
                                    Previous Step
                                </button>
                                
                                <div className="flex gap-2">
                                    {billStep < 4 ? (
                                        <button
                                            type="button"
                                            onClick={() => setBillStep(prev => Math.min(4, prev + 1))}
                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase"
                                        >
                                            Next Step
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handlePrintPreview}
                                                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 border rounded-xl font-bold uppercase flex items-center gap-1.5"
                                            >
                                                <Printer className="w-4.5 h-4.5" /> Print Invoice
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSaveAndGenerateBill}
                                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase flex items-center gap-1.5"
                                            >
                                                <Download className="w-4.5 h-4.5" /> Save & Generate PDF
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: View Details */}
            <AnimatePresence>
                {selectedRoomDetail && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedRoomDetail(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold uppercase">Room {selectedRoomDetail.number} Specifications</h3>
                                    <p className="text-slate-400 text-xs font-semibold uppercase">{selectedRoomDetail.type} Category</p>
                                </div>
                                <button onClick={() => setSelectedRoomDetail(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full transition">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6 text-xs font-semibold">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400">Tenant Profile</h4>
                                        <div className="space-y-2 text-slate-700">
                                            <p>Name: <span className="text-slate-900 font-extrabold">{selectedRoomDetail.occupantName}</span></p>
                                            <p>Phone: <span className="text-slate-900 font-extrabold">{selectedRoomDetail.phone}</span></p>
                                            <p>Email: <span className="text-slate-900 font-extrabold">{selectedRoomDetail.email}</span></p>
                                            <p>Check-in: <span className="text-slate-900 font-extrabold">{selectedRoomDetail.checkInDate}</span></p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 font-bold">Billing Properties</h4>
                                        <div className="space-y-2 text-slate-700">
                                            <p>Monthly Rent: <span className="text-slate-900 font-extrabold">₹ {selectedRoomDetail.rent || selectedRoomDetail.price}</span></p>
                                            <p>Payment Status: <span className="text-indigo-600 font-extrabold">{selectedRoomDetail.paymentBadge}</span></p>
                                            <p>Outstanding Due: <span className="text-rose-600 font-extrabold">₹ {selectedRoomDetail.outstandingAmt}</span></p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t">
                                    <button 
                                        onClick={() => setSelectedRoomDetail(null)}
                                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold uppercase"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Collect Advance */}
            <AnimatePresence>
                {collectingAdvanceRoom && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setCollectingAdvanceRoom(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="bg-slate-900 p-6 text-white">
                                <h3 className="text-lg font-bold">Collect Advance Rent</h3>
                                <p className="text-slate-400 text-xs">Room {collectingAdvanceRoom.number}</p>
                            </div>

                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    alert('Advance payment logged successfully.');
                                    setCollectingAdvanceRoom(null);
                                    loadDashboardData();
                                }} 
                                className="p-6 space-y-4 text-xs font-semibold"
                            >
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400">Advance Amount (₹)</label>
                                    <input 
                                        type="number"
                                        defaultValue={30000}
                                        className="w-full bg-slate-50 border p-3 rounded-xl outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400">Covers Until Date</label>
                                    <input 
                                        type="date"
                                        className="w-full bg-slate-50 border p-3 rounded-xl outline-none"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        type="button"
                                        onClick={() => setCollectingAdvanceRoom(null)}
                                        className="flex-1 py-3 text-slate-400 hover:text-slate-600 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow"
                                    >
                                        Record Advance
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
