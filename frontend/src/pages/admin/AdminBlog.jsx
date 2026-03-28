import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Search, Edit3, Trash2, Save, X, 
    ImageIcon, FileText, User, Tag, Loader2,
    Calendar, Check, AlertCircle, Terminal, Radio
} from 'lucide-react';
import api from '../../services/api';
import { getDirectImageUrl } from '../../utils/imageUtils';

const AdminBlog = () => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        _id: '',
        title: '',
        content: '',
        excerpt: '',
        category: 'Structural',
        authorName: 'Chief Engineer',
        image: ''
    });

    const fetchBlogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/blogs');
            setBlogs(res.data);
        } catch (err) {
            console.error("Failed to fetch archives:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlogs();
    }, []);

    const handleOpenModal = (blog = null) => {
        if (blog) {
            setFormData(blog);
            setIsEditing(true);
        } else {
            setFormData({
                _id: '',
                title: '',
                content: '',
                excerpt: '',
                category: 'Structural',
                authorName: 'Chief Engineer',
                image: ''
            });
            setIsEditing(false);
        }
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditing) {
                await api.put(`/blogs/${formData._id}`, formData);
            } else {
                await api.post('/blogs', formData);
            }
            fetchBlogs();
            setModalOpen(false);
        } catch (err) {
            console.error(err);
            alert("Archive synchronization failed.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Permanent deletion protocol. Confirm?")) return;
        try {
            await api.delete(`/blogs/${id}`);
            setBlogs(blogs.filter(b => b._id !== id));
        } catch (err) {
            console.error(err);
            alert("Erasure failed.");
        }
    };

    const filteredBlogs = blogs.filter(b => 
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && blogs.length === 0) {
        return (
            <div className="p-20 flex flex-col items-center justify-center bg-[#050505] min-h-screen text-white">
                <Loader2 className="w-12 h-12 text-brand-accent animate-spin mb-6" />
                <p className="font-black uppercase tracking-[0.5em] text-[10px] text-gray-500">Syncing Intelligence Archives...</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-12 bg-[#050505] min-h-screen font-sans text-white">
            
            {/* Command Header */}
            <div className="mb-16 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <div className="flex items-center gap-3 text-brand-accent font-black text-[10px] uppercase tracking-[0.4em] mb-4">
                        <Terminal className="w-4 h-4" /> Intel Matrix Archive
                    </div>
                    <h1 className="text-6xl md:text-7xl font-black uppercase tracking-tighter italic">
                        FIELD <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-white">REPORTS.</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="FILTER INTEL..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-6 text-[10px] font-black uppercase tracking-widest focus:border-brand-accent outline-none transition-all w-full md:w-64"
                        />
                    </div>
                    <button 
                        onClick={() => handleOpenModal()}
                        className="p-4 bg-brand-accent text-black rounded-xl hover:bg-white transition-all active:scale-95 shadow-[0_0_20px_rgba(255,180,0,0.3)]"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Archives Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredBlogs.map((blog) => (
                    <motion.div 
                        key={blog._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-brand-accent/20 transition-all backdrop-blur-3xl flex flex-col"
                    >
                        <div className="relative h-64 overflow-hidden">
                            <img 
                                src={getDirectImageUrl(blog.image)} 
                                alt={blog.title}
                                className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                            />
                            <div className="absolute top-6 left-6 px-4 py-1.5 bg-brand-accent text-black text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                {blog.category}
                            </div>
                        </div>

                        <div className="p-8 flex flex-col flex-1">
                            <div className="flex items-center gap-3 text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">
                                <Calendar className="w-3 h-3 text-brand-accent" /> {new Date(blog.createdAt).toLocaleDateString()}
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-4 line-clamp-2 italic">
                                {blog.title}
                            </h3>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-tight line-clamp-3 mb-8">
                                {blog.excerpt}
                            </p>

                            <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent text-[10px] font-black">
                                        KA
                                    </div>
                                    <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
                                        {blog.authorName}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleOpenModal(blog)}
                                        className="p-3 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(blog._id)}
                                        className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal Override */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setModalOpen(false)}
                            className="absolute inset-0 bg-black/90 backdrop-blur-3xl"
                        />
                        
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative w-full max-w-4xl bg-[#0c0c0e] border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh]"
                        >
                            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white flex items-center gap-4">
                                        <Radio className="w-6 h-6 text-brand-accent animate-pulse" /> 
                                        {isEditing ? 'MODIFY REPORT' : 'INITIALIZE INTEL'}
                                    </h2>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mt-2">Field Data Entry Interface v6.0</p>
                                </div>
                                <button onClick={() => setModalOpen(false)} className="p-4 bg-white/5 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-10 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 flex items-center gap-2">
                                            <Terminal className="w-3 h-3 text-brand-accent" /> Headline
                                        </label>
                                        <input 
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl text-sm font-black text-white focus:border-brand-accent outline-none"
                                            placeholder="PRECISION TIG WELDING..."
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 flex items-center gap-2">
                                            <Tag className="w-3 h-3 text-brand-accent" /> Classification
                                        </label>
                                        <select 
                                            value={formData.category}
                                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl text-[10px] font-black text-brand-accent outline-none uppercase tracking-widest cursor-pointer"
                                        >
                                            <option value="Structural">Structural</option>
                                            <option value="Welding">Welding</option>
                                            <option value="Fabrication">Fabrication</option>
                                            <option value="Maintenance">Maintenance</option>
                                            <option value="Safety">Safety</option>
                                        </select>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 flex items-center gap-2">
                                            <User className="w-3 h-3 text-brand-accent" /> Assigned Reporter
                                        </label>
                                        <input 
                                            value={formData.authorName}
                                            onChange={(e) => setFormData({...formData, authorName: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl text-sm font-black text-gray-400 focus:border-brand-accent outline-none"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 flex items-center gap-2">
                                            <ImageIcon className="w-3 h-3 text-brand-accent" /> Media Uplink URL
                                        </label>
                                        <input 
                                            value={formData.image}
                                            onChange={(e) => setFormData({...formData, image: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl text-sm font-bold text-blue-500 focus:border-brand-accent outline-none"
                                            placeholder="G-DRIVE OR DIRECT URL..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 flex items-center gap-2">
                                        <AlertCircle className="w-3 h-3 text-brand-accent" /> Short Summary
                                    </label>
                                    <input 
                                        value={formData.excerpt}
                                        onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                                        className="w-full bg-black/40 border border-white/5 p-5 rounded-2xl text-sm font-bold text-gray-400 focus:border-brand-accent outline-none"
                                        placeholder="Brief operational overview..."
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-brand-accent" /> Full Intel Content
                                    </label>
                                    <textarea 
                                        required
                                        rows={8}
                                        value={formData.content}
                                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                                        className="w-full bg-[#050505] border border-white/5 p-8 rounded-[2rem] text-sm font-medium text-gray-300 focus:border-brand-accent outline-none leading-relaxed"
                                        placeholder="Detailed technical report..."
                                    />
                                </div>

                                <button 
                                    disabled={saving}
                                    className="w-full py-6 bg-brand-accent text-black font-black uppercase tracking-[0.5em] text-[10px] rounded-2xl hover:bg-white active:scale-95 transition-all shadow-2xl disabled:opacity-50"
                                >
                                    {saving ? 'UPLOADING DATA...' : 'COMMIT ARCHIVE'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminBlog;
