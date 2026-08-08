import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { 
    Zap, Hammer, Construction, Drill, 
    ArrowRight, CheckSquare, Target, Settings,
    AlertTriangle, RefreshCcw
} from 'lucide-react';

const servicesData = [
    {
        id: 'welding',
        title: 'Heavy Welding',
        desc: 'Industrial-grade structural welding. Certified professionals ensuring maximum joint integrity for high-pressure pipelines and heavy machinery support structures.',
        image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=1200',
        process: ['Surface Grinding', 'Joint Alignment', 'TIG/MIG Welding', 'X-Ray Inspection'],
        icon: <Zap className="w-8 h-8" />
    },
    {
        id: 'roofing',
        title: 'Industrial Roofing',
        desc: 'Heavy-duty metal roofing systems built to withstand extreme mechanical stress and environmental exposure. We install heavy gauge panels for massive industrial complexes.',
        image: 'https://images.unsplash.com/photo-1635424710928-0544e8512eae?auto=format&fit=crop&q=80&w=1200',
        process: ['Structural Audit', 'Gauge Selection', 'Panel Fastening', 'Seal Check'],
        icon: <Hammer className="w-8 h-8" />
    },
    {
        id: 'truss',
        title: 'Truss Systems',
        desc: 'Massive steel truss design, fabrication, and erection. Built for aircraft hangars, manufacturing plants, and large span facilities requiring immense load-bearing capacity.',
        image: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&q=80&w=1200',
        process: ['Load Engineering', 'I-Beam Fab', 'Crane Positioning', 'Torque Bolting'],
        icon: <Construction className="w-8 h-8" />
    },
    {
        id: 'fabrication',
        title: 'Steel Fabrication & Staircases',
        desc: 'Precision structural steel fabrication including heavy industrial staircases, fire escapes, and custom walkways. Built to rigorous safety and structural codes.',
        image: 'https://images.pexels.com/photos/1571470/pexels-photo-1571470.jpeg?auto=compress&cs=tinysrgb&w=1200',
        process: ['CAD Modeling', 'Plasma Cut', 'Steel Stair Step Fab', 'Load Verification'],
        icon: <Drill className="w-8 h-8" />
    },
];

const Services = () => {
    const [searchParams] = useSearchParams();
    const highlightedService = searchParams.get('type');
    const [error, setError] = useState(false);

    // Image error handler to show fallback if external links fail
    const handleImgError = (e) => {
        e.target.onerror = null;
        e.target.src = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200"; // Fallback: Industrial plant
        setError(true);
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-800 min-h-screen pb-24 font-sans text-slate-800 dark:text-slate-200 ">

            {/* CINEMATIC HEADER */}
            <div className="relative pt-32 pb-24 px-4 overflow-hidden border-b-[1px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 ">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.01]"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-300/10 blur-[120px] rounded-full"></div>

                <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 text-blue-600 font-black text-[10px] uppercase tracking-[0.4em] mb-6"
                    >
                        <Settings className="w-4 h-4" /> Capabilities Portfolio
                    </motion.div>
                    <h1 className="text-6xl md:text-8xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-8 text-center italic font-poppins">
                        CORE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500">OPERATIONS.</span>
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-bold text-center uppercase tracking-tight">
                        Unyielding structural engineering solutions tailored for heavy industry and commercial applications.
                    </p>
                    
                    {error && (
                        <div className="mt-8 bg-red-600/10 border border-red-600/20 px-8 py-4 rounded-full flex items-center gap-4 text-red-500 font-black text-[10px] uppercase tracking-widest">
                            <AlertTriangle className="w-4 h-4" /> Connectivity warning: Using emergency media fallbacks.
                            <button onClick={()=>window.location.reload()} className="flex items-center gap-2 bg-red-600 text-white px-4 py-1 rounded-full"><RefreshCcw className="w-3 h-3" /> Retry Sync</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 space-y-24">
                {servicesData.map((service, index) => {
                    const isHighlighted = highlightedService === service.id;
                    return (
                        <motion.div
                            key={service.id}
                            id={service.id}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                            className={`flex flex-col lg:flex-row bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 /60 rounded-[3rem] overflow-hidden shadow-xl shadow-slate-100/50 group transition-all duration-500 ${isHighlighted ? 'border-blue-500 bg-blue-50/10 shadow-[0_0_50px_rgba(37,99,235,0.06)]' : ''}`}
                        >
                            <div className="w-full lg:w-1/2 h-80 lg:h-auto relative overflow-hidden bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center">
                                {/* LOADER FOR EACH IMAGE */}
                                <div className="absolute animate-pulse text-blue-500/20 font-black text-[10px] uppercase tracking-[0.5em]">Establishing Connection...</div>
                                <img 
                                    src={service.image} 
                                    alt={service.title} 
                                    onError={handleImgError}
                                    className="absolute inset-0 w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000 z-10" 
                                />
                                <div className="absolute inset-x-0 inset-y-0 bg-slate-900/10 transition-opacity group-hover:opacity-0 z-20" />
                                <div className="absolute bottom-10 left-10 flex items-center gap-4 z-30">
                                    <div className="bg-blue-600 text-white font-black text-3xl px-6 py-2 rounded-xl italic shadow-2xl">
                                        0{index + 1}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full lg:w-1/2 p-10 sm:p-16 lg:p-20 flex flex-col justify-center relative bg-white dark:bg-slate-900 ">
                                <div className="absolute top-0 right-0 p-10 text-slate-100 pointer-events-none">
                                    <Target className="w-40 h-40" />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-1 bg-blue-600"></div>
                                        <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em]">{service.id} unit</span>
                                    </div>

                                    <h2 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-8 italic font-poppins">{service.title}</h2>

                                    <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-10 max-w-xl font-medium">
                                        {service.desc}
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-16">
                                        <div className="space-y-4">
                                            <h3 className="text-[9px] font-black tracking-[0.3em] uppercase text-slate-400 mb-4 flex items-center gap-2">
                                                <CheckSquare className="w-3 h-3 text-blue-600" /> Control Sequence
                                            </h3>
                                            <div className="space-y-3">
                                                {service.process.map((step, i) => (
                                                    <div key={i} className="flex items-center text-slate-400 font-black uppercase tracking-widest text-[8px] group-hover:text-slate-800 dark:text-slate-200 transition-colors">
                                                        <span className="text-blue-600 mr-3 font-black">X</span>
                                                        {step}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="hidden sm:flex flex-col items-center justify-center border-l border-slate-100 dark:border-slate-800 pl-8">
                                            <div className="text-blue-600/10 group-hover:text-blue-600/30 transition-colors">
                                                {React.cloneElement(service.icon, { size: 64 })}
                                            </div>
                                        </div>
                                    </div>

                                    <Link 
                                        to={`/quote?service=${service.id}`} 
                                        className="group/btn relative inline-flex items-center gap-4 bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-slate-900 transition-all overflow-hidden active:scale-95 shadow-xl"
                                    >
                                        <div className="absolute inset-0 bg-white dark:bg-slate-900 /20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                                        Request Deployment Specs
                                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Technical Detail Strip */}
            <div className="bg-blue-600 py-12 mt-24 overflow-hidden whitespace-nowrap border-y border-blue-700">
                <div className="flex animate-scroll gap-20">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center gap-6 text-white font-black uppercase tracking-[0.5em] text-[10px]">
                            <Settings className="w-4 h-4" /> REINFORCED QUALITY <Target className="w-4 h-4" /> ISO CERTIFIED <Zap className="w-4 h-4" /> HEAVY DUTY
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-scroll {
                    animation: scroll 30s linear infinite;
                    display: inline-flex;
                }
            `}</style>
        </div>
    );
};

export default Services;
