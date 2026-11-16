import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Printer, Download, Save, Undo2, Redo2, Trash2, Plus, 
    AlignLeft, AlignCenter, AlignRight, AlignJustify, 
    Bold, Italic, Underline, Move, Check, X, Settings, 
    Eye, ZoomIn, ZoomOut, Maximize2, Minimize2, 
    MapPin, Phone, Mail, Globe, CheckCircle2, AlertCircle,
    Type, Image as ImageIcon, Copy, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    FileText, Sliders, Calendar, Building2, UserCheck
} from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../stores/authStore';

// Local storage key for drafts
const DRAFT_STORAGE_KEY = 'krishna_digital_letterpad_draft_v1';

// Default Company Header / Footer Details
const DEFAULT_HEADER = {
    companyName: 'KRISHNA ENGINEERING',
    subtitle: 'PRECISION ENGINEERING, INDUSTRIAL FABRICATION & HEAVY STRUCTURES',
    address: 'Thiruvazhiyode, Sreekrishnapuram, Palakkad, Kerala 679514',
    phone: '+91 94479 40835',
    email: 'contact@krishnaengg.com',
    website: 'www.krishnaengg.com',
    dateText: `Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    footerText: 'ISO 9001:2015 Certified  ◆  Registered MSME Enterprise  ◆  Precision Structural Fabrication & Industrial Engineering'
};

const FONT_FAMILIES = [
    { label: 'Inter (Modern Sans)', value: 'Inter, sans-serif' },
    { label: 'Times New Roman (Formal)', value: '"Times New Roman", Times, serif' },
    { label: 'Georgia (Classic Serif)', value: 'Georgia, serif' },
    { label: 'Arial (Clean Sans)', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Courier New (Monospace)', value: '"Courier New", Courier, monospace' },
    { label: 'Caveat (Calligraphy)', value: 'Caveat, cursive' },
    { label: 'Dancing Script (Handwritten)', value: '"Dancing Script", cursive' }
];

const PRESET_COLORS = [
    { label: 'Navy Blue', value: '#0F172A' },
    { label: 'Pure Black', value: '#000000' },
    { label: 'Dark Slate', value: '#334155' },
    { label: 'Royal Blue', value: '#1D4ED8' },
    { label: 'Amber Gold', value: '#D97706' },
    { label: 'Crimson Red', value: '#DC2626' }
];

const DigitalLetterPad = () => {
    const { user } = useAuthStore();

    // Letterhead Header / Footer State (Editable)
    const [headerData, setHeaderData] = useState(DEFAULT_HEADER);
    const [showHeaderSettings, setShowHeaderSettings] = useState(false);

    // Letter Content Blocks
    const [textBlocks, setTextBlocks] = useState([]);
    const [selectedBlockId, setSelectedBlockId] = useState(null);

    // Optional Recipient Address Block
    const [hasAddressBlock, setHasAddressBlock] = useState(false);
    const [addressData, setAddressData] = useState({
        toText: 'To,',
        name: 'The Managing Director / Recipient',
        organization: 'Industrial Procurement Division',
        street: 'Commercial Complex, NH 544',
        location: 'Palakkad, Kerala - 678001',
        x: 48,
        y: 200,
        fontSize: 13,
        fontFamily: 'Inter, sans-serif',
        color: '#0F172A',
        lineHeight: 1.4
    });

    // Optional Signature Block
    const [hasSignatureBlock, setHasSignatureBlock] = useState(false);
    const [signatureData, setSignatureData] = useState({
        type: 'typed', // 'typed' | 'image'
        signerName: user?.name || 'Authorized Signatory',
        designation: 'Managing Director / Krishna Engineering Works',
        typedFont: '"Dancing Script", cursive',
        signatureImage: null,
        imageWidth: 150,
        x: 480,
        y: 860,
        fontSize: 13,
        color: '#0F172A'
    });

    // Formatting Controls for Active Selection
    const [activeFormatting, setActiveFormatting] = useState({
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
        bold: false,
        italic: false,
        underline: false,
        color: '#0F172A',
        align: 'left',
        lineHeight: 1.5,
        letterSpacing: 0
    });

    // Undo / Redo History Stack
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isHistoryAction = useRef(false);

    // Workspace & Preview State
    const [viewMode, setViewMode] = useState('split'); // 'split' | 'editor' | 'preview'
    const [zoomScale, setZoomScale] = useState(1);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [saveState, setSaveState] = useState(''); // 'saving' | 'saved' | 'error'
    const [toastMessage, setToastMessage] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Print & Dragging references
    const printContainerRef = useRef(null);
    const letterAreaRef = useRef(null);
    const dragRef = useRef({ isDragging: false, blockId: null, startX: 0, startY: 0, initialX: 0, initialY: 0 });

    // Toast Helper
    const showToast = (msg, type = 'saved') => {
        setToastMessage(msg);
        setSaveState(type);
        setTimeout(() => {
            setSaveState('');
            setToastMessage('');
        }, 3500);
    };

    // Push State to History Stack
    const pushSnapshot = (stateObj) => {
        if (isHistoryAction.current) {
            isHistoryAction.current = false;
            return;
        }
        setHistory(prev => {
            const upToCurrent = prev.slice(0, historyIndex + 1);
            return [...upToCurrent, JSON.stringify(stateObj)];
        });
        setHistoryIndex(prev => prev + 1);
    };

    // Current State Snapshot
    const getCurrentState = () => ({
        headerData,
        textBlocks,
        hasAddressBlock,
        addressData,
        hasSignatureBlock,
        signatureData
    });

    // Save State Snapshot on key edits
    const recordChange = () => {
        pushSnapshot(getCurrentState());
    };

    // Initial History & LocalStorage Load
    useEffect(() => {
        try {
            const cached = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.headerData) setHeaderData(parsed.headerData);
                if (Array.isArray(parsed.textBlocks)) setTextBlocks(parsed.textBlocks);
                if (parsed.hasAddressBlock !== undefined) setHasAddressBlock(parsed.hasAddressBlock);
                if (parsed.addressData) setAddressData(parsed.addressData);
                if (parsed.hasSignatureBlock !== undefined) setHasSignatureBlock(parsed.hasSignatureBlock);
                if (parsed.signatureData) setSignatureData(parsed.signatureData);
                
                // Initialize History
                setHistory([JSON.stringify(parsed)]);
                setHistoryIndex(0);
            } else {
                // Initial Blank Letterhead State
                const initial = getCurrentState();
                setHistory([JSON.stringify(initial)]);
                setHistoryIndex(0);
            }
        } catch (err) {
            console.warn('Failed to load letterpad draft:', err);
        }
    }, []);

    // Auto-save debounced (1.5s)
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                const current = getCurrentState();
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(current));
            } catch (err) {
                console.warn('Auto-save letterpad error:', err);
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [headerData, textBlocks, hasAddressBlock, addressData, hasSignatureBlock, signatureData]);

    // Undo Handler
    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const snapshot = JSON.parse(history[newIndex]);
            isHistoryAction.current = true;
            setHeaderData(snapshot.headerData || DEFAULT_HEADER);
            setTextBlocks(snapshot.textBlocks || []);
            setHasAddressBlock(Boolean(snapshot.hasAddressBlock));
            setAddressData(snapshot.addressData || addressData);
            setHasSignatureBlock(Boolean(snapshot.hasSignatureBlock));
            setSignatureData(snapshot.signatureData || signatureData);
            setHistoryIndex(newIndex);
            setSelectedBlockId(null);
            showToast('Undo applied.');
        }
    };

    // Redo Handler
    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            const snapshot = JSON.parse(history[newIndex]);
            isHistoryAction.current = true;
            setHeaderData(snapshot.headerData || DEFAULT_HEADER);
            setTextBlocks(snapshot.textBlocks || []);
            setHasAddressBlock(Boolean(snapshot.hasAddressBlock));
            setAddressData(snapshot.addressData || addressData);
            setHasSignatureBlock(Boolean(snapshot.hasSignatureBlock));
            setSignatureData(snapshot.signatureData || signatureData);
            setHistoryIndex(newIndex);
            setSelectedBlockId(null);
            showToast('Redo applied.');
        }
    };

    // Clear Page Handler (Back to Blank Letterpad)
    const handleClearPage = () => {
        setTextBlocks([]);
        setHasAddressBlock(false);
        setHasSignatureBlock(false);
        setSelectedBlockId(null);
        setShowClearConfirm(false);
        recordChange();
        showToast('Letter area cleared.');
    };

    // Add New Text Box
    const handleAddTextBox = () => {
        const newId = `txt_${Date.now()}`;
        const newBlock = {
            id: newId,
            content: 'Type letter text here. You can format, drag, and resize this text block freely...',
            x: 48,
            y: (textBlocks.length > 0 ? (textBlocks[textBlocks.length - 1].y + 120) : 220),
            width: 700,
            fontSize: activeFormatting.fontSize,
            fontFamily: activeFormatting.fontFamily,
            bold: activeFormatting.bold,
            italic: activeFormatting.italic,
            underline: activeFormatting.underline,
            color: activeFormatting.color,
            align: activeFormatting.align,
            lineHeight: activeFormatting.lineHeight,
            letterSpacing: activeFormatting.letterSpacing
        };

        // Ensure inside letter bounds (between y=180 and y=980)
        if (newBlock.y > 900) newBlock.y = 220;

        const updated = [...textBlocks, newBlock];
        setTextBlocks(updated);
        setSelectedBlockId(newId);
        pushSnapshot({ ...getCurrentState(), textBlocks: updated });
    };

    // Delete Selected Text Box
    const handleDeleteBlock = (id) => {
        const updated = textBlocks.filter(b => b.id !== id);
        setTextBlocks(updated);
        if (selectedBlockId === id) setSelectedBlockId(null);
        pushSnapshot({ ...getCurrentState(), textBlocks: updated });
    };

    // Duplicate Selected Text Box
    const handleDuplicateBlock = (id) => {
        const block = textBlocks.find(b => b.id === id);
        if (!block) return;
        const newBlock = {
            ...block,
            id: `txt_${Date.now()}`,
            x: Math.min(block.x + 20, 200),
            y: Math.min(block.y + 30, 900)
        };
        const updated = [...textBlocks, newBlock];
        setTextBlocks(updated);
        setSelectedBlockId(newBlock.id);
        pushSnapshot({ ...getCurrentState(), textBlocks: updated });
    };

    // Update Content of a Text Box
    const handleUpdateContent = (id, newContent) => {
        setTextBlocks(prev => prev.map(b => b.id === id ? { ...b, content: newContent } : b));
    };

    // Update Formatting for Selected Block
    const applyFormatting = (formatKey, formatValue) => {
        setActiveFormatting(prev => ({ ...prev, [formatKey]: formatValue }));

        if (selectedBlockId) {
            if (selectedBlockId === 'recipient_address') {
                setAddressData(prev => ({ ...prev, [formatKey]: formatValue }));
                recordChange();
                return;
            }
            if (selectedBlockId === 'signature_block') {
                setSignatureData(prev => ({ ...prev, [formatKey]: formatValue }));
                recordChange();
                return;
            }

            setTextBlocks(prev => prev.map(b => {
                if (b.id === selectedBlockId) {
                    return { ...b, [formatKey]: formatValue };
                }
                return b;
            }));
            recordChange();
        }
    };

    // When a block is selected, synchronize active formatting controls
    const selectBlock = (block) => {
        setSelectedBlockId(block.id);
        setActiveFormatting({
            fontFamily: block.fontFamily || 'Inter, sans-serif',
            fontSize: block.fontSize || 14,
            bold: Boolean(block.bold),
            italic: Boolean(block.italic),
            underline: Boolean(block.underline),
            color: block.color || '#0F172A',
            align: block.align || 'left',
            lineHeight: block.lineHeight || 1.5,
            letterSpacing: block.letterSpacing || 0
        });
    };

    // Drag Handling for Elements within Letter Area
    const handleMouseDownOnBlock = (e, blockId, initialX, initialY) => {
        e.stopPropagation();
        setSelectedBlockId(blockId);
        
        dragRef.current = {
            isDragging: true,
            blockId,
            startX: e.clientX,
            startY: e.clientY,
            initialX,
            initialY
        };

        const handleMouseMove = (moveEvent) => {
            if (!dragRef.current.isDragging) return;
            const deltaX = (moveEvent.clientX - dragRef.current.startX) / zoomScale;
            const deltaY = (moveEvent.clientY - dragRef.current.startY) / zoomScale;

            // Constrain within letterpad bounds (794px width, content area y between 180 and 1000)
            const targetX = Math.max(30, Math.min(700, dragRef.current.initialX + deltaX));
            const targetY = Math.max(180, Math.min(980, dragRef.current.initialY + deltaY));

            if (dragRef.current.blockId === 'recipient_address') {
                setAddressData(prev => ({ ...prev, x: targetX, y: targetY }));
            } else if (dragRef.current.blockId === 'signature_block') {
                setSignatureData(prev => ({ ...prev, x: targetX, y: targetY }));
            } else {
                setTextBlocks(prev => prev.map(b => b.id === dragRef.current.blockId ? { ...b, x: targetX, y: targetY } : b));
            }
        };

        const handleMouseUp = () => {
            if (dragRef.current.isDragging) {
                dragRef.current.isDragging = false;
                recordChange();
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                if (e.shiftKey) {
                    e.preventDefault();
                    handleRedo();
                } else {
                    e.preventDefault();
                    handleUndo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [historyIndex, history]);

    // Signature Image Upload Handler
    const handleSignatureImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (PNG/JPG).');
            return;
        }
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
            setSignatureData(prev => ({
                ...prev,
                type: 'image',
                signatureImage: uploadEvent.target.result
            }));
            recordChange();
        };
        reader.readAsDataURL(file);
    };

    // Print Handler
    const handlePrint = () => {
        setSelectedBlockId(null);
        setTimeout(() => {
            window.print();
        }, 150);
    };

    // Download PDF Handler (html2canvas + jsPDF)
    const handleDownloadPDF = async () => {
        setIsGeneratingPdf(true);
        setSelectedBlockId(null);
        try {
            const container = document.getElementById('letterpad-print-container');
            if (!container) {
                window.print();
                return;
            }

            const { default: html2canvas } = await import('html2canvas');
            const { jsPDF } = await import('jspdf');

            const canvas = await html2canvas(container, {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                windowWidth: 1000
            });

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = 210;
            const pageHeight = 297;
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `Krishna_Letterhead_${dateStr}.pdf`;
            pdf.save(fileName);
            showToast(`✓ Downloaded ${fileName} (A4 Portrait).`);

            // Optionally archive in Document History
            try {
                const pdfBase64 = pdf.output('datauristring').split(',')[1];
                api.post('/document-history/save', {
                    documentType: 'LetterPad',
                    documentNumber: `LTR-${Date.now().toString().slice(-6)}`,
                    status: 'Printed',
                    preparedBy: user?.name || 'Administrator',
                    data: {
                        headerData,
                        textBlocks,
                        hasAddressBlock,
                        addressData,
                        hasSignatureBlock,
                        signatureData
                    },
                    pdfData: pdfBase64
                }).catch(() => {});
            } catch (_) {}

        } catch (err) {
            console.error('PDF generation error, fallback to print:', err);
            window.print();
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col print:min-h-0 print:bg-white print:p-0 print:m-0">
            {/* Google Fonts Preload for Calligraphy Signatures */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Dancing+Script:wght@700&display=swap');

                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: #ffffff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    nav, aside, header, .no-print {
                        display: none !important;
                    }
                    #letterpad-print-container {
                        box-shadow: none !important;
                        border: none !important;
                        margin: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        transform: none !important;
                    }
                }
            `}</style>

            {/* Notification Toast */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-bold ${
                            saveState === 'error'
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}
                    >
                        {saveState === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* TOP COMMAND BAR */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 px-4 md:px-8 py-3.5 shadow-sm no-print">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Title & Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">Digital Letter Pad</h1>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    A4 Portrait
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                Official Krishna Engineering Letterhead Designer & Word Processor
                            </p>
                        </div>
                    </div>

                    {/* View Switchers & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Undo / Redo */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={handleUndo}
                                disabled={historyIndex <= 0}
                                title="Undo (Ctrl+Z)"
                                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
                            >
                                <Undo2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleRedo}
                                disabled={historyIndex >= history.length - 1}
                                title="Redo (Ctrl+Y)"
                                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent transition"
                            >
                                <Redo2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                            <button
                                onClick={() => setViewMode('editor')}
                                className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'editor' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                Editor
                            </button>
                            <button
                                onClick={() => setViewMode('split')}
                                className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'split' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                Split
                            </button>
                            <button
                                onClick={() => setViewMode('preview')}
                                className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'preview' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                            >
                                Preview
                            </button>
                        </div>

                        {/* Zoom Controls */}
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                            <button 
                                onClick={() => setZoomScale(s => Math.max(0.5, s - 0.1))} 
                                title="Zoom Out"
                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2 text-[11px] font-mono">{Math.round(zoomScale * 100)}%</span>
                            <button 
                                onClick={() => setZoomScale(s => Math.min(1.4, s + 0.1))} 
                                title="Zoom In"
                                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Letterhead Header Settings */}
                        <button
                            onClick={() => setShowHeaderSettings(true)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition text-slate-700 dark:text-slate-300"
                            title="Edit Company Header & Footer"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            Header
                        </button>

                        {/* Clear Page */}
                        <button
                            onClick={() => setShowClearConfirm(true)}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition"
                            title="Clear Letter Area"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Print */}
                        <button
                            onClick={handlePrint}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Print
                        </button>

                        {/* Download PDF */}
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPdf}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/25 transition disabled:opacity-50"
                        >
                            <Download className="w-3.5 h-3.5" />
                            {isGeneratingPdf ? 'Exporting...' : 'Save PDF'}
                        </button>
                    </div>
                </div>

                {/* WORD PROCESSOR FORMATTING TOOLBAR */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2.5">
                    {/* Add Element Buttons */}
                    <button
                        onClick={handleAddTextBox}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Text Block
                    </button>

                    {/* Recipient Address Toggle */}
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-100 transition">
                        <input
                            type="checkbox"
                            checked={hasAddressBlock}
                            onChange={(e) => {
                                setHasAddressBlock(e.target.checked);
                                recordChange();
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Recipient Address Block</span>
                    </label>

                    {/* Signature Toggle */}
                    <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-100 transition">
                        <input
                            type="checkbox"
                            checked={hasSignatureBlock}
                            onChange={(e) => {
                                setHasSignatureBlock(e.target.checked);
                                recordChange();
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Signature Block</span>
                    </label>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

                    {/* Typography: Font Family */}
                    <select
                        value={activeFormatting.fontFamily}
                        onChange={(e) => applyFormatting('fontFamily', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                    >
                        {FONT_FAMILIES.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>

                    {/* Typography: Font Size */}
                    <select
                        value={activeFormatting.fontSize}
                        onChange={(e) => applyFormatting('fontSize', Number(e.target.value))}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
                    >
                        {[10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32].map(s => (
                            <option key={s} value={s}>{s} pt</option>
                        ))}
                    </select>

                    {/* Style Toggles: Bold, Italic, Underline */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => applyFormatting('bold', !activeFormatting.bold)}
                            className={`p-1.5 rounded transition ${activeFormatting.bold ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                            title="Bold"
                        >
                            <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => applyFormatting('italic', !activeFormatting.italic)}
                            className={`p-1.5 rounded transition ${activeFormatting.italic ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                            title="Italic"
                        >
                            <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => applyFormatting('underline', !activeFormatting.underline)}
                            className={`p-1.5 rounded transition ${activeFormatting.underline ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                            title="Underline"
                        >
                            <Underline className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Alignment */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => applyFormatting('align', 'left')}
                            className={`p-1.5 rounded transition ${activeFormatting.align === 'left' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                            title="Align Left"
                        >
                            <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => applyFormatting('align', 'center')}
                            className={`p-1.5 rounded transition ${activeFormatting.align === 'center' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                            title="Align Center"
                        >
                            <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => applyFormatting('align', 'right')}
                            className={`p-1.5 rounded transition ${activeFormatting.align === 'right' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                            title="Align Right"
                        >
                            <AlignRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => applyFormatting('align', 'justify')}
                            className={`p-1.5 rounded transition ${activeFormatting.align === 'justify' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`}
                            title="Justify"
                        >
                            <AlignJustify className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Text Color Picker & Presets */}
                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    onClick={() => applyFormatting('color', c.value)}
                                    className={`w-4 h-4 rounded-full border ${activeFormatting.color === c.value ? 'ring-2 ring-blue-500 scale-110' : 'border-slate-300'}`}
                                    style={{ backgroundColor: c.value }}
                                    title={c.label}
                                />
                            ))}
                        </div>
                        <input
                            type="color"
                            value={activeFormatting.color}
                            onChange={(e) => applyFormatting('color', e.target.value)}
                            className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
                            title="Custom Color"
                        />
                    </div>

                    {/* Line Spacing */}
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold">
                        <span className="text-[10px] text-slate-400">Line:</span>
                        <select
                            value={activeFormatting.lineHeight}
                            onChange={(e) => applyFormatting('lineHeight', Number(e.target.value))}
                            className="bg-transparent outline-none font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                            <option value={1.2}>1.2</option>
                            <option value={1.4}>1.4</option>
                            <option value={1.5}>1.5</option>
                            <option value={1.6}>1.6</option>
                            <option value={1.8}>1.8</option>
                            <option value={2.0}>2.0</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* MAIN WORKSPACE AREA */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT SIDEBAR: BLOCK INSPECTOR (When in Split or Editor Mode) */}
                {viewMode !== 'preview' && (
                    <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 overflow-y-auto hidden lg:block no-print shrink-0">
                        <div className="space-y-6">
                            {/* Block List */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                                    <span>Letter Elements ({textBlocks.length + (hasAddressBlock ? 1 : 0) + (hasSignatureBlock ? 1 : 0)})</span>
                                </h3>

                                <div className="space-y-2">
                                    {/* Address Block Item */}
                                    {hasAddressBlock && (
                                        <div 
                                            onClick={() => setSelectedBlockId('recipient_address')}
                                            className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                                                selectedBlockId === 'recipient_address'
                                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    Recipient Address
                                                </span>
                                                <span className="text-[10px] text-slate-400">X: {Math.round(addressData.x)}, Y: {Math.round(addressData.y)}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 truncate mt-1">{addressData.name}</p>
                                        </div>
                                    )}

                                    {/* Text Blocks */}
                                    {textBlocks.map((b, idx) => (
                                        <div
                                            key={b.id}
                                            onClick={() => selectBlock(b)}
                                            className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                                                selectedBlockId === b.id
                                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold flex items-center gap-1.5">
                                                    <Type className="w-3.5 h-3.5 text-slate-400" />
                                                    Text Block #{idx + 1}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDuplicateBlock(b.id); }}
                                                        className="p-1 text-slate-400 hover:text-blue-600"
                                                        title="Duplicate"
                                                    >
                                                        <Copy className="w-3 h-3" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteBlock(b.id); }}
                                                        className="p-1 text-slate-400 hover:text-rose-600"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                                {b.content || '(Empty text)'}
                                            </p>
                                        </div>
                                    ))}

                                    {/* Signature Block Item */}
                                    {hasSignatureBlock && (
                                        <div
                                            onClick={() => setSelectedBlockId('signature_block')}
                                            className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                                                selectedBlockId === 'signature_block'
                                                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                                    <UserCheck className="w-3.5 h-3.5" />
                                                    Signature Block
                                                </span>
                                                <span className="text-[10px] text-slate-400">X: {Math.round(signatureData.x)}, Y: {Math.round(signatureData.y)}</span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 truncate mt-1">
                                                {signatureData.type === 'typed' ? signatureData.signerName : 'Uploaded Image Signature'}
                                            </p>
                                        </div>
                                    )}

                                    {textBlocks.length === 0 && !hasAddressBlock && !hasSignatureBlock && (
                                        <div className="p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400">
                                            Letter pad is currently blank. Click <strong>+ Add Text Block</strong> above to compose your letter.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Nudge / Fine Position Control */}
                            {selectedBlockId && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Fine Position Nudge</span>
                                        <Move className="w-3.5 h-3.5 text-slate-400" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5 w-32 mx-auto">
                                        <div></div>
                                        <button
                                            onClick={() => {
                                                if (selectedBlockId === 'recipient_address') setAddressData(p => ({ ...p, y: Math.max(180, p.y - 10) }));
                                                else if (selectedBlockId === 'signature_block') setSignatureData(p => ({ ...p, y: Math.max(180, p.y - 10) }));
                                                else setTextBlocks(prev => prev.map(b => b.id === selectedBlockId ? { ...b, y: Math.max(180, b.y - 10) } : b));
                                                recordChange();
                                            }}
                                            className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                                            title="Nudge Up"
                                        >
                                            <ArrowUp className="w-3.5 h-3.5" />
                                        </button>
                                        <div></div>
                                        <button
                                            onClick={() => {
                                                if (selectedBlockId === 'recipient_address') setAddressData(p => ({ ...p, x: Math.max(30, p.x - 10) }));
                                                else if (selectedBlockId === 'signature_block') setSignatureData(p => ({ ...p, x: Math.max(30, p.x - 10) }));
                                                else setTextBlocks(prev => prev.map(b => b.id === selectedBlockId ? { ...b, x: Math.max(30, b.x - 10) } : b));
                                                recordChange();
                                            }}
                                            className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                                            title="Nudge Left"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="flex items-center justify-center text-[10px] text-slate-400 font-mono">10px</div>
                                        <button
                                            onClick={() => {
                                                if (selectedBlockId === 'recipient_address') setAddressData(p => ({ ...p, x: Math.min(650, p.x + 10) }));
                                                else if (selectedBlockId === 'signature_block') setSignatureData(p => ({ ...p, x: Math.min(650, p.x + 10) }));
                                                else setTextBlocks(prev => prev.map(b => b.id === selectedBlockId ? { ...b, x: Math.min(650, b.x + 10) } : b));
                                                recordChange();
                                            }}
                                            className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                                            title="Nudge Right"
                                        >
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                        <div></div>
                                        <button
                                            onClick={() => {
                                                if (selectedBlockId === 'recipient_address') setAddressData(p => ({ ...p, y: Math.min(980, p.y + 10) }));
                                                else if (selectedBlockId === 'signature_block') setSignatureData(p => ({ ...p, y: Math.min(980, p.y + 10) }));
                                                else setTextBlocks(prev => prev.map(b => b.id === selectedBlockId ? { ...b, y: Math.min(980, b.y + 10) } : b));
                                                recordChange();
                                            }}
                                            className="p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 flex items-center justify-center"
                                            title="Nudge Down"
                                        >
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </button>
                                        <div></div>
                                    </div>
                                </div>
                            )}

                            {/* Signature Configuration Panel (When signature block selected) */}
                            {selectedBlockId === 'signature_block' && hasSignatureBlock && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Signature Setup
                                    </h4>
                                    
                                    <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl text-xs font-bold">
                                        <button
                                            onClick={() => { setSignatureData(p => ({ ...p, type: 'typed' })); recordChange(); }}
                                            className={`flex-1 py-1.5 rounded-lg transition ${signatureData.type === 'typed' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-600'}`}
                                        >
                                            Type Name
                                        </button>
                                        <button
                                            onClick={() => { setSignatureData(p => ({ ...p, type: 'image' })); recordChange(); }}
                                            className={`flex-1 py-1.5 rounded-lg transition ${signatureData.type === 'image' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-600'}`}
                                        >
                                            Upload Image
                                        </button>
                                    </div>

                                    {signatureData.type === 'typed' ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Signatory Name</label>
                                                <input
                                                    type="text"
                                                    value={signatureData.signerName}
                                                    onChange={(e) => { setSignatureData({ ...signatureData, signerName: e.target.value }); recordChange(); }}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Cursive Signature Font</label>
                                                <select
                                                    value={signatureData.typedFont}
                                                    onChange={(e) => { setSignatureData({ ...signatureData, typedFont: e.target.value }); recordChange(); }}
                                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                                >
                                                    <option value='"Dancing Script", cursive'>Dancing Script (Classic Calligraphy)</option>
                                                    <option value='Caveat, cursive'>Caveat (Natural Handwriting)</option>
                                                    <option value='Georgia, serif'>Georgia Italic (Executive Formal)</option>
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Upload Signature (PNG / JPG)</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleSignatureImageUpload}
                                                className="w-full text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                            {signatureData.signatureImage && (
                                                <div className="space-y-2 pt-2">
                                                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-center">
                                                        <img src={signatureData.signatureImage} alt="Signature Preview" className="h-14 object-contain" />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                                                            Scale Width: {signatureData.imageWidth}px
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min={80}
                                                            max={300}
                                                            value={signatureData.imageWidth}
                                                            onChange={(e) => { setSignatureData({ ...signatureData, imageWidth: Number(e.target.value) }); recordChange(); }}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Designation / Title</label>
                                        <input
                                            type="text"
                                            value={signatureData.designation}
                                            onChange={(e) => { setSignatureData({ ...signatureData, designation: e.target.value }); recordChange(); }}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* CENTER: SCROLLABLE CANVAS CONTAINER */}
                <div 
                    onClick={() => setSelectedBlockId(null)}
                    className="flex-1 bg-slate-200 dark:bg-slate-950/80 p-4 md:p-8 overflow-auto flex justify-center items-start print:p-0 print:m-0 print:bg-white"
                >
                    {/* The Strict A4 Portrait Sheet (794px x 1123px = 210mm x 297mm at 96 DPI) */}
                    <div 
                        style={{
                            transform: `scale(${zoomScale})`,
                            transformOrigin: 'top center',
                            width: '794px',
                            minWidth: '794px',
                            height: '1123px',
                            minHeight: '1123px'
                        }}
                        className="transition-transform duration-150"
                    >
                        <div
                            id="letterpad-print-container"
                            ref={printContainerRef}
                            className="w-[794px] h-[1123px] bg-white text-slate-900 relative shadow-2xl overflow-hidden select-none print:shadow-none print:border-none"
                            style={{ backgroundColor: '#ffffff' }}
                        >
                            {/* ── TOP HEADER SECTION ── */}
                            <div className="pt-8 px-10 pb-4">
                                <div className="flex items-start justify-between gap-6">
                                    {/* Left: Blue Gear & Amber Rising Arrow Logo + Brand Title */}
                                    <div className="flex items-center gap-4">
                                        {/* Precision SVG Logo */}
                                        <svg viewBox="0 0 100 100" className="w-16 h-16 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            {/* Navy Blue Gear (Industrial Teeth & Hub) */}
                                            <g fill="#1E3A8A">
                                                <rect x="44" y="6" width="12" height="12" rx="2" />
                                                <rect x="44" y="82" width="12" height="12" rx="2" />
                                                <rect x="6" y="44" width="12" height="12" rx="2" />
                                                <rect x="82" y="44" width="12" height="12" rx="2" />
                                                <rect x="17" y="17" width="12" height="12" rx="2" transform="rotate(45 23 23)" />
                                                <rect x="71" y="17" width="12" height="12" rx="2" transform="rotate(45 77 23)" />
                                                <rect x="17" y="71" width="12" height="12" rx="2" transform="rotate(45 23 77)" />
                                                <rect x="71" y="71" width="12" height="12" rx="2" transform="rotate(45 77 77)" />
                                                <circle cx="50" cy="50" r="36" />
                                            </g>
                                            {/* Inner White Cutout */}
                                            <circle cx="50" cy="50" r="22" fill="#ffffff" />
                                            {/* Center Gear Ring */}
                                            <circle cx="50" cy="50" r="12" fill="#1E3A8A" />
                                            <circle cx="50" cy="50" r="5" fill="#ffffff" />
                                            
                                            {/* Amber Rising Arrow */}
                                            <path 
                                                d="M 16 82 C 30 76, 42 64, 58 42 L 52 42 L 78 18 L 80 44 L 72 44 C 60 58, 44 72, 20 86 Z" 
                                                fill="url(#amberGrad)" 
                                            />
                                            <defs>
                                                <linearGradient id="amberGrad" x1="16" y1="84" x2="80" y2="18" gradientUnits="userSpaceOnUse">
                                                    <stop stopColor="#F59E0B" />
                                                    <stop offset="0.6" stopColor="#D97706" />
                                                    <stop offset="1" stopColor="#B45309" />
                                                </linearGradient>
                                            </defs>
                                        </svg>

                                        {/* Company Name & Subtitle */}
                                        <div>
                                            <h1 className="text-[26px] font-black uppercase tracking-wider text-[#0F172A] leading-none">
                                                {headerData.companyName}
                                            </h1>
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D97706] mt-1.5 max-w-sm">
                                                {headerData.subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: Contact Details with Small Icons */}
                                    <div className="text-right space-y-1 text-[10px] text-slate-700 font-semibold leading-tight pt-1">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span className="truncate max-w-[280px]">{headerData.address}</span>
                                            <MapPin className="w-3 h-3 text-[#1E3A8A] shrink-0" />
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span>Phone: {headerData.phone}</span>
                                            <Phone className="w-3 h-3 text-[#1E3A8A] shrink-0" />
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span>Email: {headerData.email}</span>
                                            <Mail className="w-3 h-3 text-[#1E3A8A] shrink-0" />
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5">
                                            <span className="font-bold text-[#1E3A8A]">{headerData.website}</span>
                                            <Globe className="w-3 h-3 text-[#1E3A8A] shrink-0" />
                                        </div>
                                    </div>
                                </div>

                                {/* Thin Navy Divider with Short Amber Accent */}
                                <div className="mt-4 relative">
                                    <div className="w-full h-[2px] bg-[#0F172A]"></div>
                                    <div className="w-24 h-[4px] bg-[#F59E0B] absolute -top-[1px] left-0 rounded-full"></div>
                                </div>

                                {/* Preset Date, Right-Aligned Below the Divider */}
                                <div className="flex justify-end pt-2 text-xs font-bold text-[#0F172A]">
                                    <span>{headerData.dateText}</span>
                                </div>
                            </div>

                            {/* ── MAIN LETTER AREA (Blank by Default) ── */}
                            <div 
                                ref={letterAreaRef}
                                className="absolute inset-x-0 top-[170px] bottom-[70px] overflow-hidden"
                            >
                                {/* Optional Recipient Address Block */}
                                {hasAddressBlock && (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setSelectedBlockId('recipient_address'); }}
                                        style={{
                                            position: 'absolute',
                                            left: `${addressData.x}px`,
                                            top: `${addressData.y - 170}px`,
                                            fontFamily: addressData.fontFamily,
                                            fontSize: `${addressData.fontSize}px`,
                                            color: addressData.color,
                                            lineHeight: addressData.lineHeight
                                        }}
                                        className={`p-2 rounded cursor-move transition-shadow ${
                                            selectedBlockId === 'recipient_address'
                                                ? 'ring-2 ring-blue-500 bg-blue-50/20'
                                                : 'hover:ring-1 hover:ring-slate-300'
                                        }`}
                                    >
                                        {/* Drag Handle */}
                                        <div
                                            onMouseDown={(e) => handleMouseDownOnBlock(e, 'recipient_address', addressData.x, addressData.y)}
                                            className="no-print absolute -top-3 -right-3 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow cursor-grab active:cursor-grabbing opacity-80 hover:opacity-100"
                                            title="Drag Recipient Address"
                                        >
                                            <Move className="w-3 h-3" />
                                        </div>

                                        <div className="font-bold text-[#0F172A]">{addressData.toText}</div>
                                        <div 
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => {
                                                setAddressData(p => ({ ...p, name: e.currentTarget.textContent }));
                                                recordChange();
                                            }}
                                            className="font-black text-[#0F172A] outline-none"
                                        >
                                            {addressData.name}
                                        </div>
                                        <div 
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => {
                                                setAddressData(p => ({ ...p, organization: e.currentTarget.textContent }));
                                                recordChange();
                                            }}
                                            className="font-medium outline-none"
                                        >
                                            {addressData.organization}
                                        </div>
                                        <div 
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => {
                                                setAddressData(p => ({ ...p, street: e.currentTarget.textContent }));
                                                recordChange();
                                            }}
                                            className="font-normal outline-none"
                                        >
                                            {addressData.street}
                                        </div>
                                        <div 
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => {
                                                setAddressData(p => ({ ...p, location: e.currentTarget.textContent }));
                                                recordChange();
                                            }}
                                            className="font-normal outline-none"
                                        >
                                            {addressData.location}
                                        </div>
                                    </div>
                                )}

                                {/* User Added Text Boxes */}
                                {textBlocks.map(block => (
                                    <div
                                        key={block.id}
                                        onClick={(e) => { e.stopPropagation(); selectBlock(block); }}
                                        style={{
                                            position: 'absolute',
                                            left: `${block.x}px`,
                                            top: `${block.y - 170}px`,
                                            width: `${block.width}px`,
                                            fontFamily: block.fontFamily,
                                            fontSize: `${block.fontSize}px`,
                                            fontWeight: block.bold ? 'bold' : 'normal',
                                            fontStyle: block.italic ? 'italic' : 'normal',
                                            textDecoration: block.underline ? 'underline' : 'none',
                                            color: block.color,
                                            textAlign: block.align,
                                            lineHeight: block.lineHeight,
                                            letterSpacing: `${block.letterSpacing}px`
                                        }}
                                        className={`group relative p-2 rounded transition-shadow ${
                                            selectedBlockId === block.id
                                                ? 'ring-2 ring-blue-500 bg-blue-50/10'
                                                : 'hover:ring-1 hover:ring-slate-300'
                                        }`}
                                    >
                                        {/* Move Handle */}
                                        <div
                                            onMouseDown={(e) => handleMouseDownOnBlock(e, block.id, block.x, block.y)}
                                            className="no-print absolute -top-3 -right-3 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Drag to position"
                                        >
                                            <Move className="w-3 h-3" />
                                        </div>

                                        {/* Editable Content */}
                                        <div
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(e) => {
                                                handleUpdateContent(block.id, e.currentTarget.innerHTML);
                                                recordChange();
                                            }}
                                            dangerouslySetInnerHTML={{ __html: block.content }}
                                            className="outline-none min-h-[1.5em] leading-relaxed cursor-text whitespace-pre-wrap"
                                        />

                                        {/* Delete Button (Visible on Active Selection) */}
                                        {selectedBlockId === block.id && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                                                className="no-print absolute -top-3 -left-3 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center shadow hover:bg-rose-700 transition"
                                                title="Delete text box"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Optional Signature Block */}
                                {hasSignatureBlock && (
                                    <div
                                        onClick={(e) => { e.stopPropagation(); setSelectedBlockId('signature_block'); }}
                                        style={{
                                            position: 'absolute',
                                            left: `${signatureData.x}px`,
                                            top: `${signatureData.y - 170}px`,
                                            fontSize: `${signatureData.fontSize}px`,
                                            color: signatureData.color
                                        }}
                                        className={`p-2 rounded cursor-move transition-shadow ${
                                            selectedBlockId === 'signature_block'
                                                ? 'ring-2 ring-blue-500 bg-blue-50/20'
                                                : 'hover:ring-1 hover:ring-slate-300'
                                        }`}
                                    >
                                        {/* Drag Handle */}
                                        <div
                                            onMouseDown={(e) => handleMouseDownOnBlock(e, 'signature_block', signatureData.x, signatureData.y)}
                                            className="no-print absolute -top-3 -right-3 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow cursor-grab active:cursor-grabbing opacity-80 hover:opacity-100"
                                            title="Drag Signature"
                                        >
                                            <Move className="w-3 h-3" />
                                        </div>

                                        <p className="text-[11px] font-black uppercase text-[#0F172A] mb-1 tracking-wider">
                                            For KRISHNA ENGINEERING
                                        </p>

                                        {signatureData.type === 'image' && signatureData.signatureImage ? (
                                            <div className="py-1">
                                                <img 
                                                    src={signatureData.signatureImage} 
                                                    alt="Authorized Signature" 
                                                    style={{ width: `${signatureData.imageWidth}px` }}
                                                    className="object-contain"
                                                />
                                            </div>
                                        ) : (
                                            <div 
                                                style={{ fontFamily: signatureData.typedFont }}
                                                className="text-2xl text-[#1E3A8A] font-bold py-1 select-none"
                                            >
                                                {signatureData.signerName}
                                            </div>
                                        )}

                                        <div className="border-t border-slate-400/80 pt-1 mt-1 text-[11px] font-bold text-[#0F172A]">
                                            {signatureData.designation}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── BOTTOM FOOTER SECTION ── */}
                            <div className="absolute inset-x-0 bottom-6 px-10">
                                {/* Thin Navy Line */}
                                <div className="w-full h-[1px] bg-[#0F172A]"></div>
                                
                                {/* Centered Footer Text with Amber Diamond Separators */}
                                <div className="pt-2 text-center text-[9px] font-bold uppercase tracking-wider text-slate-700">
                                    {headerData.footerText.split('◆').map((part, index, arr) => (
                                        <React.Fragment key={index}>
                                            <span>{part.trim()}</span>
                                            {index < arr.length - 1 && (
                                                <span className="text-[#F59E0B] font-black mx-2.5">◆</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* EDIT HEADER / FOOTER MODAL */}
            {showHeaderSettings && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-3xl max-w-lg w-full space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                <Settings className="w-4 h-4 text-blue-600" />
                                Edit Letterhead Header & Footer
                            </h3>
                            <button onClick={() => setShowHeaderSettings(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Company Name</label>
                                <input
                                    type="text"
                                    value={headerData.companyName}
                                    onChange={(e) => setHeaderData({ ...headerData, companyName: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold outline-none"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Subtitle</label>
                                <input
                                    type="text"
                                    value={headerData.subtitle}
                                    onChange={(e) => setHeaderData({ ...headerData, subtitle: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={headerData.phone}
                                        onChange={(e) => setHeaderData({ ...headerData, phone: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={headerData.email}
                                        onChange={(e) => setHeaderData({ ...headerData, email: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Website URL</label>
                                <input
                                    type="text"
                                    value={headerData.website}
                                    onChange={(e) => setHeaderData({ ...headerData, website: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold outline-none"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Company Address</label>
                                <input
                                    type="text"
                                    value={headerData.address}
                                    onChange={(e) => setHeaderData({ ...headerData, address: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold outline-none"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Letter Date Text</label>
                                <input
                                    type="text"
                                    value={headerData.dateText}
                                    onChange={(e) => setHeaderData({ ...headerData, dateText: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold outline-none"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">Footer Remarks (Use ◆ as separator)</label>
                                <textarea
                                    rows={2}
                                    value={headerData.footerText}
                                    onChange={(e) => setHeaderData({ ...headerData, footerText: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 font-bold outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-3">
                            <button
                                onClick={() => { setHeaderData(DEFAULT_HEADER); recordChange(); }}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-bold transition"
                            >
                                Reset Defaults
                            </button>
                            <button
                                onClick={() => { setShowHeaderSettings(false); recordChange(); showToast('Header details updated.'); }}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-blue-600/30"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CLEAR PAGE CONFIRMATION MODAL */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl text-center">
                        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">Clear Letter Content?</h3>
                        <p className="text-xs text-slate-500">
                            This will remove all text boxes, recipient address, and signature blocks from this page, returning it to a blank letterhead.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-xl text-xs font-bold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearPage}
                                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-rose-600/25"
                            >
                                Yes, Clear Page
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DigitalLetterPad;
