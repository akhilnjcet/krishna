import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Printer, Plus, Trash2, User, Calendar, Hash, FileText, 
    Palette, Clock, CheckCircle, ShieldCheck, DollarSign, Layers
} from 'lucide-react';
import api from '../../services/api';
import { numberToIndianRupees } from '../../utils/numberToIndianRupees';

const Quotations = () => {
    const [customers, setCustomers] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);

    // Core Estimation Structure
    const [quotationNumber, setQuotationNumber] = useState(`QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
    const [proposalValidityDate, setProposalValidityDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);

    // Client Information Lookup
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientGstin, setClientGstin] = useState('');

    // Flexible Quotation Items (Items & Services with Custom Description Blocks)
    const [items, setItems] = useState([
        { id: 1, type: 'Item', name: 'Industrial Heavy Truss Fabrication', description: 'Custom engineered ISMB steel truss structure for factory roof', rate: 120000, quantity: 1, unit: 'Units' },
        { id: 2, type: 'Service', name: 'On-site Erection & Installation Labor', description: 'Crane operations and high-elevation alignment work', rate: 25000, quantity: 1, unit: 'Job' }
    ]);

    // Pre-fillable Disclaimers & Notes
    const [disclaimers, setDisclaimers] = useState(
        '1. Quotation valid for 30 days from issue date.\n2. 50% advance along with confirmed purchase order.\n3. Balance 50% against delivery / installation completion.\n4. Standard GST (18%) applicable extra.'
    );
    const [projectNotes, setProjectNotes] = useState('All material testing certificates will be supplied prior to dispatch. Site power supply to be provided by client.');
    const [timelines, setTimelines] = useState('21 Working Days from receipt of advance payment and drawing approval.');

    // Custom Print Configuration
    const [theme, setTheme] = useState('Classic'); // Classic, Modern, Minimalist
    const [themeColor, setThemeColor] = useState('#4f46e5');
    const [showTax, setShowTax] = useState(true);
    const [showSignature, setShowSignature] = useState(true);
    const [taxPercentage, setTaxPercentage] = useState(18);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoadingCustomers(true);
        try {
            const res = await api.get('/auth/admin/users');
            if (Array.isArray(res.data)) {
                setCustomers(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch customers for quotations", err);
        } finally {
            setLoadingCustomers(false);
        }
    };

    const handleSelectClient = (e) => {
        const id = e.target.value;
        setSelectedCustomerId(id);
        if (!id) return;
        const cust = customers.find(c => c._id === id);
        if (cust) {
            setClientName(cust.name || '');
            setClientAddress(cust.address || 'Industrial Zone, Phase 2, Kerala');
            setClientPhone(cust.phone || cust.phoneNumber || '');
            setClientGstin(cust.gstin || '32AAAAA0000A1Z5');
        }
    };

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            { id: Date.now(), type: 'Item', name: '', description: '', rate: 0, quantity: 1, unit: 'Units' }
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

    // Financial Calculations
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.rate || 0) * parseFloat(item.quantity || 0)), 0);
    const taxAmount = showTax ? subtotal * (parseFloat(taxPercentage || 0) / 100) : 0;
    const grandTotal = subtotal + taxAmount;
    const amountInWords = numberToIndianRupees(grandTotal);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-sans">
            {/* Header Toolbar */}
            <div className="no-print bg-white p-6 rounded-3xl border border-slate-200 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Cost Estimation & Proposals
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">Quotation Studio</h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg transition"
                    >
                        <Printer className="w-4 h-4" /> Print / Export Proposal
                    </button>
                </div>
            </div>

            {/* Main Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Controls & Form */}
                <div className="no-print lg:col-span-5 space-y-6">
                    {/* Core Structure */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-indigo-500" /> Estimation Metadata
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Quotation Number</label>
                                <input
                                    type="text"
                                    value={quotationNumber}
                                    onChange={(e) => setQuotationNumber(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Quotation Date</label>
                                <input
                                    type="date"
                                    value={quotationDate}
                                    onChange={(e) => setQuotationDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Proposal Validity Date</label>
                            <input
                                type="date"
                                value={proposalValidityDate}
                                onChange={(e) => setProposalValidityDate(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Client Information Lookup */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-500" /> Client Lookup & Details
                        </h2>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Select Client from Database</label>
                            <select
                                value={selectedCustomerId}
                                onChange={handleSelectClient}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">-- Choose Existing Customer --</option>
                                {customers.map(c => (
                                    <option key={c._id} value={c._id}>{c.name} ({c.email || 'Customer'})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3 pt-2">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Client Name / Business</label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Client Name"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Address</label>
                                <textarea
                                    rows="2"
                                    value={clientAddress}
                                    onChange={(e) => setClientAddress(e.target.value)}
                                    placeholder="Client Location Address"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={clientPhone}
                                        onChange={(e) => setClientPhone(e.target.value)}
                                        placeholder="Phone"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">GSTIN</label>
                                    <input
                                        type="text"
                                        value={clientGstin}
                                        onChange={(e) => setClientGstin(e.target.value)}
                                        placeholder="GSTIN"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Flexible Quotation Items & Services */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" /> Quotation Line Items & Services
                            </h2>
                            <button
                                onClick={handleAddItem}
                                className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Block
                            </button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, idx) => (
                                <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase text-indigo-600">Block #{idx + 1}</span>
                                            <select
                                                value={item.type}
                                                onChange={(e) => handleItemChange(item.id, 'type', e.target.value)}
                                                className="text-[10px] font-bold bg-white border border-slate-200 rounded-md px-1.5 py-0.5"
                                            >
                                                <option value="Item">Item</option>
                                                <option value="Service">Service</option>
                                                <option value="Custom">Custom Block</option>
                                            </select>
                                        </div>
                                        {items.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div>
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                                            placeholder="Item / Service Title"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none mb-2"
                                        />
                                        <textarea
                                            rows="2"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                            placeholder="Detailed specification & scope of work description block..."
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Rate (₹)</label>
                                            <input
                                                type="number"
                                                value={item.rate}
                                                onChange={(e) => handleItemChange(item.id, 'rate', e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase text-slate-400 block mb-0.5">Quantity</label>
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
                                                placeholder="Units / Job"
                                                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pre-fillable Disclaimers & Project Notes */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-500" /> Disclaimers, Timelines & Notes
                        </h2>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Standard Terms & Disclaimers</label>
                            <textarea
                                rows="3"
                                value={disclaimers}
                                onChange={(e) => setDisclaimers(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Project Execution Timeline</label>
                            <input
                                type="text"
                                value={timelines}
                                onChange={(e) => setTimelines(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Additional Project Notes</label>
                            <textarea
                                rows="2"
                                value={projectNotes}
                                onChange={(e) => setProjectNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Print Config & Themes */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-3 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-indigo-500" /> Custom Print Configuration
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
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Theme Color:</label>
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
                                    checked={showTax}
                                    onChange={(e) => setShowTax(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Toggle Tax Display
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showSignature}
                                    onChange={(e) => setShowSignature(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Signature Verification Block
                            </label>
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
                                Live Proposal Real-Time Preview
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Keystroke Synced</span>
                        </div>

                        {/* Proposal Document */}
                        <div 
                            className="print-document-container bg-white p-8 md:p-12 shadow-2xl rounded-b-3xl border border-slate-200 text-slate-800 font-sans"
                            style={{ '--theme-color': themeColor }}
                        >
                            {/* Header */}
                            {theme === 'Modern' ? (
                                <div 
                                    className="p-8 rounded-2xl mb-8 text-white relative overflow-hidden"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h1 className="text-2xl font-black uppercase tracking-wider">KRISHNA ENGINEERING WORKS</h1>
                                            <p className="text-xs opacity-90 font-medium">Formal Engineering Estimation & Proposal</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="bg-white/20 backdrop-blur px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest inline-block mb-1">
                                                QUOTATION
                                            </span>
                                            <p className="text-sm font-black">{quotationNumber}</p>
                                            <p className="text-xs opacity-80">Date: {quotationDate}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : theme === 'Minimalist' ? (
                                <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                                    <div>
                                        <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">KRISHNA ENGINEERING WORKS</h1>
                                        <p className="text-xs text-slate-500 font-medium">Industrial Area Phase 1 | Engineering & Structural Division</p>
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: themeColor }}>PROPOSAL</h2>
                                        <p className="text-xs font-bold text-slate-700">{quotationNumber}</p>
                                        <p className="text-xs text-slate-500">Date: {quotationDate}</p>
                                    </div>
                                </div>
                            ) : (
                                /* Classic Theme */
                                <div className="border-b border-slate-200 pb-6 mb-8 flex justify-between items-start">
                                    <div>
                                        <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900">KRISHNA ENGINEERING WORKS</h1>
                                        <p className="text-xs text-slate-500">Heavy Fabrication, Roofing & Structural Design</p>
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">GSTIN: 32ABCDE1234F1Z5 | Phone: +91 9447940835</p>
                                    </div>
                                    <div className="text-right">
                                        <span 
                                            className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-white inline-block mb-2 shadow-sm"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            COST ESTIMATE
                                        </span>
                                        <p className="text-xs font-black text-slate-900">{quotationNumber}</p>
                                        <p className="text-xs text-slate-500">Date: {quotationDate}</p>
                                        <p className="text-xs text-slate-500">Valid Until: {proposalValidityDate}</p>
                                    </div>
                                </div>
                            )}

                            {/* Client Block */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 flex justify-between items-start">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">PROPOSAL PREPARED FOR:</span>
                                    <h3 className="font-black text-slate-900 text-sm uppercase">{clientName || 'Valued Client'}</h3>
                                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{clientAddress || 'Client Location'}</p>
                                    {clientPhone && <p className="text-xs text-slate-600 mt-1">Ph: {clientPhone}</p>}
                                    {clientGstin && <p className="text-xs font-mono font-bold text-slate-700 mt-1">GSTIN: {clientGstin}</p>}
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">VALIDITY DATE:</span>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg inline-block">
                                        {proposalValidityDate}
                                    </span>
                                </div>
                            </div>

                            {/* Quotation Table */}
                            <div className="mb-8 overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr 
                                            className="text-[10px] font-black uppercase tracking-wider text-white"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            <th className="p-3">#</th>
                                            <th className="p-3">Item / Service & Description</th>
                                            <th className="p-3 text-right">Rate</th>
                                            <th className="p-3 text-center">Qty</th>
                                            <th className="p-3 text-center">Unit</th>
                                            <th className="p-3 text-right">Total (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs font-medium text-slate-800 divide-y divide-slate-100">
                                        {items.map((item, index) => {
                                            const lineTotal = (parseFloat(item.rate || 0) * parseFloat(item.quantity || 0));
                                            return (
                                                <tr key={item.id} className={index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                                                    <td className="p-3 font-bold text-slate-400">{index + 1}</td>
                                                    <td className="p-3">
                                                        <span className="font-bold text-slate-900 block">{item.name || 'Scope Item'}</span>
                                                        {item.description && (
                                                            <p className="text-[11px] text-slate-500 mt-0.5 whitespace-pre-line">{item.description}</p>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">₹ {parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
                                                    <td className="p-3 text-center font-bold">{item.quantity}</td>
                                                    <td className="p-3 text-center text-slate-500">{item.unit}</td>
                                                    <td className="p-3 text-right font-black text-slate-900">
                                                        ₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary & Disclaimers */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 border-b border-slate-200 pb-6">
                                <div className="flex-1 space-y-4">
                                    {timelines && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">ESTIMATED TIMELINE:</span>
                                            <p className="text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                {timelines}
                                            </p>
                                        </div>
                                    )}

                                    {projectNotes && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">PROJECT NOTES:</span>
                                            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-line font-medium">
                                                {projectNotes}
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">TERMS & CONDITIONS:</span>
                                        <p className="text-[11px] text-slate-500 whitespace-pre-line leading-relaxed font-medium">
                                            {disclaimers}
                                        </p>
                                    </div>
                                </div>

                                <div className="w-full sm:w-64 space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-slate-100">
                                        <span className="font-bold text-slate-500">Subtotal:</span>
                                        <span className="font-bold text-slate-900">₹ {subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>

                                    {showTax && (
                                        <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                                            <span>Estimated Tax ({taxPercentage}%):</span>
                                            <span>₹ {taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between py-2 text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2">
                                        <span>Estimated Total:</span>
                                        <span style={{ color: themeColor }}>₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Signature Block */}
                            {showSignature && (
                                <div className="flex justify-between items-end pt-4">
                                    <div className="text-left text-[10px] text-slate-400 font-medium">
                                        <p>Proposal Reference: {quotationNumber}</p>
                                        <p>Subject to Final Technical Audit</p>
                                    </div>
                                    <div className="text-right border-t border-slate-300 pt-3 w-48">
                                        <div className="flex items-center justify-end gap-1 text-emerald-600 mb-1">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span className="text-[9px] font-black uppercase">Verified Estimate</span>
                                        </div>
                                        <p className="text-xs font-black uppercase text-slate-900">Authorized Signatory</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Krishna Engineering Works</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Quotations;
