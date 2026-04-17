import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, FileText, CheckCircle2, AlertTriangle, Scale, Lock, Info } from 'lucide-react';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    const sections = [
        {
            title: "1. User Information & Privacy",
            icon: Shield,
            color: "text-blue-500",
            bg: "bg-blue-50",
            content: [
                "We collect basic user information including name, phone number, and booking details.",
                "This data is used only for booking management, customer support, and legal compliance.",
                "We do not sell or share personal data except when required by law, payment processing, or identity verification."
            ]
        },
        {
            title: "2. Booking and Payment",
            icon: FileText,
            color: "text-indigo-500",
            bg: "bg-indigo-50",
            content: [
                "All bookings are subject to availability.",
                "Prices and room details are as displayed in the application.",
                "Payments are subject to applicable cancellation and refund policies."
            ]
        },
        {
            title: "3. Check-in Requirements",
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
            content: [
                "Valid government ID proof (Aadhaar, Passport, Driving License, etc.) is mandatory at check-in.",
                "The property reserves the right to deny check-in if valid ID is not provided."
            ]
        },
        {
            title: "4. Stay and Usage Policy",
            icon: Info,
            color: "text-amber-500",
            bg: "bg-amber-50",
            content: [
                "Guests must use the room only for lawful purposes.",
                "Illegal activities are strictly prohibited.",
                "Any violation may lead to immediate cancellation of booking without refund."
            ]
        },
        {
            title: "5. Property Damage",
            icon: AlertTriangle,
            color: "text-rose-500",
            bg: "bg-rose-50",
            content: [
                "Guests are responsible for any damage caused to hotel property, furniture, appliances, or equipment during their stay.",
                "Liability includes full repair or replacement cost for any item destroyed or missing due to guest misuse.",
                "Management reserves the right to inspect the room before check-out and determine applicable charges."
            ]
        },
        {
            title: "6. Temporary Access (PIN)",
            icon: Lock,
            color: "text-slate-500",
            bg: "bg-slate-50",
            content: [
                "A temporary access PIN may be provided for room entry and usage.",
                "The PIN is valid only during the booking period and expires at checkout.",
                "Sharing or misuse of access credentials is the user’s responsibility."
            ]
        },
        {
            title: "10. Indian Laws & Jurisdiction",
            icon: Scale,
            color: "text-blue-600",
            bg: "bg-blue-50",
            content: [
                "This agreement is governed by the laws of India.",
                "Any disputes shall fall under the jurisdiction of local courts."
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-slate-900 pt-16 pb-20 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(45,91,227,0.1),transparent)]"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <button 
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white/5 rounded-xl text-slate-400 mb-6 border border-white/5"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">Legal <br /><span className="text-blue-500">Protocols.</span></h1>
                    </div>
                </div>
            </div>

            <div className="px-6 -mt-10 pb-20 max-w-lg mx-auto w-full">
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100"
                >
                    <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-50">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">Privacy & Terms</h2>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Last Updated: April 17, 2026</p>
                        </div>
                    </div>

                    <div className="space-y-10">
                        {sections.map((section, idx) => (
                            <div key={idx} className="relative">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-10 h-10 ${section.bg} ${section.color} rounded-xl flex items-center justify-center`}>
                                        <section.icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">{section.title}</h3>
                                </div>
                                <div className="space-y-4 pl-14">
                                    {section.content.map((point, pIdx) => (
                                        <p key={pIdx} className="text-sm font-medium text-slate-500 leading-relaxed">
                                            • {point}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 p-6 bg-slate-900 rounded-[2rem] text-center">
                        <p className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-2 italic">Consent Confirmed</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                            Proceeding with any reservation on the Krishna ERP Platform constitutes full acceptance of these terms.
                        </p>
                    </div>
                </motion.div>
            </div>
            
            <p className="fixed bottom-10 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-300 uppercase tracking-[0.5em] w-full text-center">Protocol: LEGAL-26-INDIA</p>
        </div>
    );
};

export default PrivacyPolicy;
