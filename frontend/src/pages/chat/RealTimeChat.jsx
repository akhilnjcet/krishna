import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import { 
    collection, addDoc, query, orderBy, 
    onSnapshot, serverTimestamp, where, 
    doc, updateDoc 
} from 'firebase/firestore';
import { Send, Image, Paperclip, CheckCheck, Smile, MoreHorizontal, User, ShieldCheck, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../stores/authStore';

const RealTimeChat = () => {
    const { user } = useAuthStore();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [rooms, setRooms] = useState([]);
    const messagesEndRef = useRef(null);

    // 1. Fetch Chat Rooms (Conversations)
    useEffect(() => {
        if (!user) return;

        let q;
        if (user.role === 'admin') {
            q = query(collection(db, "chatRooms"), where("status", "==", "active"));
        } else {
            q = query(collection(db, "chatRooms"), where("participants", "array-contains", user.id || user._id));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRooms(roomsData);
            if (!activeRoom && roomsData.length > 0) setActiveRoom(roomsData[0]);
        });

        return () => unsubscribe();
    }, [user]);

    // 2. Fetch Messages for Active Room
    useEffect(() => {
        if (!activeRoom) return;

        const q = query(
            collection(db, "messages"), 
            where("chatId", "==", activeRoom.id),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
            
            // Mark messages as seen
            msgs.forEach(m => {
                if (!m.seen && m.senderId !== (user.id || user._id)) {
                    updateDoc(doc(db, "messages", m.id), { seen: true });
                }
            });
        });

        return () => unsubscribe();
    }, [activeRoom]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || !activeRoom) return;

        const msgText = message;
        setMessage('');

        await addDoc(collection(db, "messages"), {
            chatId: activeRoom.id,
            senderId: user.id || user._id,
            senderName: user.name,
            text: msgText,
            timestamp: serverTimestamp(),
            seen: false,
            type: 'text'
        });

        // Update room's last message
        await updateDoc(doc(db, "chatRooms", activeRoom.id), {
            lastMessage: msgText,
            lastMessageTime: serverTimestamp()
        });
    };

    return (
        <div className="h-[calc(100vh-160px)] flex flex-col md:flex-row bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl shadow-indigo-100 animate-in fade-in zoom-in-95 duration-500">
            
            {/* Sidebar: Chat List */}
            <aside className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-slate-50/10">
                <div className="p-6 border-b border-slate-100 bg-white space-y-4">
                    <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Direct Channels</h2>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex items-center gap-2">
                         <Search className="w-4 h-4 text-slate-400" />
                         <input type="text" placeholder="Filter conversations..." className="bg-transparent text-xs outline-none w-full" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {rooms.map(room => (
                        <div 
                            key={room.id}
                            onClick={() => setActiveRoom(room)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                                activeRoom?.id === room.id 
                                ? 'bg-white border-indigo-100 shadow-sm border-l-4 border-l-indigo-600' 
                                : 'border-transparent hover:bg-white hover:border-slate-100'
                            }`}
                        >
                            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 flex-shrink-0 relative">
                                <User className="w-6 h-6" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                    <h4 className="text-sm font-bold text-slate-800 truncate">{room.title || "Admin Support"}</h4>
                                    <span className="text-[9px] text-slate-400 font-bold">12:45</span>
                                </div>
                                <p className="text-[11px] text-slate-400 truncate font-medium">{room.lastMessage || "No messages yet"}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Chat Window */}
            {activeRoom ? (
                <main className="flex-1 flex flex-col bg-white overflow-hidden">
                    <header className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white relative z-10 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 leading-tight">{activeRoom.title || "Support Channel"}</h3>
                                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Active Link Established</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/10">
                        <AnimatePresence>
                            {messages.map((msg) => {
                                const isMe = msg.senderId === (user.id || user._id);
                                return (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={msg.id} 
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                            <div className={`p-4 rounded-2xl text-sm font-medium transition-all ${
                                                isMe 
                                                ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-100' 
                                                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none shadow-sm'
                                            }`}>
                                                {msg.text}
                                            </div>
                                            <div className="flex items-center gap-2 px-1">
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">{msg.timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                {isMe && <CheckCheck className={`w-3.5 h-3.5 ${msg.seen ? 'text-indigo-400' : 'text-slate-300'}`} />}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                    </div>

                    <footer className="p-6 border-t border-slate-100 bg-white">
                        <form onSubmit={sendMessage} className="flex items-center gap-3">
                            <div className="flex gap-1">
                                <button type="button" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Image className="w-5 h-5" /></button>
                                <button type="button" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Paperclip className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                                <input 
                                    type="text" 
                                    placeholder="Type your message..." 
                                    className="bg-transparent text-sm w-full outline-none text-slate-700 font-medium"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <Smile className="w-5 h-5 text-slate-300 cursor-pointer" />
                            </div>
                            <button 
                                type="submit"
                                disabled={!message.trim()}
                                className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all active:scale-95"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </footer>
                </main>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-4">
                     <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                         <MessageSquare className="w-10 h-10" />
                     </div>
                     <div>
                         <h3 className="text-xl font-bold text-slate-800">Select a Conversation</h3>
                         <p className="text-sm text-slate-400">Initialize a connection from the left panel to begin communication.</p>
                     </div>
                </div>
            )}
        </div>
    );
};

export default RealTimeChat;
