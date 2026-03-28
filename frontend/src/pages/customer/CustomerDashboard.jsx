import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { getDirectImageUrl } from '../../utils/imageUtils';
import useAuthStore from '../../stores/authStore';
import api from '../../services/api';
import { 
    Layout, ArrowLeft, Loader2, CheckCircle, 
    AlertCircle, Image as ImageIcon, MapPin,
    Calendar, Clock, LayoutGrid
} from 'lucide-react';

const CustomerDashboard = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [progressUpdates, setProgressUpdates] = useState([]);

    useEffect(() => {
        if (isAuthenticated && user?.role === 'customer') {
            fetchProjects();
        }
    }, [isAuthenticated, user]);

    useEffect(() => {
        if (selectedProjectId) {
            fetchProgress(selectedProjectId);
        }
    }, [selectedProjectId]);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects');
            setProjects(res.data);
            if (res.data.length > 0) {
                setSelectedProjectId(res.data[0]._id);
            }
        } catch (err) {
            console.error('Fetch Projects Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProgress = async (id) => {
        try {
            const res = await api.get(`/progress/project/${id}`);
            setProgressUpdates(res.data);
        } catch (err) {
            console.error('Fetch Progress Error:', err);
        }
    };

    // Verify authentication and role
    if (!isAuthenticated || user?.role !== 'customer') {
        if (user?.role === 'admin') return <Navigate to="/admin" replace />;
        if (user?.role === 'staff') return <Navigate to="/staff" replace />;
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const selectedProject = projects.find(p => p._id === selectedProjectId);

    return (
        <div className="bg-brand-50 min-h-screen py-10 md:py-16 px-4 font-sans border-t-8 border-brand-950">
            <div className="max-w-6xl mx-auto">

                {/* Header Block */}
                <div className="bg-brand-950 text-white p-8 flex flex-col md:flex-row justify-between items-start md:items-center border-b-8 border-brand-accent shadow-[8px_8px_0_0_rgba(0,0,0,1)] mb-12">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-accent mb-2">Client Services Portal</div>
                        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter">PROJECT HUB</h1>
                    </div>

                    <div className="mt-6 md:mt-0 flex flex-col md:items-end w-full md:w-auto">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-black uppercase text-white">{user?.name || 'Client Account'}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-brand-400">ID: {(user?._id || user?.id || 'MOCK-ID').substring(0, 8)}</div>
                            </div>
                            <div className="w-12 h-12 bg-white text-brand-950 flex items-center justify-center font-black text-xl border-4 border-brand-accent">
                                {user?.name?.charAt(0) || 'C'}
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-brand-800 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest py-2 px-6 transition-colors border-2 border-brand-950 w-full sm:w-auto"
                        >
                            Secure Logout
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20"><Loader2 className="w-12 h-12 animate-spin text-brand-950" /></div>
                ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Metrics & Actions */}
                    <div className="lg:col-span-1 space-y-8">

                        {/* Project Selector */}
                        <div className="bg-white border-4 border-brand-950 p-6 shadow-solid">
                            <h3 className="font-black text-brand-950 uppercase tracking-tighter text-xl mb-6 border-b-4 border-brand-100 pb-2 flex items-center gap-3">
                                <LayoutGrid className="w-6 h-6 text-brand-accent" /> MY PROJECTS
                            </h3>

                            <div className="space-y-4">
                                {projects.length === 0 ? (
                                    <p className="text-xs font-bold text-brand-400 uppercase">No active projects linked to your account.</p>
                                ) : (
                                    projects.map(p => (
                                        <button 
                                            key={p._id}
                                            onClick={() => setSelectedProjectId(p._id)}
                                            className={`w-full text-left p-4 border-2 transition-all ${selectedProjectId === p._id ? 'bg-brand-950 text-white border-brand-950' : 'bg-brand-50 border-brand-100 hover:border-brand-950 text-brand-900'}`}
                                        >
                                            <div className="text-xs font-black uppercase tracking-tighter truncate">{p.title}</div>
                                            <div className={`text-[8px] font-bold uppercase mt-1 ${selectedProjectId === p._id ? 'text-brand-accent' : 'text-brand-400'}`}>{p.status}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-brand-950 p-6 border-4 border-brand-800 text-white relative overflow-hidden">
                            <div className="absolute -bottom-10 -right-10 text-9xl text-brand-800 opacity-20 font-black">⚙</div>
                            <h3 className="font-black text-brand-accent uppercase tracking-tighter text-xl mb-6 border-b-2 border-brand-800 pb-2 relative z-10">Quick Actions</h3>

                            <div className="space-y-4 relative z-10">
                                <Link to="/quote" className="block w-full text-center bg-brand-accent hover:bg-white text-brand-950 font-black uppercase tracking-widest py-3 border-2 border-brand-950 transition-colors">
                                    Request New Quote
                                </Link>
                                <button className="block w-full text-center bg-transparent border-2 border-brand-800 hover:border-brand-accent hover:bg-brand-900 text-brand-200 hover:text-white font-black uppercase tracking-widest py-3 transition-colors">
                                    Contact Project Mgr
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Project Tracking */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Active Project Tracker */}
                        {selectedProject ? (
                        <div className="bg-white border-4 border-brand-950 p-6 sm:p-8 shadow-solid">
                            <div className="flex justify-between items-center mb-6 border-b-4 border-brand-950 pb-4">
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-brand-950">
                                    <span className="text-brand-accent mr-3">■</span>
                                    Live Project Tracker
                                </h2>
                                <span className="bg-brand-950 text-brand-accent font-black text-[10px] uppercase tracking-widest px-3 py-1 hidden sm:inline-block italic">
                                    {selectedProject.status.replace('-', ' ')}
                                </span>
                            </div>

                            <div className="mb-8">
                                <h3 className="text-xl font-black uppercase text-brand-950 mb-1">{selectedProject.title}</h3>
                                <p className="text-sm font-bold text-brand-500 uppercase tracking-widest truncate">{selectedProject.location || 'Site Details Pending'}</p>
                            </div>

                            {/* Progress Bar System */}
                            <div className="mb-10">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-brand-600 mb-2 px-1">
                                    <span>Activity Report Baseline</span>
                                    <span>{selectedProject.progress}% Complete</span>
                                </div>
                                <div className="w-full h-8 bg-brand-100 border-4 border-brand-950 relative overflow-hidden">
                                    <div 
                                        className="absolute top-0 left-0 h-full bg-brand-accent border-r-4 border-brand-950 transition-all duration-1000"
                                        style={{ width: `${selectedProject.progress}%` }}
                                    >
                                        {/* Striped overlay for active progress */}
                                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)] animate-[progress_1s_linear_infinite]"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Milestone Timline */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black uppercase text-brand-400 tracking-widest mb-4 border-b-2 border-brand-50 pb-2">Operational Timeline</h4>
                                {progressUpdates.length === 0 ? (
                                    <div className="text-center py-6 text-brand-300 font-bold uppercase tracking-widest text-[10px]">Awaiting initial site log...</div>
                                ) : (
                                    progressUpdates.map((update, idx) => (
                                        <div key={update._id} className="relative pl-8 border-l-4 border-brand-100 pb-8 last:pb-0">
                                            {/* Dot */}
                                            <div className={`absolute -left-3 top-0 w-5 h-5 border-4 border-white shadow-sm ${idx === 0 ? 'bg-brand-accent animate-pulse' : 'bg-brand-950'}`}></div>
                                            
                                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                                <div className="flex-grow">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className="text-xs font-black uppercase tracking-tighter text-brand-950">{update.title}</span>
                                                        <span className="text-[8px] font-black bg-brand-50 px-2 py-0.5 border border-brand-100 text-brand-400">
                                                            {new Date(update.date).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-brand-600 font-medium leading-relaxed">{update.description}</p>
                                                    
                                                    {/* Update Photos */}
                                                    {update.photos && update.photos.length > 0 && (
                                                        <div className="flex gap-2 mt-4">
                                                            {update.photos.map((photo, pIdx) => (
                                                                <a key={pIdx} href={photo.url} target="_blank" rel="noreferrer" className="w-16 h-16 border-2 border-brand-100 overflow-hidden hover:border-brand-950 transition-colors">
                                                                    <img src={getDirectImageUrl(photo.url)} className="w-full h-full object-cover" alt="Progress" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-[10px] font-black text-brand-950 px-2 py-1 border-2 border-brand-950 inline-block">
                                                        {update.progressPercentage}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        ) : (
                            <div className="bg-white border-4 border-dashed border-brand-200 p-20 text-center rounded-3xl">
                                <LayoutGrid className="w-16 h-16 text-brand-100 mx-auto mb-4" />
                                <p className="font-black uppercase tracking-widest text-brand-300">Select a project to view live data</p>
                            </div>
                        )}
                    </div>
                </div>
                )}
            </div>
            {/* Custom Animation for Progress Bar processing effect */}
            <style jsx>{`
                @keyframes progress {
                    0% { background-position: 0 0; }
                    100% { background-position: 28px 0; }
                }
                .shadow-solid {
                    box-shadow: 8px 8px 0px 0px rgba(0,0,0,1);
                }
            `}</style>
        </div>
    );
};

export default CustomerDashboard;

