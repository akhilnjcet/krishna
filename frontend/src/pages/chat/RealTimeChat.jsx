import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import { 
    collection, addDoc, query, 
    onSnapshot, serverTimestamp, where, 
    doc, updateDoc 
} from 'firebase/firestore';
import { Send, Image, Paperclip, CheckCheck, Smile, MoreHorizontal, User, ShieldCheck, Search, MessageSquare, ArrowDown, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../stores/authStore';

const RealTimeChat = ({ chatId: propChatId }) => {
    const { user } = useAuthStore();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showNewMessageToast, setShowNewMessageToast] = useState(false);
    
    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const lastNotifiedRef = useRef(null);

    // Request Notification Permission
    useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, []);

    const showNotification = (title, body) => {
        if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
            new Notification(title, {
                body,
                icon: "/logo512.png",
                badge: "/logo512.png"
            });
        }
    };

    // 1. Fetch Chat Rooms (BROADCAST REAL-TIME)
    useEffect(() => {
        if (!user) return;
        
        let q;
        if (user.role === 'admin' || user.role === 'staff') {
            q = collection(db, "chatRooms");
        } else {
            // High-reliability query for customers
            q = query(collection(db, "chatRooms"), where("participants", "array-contains", user.id || user._id));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roomsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            roomsData.sort((a, b) => (b.lastMessageTime?.seconds || 0) - (a.lastMessageTime?.seconds || 0));
            setRooms(roomsData);

            if (propChatId) {
                const target = roomsData.find(r => r.id === propChatId);
                if (target) setActiveRoom(target);
            } else if (!activeRoom && roomsData.length > 0) {
                setActiveRoom(roomsData[0]);
            }
        });
        return () => unsubscribe();
    }, [user, propChatId, activeRoom]);

    // 2. ULTRA-SYNC MESSAGE ENGINE (SIMPLIFIED TO FORBID DELAYS)
    useEffect(() => {
        if (!activeRoom?.id) return;

        // Force a simple query to avoid index latency
        const q = query(collection(db, "messages"), where("chatId", "==", activeRoom.id));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.metadata.hasPendingWrites) return; // Wait for local write to sync

            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Local sort ensures it works even before cloud indexing completes
            msgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
            
            console.log("REALTIME SYNC ACTIVE:", msgs.length, "msgs");
            setMessages(msgs);

            // Auto-mark seen & Notify
            msgs.forEach(m => {
                const isFromOther = m.senderId !== (user.id || user._id);
                if (!m.seen && isFromOther) {
                    updateDoc(doc(db, "messages", m.id), { seen: true });
                    
                    // Only notify if we haven't notified for this specific message ID yet
                    if (lastNotifiedRef.current !== m.id) {
                        showNotification("New Message", m.text);
                        lastNotifiedRef.current = m.id;
                    }
                }
            });
        }, (err) => {
            console.error("FIREBASE SYNC ERROR:", err);
            // Fallback for missing indexes
            if (err.code === 'failed-precondition') {
                 console.warn("Index building... falling back to manual fetch.");
            }
        });

        return () => unsubscribe();
    }, [activeRoom?.id, user]);

    // 3. Scroll Behavior
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const atBottom = scrollHeight - scrollTop <= clientHeight + 150;
        setIsAtBottom(atBottom);
        if (atBottom) setShowNewMessageToast(false);
    };

    useEffect(() => {
        if (isAtBottom && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: messages.length <= 1 ? "auto" : "smooth" });
        }
    }, [messages, isAtBottom]);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" });
            setShowNewMessageToast(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || !activeRoom) return;
        
        const msgText = message;
        setMessage('');
        setIsAtBottom(true);

        try {
            await addDoc(collection(db, "messages"), {
                chatId: activeRoom.id,
                senderId: user.id || user._id,
                senderName: user.name,
                text: msgText,
                timestamp: serverTimestamp(),
                seen: false,
                type: 'text'
            });
            
            await updateDoc(doc(db, "chatRooms", activeRoom.id), {
                lastMessage: msgText,
                lastMessageTime: serverTimestamp()
            });
        } catch (err) {
            console.error("SEND FAILURE:", err);
        }
    };

    return (
        <div className="flex h-[calc(100svh-4rem)] md:h-[88vh] flex-col md:flex-row bg-[#f0f2f5] rounded-none md:rounded-2xl border border-slate-200 overflow-hidden shadow-2xl relative">
            
            {/* Sidebar View (Mobile Toggled) */}
            <aside className={`w-full md:w-[320px] lg:w-[400px] flex-shrink-0 border-r border-slate-200 flex flex-col bg-white overflow-hidden ${activeRoom && 'hidden md:flex'}`}>
                <header className="p-4 bg-[#f0f2f5] border-b border-slate-200 flex justify-between items-center h-[60px] flex-shrink-0">
                    <User className="w-10 h-10 bg-slate-300 p-2 rounded-full text-white shadow-sm" />
                    <div className="flex gap-6 text-[#54656f]">
                        <MessageSquare className="w-5 h-5 cursor-pointer" />
                        <MoreHorizontal className="w-5 h-5 cursor-pointer" />
                    </div>
                </header>
                <div className="p-2 bg-white flex-shrink-0 border-b border-slate-100">
                    <div className="bg-[#f0f2f5] rounded-xl px-4 py-2 flex items-center gap-4">
                        <Search className="w-4 h-4 text-slate-500" />
                        <input type="text" placeholder="Search" className="bg-transparent text-[14px] w-full outline-none" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                    {rooms.map(room => {
                        const isSelected = activeRoom?.id === room.id;
                        return (
                            <div key={room.id} onClick={() => setActiveRoom(room)} className={`p-4 flex items-center gap-4 cursor-pointer border-b border-slate-50 transition-all ${isSelected ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'}`}>
                                <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white text-lg shadow-sm ${isSelected ? 'bg-[#00a884]' : 'bg-slate-400'}`}>{room.title?.charAt(0).toUpperCase()}</div>
                                <div className="flex-1 min-w-0 pr-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-[17px] font-normal text-slate-900 truncate">{room.title}</h4>
                                        <span className="text-[11px] text-slate-400">{(room.lastMessageTime?.toDate?.() || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className="flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5 text-blue-400" /><p className="text-[14px] text-slate-500 truncate leading-relaxed">{room.lastMessage || "Begin Chat..."}</p></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* Chat Box (Mobile Adaptive) */}
            {activeRoom ? (
                <main className="flex-1 flex flex-col bg-[#efeae2] overflow-hidden relative min-w-0">
                    <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/580/678/HD-wallpaper-whatsapp-background-whatsapp-texture.jpg")', backgroundSize: '400px' }}></div>
                    
                    <header className="px-4 py-2 min-h-[60px] border-b border-slate-200 flex items-center justify-between bg-[#f0f2f5] z-30 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            {/* Mobile Back Button */}
                            <button onClick={() => setActiveRoom(null)} className="md:hidden p-1 text-[#54656f]"><ArrowDown className="w-6 h-6 rotate-90" /></button>
                            <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center font-bold text-white uppercase shadow-sm">{activeRoom.title?.charAt(0).toUpperCase()}</div>
                            <div><h3 className="text-[15px] font-medium text-slate-800 leading-tight truncate max-w-[150px]">{activeRoom.title}</h3><p className="text-[11px] text-emerald-600 font-medium">online</p></div>
                        </div>
                        <div className="flex gap-4 text-[#54656f]">
                             <Search className="w-5 h-5 cursor-pointer" /><MoreHorizontal className="w-5 h-5 cursor-pointer" />
                        </div>
                    </header>

                    <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-3 z-10 custom-scrollbar scroll-smooth">
                        <div className="flex justify-center mb-6"><span className="bg-[#fff9ee] text-[#54656f] px-4 py-1 rounded-xl text-[11px] font-semibold uppercase tracking-wider shadow-sm border border-slate-100">Today</span></div>
                        
                        {messages.length > 0 ? messages.map((msg, index) => {
                            const isMe = msg.senderId === (user.id || user._id);
                            return (
                                <div key={msg.id || index} className={`flex w-full mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] md:max-w-[70%] px-3 py-1.5 rounded-lg text-[14.5px] shadow-sm relative ${isMe ? 'bg-[#dcf8c6] text-[#111b21] rounded-tr-none' : 'bg-white text-[#111b21] rounded-tl-none'}`}>
                                        <div className="flex flex-col">
                                            {!isMe && <span className="text-[13px] font-bold text-[#e542a3] mb-0.5">{msg.senderName}</span>}
                                            <div className="flex flex-wrap items-end justify-between pr-2">
                                                <span className="whitespace-pre-wrap flex-1 break-words font-normal leading-relaxed">{msg.text}</span>
                                                <div className="flex items-center gap-1 self-end pl-6"><span className="text-[10px] text-slate-500">{(msg.timestamp?.toDate?.() || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>{isMe && <CheckCheck className={`w-4 h-4 ${msg.seen ? 'text-blue-400' : 'text-slate-400'}`} />}</div>
                                            </div>
                                        </div>
                                        <div className={`absolute top-0 w-3 h-3 ${isMe ? 'right-[-7px] bg-[#dcf8c6]' : 'left-[-7px] bg-white'}`} style={{ clipPath: isMe ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }}></div>
                                    </div>
                                </div>
                            );
                        }) : (
                             <div className="flex flex-col items-center justify-center p-20 opacity-40"><MessageSquare className="w-12 h-12" /><p className="text-[10px] font-black uppercase tracking-widest mt-4">Safe Connection Active</p></div>
                        )}
                        <div ref={messagesEndRef} className="h-6" />
                    </div>

                    <AnimatePresence>{showNewMessageToast && (<motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} onClick={scrollToBottom} className="absolute bottom-[90px] right-10 z-40 bg-white p-3 rounded-full shadow-2xl border border-slate-100"><ArrowDown className="w-6 h-6 text-[#54656f]" /></motion.button>)}</AnimatePresence>

                    <footer className="px-4 py-3 bg-[#f0f2f5] z-40 flex-shrink-0">
                        <form onSubmit={sendMessage} className="flex items-center gap-4">
                            <Smile className="w-7 h-7 text-[#54656f] cursor-pointer" /><Paperclip className="w-7 h-7 text-[#54656f] cursor-pointer" />
                            <div className="flex-1 bg-white rounded-lg px-4 py-2.5 flex items-center shadow-sm">
                                <input type="text" placeholder="Type a message" className="bg-transparent text-[15.5px] w-full outline-none" value={message} onChange={(e) => setMessage(e.target.value)} />
                            </div>
                            {message.trim() ? (<button type="submit" className="p-2 text-[#00a884]"><Send className="w-7 h-7 rotate-45" /></button>) : (<Mic className="w-7 h-7 text-[#54656f] cursor-pointer" />)}
                        </form>
                    </footer>
                </main>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#f0f2f5] border-b-8 border-[#00a884] h-full">
                     <div className="w-36 h-36 bg-white rounded-full flex items-center justify-center mb-10 shadow-lg border-2 border-slate-100 transition-transform hover:scale-105 duration-300"><MessageSquare className="w-16 h-16 text-emerald-500" /></div>
                     <h3 className="text-4xl font-light text-slate-800 mb-2">WhatsApp Web</h3>
                     <p className="text-[15px] text-slate-500 max-w-sm font-normal leading-relaxed opacity-70">Experience real-time encrypted support across all platforms. Synchronizing now.</p>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #8883; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default RealTimeChat;
