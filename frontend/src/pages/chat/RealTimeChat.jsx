import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import api from '../../services/api';
import { 
    collection, addDoc, query, 
    onSnapshot, serverTimestamp, where, 
    doc, updateDoc 
} from 'firebase/firestore';
import { 
    Send, Paperclip, CheckCheck, MoreHorizontal, User, 
    Search, MessageSquare, ArrowDown, Volume2, VolumeX, 
    FileText, Download, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../stores/authStore';
import { 
    playSentMessageSound, 
    playReceivedMessageSound, 
    unlockAudio 
} from '../../utils/soundService';

const RealTimeChat = ({ chatId: propChatId }) => {
    const { user } = useAuthStore();
    const role = user?.role || user?.user?.role;
    const name = user?.name || user?.user?.name || 'User';
    const userId = user?.id || user?._id || user?.user?.id || user?.user?._id || '';

    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [activeRoom, setActiveRoom] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showNewMessageToast, setShowNewMessageToast] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    
    // Notification Sound Toggle (persisted in localStorage)
    const [soundEnabled, setSoundEnabled] = useState(() => {
        try {
            const saved = localStorage.getItem('kew_chat_sound_enabled');
            return saved !== null ? saved === 'true' : true;
        } catch (e) {
            return true;
        }
    });

    const messagesEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const lastNotifiedRef = useRef(null);
    const fileInputRef = useRef(null);
    
    // Sound & Duplicate prevention tracking
    const isInitialLoadRef = useRef(true);
    const knownMessageIdsRef = useRef(new Set());
    const soundEnabledRef = useRef(soundEnabled);

    useEffect(() => {
        soundEnabledRef.current = soundEnabled;
        try {
            localStorage.setItem('kew_chat_sound_enabled', String(soundEnabled));
        } catch (e) {}
    }, [soundEnabled]);

    const toggleSound = () => {
        const next = !soundEnabled;
        setSoundEnabled(next);
        unlockAudio();
        if (next) {
            playReceivedMessageSound(60);
        }
    };

    // Request Notification Permission
    useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission().catch(() => {});
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
        if (role === 'admin' || role === 'staff') {
            q = collection(db, "chatRooms");
        } else {
            q = query(collection(db, "chatRooms"), where("participants", "array-contains", userId));
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
    }, [user, propChatId, activeRoom, role, userId]);

    // 2. ULTRA-SYNC MESSAGE ENGINE WITH GENUINE WHATSAPP-STYLE INCOMING SOUNDS
    useEffect(() => {
        if (!activeRoom?.id) return;

        // Reset tracking on room change so chat history loads silently
        isInitialLoadRef.current = true;
        knownMessageIdsRef.current = new Set();

        const q = query(collection(db, "messages"), where("chatId", "==", activeRoom.id));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.metadata.hasPendingWrites) return; // Wait for local write to sync

            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            msgs.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

            let hasNewInbound = false;

            if (isInitialLoadRef.current) {
                // Initial load: populate known IDs silently without playing any sound
                msgs.forEach(m => knownMessageIdsRef.current.add(m.id));
                isInitialLoadRef.current = false;
            } else {
                // Subsequent sync: check if any new incoming messages arrived from the other participant
                msgs.forEach(m => {
                    if (!knownMessageIdsRef.current.has(m.id)) {
                        knownMessageIdsRef.current.add(m.id);
                        if (m.senderId !== userId) {
                            hasNewInbound = true;
                        }
                    }
                });

                // Play soft WhatsApp-style incoming droplet chime only if sound is enabled
                if (hasNewInbound && soundEnabledRef.current) {
                    playReceivedMessageSound(80);
                }
            }

            setMessages(msgs);

            // Auto-mark seen & browser notifications for other participant's messages
            msgs.forEach(m => {
                const isFromOther = m.senderId !== userId;
                if (!m.seen && isFromOther) {
                    updateDoc(doc(db, "messages", m.id), { seen: true }).catch(() => {});
                    
                    if (lastNotifiedRef.current !== m.id) {
                        showNotification("New Message", m.text || "Attachment received");
                        lastNotifiedRef.current = m.id;
                    }
                }
            });
        }, (err) => {
            console.error("FIREBASE SYNC ERROR:", err);
        });

        return () => unsubscribe();
    }, [activeRoom?.id, userId]);

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
            scrollContainerRef.current.scrollTo({ 
                top: scrollContainerRef.current.scrollHeight, 
                behavior: messages.length <= 1 ? "auto" : "smooth" 
            });
        }
    }, [messages, isAtBottom]);

    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" });
            setShowNewMessageToast(false);
        }
    };

    // 4. Send Message with WhatsApp-Style Sent Sound
    const sendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!message.trim() || !activeRoom) return;
        
        const msgText = message.trim();
        setMessage('');
        setIsAtBottom(true);
        unlockAudio();

        try {
            const newDoc = await addDoc(collection(db, "messages"), {
                chatId: activeRoom.id,
                senderId: userId,
                senderName: name,
                text: msgText,
                timestamp: serverTimestamp(),
                seen: false,
                type: 'text'
            });

            // Prevent local echo from triggering received sound
            knownMessageIdsRef.current.add(newDoc.id);
            
            await updateDoc(doc(db, "chatRooms", activeRoom.id), {
                lastMessage: msgText,
                lastMessageTime: serverTimestamp()
            });

            // Play WhatsApp-style sent message click/pop
            if (soundEnabledRef.current) {
                playSentMessageSound(70);
            }
        } catch (err) {
            console.error("SEND FAILURE:", err);
            setMessage(msgText); // Restore on error
        }
    };

    // 5. Send File Attachment with WhatsApp-Style Sent Sound
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !activeRoom) return;

        if (file.size > 10 * 1024 * 1024) {
            return alert("File size exceeds 10MB limit.");
        }

        unlockAudio();
        setUploadingFile(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            
            let fileUrl = '';
            try {
                const res = await api.post('/uploads', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                fileUrl = res.data?.url || res.data?.filePath || '';
            } catch (upErr) {
                console.warn("Direct upload fallback to data URL:", upErr.message);
                fileUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }

            const isImage = file.type.startsWith('image/');
            const newDoc = await addDoc(collection(db, "messages"), {
                chatId: activeRoom.id,
                senderId: userId,
                senderName: name,
                text: isImage ? `[Photo: ${file.name}]` : `[Attachment: ${file.name}]`,
                fileUrl: fileUrl,
                fileName: file.name,
                fileType: isImage ? 'image' : 'file',
                timestamp: serverTimestamp(),
                seen: false,
                type: isImage ? 'image' : 'file'
            });

            knownMessageIdsRef.current.add(newDoc.id);

            await updateDoc(doc(db, "chatRooms", activeRoom.id), {
                lastMessage: isImage ? '📷 Photo' : `📎 ${file.name}`,
                lastMessageTime: serverTimestamp()
            });

            if (soundEnabledRef.current) {
                playSentMessageSound(70);
            }
        } catch (err) {
            console.error("Attachment send failure:", err);
            alert("Failed to send attachment: " + (err.message || 'Please try again.'));
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex h-[calc(100svh-4rem)] md:h-[88vh] flex-col md:flex-row bg-[#f0f2f5] rounded-none md:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xl relative">
            
            {/* Sidebar View (Mobile Toggled) */}
            <aside className={`w-full md:w-[320px] lg:w-[400px] flex-shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-900 overflow-hidden ${activeRoom && 'hidden md:flex'}`}>
                <header className="p-4 bg-[#f0f2f5] border-b border-slate-200 dark:border-slate-700 flex justify-between items-center h-[60px] flex-shrink-0">
                    <User className="w-10 h-10 bg-slate-300 p-2 rounded-full text-white shadow-sm" />
                    <div className="flex gap-4 items-center text-[#54656f]">
                        {/* Sound Toggle in Sidebar */}
                        <button
                            type="button"
                            onClick={toggleSound}
                            className={`p-2 rounded-lg transition-colors border-none bg-transparent cursor-pointer ${soundEnabled ? 'text-emerald-600' : 'text-slate-400'}`}
                            title={soundEnabled ? "Message Sounds: Enabled" : "Message Sounds: Muted"}
                        >
                            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>
                        <MessageSquare className="w-5 h-5 cursor-pointer" />
                        <MoreHorizontal className="w-5 h-5 cursor-pointer" />
                    </div>
                </header>
                <div className="p-2 bg-white dark:bg-slate-900 flex-shrink-0 border-b border-slate-100 dark:border-slate-800">
                    <div className="bg-[#f0f2f5] rounded-xl px-4 py-2 flex items-center gap-4">
                        <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <input type="text" placeholder="Search conversations" className="bg-transparent text-[14px] w-full outline-none" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 custom-scrollbar">
                    {rooms.map(room => {
                        const isSelected = activeRoom?.id === room.id;
                        return (
                            <div key={room.id} onClick={() => setActiveRoom(room)} className={`p-4 flex items-center gap-4 cursor-pointer border-b border-slate-50 transition-all ${isSelected ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'}`}>
                                <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white text-lg shadow-sm ${isSelected ? 'bg-[#00a884]' : 'bg-slate-400'}`}>{room.title?.charAt(0).toUpperCase()}</div>
                                <div className="flex-1 min-w-0 pr-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="text-[17px] font-normal text-slate-900 dark:text-white truncate">{room.title}</h4>
                                        <span className="text-[11px] text-slate-400">{(room.lastMessageTime?.toDate?.() || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className="flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5 text-blue-400" /><p className="text-[14px] text-slate-500 dark:text-slate-400 truncate leading-relaxed">{room.lastMessage || "Begin Chat..."}</p></div>
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
                    
                    {/* Chat Header */}
                    <header className="px-4 py-2 min-h-[60px] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-[#f0f2f5] z-30 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            {/* Mobile Back Button */}
                            <button onClick={() => setActiveRoom(null)} className="md:hidden p-1 text-[#54656f] border-none bg-transparent cursor-pointer">
                                <ArrowDown className="w-6 h-6 rotate-90" />
                            </button>
                            <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center font-bold text-white uppercase shadow-sm">
                                {activeRoom.title?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-[15px] font-medium text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[150px] sm:max-w-[260px]">
                                    {activeRoom.title}
                                </h3>
                                <p className="text-[11px] text-emerald-600 font-medium">online • technical support tunnel</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-[#54656f]">
                            {/* Sound Toggle Button with Feedback */}
                            <button
                                type="button"
                                onClick={toggleSound}
                                className={`px-2.5 py-1.5 rounded-xl transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                                    soundEnabled 
                                        ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                        : 'text-slate-400 hover:text-slate-600 bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800'
                                }`}
                                title={soundEnabled ? "Message Sounds: Enabled (Click to Mute)" : "Message Sounds: Muted (Click to Enable)"}
                            >
                                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                                <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">
                                    {soundEnabled ? 'Sounds On' : 'Muted'}
                                </span>
                            </button>
                            <MoreHorizontal className="w-5 h-5 cursor-pointer hover:text-slate-900" />
                        </div>
                    </header>

                    {/* Message Thread */}
                    <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 md:px-12 py-6 space-y-3 z-10 custom-scrollbar scroll-smooth">
                        <div className="flex justify-center mb-6">
                            <span className="bg-[#fff9ee] text-[#54656f] px-4 py-1 rounded-xl text-[11px] font-semibold uppercase tracking-wider shadow-sm border border-slate-100 dark:border-slate-800">
                                Today
                            </span>
                        </div>
                        
                        {messages.length > 0 ? messages.map((msg, index) => {
                            const isMe = msg.senderId === userId;
                            return (
                                <div key={msg.id || index} className={`flex w-full mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] md:max-w-[70%] px-3 py-1.5 rounded-lg text-[14.5px] shadow-sm relative ${isMe ? 'bg-[#dcf8c6] text-[#111b21] rounded-tr-none' : 'bg-white dark:bg-slate-900 text-[#111b21] rounded-tl-none'}`}>
                                        <div className="flex flex-col">
                                            {!isMe && <span className="text-[13px] font-bold text-[#e542a3] mb-0.5">{msg.senderName}</span>}
                                            
                                            {/* Media / Attachment Rendering */}
                                            {msg.fileUrl && (
                                                <div className="my-1.5">
                                                    {msg.fileType === 'image' || msg.type === 'image' ? (
                                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-black/5 hover:opacity-95 transition-opacity">
                                                            <img src={msg.fileUrl} alt={msg.fileName || "Photo"} className="max-h-60 w-auto rounded-lg object-contain bg-black/5" />
                                                        </a>
                                                    ) : (
                                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" download={msg.fileName || "attachment"} className="flex items-center gap-2 p-2.5 rounded-lg bg-black/5 hover:bg-black/10 transition-colors text-xs font-semibold text-slate-800 dark:text-slate-100 no-underline">
                                                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                                            <span className="truncate max-w-[200px]">{msg.fileName || "Download Attachment"}</span>
                                                            <Download className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex flex-wrap items-end justify-between pr-2">
                                                <span className="whitespace-pre-wrap flex-1 break-words font-normal leading-relaxed">{msg.text}</span>
                                                <div className="flex items-center gap-1 self-end pl-6">
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        {(msg.timestamp?.toDate?.() || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                    {isMe && <CheckCheck className={`w-4 h-4 ${msg.seen ? 'text-blue-400' : 'text-slate-400'}`} />}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`absolute top-0 w-3 h-3 ${isMe ? 'right-[-7px] bg-[#dcf8c6]' : 'left-[-7px] bg-white dark:bg-slate-900'}`} style={{ clipPath: isMe ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }}></div>
                                    </div>
                                </div>
                            );
                        }) : (
                             <div className="flex flex-col items-center justify-center p-20 opacity-40">
                                <MessageSquare className="w-12 h-12" />
                                <p className="text-[10px] font-black uppercase tracking-widest mt-4">Safe Technical Channel Active</p>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-6" />
                    </div>

                    <AnimatePresence>
                        {showNewMessageToast && (
                            <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} onClick={scrollToBottom} className="absolute bottom-[90px] right-10 z-40 bg-white dark:bg-slate-900 p-3 rounded-full shadow-2xl border border-slate-100 dark:border-slate-800 cursor-pointer">
                                <ArrowDown className="w-6 h-6 text-[#54656f]" />
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Message Input Footer (Clean, No Dummy Emoji/Mic Icons) */}
                    <footer className="px-4 py-3 bg-[#f0f2f5] z-40 flex-shrink-0 border-t border-slate-200 dark:border-slate-700">
                        {/* Hidden file input for document/image attachments */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx,.txt"
                        />

                        <form onSubmit={sendMessage} className="flex items-center gap-3">
                            {/* Attachment Button */}
                            <button
                                type="button"
                                disabled={uploadingFile}
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 text-[#54656f] hover:text-[#00a884] rounded-full hover:bg-slate-200/60 transition-all border-none bg-transparent cursor-pointer disabled:opacity-50"
                                title="Attach Document or Photo"
                            >
                                {uploadingFile ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-[#00a884]" />
                                ) : (
                                    <Paperclip className="w-6 h-6" />
                                )}
                            </button>

                            {/* Message Text Input */}
                            <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl px-4 py-2.5 flex items-center shadow-sm border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/20">
                                <input 
                                    type="text" 
                                    placeholder="Type a message..." 
                                    className="bg-transparent text-[15px] w-full outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400" 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)} 
                                />
                            </div>

                            {/* Clean Send Button */}
                            <button 
                                type="submit" 
                                disabled={!message.trim() || uploadingFile}
                                className={`p-2.5 rounded-full transition-all border-none flex items-center justify-center ${
                                    message.trim() 
                                        ? 'bg-[#00a884] hover:bg-[#009071] text-white shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95' 
                                        : 'bg-transparent text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                }`}
                                title="Send Message"
                            >
                                <Send className="w-5 h-5 rotate-45" />
                            </button>
                        </form>
                    </footer>
                </main>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#f0f2f5] border-b-8 border-[#00a884] h-full">
                     <div className="w-36 h-36 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-10 shadow-lg border-2 border-slate-100 dark:border-slate-800 transition-transform hover:scale-105 duration-300">
                        <MessageSquare className="w-16 h-16 text-emerald-500" />
                     </div>
                     <h3 className="text-3xl font-light text-slate-800 dark:text-slate-200 mb-2">Technical Support Desk</h3>
                     <p className="text-[15px] text-slate-500 dark:text-slate-400 max-w-sm font-normal leading-relaxed opacity-70">
                        Direct encrypted consultation channel with Krishna Engineering Works operations team.
                     </p>
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
