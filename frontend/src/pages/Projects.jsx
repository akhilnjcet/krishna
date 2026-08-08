import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
    Loader2, AlertCircle, Image as ImageIcon, MapPin, X, 
    ArrowUpRight, Grid, Zap, Hammer, HardHat
} from 'lucide-react';
import api from '../services/api';
import { getDirectImageUrl, expandGoogleDriveFolders } from '../utils/imageUtils';
import DriveImage from '../components/DriveImage';

// Global spark generator helper
const generateSparks = (count) => {
    return [...Array(count)].map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        scale: Math.random() * 2,
        duration: Math.random() * 3 + 2,
        delay: Math.random() * 5,
        xOffset: (Math.random() - 0.5) * 200
    }));
};

const WeldingSparks = () => {
    // Initializing state with the function directly to avoid synchronous setState in useEffect
    const [sparks] = useState(() => generateSparks(15));

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {sparks.map((spark) => (
                <motion.div
                    key={spark.id}
                    className="absolute w-1 h-1 bg-brand-accent rounded-full"
                    initial={{ 
                        left: `${spark.x}%`, 
                        top: '110%',
                        opacity: 0,
                        scale: spark.scale
                    }}
                    animate={{ 
                        top: '-10%',
                        left: [`${spark.x}%`, `${spark.x + (spark.xOffset / 10)}%`],
                        opacity: [0, 1, 0],
                        rotate: [0, 360]
                    }}
                    transition={{ 
                        duration: spark.duration, 
                        repeat: Infinity,
                        delay: spark.delay,
                        ease: "linear"
                    }}
                    style={{
                        filter: 'blur(1px) drop-shadow(0 0 5px #ffb400)',
                        boxShadow: '0 0 10px #ffb400'
                    }}
                />
            ))}
        </div>
    );
};

const Projects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedProject, setSelectedProject] = useState(null);

    const categories = [
        { id: 'all', name: 'All Work', icon: <Grid className="w-3 h-3" /> },
        { id: 'Welding', name: 'Precision Welding', icon: <Zap className="w-3 h-3" /> },
        { id: 'Roofing', name: 'Industrial Roofing', icon: <Hammer className="w-3 h-3" /> },
        { id: 'Truss Work', name: 'Heavy Trusses', icon: <Zap className="w-3 h-3" /> },
        { id: 'Fabrication', name: 'Fabrication', icon: <Hammer className="w-3 h-3" /> },
        { id: 'Construction', name: 'Civil/Structural', icon: <HardHat className="w-3 h-3" /> },
    ];

    useEffect(() => {
        const fetchGallery = async () => {
            try {
                const res = await api.get('/portfolio/gallery');
                const expandedProjects = await Promise.all(res.data.map(async p => ({
                    ...p,
                    images: await expandGoogleDriveFolders(p.images || [])
                })));
                setProjects(expandedProjects);
            } catch (err) {
                console.error('Failed to fetch gallery:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchGallery();
    }, []);

    const filteredProjects = filter === 'all'
        ? projects
        : projects.filter(p => p.category === filter);

    return (
        <div className="bg-slate-50 dark:bg-slate-800 min-h-screen pb-24 font-sans text-slate-800 dark:text-slate-200 overflow-x-hidden selection:bg-blue-600 selection:text-white">
            
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-200/20 blur-[150px] rounded-full"></div>
                <div className="absolute inset-0 opacity-[0.01] mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>

            <WeldingSparks />

            <div className="relative pt-32 pb-20 px-4">
                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-blue-600 text-[9px] font-black uppercase tracking-[0.4em] mb-10 shadow-sm backdrop-blur-md">
                           <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span> 
                           Engineering Archives v2.0
                        </div>
                        <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.75] mb-10 text-slate-900 dark:text-white flex flex-col items-center font-poppins">
                            <span>BUILT WITH</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-500 to-blue-800 bg-[length:200%_auto] animate-shimmer">
                                PRECISION.
                            </span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-bold max-w-2xl mx-auto text-sm md:text-lg leading-relaxed uppercase tracking-wider">
                            A portfolio of heavy-duty solutions, from complex steel trusses to high-integrity structural welding.
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-3 mb-24"
                >
                    {categories.map(cat => (
                        <motion.button
                            key={cat.id}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95, y: 0 }}
                            onClick={() => setFilter(cat.id)}
                            className={`group relative px-8 py-3.5 text-[10px] font-black uppercase tracking-[0.25em] transition-all rounded-xl border-2 flex items-center gap-3 overflow-hidden ${
                                filter === cat.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-[0_4px_20px_rgba(37,99,235,0.25)]'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600 shadow-sm'
                            }`}
                        >
                            {filter === cat.id && (
                                <motion.div 
                                    className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10 animate-pulse"
                                />
                            )}
                            <span className={filter === cat.id ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}>{cat.icon}</span>
                            {cat.name}
                        </motion.button>
                    ))}
                </motion.div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <div className="relative w-20 h-20">
                            <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-t-2 border-blue-600 rounded-full"
                            />
                            <motion.div 
                                animate={{ rotate: -360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-4 border-b-2 border-slate-200 dark:border-slate-700 rounded-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                            </div>
                        </div>
                        <p className="font-black text-[9px] uppercase tracking-[0.8em] text-slate-400 mt-10">Syncing Production Data...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-40 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
                    >
                        <AlertCircle className="w-20 h-20 text-slate-300 mx-auto mb-8" />
                        <p className="font-black uppercase tracking-[0.4em] text-slate-400">No project archives detected</p>
                    </motion.div>
                ) : (
                    <LayoutGroup>
                        <motion.div 
                            layout
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12"
                        >
                            <AnimatePresence mode='popLayout'>
                                {filteredProjects.map((project, idx) => (
                                    <motion.div
                                        key={project._id}
                                        layout
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                                        whileHover={{ y: -10 }}
                                        className="group cursor-pointer relative"
                                        onClick={() => setSelectedProject(project)}
                                    >
                                        <div className="relative aspect-[10/11] overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-lg group-hover:border-blue-300 group-hover:shadow-2xl transition-all duration-500">
                                            <div className="absolute inset-0 z-10 pointer-events-none border-[12px] border-white/0 group-hover:border-white/5 transition-all duration-500"></div>
                                            
                                            {project.images && project.images.length > 0 ? (
                                                <DriveImage
                                                    src={project.images[0].url}
                                                    alt={project.title}
                                                    className="w-full h-full transition-all duration-1000 group-hover:scale-110 grayscale-[20%] group-hover:grayscale-0 contrast-[1.05]"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                    <ImageIcon className="w-16 h-16" />
                                                </div>
                                            )}
                                            
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-70 group-hover:opacity-95 transition-opacity duration-500 flex flex-col justify-end p-10 translate-y-4 group-hover:translate-y-0 transition-transform">
                                                <div className="mb-4 flex items-center gap-3">
                                                    <div className="w-10 h-[2px] bg-blue-400"></div>
                                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em]">
                                                        {project.category}
                                                    </span>
                                                </div>
                                                <h3 className="text-3xl font-black uppercase tracking-tighter leading-[0.85] text-white">
                                                    {project.title}
                                                </h3>
                                                
                                                <div className="mt-8 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                                       <MapPin className="w-3.5 h-3.5 text-blue-400" /> {project.location || 'SITE'}
                                                    </div>
                                                    <div className="bg-blue-600 text-white p-3.5 rounded-full rotate-45 group-hover:rotate-0 transition-transform duration-500 shadow-[0_4px_15px_rgba(37,99,235,0.3)]">
                                                        <ArrowUpRight className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    </LayoutGroup>
                )}

                <AnimatePresence>
                    {selectedProject && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                                onClick={() => setSelectedProject(null)}
                            />
                            
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-slate-900 max-w-[1300px] w-full h-full max-h-[90vh] rounded-[2.5rem] border border-slate-200 dark:border-slate-700 relative z-10 flex flex-col lg:flex-row overflow-hidden shadow-2xl"
                            >
                                <button
                                    onClick={() => setSelectedProject(null)}
                                    className="absolute top-4 right-4 bg-slate-900 text-white p-2.5 sm:p-4 rounded-full z-50 transition-all active:scale-90 hover:rotate-90 flex items-center justify-center shadow-lg hover:bg-blue-600"
                                >
                                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>

                                <div className="lg:w-[60%] relative h-[45vh] lg:h-auto bg-slate-950 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide group">
                                    {selectedProject.images && selectedProject.images.length > 0 ? (
                                        selectedProject.images.map((img, idx) => (
                                            <div key={idx} className="min-w-full h-full snap-center relative">
                                                <DriveImage 
                                                    src={img.url} 
                                                    alt={`Shot ${idx + 1}`} 
                                                    className="w-full h-full grayscale-[20%] hover:grayscale-0 transition-all duration-700"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60"></div>
                                                <div className="absolute top-6 left-6 text-[9px] font-black text-white/80 uppercase tracking-[0.5em] bg-slate-950/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                                    Frame {idx + 1} / {selectedProject.images.length}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white/10 font-black uppercase text-2xl">No Media Assets Found</div>
                                    )}
                                    
                                    {selectedProject.images?.length > 1 && (
                                        <div className="absolute bottom-6 left-6 flex gap-1 z-20">
                                            {selectedProject.images.map((_, i) => (
                                                <div key={i} className="w-12 h-1 bg-white dark:bg-slate-900/15 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        animate={{ x: [-50, 50] }} 
                                                        transition={{ duration: 3, repeat: Infinity }}
                                                        className="h-full bg-blue-600/40 w-full"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="lg:w-[40%] p-6 sm:p-10 md:p-16 flex flex-col bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 overflow-y-auto max-h-[45vh] lg:max-h-none flex-grow">
                                    <motion.div 
                                        initial={{ opacity: 0, x: 30 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <div className="flex flex-wrap items-center gap-3 mb-6 md:mb-10">
                                            <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-[0.4em] rounded-md border border-blue-200/60">
                                                {selectedProject.category}
                                            </span>
                                            {selectedProject.location && (
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-blue-600" /> {selectedProject.location}
                                                </span>
                                            )}
                                        </div>

                                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-6 md:mb-10 uppercase tracking-tighter leading-[0.85] italic font-poppins">
                                            {selectedProject.title}
                                        </h2>

                                        <div className="space-y-4 md:space-y-8 text-slate-600 dark:text-slate-400 text-sm md:text-lg font-medium leading-relaxed mb-8 md:mb-16">
                                            <p className="border-l-4 border-blue-600 pl-6">{selectedProject.description}</p>
                                            
                                            {selectedProject.projectDate && (
                                                <div className="pt-6 md:pt-10 flex items-center gap-10">
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">Completion</div>
                                                        <div className="text-slate-800 dark:text-slate-200 font-black text-xl uppercase tracking-tighter">
                                                            {new Date(selectedProject.projectDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">Status</div>
                                                        <div className="text-green-600 font-black text-xl uppercase tracking-tighter italic">ACTIVE LOG</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>

                                    <div className="mt-auto pt-6 md:pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                                        <Link 
                                            to={`/quote?service=${selectedProject.category}&project=${selectedProject._id}`} 
                                            className="group block w-full bg-blue-600 text-white py-4 sm:py-6 px-10 text-center text-[10px] font-black uppercase tracking-[0.5em] transition-all hover:bg-slate-900 active:scale-95 rounded-2xl shadow-xl shadow-blue-100 relative overflow-hidden"
                                        >
                                            <motion.div 
                                                className="absolute inset-0 bg-white dark:bg-slate-900/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700"
                                            />
                                            Secure Consultation
                                        </Link>
                                        <button 
                                            onClick={() => setSelectedProject(null)}
                                            className="w-full py-3 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-800 dark:text-slate-200 transition-colors"
                                        >
                                            Return to Archives
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </div>

            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-shimmer {
                    animation: shimmer 10s linear infinite;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                ::selection {
                    background: #ffb400;
                    color: black;
                }
            `}</style>
        </div>
    );
};





export default Projects;
