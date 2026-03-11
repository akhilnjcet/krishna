import React from 'react';
import { motion } from 'framer-motion';

const AdminQuotes = () => {
    // Mock Data
    const quotes = [
        { id: 'QTE-2023-155', type: 'Additional Roofing', client: 'ACME Corp Client', phone: '555-0199', date: 'Oct 28, 2023', val: 8500, status: 'Pending' },
        { id: 'QTE-2023-154', type: 'Welding Specs 2A', client: 'Tech Build Inc', phone: '555-0210', date: 'Oct 26, 2023', val: 12000, status: 'Approved' },
        { id: 'QTE-2023-153', type: 'Truss Assembly C', client: 'Metro City Transit', phone: '555-0811', date: 'Oct 24, 2023', val: 45000, status: 'Rejected' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans">
            <div className="flex justify-between items-center mb-8 border-b-4 border-brand-950 pb-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Sales & Estimation</div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-brand-950">Inbound Quotes Log</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-8">
                {quotes.map((quote, i) => (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        key={quote.id}
                        className="bg-white border-4 border-brand-950 mb-8 lg:mb-0 shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col"
                    >
                        <div className="bg-brand-950 text-white p-4 flex justify-between items-center border-b-4 border-brand-accent">
                            <span className="font-black uppercase tracking-widest text-brand-accent text-sm">{quote.id}</span>
                            <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest ${quote.status === 'Pending' ? 'bg-brand-accent text-brand-950' :
                                    quote.status === 'Approved' ? 'bg-green-500 text-white' :
                                        'bg-red-600 text-white'
                                }`}>
                                {quote.status}
                            </span>
                        </div>

                        <div className="p-6 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-black text-xl uppercase tracking-tighter text-brand-950 mb-1">{quote.client}</h3>
                                <p className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-6">Phone: {quote.phone}</p>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-brand-50 p-3 border-2 border-brand-100">
                                        <div className="text-[10px] uppercase font-black tracking-widest text-brand-600 mb-1">Service Requested</div>
                                        <div className="font-bold text-brand-950">{quote.type}</div>
                                    </div>
                                    <div className="bg-brand-50 p-3 border-2 border-brand-100">
                                        <div className="text-[10px] uppercase font-black tracking-widest text-brand-600 mb-1">AI Calculated Base</div>
                                        <div className="font-black text-xl text-brand-950">${quote.val.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button className="flex-1 bg-brand-950 hover:bg-brand-800 text-white font-black uppercase tracking-widest text-xs py-3 transition-colors border-2 border-brand-950">
                                    View Details
                                </button>
                                {quote.status === 'Pending' && (
                                    <button className="flex-1 bg-brand-accent hover:bg-brand-400 text-brand-950 font-black uppercase tracking-widest text-xs py-3 border-2 border-brand-950 transition-colors">
                                        Approve Quote
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AdminQuotes;
