import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Printer, Save, Plus, Trash2, Truck, Users, Calendar, Hash, FileText, 
    Palette, CheckCircle, ShieldCheck, DollarSign, MapPin, Package, Clock
} from 'lucide-react';
import api from '../../services/api';
import { numberToIndianRupees } from '../../utils/numberToIndianRupees';
import { formatCurrencyINR } from '../../utils/pdfHelpers';

const LabourBillsTab = () => {
    // Logistics & Transit Tracking
    const [vehicleNumber, setVehicleNumber] = useState('KL-09-AB-4589');
    const [lrGrNumber, setLrGrNumber] = useState('LR-88902');
    const [origin, setOrigin] = useState('Palakkad Works Yard');
    const [destination, setDestination] = useState('Kochi Industrial Project Site');
    const [goodsDescription, setGoodsDescription] = useState('Heavy Steel Girders & Fabrication Trusses');
    const [loadingDate, setLoadingDate] = useState(new Date().toISOString().split('T')[0]);
    const [unloadingDate, setUnloadingDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);

    // Bill Number & Metadata
    const [billNumber, setBillNumber] = useState(`LB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [clientName, setClientName] = useState('Apex Structural Infra Ltd');
    const [clientAddress, setClientAddress] = useState('Plot 45, Port Trust Area, Kochi');

    // Dynamic Labour Charge Matrix
    const [labourRows, setLabourRows] = useState([
        { id: 1, workDescription: 'Site Assembly & Fitting Labor', labourersCount: 6, workingDays: 5, dailyRate: 950 },
        { id: 2, workDescription: 'High-Elevation Structural Welders', labourersCount: 3, workingDays: 4, dailyRate: 1400 }
    ]);

    // Extra Charges Input Fields
    const [loadingCharges, setLoadingCharges] = useState(2500);
    const [unloadingCharges, setUnloadingCharges] = useState(2500);
    const [handlingCharges, setHandlingCharges] = useState(1500);
    const [packingCharges, setPackingCharges] = useState(1200);
    const [overtimeCharges, setOvertimeCharges] = useState(3000);
    const [additionalFreightCharges, setAdditionalFreightCharges] = useState(4500);

    // Tax & Financials
    const [taxPercentage, setTaxPercentage] = useState(18);
    const [taxDetails, setTaxDetails] = useState('CGST 9% + SGST 9%');

    // Customizable Payment Options & Footer
    const [footerText, setFooterText] = useState('Powered by Krishna ERP');
    const [paymentOptions, setPaymentOptions] = useState('Bank Transfer: State Bank of India | A/C: 34567890123 | IFSC: SBIN0001234 | UPI: krishnaengg@sbi');

    // Theme & Styling
    const [theme, setTheme] = useState('Classic'); // Classic, Modern, Minimalist
    const [themeColor, setThemeColor] = useState('#4f46e5');

    // Public Branding Settings
    const [brandingSettings, setBrandingSettings] = useState({});
    React.useEffect(() => {
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
    }, []);

    // Dynamic Labour Row Handlers
    const handleAddLabourRow = () => {
        setLabourRows(prev => [
            ...prev,
            { id: Date.now(), workDescription: '', labourersCount: 1, workingDays: 1, dailyRate: 0 }
        ]);
    };

    const handleRemoveLabourRow = (id) => {
        if (labourRows.length <= 1) return;
        setLabourRows(prev => prev.filter(r => r.id !== id));
    };

    const handleLabourRowChange = (id, field, value) => {
        setLabourRows(prev => prev.map(r => {
            if (r.id === id) {
                return { ...r, [field]: value };
            }
            return r;
        }));
    };

    // Calculations
    const labourTotal = labourRows.reduce((sum, r) => {
        const lineTotal = (parseFloat(r.labourersCount || 0) * parseFloat(r.workingDays || 0) * parseFloat(r.dailyRate || 0));
        return sum + lineTotal;
    }, 0);

    const extraChargesTotal = 
        parseFloat(loadingCharges || 0) +
        parseFloat(unloadingCharges || 0) +
        parseFloat(handlingCharges || 0) +
        parseFloat(packingCharges || 0) +
        parseFloat(overtimeCharges || 0) +
        parseFloat(additionalFreightCharges || 0);

    const subtotal = labourTotal + extraChargesTotal;
    const taxAmount = subtotal * (parseFloat(taxPercentage || 0) / 100);
    const grandTotal = subtotal + taxAmount;
    const grandTotalInWords = numberToIndianRupees(grandTotal);

    // Smart Field Visibility check
    const hasLogisticsData = Boolean(
        vehicleNumber?.trim() || 
        lrGrNumber?.trim() || 
        origin?.trim() || 
        destination?.trim() ||
        goodsDescription?.trim()
    );

    const [savingHistory, setSavingHistory] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const handleSaveToHistory = async (autoSilent = false) => {
        if (!billNumber) {
            if (!autoSilent) alert("Bill number is required.");
            return;
        }
        setSavingHistory(true);
        try {
            const payload = {
                documentType: 'Labour Bill',
                documentNumber: billNumber,
                totalAmount: grandTotal,
                status: 'Saved',
                data: {
                    vehicleNumber, lrGrNumber, origin, destination, goodsDescription,
                    loadingDate, unloadingDate, billNumber, billDate, clientName, clientAddress,
                    labourRows, loadingCharges, unloadingCharges, handlingCharges, packingCharges,
                    overtimeCharges, additionalFreightCharges, taxPercentage, taxDetails, footerText,
                    paymentOptions, theme, themeColor, grandTotal
                }
            };
            const res = await api.post('/document-history/save', payload);
            if (!autoSilent) {
                setSaveMessage(`✅ Labour Bill #${billNumber} saved to Document History successfully (Version ${res.data.document?.version || 1}).`);
                setTimeout(() => setSaveMessage(''), 4000);
            }
        } catch (err) {
            console.error('Failed to save labour bill history:', err);
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
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
            {/* Toolbar */}
            <div className="no-print bg-white p-6 rounded-3xl border border-slate-200 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1 flex items-center gap-2">
                        <Truck className="w-4 h-4" /> Operations & Freight Suite
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">Labour & Goods Transport Bills</h1>
                    {saveMessage && (
                        <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
                            {saveMessage}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={() => handleSaveToHistory(false)}
                        disabled={savingHistory}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {savingHistory ? 'Saving...' : 'Save to History'}
                    </button>
                    <button
                        onClick={handlePrint}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition"
                    >
                        <Printer className="w-4 h-4" /> Print / Export Bill
                    </button>
                </div>
            </div>

            {/* Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Controls & Input Forms */}
                <div className="no-print lg:col-span-5 space-y-6">
                    {/* Bill Header Meta */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-indigo-500" /> Bill Identifier & Client
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Bill Number</label>
                                <input
                                    type="text"
                                    value={billNumber}
                                    onChange={(e) => setBillNumber(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Bill Date</label>
                                <input
                                    type="date"
                                    value={billDate}
                                    onChange={(e) => setBillDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Client / Contractor Name</label>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Client Firm"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Client Address</label>
                            <input
                                type="text"
                                value={clientAddress}
                                onChange={(e) => setClientAddress(e.target.value)}
                                placeholder="Site or Billing Address"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Logistics & Transit Tracking */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-indigo-500" /> Logistics & Transit Tracking
                            </h2>
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Smart Auto-Hide if Empty</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Vehicle Number</label>
                                <input
                                    type="text"
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value)}
                                    placeholder="KL-00-XX-0000"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">LR / GR Number</label>
                                <input
                                    type="text"
                                    value={lrGrNumber}
                                    onChange={(e) => setLrGrNumber(e.target.value)}
                                    placeholder="LR-12345"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Origin</label>
                                <input
                                    type="text"
                                    value={origin}
                                    onChange={(e) => setOrigin(e.target.value)}
                                    placeholder="Source Yard"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Destination</label>
                                <input
                                    type="text"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    placeholder="Site Destination"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Goods Description</label>
                            <input
                                type="text"
                                value={goodsDescription}
                                onChange={(e) => setGoodsDescription(e.target.value)}
                                placeholder="Description of transported material"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Loading Date</label>
                                <input
                                    type="date"
                                    value={loadingDate}
                                    onChange={(e) => setLoadingDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Unloading Date</label>
                                <input
                                    type="date"
                                    value={unloadingDate}
                                    onChange={(e) => setUnloadingDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Labour Charge Matrix */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-500" /> Dynamic Labour Charge Matrix
                            </h2>
                            <button
                                onClick={handleAddLabourRow}
                                className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Labour Row
                            </button>
                        </div>

                        <div className="space-y-4">
                            {labourRows.map((row, idx) => {
                                const lineTotal = (parseFloat(row.labourersCount || 0) * parseFloat(row.workingDays || 0) * parseFloat(row.dailyRate || 0));
                                return (
                                    <div key={row.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase text-indigo-600">Labour Matrix Row #{idx + 1}</span>
                                            {labourRows.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveLabourRow(row.id)}
                                                    className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Work Description</label>
                                            <input
                                                type="text"
                                                value={row.workDescription}
                                                onChange={(e) => handleLabourRowChange(row.id, 'workDescription', e.target.value)}
                                                placeholder="e.g. Fabrication Assembly Labor"
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Labourers</label>
                                                <input
                                                    type="number"
                                                    value={row.labourersCount}
                                                    onChange={(e) => handleLabourRowChange(row.id, 'labourersCount', e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Working Days</label>
                                                <input
                                                    type="number"
                                                    value={row.workingDays}
                                                    onChange={(e) => handleLabourRowChange(row.id, 'workingDays', e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Daily Rate (₹)</label>
                                                <input
                                                    type="number"
                                                    value={row.dailyRate}
                                                    onChange={(e) => handleLabourRowChange(row.id, 'dailyRate', e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="text-right text-[11px] font-black text-slate-700 pt-1">
                                            Line Total: ₹ {lineTotal.toLocaleString('en-IN')}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Extra Charges Input Fields */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-indigo-500" /> Extra Charges Breakdown
                        </h2>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Loading Charges (₹)</label>
                                <input
                                    type="number"
                                    value={loadingCharges}
                                    onChange={(e) => setLoadingCharges(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Unloading Charges (₹)</label>
                                <input
                                    type="number"
                                    value={unloadingCharges}
                                    onChange={(e) => setUnloadingCharges(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Handling Charges (₹)</label>
                                <input
                                    type="number"
                                    value={handlingCharges}
                                    onChange={(e) => setHandlingCharges(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Packing Charges (₹)</label>
                                <input
                                    type="number"
                                    value={packingCharges}
                                    onChange={(e) => setPackingCharges(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Overtime Charges (₹)</label>
                                <input
                                    type="number"
                                    value={overtimeCharges}
                                    onChange={(e) => setOvertimeCharges(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Additional Freight (₹)</label>
                                <input
                                    type="number"
                                    value={additionalFreightCharges}
                                    onChange={(e) => setAdditionalFreightCharges(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tax & Footer Customization */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-indigo-500" /> Taxes, Payment Options & Footer
                        </h2>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Tax Percentage (%)</label>
                                <input
                                    type="number"
                                    value={taxPercentage}
                                    onChange={(e) => setTaxPercentage(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Tax Details Label</label>
                                <input
                                    type="text"
                                    value={taxDetails}
                                    onChange={(e) => setTaxDetails(e.target.value)}
                                    placeholder="CGST 9% + SGST 9%"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Customizable Payment Options</label>
                            <input
                                type="text"
                                value={paymentOptions}
                                onChange={(e) => setPaymentOptions(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Customizable Footer Text</label>
                            <input
                                type="text"
                                value={footerText}
                                onChange={(e) => setFooterText(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                            />
                        </div>

                        {/* Theme Picker */}
                        <div className="pt-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-2">Theme Style</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Classic', 'Modern', 'Minimalist'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setTheme(t)}
                                        className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition ${
                                            theme === t ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Theme Color:</label>
                            <input
                                type="color"
                                value={themeColor}
                                onChange={(e) => setThemeColor(e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT: Real-time Live Document Preview */}
                <div className="lg:col-span-7">
                    <div className="sticky top-6">
                        {/* Live Badge */}
                        <div className="no-print flex items-center justify-between bg-slate-900 text-white px-6 py-3 rounded-t-3xl border-b border-slate-800">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Live Labour & Goods Transport Bill Preview
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Instant Rendering</span>
                        </div>

                        {/* Bill Document */}
                        <div 
                            className="print-document-container bg-white p-8 md:p-12 shadow-2xl rounded-b-3xl border border-slate-200 text-slate-800 font-sans"
                            style={{ '--theme-color': themeColor }}
                        >
                            {/* Header */}
                            {theme === 'Modern' ? (
                                <div 
                                    className="p-6 md:p-8 rounded-2xl mb-8 text-white relative overflow-hidden"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                        <div>
                                            <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider company-name">KRISHNA ENGINEERING WORKS</h1>
                                            <p className="text-xs opacity-90 font-medium">Labour Billing & Goods Transport Logistical Voucher</p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <span className="bg-white/20 backdrop-blur px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest inline-block mb-1">
                                                TRANSPORT & LABOUR BILL
                                            </span>
                                            <p className="text-sm font-black">{billNumber}</p>
                                            <p className="text-xs opacity-80">Date: {billDate}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : theme === 'Minimalist' ? (
                                <div className="border-b-2 border-slate-900 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
                                    <div>
                                        <h1 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 company-name">KRISHNA ENGINEERING WORKS</h1>
                                        <p className="text-xs text-slate-500 font-medium">Logistics & Heavy Fabrication Work Force Division</p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: themeColor }}>LABOUR & TRANSPORT BILL</h2>
                                        <p className="text-xs font-bold text-slate-700">{billNumber}</p>
                                        <p className="text-xs text-slate-500">Date: {billDate}</p>
                                    </div>
                                </div>
                            ) : (
                                /* Classic Theme */
                                <div className="border-b border-slate-200 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                    <div>
                                        <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900 company-name">{brandingSettings?.company_name || 'KRISHNA ENGINEERING WORKS'}</h1>
                                        <p className="text-xs text-slate-500">Combined Labour Billing & Transport Logistics Module</p>
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5 whitespace-pre-wrap break-all">
                                            Phone: {brandingSettings?.company_phone || brandingSettings?.footer_phone || '+91 9447940835'} | Email: {brandingSettings?.company_email || brandingSettings?.footer_email || 'contact@krishnaengg.com'}
                                        </p>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <span 
                                            className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-white inline-block mb-2 shadow-sm cost-badge"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            LABOUR & FREIGHT BILL
                                        </span>
                                        <p className="text-xs font-black text-slate-900">{billNumber}</p>
                                        <p className="text-xs text-slate-500">Date: {billDate}</p>
                                    </div>
                                </div>
                            )}

                            {/* Client & Contractor Info */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6 flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">BILL ISSUED TO:</span>
                                    <h3 className="font-black text-slate-900 text-sm uppercase">{clientName || 'Valued Client'}</h3>
                                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{clientAddress}</p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">BILL NUMBER:</span>
                                    <span className="text-sm font-black text-slate-900">{billNumber}</span>
                                </div>
                            </div>

                            {/* Smart Field Visibility: Logistics & Transit Block */}
                            {hasLogisticsData && (
                                <div className="mb-8 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                                    <div className="flex items-center gap-2 text-indigo-600 border-b border-indigo-100 pb-2">
                                        <Truck className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase tracking-wider">Logistics & Transit Details</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                                        {vehicleNumber && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-slate-400 block">Vehicle Number</span>
                                                <span className="font-bold text-slate-800">{vehicleNumber}</span>
                                            </div>
                                        )}
                                        {lrGrNumber && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-slate-400 block">LR / GR Number</span>
                                                <span className="font-bold text-slate-800">{lrGrNumber}</span>
                                            </div>
                                        )}
                                        {goodsDescription && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-slate-400 block">Goods Description</span>
                                                <span className="font-bold text-slate-800">{goodsDescription}</span>
                                            </div>
                                        )}
                                        {origin && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-slate-400 block">Origin</span>
                                                <span className="font-bold text-slate-800">{origin}</span>
                                            </div>
                                        )}
                                        {destination && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-slate-400 block">Destination</span>
                                                <span className="font-bold text-slate-800">{destination}</span>
                                            </div>
                                        )}
                                        {(loadingDate || unloadingDate) && (
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-slate-400 block">Transit Dates</span>
                                                <span className="font-bold text-slate-800">{loadingDate} to {unloadingDate}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Dynamic Labour Charge Matrix Table */}
                            <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200">
                                <div className="p-3 bg-slate-900 text-white text-xs font-black uppercase tracking-wider flex justify-between items-center">
                                    <span>Dynamic Labour Charge Matrix</span>
                                    <span>Subtotal: ₹ {labourTotal.toLocaleString('en-IN')}</span>
                                </div>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border-b border-slate-200">
                                            <th className="p-3">#</th>
                                            <th className="p-3">Work Description</th>
                                            <th className="p-3 text-center">Labourers</th>
                                            <th className="p-3 text-center">Working Days</th>
                                            <th className="p-3 text-right">Daily Rate</th>
                                            <th className="p-3 text-right">Line Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-medium text-slate-800 divide-y divide-slate-100">
                                        {labourRows.map((row, index) => {
                                            const lineTotal = (parseFloat(row.labourersCount || 0) * parseFloat(row.workingDays || 0) * parseFloat(row.dailyRate || 0));
                                            return (
                                                <tr key={row.id} className={index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                                                    <td className="p-3 font-bold text-slate-400">{index + 1}</td>
                                                    <td className="p-3 font-bold text-slate-900">{row.workDescription || 'Labour Work'}</td>
                                                    <td className="p-3 text-center font-bold">{row.labourersCount}</td>
                                                    <td className="p-3 text-center text-slate-600">{row.workingDays}</td>
                                                    <td className="p-3 text-right font-bold" style={{ letterSpacing: 'normal' }}>{formatCurrencyINR(row.dailyRate || 0)}</td>
                                                    <td className="p-3 text-right font-black text-slate-900" style={{ letterSpacing: 'normal' }}>
                                                        {formatCurrencyINR(lineTotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Extra Charges Table */}
                            {extraChargesTotal > 0 && (
                                <div className="mb-8 overflow-hidden rounded-xl border border-slate-200" style={{ letterSpacing: 'normal' }}>
                                    <div className="p-3 bg-slate-800 text-white text-xs font-black uppercase tracking-wider flex justify-between items-center">
                                        <span>Extra Logistics & Handling Charges</span>
                                        <span>Total: {formatCurrencyINR(extraChargesTotal)}</span>
                                    </div>
                                    <div className="p-4 bg-slate-50 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                        {loadingCharges > 0 && (
                                            <div className="flex justify-between border-b border-slate-200/60 pb-1">
                                                <span className="text-slate-500 font-medium">Loading:</span>
                                                <span className="font-bold text-slate-900">{formatCurrencyINR(loadingCharges)}</span>
                                            </div>
                                        )}
                                        {unloadingCharges > 0 && (
                                            <div className="flex justify-between border-b border-slate-200/60 pb-1">
                                                <span className="text-slate-500 font-medium">Unloading:</span>
                                                <span className="font-bold text-slate-900">{formatCurrencyINR(unloadingCharges)}</span>
                                            </div>
                                        )}
                                        {handlingCharges > 0 && (
                                            <div className="flex justify-between border-b border-slate-200/60 pb-1">
                                                <span className="text-slate-500 font-medium">Handling:</span>
                                                <span className="font-bold text-slate-900">{formatCurrencyINR(handlingCharges)}</span>
                                            </div>
                                        )}
                                        {packingCharges > 0 && (
                                            <div className="flex justify-between border-b border-slate-200/60 pb-1">
                                                <span className="text-slate-500 font-medium">Packing:</span>
                                                <span className="font-bold text-slate-900">{formatCurrencyINR(packingCharges)}</span>
                                            </div>
                                        )}
                                        {overtimeCharges > 0 && (
                                            <div className="flex justify-between border-b border-slate-200/60 pb-1">
                                                <span className="text-slate-500 font-medium">Overtime:</span>
                                                <span className="font-bold text-slate-900">{formatCurrencyINR(overtimeCharges)}</span>
                                            </div>
                                        )}
                                        {additionalFreightCharges > 0 && (
                                            <div className="flex justify-between border-b border-slate-200/60 pb-1">
                                                <span className="text-slate-500 font-medium">Addl. Freight:</span>
                                                <span className="font-bold text-slate-900">{formatCurrencyINR(additionalFreightCharges)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Summary & Rupee Words */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 border-b border-slate-200 pb-6">
                                <div className="flex-1 space-y-4">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">GRAND TOTAL IN RUPEE WORDS:</span>
                                        <p className="text-xs font-bold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                                            "{grandTotalInWords}"
                                        </p>
                                    </div>

                                    {paymentOptions && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">PAYMENT OPTIONS & BANK DETAILS:</span>
                                            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono font-medium">
                                                {paymentOptions}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full sm:w-64 space-y-2 text-xs" style={{ letterSpacing: 'normal' }}>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="font-bold text-slate-500">Labour Matrix Total:</span>
                                        <span className="font-bold text-slate-900">{formatCurrencyINR(labourTotal)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="font-bold text-slate-500">Extra Charges Total:</span>
                                        <span className="font-bold text-slate-900">{formatCurrencyINR(extraChargesTotal)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="font-bold text-slate-500">Subtotal:</span>
                                        <span className="font-bold text-slate-900">{formatCurrencyINR(subtotal)}</span>
                                    </div>
                                    {showTax && (
                                        <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                                            <span>Estimated Tax ({taxPercentage}%):</span>
                                            <span>{formatCurrencyINR(taxAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between py-2 text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2">
                                        <span>Grand Total:</span>
                                        <span style={{ color: themeColor, letterSpacing: 'normal' }}>{formatCurrencyINR(grandTotal)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Banner & Signature */}
                            <div className="flex justify-between items-end pt-4">
                                <div>
                                    {footerText && (
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            {footerText}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right border-t border-slate-300 pt-3 w-48">
                                    <p className="text-xs font-black uppercase text-slate-900">Transport & Labour Supervisor</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Krishna Engineering Works</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LabourBillsTab;
