import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { Briefcase, Plus, X, Loader2, AlertCircle } from 'lucide-react';

const AdminProjects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        customerId: '',
        serviceType: '',
        budget: '',
        deadline: ''
    });
    const [customers, setCustomers] = useState([]);

    useEffect(() => {
        fetchProjects();
        fetchCustomers();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            // Need a customer fetching endpoint or filter from User
            const res = await api.get('/staff'); // Backend currently has getStaff which filters role:staff
            // Let's assume we can get users here or just use IDs for now.
            // Actually, I should probably add an /api/users endpoint for this.
        } catch (err) { }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects', formData);
            fetchProjects();
            setShowModal(false);
            setFormData({ title: '', customerId: '', serviceType: '', budget: '', deadline: '' });
        } catch (err) {
            alert("Failed to create project.");
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans min-h-screen bg-slate-50">
            <div className="flex justify-between items-center mb-8 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Director View</div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Active Projects Registry</h2>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs py-4 px-8 rounded-2xl flex items-center gap-2 shadow-lg transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Commission New Project
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                                <th className="p-6">Project Title / Client</th>
                                <th className="p-6">Category</th>
                                <th className="p-6">Budget</th>
                                <th className="p-6">Deadline</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-slate-900 divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Synchronizing Project Data</p>
                                    </td>
                                </tr>
                            ) : projects.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold">No projects found in registry.</p>
                                    </td>
                                </tr>
                            ) : projects.map((prj, i) => (
                                <motion.tr
                                    key={prj._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="hover:bg-indigo-50/30 transition-colors group"
                                >
                                    <td className="p-6">
                                        <div className="font-black text-slate-900 text-lg uppercase tracking-tight">{prj.title}</div>
                                        <div className="text-[10px] uppercase tracking-widest text-indigo-500 font-black">ID: {prj._id.slice(-8).toUpperCase()}</div>
                                    </td>
                                    <td className="p-6 text-slate-600 uppercase text-xs font-black">
                                       {prj.serviceType}
                                    </td>
                                    <td className="p-6">
                                        <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-100 font-black">
                                            ₹ {prj.budget?.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="p-6 text-slate-500 font-mono">
                                        {prj.deadline ? new Date(prj.deadline).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                                            prj.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                            prj.status === 'in-progress' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {prj.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <button className="bg-slate-100 text-slate-600 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition">
                                            <Briefcase className="w-4 h-4" />
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Commission Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-10 relative"
                        >
                            <button onClick={() => setShowModal(false)} className="absolute right-8 top-8 p-2 hover:bg-slate-100 rounded-full">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>

                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Commission Project</h2>
                            <p className="text-slate-500 font-medium mb-8">Initialize a new industrial contract in the registry.</p>

                            <form onSubmit={handleCreateProject} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Project Title</label>
                                    <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Customer ID*</label>
                                        <input required value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="USER_ID" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Service Type</label>
                                        <input required value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="e.g. Fabrication" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Budget (₹)</label>
                                        <input type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Deadline</label>
                                        <input type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition">Commence Operations</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminProjects;
