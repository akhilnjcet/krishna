import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, Layers, Image as ImageIcon, FileText, BookOpen,
    BarChart3, Users, ClipboardList, BadgeIndianRupee, MessageSquare,
    Calculator, Receipt, TrendingUp, Settings, LogOut, Menu, X, Bell,
    Search, HelpCircle, ChevronRight, User, Filter, LayoutGrid, Activity,
    Clock, AlertCircle, Radio, MessageCircle, ChevronLeft, CheckSquare, Truck,
    ShieldCheck, KeyRound, Package, Building2, Briefcase, PenTool, Sparkles,
    AlertTriangle, Calendar, Bot, Trash2, Navigation,
    Lock, Unlock, GripVertical, ChevronUp, ChevronDown, RotateCcw
} from 'lucide-react';
import useAuthStore from '../stores/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../utils/socket';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import NotificationBellDropdown from '../components/NotificationBellDropdown';
import { playNotificationSound, unlockAudio } from '../utils/soundService';
import { hasUserAccessToArea } from '../constants/accessAreas';

const SIDEBAR_W = 'w-[280px] max-w-[85vw]';
const STORAGE_KEY_ORDER = 'kew_admin_sidebar_order_v1';
const STORAGE_KEY_LOCKED = 'kew_admin_sidebar_locked_v1';

const SIDEBAR_ITEMS = [
    { name: 'Core Dashboard',  path: '/admin',              icon: LayoutDashboard, keywords: ['overview', 'analytics', 'kpi', 'metrics', 'home'] },
    { name: 'User Management',  path: '/admin/users',        icon: User, keywords: ['accounts', 'roles', 'permissions', 'access', 'passwords', 'security'] },
    { name: 'Staff Management', path: '/admin/staff',        icon: Users, keywords: ['employees', 'workers', 'labour', 'hr', 'salaries', 'team'] },
    { name: 'Attendance Hub',  path: '/admin/logs',         icon: Clock, keywords: ['face', 'face attendance', 'face verification', 'biometric', 'check-in', 'clock-in', 'logs', 'punch'] },
    { name: 'Shift Control',   path: '/admin/shifts',       icon: Clock, keywords: ['timing', 'schedule', 'roster', 'working hours', 'shifts'] },
    { name: 'Leave Requests',  path: '/admin/leave',        icon: ClipboardList, keywords: ['vacation', 'time off', 'sick leave', 'approval', 'holidays'] },
    { name: 'Projects Hub',    path: '/admin/projects',     icon: Layers, keywords: ['jobs', 'orders', 'sites', 'contracts', 'client projects'] },
    { name: 'Production Plans', path: '/admin/production-planning', icon: Calendar, keywords: ['manufacturing', 'assembly', 'planning', 'fabrication schedule', 'factory'] },
    { name: 'Fabrication Drawings', path: '/admin/drawings', icon: FileText, keywords: ['cad', 'blueprints', 'engineering drawings', 'pdf', 'diagrams', 'specs', 'iso'] },
    { name: 'Scrap & Wastage', path: '/admin/scrap-waste',   icon: Trash2, keywords: ['metal scrap', 'disposal', 'recycled', 'waste materials', 'offcuts'] },
    { name: 'Task Assignment Hub', path: '/admin/tasks',    icon: CheckSquare, keywords: ['todo', 'assignments', 'workflow', 'staff tasks', 'duties'] },
    { name: 'Rework & Defects', path: '/admin/defects',     icon: AlertTriangle, keywords: ['quality control', 'qc', 'rejections', 'repairs', 'defects', 'damage'] },
    { name: 'Warranty & Service', path: '/admin/warranty-service', icon: ShieldCheck, keywords: ['guarantee', 'amc', 'after sales', 'service requests', 'warranty card'] },
    { name: 'CRM Pipeline',    path: '/admin/crm',          icon: Users, keywords: ['leads', 'sales pipeline', 'enquiries', 'opportunities', 'deals', 'funnel'] },
    { name: 'Fleet Logistics',  path: '/admin/fleet',        icon: Truck, keywords: ['vehicles', 'trucks', 'drivers', 'trips', 'fuel tracking', 'odometer', 'transport'] },
    { name: 'Live Field Tracking', path: '/admin/live-tracking', icon: Navigation, keywords: ['gps', 'realtime map', 'driver location', 'fleet tracking', 'routes'] },
    { name: 'AI ERP Copilot',  path: '/admin/ai-assistant', icon: Sparkles, keywords: ['groq', 'assistant', 'smart search', 'chatbot', 'ai query', 'questions'] },
    { name: 'Notification Center', path: '/admin/notifications', icon: Bell, keywords: ['alerts', 'bell', 'system messages', 'announcements', 'updates'] },
    { name: 'Visual Portfolio', path: '/admin/portfolio',    icon: ImageIcon, keywords: ['photos', 'gallery', 'showcase', 'work samples', 'images'] },
    { name: 'Formal Quotes',   path: '/admin/quotes',       icon: Receipt, keywords: ['estimates', 'proposals', 'client bids', 'pricing quotes'] },
    { name: 'Quotation Studio', path: '/admin/quotations-studio', icon: FileText, keywords: ['quote builder', 'custom quote', 'bom estimate', 'margin calculator'] },
    { name: 'Financial Hub',   path: '/admin/finance',      icon: BadgeIndianRupee, keywords: ['finance', 'accounting', 'ledger', 'cashflow', 'revenue', 'expenses', 'profit'] },
    { name: 'Invoice Studio',  path: '/admin/invoices-studio', icon: Receipt, keywords: ['tax invoices', 'gst billing', 'client invoices', 'receipts'] },
    { name: 'Labour & Freight Bills', path: '/admin/labour-bills', icon: Truck, keywords: ['freight', 'transport bills', 'lorry hire', 'contractor payments', 'wages'] },
    { name: 'Equipment Rental Studio', path: '/admin/rental-bills', icon: KeyRound, keywords: ['machinery hire', 'generators', 'welding sets', 'rental agreement', 'tools rent'] },
    { name: 'Lodge Manager',   path: '/admin/lodge-manager', icon: Building2, keywords: ['rooms', 'guest house', 'accommodation', 'workers stay', 'lodging'] },
    { name: 'Inventory & Tools', path: '/admin/inventory',    icon: Package, keywords: ['stock', 'raw materials', 'steel', 'plates', 'consumables', 'warehouse'] },
    { name: 'BOM & Costing',   path: '/admin/bom-costing',  icon: Layers, keywords: ['bill of materials', 'cost estimation', 'material takeoff', 'weight calculator'] },
    { name: 'Document History', path: '/admin/document-history', icon: FileText, keywords: ['archives', 'audit trail', 'generated pdfs', 'print records'] },
    { name: 'Digital Letter Pad', path: '/admin/letter-pad', icon: PenTool, keywords: ['official letter', 'pad', 'stationery', 'formal letterhead'] },
    { name: 'Project Timeline', path: '/admin/progress',     icon: Activity, keywords: ['gantt', 'milestones', 'stop reasons', 'delay logs', 'tracker'] },
    { name: 'Intelligence Feed', path: '/admin/blog',        icon: BookOpen, keywords: ['news', 'field reports', 'bulletin', 'updates', 'articles'] },
    { name: 'Technical Chat',  path: '/admin/live-chat',    icon: MessageSquare, keywords: ['internal messaging', 'direct chat', 'team channel'] },
    { name: 'AI Command Center', path: '/admin/ai-chat',     icon: Calculator, keywords: ['ai console', 'engineering calculator', 'ai diagnostics'] },
    { name: 'Careers & Notices', path: '/admin/careers', icon: Briefcase, keywords: ['job postings', 'hiring', 'recruitment', 'vacancies'] },
    { name: 'Applications',    path: '/admin/applications', icon: LayoutGrid, keywords: ['resumes', 'candidate submissions', 'job applicants'] },
    { name: 'Analytics Hub',   path: '/admin/analytics',    icon: BarChart3, keywords: ['reports', 'charts', 'performance', 'executive metrics', 'stats'] },
    { name: 'WhatsApp Relay',  path: '/admin/whatsapp',     icon: Radio, keywords: ['wa messages', 'broadcasts', 'instant alerts', 'meta api'] },
    { name: 'Legal & Privacy',  path: '/admin/legal-policies', icon: ShieldCheck, keywords: ['terms', 'compliance', 'privacy policy', 'disclaimer'] },
    { name: 'System Core',     path: '/admin/settings',     icon: Settings, keywords: ['configuration', 'database', 'system preferences', 'admin tools'] },
];

const getSavedSidebarItems = () => {
    try {
        const savedOrder = localStorage.getItem(STORAGE_KEY_ORDER);
        if (!savedOrder) return SIDEBAR_ITEMS;
        const parsed = JSON.parse(savedOrder);
        if (!Array.isArray(parsed) || parsed.length === 0) return SIDEBAR_ITEMS;

        const itemMap = new Map(SIDEBAR_ITEMS.map(item => [item.path, item]));
        const ordered = [];

        parsed.forEach(path => {
            if (itemMap.has(path)) {
                ordered.push(itemMap.get(path));
                itemMap.delete(path);
            }
        });

        itemMap.forEach(item => {
            ordered.push(item);
        });

        return ordered.length > 0 ? ordered : SIDEBAR_ITEMS;
    } catch (e) {
        console.error('Failed to load saved sidebar order:', e);
        return SIDEBAR_ITEMS;
    }
};

/* ── Shared Sidebar Content ─────────────────────────────────────── */
const highlightMatch = (text, query) => {
    if (!query || !query.trim()) return text;
    const q = query.trim().toLowerCase();
    const str = String(text || '');
    const idx = str.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    const before = str.slice(0, idx);
    const matched = str.slice(idx, idx + q.length);
    const after = str.slice(idx + q.length);
    return (
        <span>
            {before}
            <span className="text-blue-600 dark:text-blue-400 font-black underline decoration-blue-500/50">{matched}</span>
            {after}
        </span>
    );
};

const SidebarContent = ({ 
    location, 
    user, 
    onNavClick, 
    onLogout,
    items = SIDEBAR_ITEMS,
    isLocked = true,
    onToggleLock,
    onResetOrder,
    onMoveUp,
    onMoveDown,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    draggedIndex,
    dragOverIndex
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const searchInputRef = useRef(null);
    const itemRefs = useRef([]);
    const navigate = useNavigate();

    // Reset keyboard selection index when query changes
    useEffect(() => {
        setActiveIndex(0);
    }, [searchQuery]);

    // Global keyboard listener to focus search on '/' or 'Ctrl+K' / 'Cmd+K'
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            const isMac = typeof window !== 'undefined' && navigator.platform?.toUpperCase().indexOf('MAC') >= 0;
            const isMod = isMac ? e.metaKey : e.ctrlKey;
            const tag = document.activeElement?.tagName?.toLowerCase();
            const isInput = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;

            if (isMod && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            } else if (e.key === '/' && !isInput) {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    // Scroll active item into view during keyboard navigation
    useEffect(() => {
        if (searchQuery.trim() && itemRefs.current[activeIndex]) {
            itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [activeIndex, searchQuery]);

    // Live search suggestions filtered strictly to accessible items and sorted alphabetically
    const matchingItems = useMemo(() => {
        const q = (searchQuery || '').trim().toLowerCase();
        if (!q) return [];

        return items
            .filter(item => {
                const nameLower = (item.name || '').toLowerCase();
                const pathLower = (item.path || '').toLowerCase();
                const keywords = Array.isArray(item.keywords) ? item.keywords : [];

                if (nameLower.includes(q)) return true;
                if (pathLower.includes(q)) return true;
                return keywords.some(k => (k || '').toLowerCase().includes(q));
            })
            // Remove duplicates by path
            .filter((item, idx, arr) => arr.findIndex(i => i.path === item.path) === idx)
            // Strict alphabetical sorting A to Z by item name
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }, [items, searchQuery]);

    const handleSelectModule = (item) => {
        setSearchQuery('');
        navigate(item.path);
        if (onNavClick) onNavClick();
    };

    const handleSearchKeyDown = (e) => {
        if (matchingItems.length === 0) {
            if (e.key === 'Escape') {
                setSearchQuery('');
                searchInputRef.current?.blur();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % matchingItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + matchingItems.length) % matchingItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const target = matchingItems[activeIndex] || matchingItems[0];
            if (target) {
                handleSelectModule(target);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setSearchQuery('');
            searchInputRef.current?.blur();
        }
    };

    const isSearching = searchQuery.trim().length > 0;

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            {/* Logo Section */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col items-center gap-2.5 flex-shrink-0">
                <Link to="/" onClick={onNavClick} className="flex flex-col items-center gap-2.5 group">
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-lg group-hover:scale-105 transition-transform border border-slate-100 dark:border-slate-700">
                        <p className="text-blue-600 dark:text-blue-400 font-black text-xl leading-none">K</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-black text-slate-900 dark:text-white font-poppins tracking-tighter">KRISHNA ENGG</p>
                        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 mt-1 opacity-80 italic">Admin Terminal</p>
                    </div>
                </Link>
            </div>

            {/* Real-time Module Search Bar */}
            <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex-shrink-0">
                <div className="relative flex items-center group">
                    <Search className="w-4 h-4 absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none transition-colors group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search modules (e.g. Attendance, Finance)..."
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100/80 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700/80 focus:border-blue-500 dark:focus:border-blue-500 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-sm focus:ring-2 focus:ring-blue-500/20"
                        autoComplete="off"
                        spellCheck="false"
                        aria-label="Search accessible ERP modules"
                    />
                    {searchQuery ? (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                searchInputRef.current?.focus();
                            }}
                            title="Clear search (Esc)"
                            className="absolute right-2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <div className="absolute right-2.5 hidden sm:flex items-center pointer-events-none">
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 border border-slate-300/60 dark:border-slate-600/60">
                                /
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Header: Live Suggestions when searching vs Enterprise Control when browsing */}
            {isSearching ? (
                <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                            Suggestions (A → Z)
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                            {matchingItems.length}
                        </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Alphabetical
                    </span>
                </div>
            ) : (
                <div className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
                            Enterprise Control
                        </p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                            {items.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        {!isLocked && (
                            <button
                                type="button"
                                onClick={onResetOrder}
                                title="Reset to default module order"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-wider">Reset</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onToggleLock}
                            title={isLocked ? "Click to unlock and rearrange sidebar modules" : "Click to lock current sidebar order"}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shadow-sm ${
                                isLocked
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700'
                                    : 'bg-amber-500 text-white shadow-amber-500/30 hover:bg-amber-600 border border-amber-600 animate-pulse'
                            }`}
                        >
                            {isLocked ? (
                                <>
                                    <Lock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                                    <span className="text-[9px] uppercase tracking-wider">Locked</span>
                                </>
                            ) : (
                                <>
                                    <Unlock className="w-3 h-3 text-white" />
                                    <span className="text-[9px] uppercase tracking-wider">Unlocked</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Reordering helper banner when unlocked and not searching */}
            {!isLocked && !isSearching && (
                <div className="mx-3 mt-2 px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[10px] text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Unlock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-semibold leading-tight truncate">Drag or use ↑ ↓ to rearrange</span>
                    </div>
                    <button
                        type="button"
                        onClick={onToggleLock}
                        className="px-2 py-0.5 bg-amber-600 text-white rounded-md text-[9px] font-black uppercase tracking-wider hover:bg-amber-700 shrink-0"
                    >
                        Done
                    </button>
                </div>
            )}

            {/* Navigation Section */}
            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-hide">
                {isSearching ? (
                    matchingItems.length > 0 ? (
                        matchingItems.map((item, index) => {
                            const active = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                            const isKeyFocused = index === activeIndex;
                            const queryLower = searchQuery.trim().toLowerCase();
                            const matchedKeyword = !item.name.toLowerCase().includes(queryLower) && Array.isArray(item.keywords)
                                ? item.keywords.find(k => k.toLowerCase().includes(queryLower))
                                : null;

                            return (
                                <div
                                    key={item.path}
                                    ref={el => (itemRefs.current[index] = el)}
                                    onClick={() => handleSelectModule(item)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-[13px] font-semibold transition-all select-none ${
                                        isKeyFocused
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/40 shadow-sm'
                                            : active 
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                    role="option"
                                    aria-selected={isKeyFocused}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <item.icon className={`w-4 h-4 flex-shrink-0 ${
                                            active ? 'text-white' : isKeyFocused ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                                        }`} />
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="truncate">
                                                {highlightMatch(item.name, searchQuery)}
                                            </span>
                                            {matchedKeyword && (
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal truncate mt-0.5">
                                                    Matches: <span className="text-blue-600 dark:text-blue-400 font-medium">{matchedKeyword}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                                        isKeyFocused ? 'text-blue-600 dark:text-blue-400 translate-x-0.5' : 'text-slate-300 dark:text-slate-600 opacity-60 group-hover:opacity-100'
                                    }`} />
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3 border border-slate-200/60 dark:border-slate-700/60">
                                <Search className="w-5 h-5 opacity-60" />
                            </div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No matching modules</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[210px] leading-relaxed">
                                No accessible ERP modules match <span className="font-bold text-slate-700 dark:text-slate-300">"{searchQuery}"</span>
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    searchInputRef.current?.focus();
                                }}
                                className="mt-4 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl text-[11px] font-bold transition-all border border-blue-200/50 dark:border-blue-800/50 shadow-sm"
                            >
                                Clear Filter
                            </button>
                        </div>
                    )
                ) : (
                    items.map((item, index) => {
                        const active = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                        const isDragged = draggedIndex === index;
                        const isOver = dragOverIndex === index;

                        return (
                            <div
                                key={item.path}
                                draggable={!isLocked}
                                onDragStart={(e) => onDragStart && onDragStart(e, index)}
                                onDragOver={(e) => onDragOver && onDragOver(e, index)}
                                onDragEnd={onDragEnd}
                                onDrop={(e) => onDrop && onDrop(e, index)}
                                className={`group relative flex items-center rounded-xl transition-all ${
                                    isDragged ? 'opacity-35 scale-95' : 'opacity-100'
                                } ${
                                    isOver && !isDragged ? 'ring-2 ring-blue-500 ring-dashed bg-blue-50/60 dark:bg-blue-900/30' : ''
                                }`}
                            >
                                {!isLocked && (
                                    <div
                                        className="p-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-amber-600 dark:text-slate-500 dark:hover:text-amber-400 flex-shrink-0 select-none"
                                        title="Drag to reorder"
                                    >
                                        <GripVertical className="w-4 h-4" />
                                    </div>
                                )}

                                <Link
                                    to={item.path}
                                    onClick={onNavClick}
                                    className={`flex-1 flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all min-w-0 ${
                                        active 
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                                    <span className="truncate">{item.name}</span>
                                </Link>

                                {!isLocked && (
                                    <div className="flex flex-col items-center gap-0.5 pr-1 pl-0.5 flex-shrink-0">
                                        <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onMoveUp && onMoveUp(index);
                                            }}
                                            title="Move Up"
                                            className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                                                index === 0 ? 'opacity-20 cursor-not-allowed text-slate-400' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                                            }`}
                                        >
                                            <ChevronUp className="w-3 h-3" />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={index === items.length - 1}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onMoveDown && onMoveDown(index);
                                            }}
                                            title="Move Down"
                                            className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                                                index === items.length - 1 ? 'opacity-20 cursor-not-allowed text-slate-400' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600'
                                            }`}
                                        >
                                            <ChevronDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </nav>

            {/* Footer / Account Section */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-3 flex-shrink-0">
            <Link 
                to="/admin/profile" 
                onClick={onNavClick} 
                className="flex items-center gap-3 px-3 py-2.5 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors rounded-2xl border border-slate-200 dark:border-slate-700/50 group"
            >
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-lg group-hover:scale-110 transition-transform">
                    {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-none mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user?.name || "Administrator"}</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest leading-none">
                        {((user?.role || user?.user?.role || '').toLowerCase() === 'manager') 
                            ? 'Operations Manager' 
                            : ((user?.role || user?.user?.role || '').toLowerCase() === 'finance_admin') 
                            ? 'Finance Administrator' 
                            : 'System Root'}
                    </p>
                </div>
            </Link>
            
            <button 
                onClick={onLogout} 
                className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-500/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all group"
            >
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Logout Session
            </button>

            <div className="pt-1 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    POWERED BY <span className="text-indigo-600 dark:text-indigo-400">ZINGRONIX IT SOLUTIONS</span>
                </p>
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400/80 dark:text-slate-600">
                    A KRISHNA GROUP CONCERN
                </p>
            </div>
        </div>
    </div>
    );
};

let audioCtx = null;

const playSirenNode = (volume = 0.3) => {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.45);

        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.9);

        setTimeout(() => {
            if (!audioCtx) return;
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();

            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(660, audioCtx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(330, audioCtx.currentTime + 0.45);

            gain2.gain.setValueAtTime(volume, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.9);

            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);

            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.9);
        }, 500);

    } catch (err) {
        console.error("❌ Audio synthesis failed:", err.message);
    }
};

const AdminLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [desktopOpen, setDesktopOpen] = useState(true);

    // Sidebar manual rearrangement & lock/unlock state
    const [sidebarItems, setSidebarItems] = useState(getSavedSidebarItems);
    const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_LOCKED);
            return saved !== null ? saved === 'true' : true;
        } catch (e) {
            return true;
        }
    });
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    const saveSidebarOrder = (newItems) => {
        try {
            const paths = newItems.map(item => item.path);
            localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(paths));
        } catch (e) {
            console.error("Failed to save sidebar order to localStorage:", e);
        }
    };

    const toggleSidebarLock = () => {
        setIsSidebarLocked(prev => {
            const next = !prev;
            try {
                localStorage.setItem(STORAGE_KEY_LOCKED, String(next));
            } catch (e) {}
            return next;
        });
    };

    const handleMoveUp = (index) => {
        if (isSidebarLocked || index <= 0) return;
        setSidebarItems(prev => {
            const updated = [...prev];
            const temp = updated[index - 1];
            updated[index - 1] = updated[index];
            updated[index] = temp;
            saveSidebarOrder(updated);
            return updated;
        });
    };

    const handleMoveDown = (index) => {
        if (isSidebarLocked || index >= sidebarItems.length - 1) return;
        setSidebarItems(prev => {
            const updated = [...prev];
            const temp = updated[index + 1];
            updated[index + 1] = updated[index];
            updated[index] = temp;
            saveSidebarOrder(updated);
            return updated;
        });
    };

    const handleResetSidebarOrder = () => {
        setSidebarItems(SIDEBAR_ITEMS);
        try {
            localStorage.removeItem(STORAGE_KEY_ORDER);
        } catch (e) {}
    };

    const handleDragStart = (e, index) => {
        if (isSidebarLocked) return;
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    };

    const handleDragOver = (e, index) => {
        if (isSidebarLocked) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDrop = (e, targetIndex) => {
        if (isSidebarLocked) return;
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === undefined || draggedIndex === targetIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        setSidebarItems(prev => {
            const updated = [...prev];
            const [movedItem] = updated.splice(draggedIndex, 1);
            updated.splice(targetIndex, 0, movedItem);
            saveSidebarOrder(updated);
            return updated;
        });

        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileOpen]);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [toast, setToast] = useState({ 
        show: false, 
        title: '', 
        message: '', 
        projectName: '', 
        updatedBy: '', 
        reason: '', 
        remarks: '', 
        timestamp: '' 
    });

    const [criticalAlerts, setCriticalAlerts] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [activePopupAlert, setActivePopupAlert] = useState(null);
    const [supportAlertToast, setSupportAlertToast] = useState(null);
    const handledSupportRequestIds = React.useRef(new Set());

    const fetchNotifications = async () => {
        try {
            const statsRes = await api.get('/projects/dashboard/stats');
            setUnreadCount(statsRes.data.unreadCount || 0);
            setNotifications(statsRes.data.recentNotifications || []);
        } catch (err) {
            console.error("Failed to fetch notifications in layout:", err);
        }
    };

    const fetchActiveAlerts = async () => {
        try {
            const res = await api.get('/notifications?status=Active');
            const activeNotifs = res.data;
            const criticals = activeNotifs.filter(n => n.priority === 'Critical' && n.status === 'Active');
            setCriticalAlerts(criticals);
        } catch (err) {
            console.error("Failed to fetch active alerts:", err);
        }
    };

    const fetchAllAlertState = async () => {
        await fetchNotifications();
        await fetchActiveAlerts();
    };

    const registerPushSubscription = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn("⚠️ Push messaging is not supported in this browser.");
            return;
        }
        try {
            const registration = await navigator.serviceWorker.ready;
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn("⚠️ Web Push notification permission denied.");
                return;
            }

            const keyRes = await api.get('/notifications/vapid');
            const publicVapidKey = keyRes.data.publicKey;

            const urlBase64ToUint8Array = (base64String) => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
            };

            const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            await api.post('/notifications/subscribe', { subscription });
            console.log("🔑 Web Push subscription verified with server.");
        } catch (error) {
            console.error("❌ Failed to register push subscription:", error);
        }
    };

    useEffect(() => {
        unlockAudio();
        fetchAllAlertState();
        registerPushSubscription();

        const socket = getSocket();
        socket.connect();
        
        socket.emit('join-room', 'admin');

        socket.on('admin-notification', (notif) => {
            console.log("🔔 Real-time Admin Notification Received:", notif);
            setUnreadCount(prev => prev + 1);
            setNotifications(prev => [notif, ...prev.slice(0, 9)]);
            fetchActiveAlerts();

            // Play notification sound chime for inbound alert
            if (!isMuted && notif.soundEnabled !== false) {
                playNotificationSound(notif.selectedTone || 'chime', notif.soundVolume ?? 85);
            }

            // Desktop native notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                    new Notification(notif.title || 'New Admin Notification', {
                        body: notif.message || notif.projectName || 'A new system update was received.',
                        icon: '/logo512.png',
                        badge: '/logo512.png'
                    });
                } catch (e) {
                    console.warn("Desktop notification trigger failed:", e);
                }
            }

            // Open priority popup modal for Critical/High/Medium priority alerts
            if (['Critical', 'High', 'Medium'].includes(notif.priority)) {
                setActivePopupAlert(notif);
            } else {
                setToast({
                    show: true,
                    title: notif.title,
                    message: notif.message,
                    projectName: notif.projectName,
                    updatedBy: notif.updatedBy?.name || 'Staff',
                    reason: notif.reason,
                    remarks: notif.remarks,
                    timestamp: new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });

                setTimeout(() => {
                    setToast(t => ({ ...t, show: false }));
                }, 6000);
            }
        });

        socket.on('admin-notification-update', (updatedNotif) => {
            console.log("🔔 Real-time Notification Update Received:", updatedNotif);
            fetchAllAlertState();
            
            setActivePopupAlert(currentPopup => {
                if (currentPopup && currentPopup._id === updatedNotif._id) {
                    if (updatedNotif.status !== 'Active') {
                        return null;
                    }
                }
                return currentPopup;
            });
        });

        // Real-time Technical Support Inbound Request from Client
        socket.on('technical-support-request', (data) => {
            console.log("🔔 Inbound Technical Support Request Alert:", data);
            
            // Deduplicate to prevent multiple chime sounds for retried/duplicate events
            const reqKey = data.requestId || data.firestoreId || `${data.projectId}_${data.clientEmail}`;
            if (handledSupportRequestIds.current.has(reqKey)) {
                console.log("ℹ️ Support request alert already handled; skipping duplicate sound.");
                return;
            }
            handledSupportRequestIds.current.add(reqKey);

            // Play short professional notification chime on admin device only
            if (!isMuted && data.soundEnabled !== false) {
                playNotificationSound(data.selectedTone || 'chime', data.soundVolume ?? 80);
            }

            // Desktop notification (if permitted)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification(`Support Request: ${data.projectTitle}`, {
                    body: `${data.clientName}: ${data.reason}\n${data.description || ''}`,
                    icon: '/logo512.png',
                    badge: '/logo512.png'
                });
            }

            // Show interactive in-app toast
            setSupportAlertToast({
                requestId: data.requestId,
                firestoreId: data.firestoreId,
                projectId: data.projectId,
                projectTitle: data.projectTitle,
                clientName: data.clientName,
                clientEmail: data.clientEmail,
                reason: data.reason,
                description: data.description,
                submittedAt: data.submittedAt || new Date().toISOString()
            });

            setUnreadCount(prev => prev + 1);
            fetchAllAlertState();
        });

        // Admin confirmation tone when support request is approved
        socket.on('technical-support-approved-admin', (data) => {
            console.log("🔔 Technical Support Approved Confirmation:", data);
            if (!isMuted) {
                playNotificationSound(data.selectedTone || 'chime', (data.soundVolume ?? 80) * 0.7);
            }
        });

        const interval = setInterval(() => {
            fetchAllAlertState();
        }, 12000);

        return () => {
            socket.off('admin-notification');
            socket.off('admin-notification-update');
            socket.off('technical-support-request');
            socket.off('technical-support-approved-admin');
            socket.disconnect();
            clearInterval(interval);
        };
    }, []);

    useEffect(() => {
        if (criticalAlerts.length === 0 || isMuted) {
            return;
        }

        const triggerAlertCycle = () => {
            const now = new Date();
            let volume = 0.3;
            let hasEscalated = false;

            for (const alert of criticalAlerts) {
                const created = new Date(alert.createdAt);
                const diffMinutes = (now - created) / 60000;
                if (diffMinutes > 5) {
                     hasEscalated = true;
                     break;
                }
            }

            if (hasEscalated) {
                volume = 0.85;
                if (Notification.permission === 'granted') {
                    new Notification("🚨 CRITICAL ALERT ESCALATION", {
                        body: "A critical alert has remained unresolved for more than 5 minutes!",
                        icon: '/logo192.png',
                        tag: 'escalation-alert'
                    });
                }
            }

            playSirenNode(volume);
        };

        triggerAlertCycle();
        const sirenInterval = setInterval(triggerAlertCycle, 10000);

        return () => clearInterval(sirenInterval);
    }, [criticalAlerts, isMuted]);

    const userRole = (user?.role || user?.user?.role || '').toLowerCase();
    const isAllowedAdminPortal = ['admin', 'manager', 'finance_admin'].includes(userRole);

    const visibleSidebarItems = useMemo(() => {
        if (userRole === 'admin') return sidebarItems;
        return sidebarItems.filter(item => hasUserAccessToArea(user, item.path));
    }, [sidebarItems, userRole, user]);

    if (!isAuthenticated || !isAllowedAdminPortal) {
        const msg = `AUTH REJECT: auth=${isAuthenticated}, role=${userRole}`;
        console.warn(msg);
        
        // If we think we are in, but the role check is failing, show visible diagnostics
        if (isAuthenticated) {
            return (
                <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
                   <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
                       <AlertCircle className="w-10 h-10 text-rose-500" />
                   </div>
                   <h1 className="text-2xl font-bold mb-2 uppercase tracking-widest">Access Control Violation</h1>
                   <p className="text-slate-400 text-sm mb-12">The identity provided is valid, but doesn't have permissions to access the Admin Terminal.</p>
                   
                   <div className="bg-slate-800/50 p-6 rounded-3xl w-full max-w-md border border-slate-700 text-left space-y-4 mb-12">
                      <div className="flex justify-between border-b border-slate-700 pb-3">
                         <span className="text-xs uppercase tracking-widest text-[#2563EB] font-bold">Authentication</span>
                         <span className="text-xs font-bold text-emerald-400">{isAuthenticated ? "ACTIVE" : "NONE"}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-3">
                         <span className="text-xs uppercase tracking-widest text-[#2563EB] font-bold">Detected Role</span>
                         <span className="text-xs font-bold uppercase text-rose-400">{userRole || "NULL / UNDEFINED"}</span>
                      </div>
                      <div className="flex justify-between">
                         <span className="text-xs uppercase tracking-widest text-[#2563EB] font-bold">Identity Name</span>
                         <span className="text-xs font-bold text-white">{user?.name || user?.user?.name || "ANONYMOUS"}</span>
                      </div>
                   </div>

                   <button onClick={() => { logout(); navigate('/login'); }} className="px-12 py-4 bg-[#2563EB] rounded-2xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20">
                      Fallback to Login
                   </button>
                </div>
            );
        }
        
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
    const closeMobile = () => setMobileOpen(false);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex font-sans overflow-x-hidden transition-colors duration-250 print:min-h-0 print:bg-white">
            {/* ── Desktop Sidebar ─────────────────────── */}
            <aside className={`no-print hidden md:flex flex-col fixed top-0 left-0 h-full bg-white dark:bg-slate-900 dark:bg-slate-950 text-slate-800 dark:text-slate-200 dark:text-white z-40 border-r border-slate-200 dark:border-slate-700 dark:border-slate-800 shadow-2xl transition-all duration-300 ${desktopOpen ? SIDEBAR_W : 'w-0 overflow-hidden'}`}>
                {desktopOpen && (
                    <SidebarContent 
                        location={location} 
                        user={user} 
                        onNavClick={() => { }} 
                        onLogout={handleLogout}
                        items={visibleSidebarItems}
                        isLocked={isSidebarLocked}
                        onToggleLock={toggleSidebarLock}
                        onResetOrder={handleResetSidebarOrder}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDrop}
                        draggedIndex={draggedIndex}
                        dragOverIndex={dragOverIndex}
                    />
                )}
            </aside>

            {/* ── Mobile Sidebar (Direct Render for Stability) ──────────────── */}
            {mobileOpen && (
                <div className="no-print fixed inset-0 z-[60] md:hidden">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMobile} />
                    <aside className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-900 dark:bg-slate-950 text-slate-800 dark:text-slate-200 dark:text-white z-[70] flex flex-col border-r border-slate-200 dark:border-slate-700 dark:border-slate-800 shadow-2xl ${SIDEBAR_W} transition-transform`}>
                        <div className="absolute top-4 right-4 z-[80]">
                            <button onClick={closeMobile} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 backdrop-blur rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 ">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <SidebarContent 
                            location={location} 
                            user={user} 
                            onNavClick={closeMobile} 
                            onLogout={handleLogout}
                            items={visibleSidebarItems}
                            isLocked={isSidebarLocked}
                            onToggleLock={toggleSidebarLock}
                            onResetOrder={handleResetSidebarOrder}
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                            onDrop={handleDrop}
                            draggedIndex={draggedIndex}
                            dragOverIndex={dragOverIndex}
                        />
                    </aside>
                </div>
            )}

            {/* ── Main Content ────────────────────────── */}
            <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${desktopOpen ? 'md:ml-[280px]' : 'md:ml-0'} print:ml-0 print:min-h-0 print:p-0`}>
                <header className="sticky top-0 z-50 h-16 bg-gradient-to-r from-[#1E3A8A] to-[#2563EB] px-3 sm:px-4 md:px-6 flex items-center justify-between gap-2 shadow-lg dark:from-slate-900 dark:to-slate-950 dark:border-b dark:border-slate-800 no-print print:hidden">
                    <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                        <button
                            onClick={() => window.innerWidth < 768 ? setMobileOpen(true) : setDesktopOpen(v => !v)}
                            className="p-2 bg-white/10 dark:bg-slate-800/50 rounded-xl text-white hover:bg-white/20 dark:hover:bg-slate-800/70 transition-all border border-white/10 shrink-0"
                            title="Toggle Menu"
                        >
                            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white/10 dark:bg-slate-800/50 rounded-xl text-white hover:bg-white/20 dark:hover:bg-slate-800/70 transition-all border border-white/10 flex items-center justify-center shrink-0"
                            title="Go Back"
                        >
                            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight truncate max-w-[130px] sm:max-w-[200px] md:max-w-xs">
                            {SIDEBAR_ITEMS.find(i => i.path === location.pathname)?.name || 'Admin Terminal'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <ThemeToggle darkNavbar={true} />

                        {/* Notification Bell with Industrial Real-Time Dropdown */}
                        <NotificationBellDropdown role="admin" />

                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white hidden sm:block truncate max-w-[100px]">{user?.name || user?.user?.name || "Admin"}</p>
                            <div className="w-8 h-8 bg-white/20 dark:bg-slate-800/70 rounded-xl border border-white/20 flex items-center justify-center text-white shrink-0">
                                <User className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-2 sm:p-4 md:p-8 pb-8 overflow-x-hidden min-w-0 w-full print:p-0 print:m-0 print:overflow-visible">
                    <div className="max-w-[1500px] mx-auto min-w-0 w-full print:max-w-none print:m-0 print:p-0">
                        {(() => {
                            const currentPath = location.pathname;
                            const isProfile = currentPath === '/admin/profile' || currentPath === '/admin/profile/';
                            const hasRouteAccess = userRole === 'admin' || isProfile || hasUserAccessToArea(user, currentPath);

                            if (hasRouteAccess) {
                                return <Outlet />;
                            }

                            return (
                                <div className="p-8 my-8 max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-xl text-center space-y-4">
                                    <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                                        <Lock className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                            Module Access Restricted
                                        </h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                                            Your account ({userRole === 'finance_admin' ? 'Finance Admin' : userRole === 'manager' ? 'Operations Manager' : userRole}) has not been granted permission to access this ERP module. Please contact your System Administrator.
                                        </p>
                                    </div>
                                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                                        {visibleSidebarItems.length > 0 && (
                                            <button
                                                onClick={() => navigate(visibleSidebarItems[0].path)}
                                                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20"
                                            >
                                                Go to {visibleSidebarItems[0].name}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => navigate('/admin/profile')}
                                            className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                                        >
                                            View My Profile
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </main>

                {/* WhatsApp-Style Popup Toast */}
                <AnimatePresence>
                    {toast.show && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 z-[9999] bg-white dark:bg-slate-900 dark:bg-dark-surface rounded-3xl shadow-2xl border-4 border-brand-950 p-4 sm:p-6 flex items-start gap-4 cursor-pointer text-slate-800 dark:text-slate-200"
                            onClick={() => {
                                setToast(t => ({ ...t, show: false }));
                                navigate('/admin/notifications');
                            }}
                        >
                            <div className="w-10 h-10 bg-brand-950 text-white rounded-2xl flex items-center justify-center flex-shrink-0 font-black shadow-md text-lg">
                                💬
                            </div>
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">System Alert</span>
                                    <span className="text-[9px] text-slate-400 font-bold">{toast.timestamp}</span>
                                </div>
                                <h4 className="font-bold text-sm text-[#111827] dark:text-dark-text mt-1">{toast.title}</h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 dark:text-dark-muted mt-1 leading-relaxed">
                                    Project: <span className="font-bold text-slate-800 dark:text-slate-200 dark:text-dark-text">{toast.projectName}</span>
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Updated By: {toast.updatedBy}</p>
                                {toast.reason && (
                                    <div className="mt-2.5 p-2 bg-amber-50/20 dark:bg-amber-950/20 border border-amber-200 rounded-xl text-[10px] text-amber-800 dark:text-amber-200">
                                        <span className="font-bold">Reason:</span> {toast.reason}
                                        {toast.remarks && <p className="mt-1 font-medium italic">"{toast.remarks}"</p>}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setToast(t => ({ ...t, show: false }));
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:bg-slate-800 flex-shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}

                    {/* Mute Siren Floating Control Bar */}
                    {criticalAlerts.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-24 left-3 right-3 sm:left-6 sm:right-auto sm:max-w-md z-[9998] bg-rose-600 text-white px-4 sm:px-6 py-4 rounded-3xl shadow-2xl border-4 border-white flex flex-col sm:flex-row items-center gap-3 sm:gap-4 animate-bounce"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white dark:bg-slate-900 text-rose-600 rounded-full flex items-center justify-center font-black animate-pulse">
                                    🚨
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest leading-none">Critical Incident Active</p>
                                    <p className="text-[10px] text-rose-200 mt-1 font-bold">{criticalAlerts.length} unresolved safety or breakdown alerts</p>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                                <button 
                                    onClick={() => setIsMuted(prev => !prev)}
                                    className="bg-white dark:bg-slate-900 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors whitespace-nowrap"
                                >
                                    {isMuted ? '🔇 Unmute' : '🔊 Mute Siren'}
                                </button>
                                <button 
                                    onClick={() => navigate('/admin/notifications')}
                                    className="bg-brand-950 text-white hover:bg-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors whitespace-nowrap"
                                >
                                    ⚠️ View & Stop
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Emergency Priority Alert Modal Popup */}
                    {activePopupAlert && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`w-full max-w-lg bg-white dark:bg-slate-900 dark:bg-dark-surface rounded-3xl shadow-2xl border-t-8 p-8 ${
                                    activePopupAlert.priority === 'Critical' ? 'border-red-600' :
                                    activePopupAlert.priority === 'High' ? 'border-orange-500' :
                                    activePopupAlert.priority === 'Medium' ? 'border-yellow-400' :
                                    'border-blue-500'
                                }`}
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md ${
                                        activePopupAlert.priority === 'Critical' ? 'bg-red-50 text-red-600' :
                                        activePopupAlert.priority === 'High' ? 'bg-orange-50 text-orange-500' :
                                        activePopupAlert.priority === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                                        'bg-blue-50 text-blue-600'
                                    }`}>
                                        {activePopupAlert.priority === 'Critical' ? '🚨' :
                                         activePopupAlert.priority === 'High' ? '⚠️' :
                                         activePopupAlert.priority === 'Medium' ? '⚡' : 'ℹ️'}
                                    </div>
                                    <div>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                            activePopupAlert.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                                            activePopupAlert.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                            activePopupAlert.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {activePopupAlert.priority} Emergency Alert
                                        </span>
                                        <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white dark:text-dark-text mt-1">{activePopupAlert.title}</h3>
                                    </div>
                                </div>

                                <div className="space-y-4 bg-slate-50 dark:bg-slate-800 dark:bg-dark-bg p-5 rounded-2xl border border-slate-100 dark:border-slate-800 dark:border-dark-border mb-6">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Project:</span>
                                        <span className="font-extrabold text-slate-800 dark:text-slate-200 dark:text-dark-text">{activePopupAlert.projectName}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider">Reported By:</span>
                                        <span className="font-extrabold text-slate-800 dark:text-slate-200 dark:text-dark-text">{activePopupAlert.updatedBy?.name || 'Staff User'}</span>
                                    </div>
                                    {activePopupAlert.reason && (
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider">Reason:</span>
                                            <span className="font-extrabold text-amber-600 dark:text-amber-400">{activePopupAlert.reason}</span>
                                        </div>
                                    )}
                                    {activePopupAlert.remarks && (
                                        <div className="border-t border-slate-200/50 dark:border-slate-700/50 dark:border-dark-border/50 pt-3">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Remarks:</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 dark:text-dark-muted font-medium italic">"{activePopupAlert.remarks}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-3 justify-end">
                                    <button 
                                        onClick={() => {
                                            setActivePopupAlert(null);
                                        }}
                                        className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                                    >
                                        Dismiss
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setActivePopupAlert(null);
                                            navigate(`/admin/projects?id=${activePopupAlert.projectId}`);
                                        }}
                                        className="px-5 py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-extrabold transition-all"
                                    >
                                        View Project
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            try {
                                                await api.put(`/notifications/${activePopupAlert._id}/acknowledge`, {
                                                    remarks: 'Quick Acknowledged via Alert Popup Modal'
                                                });
                                                setActivePopupAlert(null);
                                                fetchAllAlertState();
                                            } catch (err) {
                                                console.error("Acknowledge failure:", err);
                                            }
                                        }}
                                        className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg transition-all ${
                                            activePopupAlert.priority === 'Critical' ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' :
                                            activePopupAlert.priority === 'High' ? 'bg-orange-50 hover:bg-orange-400 shadow-orange-500/20' :
                                            activePopupAlert.priority === 'Medium' ? 'bg-yellow-50 hover:bg-yellow-400 text-slate-900 dark:text-white shadow-yellow-500/20' :
                                            'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                                        }`}
                                    >
                                        Acknowledge Alert
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ── TECHNICAL SUPPORT INBOUND POPUP TOAST ── */}
                <AnimatePresence>
                    {supportAlertToast && (
                        <div className="fixed bottom-6 left-3 right-3 sm:left-auto sm:right-6 z-[70] sm:max-w-md pointer-events-auto">
                            <motion.div
                                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                className="bg-slate-900 border-2 border-indigo-500 text-white rounded-3xl p-6 shadow-2xl shadow-indigo-500/20 space-y-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/40">
                                            <Bell className="w-5 h-5 animate-bounce" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                                New Support Request
                                            </div>
                                            <h4 className="text-base font-black tracking-tight text-white leading-tight">
                                                {supportAlertToast.projectTitle}
                                            </h4>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSupportAlertToast(null)}
                                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="bg-slate-800/80 rounded-2xl p-4 space-y-2 text-xs border border-slate-700/60">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">Client:</span>
                                        <span className="font-extrabold text-slate-200">{supportAlertToast.clientName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">Email:</span>
                                        <span className="font-mono text-[11px] text-indigo-300">{supportAlertToast.clientEmail}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">Reason:</span>
                                        <span className="font-bold text-amber-400">{supportAlertToast.reason}</span>
                                    </div>
                                    {supportAlertToast.description && (
                                        <div className="pt-2 border-t border-slate-700 text-slate-300 italic text-[11px]">
                                            "{supportAlertToast.description}"
                                        </div>
                                    )}
                                    <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                                        <span>Submitted:</span>
                                        <span>{new Date(supportAlertToast.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSupportAlertToast(null)}
                                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black uppercase tracking-widest rounded-xl transition border-none cursor-pointer"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSupportAlertToast(null);
                                            navigate('/admin/support');
                                        }}
                                        className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 border-none cursor-pointer"
                                    >
                                        Review in Support Hub &rarr;
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminLayout;
