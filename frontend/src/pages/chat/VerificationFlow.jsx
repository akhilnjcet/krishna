import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { db } from '../../services/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import useAuthStore from '../../stores/authStore';
import { CheckCircle2, ChevronRight, Projector as Project, AlertCircle, Send, ArrowLeft } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const REASONS = [
    "Staff behavior issue",
    "Work delay",
    "Payment issue",
    "Service complaint",
    "Other (technical detail)"
];

const VerificationFlow = ({ onComplete }) => {
    const { user } = useAuthStore();
    const [projects, setProjects] = useState([]);
    const [step, setStep] = useState(1); // 1: project, 2: reason, 3: success
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedReason, setSelectedReason] = useState("");
    const [otherReason, setOtherReason] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const { data } = await api.get('/projects');
                setProjects(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Project fetch failure", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const submitRequest = async () => {
        try {
            await addDoc(collection(db, "chatRequests"), {
                userId: user.id || user._id,
                userName: user.name,
                userEmail: user.email,
                projectId: selectedProject._id,
                projectTitle: selectedProject.title,
                reason: selectedReason === "Other (technical detail)" ? otherReason : selectedReason,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            setStep(3);
        } catch (err) {
            console.error(err);
            alert("Administrative Error: Channel Request Failed");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Syncing Work Registry...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in zoom-in-95 duration-500">
            
            <button 
                onClick={onComplete}
                className="mb-8 flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs uppercase tracking-widest transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Cancel Request
            </button>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <header className="space-y-2">
                             <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Select Work Entry</h2>
                             <p className="text-sm text-slate-500 font-medium">Verify your administrative identity via an active service record.</p>
                        </header>

                        <div className="space-y-4">
                            {projects.map(p => (
                                <div 
                                    key={p._id}
                                    onClick={() => setSelectedProject(p)}
                                    className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                                        selectedProject?._id === p._id 
                                        ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100' 
                                        : 'border-slate-100 hover:border-slate-200 bg-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${selectedProject?._id === p._id ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <Project className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800">{p.title}</h4>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ID: {p._id.substring(18)} • Status: {p.status}</p>
                                        </div>
                                    </div>
                                    {selectedProject?._id === p._id && <CheckCircle2 className="w-6 h-6 text-indigo-600" />}
                                </div>
                            ))}
                            {projects.length === 0 && (
                                <div className="text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                                    <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-tight text-sm">No active fabrication project found for this account.</p>
                                </div>
                            )}
                        </div>

                        <button 
                            disabled={!selectedProject}
                            onClick={() => setStep(2)}
                            className="w-full bg-indigo-600 disabled:bg-slate-100 text-white disabled:text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 group shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700"
                        >
                            Confirm Selection <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                        <header className="space-y-2">
                             <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Channel Authorization</h2>
                             <p className="text-sm text-slate-500 font-medium italic">Selected: {selectedProject.title}</p>
                        </header>

                        <div className="grid grid-cols-1 gap-3">
                            {REASONS.map(r => (
                                <div 
                                    key={r}
                                    onClick={() => setSelectedReason(r)}
                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                                        selectedReason === r 
                                        ? 'border-indigo-600 bg-indigo-50' 
                                        : 'border-slate-50 hover:border-slate-200'
                                    }`}
                                >
                                    <span className="text-sm font-bold text-slate-700 uppercase tracking-tight">{r}</span>
                                    <div className={`w-5 h-5 rounded-full border-2 ${selectedReason === r ? 'border-indigo-600 bg-indigo-600' : 'border-slate-200'}`} />
                                </div>
                            ))}
                        </div>

                        {selectedReason === "Other (technical detail)" && (
                            <textarea 
                                placeholder="Describe the issue in detail..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 outline-none text-slate-700 font-medium focus:ring-2 focus:ring-indigo-100"
                                rows="4"
                                value={otherReason}
                                onChange={(e) => setOtherReason(e.target.value)}
                            />
                        )}

                        <div className="flex gap-4">
                             <button onClick={() => setStep(1)} className="flex-1 py-4 text-xs font-black uppercase text-slate-400 hover:text-slate-600 transition-colors">Go Back</button>
                             <button 
                                onClick={submitRequest}
                                disabled={!selectedReason || (selectedReason === "Other (technical detail)" && !otherReason)}
                                className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 group transition-all"
                            >
                                Dispatch Request <Send className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 space-y-6">
                        <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-xl shadow-emerald-100">
                             <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                             <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none uppercase">Authentication Locked</h2>
                             <p className="text-slate-500 font-medium px-12">Your channel request for Project #{selectedProject._id.substring(18)} has been submitted to HQ for administrative clearance.</p>
                        </div>
                        <div className="pt-8 flex flex-col items-center gap-4">
                             <button 
                                onClick={onComplete}
                                className="bg-indigo-600 text-white px-10 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                            >
                                Return to Command Hub
                             </button>
                             <span className="text-[9px] font-black uppercase text-slate-300 tracking-[0.3em]">Operational Protocol 412_A Active</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VerificationFlow;
