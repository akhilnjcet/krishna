import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion } from 'framer-motion';
import { Calendar, Send, History, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const StaffLeave = () => {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        fetchLeaves();
    }, []);

    const fetchLeaves = async () => {
        try {
            const res = await api.get('/leave');
            setLeaves(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/leave', formData);
            alert("Leave application submitted!");
            setFormData({ startDate: '', endDate: '', reason: '' });
            fetchLeaves();
        } catch (err) {
            alert("Failed to submit leave application.");
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
            default: return <AlertCircle className="w-5 h-5 text-amber-500" />;
        }
    };

    return (
        <div className="bg-brand-50 min-h-screen py-16 px-4 font-sans border-t-8 border-brand-950">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                {/* Form Side */}
                <div className="lg:col-span-5 space-y-8">
                    <div className="bg-brand-950 text-white p-8 border-b-8 border-brand-accent shadow-solid">
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-accent mb-2">Personnel Dept</div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter">Apply for Leave</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="bg-white border-4 border-brand-950 p-8 shadow-solid space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-black text-brand-600 mb-2">Commencement</label>
                                <input 
                                    type="date" 
                                    required 
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                    className="w-full px-4 py-3 border-4 border-brand-200 focus:border-brand-950 outline-none bg-brand-50 font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-black text-brand-600 mb-2">Conclusion</label>
                                <input 
                                    type="date" 
                                    required 
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                    className="w-full px-4 py-3 border-4 border-brand-200 focus:border-brand-950 outline-none bg-brand-50 font-bold"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] uppercase tracking-widest font-black text-brand-600 mb-2">Vindication / Reason</label>
                            <textarea 
                                required 
                                rows="4"
                                value={formData.reason}
                                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                placeholder="State the reason for absence..."
                                className="w-full px-4 py-3 border-4 border-brand-200 focus:border-brand-950 outline-none bg-brand-50 font-bold text-sm"
                            ></textarea>
                        </div>

                        <button 
                            type="submit"
                            className="w-full bg-brand-accent hover:bg-white text-brand-950 font-black uppercase tracking-widest py-4 border-4 border-brand-950 transition-colors shadow-solid active:translate-y-1 active:translate-x-1 active:shadow-none flex items-center justify-center gap-2"
                        >
                            <Send className="w-5 h-5" /> Dispatch Request
                        </button>
                    </form>
                </div>

                {/* History Side */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="bg-white border-4 border-brand-950 p-8 shadow-solid min-h-[400px]">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-brand-950 mb-8 flex items-center gap-3">
                            <History className="w-8 h-8 text-brand-accent" /> Submission History
                        </h2>

                        {loading ? (
                            <div className="text-center py-20 font-black text-brand-200 uppercase tracking-widest">Retrieving logs...</div>
                        ) : leaves.length === 0 ? (
                            <div className="text-center py-20 text-brand-400 font-bold italic">No prior applications recorded.</div>
                        ) : (
                            <div className="space-y-4">
                                {leaves.map((leave) => (
                                    <div key={leave._id} className="border-4 border-brand-100 p-4 flex items-center justify-between hover:border-brand-950 transition-colors">
                                        <div className="flex items-center gap-4">
                                            {getStatusIcon(leave.status)}
                                            <div>
                                                <div className="text-xs font-black uppercase text-brand-950">
                                                    {new Date(leave.startDate).toLocaleDateString()} &mdash; {new Date(leave.endDate).toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] font-bold text-brand-500 uppercase truncate max-w-[200px]">{leave.reason}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-brand-50 border-2 border-brand-100">
                                                {leave.status}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StaffLeave;
