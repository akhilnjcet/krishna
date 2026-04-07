import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { Briefcase, Plus, X, Loader2, AlertCircle, MessageSquare, Send, AlertTriangle } from 'lucide-react';

const AdminProjects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [notificationText, setNotificationText] = useState({ title: '', message: '' });

    const handlePostUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/progress', { 
                projectId: selectedProject._id, 
                title: notificationText.title,
                description: notificationText.message,
                progressPercentage: selectedProject.progress, // Maintain current progress
                status: 'In Progress'
            });
            setShowNotifyModal(false);
            setNotificationText({ title: '', message: '' });
            alert("Technical alert successfully broadcasted to client portal.");
        } catch (err) {
            alert("Failed to transmit intelligence: " + (err.response?.data?.message || err.message));
        }
    };
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
            const res = await api.get('/auth/users?role=customer');
            setCustomers(res.data);
        } catch (err) {
            console.error('Fetch Customers Error:', err);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/projects', formData);
            fetchProjects();
            setShowModal(false);
            setFormData({ title: '', customerId: '', serviceType: '', budget: '', deadline: '' });
            alert("Project created successfully!");
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to create project.";
            const tip = err.response?.data?.tip || "";
            alert(`${msg}\n${tip}`);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans min-h-screen bg-slate-50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Director View</div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900">Active Projects Registry</h2>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs py-4 px-8 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
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
                                    <td className="p-6 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={() => { setSelectedProject(prj); setShowNotifyModal(true); }}
                                            className="bg-indigo-50 text-indigo-600 p-2 rounded-xl hover:bg-indigo-600 hover:text-white transition"
                                            title="Transmit sudden info to customer"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
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

            {/* Broadcast Terminal Modal */}
            <AnimatePresence>
                {showNotifyModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div 
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 relative border-t-[12px] border-indigo-600"
                        >
                            <button onClick={() => setShowNotifyModal(false)} className="absolute right-8 top-8 p-2 hover:bg-slate-100 rounded-full">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-indigo-100 p-3 rounded-2xl">
                                    <Send className="w-8 h-8 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Sudden Pulse Transmit</h2>
                                    <p className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em]">Uplink to Client Portal</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-2xl mb-8 border border-slate-100">
                                <div className="text-[9px] font-black uppercase text-slate-400 mb-1">Target Project Archive</div>
                                <div className="text-sm font-black text-slate-900 uppercase">{selectedProject?.title}</div>
                            </div>

                            <form onSubmit={handlePostUpdate} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Subject Heading</label>
                                    <input required value={notificationText.title} onChange={e => setNotificationText({...notificationText, title: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none uppercase text-xs" placeholder="TECHNICAL ALERT / SAFETY MILESTONE" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Core Intelligence Message</label>
                                    <textarea required rows={4} value={notificationText.message} onChange={e => setNotificationText({...notificationText, message: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none text-xs" placeholder="Detail the structural update or sudden site information..." />
                                </div>
                                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-tight italic">This update will be broadcasted live to the customer's secure dashboard matrix immediately.</p>
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition flex items-center justify-center gap-4 group">
                                    Initiate Intelligence Uplink <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Select Customer*</label>
                                        <select 
                                            required 
                                            value={formData.customerId} 
                                            onChange={e => setFormData({...formData, customerId: e.target.value})} 
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                                        >
                                            <option value="">Select a Client</option>
                                            {customers.map(c => (
                                                <option key={c._id} value={c._id}>{c.name} ({c.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Service Type</label>
                                        <input required value={formData.serviceType} onChange={e => setFormData({...formData, serviceType: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="e.g. Fabrication" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
