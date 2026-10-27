import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User, Bot, Loader2, Phone, FileText } from 'lucide-react';
import api from '../services/api';
const FormattedChatMessage = ({ content }) => {
    if (!content) return null;

    const lines = content.split('\n');

    const renderInline = (text) => {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                const inner = part.slice(2, -2).trim();
                return (
                    <strong key={idx} className="font-extrabold text-slate-900 dark:text-white">
                        {inner}
                    </strong>
                );
            }
            // Strip any remaining unwanted *, # marks
            return part.replace(/[*#]/g, '');
        });
    };

    return (
        <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) {
                    return <div key={idx} className="h-1" />;
                }

                // Check for markdown headers like ### or ## or #
                if (/^#{1,6}\s+/.test(trimmed)) {
                    const headerText = trimmed.replace(/^#{1,6}\s+/, '').replace(/[*#]/g, '').trim();
                    return (
                        <div key={idx} className="font-black text-xs sm:text-sm text-slate-900 dark:text-white mt-2 pt-1 border-b border-slate-200/60 dark:border-slate-800 pb-0.5">
                            {headerText}
                        </div>
                    );
                }

                // Check for bullet items like * or - or •
                if (/^[\*\-\•]\s+/.test(trimmed)) {
                    const bulletBody = trimmed.replace(/^[\*\-\•]\s+/, '');
                    return (
                        <div key={idx} className="flex items-start gap-2 pl-1 py-0.5">
                            <span className="text-blue-500 dark:text-blue-400 font-black flex-shrink-0 mt-0.5 text-xs">•</span>
                            <div className="flex-1 text-slate-800 dark:text-slate-200">
                                {renderInline(bulletBody)}
                            </div>
                        </div>
                    );
                }

                // Regular paragraph line
                return (
                    <div key={idx} className="text-slate-800 dark:text-slate-200">
                        {renderInline(trimmed)}
                    </div>
                );
            })}
        </div>
    );
};

const AIChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { 
            role: 'assistant', 
            content: 'Hello! 👋 I am your Krishna Engineering AI Technical Consultant.\n\nI can calculate rough shed costs, recommend roofing sheets, discuss ISMB structural specs, or help plan your project. How can I assist you today? (Feel free to ask in English or Malayalam/Manglish!)' 
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [leadForm, setLeadForm] = useState({ show: false, name: '', phone: '', requirement: '' });
    const [contactSettings, setContactSettings] = useState({ primaryPhone: '+919447940835', whatsappNumber: '+919447940835' });
    const messagesEndRef = useRef(null);

    const SUGGESTIONS = [
        "What is the cost for a 1500 sq ft industrial shed?",
        "Which roofing sheet is best for Kerala monsoon?",
        "What steel sections do you use for trusses?",
        "How can I book a free site inspection?"
    ];

    // Fetch Admin Contact Settings for Chatbot
    useEffect(() => {
        api.get('/chatbot-settings/contact')
            .then(res => {
                if (res.data) setContactSettings(res.data);
            })
            .catch(err => console.warn('Chatbot contact settings fetch error:', err));
    }, []);

    // Draggable position state (remembered in localStorage)
    const [position, setPosition] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('krishna_ai_widget_pos');
                if (saved) return JSON.parse(saved);
            } catch (e) {}
        }
        return { x: 0, y: 0 };
    });

    const currentPosRef = useRef(position);
    useEffect(() => {
        currentPosRef.current = position;
    }, [position]);

    const dragRef = useRef({
        isDragging: false,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0,
        hasMoved: false
    });

    const clampPosition = (x, y) => {
        if (typeof window === 'undefined') return { x, y };
        const isMobile = window.innerWidth < 640;
        const buttonSize = isMobile ? 48 : 56;
        const margin = 12;
        const baseOffsetY = isMobile ? 96 : 24;
        const baseOffsetX = isMobile ? 16 : 24;
        // Negative x moves left from right
        const minX = -(window.innerWidth - buttonSize - baseOffsetX - margin);
        const maxX = baseOffsetX - margin;
        // Negative y moves up from bottom
        const minY = -(window.innerHeight - buttonSize - baseOffsetY - margin);
        const maxY = baseOffsetY - margin;

        return {
            x: Math.min(maxX, Math.max(minX, x)),
            y: Math.min(maxY, Math.max(minY, y))
        };
    };

    useEffect(() => {
        const handleResize = () => {
            setPosition(prev => clampPosition(prev.x, prev.y));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handlePointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return; // left click only
        if (e.target.closest('.no-drag') || e.target.closest('input') || e.target.closest('textarea')) return;

        dragRef.current = {
            isDragging: true,
            startX: e.clientX,
            startY: e.clientY,
            originX: position.x,
            originY: position.y,
            hasMoved: false
        };

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}
    };

    const handlePointerMove = (e) => {
        if (!dragRef.current.isDragging) return;

        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            dragRef.current.hasMoved = true;
        }

        if (dragRef.current.hasMoved) {
            const clamped = clampPosition(dragRef.current.originX + dx, dragRef.current.originY + dy);
            currentPosRef.current = clamped;
            setPosition(clamped);
        }
    };

    const handlePointerUp = (e) => {
        if (!dragRef.current.isDragging) return;
        dragRef.current.isDragging = false;
        try {
            if (e.currentTarget?.hasPointerCapture?.(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch (err) {}

        if (dragRef.current.hasMoved) {
            try {
                localStorage.setItem('krishna_ai_widget_pos', JSON.stringify(currentPosRef.current));
            } catch (err) {}
            setTimeout(() => {
                dragRef.current.hasMoved = false;
            }, 120);
        }
    };

    const handleToggleClick = (e) => {
        if (dragRef.current.hasMoved) {
            e.preventDefault();
            e.stopPropagation();
            dragRef.current.hasMoved = false;
            return;
        }
        setIsOpen(prev => !prev);
    };

    const handleResetPosition = (e) => {
        e.stopPropagation();
        setPosition({ x: 0, y: 0 });
        currentPosRef.current = { x: 0, y: 0 };
        try {
            localStorage.removeItem('krishna_ai_widget_pos');
        } catch (err) {}
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, leadForm.show]);

    const sendUserMessage = async (text) => {
        const userMsg = text.trim();
        if (!userMsg) return;
        
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            const chatHistory = messages.concat({ role: 'user', content: userMsg });
            const res = await api.post('/chat', { messages: chatHistory });
            
            if (res.data?.reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
            }

            // Only prompt lead form if the user explicitly asks for a callback/phone reachout
            if (/call me|call back|callback|my phone|contact me|my number|reach me/i.test(userMsg)) {
                setTimeout(() => setLeadForm(prev => ({ ...prev, show: true, requirement: userMsg })), 1000);
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'We are ready to help with your project! Please call or WhatsApp us directly at ' + (contactSettings.primaryPhone || '+91 9447940835') + ' for instant engineering support.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSend = (e) => {
        e?.preventDefault();
        sendUserMessage(input);
    };

    const submitLead = async (e) => {
        e.preventDefault();
        setIsTyping(true);
        try {
            await api.post('/leads', { 
                name: leadForm.name, 
                phone: leadForm.phone, 
                message: leadForm.requirement || 'Requested via AI Chat Assistant'
            });
            setLeadForm({ show: false, name: '', phone: '', requirement: '' });
            setMessages(prev => [...prev, { role: 'assistant', content: 'Thank you! We have received your contact details. Our senior engineering team will call you shortly.' }]);
        } catch (error) {
            console.error('Lead error:', error);
            alert("Failed to send details. Please use WhatsApp or Call directly.");
        } finally {
            setIsTyping(false);
        }
    };

    const isLeft = typeof window !== 'undefined' && position.x < -(window.innerWidth / 2);
    const isTop = typeof window !== 'undefined' && position.y < -(window.innerHeight / 2);

    return (
        <div 
            className="fixed z-40 font-sans bottom-24 right-4 sm:bottom-6 sm:right-6 pointer-events-auto"
            style={{ 
                transform: `translate(${position.x}px, ${position.y}px)`,
                touchAction: 'none'
            }}
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: isTop ? -20 : 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: isTop ? -20 : 20, scale: 0.95 }}
                        className={`fixed sm:absolute inset-x-3 sm:inset-x-auto ${isTop ? 'top-16' : 'bottom-20'} ${isLeft ? 'sm:left-0' : 'sm:right-0'} w-auto sm:w-[400px] sm:max-w-[420px] h-[580px] max-h-[80dvh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800`}
                    >
                        {/* Header (Draggable) */}
                        <div 
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            style={{ touchAction: 'none' }}
                            className="bg-slate-900 dark:bg-black text-white p-4 flex items-center justify-between shadow-md cursor-grab active:cursor-grabbing select-none border-b border-white/10"
                        >
                            <div className="flex items-center gap-3 pointer-events-none">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-blue-600/20 border border-blue-400/30 rounded-2xl flex items-center justify-center">
                                        <Bot className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                                </div>
                                <div>
                                    <h3 className="font-black text-sm tracking-wide">Krishna AI Consultant</h3>
                                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Krishna Engineering Active
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    type="button"
                                    onClick={handleResetPosition} 
                                    title="Reset position to bottom right"
                                    className="no-drag px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    Reset
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setIsOpen(false)} 
                                    className="no-drag close-btn p-2 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
 
                        {/* Quick Contact Bar */}
                        <div className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide w-full text-[11px]">
                            {contactSettings.primaryPhone && (
                                <a 
                                    href={`tel:${contactSettings.primaryPhone.replace(/[^0-9+]/g, '')}`} 
                                    className="flex-shrink-0 flex items-center gap-1.5 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-slate-800 dark:text-white shadow-xs hover:border-blue-500 transition-colors"
                                    title={`Call ${contactSettings.primaryPhone}`}
                                >
                                    <Phone className="w-3 h-3 text-blue-500" /> Call
                                </a>
                            )}

                            {contactSettings.whatsappNumber && (
                                <a 
                                    href={`https://wa.me/${contactSettings.whatsappNumber.replace(/[^0-9]/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex-shrink-0 flex items-center gap-1.5 font-bold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-emerald-800 dark:text-emerald-300 shadow-xs hover:bg-emerald-100 transition-colors"
                                >
                                    <MessageSquare className="w-3 h-3 text-emerald-500" /> WhatsApp
                                </a>
                            )}

                            <button 
                                onClick={() => setLeadForm({ show: true, name: '', phone: '', requirement: '' })} 
                                className="flex-shrink-0 flex items-center gap-1.5 font-bold bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-xl text-amber-800 dark:text-amber-300 shadow-xs hover:bg-amber-100 transition-colors"
                            >
                                <Phone className="w-3 h-3 text-amber-500" /> Request Callback
                            </button>
                        </div>
 
                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60 dark:bg-slate-950/50">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-xs ${
                                        msg.role === 'user' 
                                            ? 'bg-blue-600 text-white rounded-br-xs text-xs sm:text-sm leading-relaxed whitespace-pre-line' 
                                             : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-bl-xs'
                                    }`}>
                                        {msg.role === 'user' ? (
                                            msg.content.replace(/[*#]/g, '')
                                        ) : (
                                            <FormattedChatMessage content={msg.content} />
                                        )}
                                    </div>
                                </div>
                            ))}
 
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-1.5 text-xs text-slate-500">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                        <span>Analyzing engineering specs...</span>
                                    </div>
                                </div>
                            )}

                            {/* Suggestion Chips when only initial message exists or user idle */}
                            {messages.length <= 2 && !isTyping && (
                                <div className="pt-2 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Popular Engineering Topics:</p>
                                    <div className="flex flex-col gap-1.5">
                                        {SUGGESTIONS.map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => sendUserMessage(s)}
                                                className="text-left text-xs bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-blue-400 p-2.5 rounded-xl text-slate-700 dark:text-slate-300 font-medium transition-all shadow-2xs"
                                            >
                                                💡 {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
 
                            {leadForm.show && (
                                <form onSubmit={submitLead} className="bg-white dark:bg-slate-900 border-2 border-blue-500/40 rounded-2xl p-4 shadow-lg animate-in slide-in-from-bottom-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Free Site Inspection / Callback</h4>
                                        <button type="button" onClick={() => setLeadForm({ ...leadForm, show: false })} className="text-slate-400 hover:text-slate-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        <input 
                                            required placeholder="Your Name / Company" 
                                            value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                                            className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                                        />
                                        <input 
                                            required placeholder="Phone Number (10 digits)" type="tel"
                                            value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                                            className="w-full text-xs px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-white"
                                        />
                                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex justify-center items-center gap-2 shadow-sm">
                                            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Callback Request'}
                                        </button>
                                    </div>
                                </form>
                            )}
 
                            <div ref={messagesEndRef} />
                        </div>
 
                        {/* Input Area */}
                        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                            <form onSubmit={handleSend} className="flex items-center gap-2 relative">
                                <input 
                                    type="text" 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about shed costs, roofing, specs..." 
                                    className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all border border-transparent focus:border-blue-500 text-slate-900 dark:text-white pr-12"
                                />
                                <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors">
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
 
            <button 
                onClick={handleToggleClick}
                onDoubleClick={handleResetPosition}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ touchAction: 'none' }}
                title="Drag freely to move, click to chat, double-click to reset"
                aria-label="AI Assistant (Draggable)"
                className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-900 border-2 border-brand-accent hover:bg-black text-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105 active:scale-95 z-50 relative group cursor-grab active:cursor-grabbing select-none touch-none"
            >
                {isOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4 pointer-events-none">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 bg-red-500 border-2 border-white"></span>
                    </span>
                )}
            </button>
        </div>
    );
};

export default AIChatWidget;
