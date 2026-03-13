import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Clock, AlertTriangle, ChevronRight, Briefcase, Filter } from 'lucide-react';
import useAuthStore from '../../stores/authStore';

const StaffTasks = () => {
    const { user } = useAuthStore();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            const res = await api.get('/tasks');
            setTasks(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (taskId, newStatus) => {
        try {
            await api.put(`/tasks/${taskId}/status`, { status: newStatus });
            fetchTasks();
        } catch (err) {
            alert("Failed to update task status.");
        }
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'completed': return 'bg-green-500 text-white border-green-600';
            case 'in-progress': return 'bg-amber-500 text-white border-amber-600';
            default: return 'bg-slate-200 text-slate-600 border-slate-300';
        }
    };

    return (
        <div className="bg-brand-50 min-h-screen py-16 px-4 font-sans">
            <div className="max-w-5xl mx-auto space-y-12">
                <div className="bg-brand-950 text-white p-8 border-b-8 border-brand-accent shadow-solid">
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-accent mb-2">Assignment Module</div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">My Operational Tasks</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white border-4 border-brand-950 p-6 shadow-solid">
                            <h3 className="font-black text-brand-950 uppercase text-sm mb-4 border-b-2 border-brand-100 pb-2">Filter View</h3>
                            <div className="space-y-2">
                                {['All', 'Pending', 'In-Progress', 'Completed'].map(f => (
                                    <button key={f} className="w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-brand-50 transition-colors flex justify-between items-center group">
                                        {f} <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-3 space-y-6">
                        {loading ? (
                            <div className="text-center p-20 font-black text-brand-300 uppercase animate-pulse">Scanning task database...</div>
                        ) : tasks.length === 0 ? (
                            <div className="bg-white border-4 border-brand-950 p-12 text-center shadow-solid">
                                <Briefcase className="w-16 h-16 mx-auto mb-4 text-brand-100" />
                                <h3 className="text-xl font-black text-brand-950 uppercase">No Active Assignments</h3>
                                <p className="text-brand-500 font-bold text-xs uppercase mt-2">Check back later or contact supervisor.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {tasks.map((task) => (
                                    <motion.div 
                                        layout
                                        key={task._id} 
                                        className="bg-white border-4 border-brand-950 p-6 shadow-solid hover:-translate-y-1 transition-transform"
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest border-2 ${getStatusStyle(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-brand-500">Priority: {task.priority}</span>
                                                </div>
                                                <h3 className="text-xl font-black text-brand-950 uppercase tracking-tight">{task.title}</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                {task.status !== 'completed' && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(task._id, task.status === 'pending' ? 'in-progress' : 'completed')}
                                                        className="bg-brand-950 text-white p-2 hover:bg-brand-accent hover:text-brand-950 transition-colors border-2 border-brand-950"
                                                    >
                                                        {task.status === 'pending' ? <Clock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-brand-600 mb-6 leading-relaxed">{task.description}</p>
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-brand-400 border-t-2 border-brand-50 pt-4">
                                            <span>Issued: {new Date(task.createdAt).toLocaleDateString()}</span>
                                            <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'ASAP'}</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffTasks;
