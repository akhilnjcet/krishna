import React from 'react';
import { motion } from 'framer-motion';

const AdminInvoices = () => {
    // Mock Data
    const invoices = [
        { id: 'INV-2023-102', client: 'ACME Corp Client', project: 'Warehouse Re-Frame', amount: 45000, date: 'Oct 24, 2023', due: 'Nov 07, 2023', status: 'Overdue' },
        { id: 'INV-2023-103', client: 'Tech Build Inc', project: 'Welding Specs 2A', amount: 12000, date: 'Oct 28, 2023', due: 'Nov 12, 2023', status: 'Unpaid' },
        { id: 'INV-2023-089', client: 'ACME Corp Client', project: 'Warehouse Re-Frame', amount: 15000, date: 'Oct 01, 2023', due: 'Oct 15, 2023', status: 'Paid' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans">
            <div className="flex justify-between items-center mb-8 border-b-4 border-brand-950 pb-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Financial Oversight</div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-brand-950">Accounts Receivable</h2>
                </div>
                <div className="hidden md:flex gap-4">
                    <div className="bg-brand-50 border-2 border-brand-200 p-3 text-right">
                        <div className="text-[10px] uppercase font-black tracking-widest text-brand-500">Total Outstanding</div>
                        <div className="font-black text-xl text-brand-950">$57,000</div>
                    </div>
                </div>
            </div>

            <div className="bg-white border-4 border-brand-950 shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-brand-950 text-white text-[10px] uppercase font-black tracking-widest">
                                <th className="p-4 border-r border-brand-800 border-opacity-30">Invoice ID</th>
                                <th className="p-4 border-r border-brand-800 border-opacity-30">Client / Project Link</th>
                                <th className="p-4 border-r border-brand-800 border-opacity-30">Billed Amount</th>
                                <th className="p-4 border-r border-brand-800 border-opacity-30">Dates</th>
                                <th className="p-4 border-r border-brand-800 border-opacity-30">Status</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-brand-900 divide-y-2 divide-brand-100">
                            {invoices.map((inv, i) => (
                                <motion.tr
                                    key={inv.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="hover:bg-brand-50 transition-colors"
                                >
                                    <td className="p-4 border-r border-brand-100 font-black text-brand-950">{inv.id}</td>
                                    <td className="p-4 border-r border-brand-100">
                                        <div className="font-black uppercase text-brand-950">{inv.client}</div>
                                        <div className="text-[10px] uppercase tracking-widest text-brand-500">{inv.project}</div>
                                    </td>
                                    <td className="p-4 border-r border-brand-100">
                                        <span className="text-xl font-black text-brand-950">${inv.amount.toLocaleString()}</span>
                                    </td>
                                    <td className="p-4 border-r border-brand-100">
                                        <div className="text-xs uppercase"><span className="text-brand-400">ISD:</span> {inv.date}</div>
                                        <div className="text-xs uppercase"><span className="text-brand-400">DUE:</span> <span className={inv.status === 'Overdue' ? 'text-red-600 font-black' : ''}>{inv.due}</span></div>
                                    </td>
                                    <td className="p-4 border-r border-brand-100">
                                        <span className={`px-2 py-1 text-[10px] uppercase font-black tracking-widest border border-current ${inv.status === 'Paid' ? 'bg-green-50 text-green-700' :
                                                inv.status === 'Overdue' ? 'bg-red-50 text-red-600 animate-pulse' :
                                                    'bg-brand-100 text-brand-950'
                                            }`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button className="bg-brand-950 hover:bg-brand-800 text-white font-black uppercase tracking-widest text-[10px] py-2 px-4 border-2 border-brand-950 transition-colors">
                                            {inv.status === 'Paid' ? 'Receipt' : 'Send Reminder'}
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminInvoices;
