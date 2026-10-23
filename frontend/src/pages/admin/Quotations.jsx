import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Printer, Plus, Trash2, User, Calendar, Hash, FileText, 
    Palette, Clock, CheckCircle, ShieldCheck, DollarSign, Layers,
    Save, History, CheckCircle2, AlertCircle, Copy, RotateCcw, 
    Search, X, Tag, Percent, Eye, EyeOff, FolderPlus, Split, ArrowRight,
    Columns, Maximize2, Minimize2, Sparkles, Check
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';
import { numberToIndianRupees } from '../../utils/numberToIndianRupees';
import { formatCurrencyINR } from '../../utils/pdfHelpers';
import { PRECONFIGURED_CATALOG, computeBillFinancials, computeItemSectionMeta, calculateBillTotals, synchronizeItemSections } from '../../utils/combinedBillHelper';
import CombinedBillTableBody from '../../components/CombinedBillTable';
import EstimationEntryTable from '../../components/EstimationEntryTable';

const generateQuotationNumber = () => `QTN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

const Quotations = () => {
    const { user } = useAuthStore();
    const [customers, setCustomers] = useState([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [workspaceViewMode, setWorkspaceViewMode] = useState('editor'); // 'editor' (default full width) | 'preview' | 'split'

    // Core Estimation Structure
    const [quotationNumber, setQuotationNumber] = useState(generateQuotationNumber());
    const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
    const [proposalValidityDate, setProposalValidityDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    const [showValidityDate, setShowValidityDate] = useState(true);
    const [tagline, setTagline] = useState('Heavy PEB Structures, Industrial Roofing & High-Tensile Fabrication');
    const [showTagline, setShowTagline] = useState(true);

    // Client Information Lookup
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientGstin, setClientGstin] = useState('');
    const [clientState, setClientState] = useState('Kerala (32)');

    // Line Items & Combined Sections
    const [isCombinedMode, setIsCombinedMode] = useState(false);
    const [items, setItems] = useState([
        { id: 1, type: 'Item', name: 'Industrial Heavy Truss Fabrication', description: 'Custom engineered ISMB steel truss structure for factory roof', price: 120000, rate: 120000, quantity: 1, unit: 'Units', hasQuantity: true, hasUnitPrice: true, isCombined: false },
        { id: 2, type: 'Service', name: 'On-site Erection & Installation Labor', description: 'Crane operations and high-elevation alignment work', price: 25000, rate: 25000, quantity: 1, unit: 'Job', hasQuantity: true, hasUnitPrice: true, isCombined: false }
    ]);
    const [combinedTotals, setCombinedTotals] = useState({});

    // Discount & Financials
    const [discountType, setDiscountType] = useState('none'); // 'none' | 'percent' | 'fixed'
    const [discountValue, setDiscountValue] = useState(0);
    const [taxPercentage, setTaxPercentage] = useState(18);
    const [taxType, setTaxType] = useState('GST_SPLIT'); // 'GST_SPLIT' (CGST+SGST) | 'IGST'

    // Granular Column Controls
    const [showUnitPrice, setShowUnitPrice] = useState(true);
    const [showQuantity, setShowQuantity] = useState(true);

    // Custom Display Toggles
    const [showTax, setShowTax] = useState(true);
    const [showTerms, setShowTerms] = useState(true);
    const [showPaymentTerms, setShowPaymentTerms] = useState(true);
    const [showSignature, setShowSignature] = useState(true);
    const [showNotes, setShowNotes] = useState(true);
    const [showFooter, setShowFooter] = useState(true);

    // Disclaimers & Notes
    const [disclaimers, setDisclaimers] = useState(
        '1. Quotation valid for 30 days from issue date.\n2. 50% advance along with confirmed purchase order.\n3. Balance 50% against delivery / installation completion.\n4. Standard GST (18%) applicable extra.'
    );
    const [paymentTerms, setPaymentTerms] = useState('Payment via Bank NEFT/RTGS to Krishna Engineering Works, SBI Sreekrishnapuram. UPI: krishnaengg@sbi');
    const [projectNotes, setProjectNotes] = useState('All material testing certificates will be supplied prior to dispatch. Site power supply to be provided by client.');
    const [timelines, setTimelines] = useState('21 Working Days from receipt of advance payment and drawing approval.');
    const [footerRemarks, setFooterRemarks] = useState('Krishna Engineering Works — Excellence in Pre-Engineered Buildings & Industrial Heavy Fabrication');

    // Custom Print Configuration
    const [theme, setTheme] = useState('Classic'); // Classic, Modern, Minimalist
    const [themeColor, setThemeColor] = useState('#4f46e5');
    const [brandingSettings, setBrandingSettings] = useState({ company_logo: '', company_signature: '' });

    // Product Autocomplete / Catalog Modal State
    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Document History Modal State (Load & Search Existing)
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [savedQuotations, setSavedQuotations] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Save to History State
    const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
    const [toastMsg, setToastMsg] = useState('');
    const toastTimerRef = useRef(null);

    // Auto-Save & Crash Protection State
    const DRAFT_STORAGE_KEY = 'krishna_draft_quotation_v1';
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
                        (parsed.data.clientName && parsed.data.clientName.trim()) ||
                        (Array.isArray(parsed.data.items) && parsed.data.items.some(i => (i.name || i.description || '').trim() || i.price > 0 || i.rate > 0))
                    )
                );
                if (hasMeaningful) {
                    setRecoveredDraft(parsed);
                }
            }
        } catch (e) {
            console.warn('Quotation draft recovery error', e);
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
            console.error("Failed to fetch customers for quotations", err);
        } finally {
            setLoadingCustomers(false);
        }
    };

    const checkDuplicatedDoc = () => {
        try {
            const type = localStorage.getItem('duplicated_doc_type');
            const dataStr = localStorage.getItem('duplicated_doc_data');
            if (type === 'Quotation' && dataStr) {
                const parsed = JSON.parse(dataStr);
                applyQuotationData(parsed, true);
                localStorage.removeItem('duplicated_doc_type');
                localStorage.removeItem('duplicated_doc_data');
                showToast('✓ Cloned quotation loaded into studio.', 'saved');
            }
        } catch (e) {
            console.warn('Duplication restore error', e);
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
            setClientState(cust.state || 'Kerala (32)');
        }
    };

    const handleUpdateItem = (index, field, value) => {
        setItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            if (field === 'price') next[index].rate = value;
            if (field === 'rate') next[index].price = value;
            if (field === 'description') next[index].name = value;
            if (field === 'name') next[index].description = value;
            return synchronizeItemSections(next);
        });
    };

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            { id: Date.now() + Math.random(), name: '', description: '', price: 0, rate: 0, quantity: 1, unit: 'Units', hasQuantity: true, hasUnitPrice: true, isCombined: false }
        ]);
    };

    const handleAddNewCombinedSection = () => {
        const secId = `sec-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        setCombinedTotals(prev => ({ ...prev, [secId]: 0 }));
        setItems(prev => [
            ...prev,
            { id: Date.now() + Math.random(), name: '', description: '', price: 0, rate: 0, quantity: 1, unit: 'Units', hasQuantity: true, hasUnitPrice: true, isCombined: true, isCombinedMode: true, combinedSectionId: secId, isNewSectionStart: true }
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

    const handleCombinedTotalChange = (sectionId, value) => {
        setCombinedTotals(prev => ({
            ...prev,
            [sectionId]: parseFloat(value) || 0
        }));
    };

    // Insert from Catalog
    const handleInsertCatalogItem = (catItem) => {
        setItems(prev => [
            ...prev,
            {
                id: Date.now() + Math.random(),
                type: catItem.category === 'Fabrication & Labor' ? 'Service' : 'Item',
                name: catItem.name,
                description: catItem.description,
                price: catItem.price,
                rate: catItem.price,
                quantity: 1,
                unit: catItem.unit,
                isCombined: false
            }
        ]);
        setShowCatalogModal(false);
        showToast(`✓ Added "${catItem.name}" to quotation.`);
    };

    // Financial Calculation with combined helper
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

    const showToast = (msg, type = 'saved') => {
        setToastMsg(msg);
        setSaveState(type === 'error' ? 'error' : 'saved');
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
            setSaveState('idle');
            setToastMsg('');
        }, 3500);
    };

    // Duplicate current quotation
    const handleDuplicateQuotation = () => {
        setQuotationNumber(generateQuotationNumber());
        setQuotationDate(new Date().toISOString().split('T')[0]);
        setProposalValidityDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
        showToast('✓ Duplicated into new quotation number with updated validity.');
    };

    // Reset current quotation
    const handleResetQuotation = () => {
        if (!window.confirm('Reset this quotation and start fresh? All unsaved inputs will be cleared.')) return;
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setRecoveredDraft(null);
        setLastAutoSavedTime(null);
        setQuotationNumber(generateQuotationNumber());
        setQuotationDate(new Date().toISOString().split('T')[0]);
        setProposalValidityDate(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
        setShowValidityDate(true);
        setTagline(brandingSettings?.company_tagline || brandingSettings?.tagline || 'Heavy PEB Structures, Industrial Roofing & High-Tensile Fabrication');
        setShowTagline(true);
        setSelectedCustomerId('');
        setClientName('');
        setClientAddress('');
        setClientPhone('');
        setClientGstin('');
        setItems([{ id: Date.now(), type: 'Item', name: '', description: '', rate: 0, quantity: 1, unit: 'Units' }]);
        setDiscountType('none');
        setDiscountValue(0);
        showToast('✓ Quotation studio reset.');
    };

    // Fetch saved quotations from Document History
    const handleOpenHistoryModal = async () => {
        setShowHistoryModal(true);
        setLoadingHistory(true);
        try {
            const res = await api.get('/document-history', { params: { category: 'Quotations', limit: 20 } });
            setSavedQuotations(res.data.documents || []);
        } catch (e) {
            console.error('Failed to load quotation history:', e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const applyQuotationData = (data, isClone = false) => {
        if (!data) return;
        if (!isClone) {
            setQuotationNumber(data.quotationNumber || generateQuotationNumber());
            setQuotationDate(data.quotationDate || new Date().toISOString().split('T')[0]);
        } else {
            setQuotationNumber(generateQuotationNumber());
            setQuotationDate(new Date().toISOString().split('T')[0]);
        }
        setProposalValidityDate(data.proposalValidityDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
        if (data.showValidityDate !== undefined) setShowValidityDate(data.showValidityDate);
        if (data.tagline !== undefined) setTagline(data.tagline);
        if (data.showTagline !== undefined) setShowTagline(data.showTagline);
        setClientName(data.clientName || '');
        setClientAddress(data.clientAddress || '');
        setClientPhone(data.clientPhone || '');
        setClientGstin(data.clientGstin || '');
        setClientState(data.clientState || 'Kerala (32)');
        setSelectedCustomerId(data.selectedCustomerId || '');
        if (Array.isArray(data.items) && data.items.length > 0) {
            setItems(data.items);
            if (data.items.some(i => i.sectionName || i.isCombined || i.isCombinedMode)) {
                setIsCombinedMode(true);
            }
        }
        if (data.combinedTotals) setCombinedTotals(data.combinedTotals);
        if (data.discountType) setDiscountType(data.discountType);
        if (data.discountValue !== undefined) setDiscountValue(data.discountValue);
        if (data.taxPercentage !== undefined) setTaxPercentage(data.taxPercentage);
        if (data.showTax !== undefined) setShowTax(data.showTax);
        if (data.showUnitPrice !== undefined) setShowUnitPrice(data.showUnitPrice);
        if (data.showQuantity !== undefined) setShowQuantity(data.showQuantity);
        if (data.theme) setTheme(data.theme);
        if (data.themeColor) setThemeColor(data.themeColor);
        if (data.disclaimers) setDisclaimers(data.disclaimers);
        if (data.paymentTerms) setPaymentTerms(data.paymentTerms);
        if (data.timelines) setTimelines(data.timelines);
        if (data.projectNotes) setProjectNotes(data.projectNotes);
        if (data.footerRemarks) setFooterRemarks(data.footerRemarks);
        setShowHistoryModal(false);
    };

    // Auto-save helper payload
    const getDraftData = () => ({
        quotationNumber,
        quotationDate,
        proposalValidityDate,
        showValidityDate,
        tagline,
        showTagline,
        selectedCustomerId,
        clientName,
        clientAddress,
        clientPhone,
        clientGstin,
        clientState,
        isCombinedMode,
        items,
        combinedTotals,
        discountType,
        discountValue,
        taxPercentage,
        taxType,
        showTax,
        showUnitPrice,
        showQuantity,
        showTerms,
        showPaymentTerms,
        showSignature,
        showNotes,
        showFooter,
        disclaimers,
        paymentTerms,
        projectNotes,
        timelines,
        footerRemarks,
        theme,
        themeColor
    });

    // Auto-save to localStorage on change (debounced 1.2s)
    useEffect(() => {
        const hasContent = Boolean(
            (clientName && clientName.trim()) ||
            (items && items.some(i => (i.name || i.description || '').trim() || i.price > 0 || i.rate > 0))
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
                console.warn('Quotation auto-save error', e);
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [
        quotationNumber, quotationDate, proposalValidityDate, showValidityDate, selectedCustomerId,
        clientName, clientAddress, clientPhone, clientGstin, clientState, isCombinedMode,
        items, combinedTotals, discountType, discountValue, taxPercentage, taxType, showTax,
        showUnitPrice, showQuantity, showTerms, showPaymentTerms, showSignature, showNotes,
        showFooter, disclaimers, paymentTerms, projectNotes, timelines, footerRemarks, theme, themeColor
    ]);

    // Save immediately on beforeunload (accidental close or crash protection)
    useEffect(() => {
        const handleBeforeUnload = () => {
            const hasContent = Boolean(
                (clientName && clientName.trim()) ||
                (items && items.some(i => (i.name || i.description || '').trim() || i.price > 0 || i.rate > 0))
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
    }, [clientName, items, quotationNumber, proposalValidityDate, showValidityDate]);

    // Background auto-save to Document History vault (debounced 6s if basic fields present)
    useEffect(() => {
        if (!clientName?.trim() || !items || items.length === 0 || items.every(i => !((i.name || i.description || '').trim()))) return;
        const cloudTimer = setTimeout(() => {
            handleSaveToHistory('autosave');
        }, 6000);
        return () => clearTimeout(cloudTimer);
    }, [clientName, items, quotationNumber, totals.totalAmount]);

    const handleRestoreDraft = () => {
        if (recoveredDraft?.data) {
            applyQuotationData(recoveredDraft.data, false);
            showToast(`✓ Restored auto-saved draft from ${new Date(recoveredDraft.savedAt).toLocaleTimeString()}`);
        }
        setRecoveredDraft(null);
    };

    const handleDiscardDraft = () => {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        setRecoveredDraft(null);
        showToast('Auto-saved draft discarded.');
    };

    // Save to History
    const handleSaveToHistory = async (triggeredBy = 'manual') => {
        if (!quotationNumber.trim()) {
            if (triggeredBy !== 'autosave') showToast('Please enter a Quotation Number before saving.', 'error');
            return false;
        }
        if (!clientName.trim()) {
            if (triggeredBy !== 'autosave') showToast('Please enter a Client Name before saving.', 'error');
            return false;
        }
        if (items.length === 0 || items.every(i => !((i.name || i.description || '').trim()))) {
            if (triggeredBy !== 'autosave') showToast('Add at least one line item before saving.', 'error');
            return false;
        }

        if (triggeredBy !== 'autosave') setSaveState('saving');
        try {
            const payload = {
                documentType: 'Quotation',
                documentNumber: quotationNumber.trim(),
                customerId: selectedCustomerId || undefined,
                status: 'Draft',
                totalAmount: financials.grandTotal,
                preparedBy: user?.name || '',
                data: {
                    quotationNumber,
                    quotationDate,
                    proposalValidityDate,
                    showValidityDate,
                    tagline,
                    showTagline,
                    clientName,
                    clientAddress,
                    clientPhone,
                    clientGstin,
                    clientState,
                    selectedCustomerId,
                    isCombinedMode,
                    items,
                    combinedTotals,
                    discountType,
                    discountValue,
                    discountAmount: financials.discountAmount,
                    taxPercentage,
                    taxType,
                    showTax,
                    showUnitPrice,
                    showQuantity,
                    showTerms,
                    showPaymentTerms,
                    showSignature,
                    showNotes,
                    showFooter,
                    disclaimers,
                    paymentTerms,
                    projectNotes,
                    timelines,
                    footerRemarks,
                    theme,
                    themeColor,
                    subtotal: financials.subtotal,
                    taxableAmount: financials.taxableAmount,
                    taxAmount: financials.taxAmount,
                    grandTotal: financials.grandTotal,
                    amountInWords: financials.amountInWords,
                    savedAt: new Date().toISOString(),
                    savedBy: triggeredBy
                }
            };

            await api.post('/document-history/save', payload);
            if (triggeredBy !== 'autosave') {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
                setRecoveredDraft(null);
                showToast(
                    triggeredBy === 'print'
                        ? '✓ Quotation auto-saved before printing.'
                        : `✓ Quotation ${quotationNumber} saved to Document History.`
                );
            } else {
                setLastAutoSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }
            return true;
        } catch (err) {
            console.error('Save to history failed:', err);
            if (triggeredBy !== 'autosave') showToast('Failed to save quotation. Please try again.', 'error');
            return false;
        }
    };

    const handlePrint = async () => {
        await handleSaveToHistory('print');
        window.print();
    };



    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8 font-sans">
            {/* Toast Notification */}
            <AnimatePresence>
                {(saveState === 'saved' || saveState === 'error') && toastMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border text-sm font-bold max-w-sm ${
                            saveState === 'error'
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}
                    >
                        {saveState === 'error' 
                            ? <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            : <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        }
                        {toastMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Auto-Save Crash Recovery Banner */}
            {recoveredDraft && (
                <div className="no-print mb-4 p-4 bg-gradient-to-r from-amber-500/15 via-indigo-500/10 to-emerald-500/15 border-2 border-amber-400 dark:border-amber-500/60 rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                Unsaved Quotation Recovered
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                                    Crash Protection Active
                                </span>
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                                We found an auto-saved draft from <strong>{new Date(recoveredDraft.savedAt).toLocaleString()}</strong> with client <em>"{recoveredDraft.data?.clientName || 'Unnamed'}"</em> and {recoveredDraft.data?.items?.length || 0} line items.
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
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <FileText className="w-4 h-4" /> Cost Estimation & Quotation Engine
                        </div>
                        {lastAutoSavedTime && (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Draft auto-saved {lastAutoSavedTime}
                            </span>
                        )}
                    </div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                        Quotation Studio
                    </h1>
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
                        onClick={handleDuplicateQuotation}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                        title="Clone current quotation with new QTN number"
                    >
                        <Copy className="w-4 h-4" /> Clone
                    </button>

                    {/* Reset */}
                    <button
                        onClick={handleResetQuotation}
                        className="bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 px-3 py-2 sm:px-3 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                        title="Clear and start new"
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

                    {/* Save to History Button */}
                    <button
                        id="save-quotation-history-btn"
                        onClick={() => handleSaveToHistory('manual')}
                        disabled={saveState === 'saving'}
                        className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition border ${
                            saveState === 'saving'
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                        }`}
                    >
                        <Save className="w-4 h-4" /> Save
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
                        id="print-quotation-btn"
                        onClick={handlePrint}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                </div>
            </div>

            {/* Main Studio Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: Controls & Form */}
                {workspaceViewMode !== 'preview' && (
                    <div className={`no-print space-y-6 ${workspaceViewMode === 'editor' ? 'col-span-12' : 'lg:col-span-7 xl:col-span-7'}`}>
                    {/* Metadata */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-indigo-500" /> Estimation Metadata
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Quotation Number</label>
                                <input
                                    type="text"
                                    value={quotationNumber}
                                    onChange={(e) => setQuotationNumber(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Quotation Date</label>
                                <input
                                    type="date"
                                    value={quotationDate}
                                    onChange={(e) => setQuotationDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Proposal Validity Date</label>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={showValidityDate}
                                        onChange={(e) => setShowValidityDate(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                                    />
                                    Include Validity
                                </label>
                            </div>
                            <input
                                type="date"
                                disabled={!showValidityDate}
                                value={proposalValidityDate}
                                onChange={(e) => setProposalValidityDate(e.target.value)}
                                className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition ${
                                    !showValidityDate ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-850' : ''
                                }`}
                            />
                        </div>

                        <div className="pt-1">
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
                    </div>

                    {/* Customer Autofill */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-500" /> Customer Auto-fill & Details
                        </h2>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Select Customer from Master</label>
                            <select
                                value={selectedCustomerId}
                                onChange={handleSelectClient}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="">-- Choose Existing Customer or Type Below --</option>
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
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Enter Customer or Company Name"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Site / Billing Address</label>
                                <textarea
                                    rows="2"
                                    value={clientAddress}
                                    onChange={(e) => setClientAddress(e.target.value)}
                                    placeholder="Complete Site / Billing Location Address"
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Phone</label>
                                    <input
                                        type="text"
                                        value={clientPhone}
                                        onChange={(e) => setClientPhone(e.target.value)}
                                        placeholder="Phone Number"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">GSTIN</label>
                                    <input
                                        type="text"
                                        value={clientGstin}
                                        onChange={(e) => setClientGstin(e.target.value)}
                                        placeholder="GSTIN (e.g. 32AAAAA0000A1Z5)"
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Estimation Line Items & Combined Sections Entry Table */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-500" /> Estimation Line Items ({items.length})
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setWorkspaceViewMode(workspaceViewMode === 'preview' ? 'editor' : 'preview')}
                                    className="text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                                    title="View generated quotation document"
                                >
                                    <Eye className="w-3.5 h-3.5" /> View Live Preview
                                </button>
                                <span className="text-[10px] font-bold text-slate-400">
                                    {items.filter(i => i.isCombined || i.isCombinedMode).length > 0 ? '✓ Combined billing' : 'Standard items'}
                                </span>
                            </div>
                        </div>

                        <EstimationEntryTable
                            items={items}
                            combinedTotals={combinedTotals}
                            enableUnitPrice={showUnitPrice}
                            onToggleEnableUnitPrice={setShowUnitPrice}
                            enableQuantity={showQuantity}
                            onToggleEnableQuantity={setShowQuantity}
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

                    {/* Financial Calculations & Discounts */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-indigo-500" /> Discounts, Taxes & Financials
                        </h2>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Discount Mode</label>
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
                                        {discountType === 'percent' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
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
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">GST Rate (%)</label>
                                <select
                                    value={taxPercentage}
                                    onChange={(e) => setTaxPercentage(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                >
                                    <option value="0">0% (Nil / Exempt)</option>
                                    <option value="5">5% (Concessional)</option>
                                    <option value="12">12% (Standard Low)</option>
                                    <option value="18">18% (Standard Engineering)</option>
                                    <option value="28">28% (Luxury / High)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">GST Classification</label>
                                <select
                                    value={taxType}
                                    onChange={(e) => setTaxType(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                                >
                                    <option value="GST_SPLIT">CGST + SGST (Intra-State Kerala)</option>
                                    <option value="IGST">IGST (Inter-State Supply)</option>
                                </select>
                            </div>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                <span>Subtotal:</span>
                                <span className="font-bold text-slate-900 dark:text-white">{formatCurrencyINR(financials.subtotal)}</span>
                            </div>
                            {financials.discountAmount > 0 && (
                                <div className="flex justify-between text-rose-600 font-medium">
                                    <span>Discount ({discountType === 'percent' ? `${discountValue}%` : 'Fixed'}):</span>
                                    <span>-{formatCurrencyINR(financials.discountAmount)}</span>
                                </div>
                            )}
                            {showTax && (
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Tax ({taxPercentage}%):</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrencyINR(financials.taxAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm font-black text-indigo-600 dark:text-indigo-400 border-t border-slate-200 dark:border-slate-700 pt-2">
                                <span>Grand Total:</span>
                                <span>{formatCurrencyINR(financials.grandTotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Disclaimers, Timelines & Terms */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-500" /> Disclaimers, Timelines & Notes
                        </h2>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Standard Terms & Conditions</label>
                            <textarea
                                rows="3"
                                value={disclaimers}
                                onChange={(e) => setDisclaimers(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Payment Terms</label>
                            <textarea
                                rows="2"
                                value={paymentTerms}
                                onChange={(e) => setPaymentTerms(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Project Execution Timeline</label>
                            <input
                                type="text"
                                value={timelines}
                                onChange={(e) => setTimelines(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">Additional Project Notes</label>
                            <textarea
                                rows="2"
                                value={projectNotes}
                                onChange={(e) => setProjectNotes(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Display Toggles & Themes */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-indigo-500" /> Multi-Theme & Display Toggles
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
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Theme Color Accent:</label>
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
                                    checked={showValidityDate}
                                    onChange={(e) => setShowValidityDate(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Validity Date
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
                                    checked={showPaymentTerms}
                                    onChange={(e) => setShowPaymentTerms(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Payment Terms
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showNotes}
                                    onChange={(e) => setShowNotes(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600"
                                />
                                Project Notes
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
                                <Eye className="w-4 h-4" /> Preview Quotation Document
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
                                onClick={() => handleSaveToHistory('manual')}
                                disabled={saveState === 'saving'}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition"
                            >
                                <Save className="w-4 h-4" /> {saveState === 'saving' ? 'Saving...' : 'Save Quotation'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RIGHT: Real-time Live Document Preview */}
            {workspaceViewMode !== 'editor' && (
                <div className={workspaceViewMode === 'preview' ? 'col-span-12 max-w-4xl mx-auto' : 'lg:col-span-5 xl:col-span-5'}>
                    <div className="sticky top-6">
                        {/* Live Badge */}
                        <div className="no-print flex items-center justify-between bg-slate-900 text-white px-6 py-3 rounded-t-3xl border-b border-slate-800">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Live Quotation Preview ({theme})
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setWorkspaceViewMode('editor')}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow"
                                >
                                    <FileText className="w-3.5 h-3.5" /> Back to Line Items
                                </button>
                                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold hidden sm:inline">Keystroke Synced</span>
                            </div>
                        </div>

                        {/* Proposal Document */}
                        <div 
                            className="print-document-container bg-white dark:bg-slate-900 p-8 md:p-12 shadow-2xl rounded-b-3xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-sans"
                            style={{ '--theme-color': themeColor }}
                        >
                            {/* Header Rendering */}
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
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <span className="bg-white/20 backdrop-blur px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest inline-block mb-1">
                                                QUOTATION
                                            </span>
                                            <p className="text-sm font-black">{quotationNumber}</p>
                                            <p className="text-xs opacity-80">Date: {quotationDate}</p>
                                            {showValidityDate && proposalValidityDate && (
                                                <p className="text-xs opacity-80">Valid Until: {proposalValidityDate}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : theme === 'Minimalist' ? (
                                <div className="border-b-2 border-slate-900 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        {brandingSettings.company_logo && (
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
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: themeColor }}>QUOTATION</h2>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{quotationNumber}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Date: {quotationDate}</p>
                                        {showValidityDate && proposalValidityDate && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Valid Until: {proposalValidityDate}</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Classic Theme */
                                <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-8 flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        {brandingSettings.company_logo && (
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
                                            COST ESTIMATE
                                        </span>
                                        <p className="text-xs font-black text-slate-900 dark:text-white">{quotationNumber}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Date: {quotationDate}</p>
                                        {showValidityDate && proposalValidityDate && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Valid Until: {proposalValidityDate}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Client Block */}
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8 flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">PROPOSAL PREPARED FOR:</span>
                                    <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase">{clientName || 'Valued Client'}</h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-line">{clientAddress || 'Client Location'}</p>
                                    {clientPhone && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ph: {clientPhone}</p>}
                                    {clientGstin && <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-1">GSTIN: {clientGstin} ({clientState})</p>}
                                </div>
                                {showValidityDate && proposalValidityDate && (
                                    <div className="text-left sm:text-right">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">VALIDITY DATE:</span>
                                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 px-3 py-1 rounded-lg inline-block">
                                            {proposalValidityDate}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Quotation Table */}
                            <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr 
                                            className="text-[10px] font-black uppercase tracking-wider text-white"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            <th className="p-3 w-12 text-left">Sr.</th>
                                            <th className="p-3 text-left">Item / Service & Description</th>
                                            {showQuantity && <th className="p-3 text-center">Qty</th>}
                                            {showUnitPrice && <th className="p-3 text-right">Unit Rate</th>}
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

                            {/* Summary & Disclaimers */}
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
                                <div className="flex-1 space-y-4">
                                    {showNotes && timelines && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">ESTIMATED TIMELINE:</span>
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                {timelines}
                                            </p>
                                        </div>
                                    )}

                                    {showNotes && projectNotes && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">PROJECT NOTES:</span>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 whitespace-pre-line font-medium">
                                                {projectNotes}
                                            </p>
                                        </div>
                                    )}

                                    {showTerms && disclaimers && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">TERMS & CONDITIONS:</span>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed font-medium">
                                                {disclaimers}
                                            </p>
                                        </div>
                                    )}

                                    {showPaymentTerms && paymentTerms && (
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">PAYMENT TERMS:</span>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-800 font-medium">
                                                {paymentTerms}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full sm:w-72 space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                                        <span className="font-bold text-slate-500 dark:text-slate-400">Subtotal:</span>
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
                                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                                <span>Taxable Subtotal:</span>
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
                                                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                                    <span>IGST ({taxPercentage}%):</span>
                                                    <span>{formatCurrencyINR(financials.taxAmount)}</span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="flex justify-between py-2 text-base font-black text-slate-900 dark:text-white border-t-2 border-slate-900 dark:border-slate-100 pt-2">
                                        <span>Estimated Total:</span>
                                        <span style={{ color: themeColor }}>{formatCurrencyINR(financials.grandTotal)}</span>
                                    </div>

                                    <div className="pt-2 text-[10px] text-slate-500 dark:text-slate-400 italic">
                                        Amount in Words: {financials.amountInWords}
                                    </div>
                                </div>
                            </div>

                            {/* Signatures */}
                            {showSignature && (
                                <div className="flex justify-between items-end pt-4">
                                    <div className="text-left text-[10px] text-slate-400 font-medium">
                                        <p>Proposal Ref: {quotationNumber}</p>
                                        <p>Subject to Final Technical Site Audit</p>
                                    </div>
                                    <div className="text-right border-t border-slate-300 dark:border-slate-600 pt-3 w-52">
                                        {brandingSettings.company_signature && (
                                            <img src={brandingSettings.company_signature} alt="Digital Signature" className="h-10 w-auto object-contain ml-auto mb-1" />
                                        )}
                                        <div className="flex items-center justify-end gap-1 text-emerald-600 mb-1">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span className="text-[9px] font-black uppercase">Verified Proposal</span>
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

            {/* Catalog Selector Modal */}
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

                            {/* Search & Filter */}
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
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
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

                            {/* Catalog Items List */}
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {PRECONFIGURED_CATALOG
                                    .filter(item => {
                                        const matchesSearch = !catalogSearch || 
                                            item.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                                            item.description.toLowerCase().includes(catalogSearch.toLowerCase());
                                        const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
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
                                        <History className="w-4 h-4 text-indigo-500" /> Saved Quotations Vault
                                    </h3>
                                    <p className="text-xs text-slate-500">Pick any previously saved quotation to load or duplicate.</p>
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
                                    <div className="p-8 text-center text-xs font-bold text-slate-400">Loading saved quotations...</div>
                                ) : savedQuotations.length === 0 ? (
                                    <div className="p-8 text-center text-xs font-bold text-slate-400">No saved quotations found in document history.</div>
                                ) : (
                                    savedQuotations.map(doc => (
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
                                                </div>
                                                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                                                    {doc.data?.clientName || 'Unnamed Client'}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    {doc.data?.items?.length || 0} line items | Total: {formatCurrencyINR(doc.totalAmount || 0)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => applyQuotationData(doc.data, false)}
                                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition"
                                                >
                                                    Open
                                                </button>
                                                <button
                                                    onClick={() => applyQuotationData(doc.data, true)}
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

export default Quotations;
