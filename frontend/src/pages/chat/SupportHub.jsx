import React, { useState, useEffect } from 'react';
import useAuthStore from '../../stores/authStore';
import VerificationFlow from './VerificationFlow';
import RealTimeChat from './RealTimeChat';
import { db } from '../../services/firebase';
import { 
    collection, query, where, onSnapshot, 
    doc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
    MessageSquare, ShieldAlert, History, ShieldCheck, ChevronRight,
    CheckCircle, XCircle, Clock, Plus, ArrowLeft
} from 'lucide-react';

const SupportHub = () => {
    const { user } = useAuthStore();
    const [activeTickets, setActiveTickets] = useState([]);
    const [closedTickets, setClosedTickets] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [view, setView] = useState('entry'); // 'entry', 'chat', 'verify'
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active');

    useEffect(() => {
        if (!user) {
            // Use a slight timeout to avoid synchronous setState inside effect warning
            const timer = setTimeout(() => setLoading(false), 0);
            return () => clearTimeout(timer);
        }

        let q;
        if (user.role === 'admin' || user.role === 'staff') {
            q = collection(db, "chatRequests");
        } else {
            q = query(
                collection(db, "chatRequests"), 
                where("userId", "==", user.id || user._id || "")
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Manual sort locally to avoid Firestore index requirement
            all.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

            setActiveTickets(all.filter(t => t.status !== 'closed' && t.status !== 'rejected'));
            setClosedTickets(all.filter(t => t.status === 'closed'));
            setLoading(false);
        }, (error) => {
            console.error("Firestore sync error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleCloseTicket = async (ticketId, roomId) => {
        if (!window.confirm("Are you sure you want to close this support channel? This action is permanent.")) return;
        try {
            await updateDoc(doc(db, "chatRequests", ticketId), {
                status: 'closed',
                closedAt: serverTimestamp(),
                closedBy: user.name
            });
            if (roomId) {
                await updateDoc(doc(db, "chatRooms", roomId), {
                    status: 'archived',
                    lastMessage: "CHANNEL CLOSED BY OPERATIONS"
                });
            }
            setActiveChat(null);
            setView('entry');
        } catch (err) {
            console.error("Closure protocol failure:", err);
        }
    };

    if (view === 'chat') {
        return (
            <div className="space-y-4">
                <button 
                    onClick={() => setView('entry')}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 rotate-180" /> Back to Dashboard
                </button>
                <RealTimeChat chatId={activeChat} />
            </div>
        );
    }

    if (view === 'verify') {
        return <VerificationFlow onComplete={() => setView('entry')} />;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
            <header className="text-center space-y-2 mb-12">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl shadow-indigo-100 mb-6 transform rotate-3">
                    <MessageSquare className="w-10 h-10" />
                </div>
                <h1 className="text-4xl font-black text-slate-100 dark:text-slate-900 tracking-tighter uppercase italic">Support Command Center</h1>
                <p className="text-slate-500 font-bold tracking-widest uppercase text-[10px] opacity-60">Secure End-to-End Encrypted Communication</p>
            </header>

            <div className="flex items-center gap-6 border-b-2 border-slate-100 mb-10">
                <button 
                    onClick={() => setActiveTab('active')}
                    className={`pb-4 px-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${
                        activeTab === 'active' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    Live Operations ({activeTickets.length})
                    {activeTab === 'active' && <div className="absolute bottom-[-2px] left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('closed')}
                    className={`pb-4 px-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${
                        activeTab === 'closed' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    Archive ({closedTickets.length})
                    {activeTab === 'closed' && <div className="absolute bottom-[-2px] left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
                </button>
            </div>

            {loading ? (
                <div className="py-20 text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] animate-pulse text-xs">Synchronizing Registry...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {(activeTab === 'active' ? activeTickets : closedTickets).map((ticket) => (
                        <div 
                            key={ticket.id}
                            className={`p-10 rounded-[3rem] border-4 transition-all relative overflow-hidden flex flex-col justify-between h-full group ${
                                ticket.status === 'approved' 
                                ? 'bg-white border-indigo-600 shadow-[10px_10px_0px_0px_#4f46e5]' 
                                : ticket.status === 'closed' 
                                ? 'bg-slate-50 border-slate-200 opacity-60' 
                                : 'bg-white border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]'
                            }`}
                        >
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner ${
                                        ticket.status === 'approved' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        {ticket.projectTitle?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border-2 ${
                                        ticket.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-500' :
                                        ticket.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-500' :
                                        'bg-slate-100 text-slate-500 border-slate-400'
                                    }`}>
                                        {ticket.status}
                                    </span>
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">{ticket.projectTitle}</h3>
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded">REF: {ticket.id.slice(-6).toUpperCase()}</span>
                                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{ticket.reason}</span>
                                </div>
                                
                                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100 mb-8 max-h-32 overflow-hidden relative">
                                    <p className="text-sm text-slate-600 font-bold leading-relaxed italic">
                                        "{ticket.description || "Inquiry regarding standard fabrication protocols..."}"
                                    </p>
                                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-50 to-transparent"></div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-8 border-t-2 border-dashed border-slate-100 relative z-10">
                                {ticket.status === 'approved' ? (
                                    <>
                                        <button 
                                            onClick={() => { setActiveChat(ticket.chatId); setView('chat'); }}
                                            className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
                                        >
                                            Establish Link <ChevronRight className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleCloseTicket(ticket.id, ticket.chatId)}
                                            className="w-16 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-2xl transition-all flex items-center justify-center border-2 border-rose-500 group/btn shadow-lg active:scale-95"
                                            title="Terminate Channel"
                                        >
                                            <XCircle className="w-6 h-6" />
                                        </button>
                                    </>
                                ) : ticket.status === 'pending' ? (
                                    <div className="flex-1 bg-amber-50 text-amber-600 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 border-2 border-amber-500 border-dashed animate-pulse">
                                        <Clock className="w-5 h-5" /> Authorization Pending
                                    </div>
                                ) : ticket.status === 'closed' && (
                                    <div className="flex-1 bg-slate-100 text-slate-400 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 border-2 border-slate-300 italic">
                                        <CheckCircle className="w-5 h-5" /> Resolved • {ticket.closedAt ? new Date(ticket.closedAt.toDate()).toLocaleDateString() : 'Historical'}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {activeTab === 'active' && user.role === 'customer' && (
                        <button 
                            onClick={() => setView('verify')}
                            className="bg-white p-10 rounded-[3rem] border-4 border-dashed border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/50 transition-all flex flex-col items-center justify-center text-center group min-h-[400px] active:scale-98"
                        >
                            <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all scale-110 shadow-xl group-hover:shadow-indigo-200">
                                <Plus className="w-12 h-12" />
                            </div>
                            <h4 className="text-lg font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-[0.3em]">Open Support Protocol</h4>
                        </button>
                    )}
                </div>
            )}

            {!loading && (activeTab === 'active' ? activeTickets : closedTickets).length === 0 && (
                <div className="py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100">
                    <History className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                    <p className="text-slate-300 font-black uppercase tracking-[0.4em] italic text-sm">Registry Sync: Error 404 - No {activeTab} Records Found</p>
                    {user.role === 'customer' && activeTab === 'active' && (
                         <button 
                         onClick={() => setView('verify')}
                         className="mt-8 bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-105 transition-all"
                     >
                         Initialize First Channel
                     </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default SupportHub;
