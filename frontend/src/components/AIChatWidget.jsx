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
    const messagesEndRef = useRef(null);

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
        <div className="fixed bottom-6 right-6 z-[100] font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-20 right-0 w-[90vw] md:w-[380px] h-[550px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
                    >
                        {/* Header */}
                        <div className="bg-brand-900 text-white p-4 flex items-center justify-between shadow-md">
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
                            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-brand-800 rounded-lg transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex gap-2 overflow-x-auto mx-auto scrollbar-hide w-full">
                            <a href="tel:+919446000000" className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-full text-brand-900 shadow-sm hover:border-brand-accent transition-colors">
                                <Phone className="w-3 h-3 text-brand-accent" /> Call Now
                            </a>
                            <button onClick={() => setInput("Get Quote")} className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-full text-brand-900 shadow-sm hover:border-brand-accent transition-colors">
                                <FileText className="w-3 h-3 text-brand-accent" /> Get Quote
                            </button>
                        </div>

                        {/* Chat Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-brand-900 text-white rounded-br-sm' 
                                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            )}

                            {leadForm.show && (
                                <form onSubmit={submitLead} className="bg-white border-2 border-brand-accent/30 rounded-xl p-4 shadow-sm animate-in slide-in-from-bottom-2">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-brand-accent mb-3">Instant Callback Request</h4>
                                    <div className="space-y-3">
                                        <input 
                                            required placeholder="Your Name" 
                                            value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                                            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-brand-accent"
                                        />
                                        <input 
                                            required placeholder="Phone Number" type="tel"
                                            value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                                            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-brand-accent"
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
                        <div className="p-3 bg-white border-t border-slate-200">
                            <form onSubmit={handleSend} className="flex items-center gap-2 relative">
                                <input 
                                    type="text" 
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Type your message..." 
                                    className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all border border-transparent focus:border-brand-accent/50 pr-12"
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
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-brand-900 border-2 border-brand-accent hover:bg-black text-white rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 z-50 relative group"
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
