import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
    Calendar, CheckCircle2, 
    AlertCircle, Loader2, FileText, Download 
} from 'lucide-react';
import { generateSalaryPDF } from '../../services/pdfService';
import useAuthStore from '../../stores/authStore';

const StaffFinance = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuthStore();

    useEffect(() => {
        fetchSalary();
    }, []);

    const fetchSalary = async () => {
        try {
            const res = await api.get('/finance/staff-salary');
            setHistory(res.data);
        } catch (err) {
            console.error('Salary sync failure:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadSlip = (sal) => {
        if (sal.paymentStatus !== 'paid') {
            alert("Administrative Restriction: Pay Slip extractable only after verified disbursement.");
            return;
        }
        // Map backend fields to the PDF service expected fields
        const salaryData = {
            month: sal.month,
            year: sal.year || new Date().getFullYear(),
            amount: sal.salaryAmount,
            status: sal.paymentStatus
        };
        generateSalaryPDF(salaryData, user);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="w-12 h-12 text-brand-Accent animate-spin mb-4" />
                <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Accessing Secure Payroll Registry...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-10 max-w-6xl mx-auto space-y-12 font-sans bg-transparent min-h-screen">
            <div className="flex justify-between items-center border-l-8 border-brand-accent pl-8">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-2 italic">Compensation Archive</div>
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-brand-950">Salary <span className="text-gray-400">Slips</span></h2>
                </div>
            </div>

            {history.length === 0 ? (
                <div className="bg-white border-4 border-brand-950 p-20 text-center shadow-solid">
                     <FileText className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                     <p className="text-gray-400 font-bold uppercase tracking-widest italic">No salary records currently logged for this operative.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {history.map((sal) => (
                        <div
                            key={sal._id}
                            className={`bg-white border-4 border-brand-950 shadow-solid overflow-hidden flex flex-col relative ${sal.paymentStatus === 'paid' ? 'border-brand-accent' : ''}`}
                        >
                            <div className={`p-4 flex justify-between items-center border-b-4 border-brand-950 ${
                                sal.paymentStatus === 'paid' ? 'bg-brand-accent text-brand-950' : 'bg-brand-950 text-white'
                            }`}>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span className="font-black uppercase tracking-widest text-[10px]">{sal.month}</span>
                                </div>
                                <span className="font-black uppercase tracking-widest text-[10px] italic">{sal.paymentStatus}</span>
                            </div>

                            <div className="p-8">
                                <div className="mb-8">
                                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-1">Disbursement Amount</p>
                                    <p className="text-4xl font-black text-brand-950 italic">₹ {sal.salaryAmount?.toLocaleString()}</p>
                                </div>

                                <button 
                                    onClick={() => handleDownloadSlip(sal)}
                                    className={`w-full p-4 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs transition-all border-4 border-brand-950 shadow-solid-sm active:shadow-none hover:bg-brand-950 hover:text-white ${
                                        sal.paymentStatus === 'paid' ? 'bg-brand-accent' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {sal.paymentStatus === 'paid' ? <Download className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {sal.paymentStatus === 'paid' ? 'Extract Pay Slip' : 'LOCKED'}
                                </button>
                            </div>

                            {sal.paymentStatus !== 'paid' && (
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] pointer-events-none flex items-center justify-center">
                                    <div className="bg-brand-950 text-brand-accent px-6 py-2 font-black uppercase tracking-widest text-[10px] -rotate-12 shadow-2xl">
                                        RESTRICTED / UNPAID
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="p-8 bg-brand-950 text-white border-l-[12px] border-brand-accent shadow-2xl">
                <h4 className="text-xl font-black uppercase tracking-tighter italic mb-2 leading-none">Confidentiality Protocol</h4>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-tight leading-relaxed max-w-3xl">
                    Salary data is strictly confidential and accessible exclusively to the authenticated operative and administrative auditors. Professional documentation (PDF) is authorized only after unyielding disbursement verification.
                </p>
            </div>
        </div>
    );
};

export default StaffFinance;
