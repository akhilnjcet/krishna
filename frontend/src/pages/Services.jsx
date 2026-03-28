import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { 
    Zap, Hammer, Construction, Drill, 
    ArrowRight, CheckSquare, Target, Settings
} from 'lucide-react';

const servicesData = [
    {
        id: 'welding',
        title: 'Heavy Welding',
        desc: 'Industrial-grade structural welding. Certified professionals ensuring maximum joint integrity for high-pressure pipelines and heavy machinery support structures.',
        image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1200',
        process: ['Surface Grinding', 'Joint Alignment', 'TIG/MIG Welding', 'X-Ray Inspection'],
        icon: <Zap className="w-8 h-8" />
    },
    {
        id: 'roofing',
        title: 'Industrial Roofing',
        desc: 'Heavy-duty metal roofing systems built to withstand extreme mechanical stress and environmental exposure. We install heavy gauge panels for massive industrial complexes.',
        image: 'https://images.unsplash.com/photo-1635424710928-0544e8512eae?q=80&w=1200',
        process: ['Structural Audit', 'Gauge Selection', 'Panel Fastening', 'Seal Check'],
        icon: <Hammer className="w-8 h-8" />
    },
    {
        id: 'truss',
        title: 'Truss Systems',
        desc: 'Massive steel truss design, fabrication, and erection. Built for aircraft hangars, manufacturing plants, and large span facilities requiring immense load-bearing capacity.',
        image: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?q=80&w=1200',
        process: ['Load Engineering', 'I-Beam Fab', 'Crane Positioning', 'Torque Bolting'],
        icon: <Construction className="w-8 h-8" />
    },
    {
        id: 'fabrication',
        title: 'Steel Fabrication',
        desc: 'Complete structural steel fabrication from raw material to finished assembly. Precision plasma cutting, heavy plate bending, and custom bracketry.',
        image: 'https://images.unsplash.com/photo-1565615833231-e8c91a38a012?q=80&w=1200',
        process: ['CAD Modeling', 'Plasma Cut', 'Press Brake Forming', 'Quality Verification'],
        icon: <Drill className="w-8 h-8" />
    },
];

const Services = () => {
    const [searchParams] = useSearchParams();
    const highlightedService = searchParams.get('type');

    return (
        <div className="bg-[#050505] min-h-screen pb-24 font-sans text-white">

            {/* CINEMATIC HEADER */}
            <div className="relative pt-32 pb-24 px-4 overflow-hidden border-b-[1px] border-white/5">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-accent/5 blur-[120px] rounded-full"></div>

                <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 text-brand-accent font-black text-[10px] uppercase tracking-[0.4em] mb-6"
                    >
                        <Settings className="w-4 h-4" /> Capabilities Portfolio
                    </motion.div>
                    <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-8 text-center italic">
                        CORE <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-white">OPERATIONS.</span>
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto font-bold text-center uppercase tracking-tight">
                        Unyielding structural engineering solutions tailored for heavy industry and commercial applications.
                    </p>
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
                            className={`flex flex-col lg:flex-row bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-3xl group transition-all duration-500 ${isHighlighted ? 'border-brand-accent bg-brand-accent/[0.03] shadow-[0_0_50px_rgba(255,180,0,0.1)]' : ''}`}
                        >
                            <div className="w-full lg:w-1/2 h-80 lg:h-auto relative overflow-hidden bg-gray-900/50">
                                <img 
                                    src={service.image} 
                                    alt={service.title} 
                                    className="absolute inset-0 w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" 
                                />
                                <div className="absolute inset-x-0 inset-y-0 bg-black/10 transition-opacity group-hover:opacity-0" />
                                <div className="absolute bottom-10 left-10 flex items-center gap-4">
                                    <div className="bg-brand-accent text-black font-black text-3xl px-6 py-2 rounded-xl italic shadow-2xl">
                                        0{index + 1}
                                    </div>
                                </div>
                            </div>

                            <div className="w-full lg:w-1/2 p-10 sm:p-16 lg:p-20 flex flex-col justify-center relative bg-[#0a0a0c]">
                                <div className="absolute top-0 right-0 p-10 text-white/[0.02] pointer-events-none">
                                    <Target className="w-40 h-40" />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-1 bg-brand-accent"></div>
                                        <span className="text-brand-accent font-black text-[10px] uppercase tracking-[0.4em]">{service.id} unit</span>
                                    </div>

                                    <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter mb-8 italic">{service.title}</h2>

                                    <p className="text-gray-400 text-lg mb-12 font-bold leading-relaxed max-w-xl uppercase tracking-tight">
                                        {service.desc}
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-16">
                                        <div className="space-y-4">
                                            <h3 className="text-[9px] font-black tracking-[0.3em] uppercase text-gray-500 mb-4 flex items-center gap-2">
                                                <CheckSquare className="w-3 h-3 text-brand-accent" /> Control Sequence
                                            </h3>
                                            <div className="space-y-3">
                                                {service.process.map((step, i) => (
                                                    <div key={i} className="flex items-center text-white/40 font-black uppercase tracking-widest text-[8px] group-hover:text-white transition-colors">
                                                        <span className="text-brand-accent mr-3 font-black">X</span>
                                                        {step}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="hidden sm:flex flex-col items-center justify-center border-l border-white/5 pl-8">
                                            <div className="text-brand-accent/20 group-hover:text-brand-accent transition-colors">
                                                {React.cloneElement(service.icon, { size: 64 })}
                                            </div>
                                        </div>
                                    </div>

                                    <Link 
                                        to={`/quote?service=${service.id}`} 
                                        className="group/btn relative inline-flex items-center gap-4 bg-brand-accent text-black px-10 py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white transition-all overflow-hidden active:scale-95 shadow-xl"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
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
            <div className="bg-brand-accent py-12 mt-24 overflow-hidden whitespace-nowrap border-y border-black">
                <div className="flex animate-scroll gap-20">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center gap-6 text-brand-950 font-black uppercase tracking-[0.5em] text-[10px]">
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
