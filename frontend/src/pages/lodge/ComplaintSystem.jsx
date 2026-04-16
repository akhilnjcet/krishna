import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, Droplets, Zap, Brush, Car, MessageCircle, 
    Send, AlertCircle, CheckCircle2 
} from 'lucide-react';
import useLodgeStore from '../../stores/lodgeStore';

const ComplaintSystem = () => {
    const { roomNumber } = useParams();
    const navigate = useNavigate();
    const addComplaint = useLodgeStore(state => state.addComplaint);
    
    const [selectedType, setSelectedType] = useState(null);
    const [description, setDescription] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const issueTypes = [
        { label: 'No Water', icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Power Cut', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
        { label: 'Cleaning Issue', icon: Brush, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Parking Issue', icon: Car, color: 'text-purple-500', bg: 'bg-purple-50' },
        { label: 'Other', icon: MessageCircle, color: 'text-slate-500', bg: 'bg-slate-50' }
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedType) return;

        addComplaint({
            roomNumber: roomNumber || 'General',
            issueType: selectedType,
            description,
        });

        setSubmitted(true);
        setTimeout(() => navigate(roomNumber ? `/lodge/room/${roomNumber}` : '/lodge'), 2000);
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white">
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-8"
                >
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </motion.div>
                <h1 className="text-2xl font-black text-slate-800 mb-2 font-poppins text-center">Protocol Logged</h1>
                <p className="text-slate-500 font-medium text-center">Administrator has been notified. Redirecting shortly...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Slim Complaint Ribbon */}
            <div className="bg-[#2D5BE3] pt-6 pb-12 px-6 relative flex-shrink-0">
                <div className="relative z-10 flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white backdrop-blur-sm border border-white/10"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-black text-white font-poppins tracking-tight leading-none">Report Issue</h1>
                </div>
            </div>

            <div className="px-6 -mt-6 pb-12 max-w-lg mx-auto">

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Issue Type Selection */}
                    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Select Category</p>
                        <div className="grid grid-cols-2 gap-3">
                            {issueTypes.map((type) => (
                                <button
                                    key={type.label}
                                    type="button"
                                    onClick={() => setSelectedType(type.label)}
                                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                                        selectedType === type.label 
                                        ? 'border-[#2D5BE3] bg-blue-50' 
                                        : 'border-slate-50 bg-slate-50 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className={`w-8 h-8 ${type.bg} ${type.color} rounded-lg flex items-center justify-center`}>
                                        <type.icon className="w-5 h-5" />
                                    </div>
                                    <span className={`text-xs font-bold ${
                                        selectedType === type.label ? 'text-[#2D5BE3]' : 'text-slate-600'
                                    }`}>{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Details */}
                    <div className="bg-white rounded-3xl p-6 shadow-xl shadow-blue-900/5 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Brief Explanation (Optional)</p>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell us what's happening..."
                            className="w-full bg-slate-50 border-0 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-[#2D5BE3]/20 min-h-[120px] resize-none"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={!selectedType}
                        className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all shadow-lg ${
                            selectedType 
                            ? 'bg-[#2D5BE3] text-white shadow-blue-200' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        <Send className="w-5 h-5" />
                        Relay to Command
                    </button>
                </form>

                {/* Info Card */}
                <div className="mt-8 flex items-start gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-relaxed">
                        Emergency issues will be prioritized. Expect a callback within 30 minutes.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ComplaintSystem;
