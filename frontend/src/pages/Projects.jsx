import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, Image as ImageIcon, MapPin, X } from 'lucide-react';
import api from '../services/api';

const Projects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedProject, setSelectedProject] = useState(null);

    const categories = [
        { id: 'all', name: 'All Operations' },
        { id: 'Welding', name: 'Welding' },
        { id: 'Roofing', name: 'Roofing' },
        { id: 'Truss Work', name: 'Trusses' },
        { id: 'Fabrication', name: 'Fabrication' },
        { id: 'Construction', name: 'Construction' },
    ];

    useEffect(() => {
        fetchGallery();
    }, []);

    const fetchGallery = async () => {
        try {
            const res = await api.get('/portfolio/gallery');
            setProjects(res.data);
        } catch (err) {
            console.error('Failed to fetch gallery:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = filter === 'all'
        ? projects
        : projects.filter(p => p.category === filter);

    return (
        <div className="bg-brand-50 min-h-screen pb-24 font-sans">

            {/* Heavy Header */}
            <div className="relative bg-brand-950 pt-24 pb-20 px-4 border-b-8 border-brand-accent overflow-hidden">
                <div className="absolute bottom-0 right-0 w-1/2 h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.03)_25%,rgba(255,255,255,0.03)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.03)_75%,rgba(255,255,255,0.03)_100%)] bg-[length:20px_20px]"></div>

                <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10">
                    <div className="bg-white text-brand-950 uppercase font-black tracking-widest text-[10px] sm:text-xs px-4 py-1.5 inline-block mb-6 border-l-4 border-brand-accent">
                        Project Logbook
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-brand-accent uppercase tracking-tighter mb-4 leading-none">
                        COMPLETED <br className="md:hidden" /><span className="text-white">WORK</span>
                    </h1>
                    <p className="text-lg text-brand-400 font-medium max-w-2xl mt-4">
                        Examining our legacy in structural fabrication and heavy civil installations across multiple sectors.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                {/* Filter Controls */}
                <div className="flex flex-wrap justify-center gap-2 mb-12">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilter(cat.id)}
                            className={`px-6 py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest transition-all border-2 ${filter === cat.id
                                    ? 'bg-brand-accent border-brand-950 text-brand-950 shadow-solid'
                                    : 'bg-white border-brand-200 text-brand-600 hover:border-brand-950 hover:text-brand-950'
                                }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* Gallery Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="w-12 h-12 text-brand-950 animate-spin mb-4" />
                        <p className="font-black uppercase tracking-widest text-brand-600">Accessing Archives...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-24 bg-white border-4 border-brand-950 shadow-solid">
                        <AlertCircle className="w-16 h-16 text-brand-200 mx-auto mb-4" />
                        <p className="font-black uppercase tracking-widest text-brand-600">No Projects Found in this category</p>
                    </div>
                ) : (
                    <motion.layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                        <AnimatePresence>
                            {filteredProjects.map(project => (
                                <motion.div
                                    key={project._id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                    className="bg-white border-4 border-brand-950 shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all cursor-pointer group flex flex-col"
                                    onClick={() => setSelectedProject(project)}
                                >
                                    <div className="relative h-64 overflow-hidden border-b-4 border-brand-950 bg-slate-100">
                                        {/* Heavy overlay on hover */}
                                        <div className="absolute inset-0 bg-brand-accent mix-blend-multiply opacity-0 group-hover:opacity-80 transition-opacity z-10 flex items-center justify-center">
                                            <span className="text-brand-950 font-black text-2xl uppercase tracking-tighter opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 border-4 border-brand-950 px-4 py-2 bg-white shadow-solid">View details</span>
                                        </div>
                                        {project.images && project.images.length > 0 ? (
                                            <img
                                                src={project.images[0].url}
                                                alt={project.title}
                                                className="w-full h-full object-cover filter grayscale-[30%] contrast-125 group-hover:grayscale-0 transition-all"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-brand-200">
                                                <ImageIcon className="w-12 h-12" />
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 z-20 bg-brand-950 text-brand-accent text-[10px] font-black px-3 py-1 uppercase tracking-widest">
                                            {project.category}
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col bg-white">
                                        <h3 className="text-xl font-black text-brand-950 mb-3 uppercase tracking-tight leading-tight group-hover:text-brand-accent transition-colors">{project.title}</h3>
                                        <p className="text-brand-600 font-medium text-sm mt-auto line-clamp-2">{project.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.layout>
                )}

                {/* Lightbox Modal / Slider */}
                <AnimatePresence>
                    {selectedProject && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-brand-950/90 backdrop-blur-sm"
                                onClick={() => setSelectedProject(null)}
                            />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-brand-50 max-w-6xl w-full border-8 border-brand-950 shadow-solid relative z-10 flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
                            >
                                <button
                                    onClick={() => setSelectedProject(null)}
                                    className="absolute top-0 right-0 bg-brand-accent text-brand-950 hover:bg-white hover:text-black p-3 z-30 transition-colors border-l-4 border-b-4 border-brand-950"
                                >
                                    <X className="w-8 h-8" />
                                </button>

                                {/* Image Section with Simple Horizontal Scroll */}
                                <div className="md:w-3/5 relative border-b-4 md:border-b-0 md:border-r-4 border-brand-950 bg-black flex overflow-x-auto snap-x snap-mandatory">
                                    {selectedProject.images && selectedProject.images.length > 0 ? (
                                        selectedProject.images.map((img, idx) => (
                                            <div key={idx} className="min-w-full h-[40vh] md:h-full snap-center flex items-center justify-center">
                                                <img 
                                                    src={img.url} 
                                                    alt={`Work View ${idx + 1}`} 
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-brand-400 font-black uppercase">No Media Assets</div>
                                    )}
                                    
                                    {selectedProject.images?.length > 1 && (
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-brand-950 text-brand-accent px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em] border-2 border-brand-accent z-20 pointer-events-none">
                                            Swipe for Gallery
                                        </div>
                                    )}
                                </div>

                                <div className="md:w-2/5 p-8 md:p-12 bg-white flex flex-col relative overflow-y-auto">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="uppercase tracking-widest text-[10px] font-black text-brand-500 border-b-2 border-brand-accent pb-1 inline-block w-fit">
                                            {selectedProject.category}
                                        </span>
                                        {selectedProject.location && (
                                            <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest italic flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {selectedProject.location}
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="text-3xl md:text-5xl font-black text-brand-950 mb-6 uppercase tracking-tighter leading-none mt-2">{selectedProject.title}</h2>

                                    <div className="w-16 h-2 bg-brand-accent mb-8 shadow-solid"></div>

                                    <div className="text-brand-700 text-sm md:text-lg mb-8 font-medium leading-relaxed flex-1 space-y-4">
                                        <p>{selectedProject.description}</p>
                                        
                                        {selectedProject.projectDate && (
                                            <div className="pt-6 border-t-2 border-brand-100 mt-6">
                                                <p className="text-[10px] font-black uppercase text-brand-400 tracking-widest mb-1">Commission Date</p>
                                                <p className="text-brand-950 font-black">{new Date(selectedProject.projectDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto">
                                        <Link to={`/quote?service=${selectedProject.category}&project=${selectedProject._id}`} className="w-full block bg-brand-950 hover:bg-brand-accent hover:text-brand-950 text-white text-center font-bold uppercase tracking-widest py-5 px-8 transition-all shadow-solid hover:shadow-none translate-y-0 active:translate-y-1">
                                            Inquire About Similar Job
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

export default Projects;
