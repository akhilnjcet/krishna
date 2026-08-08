import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, User, Bot, Loader2, Phone, FileText } from 'lucide-react';
import api from '../services/api';

const AIChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I am the Krishna Engineering AI assistant. How can I help you today? Do you need a quote or have questions about our services?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [leadForm, setLeadForm] = useState({ show: false, name: '', phone: '', requirement: '' });
    const [contactSettings, setContactSettings] = useState({ primaryPhone: '+919447940835', whatsappNumber: '+919447940835' });
    const messagesEndRef = useRef(null);

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
        if (e.target.closest('.close-btn') || e.target.closest('input') || e.target.closest('textarea')) return;
        startDrag(e.clientX, e.clientY);
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 0) return;
        // Prevent drag on close button or inputs
        if (e.target.closest('.close-btn') || e.target.closest('input') || e.target.closest('textarea')) return;
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

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            // Include context of previous messages
            const chatHistory = messages.concat({ role: 'user', content: userMsg });
            const res = await api.post('/chat', { messages: chatHistory });
            
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);

            // Heuristics: If AI mentions "phone number" or "contact", prompt lead form
            if (res.data.reply.toLowerCase().includes('phone number') || res.data.reply.toLowerCase().includes('quote')) {
                setTimeout(() => setLeadForm(prev => ({ ...prev, show: true, requirement: userMsg })), 2000);
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Connection issue. Please use our WhatsApp or Call directly.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const submitLead = async (e) => {
        e.preventDefault();
        setIsTyping(true);
        try {
            await api.post('/leads', { 
                name: leadForm.name, 
                phone: leadForm.phone, 
                message: leadForm.requirement 
            });
            setLeadForm({ show: false, name: '', phone: '', requirement: '' });
            setMessages(prev => [...prev, { role: 'assistant', content: 'Thank you! We have received your contact details. Our team will call you shortly.' }]);
        } catch (error) {
            console.error('Lead error:', error);
            alert("Failed to send details. Please use WhatsApp.");
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
                        className="absolute bottom-20 right-0 w-[90vw] md:w-[380px] h-[550px] max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700"
                    >
                        {/* Header */}
                        <div 
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                            className="bg-brand-900 text-white p-4 flex items-center justify-between shadow-md cursor-grab active:cursor-grabbing select-none"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-brand-800 rounded-full flex items-center justify-center">
                                        <Bot className="w-6 h-6 text-brand-accent" />
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-brand-900"></div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Krishna Assistant</h3>
                                    <p className="text-[10px] text-brand-300 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Online
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="close-btn p-2 hover:bg-brand-800 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
 
                        {/* Quick Actions */}
                        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex gap-2 overflow-x-auto mx-auto scrollbar-hide w-full">
                            {contactSettings.primaryPhone ? (
                                <a 
                                    href={`tel:${contactSettings.primaryPhone.replace(/[^0-9+]/g, '')}`} 
                                    className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full text-brand-900 shadow-sm hover:border-brand-accent transition-colors"
                                    title={`Call ${contactSettings.primaryPhone}`}
                                >
                                    <Phone className="w-3 h-3 text-brand-accent" /> Call Now
                                </a>
                            ) : (
                                <button 
                                    disabled 
                                    className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full text-slate-400 cursor-not-allowed"
                                    title="Contact number not available."
                                >
                                    <Phone className="w-3 h-3 text-slate-400" /> Contact number not available.
                                </button>
                            )}

                            {contactSettings.whatsappNumber && (
                                <a 
                                    href={`https://wa.me/${contactSettings.whatsappNumber.replace(/[^0-9]/g, '')}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-emerald-800 shadow-sm hover:bg-emerald-100 transition-colors"
                                >
                                    <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp
                                </a>
                            )}

                            <button onClick={() => setInput("Get Quote")} className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full text-brand-900 shadow-sm hover:border-brand-accent transition-colors">
                                <FileText className="w-3 h-3 text-brand-accent" /> Get Quote
                            </button>
                        </div>
 
                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-800/50">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-brand-900 text-white rounded-br-sm' 
                                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm shadow-sm'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
 
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            )}
 
                            {leadForm.show && (
                                <form onSubmit={submitLead} className="bg-white dark:bg-slate-900 border-2 border-brand-accent/30 rounded-xl p-4 shadow-sm animate-in slide-in-from-bottom-2">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-accent mb-3">Instant Callback Request</h4>
                                    <div className="space-y-3">
                                        <input 
                                            required placeholder="Your Name" 
                                            value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                                            className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-brand-accent"
                                        />
                                        <input 
                                            required placeholder="Phone Number" type="tel"
                                            value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                                            className="w-full text-sm px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-brand-accent"
                                        />
                                        <button type="submit" className="w-full bg-brand-900 hover:bg-black text-white font-bold py-2 rounded-lg text-sm transition-colors flex justify-center items-center gap-2">
                                            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request Quote / Callback'}
                                        </button>
                                    </div>
                                </form>
                            )}
 
                            <div ref={messagesEndRef} />
                        </div>
 
                        {/* Input Area */}
                        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
                            <form onSubmit={handleSend} className="flex items-center gap-2 relative">
                                <input 
                                    type="text" 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..." 
                                    className="flex-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all border border-transparent focus:border-brand-accent/50 pr-12"
                                />
                                <button type="submit" disabled={!input.trim() || isTyping} className="absolute right-2 p-1.5 bg-brand-accent text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-accentHover transition-colors">
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
