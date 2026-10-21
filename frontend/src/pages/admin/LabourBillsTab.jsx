import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Printer, Save, Plus, Trash2, Truck, Users, Calendar, Hash, FileText, 
    Palette, CheckCircle, ShieldCheck, DollarSign, MapPin, Package, Clock,
    Copy, RotateCcw, History, Search, X, UserCheck, Compass, Phone, ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { numberToIndianRupees } from '../../utils/numberToIndianRupees';
import { formatCurrencyINR } from '../../utils/pdfHelpers';
import { CurlyBraceTotal } from '../../components/CombinedBillTable';
import { computeItemSectionMeta, synchronizeItemSections } from '../../utils/combinedBillHelper';

const generateBillNumber = (mode) => {
    const prefix = mode === 'transport' ? 'TR' : mode === 'combined' ? 'LT' : 'LB';
    return `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
};

const LabourBillsTab = () => {
    // Mode: 'labour' | 'transport' | 'combined'
    const [billMode, setBillMode] = useState('combined');

    // Number & Dates
    const [billNumber, setBillNumber] = useState(generateBillNumber('combined'));
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);

    // Client & Site Info
    const [clientName, setClientName] = useState('Apex Structural Infra Ltd');
    const [clientAddress, setClientAddress] = useState('Plot 45, Port Trust Area, Kochi');
    const [clientPhone, setClientPhone] = useState('+91 98470 12345');
    const [clientGstin, setClientGstin] = useState('32AAACA5678B1Z2');
    const [siteLocation, setSiteLocation] = useState('Kochi Industrial Port Project Site');
    const [siteSupervisor, setSiteSupervisor] = useState('Ramesh Kumar (Site Engineer)');

    // Logistics & Transit Details (for Transport / Combined Mode)
    const [vehicleNumber, setVehicleNumber] = useState('KL-09-AB-4589');
    const [lrGrNumber, setLrGrNumber] = useState('LR-88902');
    const [origin, setOrigin] = useState('Palakkad Works Yard, Thiruvazhiyode');
    const [destination, setDestination] = useState('Kochi Port Trust Yard, Ernakulam');
    const [goodsDescription, setGoodsDescription] = useState('Heavy Steel Girders & Fabricated PEB Trusses');
    const [driverName, setDriverName] = useState('M. Vijayan');
    const [driverPhone, setDriverPhone] = useState('+91 94471 88990');
    const [loadingDate, setLoadingDate] = useState(new Date().toISOString().split('T')[0]);
    const [unloadingDate, setUnloadingDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);

    // Column Visibility Toggles
    const [showQuantity, setShowQuantity] = useState(true);
    const [showUnitPrice, setShowUnitPrice] = useState(true);

    // Dynamic Labour Row Matrix
    const [labourRows, setLabourRows] = useState([
        { id: 1, workDescription: 'Site Assembly & Fitting Labor (Senior Fabricator Crew)', unit: 'Shifts', labourersCount: 6, workingDays: 5, dailyRate: 950, isCombined: false },
        { id: 2, workDescription: 'High-Elevation Structural Certified Welders (MIG / ARC)', unit: 'Days', labourersCount: 3, workingDays: 4, dailyRate: 1400, isCombined: false },
        { id: 3, workDescription: 'Riggers & Mobile Crane Alignment Helpers', unit: 'Days', labourersCount: 4, workingDays: 3, dailyRate: 750, isCombined: false }
    ]);
    const [combinedTotals, setCombinedTotals] = useState({});

    // Dedicated Ancillary / Freight Charges
    const [baseFreightCharges, setBaseFreightCharges] = useState(14500);
    const [loadingCharges, setLoadingCharges] = useState(2500);
    const [unloadingCharges, setUnloadingCharges] = useState(2500);
    const [handlingCharges, setHandlingCharges] = useState(1500);
    const [packingCharges, setPackingCharges] = useState(1200);
    const [overtimeCharges, setOvertimeCharges] = useState(3000);
    const [detentionCharges, setDetentionCharges] = useState(0);

    // Advance Payment & Discount
    const [advancePaid, setAdvancePaid] = useState(10000);
    const [discountAmount, setDiscountAmount] = useState(0);

    // Tax & Financials
    const [taxPercentage, setTaxPercentage] = useState(18);
    const [taxDetails, setTaxDetails] = useState('CGST 9% + SGST 9%');
    const [isTaxExempt, setIsTaxExempt] = useState(false);

    // Customizable Payment Options & Footer
    const [footerText, setFooterText] = useState('Krishna Engineering Works — Official Operations & Logistics Voucher');
    const [paymentOptions, setPaymentOptions] = useState('Bank Transfer: State Bank of India | A/C: 34567890123 | IFSC: SBIN0001234 | UPI: krishnaengg@sbi');

    // Theme & Styling
    const [theme, setTheme] = useState('Classic'); // Classic, Modern, Minimalist
    const [themeColor, setThemeColor] = useState('#4f46e5');

    // Modals & History
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [savedBills, setSavedBills] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Public Branding Settings
    const [brandingSettings, setBrandingSettings] = useState({});
    const [savingHistory, setSavingHistory] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        fetch('/api/settings/public')
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                const map = {};
                if (Array.isArray(data)) {
                    data.forEach(item => { map[item.key] = item.value; });
                }
                setBrandingSettings(map);
            })
            .catch(err => console.warn('Public settings fetch failed', err));
        checkDuplicatedDoc();
    }, []);

    const checkDuplicatedDoc = () => {
        try {
            const type = localStorage.getItem('duplicated_doc_type');
            const dataStr = localStorage.getItem('duplicated_doc_data');
            if ((type === 'Labour Bill' || type === 'Transport Bill') && dataStr) {
                const parsed = JSON.parse(dataStr);
                applyBillData(parsed, true);
                localStorage.removeItem('duplicated_doc_type');
                localStorage.removeItem('duplicated_doc_data');
                setSaveMessage('✓ Cloned bill loaded into studio.');
                setTimeout(() => setSaveMessage(''), 4000);
            }
        } catch (e) {
            console.warn('Duplication check error:', e);
        }
    };

    const handleModeSwitch = (newMode) => {
        setBillMode(newMode);
        setBillNumber(generateBillNumber(newMode));
    };

    // Labour Row Handlers
    const handleAddLabourRow = () => {
        setLabourRows(prev => [
            ...prev,
            { id: Date.now() + Math.random(), workDescription: '', unit: 'Days', labourersCount: 1, workingDays: 1, dailyRate: 0, price: 0, isCombined: false }
        ]);
    };

    const handleAddNewCombinedSection = () => {
        const secId = `sec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        setCombinedTotals(prev => ({ ...prev, [secId]: 0 }));
        setLabourRows(prev => [
            ...prev,
            { id: Date.now() + Math.random(), workDescription: '', unit: 'Days', labourersCount: 1, workingDays: 1, dailyRate: 0, price: 0, isCombined: true, isCombinedMode: true, combinedSectionId: secId, isNewSectionStart: true }
        ]);
    };

    const handleRemoveLabourRow = (index) => {
        if (labourRows.length <= 1) return;
        setLabourRows(prev => {
            const next = prev.filter((_, i) => i !== index);
            return synchronizeItemSections(next);
        });
    };

    const handleLabourRowChange = (index, field, value) => {
        setLabourRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            if (field === 'dailyRate') next[index].price = value;
            return synchronizeItemSections(next);
        });
    };

    const handleToggleCombine = (index, checked) => {
        setLabourRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], isCombined: checked, isCombinedMode: checked };
            const sync = synchronizeItemSections(next);
            sync.forEach(item => {
                if ((item.isCombined || item.isCombinedMode) && item.combinedSectionId && combinedTotals[item.combinedSectionId] === undefined) {
                    setCombinedTotals(c => ({ ...c, [item.combinedSectionId]: 0 }));
                }
            });
            return sync;
        });
    };

    const handleSplitSection = (index) => {
        setLabourRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], isNewSectionStart: true, combinedSectionId: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}` };
            const sync = synchronizeItemSections(next);
            sync.forEach(item => {
                if ((item.isCombined || item.isCombinedMode) && item.combinedSectionId && combinedTotals[item.combinedSectionId] === undefined) {
                    setCombinedTotals(c => ({ ...c, [item.combinedSectionId]: 0 }));
                }
            });
            return sync;
        });
    };

    const handleMergeSection = (index) => {
        setLabourRows(prev => {
            const next = [...prev];
            next[index] = { ...next[index], isNewSectionStart: false };
            return synchronizeItemSections(next);
        });
    };

    const handleCombinedTotalChange = (sectionId, value) => {
        setCombinedTotals(prev => ({
            ...prev,
            [sectionId]: parseFloat(value) || 0
        }));
    };

    // Financial Computations
    const labourMeta = computeItemSectionMeta(
        labourRows.map(r => ({
            ...r,
            price: r.dailyRate,
            total: (parseFloat(r.labourersCount || 0) * parseFloat(r.workingDays || 0) * parseFloat(r.dailyRate || 0))
        })),
        combinedTotals
    );

    const labourTotal = (billMode === 'transport') ? 0 : labourMeta.reduce((sum, r) => {
        if (r.isCombined) {
            return r.isSectionStart ? sum + Number(r.combinedAmount || 0) : sum;
        }
        const lineTotal = (parseFloat(r.labourersCount || 0) * parseFloat(r.workingDays || 0) * parseFloat(r.dailyRate || 0));
        return sum + lineTotal;
    }, 0);

    const logisticsTotal = (billMode === 'labour') ? 0 : (
        parseFloat(baseFreightCharges || 0) +
        parseFloat(detentionCharges || 0)
    );

    const extraChargesTotal = 
        parseFloat(loadingCharges || 0) +
        parseFloat(unloadingCharges || 0) +
        parseFloat(handlingCharges || 0) +
        parseFloat(packingCharges || 0) +
        parseFloat(overtimeCharges || 0);

    const grossSubtotal = labourTotal + logisticsTotal + extraChargesTotal;
    const numDiscount = parseFloat(discountAmount || 0);
    const taxableSubtotal = Math.max(0, grossSubtotal - numDiscount);
    const effectiveTaxRate = isTaxExempt ? 0 : parseFloat(taxPercentage || 0);
    const taxAmount = (taxableSubtotal * effectiveTaxRate) / 100;
    const grandTotal = taxableSubtotal + taxAmount;
    const numAdvance = parseFloat(advancePaid || 0);
    const balancePending = Math.max(0, grandTotal - numAdvance);

    const grandTotalInWords = numberToIndianRupees(grandTotal);
    const balanceInWords = numberToIndianRupees(balancePending);

    const handleDuplicateBill = () => {
        setBillNumber(generateBillNumber(billMode));
        setBillDate(new Date().toISOString().split('T')[0]);
        setSaveMessage('✓ Duplicated with a new bill registration number.');
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const handleResetBill = () => {
        if (!window.confirm('Reset this bill and start fresh?')) return;
        setBillNumber(generateBillNumber(billMode));
        setBillDate(new Date().toISOString().split('T')[0]);
        setClientName('');
        setClientAddress('');
        setClientPhone('');
        setSiteLocation('');
        setSiteSupervisor('');
        setLabourRows([{ id: Date.now(), workDescription: '', unit: 'Days', labourersCount: 1, workingDays: 1, dailyRate: 0 }]);
        setBaseFreightCharges(0);
        setLoadingCharges(0);
        setUnloadingCharges(0);
        setHandlingCharges(0);
        setPackingCharges(0);
        setOvertimeCharges(0);
        setDetentionCharges(0);
        setAdvancePaid(0);
        setDiscountAmount(0);
        setSaveMessage('✓ Bill studio reset.');
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const handleOpenHistoryModal = async () => {
        setShowHistoryModal(true);
        setLoadingHistory(true);
        try {
            const cat = billMode === 'transport' ? 'Transport Bills' : 'Labour Bills';
            const res = await api.get('/document-history', { params: { category: cat, limit: 20 } });
            setSavedBills(res.data.documents || []);
        } catch (e) {
            console.error('Failed to load bill history:', e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const applyBillData = (data, isClone = false) => {
        if (!data) return;
        if (!isClone) {
            setBillNumber(data.billNumber || generateBillNumber(billMode));
            setBillDate(data.billDate || new Date().toISOString().split('T')[0]);
        } else {
            setBillNumber(generateBillNumber(data.billMode || billMode));
            setBillDate(new Date().toISOString().split('T')[0]);
        }
        if (data.billMode) setBillMode(data.billMode);
        setClientName(data.clientName || '');
        setClientAddress(data.clientAddress || '');
        setClientPhone(data.clientPhone || '');
        setClientGstin(data.clientGstin || '');
        setSiteLocation(data.siteLocation || '');
        setSiteSupervisor(data.siteSupervisor || '');
        setVehicleNumber(data.vehicleNumber || '');
        setLrGrNumber(data.lrGrNumber || '');
        setOrigin(data.origin || '');
        setDestination(data.destination || '');
        setGoodsDescription(data.goodsDescription || '');
        setDriverName(data.driverName || '');
        setDriverPhone(data.driverPhone || '');
        setLoadingDate(data.loadingDate || new Date().toISOString().split('T')[0]);
        setUnloadingDate(data.unloadingDate || new Date().toISOString().split('T')[0]);
        if (Array.isArray(data.labourRows) && data.labourRows.length > 0) setLabourRows(data.labourRows);
        if (data.combinedTotals) setCombinedTotals(data.combinedTotals);
        if (data.showQuantity !== undefined) setShowQuantity(data.showQuantity);
        if (data.showUnitPrice !== undefined) setShowUnitPrice(data.showUnitPrice);
        if (data.baseFreightCharges !== undefined) setBaseFreightCharges(data.baseFreightCharges);
        if (data.loadingCharges !== undefined) setLoadingCharges(data.loadingCharges);
        if (data.unloadingCharges !== undefined) setUnloadingCharges(data.unloadingCharges);
        if (data.handlingCharges !== undefined) setHandlingCharges(data.handlingCharges);
        if (data.packingCharges !== undefined) setPackingCharges(data.packingCharges);
        if (data.overtimeCharges !== undefined) setOvertimeCharges(data.overtimeCharges);
        if (data.detentionCharges !== undefined) setDetentionCharges(data.detentionCharges);
        if (data.advancePaid !== undefined) setAdvancePaid(data.advancePaid);
        if (data.discountAmount !== undefined) setDiscountAmount(data.discountAmount);
        if (data.taxPercentage !== undefined) setTaxPercentage(data.taxPercentage);
        if (data.isTaxExempt !== undefined) setIsTaxExempt(data.isTaxExempt);
        if (data.theme) setTheme(data.theme);
        if (data.themeColor) setThemeColor(data.themeColor);
        setShowHistoryModal(false);
    };

    const handleSaveToHistory = async (autoSilent = false) => {
        if (!billNumber) {
            if (!autoSilent) alert("Bill number is required.");
            return;
        }
        setSavingHistory(true);
        try {
            const documentType = billMode === 'transport' ? 'Transport Bill' : 'Labour Bill';
            const payload = {
                documentType,
                documentNumber: billNumber,
                totalAmount: grandTotal,
                status: balancePending === 0 ? 'Paid' : numAdvance > 0 ? 'Partially Paid' : 'Pending',
                data: {
                    billMode,
                    vehicleNumber, lrGrNumber, origin, destination, goodsDescription,
                    driverName, driverPhone, loadingDate, unloadingDate, 
                    billNumber, billDate, clientName, clientAddress, clientPhone, clientGstin,
                    siteLocation, siteSupervisor, labourRows, combinedTotals, showQuantity, showUnitPrice,
                    baseFreightCharges, loadingCharges, unloadingCharges, handlingCharges, packingCharges,
                    overtimeCharges, detentionCharges, advancePaid: numAdvance, discountAmount: numDiscount,
                    balancePending, taxPercentage, effectiveTaxRate, isTaxExempt, taxDetails, footerText,
                    paymentOptions, theme, themeColor, grossSubtotal, taxableSubtotal, taxAmount, grandTotal,
                    grandTotalInWords, balanceInWords
                }
            };
            const res = await api.post('/document-history/save', payload);
            if (!autoSilent) {
                setSaveMessage(`✅ ${documentType} #${billNumber} saved to Document History (Version ${res.data.document?.version || 1}).`);
                setTimeout(() => setSaveMessage(''), 4000);
            }
        } catch (err) {
            console.error('Failed to save bill history:', err);
            if (!autoSilent) {
                alert(err.response?.data?.message || 'Failed to save bill to Document History.');
            }
        } finally {
            setSavingHistory(false);
        }
    };

    const handlePrint = () => {
        handleSaveToHistory(true);
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8 font-sans">
            {/* Header Toolbar */}
            <div className="no-print bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-2">
                        <Truck className="w-4 h-4" /> Workforce & Transport Operations
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                        Labour & Transport Billing Engine
                    </h1>
                    {saveMessage && (
                        <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 inline-block">
                            {saveMessage}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Duplicate */}
                    <button
                        onClick={handleDuplicateBill}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                        title="Duplicate as new bill"
                    >
                        <Copy className="w-4 h-4" /> Duplicate
                    </button>

                    {/* Reset */}
                    <button
                        onClick={handleResetBill}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 px-3 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                    >
                        <RotateCcw className="w-4 h-4" /> New
                    </button>

                    {/* Load History */}
                    <button
                        onClick={handleOpenHistoryModal}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                    >
                        <History className="w-4 h-4" /> Load Saved
                    </button>

                    {/* Save Button */}
                    <button
                        onClick={() => handleSaveToHistory(false)}
                        disabled={savingHistory}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
                    >
                        <Save className="w-4 h-4" /> {savingHistory ? 'Saving...' : 'Save'}
                    </button>

                    {/* Print Button */}
                    <button
                        onClick={handlePrint}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
                    >
                        <Printer className="w-4 h-4" /> Print / Export
                    </button>
                </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="no-print bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md mb-8 flex flex-wrap gap-2 w-fit">
                <button
                    onClick={() => handleModeSwitch('labour')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition ${
                        billMode === 'labour' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Users className="w-4 h-4" /> 1. Labour & Contractor Bill
                </button>
                <button
                    onClick={() => handleModeSwitch('transport')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition ${
                        billMode === 'transport' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Truck className="w-4 h-4" /> 2. Transport & Logistics (LR Bill)
                </button>
                <button
                    onClick={() => handleModeSwitch('combined')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition ${
                        billMode === 'combined' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                    <Package className="w-4 h-4" /> 3. Combined Labour + Freight Bill
                </button>
            </div>

            {/* Studio Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Controls & Input Forms */}
                <div className="no-print lg:col-span-5 space-y-6">
                    {/* Bill Header Meta */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-indigo-500" /> Bill Identifier & Client
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Bill Registration No</label>
                                <input
                                    type="text"
                                    value={billNumber}
                                    onChange={(e) => setBillNumber(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Bill Date</label>
                                <input
                                    type="date"
                                    value={billDate}
                                    onChange={(e) => setBillDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Client / Contractor Name</label>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Client or Contracting Organization"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Client Address</label>
                            <input
                                type="text"
                                value={clientAddress}
                                onChange={(e) => setClientAddress(e.target.value)}
                                placeholder="Site or Office Address"
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Client Phone</label>
                                <input
                                    type="text"
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Client GSTIN</label>
                                <input
                                    type="text"
                                    value={clientGstin}
                                    onChange={(e) => setClientGstin(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Supervisor & Site Tracking */}
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Job / Site Location</label>
                                <input
                                    type="text"
                                    value={siteLocation}
                                    onChange={(e) => setSiteLocation(e.target.value)}
                                    placeholder="e.g. Kochi Industrial Park"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Site Supervisor Name</label>
                                <input
                                    type="text"
                                    value={siteSupervisor}
                                    onChange={(e) => setSiteSupervisor(e.target.value)}
                                    placeholder="Supervisor Name"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Logistics & Transit Tracking (shown in Transport or Combined mode) */}
                    {(billMode === 'transport' || billMode === 'combined') && (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-indigo-500" /> Logistics & Vehicle Transit Details
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Vehicle / Lorry Number</label>
                                    <input
                                        type="text"
                                        value={vehicleNumber}
                                        onChange={(e) => setVehicleNumber(e.target.value)}
                                        placeholder="KL-09-AB-1234"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">LR / GR Number</label>
                                    <input
                                        type="text"
                                        value={lrGrNumber}
                                        onChange={(e) => setLrGrNumber(e.target.value)}
                                        placeholder="LR-XXXXX"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Origin City / Yard</label>
                                    <input
                                        type="text"
                                        value={origin}
                                        onChange={(e) => setOrigin(e.target.value)}
                                        placeholder="Origin"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Destination Location</label>
                                    <input
                                        type="text"
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        placeholder="Destination"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Driver Name</label>
                                    <input
                                        type="text"
                                        value={driverName}
                                        onChange={(e) => setDriverName(e.target.value)}
                                        placeholder="Driver Full Name"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Driver Contact Phone</label>
                                    <input
                                        type="text"
                                        value={driverPhone}
                                        onChange={(e) => setDriverPhone(e.target.value)}
                                        placeholder="Phone"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Loading Date</label>
                                    <input
                                        type="date"
                                        value={loadingDate}
                                        onChange={(e) => setLoadingDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Unloading / Delivery Date</label>
                                    <input
                                        type="date"
                                        value={unloadingDate}
                                        onChange={(e) => setUnloadingDate(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Consignment / Goods Description</label>
                                <textarea
                                    rows="2"
                                    value={goodsDescription}
                                    onChange={(e) => setGoodsDescription(e.target.value)}
                                    placeholder="Description of cargo, weights, dimensions"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Base Freight Charge (₹)</label>
                                    <input
                                        type="number"
                                        value={baseFreightCharges}
                                        onChange={(e) => setBaseFreightCharges(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Detention Charges (₹)</label>
                                    <input
                                        type="number"
                                        value={detentionCharges}
                                        onChange={(e) => setDetentionCharges(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Workforce & Dynamic Labour Charges (shown in Labour or Combined mode) */}
                    {(billMode === 'labour' || billMode === 'combined') && (
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
                                <div>
                                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-500" /> Dynamic Labour Charge Matrix ({labourRows.length})
                                    </h2>
                                    <div className="flex items-center gap-4 mt-2">
                                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showQuantity}
                                                onChange={(e) => setShowQuantity(e.target.checked)}
                                                className="rounded border-slate-300 text-indigo-600 w-3.5 h-3.5"
                                            />
                                            Headcount & Duration
                                        </label>
                                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={showUnitPrice}
                                                onChange={(e) => setShowUnitPrice(e.target.checked)}
                                                className="rounded border-slate-300 text-indigo-600 w-3.5 h-3.5"
                                            />
                                            Daily Rate
                                        </label>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleAddLabourRow}
                                        className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Task
                                    </button>
                                    <button
                                        onClick={handleAddNewCombinedSection}
                                        className="bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 hover:bg-amber-100 px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition border border-amber-200 dark:border-amber-800"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Combined Section
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {labourMeta.map((row, idx) => (
                                    <div key={row.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Crew Row #{idx + 1}</span>
                                                {row.isCombined && (
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-200">
                                                        Combined Row
                                                    </span>
                                                )}
                                            </div>
                                            {labourRows.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveLabourRow(idx)}
                                                    className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Description of Work</label>
                                            <input
                                                type="text"
                                                value={row.workDescription}
                                                onChange={(e) => handleLabourRowChange(idx, 'workDescription', e.target.value)}
                                                placeholder="e.g. Masons, Certified Structural Welders, Erection Riggers"
                                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Unit</label>
                                                <select
                                                    value={row.unit || 'Days'}
                                                    onChange={(e) => handleLabourRowChange(idx, 'unit', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-1.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                                >
                                                    <option value="Days">Days</option>
                                                    <option value="Shifts">Shifts</option>
                                                    <option value="Hours">Hours</option>
                                                    <option value="Units">Units</option>
                                                    <option value="Trips">Trips</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Labour Count</label>
                                                <input
                                                    type="number"
                                                    value={row.labourersCount}
                                                    onChange={(e) => handleLabourRowChange(idx, 'labourersCount', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Duration</label>
                                                <input
                                                    type="number"
                                                    value={row.workingDays}
                                                    onChange={(e) => handleLabourRowChange(idx, 'workingDays', e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Rate / Person (₹)</label>
                                                <input
                                                    type="number"
                                                    value={row.dailyRate}
                                                    onChange={(e) => handleLabourRowChange(idx, 'dailyRate', e.target.value)}
                                                    disabled={row.isCombined}
                                                    className={`w-full border rounded-xl px-2 py-1.5 text-xs font-bold focus:outline-none ${
                                                        row.isCombined
                                                            ? 'bg-slate-100 dark:bg-slate-800 border-dashed text-slate-400'
                                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                                                    }`}
                                                />
                                            </div>
                                        </div>

                                        {/* Combined Section Controls */}
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-amber-50/40 dark:bg-amber-950/20 p-2.5 rounded-xl">
                                            <label className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(row.isCombined)}
                                                    onChange={(e) => handleToggleCombine(idx, e.target.checked)}
                                                    className="w-4 h-4 rounded text-amber-600"
                                                />
                                                Combine with other items
                                            </label>

                                            {row.isCombined && row.isSectionStart && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200">
                                                        Spans {row.sectionRowCount} item{row.sectionRowCount > 1 ? 's' : ''}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">₹</span>
                                                        <input
                                                            type="number"
                                                            value={combinedTotals[row.sectionId] ?? ''}
                                                            onChange={(e) => handleCombinedTotalChange(row.sectionId, e.target.value)}
                                                            placeholder="Combined Total"
                                                            className="w-28 bg-white dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-600 rounded-lg px-2 py-1 text-xs font-black text-emerald-700 dark:text-emerald-300 text-right focus:outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {row.isCombined && row.isSectionFollower && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                        ↳ Bundled into section total above
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSplitSection(idx)}
                                                        className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-lg"
                                                    >
                                                        Split Section
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dedicated Charge Categorization */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-indigo-500" /> Handling & Ancillary Operations Charges
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Loading Crew Charges (₹)</label>
                                <input
                                    type="number"
                                    value={loadingCharges}
                                    onChange={(e) => setLoadingCharges(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Unloading Crew Charges (₹)</label>
                                <input
                                    type="number"
                                    value={unloadingCharges}
                                    onChange={(e) => setUnloadingCharges(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-1">
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Handling / Rigging (₹)</label>
                                <input
                                    type="number"
                                    value={handlingCharges}
                                    onChange={(e) => setHandlingCharges(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Packing / Strapping (₹)</label>
                                <input
                                    type="number"
                                    value={packingCharges}
                                    onChange={(e) => setPackingCharges(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Overtime Charges (₹)</label>
                                <input
                                    type="number"
                                    value={overtimeCharges}
                                    onChange={(e) => setOvertimeCharges(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Advance, Discounts & Tax Compliance */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-indigo-500" /> Advance Deductions & Tax Compliance
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Advance Received (₹)</label>
                                <input
                                    type="number"
                                    value={advancePaid}
                                    onChange={(e) => setAdvancePaid(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Discount Deduction (₹)</label>
                                <input
                                    type="number"
                                    value={discountAmount}
                                    onChange={(e) => setDiscountAmount(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isTaxExempt}
                                    onChange={(e) => setIsTaxExempt(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Tax Exempt / Nil Rate
                            </label>
                            {!isTaxExempt && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400">GST %:</span>
                                    <select
                                        value={taxPercentage}
                                        onChange={(e) => setTaxPercentage(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
                                    >
                                        <option value="5">5% (Goods Transport Agency)</option>
                                        <option value="12">12%</option>
                                        <option value="18">18% (Standard Service)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Theme & Styling */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-indigo-500" /> Themes & Branding
                        </h2>
                        <div className="grid grid-cols-3 gap-2">
                            {['Classic', 'Modern', 'Minimalist'].map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTheme(t)}
                                    className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition ${
                                        theme === t ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Theme Color:</label>
                            <input
                                type="color"
                                value={themeColor}
                                onChange={(e) => setThemeColor(e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5"
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT: Live Printable Document Preview */}
                <div className="lg:col-span-7">
                    <div className="sticky top-6">
                        <div className="no-print flex items-center justify-between bg-slate-900 text-white px-6 py-3 rounded-t-3xl border-b border-slate-800">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Live Print Document: {billMode === 'transport' ? 'Transport / LR Bill' : billMode === 'labour' ? 'Labour & Contractor Bill' : 'Combined Labour & Freight'}
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{theme}</span>
                        </div>

                        <div 
                            className="print-document-container bg-white dark:bg-slate-900 p-8 md:p-12 shadow-2xl rounded-b-3xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-sans"
                            style={{ '--theme-color': themeColor }}
                        >
                            {/* Header */}
                            {theme === 'Modern' ? (
                                <div 
                                    className="p-6 md:p-8 rounded-2xl mb-8 text-white relative overflow-hidden"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            {brandingSettings.company_logo && (
                                                <img src={brandingSettings.company_logo} alt="Company Logo" className="h-12 w-auto object-contain bg-white p-1 rounded-xl shadow-md" />
                                            )}
                                            <div>
                                                <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider company-name">KRISHNA ENGINEERING WORKS</h1>
                                                <p className="text-xs opacity-90 font-medium">Workforce Assembly, Erection & Transport Logistics Division</p>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <span className="bg-white/20 backdrop-blur px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest inline-block mb-1">
                                                {billMode === 'transport' ? 'TRANSPORT BILL / LR' : billMode === 'labour' ? 'LABOUR BILL' : 'LABOUR & FREIGHT VOUCHER'}
                                            </span>
                                            <p className="text-sm font-black">{billNumber}</p>
                                            <p className="text-xs opacity-80">Date: {billDate}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Classic / Minimalist Header */
                                <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        {brandingSettings.company_logo && (
                                            <img src={brandingSettings.company_logo} alt="Company Logo" className="h-12 w-auto object-contain bg-white dark:bg-slate-900 rounded-xl shadow p-1" />
                                        )}
                                        <div>
                                            <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white company-name">{brandingSettings?.company_name || 'KRISHNA ENGINEERING WORKS'}</h1>
                                            <p className="text-xs text-slate-500">Site Assembly Crew, Structural Welders & Heavy Logistics</p>
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                Yard: Industrial Area Thiruvazhiyode, Palakkad | Ph: +91 9447940835
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <span 
                                            className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-white inline-block mb-2 shadow-sm"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            {billMode === 'transport' ? 'GOODS FREIGHT RECEIPT' : billMode === 'labour' ? 'LABOUR CHARGES BILL' : 'LABOUR & TRANSPORT INVOICE'}
                                        </span>
                                        <p className="text-xs font-black text-slate-900 dark:text-white">{billNumber}</p>
                                        <p className="text-xs text-slate-500">Date: {billDate}</p>
                                    </div>
                                </div>
                            )}

                            {/* Client & Site Meta Grid */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">CLIENT / CONTRACTOR:</span>
                                    <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase">{clientName}</h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{clientAddress}</p>
                                    {clientPhone && <p className="text-xs text-slate-600 dark:text-slate-400">Ph: {clientPhone}</p>}
                                    {clientGstin && <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">GSTIN: {clientGstin}</p>}
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">SITE OPERATIONS:</span>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white">Location: {siteLocation || 'Project Site'}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Supervisor: {siteSupervisor || 'Works Incharge'}</p>
                                </div>
                            </div>

                            {/* Logistics Metadata Box (if applicable) */}
                            {(billMode === 'transport' || billMode === 'combined') && (
                                <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 mb-8">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                                        <Truck className="w-3.5 h-3.5" /> Logistics & Vehicle Transit Record (Lorry Receipt)
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Vehicle No</span>
                                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{vehicleNumber}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block">LR / GR No</span>
                                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{lrGrNumber}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Loading Date</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{loadingDate}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Unloading Date</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">{unloadingDate}</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/60">
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Route Transit</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{origin} <ArrowRight className="inline w-3 h-3 text-indigo-500" /> {destination}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Driver Details</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{driverName} ({driverPhone})</span>
                                        </div>
                                    </div>
                                    {goodsDescription && (
                                        <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Consignment Description</span>
                                            {goodsDescription}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Labour Table */}
                            {(billMode === 'labour' || billMode === 'combined') && (
                                <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-[10px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: themeColor }}>
                                                <th className="p-3 w-12 text-left">#</th>
                                                <th className="p-3 text-left">Workforce Crew & Description</th>
                                                <th className="p-3 text-center">Unit</th>
                                                {showQuantity && <th className="p-3 text-center">Headcount</th>}
                                                {showQuantity && <th className="p-3 text-center">Duration</th>}
                                                {showUnitPrice && <th className="p-3 text-right">Daily Rate</th>}
                                                <th className="p-3 text-right">Total (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs font-medium text-slate-800 dark:text-slate-200 divide-y divide-slate-100 dark:divide-slate-800">
                                            {labourMeta.map((r, i) => {
                                                const lineTotal = (parseFloat(r.labourersCount || 0) * parseFloat(r.workingDays || 0) * parseFloat(r.dailyRate || 0));
                                                return (
                                                    <tr key={r.id || i} className={i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/50' : 'bg-white dark:bg-slate-900'}>
                                                        <td className="p-3 font-bold text-slate-400">{i + 1}</td>
                                                        <td className="p-3 font-bold text-slate-900 dark:text-white">{r.workDescription || 'Labour Crew'}</td>
                                                        <td className="p-3 text-center text-slate-500">{r.unit}</td>
                                                        {showQuantity && <td className="p-3 text-center font-bold">{r.labourersCount}</td>}
                                                        {showQuantity && <td className="p-3 text-center font-bold">{r.workingDays}</td>}
                                                        {showUnitPrice && (
                                                            <td className="p-3 text-right font-medium">
                                                                {r.isCombined ? '—' : formatCurrencyINR(r.dailyRate || 0)}
                                                            </td>
                                                        )}
                                                        {r.isCombined ? (
                                                            r.isSectionStart ? (
                                                                <td 
                                                                    rowSpan={r.sectionRowCount}
                                                                    className="p-2 text-right"
                                                                    style={{ verticalAlign: 'middle', background: 'transparent' }}
                                                                >
                                                                    <CurlyBraceTotal 
                                                                        amount={r.combinedAmount} 
                                                                        rowCount={r.sectionRowCount} 
                                                                        textColor={themeColor} 
                                                                    />
                                                                </td>
                                                            ) : null
                                                        ) : (
                                                            <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                                                                {formatCurrencyINR(lineTotal)}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Ancillary & Logistics Charge Breakdown Table */}
                            <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                            <th className="p-2.5">Charge Category / Operations Scope</th>
                                            <th className="p-2.5 text-right">Amount (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-medium text-slate-700 dark:text-slate-300 divide-y divide-slate-100 dark:divide-slate-800">
                                        {(billMode === 'transport' || billMode === 'combined') && baseFreightCharges > 0 && (
                                            <tr>
                                                <td className="p-2.5">Base Freight Transit Charge ({origin} to {destination})</td>
                                                <td className="p-2.5 text-right font-bold">{formatCurrencyINR(baseFreightCharges)}</td>
                                            </tr>
                                        )}
                                        {loadingCharges > 0 && (
                                            <tr>
                                                <td className="p-2.5">Loading & Yard Rigging Charges</td>
                                                <td className="p-2.5 text-right font-bold">{formatCurrencyINR(loadingCharges)}</td>
                                            </tr>
                                        )}
                                        {unloadingCharges > 0 && (
                                            <tr>
                                                <td className="p-2.5">Site Unloading & Placement Charges</td>
                                                <td className="p-2.5 text-right font-bold">{formatCurrencyINR(unloadingCharges)}</td>
                                            </tr>
                                        )}
                                        {handlingCharges > 0 && (
                                            <tr>
                                                <td className="p-2.5">Handling, Alignment & Crane Rigging Services</td>
                                                <td className="p-2.5 text-right font-bold">{formatCurrencyINR(handlingCharges)}</td>
                                            </tr>
                                        )}
                                        {packingCharges > 0 && (
                                            <tr>
                                                <td className="p-2.5">Heavy Packing & Webbing Strapping Charges</td>
                                                <td className="p-2.5 text-right font-bold">{formatCurrencyINR(packingCharges)}</td>
                                            </tr>
                                        )}
                                        {overtimeCharges > 0 && (
                                            <tr>
                                                <td className="p-2.5">Site Overtime / Extended Shift Charges</td>
                                                <td className="p-2.5 text-right font-bold">{formatCurrencyINR(overtimeCharges)}</td>
                                            </tr>
                                        )}
                                        {detentionCharges > 0 && (
                                            <tr>
                                                <td className="p-2.5">Vehicle Detention / Halting Charges</td>
                                                <td className="p-2.5 text-right font-bold">{formatCurrencyINR(detentionCharges)}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Financial Summary & Balance Pending */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
                                <div className="flex-1 space-y-2 text-xs">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">REMARKS & PAYMENT INSTRUCTIONS:</span>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                                        {paymentOptions}
                                    </p>
                                    <div className="text-[10px] text-slate-500 italic pt-1">
                                        Total in Words: {grandTotalInWords}
                                    </div>
                                </div>

                                <div className="w-full sm:w-72 space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                        <span className="font-bold text-slate-500">Gross Total:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrencyINR(grossSubtotal)}</span>
                                    </div>

                                    {numDiscount > 0 && (
                                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-rose-600 font-bold">
                                            <span>Discount Deduction:</span>
                                            <span>-{formatCurrencyINR(numDiscount)}</span>
                                        </div>
                                    )}

                                    {!isTaxExempt && taxAmount > 0 && (
                                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600">
                                            <span>Tax / GST ({taxPercentage}%):</span>
                                            <span className="font-bold">{formatCurrencyINR(taxAmount)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between py-2 text-base font-black text-slate-900 dark:text-white border-t-2 border-slate-900 dark:border-slate-100 pt-2">
                                        <span>Grand Bill Total:</span>
                                        <span style={{ color: themeColor }}>{formatCurrencyINR(grandTotal)}</span>
                                    </div>

                                    {numAdvance > 0 && (
                                        <div className="flex justify-between py-1 text-emerald-600 font-bold border-b border-slate-100 dark:border-slate-800">
                                            <span>Advance Received:</span>
                                            <span>-{formatCurrencyINR(numAdvance)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between py-1.5 text-sm font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl">
                                        <span>Balance Pending:</span>
                                        <span>{formatCurrencyINR(balancePending)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div className="text-left border-t border-slate-300 dark:border-slate-600 pt-3">
                                    <p className="text-xs font-black uppercase text-slate-900 dark:text-white">Supervisor / Driver Handover</p>
                                    <p className="text-[10px] text-slate-400">Name: {siteSupervisor || driverName}</p>
                                </div>
                                <div className="text-right border-t border-slate-300 dark:border-slate-600 pt-3">
                                    <p className="text-xs font-black uppercase text-slate-900 dark:text-white">Authorized Signatory / Verification</p>
                                    <p className="text-[10px] text-slate-400">Krishna Engineering Works</p>
                                </div>
                            </div>

                            {footerText && (
                                <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                    {footerText}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Load History Modal */}
            <AnimatePresence>
                {showHistoryModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col"
                        >
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <div>
                                    <h3 className="text-base font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                                        <History className="w-4 h-4 text-indigo-500" /> Saved Labour & Transport Bills
                                    </h3>
                                    <p className="text-xs text-slate-500">Pick any previously saved bill to load or duplicate.</p>
                                </div>
                                <button
                                    onClick={() => setShowHistoryModal(false)}
                                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {loadingHistory ? (
                                    <div className="p-8 text-center text-xs font-bold text-slate-400">Loading saved bills...</div>
                                ) : savedBills.length === 0 ? (
                                    <div className="p-8 text-center text-xs font-bold text-slate-400">No saved bills found in history.</div>
                                ) : (
                                    savedBills.map(doc => (
                                        <div
                                            key={doc._id}
                                            className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 rounded-2xl flex items-center justify-between gap-4"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{doc.documentNumber}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {new Date(doc.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[9px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold uppercase">
                                                        {doc.documentType}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                                                    {doc.data?.clientName || 'Unnamed Client'}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    Total: {formatCurrencyINR(doc.totalAmount || 0)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => applyBillData(doc.data, false)}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition"
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    onClick={() => applyBillData(doc.data, true)}
                                                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-200 transition"
                                                    title="Clone as new"
                                                >
                                                    Clone
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LabourBillsTab;
