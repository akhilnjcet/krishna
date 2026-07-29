import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Printer, Save, Plus, Trash2, User, Building, Phone, Calendar, Hash, 
    FileText, CheckCircle2, Clock, AlertTriangle, Eye, Palette, Check, Sparkles, RefreshCw
} from 'lucide-react';
import api from '../../services/api';
import { numberToIndianRupees } from '../../utils/numberToIndianRupees';
import { formatCurrencyINR } from '../../utils/pdfHelpers';

const PRECONFIGURED_CATALOG = [
    { id: 'cat-1', name: 'Steel Structural I-Beam 150x75', price: 4500, unit: 'Kg', description: 'Heavy duty ISMB 150 structural steel beam', taxRate: 18 },
    { id: 'cat-2', name: 'Industrial Roofing Sheet 0.5mm', price: 1200, unit: 'Metres', description: 'Galvanized trapezoidal color coated roofing sheet', taxRate: 18 },
    { id: 'cat-3', name: 'Structural Welding & Fabrication Work', price: 15000, unit: 'Units', description: 'On-site MIG/ARC precision structural welding labor', taxRate: 18 },
    { id: 'cat-4', name: 'Galvanized Steel Pipe 2-inch', price: 850, unit: 'Metres', description: 'Class B GI pipe for heavy structural trussing', taxRate: 18 },
    { id: 'cat-5', name: 'High-Tensile Anchor Bolt Kit', price: 350, unit: 'Units', description: 'M16 foundation anchor bolt with double nuts', taxRate: 18 }
];

const Invoices = () => {
    const [customers, setCustomers] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    // Form State
    const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    
    // Customer Selector & Autofill
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [billingAddress, setBillingAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [gstin, setGstin] = useState('');

    // Itemized Billing Table
    const [items, setItems] = useState([
        { id: 1, description: 'Steel Structural I-Beam 150x75', price: 4500, quantity: 2, unit: 'Kg', taxRate: 18 }
    ]);

    // Status Tracking
    const [status, setStatus] = useState('Unpaid'); // Paid, Unpaid, Overdue

    // Tax Configuration
    const [taxType, setTaxType] = useState('GST_SPLIT'); // 'GST_SPLIT' (CGST+SGST) or 'IGST'

    // Print Configuration Toggles
    const [showTerms, setShowTerms] = useState(true);
    const [showTax, setShowTax] = useState(true);
    const [showSignature, setShowSignature] = useState(true);
    const [showFooter, setShowFooter] = useState(true);

    // Theme & Branding Customization
    const [theme, setTheme] = useState('Classic'); // Classic, Modern, Minimalist
    const [themeColor, setThemeColor] = useState('#4f46e5');
    const [showLogo, setShowLogo] = useState(true);
    const [termsText, setTermsText] = useState('1. Payment is due within 15 days of invoice date.\n2. Goods once sold will not be taken back.\n3. Interest @ 18% p.a. will be charged on overdue payments.');
    const [brandingSettings, setBrandingSettings] = useState({ company_logo: '', company_signature: '' });

    useEffect(() => {
        fetchCustomers();
        fetchBranding();
    }, []);

    const fetchBranding = async () => {
        try {
            const res = await api.get('/settings/public');
            if (Array.isArray(res.data)) {
                const map = {};
                res.data.forEach(item => {
                    map[item.key] = item.value;
                });
                setBrandingSettings(map);
                if (map.show_logo !== undefined) setShowLogo(map.show_logo !== false && map.show_logo !== 'false');
                if (map.show_signature !== undefined) setShowSignature(map.show_signature !== false && map.show_signature !== 'false');
            }
        } catch (err) {
            console.warn("Branding fetch error:", err);
        }
    };

    const fetchCustomers = async () => {
        setLoadingCustomers(true);
        try {
            const res = await api.get('/auth/admin/users');
            if (Array.isArray(res.data)) {
                setCustomers(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch customers for billing", err);
        } finally {
            setLoadingCustomers(false);
        }
    };

    const handleSelectCustomer = (e) => {
        const id = e.target.value;
        setSelectedCustomerId(id);
        if (!id) return;
        const cust = customers.find(c => c._id === id);
        if (cust) {
            setCustomerName(cust.name || '');
            setBillingAddress(cust.address || cust.billingAddress || 'Industrial Park, Sector 4, Kerala');
            setPhone(cust.phone || cust.phoneNumber || '');
            setGstin(cust.gstin || cust.taxId || '32AAAAA0000A1Z5');
        }
    };

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            { id: Date.now(), description: '', price: 0, quantity: 1, unit: 'Units', taxRate: 18 }
        ]);
    };

    const handleRemoveItem = (id) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleCatalogSelect = (itemId, catalogId) => {
        const catItem = PRECONFIGURED_CATALOG.find(c => c.id === catalogId);
        if (!catItem) return;
        setItems(prev => prev.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    description: catItem.name,
                    price: catItem.price,
                    unit: catItem.unit,
                    taxRate: catItem.taxRate
                };
            }
            return item;
        }));
    };

    // Financial Calculations
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseFloat(item.quantity || 0)), 0);
    
    // Average or item tax calculation
    const totalTax = items.reduce((sum, item) => {
        const lineVal = (parseFloat(item.price || 0) * parseFloat(item.quantity || 0));
        const rate = parseFloat(item.taxRate || 18);
        return sum + (lineVal * (rate / 100));
    }, 0);

    const cgstAmount = taxType === 'GST_SPLIT' ? totalTax / 2 : 0;
    const sgstAmount = taxType === 'GST_SPLIT' ? totalTax / 2 : 0;
    const igstAmount = taxType === 'IGST' ? totalTax : 0;

    const grandTotal = subtotal + (showTax ? totalTax : 0);
    const amountInWords = numberToIndianRupees(grandTotal);

    const [savingHistory, setSavingHistory] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const handleSaveToHistory = async (autoSilent = false) => {
        if (!invoiceNumber) {
            if (!autoSilent) alert("Invoice number is required.");
            return;
        }
        setSavingHistory(true);
        try {
            const fullInvoiceData = {
                invoiceNumber,
                invoiceDate,
                dueDate,
                selectedCustomerId,
                customerName,
                billingAddress,
                phone,
                gstin,
                items,
                status,
                taxType,
                showTerms,
                showTax,
                showSignature,
                showFooter,
                theme,
                themeColor,
                showLogo,
                termsText,
                subtotal,
                totalTax,
                grandTotal,
                amountInWords,
                brandingSettings
            };

            const payload = {
                documentType: 'Invoice',
                documentNumber: invoiceNumber,
                customerId: selectedCustomerId || undefined,
                status: status || 'Unpaid',
                totalAmount: grandTotal,
                data: fullInvoiceData
            };

            const res = await api.post('/document-history/save', payload);
            if (!autoSilent) {
                setSaveMessage(`✅ Invoice #${invoiceNumber} saved to Document History successfully (Version ${res.data.document?.version || 1}).`);
                setTimeout(() => setSaveMessage(''), 4000);
            }
        } catch (err) {
            console.error("Save to history error:", err);
            if (!autoSilent) {
                alert(err.response?.data?.message || "Failed to save invoice to Document History.");
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
            {/* Header Toolbar */}
            <div className="no-print bg-white p-6 rounded-3xl border border-slate-200 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Admin Financial Suite
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">Interactive Invoice Studio</h1>
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
                        <Printer className="w-4 h-4" /> Print / Save PDF
                    </button>
                </div>
            </div>

            {/* Studio Layout: Split Form & Live Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Controls & Form (no-print) */}
                <div className="no-print lg:col-span-5 space-y-6">
                    {/* Invoice Meta Controls */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-indigo-500" /> Invoice Identifier & Status
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Invoice Number</label>
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Payment Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="Paid">Paid</option>
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Overdue">Overdue</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Invoice Date</label>
                                <input
                                    type="date"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Customer Selection & Autofill */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-500" /> Client Selector & Autofill
                        </h2>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Select Registered Customer</label>
                            <select
                                value={selectedCustomerId}
                                onChange={handleSelectCustomer}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">-- Choose Customer --</option>
                                {customers.map(c => (
                                    <option key={c._id} value={c._id}>{c.name} ({c.email || c.phone || 'Customer'})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Customer / Company Name</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Customer or Firm Name"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Billing Address</label>
                                <textarea
                                    rows="2"
                                    value={billingAddress}
                                    onChange={(e) => setBillingAddress(e.target.value)}
                                    placeholder="Full billing address..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+91 9876543210"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">GSTIN</label>
                                    <input
                                        type="text"
                                        value={gstin}
                                        onChange={(e) => setGstin(e.target.value)}
                                        placeholder="32AAAAA0000A1Z5"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Itemized Billing Table Form */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Building className="w-4 h-4 text-indigo-500" /> Itemized Billing Table
                            </h2>
                            <button
                                onClick={handleAddItem}
                                className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Row
                            </button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, idx) => (
                                <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 relative group">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Item #{idx + 1}</span>
                                        {items.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition"
                                                title="Delete Line Item"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Quick Catalog Pull-through</label>
                                        <select
                                            onChange={(e) => handleCatalogSelect(item.id, e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 mb-2 focus:outline-none"
                                        >
                                            <option value="">-- Pick from Catalog --</option>
                                            {PRECONFIGURED_CATALOG.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name} (₹{cat.price} / {cat.unit})</option>
                                            ))}
                                        </select>

                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                            placeholder="Product Name / Custom Description"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Price (₹)</label>
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Qty</label>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Unit</label>
                                            <input
                                                type="text"
                                                value={item.unit}
                                                onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                                                placeholder="Kg, Metres"
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Tax %</label>
                                            <input
                                                type="number"
                                                value={item.taxRate}
                                                onChange={(e) => handleItemChange(item.id, 'taxRate', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Print Configuration Toggles & Styling */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-indigo-500" /> Interactive Print Toggles & Theme
                        </h2>

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

                        <div className="flex items-center gap-3 pt-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Theme Color Accent:</label>
                            <input
                                type="color"
                                value={themeColor}
                                onChange={(e) => setThemeColor(e.target.value)}
                                className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showTerms}
                                    onChange={(e) => setShowTerms(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                showTerms
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showTax}
                                    onChange={(e) => setShowTax(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                showTax
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showSignature}
                                    onChange={(e) => setShowSignature(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                showSignature
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showFooter}
                                    onChange={(e) => setShowFooter(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                showFooter
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer col-span-2">
                                <input
                                    type="checkbox"
                                    checked={showLogo}
                                    onChange={(e) => setShowLogo(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Display Company Logo
                            </label>
                        </div>

                        <div className="pt-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Tax Calculation Breakdown</label>
                            <select
                                value={taxType}
                                onChange={(e) => setTaxType(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                            >
                                <option value="GST_SPLIT">CGST (9%) + SGST (9%) [Intrastate]</option>
                                <option value="IGST">IGST (18%) [Interstate]</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Live & Dynamic Preview (Real-Time Rendering) */}
                <div className="lg:col-span-7">
                    <div className="sticky top-6">
                        {/* Live Badge */}
                        <div className="no-print flex items-center justify-between bg-slate-900 text-white px-6 py-3 rounded-t-3xl border-b border-slate-800">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Live Real-Time Rendering Preview
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Zero Lag Synchronized</span>
                        </div>

                        {/* Document Container */}
                        <div 
                            className={`print-document-container bg-white p-8 md:p-12 shadow-2xl rounded-b-3xl border border-slate-200 text-slate-800 font-sans transition-all`}
                            style={{ '--theme-color': themeColor }}
                        >
                            {/* Header Section based on Theme */}
                            {theme === 'Modern' ? (
                                <div 
                                    className="p-6 md:p-8 rounded-2xl mb-8 text-white relative overflow-hidden"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 relative z-10">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            {showLogo && (
                                                brandingSettings.company_logo ? (
                                                    <img src={brandingSettings.company_logo} alt="Company Logo" className="h-12 w-auto object-contain bg-white/90 p-1 rounded-xl mb-3 shadow-md" />
                                                ) : (
                                                    <div className="w-12 h-12 bg-white text-slate-900 rounded-xl font-black text-2xl flex items-center justify-center mb-3 shadow-md">
                                                        K
                                                    </div>
                                                )
                                            )}
                                            <div>
                                                <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider company-name">KRISHNA ENGINEERING WORKS</h1>
                                                <p className="text-xs opacity-90 font-medium">Heavy Structural & Industrial Fabrication</p>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <span className="inline-block bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-2">
                                                TAX INVOICE
                                            </span>
                                            <p className="text-sm font-black">{invoiceNumber}</p>
                                            <p className="text-xs opacity-80">Date: {invoiceDate}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : theme === 'Minimalist' ? (
                                <div className="border-b-2 border-slate-900 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {showLogo && (
                                            brandingSettings.company_logo ? (
                                                <img src={brandingSettings.company_logo} alt="Company Logo" className="h-10 w-auto object-contain mb-2" />
                                            ) : (
                                                <p className="text-indigo-600 font-black text-3xl mb-1" style={{ color: themeColor }}>K</p>
                                            )
                                        )}
                                        <div>
                                            <h1 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 company-name">KRISHNA ENGINEERING WORKS</h1>
                                            <p className="text-xs text-slate-500 font-medium">Industrial Area Phase 1, Sector 123 | GSTIN: 32ABCDE1234F1Z5</p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: themeColor }}>INVOICE</h2>
                                        <p className="text-xs font-bold text-slate-700">{invoiceNumber}</p>
                                        <p className="text-xs text-slate-500">Date: {invoiceDate}</p>
                                    </div>
                                </div>
                            ) : (
                                /* Classic Theme */
                                <div className="border-b border-slate-200 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        {showLogo && (
                                            brandingSettings.company_logo ? (
                                                <img src={brandingSettings.company_logo} alt="Company Logo" className="h-14 w-auto object-contain rounded-2xl shadow p-1 bg-white" />
                                            ) : (
                                                <div 
                                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow"
                                                    style={{ backgroundColor: themeColor }}
                                                >
                                                    K
                                                </div>
                                            )
                                        )}
                                        <div>
                                            <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900 company-name">{brandingSettings?.company_name || 'KRISHNA ENGINEERING WORKS'}</h1>
                                            <p className="text-xs text-slate-500">Heavy Structural Engineering & Roofing Solutions</p>
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5 whitespace-pre-wrap break-all">
                                                Phone: {brandingSettings?.company_phone || brandingSettings?.footer_phone || '+91 9447940835'} | Email: {brandingSettings?.company_email || brandingSettings?.footer_email || 'contact@krishnaengg.com'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <span 
                                            className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-white inline-block mb-2 shadow-sm cost-badge"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            TAX INVOICE
                                        </span>
                                        <p className="text-xs font-black text-slate-900">{invoiceNumber}</p>
                                        <p className="text-xs text-slate-500">Date: {invoiceDate}</p>
                                        <p className="text-xs text-slate-500">Due: {dueDate}</p>
                                    </div>
                                </div>
                            )}

                            {/* Client & Status Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 bg-slate-50/80 p-6 rounded-2xl border border-slate-100">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">BILLED TO CUSTOMER:</span>
                                    <h3 className="font-black text-slate-900 text-sm uppercase">{customerName || 'Valued Customer / Client'}</h3>
                                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{billingAddress || 'No Address Specified'}</p>
                                    {phone && <p className="text-xs text-slate-600 mt-1">Ph: {phone}</p>}
                                    {gstin && <p className="text-xs font-mono font-bold text-slate-700 mt-1">GSTIN: {gstin}</p>}
                                </div>

                                <div className="text-left sm:text-right flex flex-col justify-between gap-4 sm:gap-0">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">INVOICE STATUS:</span>
                                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                            status === 'Paid' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                                            status === 'Overdue' ? 'bg-rose-100 text-rose-700 border-rose-300' :
                                            'bg-amber-100 text-amber-700 border-amber-300'
                                        }`}>
                                            {status}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">TOTAL DUE AMOUNT:</span>
                                        <span className="text-2xl font-black text-slate-900 tracking-normal" style={{ color: themeColor, letterSpacing: 'normal' }}>
                                            {formatCurrencyINR(grandTotal)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Line Items Table */}
                            <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left border-collapse" style={{ letterSpacing: 'normal' }}>
                                    <thead>
                                        <tr 
                                            className="text-[10px] font-black uppercase tracking-wider text-white"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            <th className="p-3">#</th>
                                            <th className="p-3">Item & Description</th>
                                            <th className="p-3 text-right">Price</th>
                                            <th className="p-3 text-center">Qty</th>
                                            <th className="p-3 text-center">Unit</th>
                                            {showTax && <th className="p-3 text-right">Tax Rate</th>}
                                            <th className="p-3 text-right">Line Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-medium text-slate-800 divide-y divide-slate-100">
                                        {items.map((item, index) => {
                                            const lineTotal = (parseFloat(item.price || 0) * parseFloat(item.quantity || 0));
                                            return (
                                                <tr key={item.id} className={index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                                                    <td className="p-3 font-bold text-slate-400">{index + 1}</td>
                                                    <td className="p-3 font-bold text-slate-900">{item.description || 'Custom Line Item'}</td>
                                                    <td className="p-3 text-right font-bold" style={{ letterSpacing: 'normal' }}>{formatCurrencyINR(item.price || 0)}</td>
                                                    <td className="p-3 text-center font-bold">{item.quantity}</td>
                                                    <td className="p-3 text-center text-slate-500">{item.unit}</td>
                                                    {showTax && <td className="p-3 text-right text-slate-500">{item.taxRate}%</td>}
                                                    <td className="p-3 text-right font-black text-slate-900" style={{ letterSpacing: 'normal' }}>
                                                        {formatCurrencyINR(lineTotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary & Tax Breakdown */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 border-b border-slate-200 pb-6">
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">AMOUNT IN WORDS:</span>
                                        <p className="text-xs font-bold text-slate-700 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            "{amountInWords}"
                                        </p>
                                    </div>

                                    {showTerms && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">TERMS & CONDITIONS:</span>
                                            <p className="text-[11px] text-slate-500 whitespace-pre-line leading-relaxed font-medium">
                                                {termsText}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full sm:w-64 space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="font-bold text-slate-500">Subtotal:</span>
                                        <span className="font-bold text-slate-900">₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {showTax && (
                                        <>
                                            {taxType === 'GST_SPLIT' ? (
                                                <>
                                                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                                                        <span>CGST (9%):</span>
                                                        <span>₹ {cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                                                        <span>SGST (9%):</span>
                                                        <span>₹ {sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                                                    <span>IGST (18%):</span>
                                                    <span>₹ {igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="flex justify-between py-2 text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2">
                                        <span>Grand Total:</span>
                                        <span style={{ color: themeColor }}>₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer & Signature Verification Block */}
                            <div className="flex justify-between items-end pt-4">
                                <div>
                                    {showFooter && (
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            Powered by Krishna ERP
                                        </p>
                                    )}
                                </div>

                                {showSignature && (
                                    <div className="text-right border-t border-slate-300 pt-3 w-48">
                                        {brandingSettings.company_signature && (
                                            <img src={brandingSettings.company_signature} alt="Digital Signature" className="h-10 w-auto object-contain ml-auto mb-1" />
                                        )}
                                        <p className="text-xs font-black uppercase text-slate-900">Authorized Signature</p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Krishna Engineering Works</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Invoices;
