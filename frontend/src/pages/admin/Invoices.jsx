import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Printer, Save, Plus, Trash2, User, Building, Phone, Calendar, Hash, 
    FileText, CheckCircle2, Clock, AlertTriangle, Eye, Palette, Check, Sparkles, 
    RefreshCw, Copy, RotateCcw, History, Search, X, Tag, DollarSign, Layers,
    ShieldCheck, QrCode, Columns, Maximize2, Minimize2
} from 'lucide-react';
import api from '../../services/api';
import { numberToIndianRupees } from '../../utils/numberToIndianRupees';
import { formatCurrencyINR } from '../../utils/pdfHelpers';
import { PRECONFIGURED_CATALOG, computeBillFinancials, computeItemSectionMeta, calculateBillTotals, synchronizeItemSections } from '../../utils/combinedBillHelper';
import { buildUPILink } from '../../utils/upiUtils';
import CombinedBillTableBody from '../../components/CombinedBillTable';
import EstimationEntryTable from '../../components/EstimationEntryTable';

const generateInvoiceNumber = () => `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

const Invoices = () => {
    const [customers, setCustomers] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [workspaceViewMode, setWorkspaceViewMode] = useState('editor'); // 'editor' (default full width) | 'preview' | 'split'

    // Form State
    const [invoiceNumber, setInvoiceNumber] = useState(generateInvoiceNumber());
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    const [showDueDate, setShowDueDate] = useState(true);
    const [netDays, setNetDays] = useState('15');
    const [showNetDays, setShowNetDays] = useState(true);
    const [tagline, setTagline] = useState('Heavy PEB Structures, Industrial Roofing & High-Tensile Fabrication');
    const [showTagline, setShowTagline] = useState(true);
    
    // Customer Selector & Autofill
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [billingAddress, setBillingAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [gstin, setGstin] = useState('');
    const [customerState, setCustomerState] = useState('Kerala (32)');

    // Combined Billing Mode & Items
    const [isCombinedMode, setIsCombinedMode] = useState(false);
    const [items, setItems] = useState([
        { id: 1, description: 'Steel Structural I-Beam 150x75', price: 4600, quantity: 2, unit: 'Kg', taxRate: 18, hasQuantity: true, hasUnitPrice: true, isCombined: false }
    ]);
    const [combinedTotals, setCombinedTotals] = useState({});

    // Payment Tracking & Statuses (Unpaid, Partially Paid, Paid, Overdue)
    const [status, setStatus] = useState('Unpaid');
    const [showPaymentStatus, setShowPaymentStatus] = useState(true);
    const [paidAmount, setPaidAmount] = useState(0);

    // Discounts
    const [discountType, setDiscountType] = useState('none'); // 'none' | 'percent' | 'fixed'
    const [discountValue, setDiscountValue] = useState(0);

    // Tax Configuration
    const [taxPercentage, setTaxPercentage] = useState(18);
    const [taxType, setTaxType] = useState('GST_SPLIT'); // 'GST_SPLIT' (CGST+SGST) or 'IGST'

    // Granular Column Controls
    const [showUnitPrice, setShowUnitPrice] = useState(true);
    const [showQuantity, setShowQuantity] = useState(true);

    // Print Configuration Toggles
    const [showTerms, setShowTerms] = useState(true);
    const [showTax, setShowTax] = useState(true);
    const [showSignature, setShowSignature] = useState(true);
    const [showFooter, setShowFooter] = useState(true);
    const [showQrCode, setShowQrCode] = useState(true);
    const [showNotes, setShowNotes] = useState(true);

    // Theme & Branding Customization
    const [theme, setTheme] = useState('Classic'); // Classic, Modern, Minimalist
    const [themeColor, setThemeColor] = useState('#4f46e5');
    const [showLogo, setShowLogo] = useState(true);
    const [termsText, setTermsText] = useState('1. Payment is due within 15 days of invoice date.\n2. Goods once sold will not be taken back without technical inspection.\n3. Interest @ 18% p.a. will be charged on overdue payments.');
    const [invoiceNotes, setInvoiceNotes] = useState('Supplied as per standard certified structural fabrication specifications.');
    const [footerRemarks, setFooterRemarks] = useState('Krishna Engineering Works — Excellence in Pre-Engineered Buildings & Industrial Heavy Fabrication');
    const [brandingSettings, setBrandingSettings] = useState({ company_logo: '', company_signature: '' });

    // Catalog & History Modals
    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogCategory, setCatalogCategory] = useState('All');

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [savedInvoices, setSavedInvoices] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [savingHistory, setSavingHistory] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Auto-Save & Crash Protection State
    const DRAFT_STORAGE_KEY = 'krishna_draft_invoice_v1';
    const [recoveredDraft, setRecoveredDraft] = useState(null);
    const [lastAutoSavedTime, setLastAutoSavedTime] = useState(null);

    useEffect(() => {
        fetchCustomers();
        fetchBranding();
        checkDuplicatedDoc();

        // Check for crash recovery draft
        try {
            const savedDraftStr = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (savedDraftStr) {
                const parsed = JSON.parse(savedDraftStr);
                const hasMeaningful = Boolean(
                    parsed?.data && (
                        (parsed.data.customerName && parsed.data.customerName.trim()) ||
                        (Array.isArray(parsed.data.items) && parsed.data.items.some(i => (i.description || i.name || '').trim() || i.price > 0))
                    )
                );
                if (hasMeaningful) {
                    setRecoveredDraft(parsed);
                }
            }
        } catch (e) {
            console.warn('Invoice draft recovery error', e);
        }
    }, []);

    const fetchBranding = async () => {
        try {
            const res = await api.get('/settings/public');
            if (Array.isArray(res.data)) {
                const map = {};
                res.data.forEach(item => { map[item.key] = item.value; });
                setBrandingSettings(map);
                if (map.company_tagline || map.tagline) {
                    setTagline(prev => (prev === 'Heavy PEB Structures, Industrial Roofing & High-Tensile Fabrication' ? (map.company_tagline || map.tagline) : prev));
                }
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

    const checkDuplicatedDoc = () => {
        try {
            const type = localStorage.getItem('duplicated_doc_type');
            const dataStr = localStorage.getItem('duplicated_doc_data');
            if (type === 'Invoice' && dataStr) {
                const parsed = JSON.parse(dataStr);
                applyInvoiceData(parsed, true);
                localStorage.removeItem('duplicated_doc_type');
                localStorage.removeItem('duplicated_doc_data');
                setSaveMessage('✓ Cloned invoice loaded into studio.');
                setTimeout(() => setSaveMessage(''), 4000);
            }
        } catch (e) {
            console.warn('Duplication check error:', e);
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
            setCustomerState(cust.state || 'Kerala (32)');
        }
    };

    const handleUpdateItem = (index, field, value) => {
        setItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return synchronizeItemSections(next);
        });
    };

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            { id: Date.now() + Math.random(), description: '', price: 0, quantity: 1, unit: 'Units', hasQuantity: true, hasUnitPrice: true, isCombined: false }
        ]);
    };

    const handleAddNewCombinedSection = () => {
        const secId = `sec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        setCombinedTotals(prev => ({ ...prev, [secId]: 0 }));
        setItems(prev => [
            ...prev,
            { id: Date.now() + Math.random(), description: '', price: 0, quantity: 1, unit: 'Units', hasQuantity: true, hasUnitPrice: true, isCombined: true, isCombinedMode: true, combinedSectionId: secId, isNewSectionStart: true }
        ]);
    };

    const handleRemoveItem = (index) => {
        setItems(prev => {
            const next = prev.filter((_, i) => i !== index);
            return synchronizeItemSections(next);
        });
    };

    const handleToggleCombine = (index, checked) => {
        setItems(prev => {
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
        setItems(prev => {
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
        setItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], isNewSectionStart: false };
            return synchronizeItemSections(next);
        });
    };

    const handleCombinedTotalChange = (sectionId, val) => {
        setCombinedTotals(prev => ({
            ...prev,
            [sectionId]: val
        }));
    };

    const handleInsertCatalogItem = (catItem) => {
        setItems(prev => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                description: catItem.name + (catItem.description ? ` - ${catItem.description}` : ''),
                price: catItem.price,
                quantity: 1,
                unit: catItem.unit,
                taxRate: catItem.taxRate || 18,
                isCombined: false
            }
        ]);
        setShowCatalogModal(false);
        setSaveMessage(`✓ Added "${catItem.name}" to invoice.`);
        setTimeout(() => setSaveMessage(''), 3000);
    };

    // Financial Calculation with combined totals helper
    const totals = calculateBillTotals(
        items,
        combinedTotals,
        showTax,
        discountType,
        discountValue,
        taxPercentage,
        showQuantity,
        showUnitPrice
    );

    const financials = {
        subtotal: totals.subTotal,
        discountAmount: totals.discountAmount,
        taxableAmount: totals.taxableAmount,
        taxAmount: totals.taxAmount,
        grandTotal: totals.totalAmount,
        amountInWords: numberToIndianRupees(totals.totalAmount)
    };

    const calculatedBalanceDue = status === 'Paid' 
        ? 0 
        : status === 'Partially Paid' 
        ? Math.max(0, totals.totalAmount - parseFloat(paidAmount || 0)) 
        : totals.totalAmount;

    const handleDuplicateInvoice = () => {
        setInvoiceNumber(generateInvoiceNumber());
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
        setStatus('Unpaid');
        setPaidAmount(0);
        setSaveMessage('✓ Duplicated into new invoice number.');
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const handleResetInvoice = () => {
        if (!window.confirm('Reset this invoice and start fresh? All unsaved inputs will be cleared.')) return;
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setRecoveredDraft(null);
        setLastAutoSavedTime(null);
        setInvoiceNumber(generateInvoiceNumber());
        setInvoiceDate(new Date().toISOString().split('T')[0]);
        setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
        setShowDueDate(true);
        setNetDays('15');
        setShowNetDays(true);
        setTagline(brandingSettings?.company_tagline || brandingSettings?.tagline || 'Heavy PEB Structures, Industrial Roofing & High-Tensile Fabrication');
        setShowTagline(true);
        setSelectedCustomerId('');
        setCustomerName('');
        setBillingAddress('');
        setPhone('');
        setGstin('');
        setStatus('Unpaid');
        setShowPaymentStatus(true);
        setPaidAmount(0);
        setDiscountType('none');
        setDiscountValue(0);
        setItems([{ id: Date.now(), description: '', price: 0, quantity: 1, unit: 'Units', isCombined: false }]);
        setCombinedTotals({});
        setSaveMessage('✓ Invoice studio reset.');
        setTimeout(() => setSaveMessage(''), 3000);
    };

    const handleOpenHistoryModal = async () => {
        setShowHistoryModal(true);
        setLoadingHistory(true);
        try {
            const res = await api.get('/document-history', { params: { category: 'Invoices', limit: 20 } });
            setSavedInvoices(res.data.documents || []);
        } catch (e) {
            console.error('Failed to load invoice history:', e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const applyInvoiceData = (data, isClone = false) => {
        if (!data) return;
        if (!isClone) {
            setInvoiceNumber(data.invoiceNumber || generateInvoiceNumber());
            setInvoiceDate(data.invoiceDate || new Date().toISOString().split('T')[0]);
        } else {
            setInvoiceNumber(generateInvoiceNumber());
            setInvoiceDate(new Date().toISOString().split('T')[0]);
        }
        setDueDate(data.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
        if (data.showDueDate !== undefined) setShowDueDate(data.showDueDate);
        if (data.netDays !== undefined) setNetDays(data.netDays);
        if (data.showNetDays !== undefined) setShowNetDays(data.showNetDays);
        if (data.showPaymentStatus !== undefined) setShowPaymentStatus(data.showPaymentStatus);
        if (data.tagline !== undefined) setTagline(data.tagline);
        if (data.showTagline !== undefined) setShowTagline(data.showTagline);
        setSelectedCustomerId(data.selectedCustomerId || '');
        setCustomerName(data.customerName || '');
        setBillingAddress(data.billingAddress || '');
        setPhone(data.phone || '');
        setGstin(data.gstin || '');
        setCustomerState(data.customerState || 'Kerala (32)');
        if (Array.isArray(data.items) && data.items.length > 0) {
            setItems(data.items);
            if (data.items.some(i => i.isCombined || i.isCombinedMode || i.sectionName)) setIsCombinedMode(true);
        }
        if (data.combinedTotals) {
            setCombinedTotals(data.combinedTotals);
        }
        if (data.status) setStatus(data.status);
        if (data.paidAmount !== undefined) setPaidAmount(data.paidAmount);
        if (data.discountType) setDiscountType(data.discountType);
        if (data.discountValue !== undefined) setDiscountValue(data.discountValue);
        if (data.taxPercentage !== undefined) setTaxPercentage(data.taxPercentage);
        if (data.taxType) setTaxType(data.taxType);
        if (data.showTax !== undefined) setShowTax(data.showTax);
        if (data.showUnitPrice !== undefined) setShowUnitPrice(data.showUnitPrice);
        if (data.showQuantity !== undefined) setShowQuantity(data.showQuantity);
        if (data.theme) setTheme(data.theme);
        if (data.themeColor) setThemeColor(data.themeColor);
        if (data.termsText) setTermsText(data.termsText);
        if (data.invoiceNotes) setInvoiceNotes(data.invoiceNotes);
        if (data.footerRemarks) setFooterRemarks(data.footerRemarks);
        setShowHistoryModal(false);
    };

    // Auto-save helper payload
    const getDraftData = () => ({
        invoiceNumber,
        invoiceDate,
        dueDate,
        showDueDate,
        netDays,
        showNetDays,
        tagline,
        showTagline,
        selectedCustomerId,
        customerName,
        billingAddress,
        phone,
        gstin,
        customerState,
        isCombinedMode,
        items,
        combinedTotals,
        status,
        showPaymentStatus,
        paidAmount,
        discountType,
        discountValue,
        taxPercentage,
        taxType,
        showTerms,
        showTax,
        showSignature,
        showFooter,
        showUnitPrice,
        showQuantity,
        showNotes,
        showQrCode,
        theme,
        themeColor,
        showLogo,
        termsText,
        invoiceNotes,
        footerRemarks
    });

    // Auto-save to localStorage on change (debounced 1.2s)
    useEffect(() => {
        const hasContent = Boolean(
            (customerName && customerName.trim()) ||
            (items && items.some(i => (i.description || i.name || '').trim() || i.price > 0))
        );
        if (!hasContent) return;

        const timer = setTimeout(() => {
            try {
                const draft = {
                    data: getDraftData(),
                    savedAt: new Date().toISOString()
                };
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
                setLastAutoSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            } catch (e) {
                console.warn('Invoice auto-save error', e);
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [
        invoiceNumber, invoiceDate, dueDate, selectedCustomerId, customerName, billingAddress,
        phone, gstin, customerState, isCombinedMode, items, combinedTotals, status, paidAmount,
        discountType, discountValue, taxPercentage, taxType, showTerms, showTax, showSignature,
        showFooter, showUnitPrice, showQuantity, showNotes, showQrCode, theme, themeColor,
        showLogo, termsText, invoiceNotes, footerRemarks
    ]);

    // Save immediately on beforeunload (accidental close or crash protection)
    useEffect(() => {
        const handleBeforeUnload = () => {
            const hasContent = Boolean(
                (customerName && customerName.trim()) ||
                (items && items.some(i => (i.description || i.name || '').trim() || i.price > 0))
            );
            if (hasContent) {
                try {
                    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
                        data: getDraftData(),
                        savedAt: new Date().toISOString()
                    }));
                } catch (e) {}
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [customerName, items, invoiceNumber, invoiceDate, dueDate]);

    // Background auto-save to Document History vault (debounced 6s if basic fields present)
    useEffect(() => {
        if (!customerName?.trim() || !items || items.length === 0 || items.every(i => !((i.description || i.name || '').trim()))) return;
        const cloudTimer = setTimeout(() => {
            handleSaveToHistory(true);
        }, 6000);
        return () => clearTimeout(cloudTimer);
    }, [customerName, items, invoiceNumber, totals.totalAmount]);

    const handleRestoreDraft = () => {
        if (recoveredDraft?.data) {
            applyInvoiceData(recoveredDraft.data, false);
            setSaveMessage(`✓ Restored auto-saved draft from ${new Date(recoveredDraft.savedAt).toLocaleTimeString()}`);
            setTimeout(() => setSaveMessage(''), 4000);
        }
        setRecoveredDraft(null);
    };

    const handleDiscardDraft = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setRecoveredDraft(null);
        setSaveMessage('Auto-saved draft discarded.');
        setTimeout(() => setSaveMessage(''), 3000);
    };

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
                showDueDate,
                netDays,
                showNetDays,
                tagline,
                showTagline,
                selectedCustomerId,
                customerName,
                billingAddress,
                phone,
                gstin,
                customerState,
                isCombinedMode,
                items,
                combinedTotals,
                status,
                showPaymentStatus,
                paidAmount: parseFloat(paidAmount || 0),
                balanceDue: calculatedBalanceDue,
                discountType,
                discountValue,
                discountAmount: financials.discountAmount,
                taxPercentage,
                taxType,
                showTerms,
                showTax,
                showSignature,
                showFooter,
                showUnitPrice,
                showQuantity,
                showNotes,
                showQrCode,
                theme,
                themeColor,
                showLogo,
                termsText,
                invoiceNotes,
                footerRemarks,
                subtotal: financials.subtotal,
                taxAmount: financials.taxAmount,
                grandTotal: financials.grandTotal,
                amountInWords: financials.amountInWords,
                balanceInWords: numberToIndianRupees(calculatedBalanceDue),
                brandingSettings
            };

            const payload = {
                documentType: 'Invoice',
                documentNumber: invoiceNumber,
                customerId: selectedCustomerId || undefined,
                status: status || 'Unpaid',
                totalAmount: financials.grandTotal,
                data: fullInvoiceData
            };

            const res = await api.post('/document-history/save', payload);
            if (!autoSilent) {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
                setRecoveredDraft(null);
                setSaveMessage(`✅ Invoice #${invoiceNumber} saved to Document History (Version ${res.data.document?.version || 1}).`);
                setTimeout(() => setSaveMessage(''), 4000);
            } else {
                setLastAutoSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
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

    // Group items for combined mode preview
    const groupedItems = React.useMemo(() => {
        if (!isCombinedMode) return null;
        const groups = {};
        items.forEach(item => {
            const sec = (item.sectionName || 'General Items').trim();
            if (!groups[sec]) groups[sec] = [];
            groups[sec].push(item);
        });
        return groups;
    }, [items, isCombinedMode]);

    // QR Code Payment URI using buildUPILink
    const upiLink = buildUPILink({
        pa: brandingSettings?.upi_id || '9447940835@sbi',
        pn: brandingSettings?.company_name || 'Krishna Engineering Works',
        am: calculatedBalanceDue.toFixed(2),
        tn: `Invoice ${invoiceNumber}`,
        cu: 'INR'
    }) || `upi://pay?pa=9447940835@sbi&pn=Krishna%20Engineering%20Works&am=${calculatedBalanceDue.toFixed(2)}&cu=INR&tn=Invoice%20${invoiceNumber}`;
    const upiQrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiLink)}`;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 md:p-8 font-sans">
            {/* Auto-Save Crash Recovery Banner */}
            {recoveredDraft && (
                <div className="no-print mb-4 p-4 bg-gradient-to-r from-amber-500/15 via-indigo-500/10 to-emerald-500/15 border-2 border-amber-400 dark:border-amber-500/60 rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                Unsaved Invoice Recovered
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                                    Crash Protection Active
                                </span>
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                We found an auto-saved draft from <strong>{new Date(recoveredDraft.savedAt).toLocaleString()}</strong> with client <em>"{recoveredDraft.data?.customerName || 'Unnamed'}"</em> and {recoveredDraft.data?.items?.length || 0} line items.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={handleRestoreDraft}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5 transition"
                        >
                            <Check className="w-4 h-4" /> Restore Draft
                        </button>
                        <button
                            type="button"
                            onClick={handleDiscardDraft}
                            className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                        >
                            Discard
                        </button>
                    </div>
                </div>
            )}

            {/* Header Toolbar */}
            <div className="no-print bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl mb-6 sm:mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> {showTax ? 'GST Invoicing Suite' : 'Invoicing Suite'}
                        </div>
                        {lastAutoSavedTime && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Draft auto-saved {lastAutoSavedTime}
                            </span>
                        )}
                    </div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                        {showTax ? 'Tax Invoice Studio' : 'Invoice Studio'}
                    </h1>
                    {saveMessage && (
                        <div className="mt-2 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 inline-block">
                            {saveMessage}
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {/* Catalog Picker */}
                    <button
                        onClick={() => setShowCatalogModal(true)}
                        className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                    >
                        <Tag className="w-4 h-4" /> Catalog
                    </button>

                    {/* Duplicate */}
                    <button
                        onClick={handleDuplicateInvoice}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                        title="Duplicate as new invoice"
                    >
                        <Copy className="w-4 h-4" /> Clone
                    </button>

                    {/* Reset */}
                    <button
                        onClick={handleResetInvoice}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 px-3 py-2 sm:px-3 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                        title="Reset studio"
                    >
                        <RotateCcw className="w-4 h-4" /> New
                    </button>

                    {/* Load History */}
                    <button
                        onClick={handleOpenHistoryModal}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                    >
                        <History className="w-4 h-4" /> History
                    </button>

                    {/* Save Button */}
                    <button
                        onClick={() => handleSaveToHistory(false)}
                        disabled={savingHistory}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
                    >
                        <Save className="w-4 h-4" /> {savingHistory ? 'Saving...' : 'Save'}
                    </button>

                    {/* Primary Tab Switcher */}
                    <div className="w-full sm:w-auto flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl sm:rounded-2xl border border-slate-300 dark:border-slate-700 shadow-inner">
                        <button
                            type="button"
                            onClick={() => setWorkspaceViewMode('editor')}
                            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                                workspaceViewMode === 'editor' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Full width editor - All columns visible without horizontal scrolling"
                        >
                            <FileText className="w-3.5 h-3.5" /> <span className="hidden sm:inline">1. Line Item Entry</span><span className="sm:hidden">Entry</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setWorkspaceViewMode('preview')}
                            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                                workspaceViewMode === 'preview' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Full screen A4 document preview"
                        >
                            <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">2. Preview & Print</span><span className="sm:hidden">Preview</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setWorkspaceViewMode('split')}
                            className={`hidden md:flex px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider items-center gap-1.5 transition ${
                                workspaceViewMode === 'split' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                            title="Side-by-side view (best on large monitors)"
                        >
                            <Columns className="w-3.5 h-3.5" /> Split
                        </button>
                    </div>

                    {/* Print Button */}
                    <button
                        onClick={handlePrint}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            {/* Studio Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Controls & Form */}
                {workspaceViewMode !== 'preview' && (
                    <div className={`no-print space-y-6 ${workspaceViewMode === 'editor' ? 'col-span-12' : 'lg:col-span-7 xl:col-span-7'}`}>
                    {/* Metadata & Status */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-indigo-500" /> Invoice Metadata & Payment Status
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Invoice Number</label>
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Invoice Date</label>
                                <input
                                    type="date"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Due Date</label>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={showDueDate}
                                            onChange={(e) => setShowDueDate(e.target.checked)}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                        />
                                        Include Due Date
                                    </label>
                                </div>
                                <input
                                    type="date"
                                    disabled={!showDueDate}
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition ${
                                        !showDueDate ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-850' : ''
                                    }`}
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment Status</label>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={showPaymentStatus}
                                            onChange={(e) => setShowPaymentStatus(e.target.checked)}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                        />
                                        Include Status
                                    </label>
                                </div>
                                <select
                                    disabled={!showPaymentStatus}
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className={`w-full border rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider focus:outline-none transition ${
                                        !showPaymentStatus ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-850' : ''
                                    } ${
                                        status === 'Paid' 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                            : status === 'Partially Paid'
                                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                                            : status === 'Overdue'
                                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Partially Paid">Partially Paid</option>
                                    <option value="Paid">Fully Paid</option>
                                    <option value="Overdue">Overdue</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Payment Terms (Net Days)</label>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={showNetDays}
                                        onChange={(e) => setShowNetDays(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    Include Net Days
                                </label>
                            </div>
                            <input
                                type="text"
                                disabled={!showNetDays}
                                value={netDays}
                                onChange={(e) => setNetDays(e.target.value)}
                                placeholder="e.g. 15 (or Net 15 Days)"
                                className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition ${
                                    !showNetDays ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-850' : ''
                                }`}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Header Tagline / Subtitle</label>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={showTagline}
                                        onChange={(e) => setShowTagline(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    Include Tagline
                                </label>
                            </div>
                            <input
                                type="text"
                                disabled={!showTagline}
                                value={tagline}
                                onChange={(e) => setTagline(e.target.value)}
                                placeholder="e.g. Heavy PEB Structures, Industrial Roofing & High-Tensile Fabrication"
                                className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition ${
                                    !showTagline ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-850' : ''
                                }`}
                            />
                        </div>

                        {/* Partial Payment Amount Input */}
                        {status === 'Partially Paid' && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                                    Advance / Partially Paid Amount (₹)
                                </label>
                                <input
                                    type="number"
                                    value={paidAmount}
                                    onChange={(e) => setPaidAmount(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-2 text-xs font-black text-amber-900 dark:text-amber-200 focus:outline-none"
                                />
                                <div className="flex justify-between text-xs font-bold text-amber-900 dark:text-amber-200 pt-1">
                                    <span>Calculated Balance Due:</span>
                                    <span>{formatCurrencyINR(calculatedBalanceDue)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Customer Info */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-500" /> Customer Auto-fill & Consignee Details
                        </h2>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Select Customer from Database</label>
                            <select
                                value={selectedCustomerId}
                                onChange={handleSelectCustomer}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">-- Choose Existing Customer or Type Manually --</option>
                                {customers.map(c => (
                                    <option key={c._id} value={c._id}>{c.name} ({c.email || c.phone || 'Client'})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3 pt-1">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Customer / Organization Name</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Enter Customer Name"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Billing & Delivery Address</label>
                                <textarea
                                    rows="2"
                                    value={billingAddress}
                                    onChange={(e) => setBillingAddress(e.target.value)}
                                    placeholder="Full street and location address"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Phone"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">GSTIN</label>
                                    <input
                                        type="text"
                                        value={gstin}
                                        onChange={(e) => setGstin(e.target.value)}
                                        placeholder="GSTIN"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                                  {/* Billed Items & Estimation Table */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" /> Invoice Entry & Line Items
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setWorkspaceViewMode(workspaceViewMode === 'preview' ? 'editor' : 'preview')}
                                    className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                                    title="View generated invoice document"
                                >
                                    <Eye className="w-3.5 h-3.5" /> View Live Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCatalogModal(true)}
                                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition"
                                >
                                    <Tag className="w-3.5 h-3.5" /> Catalog
                                </button>
                            </div>
                        </div>

                        <EstimationEntryTable
                            items={items}
                            combinedTotals={combinedTotals}
                            products={PRECONFIGURED_CATALOG}
                            dataListId="invoice-catalog-list"
                            enableUnitPrice={showUnitPrice}
                            onToggleEnableUnitPrice={(val) => setShowUnitPrice(val)}
                            enableQuantity={showQuantity}
                            onToggleEnableQuantity={(val) => setShowQuantity(val)}
                            onUpdateItem={handleUpdateItem}
                            onAddItem={handleAddItem}
                            onAddNewCombinedSection={handleAddNewCombinedSection}
                            onRemoveItem={handleRemoveItem}
                            onToggleCombine={handleToggleCombine}
                            onSplitSection={handleSplitSection}
                            onMergeSection={handleMergeSection}
                            onCombinedTotalChange={handleCombinedTotalChange}
                        />
                    </div>
         </div>

                    {/* Discounts & Taxes */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-indigo-500" /> Discounts & GST Configuration
                        </h2>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Discount Type</label>
                                <select
                                    value={discountType}
                                    onChange={(e) => setDiscountType(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                >
                                    <option value="none">No Discount</option>
                                    <option value="percent">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount (₹)</option>
                                </select>
                            </div>
                            {discountType !== 'none' && (
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                                        {discountType === 'percent' ? 'Discount %' : 'Discount ₹'}
                                    </label>
                                    <input
                                        type="number"
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">GST Percentage (%)</label>
                                <select
                                    value={taxPercentage}
                                    onChange={(e) => setTaxPercentage(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                >
                                    <option value="0">0% (Nil / Exempt)</option>
                                    <option value="5">5% (Concessional)</option>
                                    <option value="12">12% (Standard Low)</option>
                                    <option value="18">18% (Standard Engineering)</option>
                                    <option value="28">28% (High Rate)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">GST Tax System</label>
                                <select
                                    value={taxType}
                                    onChange={(e) => setTaxType(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                >
                                    <option value="GST_SPLIT">CGST + SGST (Kerala Intra-State)</option>
                                    <option value="IGST">IGST (Inter-State)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Terms & Notes */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-500" /> Terms, Notes & Remarks
                        </h2>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Terms & Conditions</label>
                            <textarea
                                rows="3"
                                value={termsText}
                                onChange={(e) => setTermsText(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Technical / Delivery Notes</label>
                            <textarea
                                rows="2"
                                value={invoiceNotes}
                                onChange={(e) => setInvoiceNotes(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Theme & Toggles */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-indigo-500" /> Themes & Display Toggles
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

                        <div className="grid grid-cols-2 gap-2.5 pt-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showTagline}
                                    onChange={(e) => setShowTagline(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Header Tagline
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showDueDate}
                                    onChange={(e) => setShowDueDate(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Due Date
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showPaymentStatus}
                                    onChange={(e) => setShowPaymentStatus(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Paid / Payment Status
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showNetDays}
                                    onChange={(e) => setShowNetDays(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Terms / Net Days
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showTax}
                                    onChange={(e) => setShowTax(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Tax / GST Breakdown
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showSignature}
                                    onChange={(e) => setShowSignature(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Digital Signatures
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showTerms}
                                    onChange={(e) => setShowTerms(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Terms & Conditions
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showQrCode}
                                    onChange={(e) => setShowQrCode(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Payment UPI QR Code
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showNotes}
                                    onChange={(e) => setShowNotes(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Delivery Notes
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showFooter}
                                    onChange={(e) => setShowFooter(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Footer Remarks
                            </label>
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg flex flex-wrap items-center justify-between gap-4">
                        <div className="text-xs font-bold text-slate-500">
                            Total: <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{formatCurrencyINR(totals.finalTotal)}</span> ({items.length} items)
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setWorkspaceViewMode('preview')}
                                className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition"
                            >
                                <Eye className="w-4 h-4" /> Preview Invoice Document
                            </button>
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
                            >
                                <Printer className="w-4 h-4" /> Print / PDF
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSaveToHistory(false)}
                                disabled={savingHistory}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
                            >
                                <Save className="w-4 h-4" /> {savingHistory ? 'Saving...' : 'Save Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RIGHT: Live Tax Invoice Preview */}
            {workspaceViewMode !== 'editor' && (
                <div className={workspaceViewMode === 'preview' ? 'col-span-12 max-w-4xl mx-auto' : 'lg:col-span-5 xl:col-span-5'}>
                    <div className="sticky top-6">
                        <div className="no-print flex items-center justify-between bg-slate-900 text-white px-6 py-3 rounded-t-3xl border-b border-slate-800">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                {showTax ? 'Live Tax Invoice Preview' : 'Live Invoice Preview'} ({theme})
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setWorkspaceViewMode('editor')}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow"
                                >
                                    <FileText className="w-3.5 h-3.5" /> Back to Line Items
                                </button>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold hidden sm:inline">
                                    {showTax ? 'GST Compliant' : 'Commercial Bill'}
                                </span>
                            </div>
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
                                            {brandingSettings.company_logo && showLogo && (
                                                <img src={brandingSettings.company_logo} alt="Company Logo" className="h-12 w-auto object-contain bg-white p-1 rounded-xl shadow-md" />
                                            )}
                                            <div>
                                                <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider company-name">{brandingSettings?.company_name || 'KRISHNA ENGINEERING WORKS'}</h1>
                                                {showTagline && (
                                                    <div>
                                                        <input
                                                            type="text"
                                                            value={tagline}
                                                            onChange={(e) => setTagline(e.target.value)}
                                                            placeholder="Click to edit tagline..."
                                                            title="Click to edit tagline directly"
                                                            className="no-print text-xs opacity-90 font-medium bg-transparent hover:bg-white/10 focus:bg-black/20 text-white placeholder-white/60 border border-transparent hover:border-white/30 focus:border-white/60 rounded px-1 -mx-1 py-0.5 outline-none w-full max-w-lg transition"
                                                        />
                                                        <p className="hidden print:block text-xs opacity-90 font-medium">
                                                            {tagline}
                                                        </p>
                                                    </div>
                                                )}
                                                <p className="text-xs opacity-80 font-medium">
                                                    {showTax ? 'Tax Invoice / Supply of Goods & Engineering Services' : 'Invoice / Supply of Goods & Engineering Services'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <span className="bg-white/20 backdrop-blur px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest inline-block mb-1">
                                                {showTax ? 'TAX INVOICE' : 'INVOICE'}
                                            </span>
                                            <p className="text-sm font-black">{invoiceNumber}</p>
                                            <p className="text-xs opacity-80">Date: {invoiceDate}</p>
                                            {showDueDate && dueDate && (
                                                <p className="text-xs opacity-80">Due: {dueDate}</p>
                                            )}
                                            {showPaymentStatus && (
                                                <div className="mt-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                                        status === 'Paid' ? 'bg-emerald-500 text-white' : status === 'Partially Paid' ? 'bg-amber-400 text-slate-950' : 'bg-rose-500 text-white'
                                                    }`}>
                                                        {status}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : theme === 'Minimalist' ? (
                                <div className="border-b-2 border-slate-900 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {brandingSettings.company_logo && showLogo && (
                                            <img src={brandingSettings.company_logo} alt="Company Logo" className="h-10 w-auto object-contain" />
                                        )}
                                        <div>
                                            <h1 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white company-name">{brandingSettings?.company_name || 'KRISHNA ENGINEERING WORKS'}</h1>
                                            {showTagline && (
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={tagline}
                                                        onChange={(e) => setTagline(e.target.value)}
                                                        placeholder="Click to edit tagline..."
                                                        title="Click to edit tagline directly"
                                                        className="no-print text-xs text-slate-500 dark:text-slate-400 font-medium bg-transparent hover:bg-slate-100 dark:hover:bg-slate-850 focus:bg-white dark:focus:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded px-1 -mx-1 py-0.5 outline-none w-full max-w-lg transition"
                                                    />
                                                    <p className="hidden print:block text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                        {tagline}
                                                    </p>
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-500 font-medium">GSTIN: {brandingSettings?.company_gstin || '32AAAAA0000A1Z5'}</p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: themeColor }}>
                                            {showTax ? 'TAX INVOICE' : 'INVOICE'}
                                        </h2>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{invoiceNumber}</p>
                                        <p className="text-xs text-slate-500">Date: {invoiceDate}{showDueDate && dueDate ? ` | Due: ${dueDate}` : ''}</p>
                                        {showPaymentStatus && (
                                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mt-0.5">[{status}]</span>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Classic Theme */
                                <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        {brandingSettings.company_logo && showLogo && (
                                            <img src={brandingSettings.company_logo} alt="Company Logo" className="h-12 w-auto object-contain bg-white dark:bg-slate-900 rounded-xl shadow p-1" />
                                        )}
                                        <div>
                                            <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white company-name">{brandingSettings?.company_name || 'KRISHNA ENGINEERING WORKS'}</h1>
                                            {showTagline && (
                                                <div>
                                                    <input
                                                        type="text"
                                                        value={tagline}
                                                        onChange={(e) => setTagline(e.target.value)}
                                                        placeholder="Click to edit tagline..."
                                                        title="Click to edit tagline directly"
                                                        className="no-print text-xs text-slate-500 dark:text-slate-400 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-850 focus:bg-white dark:focus:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 rounded px-1 -mx-1 py-0.5 outline-none w-full max-w-lg transition"
                                                    />
                                                    <p className="hidden print:block text-xs text-slate-500 dark:text-slate-400">
                                                        {tagline}
                                                    </p>
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Industrial Area, Thiruvazhiyode, Palakkad, Kerala 679514</p>
                                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                GSTIN: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{brandingSettings?.company_gstin || '32AAAAA0000A1Z5'}</span> | State: Kerala (32)
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <span 
                                            className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-white inline-block mb-2 shadow-sm"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            {showTax ? 'TAX INVOICE' : 'INVOICE'}
                                        </span>
                                        <p className="text-xs font-black text-slate-900 dark:text-white">{invoiceNumber}</p>
                                        <p className="text-xs text-slate-500">Invoice Date: {invoiceDate}</p>
                                        {showDueDate && dueDate && (
                                            <p className="text-xs text-slate-500">Due Date: {dueDate}</p>
                                        )}
                                        {showPaymentStatus && (
                                            <div className="mt-1">
                                                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                    status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                    Status: {status}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Customer / Consignee Block */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8 flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">BILLED TO (BUYER / RECIPIENT):</span>
                                    <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase">{customerName || 'Valued Client'}</h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-line">{billingAddress || 'Site Location'}</p>
                                    {phone && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ph: {phone}</p>}
                                    {gstin && <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-1">GSTIN: {gstin} ({customerState})</p>}
                                </div>
                                {(showNetDays || (showDueDate && dueDate)) && (
                                    <div className="text-left sm:text-right">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">INVOICE SUMMARY:</span>
                                        {showNetDays && (
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                Terms: {netDays ? (netDays.toLowerCase().includes('net') ? netDays : `Net ${netDays} Days`) : 'Immediate'}
                                            </p>
                                        )}
                                        {showDueDate && dueDate && (
                                            <p className="text-xs text-slate-500">Due: {dueDate}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Invoice Table with Curly Brace Combined Billing */}
                            <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr 
                                            className="text-[10px] font-black uppercase tracking-wider text-white"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            <th className="p-3 w-12 text-left">Sr.</th>
                                            <th className="p-3 text-left">Description of Goods / Services</th>
                                            {showQuantity && <th className="p-3 text-center">Qty</th>}
                                            {showUnitPrice && <th className="p-3 text-right">Unit Price</th>}
                                            <th className="p-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <CombinedBillTableBody
                                        items={items}
                                        combinedTotals={combinedTotals}
                                        theme={theme.toLowerCase()}
                                        tableBorderColor="#e2e8f0"
                                        textColor={theme === 'Minimalist' ? '#0f172a' : 'inherit'}
                                        enableUnitPrice={showUnitPrice}
                                        enableQuantity={showQuantity}
                                    />
                                </table>
                            </div>

                            {/* Summary & QR Code Block */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
                                <div className="flex-1 space-y-4">
                                    {showTerms && termsText && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">TERMS & CONDITIONS:</span>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed font-medium">
                                                {termsText}
                                            </p>
                                        </div>
                                    )}

                                    {showNotes && invoiceNotes && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">REMARKS & SPECIFICATIONS:</span>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-line">
                                                {invoiceNotes}
                                            </p>
                                        </div>
                                    )}

                                    {/* QR Code for Instant UPI Payment */}
                                    {showQrCode && calculatedBalanceDue > 0 && (
                                        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
                                            <img src={upiQrImgUrl} alt="UPI QR" className="w-20 h-20 rounded-xl bg-white p-1 border shadow-sm" />
                                            <div>
                                                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                                                    <QrCode className="w-4 h-4" /> Scan & Pay via UPI
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-0.5">Google Pay / PhonePe / Paytm / BHIM</p>
                                                <p className="text-xs font-black text-slate-900 dark:text-white mt-1">
                                                    Amount: {formatCurrencyINR(calculatedBalanceDue)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full sm:w-72 space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                        <span className="font-bold text-slate-500">Subtotal:</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrencyINR(financials.subtotal)}</span>
                                    </div>

                                    {financials.discountAmount > 0 && (
                                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-rose-600 font-bold">
                                            <span>Discount ({discountType === 'percent' ? `${discountValue}%` : 'Fixed'}):</span>
                                            <span>-{formatCurrencyINR(financials.discountAmount)}</span>
                                        </div>
                                    )}

                                    {showTax && (
                                        <>
                                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600">
                                                <span>Taxable Amount:</span>
                                                <span className="font-bold">{formatCurrencyINR(financials.taxableAmount)}</span>
                                            </div>
                                            {taxType === 'GST_SPLIT' ? (
                                                <>
                                                    <div className="flex justify-between py-0.5 text-slate-500 text-[11px]">
                                                        <span>CGST ({(taxPercentage / 2).toFixed(1)}%):</span>
                                                        <span>{formatCurrencyINR(financials.taxAmount / 2)}</span>
                                                    </div>
                                                    <div className="flex justify-between py-0.5 text-slate-500 text-[11px] border-b border-slate-100 dark:border-slate-800">
                                                        <span>SGST ({(taxPercentage / 2).toFixed(1)}%):</span>
                                                        <span>{formatCurrencyINR(financials.taxAmount / 2)}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600">
                                                    <span>IGST ({taxPercentage}%):</span>
                                                    <span>{formatCurrencyINR(financials.taxAmount)}</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="flex justify-between py-2 text-base font-black text-slate-900 dark:text-white border-t-2 border-slate-900 dark:border-slate-100 pt-2">
                                        <span>Invoice Total:</span>
                                        <span style={{ color: themeColor }}>{formatCurrencyINR(financials.grandTotal)}</span>
                                    </div>

                                    {status === 'Partially Paid' && (
                                        <>
                                            <div className="flex justify-between py-1 text-emerald-600 font-bold border-b border-slate-100 dark:border-slate-800">
                                                <span>Amount Received:</span>
                                                <span>{formatCurrencyINR(paidAmount)}</span>
                                            </div>
                                            <div className="flex justify-between py-1 text-rose-600 font-black text-sm">
                                                <span>Balance Pending:</span>
                                                <span>{formatCurrencyINR(calculatedBalanceDue)}</span>
                                            </div>
                                        </>
                                    )}

                                    <div className="pt-2 text-[10px] text-slate-500 italic">
                                        Amount in Words: {financials.amountInWords}
                                    </div>
                                </div>
                            </div>

                            {/* Signatures */}
                            {showSignature && (
                                <div className="flex justify-between items-end pt-4">
                                    <div className="text-left text-[10px] text-slate-400 font-medium">
                                        <p>Invoice Ref: {invoiceNumber}</p>
                                        <p>Original for Recipient</p>
                                    </div>
                                    <div className="text-right border-t border-slate-300 dark:border-slate-600 pt-3 w-52">
                                        {brandingSettings.company_signature && (
                                            <img src={brandingSettings.company_signature} alt="Digital Signature" className="h-10 w-auto object-contain ml-auto mb-1" />
                                        )}
                                        <div className="flex items-center justify-end gap-1 text-emerald-600 mb-1">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span className="text-[9px] font-black uppercase">
                                                {showTax ? 'Verified Tax Invoice' : 'Verified Commercial Invoice'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black uppercase text-slate-900 dark:text-white">Authorized Signatory</p>
                                        <p className="text-[10px] text-slate-400 font-medium">Krishna Engineering Works</p>
                                    </div>
                                </div>
                            )}

                            {/* Footer remarks */}
                            {showFooter && footerRemarks && (
                                <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                                    {footerRemarks}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* Catalog Modal */}
            <AnimatePresence>
                {showCatalogModal && (
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
                                        <Tag className="w-4 h-4 text-indigo-500" /> Standard Product & Service Catalog
                                    </h3>
                                    <p className="text-xs text-slate-500">Pick any engineering item to automatically populate line item description and rates.</p>
                                </div>
                                <button
                                    onClick={() => setShowCatalogModal(false)}
                                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
                                    <Search className="w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={catalogSearch}
                                        onChange={(e) => setCatalogSearch(e.target.value)}
                                        placeholder="Search steel beams, roof sheets, welding, trusses..."
                                        className="bg-transparent border-0 w-full p-0 focus:ring-0 text-slate-800 dark:text-slate-200 font-bold"
                                    />
                                </div>
                                <select
                                    value={catalogCategory}
                                    onChange={(e) => setCatalogCategory(e.target.value)}
                                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                >
                                    <option value="All">All Categories</option>
                                    <option value="Structural Steel">Structural Steel</option>
                                    <option value="Roofing & Cladding">Roofing & Cladding</option>
                                    <option value="Fabrication & Labor">Fabrication & Labor</option>
                                    <option value="Transport & Logistics">Transport & Logistics</option>
                                    <option value="Rental Assets">Rental Assets</option>
                                </select>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {PRECONFIGURED_CATALOG
                                    .filter(item => {
                                        const matchesSearch = !catalogSearch || 
                                            item.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                                            item.description.toLowerCase().includes(catalogSearch.toLowerCase());
                                        const matchesCat = catalogCategory === 'All' || item.category === catalogCategory;
                                        return matchesSearch && matchesCat;
                                    })
                                    .map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => handleInsertCatalogItem(item)}
                                            className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700/70 hover:border-indigo-300 rounded-2xl cursor-pointer transition flex items-center justify-between gap-4 group"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                                                        {item.category}
                                                    </span>
                                                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600">
                                                        {item.name}
                                                    </h4>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.description}</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-xs font-black text-slate-900 dark:text-white">{formatCurrencyINR(item.price)}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">per {item.unit}</p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                        <History className="w-4 h-4 text-indigo-500" /> Saved Invoices Vault
                                    </h3>
                                    <p className="text-xs text-slate-500">Pick any previously saved invoice to load or duplicate.</p>
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
                                    <div className="p-8 text-center text-xs font-bold text-slate-400">Loading saved invoices...</div>
                                ) : savedInvoices.length === 0 ? (
                                    <div className="p-8 text-center text-xs font-bold text-slate-400">No saved invoices found in document history.</div>
                                ) : (
                                    savedInvoices.map(doc => (
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
                                                        {doc.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                                                    {doc.data?.customerName || 'Unnamed Client'}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    Total: {formatCurrencyINR(doc.totalAmount || 0)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => applyInvoiceData(doc.data, false)}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition"
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    onClick={() => applyInvoiceData(doc.data, true)}
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

export default Invoices;
