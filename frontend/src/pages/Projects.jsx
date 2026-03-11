import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const projectsData = [
    { id: 1, title: 'Mega Factory Framework', category: 'fabrication', image: 'https://images.unsplash.com/photo-1541888081628-910c22faaa95?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', desc: '10,000 sq ft heavy structural steel framework for automotive plant.' },
    { id: 2, title: 'Warehouse Bulk Roofing', category: 'roofing', image: 'https://images.unsplash.com/photo-1504307651254-35680f356f12?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', desc: 'Commercial heavy-gauge standing seam metal roofing installation.' },
    { id: 3, title: 'Pressure Pipeline Joints', category: 'welding', image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', desc: 'TIG joint welding for high-capacity industrial chemical transport lines.' },
    { id: 4, title: 'Stadium Support Truss', category: 'truss', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', desc: '150ft clear span arc truss erection using dual heavy lift cranes.' },
    { id: 5, title: 'Grain Silo Erection', category: 'fabrication', image: 'https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', desc: 'Fabrication and on-site assembly of 4x commercial grain silos.' },
    { id: 6, title: 'Excavator Arm Repair', category: 'welding', image: 'https://images.unsplash.com/photo-1542742403-10eb0b1154c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80', desc: 'Emergency structural crack repair on 50-ton mining excavator.' },
];

const categories = [
    { id: 'all', name: 'All Operations' },
    { id: 'welding', name: 'Welding' },
    { id: 'roofing', name: 'Roofing' },
    { id: 'truss', name: 'Trusses' },
    { id: 'fabrication', name: 'Fabrication' },
];

const Projects = () => {
    const [filter, setFilter] = useState('all');
    const [selectedProject, setSelectedProject] = useState(null);

    const filteredProjects = filter === 'all'
        ? projectsData
        : projectsData.filter(p => p.category === filter);

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
                <motion.layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                    <AnimatePresence>
                        {filteredProjects.map(project => (
                            <motion.div
                                key={project.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white border-4 border-brand-950 shadow-[6px_6px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all cursor-pointer group flex flex-col"
                                onClick={() => setSelectedProject(project)}
                            >
                                <div className="relative h-64 overflow-hidden border-b-4 border-brand-950">
                                    {/* Heavy overlay on hover */}
                                    <div className="absolute inset-0 bg-brand-accent mix-blend-multiply opacity-0 group-hover:opacity-80 transition-opacity z-10 flex items-center justify-center">
                                        <span className="text-brand-950 font-black text-2xl uppercase tracking-tighter opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 border-4 border-brand-950 px-4 py-2 bg-white">View Details</span>
                                    </div>
                                    <img
                                        src={project.image}
                                        alt={project.title}
                                        className="w-full h-full object-cover filter grayscale-[30%] contrast-125 group-hover:grayscale-0 transition-all"
                                    />
                                    <div className="absolute top-4 right-4 z-20 bg-brand-950 text-brand-accent text-xs font-black px-3 py-1 uppercase tracking-widest">
                                        {project.category}
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col bg-white">
                                    <h3 className="text-xl font-black text-brand-950 mb-3 uppercase tracking-tight leading-tight group-hover:text-brand-accent transition-colors">{project.title}</h3>
                                    <p className="text-brand-600 font-medium text-sm mt-auto line-clamp-2">{project.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.layout>

                {/* Lightbox Modal */}
                <AnimatePresence>
                    {selectedProject && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-brand-950/90"
                                onClick={() => setSelectedProject(null)}
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 30 }}
                                className="bg-brand-50 max-w-5xl w-full border-8 border-brand-950 shadow-solid relative z-10 flex flex-col md:flex-row overflow-hidden"
                            >
                                <button
                                    onClick={() => setSelectedProject(null)}
                                    className="absolute top-0 right-0 bg-brand-accent text-brand-950 hover:bg-white hover:text-black p-3 z-30 transition-colors border-l-4 border-b-4 border-brand-950"
                                    title="Close"
                                >
                                    <svg className="w-8 h-8 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>

                                <div className="md:w-3/5 h-[40vh] md:h-[60vh] relative border-b-4 md:border-b-0 md:border-r-4 border-brand-950">
                                    <img src={selectedProject.image} alt={selectedProject.title} className="w-full h-full object-cover filter contrast-125" />
                                </div>

                                <div className="md:w-2/5 p-8 md:p-12 bg-white flex flex-col relative">
                                    <div className="uppercase tracking-widest text-[10px] font-black text-brand-500 mb-2 border-b-2 border-brand-200 pb-2 inline-block w-fit">{selectedProject.category}</div>
                                    <h2 className="text-3xl md:text-5xl font-black text-brand-950 mb-6 uppercase tracking-tighter leading-none mt-2">{selectedProject.title}</h2>

                                    <div className="w-16 h-2 bg-brand-accent mb-8"></div>

                                    <p className="text-brand-700 text-lg mb-8 font-medium leading-relaxed flex-1">
                                        {selectedProject.desc}
                                    </p>

                                    <div className="mt-auto">
                                        <Link to={`/quote?service=${selectedProject.category}`} className="w-full block bg-brand-950 hover:bg-brand-800 text-white text-center font-bold uppercase tracking-widest py-4 px-8 border-4 border-transparent hover:border-brand-accent transition-colors">
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
