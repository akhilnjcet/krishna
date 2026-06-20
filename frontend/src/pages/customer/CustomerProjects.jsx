import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Briefcase, Calendar, DollarSign, User, Mail, Phone, Clock, 
    CheckCircle2, AlertCircle, RefreshCw, FileText, ChevronRight,
    MapPin, Users
} from 'lucide-react';

const CustomerProjects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await api.get('/customer/projects');
            const data = res.data || [];
            setProjects(data);
            if (data.length > 0) {
                setSelectedProject(data[0]);
            }
        } catch (err) {
            console.error("Error fetching projects:", err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': 
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'in-progress':
            case 'in progress':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'delayed':
                return 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse';
            case 'stopped':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 animate-pulse">
                <div className="w-16 h-16 bg-blue-50 border-4 border-blue-100 rounded-2xl flex items-center justify-center mb-6">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
                <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Syncing Portfolio Assets...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-8 rounded-[2.5rem] border-b-8 border-indigo-500 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Secure Link Uplink</div>
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white font-poppins">
                        My Commissioned Projects
                    </h1>
                    <p className="text-slate-400 text-xs mt-2 max-w-2xl font-medium">
                        Real-time industrial contract status, assigned logistics engineers, contact details, and milestone timelines.
                    </p>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Projects list selection */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 mb-6 flex items-center gap-2 border-b pb-3 border-slate-100">
                            <Briefcase className="w-4 h-4 text-indigo-500" /> ACTIVE AGREEMENTS
                        </h2>
                        
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            {projects.map((project) => (
                                <button
                                    key={project._id}
                                    onClick={() => setSelectedProject(project)}
                                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                                        selectedProject?._id === project._id
                                            ? 'border-indigo-600 bg-indigo-50/30'
                                            : 'border-transparent bg-slate-50 hover:bg-slate-100/70'
                                    }`}
                                >
                                    <div className="min-w-0 flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                                            selectedProject?._id === project._id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
                                        }`}>
                                            {project.title.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-800 truncate uppercase">{project.title}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{project.serviceType}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedProject?._id === project._id ? 'text-indigo-600 translate-x-1' : 'text-slate-300'}`} />
                                </button>
                            ))}
                            
                            {projects.length === 0 && (
                                <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">No project records found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Project Details Panel */}
                <div className="lg:col-span-8 space-y-6">
                    <AnimatePresence mode="wait">
                        {selectedProject ? (
                            <motion.div
                                key={selectedProject._id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                className="space-y-8"
                            >
                                {/* Hero Project Card */}
                                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusStyle(selectedProject.status)}`}>
                                                    {selectedProject.status || 'Active'}
                                                </span>
                                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider">
                                                    ID: {selectedProject._id.slice(-8).toUpperCase()}
                                                </span>
                                            </div>
                                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight font-poppins">
                                                {selectedProject.title}
                                            </h2>
                                        </div>

                                        <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-5 py-3 rounded-2xl flex items-center gap-2 font-mono">
                                            <DollarSign className="w-5 h-5 text-emerald-600" />
                                            <div className="text-right">
                                                <div className="text-[8px] font-black text-emerald-600 uppercase tracking-wider">Contract Budget</div>
                                                <div className="text-base font-black">₹ {selectedProject.budget?.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600 border border-slate-100">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Deadline</div>
                                                <div className="text-xs font-extrabold text-slate-800">
                                                    {selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'}) : 'N/A'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600 border border-slate-100">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Site Location</div>
                                                <div className="text-xs font-extrabold text-slate-800 truncate max-w-[150px]">
                                                    {selectedProject.location || 'N/A'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600 border border-slate-100">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Current Completion</div>
                                                <div className="text-xs font-black text-indigo-600">
                                                    {selectedProject.progress}% Solid
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="space-y-2">
                                        <div className="h-3 bg-slate-100 w-full rounded-full overflow-hidden border border-slate-200/50">
                                            <div 
                                                className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)] transition-all duration-1000" 
                                                style={{ width: `${selectedProject.progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Assigned Logistics Team */}
                                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                    <h3 className="text-lg font-black text-slate-850 uppercase tracking-tight flex items-center gap-2 border-b pb-3 border-slate-100">
                                        <Users className="w-5 h-5 text-indigo-500" /> Assigned Engineering Team
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedProject.assignedStaff && selectedProject.assignedStaff.length > 0 ? (
                                            selectedProject.assignedStaff.map((staff) => (
                                                <div key={staff._id} className="bg-slate-50 border border-slate-200/60 rounded-3xl p-5 hover:bg-slate-100/50 transition-colors flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg border border-indigo-200 flex-shrink-0">
                                                        {staff.profilePhoto ? (
                                                            <img src={staff.profilePhoto} alt={staff.name} className="w-full h-full object-cover rounded-2xl" />
                                                        ) : (
                                                            staff.name.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 space-y-2">
                                                        <div>
                                                            <h4 className="font-black text-slate-900 text-sm truncate uppercase">{staff.name}</h4>
                                                            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider">{staff.designation || 'Field Engineer'}</p>
                                                        </div>
                                                        <div className="space-y-1 text-slate-500 text-xs font-semibold">
                                                            <a href={`mailto:${staff.email}`} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors truncate">
                                                                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                                                <span className="truncate">{staff.email}</span>
                                                            </a>
                                                            {(staff.phone || staff.phoneNumber) && (
                                                                <a href={`tel:${staff.phone || staff.phoneNumber}`} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                                                                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                                                    <span>{staff.phone || staff.phoneNumber}</span>
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-2 text-center py-6 bg-slate-50 border border-dashed rounded-3xl text-slate-400 font-bold uppercase text-xs">
                                                No engineering personnel allocated to this project unit.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Project Timeline */}
                                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                                    <h3 className="text-lg font-black text-slate-850 uppercase tracking-tight flex items-center gap-2 border-b pb-3 border-slate-100">
                                        <Clock className="w-5 h-5 text-indigo-500" /> Milestone Delivery Timeline
                                    </h3>

                                    {selectedProject.timelineStatus === 'Sent to Client' && selectedProject.timeline && selectedProject.timeline.length > 0 ? (
                                        <div className="relative pl-6 border-l-2 border-slate-100 space-y-8 ml-3 py-2">
                                            {selectedProject.timeline.map((milestone, idx) => {
                                                const isCompleted = milestone.status === 'Completed';
                                                return (
                                                    <div key={milestone._id || idx} className="relative space-y-2">
                                                        {/* Step Indicator Pin */}
                                                        <span className={`absolute -left-[35px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-4 ${
                                                            isCompleted 
                                                                ? 'bg-emerald-500 border-white text-white shadow-md shadow-emerald-500/20' 
                                                                : 'bg-white border-indigo-600 text-indigo-600'
                                                        }`}>
                                                            {isCompleted ? (
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                                                            )}
                                                        </span>

                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <h4 className={`text-base font-black uppercase tracking-tight ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                                {milestone.title}
                                                            </h4>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-150 px-2.5 py-1 rounded-lg">
                                                                    {new Date(milestone.date).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric'})}
                                                                </span>
                                                                <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                                                                    isCompleted 
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                                }`}>
                                                                    {milestone.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {milestone.description && (
                                                            <p className={`text-xs font-semibold leading-relaxed max-w-2xl ${isCompleted ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                {milestone.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center bg-slate-50 border border-dashed rounded-3xl text-slate-400">
                                            <Clock className="w-10 h-10 mx-auto mb-3 opacity-40 text-slate-400" />
                                            <h4 className="font-extrabold uppercase text-xs text-slate-500 mb-1">Timeline Compilation in Progress</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-sm mx-auto">
                                                A custom blueprint timeline is being generated by our engineers. You will be notified as soon as it is reviewed and published.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-55 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400">
                                <Briefcase className="w-16 h-16 opacity-30 mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest italic">Select a project agreement to relay intelligence.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default CustomerProjects;
