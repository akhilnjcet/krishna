import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { 
    TrendingUp, TrendingDown, DollarSign, Plus, 
    Trash2, Loader2, AlertCircle, PieChart, Activity 
} from 'lucide-react';

const AdminFinance = () => {
    const [summary, setSummary] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newExpense, setNewExpense] = useState({ title: '', amount: '', category: 'others', description: '' });

    useEffect(() => {
        fetchFinance();
    }, []);

    const fetchFinance = async () => {
        setLoading(true);
        try {
            const [summaryRes, expensesRes] = await Promise.all([
                api.get('/finance/admin-overview'),
                api.get('/finance/expenses')
            ]);
            setSummary(summaryRes.data);
            setExpenses(expensesRes.data);
        } catch (err) {
            console.error('Finance sync failure:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        setAdding(true);
        try {
            await api.post('/finance/expenses', newExpense);
            setNewExpense({ title: '', amount: '', category: 'others', description: '' });
            fetchFinance();
        } catch (err) {
            alert("Administrative Error: Budget synchronization refused.");
        } finally {
            setAdding(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Auditing National Budget Registry...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-12 font-sans bg-slate-50 min-h-screen">
            
            {/* FINANCIAL OVERVIEW GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-900 border-b-8 border-indigo-500 p-8 text-white rounded-[2rem] shadow-2xl relative overflow-hidden">
                    <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Authenticated Income</p>
                    <h2 className="text-4xl font-black italic">₹ {summary.totalIncome?.toLocaleString()}</h2>
                    <p className="text-[9px] font-bold text-slate-500 mt-4 uppercase tracking-widest leading-none">Net Revenue from Paid Units</p>
                </div>
                <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
                    <TrendingDown className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 text-rose-500 group-hover:scale-110 transition-transform" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400 mb-2">Total Expenditure</p>
                    <h2 className="text-4xl font-black italic text-slate-900">₹ {summary.totalExpense?.toLocaleString()}</h2>
                    <div className="mt-4 flex gap-4">
                        <span className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded italic uppercase">Salaries: {summary.expenseBreakdown?.staff?.toLocaleString()}</span>
                        <span className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-1 rounded italic uppercase">Ops: {summary.expenseBreakdown?.others?.toLocaleString()}</span>
                    </div>
                </div>
                <div className="bg-indigo-600 border-b-8 border-white p-8 text-white rounded-[2rem] shadow-2xl relative overflow-hidden">
                    <Activity className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-2">Liquid Profit</p>
                    <h2 className="text-4xl font-black italic">₹ {summary.netProfit?.toLocaleString()}</h2>
                    <p className="text-[9px] font-bold text-indigo-300 mt-4 uppercase tracking-widest leading-none">Net Yield AFTER Ops Deductions</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* EXPENSE INJECTION PORT */}
                <div className="bg-white border border-slate-200 p-6 md:p-10 rounded-[3rem] shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 md:mb-10">
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-4">
                            <Plus className="text-indigo-600" /> Operational Expense Injection
                        </h3>
                        <div className="w-10 h-1 h-indigo-600"></div>
                    </div>
                    
                    <form onSubmit={handleAddExpense} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Title</label>
                                <input 
                                    required
                                    value={newExpense.title}
                                    onChange={(e) => setNewExpense({...newExpense, title: e.target.value})}
                                    placeholder="e.g. Structural Steel Order #44"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Budget Value (₹)</label>
                                <input 
                                    required
                                    type="number"
                                    value={newExpense.amount}
                                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                    placeholder="0.00"
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category Identifier</label>
                            <select 
                                value={newExpense.category}
                                onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-slate-800 focus:border-indigo-500 outline-none uppercase"
                            >
                                <option value="material">Material Procurement</option>
                                <option value="fuel">Fuel / Logistics</option>
                                <option value="machinery">Machinery Maint.</option>
                                <option value="utilities">Utilities & R&D</option>
                                <option value="others">Other Direct Costs</option>
                            </select>
                        </div>
                        <button 
                            disabled={adding}
                            className="w-full bg-slate-900 text-white font-black uppercase tracking-widest text-xs py-6 rounded-3xl shadow-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-3 active:scale-95"
                        >
                            {adding ? <Loader2 className="animate-spin w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                            Commit Financial Override →
                        </button>
                    </form>
                </div>

                {/* EXPENSE LOGS */}
                <div className="bg-white border border-slate-200 p-10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-4 mb-10">
                        <PieChart className="text-indigo-600" /> Expenditure Audit Log
                    </h3>
                    
                    <div className="space-y-4 overflow-y-auto max-h-[500px] pr-4">
                        {expenses.map((exp, i) => (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={exp._id} 
                                className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-indigo-50/50 transition flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm uppercase text-[10px]">
                                        {exp.category.slice(0, 3)}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-sm uppercase">{exp.title}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(exp.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-rose-500 italic">₹ {exp.amount.toLocaleString()}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* POLICY OVERVIEW */}
            <div className="p-8 bg-black text-white rounded-[2rem] border-l-[12px] border-indigo-500 relative overflow-hidden">
                <AlertCircle className="absolute top-0 right-0 w-32 h-32 opacity-5" />
                <h4 className="text-xl font-black uppercase tracking-tighter italic mb-2 leading-none">Institutional Revenue Directive</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight max-w-2xl leading-relaxed">
                    Financial reports are accessible only to authorized administrative personnel. Revenue accuracy is maintained through unyielding operational tracking and expert validation in accordance with the Krishna Engineering security workflow.
                </p>
            </div>
        </div>
    );
};

export default AdminFinance;
