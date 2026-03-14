import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import api from '../../services/api';
import { 
    Layout, ArrowLeft, Upload, Loader2, CheckCircle, 
    AlertCircle, Image as ImageIcon, Plus, Trash2, X,
    ChevronRight, ClipboardList, PenTool, BarChart3, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StaffProgress = () => {
    const { user, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(false);
    
    const [formData, setFormData] = useState({
        projectId: '',
        title: '',
        description: '',
        progressPercentage: 0,
        status: 'In Progress',
        materialsUsed: '',
        issues: '',
        nextPlan: '',
        notes: ''
    });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + selectedFiles.length > 5) {
            alert('Maximum 5 photos allowed per update');
            return;
        }

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPreviews([...previews, ...newPreviews]);
        setSelectedFiles([...selectedFiles, ...files]);
    };

    const removeFile = (index) => {
        const newFiles = [...selectedFiles];
        newFiles.splice(index, 1);
        setSelectedFiles(newFiles);

        const newPreviews = [...previews];
        newPreviews.splice(index, 1);
        setPreviews(newPreviews);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.projectId) return alert('Please select a project');
        
        setSubmitting(true);
        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        selectedFiles.forEach(file => data.append('photos', file));

        try {
            await api.post('/progress/create', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Progress report submitted successfully!');
            setShowForm(false);
            setFormData({
                projectId: '',
                title: '',
                description: '',
                progressPercentage: 0,
                status: 'In Progress',
                materialsUsed: '',
                issues: '',
                nextPlan: '',
                notes: ''
            });
            setSelectedFiles([]);
            setPreviews([]);
        } catch (err) {
            alert('Failed to submit progress update');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isAuthenticated || user?.role !== 'staff') {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="bg-brand-50 min-h-screen py-12 px-4 font-sans">
            <div className="max-w-4xl mx-auto">
                <button 
                    onClick={() => navigate('/staff')}
                    className="flex items-center gap-2 text-brand-950 font-black uppercase tracking-widest text-xs mb-8 hover:text-brand-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>

                <div className="bg-brand-950 text-white p-8 border-b-8 border-brand-accent shadow-solid mb-12 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-tighter italic">SITE PROGRESS LOG</h1>
                        <p className="text-[10px] font-bold text-brand-400 uppercase tracking-[0.2em] mt-1">Operational Reporting Module v2.0</p>
                    </div>
                    {!showForm && (
                        <button 
                            onClick={() => setShowForm(true)}
                            className="bg-brand-accent text-brand-950 px-6 py-3 font-black uppercase tracking-widest text-xs flex items-center gap-2 border-2 border-white hover:bg-white transition-all shadow-custom"
                        >
                            <Plus className="w-4 h-4" /> New Update
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 text-brand-950 animate-spin" /></div>
                ) : (
                    <div className="space-y-8">
                        <AnimatePresence>
                        {showForm && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white border-8 border-brand-950 shadow-solid p-8"
                            >
                                <div className="flex justify-between items-center mb-10 border-b-4 border-brand-50 pb-6">
                                    <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                                        <PenTool className="w-6 h-6 text-brand-accent" /> REPORT DATA ENTRY
                                    </h2>
                                    <button onClick={() => setShowForm(false)} className="bg-brand-50 p-2 hover:bg-brand-950 hover:text-white transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest ml-2">Assigned Project</label>
                                            <select 
                                                required
                                                className="w-full px-6 py-4 bg-brand-50 border-4 border-brand-200 outline-none focus:border-brand-950 font-black text-sm rounded-none"
                                                value={formData.projectId}
                                                onChange={e => setFormData({...formData, projectId: e.target.value})}
                                            >
                                                <option value="">Select Project...</option>
                                                {projects.map(p => (
                                                    <option key={p._id} value={p._id}>{p.title} - {p.location}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest ml-2">Progress Title</label>
                                            <input 
                                                required
                                                type="text"
                                                placeholder="e.g. Frame Welding Phase 1"
                                                className="w-full px-6 py-4 bg-brand-50 border-4 border-brand-200 outline-none focus:border-brand-950 font-bold text-sm"
                                                value={formData.title}
                                                onChange={e => setFormData({...formData, title: e.target.value})}
                                            />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest ml-2">Work Description</label>
                                            <textarea 
                                                required
                                                rows="4"
                                                placeholder="Detailed account of work completed today..."
                                                className="w-full px-6 py-4 bg-brand-50 border-4 border-brand-200 outline-none focus:border-brand-950 font-medium text-sm"
                                                value={formData.description}
                                                onChange={e => setFormData({...formData, description: e.target.value})}
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center px-2">
                                                <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Completion Percentage</label>
                                                <span className="text-xl font-black text-brand-950">{formData.progressPercentage}%</span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="0"
                                                max="100"
                                                className="w-full h-4 bg-brand-200 rounded-none appearance-none cursor-pointer accent-brand-950"
                                                value={formData.progressPercentage}
                                                onChange={e => setFormData({...formData, progressPercentage: e.target.value})}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest ml-2">Operational Status</label>
                                            <select 
                                                className="w-full px-6 py-4 bg-brand-50 border-4 border-brand-200 outline-none focus:border-brand-950 font-black text-sm"
                                                value={formData.status}
                                                onChange={e => setFormData({...formData, status: e.target.value})}
                                            >
                                                <option value="Not Started">Not Started</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Detailed Fields */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t-4 border-brand-50 pt-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest ml-2">Materials Used</label>
                                            <textarea 
                                                rows="2"
                                                className="w-full px-4 py-3 bg-brand-50 border-2 border-brand-200 outline-none focus:border-brand-950 text-xs font-bold"
                                                value={formData.materialsUsed}
                                                onChange={e => setFormData({...formData, materialsUsed: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest ml-2">Site Issues / Blockers</label>
                                            <textarea 
                                                rows="2"
                                                className="w-full px-4 py-3 bg-brand-50 border-2 border-brand-200 outline-none focus:border-brand-950 text-xs font-bold"
                                                value={formData.issues}
                                                onChange={e => setFormData({...formData, issues: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest ml-2">Next Phase Plan</label>
                                            <input 
                                                type="text"
                                                className="w-full px-4 py-3 bg-brand-50 border-2 border-brand-200 outline-none focus:border-brand-950 text-xs font-bold"
                                                value={formData.nextPlan}
                                                onChange={e => setFormData({...formData, nextPlan: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    {/* Photo Upload Section */}
                                    <div className="space-y-4 pt-6">
                                        <label className="text-[10px] font-black text-brand-600 uppercase tracking-widest ml-2">Site Documentation (Max 5 Photos)</label>
                                        <div className="flex flex-wrap gap-4">
                                            <label className="w-32 h-32 border-4 border-dashed border-brand-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand-950 transition-colors bg-brand-50 group">
                                                <Upload className="w-8 h-8 text-brand-200 group-hover:text-brand-950" />
                                                <span className="text-[8px] font-black mt-2 text-brand-300 group-hover:text-brand-950">ADD PHOTOS</span>
                                                <input type="file" multiple className="hidden" accept="image/*" onChange={handleFileChange} />
                                            </label>

                                            {previews.map((preview, idx) => (
                                                <div key={idx} className="w-32 h-32 relative border-4 border-brand-950 shadow-md">
                                                    <img src={preview} alt="Work preview" className="w-full h-full object-cover" />
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeFile(idx)}
                                                        className="absolute -top-3 -right-3 bg-red-600 text-white p-1 rounded-full border-2 border-white shadow-lg"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-8">
                                        <button 
                                            disabled={submitting}
                                            className="w-full bg-brand-950 text-white py-6 font-black uppercase tracking-[0.3em] text-lg shadow-solid active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                                        >
                                            {submitting ? (
                                                <><Loader2 className="w-6 h-6 animate-spin" /> UPLOADING LOGS...</>
                                            ) : (
                                                'TRANSMIT SITE REPORT'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                        </AnimatePresence>

                        {/* Summary View for Staff */}
                        {!showForm && (
                            <div className="bg-white border-8 border-brand-950 p-8 shadow-solid">
                                <div className="flex items-center gap-4 mb-8">
                                    <BarChart3 className="w-10 h-10 text-brand-accent" />
                                    <div>
                                        <h2 className="text-2xl font-black uppercase tracking-tighter">PROJECT STATUS LIST</h2>
                                        <p className="text-[10px] font-bold text-brand-500 uppercase">Real-time completion monitoring</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {projects.length === 0 ? (
                                        <div className="text-center py-10 text-brand-400 font-bold uppercase tracking-widest text-xs">No projects currently assigned.</div>
                                    ) : projects.map(project => (
                                        <div key={project._id} className="border-4 border-brand-50 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="bg-brand-950 text-brand-accent px-2 py-0.5 text-[8px] font-black uppercase italic tracking-widest">Active</span>
                                                    <h3 className="text-xl font-black uppercase tracking-tight">{project.title}</h3>
                                                </div>
                                                <div className="flex items-center gap-4 text-brand-500 text-[10px] font-black tracking-widest uppercase">
                                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {project.location || 'Site N/A'}</span>
                                                    <span>{project.serviceType}</span>
                                                </div>
                                            </div>

                                            <div className="w-full md:w-64">
                                                <div className="flex justify-between items-center mb-2 px-1">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-600">Progress</span>
                                                    <span className="text-sm font-black text-brand-950">{project.progress}%</span>
                                                </div>
                                                <div className="h-4 bg-brand-100 border-2 border-brand-950 w-full">
                                                    <div 
                                                        className="h-full bg-brand-accent border-r-2 border-brand-950 transition-all duration-1000" 
                                                        style={{ width: `${project.progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => {
                                                    setFormData({...formData, projectId: project._id, progressPercentage: project.progress});
                                                    setShowForm(true);
                                                } }
                                                className="bg-brand-950 text-white px-6 py-3 font-black uppercase tracking-widest text-[10px] hover:bg-brand-accent hover:text-brand-950 transition-all active:scale-95 shadow-custom"
                                            >
                                                UPDATE
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
                .shadow-solid {
                    box-shadow: 8px 8px 0px 0px rgba(0,0,0,1);
                }
                .shadow-custom {
                    box-shadow: 4px 4px 0px 0px rgba(0,0,0,1);
                }
            `}</style>
        </div>
    );
};

export default StaffProgress;
