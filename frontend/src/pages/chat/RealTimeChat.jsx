import React, { useState, useEffect, useRef, useMemo } from 'react';
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
    FileText, Download, Loader2, Trash2, Lock, AlertTriangle,
    ExternalLink, Image as ImageIcon, X, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../stores/authStore';
import { getDirectImageUrl } from '../../utils/imageUtils';
import { 
    playSentMessageSound, 
    playReceivedMessageSound, 
    unlockAudio 
} from '../../utils/soundService';
import { 
    isRoomClosed, 
    deleteChatRoom, 
    deleteClosedRooms 
} from '../../services/supportChatService';

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
    const [selectedImage, setSelectedImage] = useState(null);
    
    // Search, Filtering & Admin Purge State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'closed'
    const [showMenu, setShowMenu] = useState(false);
    const [deletingRoomId, setDeletingRoomId] = useState(null);
    const [isClearing, setIsClearing] = useState(false);
    
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

    // Helper to resolve image and file URLs (local uploads, data URLs, Cloudinary, Drive)
    const resolveFileUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('data:') || url.startsWith('blob:')) return url;
        return getDirectImageUrl(url);
    };

    const isDriveUrl = (url) => {
        return typeof url === 'string' && (url.includes('drive.google.com') || url.includes('docs.google.com'));
    };

    const extractFirstDriveUrl = (text) => {
        if (!text || typeof text !== 'string') return null;
        const match = text.match(/((?:https?:\/\/)?(?:drive|docs)\.google\.com\/[^\s<]+[^\s<.,:;"')\]])/i);
        if (!match) return null;
        let url = match[1];
        if (!url.startsWith('http')) url = `https://${url}`;
        return url;
    };

    const renderTextWithLinks = (text, isMe) => {
        if (!text) return null;

        // Matches URLs starting with http://, https://, or www.
        const urlRegex = /((?:https?:\/\/|www\.)[^\s<]+[^\s<.,:;"')\]])/gi;
        const parts = text.split(urlRegex);

        return parts.map((part, i) => {
            if (!part) return null;
            if (part.match(/^(https?:\/\/|www\.)/i)) {
                const href = part.startsWith('http') ? part : `https://${part}`;
                const isDrive = isDriveUrl(part);
                return (
                    <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`inline-flex items-center gap-1 font-semibold underline underline-offset-2 break-all transition-colors ${
                            isDrive
                                ? isMe 
                                    ? 'text-emerald-950 font-bold decoration-emerald-700 bg-emerald-200/60 px-1 py-0.5 rounded' 
                                    : 'text-blue-700 dark:text-blue-300 font-bold decoration-blue-500 bg-blue-100/70 dark:bg-blue-900/40 px-1 py-0.5 rounded'
                                : isMe
                                    ? 'text-emerald-900 hover:text-emerald-950 decoration-emerald-600'
                                    : 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 decoration-blue-400'
                        }`}
                    >
                        <span>{part}</span>
                        <ExternalLink className="w-3.5 h-3.5 inline shrink-0 opacity-80" />
                    </a>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    // 5. Send File Attachment / Image Blob with WhatsApp-Style Sent Sound
    const uploadFileBlob = async (file, customFileName) => {
        if (!file || !activeRoom) return;

        if (file.size > 10 * 1024 * 1024) {
            return alert("File size exceeds 10MB limit.");
        }

        const fileName = customFileName || file.name || `attachment_${Date.now()}`;
        unlockAudio();
        setUploadingFile(true);

        try {
            const formData = new FormData();
            formData.append('file', file, fileName);
            
            let fileUrl = '';
            try {
                const res = await api.post('/uploads', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                fileUrl = res.data?.fileUrl || res.data?.url || res.data?.filePath || '';
                if (!fileUrl) {
                    throw new Error("Empty URL returned from upload server");
                }
            } catch (upErr) {
                console.warn("Direct upload fallback to data URL:", upErr.message);
                fileUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }

            const isImage = (file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif)$/i.test(fileName);
            const newDoc = await addDoc(collection(db, "messages"), {
                chatId: activeRoom.id,
                senderId: userId,
                senderName: name,
                text: isImage ? `[Photo: ${fileName}]` : `[Attachment: ${fileName}]`,
                fileUrl: fileUrl,
                fileName: fileName,
                fileType: isImage ? 'image' : 'file',
                timestamp: serverTimestamp(),
                seen: false,
                type: isImage ? 'image' : 'file'
            });

            knownMessageIdsRef.current.add(newDoc.id);

            await updateDoc(doc(db, "chatRooms", activeRoom.id), {
                lastMessage: isImage ? '📷 Photo' : `📎 ${fileName}`,
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

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (file) await uploadFileBlob(file, file.name);
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.startsWith('image/')) {
                const blob = items[i].getAsFile();
                if (blob) {
                    e.preventDefault();
                    uploadFileBlob(blob, `screenshot_${Date.now()}.png`);
                    return;
                }
            }
        }
    };

    const closedRoomsCount = useMemo(() => rooms.filter(isRoomClosed).length, [rooms]);
    const activeRoomsCount = useMemo(() => rooms.length - closedRoomsCount, [rooms, closedRoomsCount]);

    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {
            if (filterStatus === 'active' && isRoomClosed(room)) return false;
            if (filterStatus === 'closed' && !isRoomClosed(room)) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const titleMatch = room.title?.toLowerCase().includes(q);
                const msgMatch = room.lastMessage?.toLowerCase().includes(q);
                return titleMatch || msgMatch;
            }
            return true;
        });
    }, [rooms, filterStatus, searchQuery]);

    const handleDeleteRoom = async (e, room) => {
        if (e) e.stopPropagation();
        if (!room) return;

        const isClosed = isRoomClosed(room);
        const confirmMsg = isClosed
            ? `Permanently delete closed conversation "${room.title || 'Channel'}" and its entire message history?`
            : `Delete conversation "${room.title || 'Channel'}" and its message history?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            setDeletingRoomId(room.id);
            await deleteChatRoom(room.id);
            if (activeRoom?.id === room.id) {
                setActiveRoom(null);
            }
        } catch (err) {
            console.error("Failed to delete room:", err);
            alert("Failed to delete conversation: " + (err.message || 'Error occurred'));
        } finally {
            setDeletingRoomId(null);
        }
    };

    const handleClearAllClosed = async () => {
        if (closedRoomsCount === 0) {
            alert("No closed conversations found to clear.");
            return;
        }
        if (!window.confirm(`Permanently delete all ${closedRoomsCount} closed support conversations and all their messages? This action cannot be undone.`)) {
            return;
        }

        setIsClearing(true);
        setShowMenu(false);
        try {
            const count = await deleteClosedRooms(rooms);
            if (activeRoom && isRoomClosed(activeRoom)) {
                setActiveRoom(null);
            }
            alert(`Successfully cleared ${count} closed conversation(s).`);
        } catch (err) {
            console.error("Failed to clear closed rooms:", err);
            alert("Failed to clear some conversations: " + (err.message || 'Error occurred'));
        } finally {
            setIsClearing(false);
        }
    };

    const isCurrentRoomClosed = isRoomClosed(activeRoom);

    return (
        <div className="flex h-[calc(100svh-4rem)] md:h-[88vh] flex-col md:flex-row bg-[#f0f2f5] rounded-none md:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xl relative">
            
            {/* Sidebar View (Mobile Toggled) */}
            <aside className={`w-full md:w-[340px] lg:w-[420px] flex-shrink-0 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-slate-900 overflow-hidden ${activeRoom && 'hidden md:flex'}`}>
                <header className="p-3.5 bg-[#f0f2f5] border-b border-slate-200 dark:border-slate-700 flex justify-between items-center h-[60px] flex-shrink-0 relative">
                    <div className="flex items-center gap-2.5">
                        <User className="w-10 h-10 bg-slate-300 p-2 rounded-full text-white shadow-sm" />
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Support Channel</span>
                            <span className="text-[10px] text-slate-500 font-medium">{rooms.length} Channels • {activeRoomsCount} Active</span>
                        </div>
                    </div>
                    <div className="flex gap-1.5 items-center text-[#54656f]">
                        {/* Sound Toggle in Sidebar */}
                        <button
                            type="button"
                            onClick={toggleSound}
                            className={`p-2 rounded-lg transition-colors border-none bg-transparent cursor-pointer ${soundEnabled ? 'text-emerald-600' : 'text-slate-400'}`}
                            title={soundEnabled ? "Message Sounds: Enabled" : "Message Sounds: Muted"}
                        >
                            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>

                        {/* Options Menu Toggle */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowMenu(!showMenu)}
                                className={`p-2 rounded-lg transition-colors border-none bg-transparent cursor-pointer hover:bg-slate-200/60 ${showMenu ? 'text-indigo-600 bg-slate-200/50' : 'text-[#54656f]'}`}
                                title="Channel Options"
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </button>

                            {/* Dropdown Menu */}
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                                        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operations Control</p>
                                        </div>
                                        {role === 'admin' && (
                                            <button
                                                type="button"
                                                disabled={closedRoomsCount === 0 || isClearing}
                                                onClick={handleClearAllClosed}
                                                className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-none bg-transparent cursor-pointer"
                                            >
                                                <Trash2 className="w-4 h-4 shrink-0 text-rose-600" />
                                                <span>{isClearing ? 'Clearing Archive...' : `Clear All Closed (${closedRoomsCount})`}</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => { toggleSound(); setShowMenu(false); }}
                                            className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors border-none bg-transparent cursor-pointer"
                                        >
                                            {soundEnabled ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
                                            <span>{soundEnabled ? 'Mute Alert Sounds' : 'Enable Alert Sounds'}</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Search & Filter Toolbar */}
                <div className="p-2.5 bg-white dark:bg-slate-900 flex-shrink-0 border-b border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="bg-[#f0f2f5] dark:bg-slate-800 rounded-xl px-3.5 py-2 flex items-center gap-3">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input 
                            type="text" 
                            placeholder="Search conversations..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent text-[14px] w-full outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400" 
                        />
                        {searchQuery && (
                            <button 
                                type="button"
                                onClick={() => setSearchQuery('')} 
                                className="text-slate-400 hover:text-slate-600 text-xs bg-transparent border-none cursor-pointer"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Filter Pills and Admin Clear Button */}
                    <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 text-[11px] font-bold">
                            <button
                                type="button"
                                onClick={() => setFilterStatus('all')}
                                className={`px-2.5 py-1 rounded-lg transition-all border-none cursor-pointer ${filterStatus === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'}`}
                            >
                                All ({rooms.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('active')}
                                className={`px-2.5 py-1 rounded-lg transition-all border-none cursor-pointer ${filterStatus === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'}`}
                            >
                                Active ({activeRoomsCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('closed')}
                                className={`px-2.5 py-1 rounded-lg transition-all border-none cursor-pointer ${filterStatus === 'closed' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'}`}
                            >
                                Closed ({closedRoomsCount})
                            </button>
                        </div>

                        {role === 'admin' && closedRoomsCount > 0 && (
                            <button
                                type="button"
                                onClick={handleClearAllClosed}
                                disabled={isClearing}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-rose-200 transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                                title={`Delete all ${closedRoomsCount} closed channels`}
                            >
                                <Trash2 className="w-3 h-3" />
                                <span>{isClearing ? 'Clearing...' : `Clear (${closedRoomsCount})`}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 custom-scrollbar">
                    {filteredRooms.length > 0 ? (
                        filteredRooms.map(room => {
                            const isSelected = activeRoom?.id === room.id;
                            const isClosed = isRoomClosed(room);
                            const isDeleting = deletingRoomId === room.id;

                            return (
                                <div 
                                    key={room.id} 
                                    onClick={() => setActiveRoom(room)} 
                                    className={`p-3.5 flex items-center gap-3 cursor-pointer border-b border-slate-100 dark:border-slate-800/60 transition-all group relative ${
                                        isSelected ? 'bg-[#f0f2f5] dark:bg-slate-800' : 'hover:bg-[#f5f6f6] dark:hover:bg-slate-800/40'
                                    } ${isClosed ? 'opacity-85' : ''}`}
                                >
                                    <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center font-black text-white text-base shadow-sm relative ${
                                        isClosed ? 'bg-slate-400 dark:bg-slate-600' : isSelected ? 'bg-[#00a884]' : 'bg-indigo-600'
                                    }`}>
                                        {room.title?.charAt(0).toUpperCase()}
                                        {isClosed && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center" title="Channel Closed">
                                                <Lock className="w-2.5 h-2.5 text-white" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-1">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h4 className="text-[15px] font-medium text-slate-900 dark:text-white truncate">
                                                {room.title}
                                            </h4>
                                            <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                                                {(room.lastMessageTime?.toDate?.() || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                {isClosed ? (
                                                    <span className="text-[12px] font-bold text-rose-600 dark:text-rose-400 truncate flex items-center gap-1">
                                                        <CheckCheck className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                        CHANNEL CLOSED BY OPERATIONS
                                                    </span>
                                                ) : (
                                                    <>
                                                        <CheckCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                        <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate leading-relaxed">
                                                            {room.lastMessage || "Begin Chat..."}
                                                        </p>
                                                    </>
                                                )}
                                            </div>

                                            {/* Admin Delete Action for Closed Channels */}
                                            {role === 'admin' && isClosed && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteRoom(e, room)}
                                                    disabled={isDeleting}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-600 transition-all border-none bg-transparent cursor-pointer shrink-0 shadow-sm ml-1"
                                                    title="Delete this closed channel & messages"
                                                >
                                                    {isDeleting ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-16 px-4 text-center text-slate-400 space-y-2">
                            <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                            <p className="text-xs font-bold uppercase tracking-wider">No conversations found</p>
                            {filterStatus !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => setFilterStatus('all')}
                                    className="text-[11px] text-indigo-600 font-bold hover:underline bg-transparent border-none cursor-pointer"
                                >
                                    Show all channels
                                </button>
                            )}
                        </div>
                    )}
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
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white uppercase shadow-sm ${
                                isCurrentRoomClosed ? 'bg-slate-500' : 'bg-[#00a884]'
                            }`}>
                                {activeRoom.title?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-[15px] font-medium text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[150px] sm:max-w-[260px]">
                                    {activeRoom.title}
                                </h3>
                                {isCurrentRoomClosed ? (
                                    <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                                        <Lock className="w-3 h-3 text-rose-500" /> Channel Closed by Operations
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-emerald-600 font-medium">online • technical support tunnel</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-[#54656f]">
                            {/* Admin Delete Action if Closed */}
                            {role === 'admin' && isCurrentRoomClosed && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteRoom(null, activeRoom)}
                                    disabled={deletingRoomId === activeRoom.id}
                                    className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 text-xs font-bold flex items-center gap-1.5 border border-rose-200 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                    title="Permanently delete this closed channel & messages"
                                >
                                    {deletingRoomId === activeRoom.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    <span className="hidden sm:inline">Delete Channel</span>
                                </button>
                            )}

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
                            const isImageAttachment = msg.fileType === 'image' || msg.type === 'image' || (msg.fileUrl && /\.(jpe?g|png|webp|gif)($|\?)/i.test(msg.fileUrl)) || (msg.fileUrl && msg.fileUrl.startsWith('data:image/'));
                            const isDocAttachment = msg.fileUrl && !isImageAttachment;
                            
                            // Check if text is just an auto-generated label like [Photo: ...] or [Attachment: ...]
                            const isAutoPhotoLabel = typeof msg.text === 'string' && /^\[Photo:\s*.+\]$/i.test(msg.text.trim());
                            const isAutoAttachmentLabel = typeof msg.text === 'string' && /^\[Attachment:\s*.+\]$/i.test(msg.text.trim());
                            
                            // Extract drive link if present in text
                            const driveUrl = extractFirstDriveUrl(msg.text);

                            return (
                                <div key={msg.id || index} className={`flex w-full mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[88%] md:max-w-[70%] px-3 py-1.5 rounded-lg text-[14.5px] shadow-sm relative ${isMe ? 'bg-[#dcf8c6] text-[#111b21] rounded-tr-none' : 'bg-white dark:bg-slate-900 text-[#111b21] rounded-tl-none'}`}>
                                        <div className="flex flex-col">
                                            {!isMe && <span className="text-[13px] font-bold text-[#e542a3] mb-0.5">{msg.senderName}</span>}
                                            
                                            {/* Photo / Image Rendering */}
                                            {isImageAttachment && msg.fileUrl && (
                                                <div className="my-1.5">
                                                    <div 
                                                        onClick={() => setSelectedImage({ url: resolveFileUrl(msg.fileUrl), name: msg.fileName || "Photo" })}
                                                        className="group relative block overflow-hidden rounded-xl border border-black/10 hover:opacity-95 transition-all shadow-xs bg-black/5 max-w-sm cursor-pointer"
                                                        title="Click to view full image"
                                                    >
                                                        <img 
                                                            src={resolveFileUrl(msg.fileUrl)} 
                                                            alt={msg.fileName || "Photo"} 
                                                            className="max-h-72 w-auto max-w-full rounded-xl object-contain bg-black/5" 
                                                            loading="lazy"
                                                        />
                                                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                                                            <span className="p-2 bg-black/60 rounded-full backdrop-blur-xs">
                                                                <Maximize2 className="w-4 h-4" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Generic Document Attachment Rendering */}
                                            {isDocAttachment && (
                                                <div className="my-1.5">
                                                    <a 
                                                        href={resolveFileUrl(msg.fileUrl)} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        download={msg.fileName || "attachment"} 
                                                        className="flex items-center gap-2 p-2.5 rounded-lg bg-black/5 hover:bg-black/10 transition-colors text-xs font-semibold text-slate-800 dark:text-slate-100 no-underline"
                                                    >
                                                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                                        <span className="truncate max-w-[200px]">{msg.fileName || "Download Attachment"}</span>
                                                        <Download className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-auto" />
                                                    </a>
                                                </div>
                                            )}

                                            {/* Fallback for legacy messages that have [Photo: ...] without a fileUrl */}
                                            {!msg.fileUrl && isAutoPhotoLabel && (
                                                <div className="my-1.5 flex items-center gap-2 p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 text-xs">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold truncate">{msg.text.replace(/^\[Photo:\s*/i, '').replace(/\]$/i, '')}</div>
                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Photo shared</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Google Drive Link Quick Card if Drive URL detected */}
                                            {driveUrl && (
                                                <a
                                                    href={driveUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={`my-1.5 flex items-center gap-3 p-2.5 rounded-xl border transition-all no-underline ${
                                                        isMe 
                                                            ? 'bg-emerald-100/90 hover:bg-emerald-200/90 border-emerald-300 text-emerald-950' 
                                                            : 'bg-blue-50/90 hover:bg-blue-100 dark:bg-slate-800 border-blue-200 dark:border-slate-700 text-blue-950 dark:text-blue-100'
                                                    }`}
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shadow-xs shrink-0 border border-black/5">
                                                        <svg className="w-5 h-5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                                            <path d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44C.4 50 0 51.55 0 53.1h27.5z" fill="#00ac47"/>
                                                            <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 10.15z" fill="#ea4335"/>
                                                            <path d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                                            <path d="M59.8 53.1H87.3c0-1.55-.4-3.1-1.2-4.5l-13.8-23.9c-.8-1.4-1.95-2.5-3.3-3.3L56.1 44.8z" fill="#2684fc"/>
                                                            <path d="m30.4 78c1.55 0 3.1-.45 4.5-1.2h38.65c-1.35-.8-2.5-1.9-3.3-3.3L43.65 25 30.4 47.95 17.5 70.3c.8 1.4 1.95 2.5 3.3 3.3 1.5.8 3.05 1.2 4.6 1.2z" fill="#ffba00"/>
                                                        </svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-bold truncate">Google Drive Shared Folder</div>
                                                        <div className="text-[11px] opacity-75 truncate">{driveUrl}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[11px] font-bold shrink-0 opacity-80">
                                                        <span>Open</span>
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </div>
                                                </a>
                                            )}

                                            {/* Text Message Content with Clickable Hyperlinks */}
                                            {(!msg.fileUrl || (!isAutoPhotoLabel && !isAutoAttachmentLabel)) && msg.text && (
                                                <div className="flex flex-wrap items-end justify-between pr-2">
                                                    <span className="whitespace-pre-wrap flex-1 break-words font-normal leading-relaxed">
                                                        {renderTextWithLinks(msg.text, isMe)}
                                                    </span>
                                                    <div className="flex items-center gap-1 self-end pl-6">
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                            {(msg.timestamp?.toDate?.() || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                        {isMe && <CheckCheck className={`w-4 h-4 ${msg.seen ? 'text-blue-400' : 'text-slate-400'}`} />}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Timestamp for media-only messages where redundant text was hidden */}
                                            {msg.fileUrl && (isAutoPhotoLabel || isAutoAttachmentLabel) && (
                                                <div className="flex items-center justify-end gap-1 pr-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                                        {(msg.timestamp?.toDate?.() || new Date()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                    </span>
                                                    {isMe && <CheckCheck className={`w-4 h-4 ${msg.seen ? 'text-blue-400' : 'text-slate-400'}`} />}
                                                </div>
                                            )}
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

                    {/* Chat Footer */}
                    {isCurrentRoomClosed ? (
                        <footer className="px-4 py-3.5 bg-[#f0f2f5] z-40 flex-shrink-0 border-t border-slate-200 dark:border-slate-700">
                            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-700 dark:text-rose-300">
                                <div className="flex items-center gap-2 text-xs font-bold">
                                    <Lock className="w-4 h-4 shrink-0 text-rose-600" />
                                    <span>Channel closed by operations. Conversation is archived.</span>
                                </div>
                                {role === 'admin' && (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteRoom(null, activeRoom)}
                                        disabled={deletingRoomId === activeRoom.id}
                                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 shrink-0 border-none disabled:opacity-50"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete Conversation</span>
                                    </button>
                                )}
                            </div>
                        </footer>
                    ) : (
                        <footer className="px-4 py-3 bg-[#f0f2f5] z-40 flex-shrink-0 border-t border-slate-200 dark:border-slate-700">
                            {/* Hidden file input for document/image attachments */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.txt"
                            />

                            <form onSubmit={sendMessage} onPaste={handlePaste} className="flex items-center gap-3">
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
                                        placeholder="Type a message, paste a link or screenshot (Ctrl+V)..." 
                                        className="bg-transparent text-[15px] w-full outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400" 
                                        value={message} 
                                        onChange={(e) => setMessage(e.target.value)}
                                        onPaste={handlePaste}
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
                    )}
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

            {/* Lightbox Image Preview Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
                        onClick={() => setSelectedImage(null)}
                    >
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                            <a 
                                href={selectedImage.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                download={selectedImage.name}
                                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                                onClick={(e) => e.stopPropagation()}
                                title="Download / Open Full Size"
                            >
                                <Download className="w-5 h-5" />
                            </a>
                            <button 
                                onClick={() => setSelectedImage(null)} 
                                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border-none cursor-pointer"
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <motion.div 
                            initial={{ scale: 0.9 }} 
                            animate={{ scale: 1 }} 
                            exit={{ scale: 0.9 }}
                            className="max-w-4xl max-h-[85vh] p-2 flex flex-col items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img 
                                src={selectedImage.url} 
                                alt={selectedImage.name} 
                                className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl" 
                            />
                            <div className="mt-2 text-white/80 text-xs font-medium truncate max-w-md">
                                {selectedImage.name}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #8883; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default RealTimeChat;
