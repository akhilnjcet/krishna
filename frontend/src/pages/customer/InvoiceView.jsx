import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const InvoiceView = () => {
    const { id } = useParams();
    const [paymentStatus, setPaymentStatus] = useState('unpaid'); // unpaid, processing, paid

    // Mock Invoice Data
    const invoice = {
        id: id || 'INV-2023-102',
        date: 'Oct 24, 2023',
        dueDate: 'Nov 07, 2023',
        amount: 45000.00,
        project: 'Warehouse Structural Re-Frame (PRJ-9942-B)',
        items: [
            { description: 'Initial Site Survey & Engineering Blueprints', cost: 5000 },
            { description: 'Phase 2: Steel Fabrication (Raw Materials)', cost: 25000 },
            { description: 'Heavy Machinery Logistics & Transport', cost: 15000 },
        ]
    };

    const handlePayment = () => {
        setPaymentStatus('processing');
        // Mock Stripe processing delay
        setTimeout(() => {
            setPaymentStatus('paid');
        }, 3000);
    };

    return (
        <div className="bg-brand-50 min-h-screen py-10 md:py-16 px-4 font-sans">
            <div className="max-w-4xl mx-auto">

                <Link to="/customer" className="inline-flex items-center text-brand-600 hover:text-brand-950 font-black tracking-widest uppercase text-xs mb-8 transition-colors">
                    <span className="mr-2 border-2 border-current px-1">←</span> Back to Project Hub
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border-4 border-brand-950 shadow-[12px_12px_0_0_rgba(0,0,0,1)] relative"
                >
                    {/* Invoice Header */}
                    <div className="bg-brand-950 text-white p-8 md:p-12 border-b-8 border-brand-accent flex flex-col md:flex-row justify-between items-start md:items-end">
                        <div className="mb-6 md:mb-0">
                            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">TAX INVOICE</h1>
                            <div className="text-brand-accent font-bold tracking-widest">REF: {invoice.id}</div>
                        </div>
                        <div className="text-right w-full md:w-auto">
                            <div className="text-xs font-black uppercase tracking-widest text-brand-400 mb-1">Total Amount Due</div>
                            <div className="text-4xl md:text-5xl font-black tracking-tighter text-white">
                                <span className="text-brand-500 mr-1">$</span>
                                {invoice.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>

                    <div className="p-8 md:p-12">
                        {/* Meta Data */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                            <div className="border-l-4 border-brand-accent pl-4">
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Billed To</div>
                                <div className="font-black text-brand-950 text-lg uppercase">ACME Corp Client</div>
                                <div className="text-brand-700 font-bold text-sm">Industrial Sector 4, MegaCity</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Issue Date</div>
                                    <div className="font-bold text-brand-950">{invoice.date}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Terms</div>
                                    <div className="font-bold text-red-600 uppercase">Due {invoice.dueDate}</div>
                                </div>
                            </div>
                        </div>

                        {/* Project Info */}
                        <div className="bg-brand-50 p-4 border-2 border-brand-950 mb-8 flex justify-between items-center">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Project Reference</div>
                                <div className="font-black text-brand-950 uppercase">{invoice.project}</div>
                            </div>
                            <div className="hidden sm:block text-brand-300 font-black text-2xl">⚡</div>
                        </div>

                        {/* Line Items */}
                        <div className="mb-12 border-t-4 border-brand-950">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-4 border-brand-950 bg-brand-50">
                                        <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-brand-950">Description of Goods/Services</th>
                                        <th className="py-4 px-2 text-[10px] font-black uppercase tracking-widest text-brand-950 text-right">Line Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-brand-100 font-bold text-brand-800">
                                    {invoice.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="py-4 px-2">{item.description}</td>
                                            <td className="py-4 px-2 text-right text-brand-950 font-black">
                                                ${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Payment Action Area */}
                        <div className="bg-brand-100 border-4 border-brand-950 p-6 md:p-8 relative overflow-hidden">
                            {/* Decorative stripe */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,182,18,0.2)_10px,rgba(255,182,18,0.2)_20px)] transform translate-x-16 -translate-y-16"></div>

                            {paymentStatus === 'unpaid' && (
                                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div>
                                        <h3 className="font-black uppercase tracking-tighter text-xl text-brand-950 mb-1">SECURE PAYMENT GATEWAY</h3>
                                        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest">Powered by Stripe Integration (Mock)</p>
                                    </div>
                                    <button
                                        onClick={handlePayment}
                                        className="w-full md:w-auto bg-brand-accent hover:bg-brand-400 text-brand-950 font-black uppercase tracking-widest py-4 px-8 border-4 border-brand-950 shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
                                    >
                                        AUTHORIZE PAYMENT &rarr;
                                    </button>
                                </div>
                            )}

                            {paymentStatus === 'processing' && (
                                <div className="relative z-10 flex items-center justify-center gap-4 py-4">
                                    <div className="w-8 h-8 border-4 border-brand-950 border-r-brand-accent rounded-full animate-spin"></div>
                                    <span className="font-black uppercase tracking-widest text-brand-950">AUTHENTICATING TRANSACTION...</span>
                                </div>
                            )}

                            {paymentStatus === 'paid' && (
                                <div className="relative z-10 flex flex-col items-center justify-center text-center py-2">
                                    <div className="w-16 h-16 bg-green-500 text-white flex items-center justify-center font-black text-3xl border-4 border-brand-950 mb-4 transform -rotate-6">✓</div>
                                    <h3 className="font-black uppercase tracking-tighter text-2xl text-green-600 mb-1">TRANSACTION CLEARED</h3>
                                    <p className="text-xs font-bold text-brand-700 uppercase tracking-widest">Receipt sent to client registry. Ledger updated.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </motion.div>

            </div>
        </div>
    );
};

export default InvoiceView;
