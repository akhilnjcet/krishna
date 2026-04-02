import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { 
    collection, query, where, onSnapshot, 
    doc, updateDoc, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { ShieldCheck, ShieldAlert, CheckCircle, XCircle, User, Projector as Project, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatRequestsManager = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "chatRequests"), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(reqs);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAction = async (requestId, userId, userName, projectId, projectTitle, action) => {
        try {
            if (action === 'approve') {
                // 1. Create a Chat Room
                const newRoom = await addDoc(collection(db, "chatRooms"), {
                    userId,
                    participants: [userId, 'admin'], // 'admin' is the high-level monitor ID
                    title: `${userName} - ${projectTitle}`,
                    status: 'active',
                    createdAt: serverTimestamp(),
                    lastMessage: "Channel established. Support is active.",
                    lastMessageTime: serverTimestamp()
                });

                // 2. Update Request Status and link to Room
                await updateDoc(doc(db, "chatRequests", requestId), {
                    status: 'approved',
                    chatId: newRoom.id,
                    approvedAt: serverTimestamp()
                });
                alert("Channel Successfully Initialized.");
            } else {
                await updateDoc(doc(db, "chatRequests", requestId), {
                    status: 'rejected',
                    rejectedAt: serverTimestamp()
                });
                alert("Request Terminated.");
            }
        } catch (err) {
            console.error("Administrative Auth failure", err);
        }
    };

    if (loading) {
        return (
             <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Filtering Auth Requests...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight leading-none mb-1">Inbound Support Requests</h1>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Authentication & Authorization Pending</p>
                </div>
                <div className="bg-indigo-600 px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> High Precision Channeling
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                    {requests.map(req => (
                        <motion.div 
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={req.id} 
                            className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-50 transition-all flex flex-col justify-between"
                        >
                            <div className="space-y-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 leading-none mb-1">{req.userName}</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Customer Auth ID: {req.userId.substring(18)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-amber-50 text-amber-600 p-2 rounded-xl border border-amber-100"><ShieldAlert className="w-5 h-5" /></div>
                                </div>

                                <div className="space-y-4 py-6 border-y border-slate-50">
                                    <div className="flex items-center gap-3">
                                        <Project className="w-4 h-4 text-indigo-400" />
                                        <span className="text-sm font-bold text-slate-700 tracking-tight">{req.projectTitle} <span className="text-slate-400 font-medium">#{req.projectId.substring(18)}</span></span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-4 h-4 text-indigo-400" />
                                        <span className="text-xs font-bold text-rose-500 uppercase tracking-widest">Reason: {req.reason}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-8">
                                <button 
                                    onClick={() => handleAction(req.id, req.userId, req.userName, req.projectId, req.projectTitle, 'reject')}
                                    className="bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                                >
                                    <XCircle className="w-4 h-4" /> Terminate
                                </button>
                                <button 
                                    onClick={() => handleAction(req.id, req.userId, req.userName, req.projectId, req.projectTitle, 'approve')}
                                    className="bg-indigo-600 hover:bg-emerald-600 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-100"
                                >
                                    <CheckCircle className="w-4 h-4" /> Authenticate
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {requests.length === 0 && (
                <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-300 font-black uppercase tracking-widest">Registry Synchronization: No Pending Requests</p>
                </div>
            )}
        </div>
    );
};

export default ChatRequestsManager;
