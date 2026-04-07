import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    FileText, Download, Clock, CheckCircle2, 
    XCircle, Loader2, AlertCircle, Phone, MapPin 
} from 'lucide-react';
import { generateQuotePDF } from '../../services/pdfService';

const CustomerQuotes = () => {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQuotes();
    }, []);

    const fetchQuotes = async () => {
        try {
            const res = await api.get('/quotes/my-quotes');
            setQuotes(res.data);
        } catch (err) {
            console.error('Failed to fetch personal quotes', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (quote) => {
        if (quote.status !== 'accepted') {
            alert("SECURITY: Document is Restricted until Admin Approval.");
            return;
        }
        generateQuotePDF(quote);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20">
                <Loader2 className="w-12 h-12 text-brand-950 animate-spin mb-4" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Synchronizing Policy Registry...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans min-h-screen bg-transparent">
            <div className="flex flex-col mb-8 border-l-8 border-brand-accent pl-6 md:pl-8">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-2 italic">Operation Estimation Brief</div>
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-brand-950">Project <span className="text-gray-400">Quotations</span></h2>
                </div>
            </div>

            {quotes.length === 0 ? (
                <div className="bg-white border-4 border-brand-950 p-20 text-center shadow-solid">
                     <FileText className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                     <p className="text-gray-400 font-bold uppercase tracking-widest italic">No estimations currently logged for this profile.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {quotes.map((quote) => (
                        <div
                            key={quote._id}
                            className={`bg-white border-4 border-brand-950 shadow-solid overflow-hidden flex flex-col relative ${quote.status === 'accepted' ? 'border-brand-accent' : ''}`}
                        >
                            {/* Status Banner */}
                            <div className={`p-4 flex justify-between items-center border-b-4 border-brand-950 ${
                                quote.status === 'accepted' ? 'bg-brand-accent text-brand-950' : 
                                quote.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-brand-950 text-white'
                            }`}>
                                <span className="font-black uppercase tracking-widest text-[10px]">VERIFIED ID: {quote._id.slice(-8).toUpperCase()}</span>
                                <div className="flex items-center gap-2">
                                    {quote.status === 'accepted' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                    <span className="font-black uppercase tracking-widest text-[10px] italic">{quote.status}</span>
                                </div>
                            </div>

                            <div className="p-8 flex-1">
                                <h3 className="text-2xl font-black text-brand-950 uppercase tracking-tighter italic mb-6">{quote.serviceType} Report</h3>
                                
                                <div className="space-y-4 mb-8">
                                    <div className="flex items-start gap-4 p-4 bg-brand-50 border-2 border-brand-100">
                                        <div className="p-2 bg-white rounded-lg"><MapPin className="w-4 h-4" /></div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none mb-1">Site Coordinate</p>
                                            <p className="text-xs font-bold text-brand-950 uppercase">{quote.location}</p>
                                        </div>
                                    </div>
                                    
                                    {/* FLIPKART-STYLE VERTICAL TRACKING TIMELINE */}
                                    <div className="py-6 mb-6">
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-6">Live Work Tracking</p>
                                        <div className="flex flex-col gap-0 relative">
                                            {/* Vertical Connecting Line */}
                                            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200 z-0"></div>
                                            
                                            {[
                                                { 
                                                    label: 'Application Received', 
                                                    desc: 'We have received your project details.',
                                                    active: true,
                                                    date: new Date(quote.createdAt).toLocaleDateString()
                                                },
                                                { 
                                                    label: 'Under Engineering Review', 
                                                    desc: 'Our engineers are assessing requirements.',
                                                    active: quote.status === 'reviewed' || quote.status === 'accepted' || quote.status === 'rejected'
                                                },
                                                { 
                                                    label: quote.status === 'rejected' ? 'Application Declined' : 'Admin Approved', 
                                                    desc: quote.status === 'rejected' ? 'We cannot proceed with this request.' : 'Quote verified and finalized by Admin.',
                                                    active: quote.status === 'accepted' || quote.status === 'rejected'
                                                },
                                                { 
                                                    label: 'Work Initialized', 
                                                    desc: 'Project sent to shop floor for execution.',
                                                    active: quote.status === 'accepted' && quote.progress // Need actual progress link, assume true if accepted
                                                }
                                            ].map((step, idx) => (
                                                <div key={idx} className="flex gap-6 relative z-10 pb-8 last:pb-0">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-6 h-6 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-sm ${step.active ? (quote.status === 'rejected' && idx === 2 ? 'bg-red-500 border-red-200' : 'bg-brand-accent border-brand-100') : 'bg-white border-gray-200'}`}>
                                                            {step.active && <div className={`w-2 h-2 rounded-full ${quote.status === 'rejected' && idx === 2 ? 'bg-white' : 'bg-brand-950'}`} />}
                                                        </div>
                                                    </div>
                                                    <div className="-mt-1 flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <span className={`text-sm font-black uppercase tracking-tight ${step.active ? (quote.status === 'rejected' && idx === 2 ? 'text-red-500' : 'text-brand-950') : 'text-gray-400'}`}>
                                                                {step.label}
                                                            </span>
                                                            {step.date && <span className="text-[9px] text-gray-400 font-bold uppercase">{step.date}</span>}
                                                        </div>
                                                        <p className={`text-xs font-bold leading-relaxed mt-1 ${step.active ? 'text-brand-600' : 'text-gray-300'}`}>
                                                            {step.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-xs font-bold text-brand-600 border-l-4 border-brand-950 pl-4 py-2 italic leading-relaxed">
                                        {quote.description}
                                    </p>
                                </div>

                                <div className="mt-auto pt-6 border-t-2 border-dashed border-gray-200 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1">Preliminary Calculation</p>
                                        <p className="text-3xl font-black text-brand-950 italic">₹ {quote.estimatedCost?.toLocaleString()}</p>
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleDownload(quote)}
                                        className={`p-4 flex items-center gap-3 font-black uppercase tracking-widest text-[10px] transition-all border-4 border-brand-950 shadow-solid-sm active:shadow-none hover:bg-brand-950 hover:text-white ${
                                            quote.status === 'accepted' ? 'bg-brand-accent border-brand-950' : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                        }`}
                                    >
                                        {quote.status === 'accepted' ? <Download className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {quote.status === 'accepted' ? 'Download PDF' : 'LOCKED'}
                                    </button>
                                </div>
                            </div>

                            {quote.status !== 'accepted' && (
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] pointer-events-none flex items-center justify-center">
                                    <div className="bg-brand-950 text-brand-accent px-6 py-2 font-black uppercase tracking-widest text-[10px] rotate-12 shadow-2xl">
                                        RESTRICTED / AWAITING APPROVAL
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {/* Policy Reminder */}
            <div className="mt-16 p-8 bg-brand-950 text-white border-l-[12px] border-brand-accent shadow-2xl">
                <h4 className="text-xl font-black uppercase tracking-tighter italic mb-2">Institutional Access Policy</h4>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-tight leading-relaxed max-w-3xl">
                    Documents are accessible only within the Krishna Engineering application environment until administrative verification is complete. PDF extraction is authorized solely for unyielding, verified project specifications.
                </p>
            </div>
        </div>
    );
};

export default CustomerQuotes;
