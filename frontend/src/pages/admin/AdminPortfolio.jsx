import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { getDirectImageUrl } from '../../utils/imageUtils';
import { 
  Briefcase, Plus, Image as ImageIcon, Trash2, Edit, X, 
  MapPin, Calendar, User, Layout, Filter, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, Upload, Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminPortfolio = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [externalUrl, setExternalUrl] = useState('');
    
    const [formData, setFormData] = useState({
        title: '',
        category: 'Welding',
        description: '',
        location: '',
        projectDate: '',
        clientName: ''
    });

    const categories = ['Welding', 'Roofing', 'Truss Work', 'Fabrication', 'Construction', 'Other'];

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/portfolio/gallery');
            setProjects(res.data);
        } catch (err) {
            console.error('Error fetching portfolio:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editMode) {
                await api.put(`/portfolio/update/${selectedProject._id}`, formData);
            } else {
                await api.post('/portfolio/create', formData);
            }
            setShowModal(false);
            fetchProjects();
            resetForm();
        } catch (err) {
            console.error('Submission Error:', err.response?.data || err.message);
            const status = err.response?.status;
            const message = err.response?.data?.message || err.message;
            alert(`CONNECTION ERROR (${status || 'Network'}): ${message}\nCheck if backend server is running on port 5000.`);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this project and all its images?')) return;
        try {
            await api.delete(`/portfolio/delete/${id}`);
            fetchProjects();
        } catch (err) {
            console.error('Delete Project Error:', err);
            alert('Failed to delete project');
        }
    };

    const handleImageUpload = async (e, projectId) => {
        const files = e.target.files;
        if (!files.length) return;

        const uploadData = new FormData();
        for (let i = 0; i < files.length; i++) {
            uploadData.append('images', files[i]);
        }

        try {
            await api.post(`/portfolio/${projectId}/upload`, uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchProjects();
        } catch (err) {
            console.error('Image upload failed:', err);
            alert('Image upload failed');
        }
    };

    const handleLinkAdd = async () => {
        if (!externalUrl) return;

        // Auto-convert Google Drive links for preview
        // The transformation is now handled at the rendering layer via getDirectImageUrl utility
        const finalUrl = externalUrl;

        try {
            await api.post(`/portfolio/${selectedProject._id}/links`, { urls: [finalUrl] });
            setShowLinkModal(false);
            setExternalUrl('');
            fetchProjects();
        } catch (err) {
            console.error('Link Add Error:', err);
            alert('Failed to add link');
        }
    };

    const handleDeleteImage = async (projectId, imageId) => {
        if (!window.confirm('Delete this photo?')) return;
        try {
            await api.delete(`/portfolio/${projectId}/image/${imageId}`);
            fetchProjects();
        } catch (err) {
            console.error('Delete Image Error:', err);
            alert('Failed to delete image');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            category: 'Welding',
            description: '',
            location: '',
            projectDate: '',
            clientName: ''
        });
        setEditMode(false);
        setSelectedProject(null);
    };

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 flex items-center gap-3 italic">
                        <Briefcase className="w-10 h-10 text-indigo-600" />
                        WORK PORTFOLIO
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium font-mono uppercase tracking-tighter">Managing public project gallery & engineering logs</p>
                </div>
                
                <button 
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-black text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95 border-b-4 border-indigo-800"
                >
                    <Plus className="w-5 h-5" /> New Work Log
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-20">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-white border-4 border-dashed border-slate-900 rounded-[2.5rem] p-16 text-center shadow-custom">
                    <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border-4 border-slate-900 shadow-custom rotate-3">
                        <ImageIcon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2 italic">Gallery is Empty</h3>
                    <p className="text-slate-500 font-bold text-sm max-w-sm mx-auto mb-10 leading-relaxed uppercase tracking-widest text-[10px]">
                        Publish your first work log to start building your public engineering portfolio for customers.
                    </p>
                    <div className="bg-yellow-100 border-2 border-slate-900 p-6 rounded-2xl max-w-md mx-auto inline-block text-left shadow-custom">
                        <p className="text-[10px] font-black text-slate-900 uppercase mb-2">How to add photos:</p>
                        <ol className="text-xs font-bold text-slate-700 space-y-2 list-decimal ml-4 uppercase tracking-tighter">
                            <li>Click "New Work Log" above to enter project details.</li>
                            <li>Save the project to create a record.</li>
                            <li>Once saved, the card will show "Upload" and "Connect G-Drive" buttons.</li>
                        </ol>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {projects.map(project => (
                        <motion.div 
                            key={project._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] border-4 border-slate-900 shadow-custom-heavy overflow-hidden flex flex-col md:flex-row"
                        >
                            {/* Project Image Panel */}
                            <div className="md:w-1/2 bg-slate-100 relative group min-h-[300px]">
                                {project.images && project.images.length > 0 ? (
                                    <div className="absolute inset-0">
                                        <img src={getDirectImageUrl(project.images[0].url)} className="w-full h-full object-cover" alt={project.title} />
                                        <div className="absolute inset-0 bg-indigo-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <span className="bg-white text-slate-900 px-4 py-2 font-black uppercase text-xs tracking-widest border-2 border-slate-900 shadow-custom">
                                                {project.images.length} Photos
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                                        <ImageIcon className="w-12 h-12 mb-2" />
                                        <span className="font-black text-[10px] uppercase">No Assets Linked</span>
                                    </div>
                                )}
                                
                                <div className="absolute top-4 left-4 z-20">
                                    <span className="bg-yellow-400 text-slate-900 font-black text-[10px] px-3 py-1 uppercase tracking-widest border-2 border-slate-900 shadow-custom">
                                        {project.category}
                                    </span>
                                </div>
                            </div>

                            {/* Info Panel */}
                            <div className="md:w-1/2 p-8 flex flex-col border-l-4 border-slate-900">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{project.title}</h3>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => { setSelectedProject(project); setFormData(project); setEditMode(true); setShowModal(true); }}
                                            className="p-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-slate-900 hover:text-white transition-all transform active:scale-95 border-2 border-transparent hover:border-white shadow-sm"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(project._id)}
                                            className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all transform active:scale-95 border-2 border-transparent hover:border-white shadow-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center gap-3 text-slate-500 font-bold text-xs">
                                        <MapPin className="w-3.5 h-3.5" /> {project.location || 'Site Location Not Set'}
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500 font-bold text-xs uppercase tracking-tighter">
                                        <Calendar className="w-3.5 h-3.5" /> {project.projectDate ? new Date(project.projectDate).toLocaleDateString() : 'Date Unknown'}
                                    </div>
                                </div>

                                <p className="text-slate-600 text-sm font-medium line-clamp-3 mb-8 flex-grow leading-relaxed">
                                    {project.description}
                                </p>

                                <div className="mt-auto pt-6 border-t-4 border-slate-100 flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex gap-2">
                                        <label className="flex items-center gap-2 cursor-pointer bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors shadow-custom">
                                            <Upload className="w-3 h-3" />
                                            <span>Upload</span>
                                            <input 
                                                type="file" 
                                                multiple 
                                                className="hidden" 
                                                onChange={(e) => handleImageUpload(e, project._id)} 
                                                accept="image/*"
                                            />
                                        </label>
                                        <button 
                                            onClick={() => { setSelectedProject(project); setShowLinkModal(true); }}
                                            className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border-2 border-indigo-100"
                                        >
                                            <Link2 className="w-3 h-3" /> Connect G-Drive
                                        </button>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase">SYS.v4.2</span>
                                </div>

                                {/* Thumbnails management */}
                                {project.images && project.images.length > 0 && (
                                    <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t-2 border-slate-50">
                                        {project.images.map((img) => (
                                            <div key={img._id} className="relative group/thumb w-12 h-12 border-2 border-slate-200 rounded-lg overflow-hidden">
                                                <img src={getDirectImageUrl(img.url)} className="w-full h-full object-cover" alt="" />
                                                <button 
                                                    onClick={() => handleDeleteImage(project._id, img._id)}
                                                    className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal for Add/Edit Project */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-4xl rounded-[3rem] shadow-custom-heavy overflow-hidden border-8 border-slate-900"
                        >
                            <div className="flex items-center justify-between p-8 bg-indigo-600 border-b-8 border-slate-900 text-white">
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter italic">{editMode ? 'UPDATE' : 'CREATE'} WORK LOG</h2>
                                    <p className="text-indigo-100 font-bold text-xs font-mono">Portfolio Management Engine</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-3 bg-white text-slate-900 rounded-2xl hover:bg-red-500 hover:text-white transition">
                                    <X className="w-8 h-8 font-black" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto bg-slate-50">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Project Classification</label>
                                    <input 
                                        required 
                                        type="text" 
                                        placeholder="Project Name" 
                                        className="w-full px-6 py-5 bg-white border-4 border-slate-200 focus:border-indigo-600 outline-none transition rounded-3xl font-black text-slate-900"
                                        value={formData.title} 
                                        onChange={e => setFormData({...formData, title: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Engineering Segment</label>
                                    <select 
                                        className="w-full px-6 py-5 bg-white border-4 border-slate-200 focus:border-indigo-600 outline-none transition rounded-3xl font-black text-slate-900 appearance-none"
                                        value={formData.category} 
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                    >
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Work Scope</label>
                                    <textarea 
                                        required 
                                        rows="4" 
                                        className="w-full px-6 py-5 bg-white border-4 border-slate-200 focus:border-indigo-600 outline-none transition rounded-[2rem] font-medium text-slate-900"
                                        value={formData.description} 
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Location</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-6 py-5 bg-white border-4 border-slate-200 focus:border-indigo-600 outline-none transition rounded-3xl font-bold"
                                        value={formData.location} 
                                        onChange={e => setFormData({...formData, location: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Completion Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full px-6 py-5 bg-white border-4 border-slate-200 focus:border-indigo-600 outline-none transition rounded-3xl font-black"
                                        value={formData.projectDate ? formData.projectDate.split('T')[0] : ''} 
                                        onChange={e => setFormData({...formData, projectDate: e.target.value})} 
                                    />
                                </div>
                                <div className="md:col-span-2 pt-10">
                                    <button 
                                        type="submit" 
                                        className="w-full bg-slate-900 text-white font-black py-6 rounded-3xl shadow-custom uppercase tracking-widest text-lg hover:bg-black transition border-b-8 border-slate-700"
                                    >
                                        {editMode ? 'COMMIT UPDATES' : 'PUBLISH PROJECT'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal for External Link (G-Drive) */}
            <AnimatePresence>
                {showLinkModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 border-8 border-slate-900 shadow-custom-heavy"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Connect Drive Link</h3>
                                <button onClick={() => setShowLinkModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition"><X className="w-6 h-6" /></button>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-2xl">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">How it works:</p>
                                    <p className="text-[11px] text-indigo-900 font-bold leading-tight">Paste your Google Drive "Share" link. We will automatically convert it into a previewable image for your gallery.</p>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Public Share URL</label>
                                    <div className="relative">
                                        <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="https://drive.google.com/..." 
                                            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-4 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 transition font-medium"
                                            value={externalUrl}
                                            onChange={(e) => setExternalUrl(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button 
                                    onClick={handleLinkAdd}
                                    className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest shadow-custom hover:bg-slate-900 transition"
                                >
                                    Link Drive Asset
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom Styles */}
            <style jsx>{`
                .shadow-custom {
                    box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);
                }
                .shadow-custom-heavy {
                    box-shadow: 12px 12px 0px 0px rgba(0,0,0,1);
                }
            `}</style>
        </div>
    );
};

export default AdminPortfolio;
