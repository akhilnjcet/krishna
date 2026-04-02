import React, { useState, useEffect } from 'react';
import useAuthStore from '../../stores/authStore';
import VerificationFlow from './VerificationFlow';
import RealTimeChat from './RealTimeChat';
import { db } from '../../services/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { MessageSquare, ShieldAlert, History, ShieldCheck, ChevronRight } from 'lucide-react';

const SupportHub = () => {
    const { user } = useAuthStore();
    const [activeChat, setActiveChat] = useState(null);
    const [pendingRequest, setPendingRequest] = useState(null);
    const [view, setView] = useState('entry'); // entry, verify, chat

    useEffect(() => {
        if (!user) return;

        // Check for active or pending requests in Firebase
        const q = query(
            collection(db, "chatRequests"), 
            where("userId", "==", user.id || user._id),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                const id = snapshot.docs[0].id;
                setPendingRequest({ id, ...data });
                
                if (data.status === 'approved') {
                    setActiveChat(data.chatId);
                    setView('chat');
                }
            } else {
                setPendingRequest(null);
                setActiveChat(null);
                if (user.role === 'customer' && view === 'chat') setView('entry');
            }
        });

        // Staff can chat directly with admin
        if (user.role === 'staff' || user.role === 'admin') {
            setView('chat');
        }

        return () => unsubscribe();
    }, [user]);

    if (view === 'chat') {
        return <RealTimeChat chatId={activeChat} />;
    }

    if (view === 'verify') {
        return <VerificationFlow onComplete={() => setView('entry')} />;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            <header className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-100 mb-4">
                    <MessageSquare className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Support Center</h1>
                <p className="text-slate-500 font-medium tracking-tight uppercase tracking-widest text-[10px]">Secure Communication Channel</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Option 1: Chat with Admin */}
                <div 
                    onClick={() => {
                        if (user.role === 'customer') {
                            if (pendingRequest?.status === 'approved') setView('chat');
                            else setView('verify');
                        } else {
                            setView('chat');
                        }
                    }}
                    className="bg-white p-8 rounded-3xl border-2 border-slate-100 hover:border-indigo-600 transition-all cursor-pointer group shadow-sm hover:shadow-xl hover:shadow-indigo-50"
                >
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Technical Support</h3>
                    <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                        Direct encrypted tunnel to HQ administrative staff for operational queries.
                    </p>
                    <div className="flex items-center text-indigo-600 font-black text-xs uppercase tracking-widest gap-2">
                        {pendingRequest?.status === 'pending' ? 'Request Sent' : 'Initialize Channel'} <ChevronRight className="w-4 h-4" />
                    </div>
                </div>

                {/* Option 2: Raise Complaint / History */}
                <div className="bg-slate-900 p-8 rounded-3xl border-2 border-slate-800 hover:border-rose-500 transition-all cursor-pointer group shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl"></div>
                    <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-xl flex items-center justify-center mb-6 group-hover:bg-rose-500 group-hover:text-white transition-all">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Grievance Portal</h3>
                    <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed">
                        Formal complaints regarding work quality, delays, or personnel behavior.
                    </p>
                    <div className="flex items-center text-rose-500 font-black text-xs uppercase tracking-widest gap-2">
                        Service Request <ChevronRight className="w-4 h-4" />
                    </div>
                </div>

            </div>

            {pendingRequest && pendingRequest.status === 'pending' && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex items-start gap-4">
                    <History className="w-6 h-6 text-amber-500 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-amber-900 uppercase tracking-tight">Access Request Pending</h4>
                        <p className="text-xs text-amber-700 font-medium mt-1 uppercase tracking-widest">
                            Your chat request for Project #{pendingRequest.orderId?.substring(18)} is being authenticated by HQ.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportHub;
