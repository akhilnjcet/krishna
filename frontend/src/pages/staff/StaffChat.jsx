import React, { useState } from 'react';
import { Send, Image, Paperclip, CheckCheck, Smile, MoreHorizontal, User, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../stores/authStore';

const StaffChat = () => {
    const { user } = useAuthStore();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([
        { id: 1, sender: 'Admin', text: 'Hello! I am the project supervisor. How can I help you today?', time: '09:00 AM', isMe: false, type: 'text' },
        { id: 2, sender: 'Me', text: 'I need clarification on the Main Gate fabrication blueprints.', time: '09:05 AM', isMe: true, type: 'text' },
        { id: 3, sender: 'Admin', text: 'Sure! Here is the latest detail file for project #402.', time: '09:10 AM', isMe: false, type: 'text' },
        { id: 4, sender: 'Admin', text: 'detail_dwg.pdf', time: '09:10 AM', isMe: false, type: 'file' },
    ]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        const newMsg = {
            id: Date.now(),
            sender: 'Me',
            text: message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: true,
            type: 'text'
        };
        setMessages([...messages, newMsg]);
        setMessage('');
    };

    return (
        <div className="h-[calc(100vh-160px)] flex flex-col md:flex-row bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl shadow-indigo-100">
            
            {/* Sidebar: Chat List */}
            <aside className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/30">
                <div className="p-6 border-b border-slate-100 bg-white">
                    <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Messages</h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Operational Support</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 cursor-pointer border-l-4 border-l-indigo-600 transition-all">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-200 shadow-inner relative">
                            <ShieldCheck className="w-6 h-6" />
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                                <h4 className="text-sm font-bold text-slate-800 truncate">HQ Support</h4>
                                <span className="text-[10px] text-indigo-500 font-bold">Online</span>
                            </div>
                            <p className="text-xs text-slate-400 truncate font-medium">Hello! I am the project supervisor. How can I help you today?</p>
                        </div>
                    </div>
                    {/* Mock Second Chat */}
                    <div className="p-4 rounded-2xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 flex items-center gap-3 cursor-pointer opacity-50 grayscale transition-all">
                         <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
                            <User className="w-6 h-6" />
                         </div>
                         <div className="flex-1 min-w-0 text-slate-400">
                             <h4 className="text-sm font-bold truncate tracking-tight">Finance Admin</h4>
                             <p className="text-xs truncate font-medium underline underline-offset-2">Encrypted Tunnel Active</p>
                         </div>
                    </div>
                </div>
            </aside>

            {/* Chat Window */}
            <main className="flex-1 flex flex-col bg-white overflow-hidden">
                {/* Header */}
                <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                             <h3 className="text-sm font-bold text-slate-800 leading-tight">HQ Support Admin</h3>
                             <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest tracking-widest">Active Connection</p>
                        </div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20">
                    <div className="text-center mb-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 bg-white px-3 py-1 rounded-full border border-slate-100">Today, Feb 20</span>
                    </div>

                    <AnimatePresence>
                        {messages.map((msg) => (
                            <motion.div 
                                initial={{ opacity: 0, x: msg.isMe ? 20 : -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                key={msg.id} 
                                className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-[80%] md:max-w-[70%] ${msg.isMe ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                                    <div className={`p-4 rounded-2xl text-sm font-medium transition-all shadow-sm ${
                                        msg.isMe 
                                        ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-100' 
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none shadow-slate-100'
                                    }`}>
                                        {msg.type === 'file' ? (
                                            <div className="flex items-center gap-3 py-1">
                                                <div className="p-2 bg-indigo-500/20 rounded-lg"><Paperclip className="w-4 h-4 text-white" /></div>
                                                <span className="underline underline-offset-4 cursor-pointer">{msg.text}</span>
                                            </div>
                                        ) : msg.text}
                                    </div>
                                    <div className="flex items-center gap-2 px-1">
                                        <span className="text-[10px] text-slate-400 font-bold">{msg.time}</span>
                                        {msg.isMe && <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Input Box */}
                <footer className="p-6 border-t border-slate-100 bg-white shadow-inner">
                    <form onSubmit={sendMessage} className="flex items-center gap-3">
                        <div className="flex gap-1">
                            <button type="button" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Image className="w-5 h-5" /></button>
                            <button type="button" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Paperclip className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                            <input 
                                type="text" 
                                placeholder="Write a message to HQ Support..." 
                                className="bg-transparent text-sm w-full outline-none text-slate-600 font-medium placeholder:text-slate-400"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                            <Smile className="w-5 h-5 text-slate-300 cursor-pointer hover:text-amber-500 transition-colors" />
                        </div>
                        <button 
                            type="submit"
                            disabled={!message.trim()}
                            className={`p-3 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                                message.trim() 
                                ? 'bg-indigo-600 text-white shadow-indigo-200 active:scale-95' 
                                : 'bg-slate-100 text-slate-300'
                            }`}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </footer>
            </main>
        </div>
    );
};

export default StaffChat;
