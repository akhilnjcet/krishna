import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User, Bot, Loader2, Phone, FileText } from 'lucide-react';
import api from '../services/api';

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

    // Draggable position state
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [dragStart, setDragStart] = useState(null);
    const [hasDragged, setHasDragged] = useState(false);

    useEffect(() => {
        if (!dragStart) return;

        const handleMove = (clientX, clientY) => {
            const dx = clientX - dragStart.startX;
            const dy = clientY - dragStart.startY;
            
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                setHasDragged(true);
            }
            
            setPosition({
                x: dragStart.posX + dx,
                y: dragStart.posY + dy
            });
        };

        const onMouseMove = (e) => {
            handleMove(e.clientX, e.clientY);
        };

        const onTouchMove = (e) => {
            if (e.touches.length === 0) return;
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
        };

        const onEnd = () => {
            setDragStart(null);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onEnd);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, [dragStart]);

    const startDrag = (clientX, clientY) => {
        setHasDragged(false);
        setDragStart({
            startX: clientX,
            startY: clientY,
            posX: position.x,
            posY: position.y
        });
    };

    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Left click only
        // Prevent drag on close button or inputs
        if (e.target.closest('.close-btn') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('button')) return;
        startDrag(e.clientX, e.clientY);
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 0) return;
        // Prevent drag on close button or inputs
        if (e.target.closest('.close-btn') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('button')) return;
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleToggleClick = (e) => {
        if (hasDragged) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        setIsOpen(!isOpen);
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

    return (
        <div 
            className="fixed z-[100] font-sans"
            style={{ 
                bottom: '24px', 
                right: '24px',
                transform: `translate(${position.x}px, ${position.y}px)`,
                touchAction: 'none'
            }}
        >
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-20 right-0 w-[92vw] sm:w-[400px] h-[580px] max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
                    >
                        {/* Header */}
                        <div 
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                            className="bg-slate-900 dark:bg-black text-white p-4 flex items-center justify-between shadow-md cursor-grab active:cursor-grabbing select-none border-b border-white/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-blue-600/20 border border-blue-400/30 rounded-2xl flex items-center justify-center">
                                        <Bot className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                                </div>
                                <div>
                                    <h3 className="font-black text-sm tracking-wide">Krishna AI Consultant</h3>
                                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Groq Agent Active
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="close-btn p-2 hover:bg-white/10 rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
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
                                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs sm:text-sm whitespace-pre-line leading-relaxed shadow-xs ${
                                        msg.role === 'user' 
                                            ? 'bg-blue-600 text-white rounded-br-xs' 
                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                                    }`}>
                                        {msg.content}
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
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="w-14 h-14 bg-brand-900 border-2 border-brand-accent hover:bg-black text-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 z-50 relative group cursor-grab active:cursor-grabbing"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                    </span>
                )}
            </button>
        </div>
    );
};

export default AIChatWidget;
