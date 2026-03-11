import React from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';

const servicesData = [
    {
        id: 'welding',
        title: 'Heavy Welding',
        desc: 'Industrial-grade structural welding. Certified professionals ensuring maximum joint integrity for high-pressure pipelines and heavy machinery support structures.',
        image: 'https://images.unsplash.com/photo-1542742403-10eb0b1154c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
        process: ['Surface Grinding', 'Joint Alignment', 'TIG/MIG Welding', 'X-Ray Inspection']
    },
    {
        id: 'roofing',
        title: 'Industrial Roofing',
        desc: 'Heavy-duty metal roofing systems built to withstand extreme mechanical stress and environmental exposure. We install heavy gauge panels for massive industrial complexes.',
        image: 'https://images.unsplash.com/photo-1518458028785-8fbcd101ebb9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
        process: ['Structural Audit', 'Gauge Selection', 'Panel Fastening', 'Seal Check']
    },
    {
        id: 'truss',
        title: 'Truss Systems',
        desc: 'Massive steel truss design, fabrication, and erection. Built for aircraft hangars, manufacturing plants, and large span facilities requiring immense load-bearing capacity.',
        image: 'https://images.unsplash.com/photo-1508450859948-4e04fabaa4ea?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
        process: ['Load Engineering', 'I-Beam Fab', 'Crane Positioning', 'Torque Bolting']
    },
    {
        id: 'fabrication',
        title: 'Steel Fabrication',
        desc: 'Complete structural steel fabrication from raw material to finished assembly. Precision plasma cutting, heavy plate bending, and custom bracketry.',
        image: 'https://images.unsplash.com/photo-1533450718592-29d45635f0a9?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
        process: ['CAD Modeling', 'Plasma Cut', 'Press Brake Forming', 'Quality Verification']
    },
];

const Services = () => {
    const [searchParams] = useSearchParams();
    const highlightedService = searchParams.get('type');

    return (
        <div className="bg-brand-50 min-h-screen pb-24 font-sans">

            {/* Heavy Header */}
            <div className="relative bg-brand-950 pt-24 pb-20 px-4 border-b-8 border-brand-accent overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>

                <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center">
                    <div className="bg-brand-accent text-brand-950 uppercase font-black tracking-widest text-[10px] sm:text-xs px-4 py-1.5 inline-block mb-6 transform -skew-x-12">
                        Engineering Capabilities
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-6 text-center">
                        CORE <span className="text-brand-accent">SERVICES</span>
                    </h1>
                    <p className="text-lg text-brand-400 max-w-2xl mx-auto font-medium text-center">
                        Unyielding structural engineering solutions tailored for heavy industry and commercial applications.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-16">
                {servicesData.map((service, index) => {
                    const isHighlighted = highlightedService === service.id;
                    return (
                        <motion.div
                            key={service.id}
                            id={service.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.5 }}
                            className={`flex flex-col lg:flex-row bg-white border-4 overflow-hidden ${isHighlighted ? 'border-brand-accent shadow-[8px_8px_0_0_rgba(255,182,18,1)]' : 'border-brand-950 shadow-solid'}`}
                        >
                            <div className="w-full lg:w-5/12 h-64 sm:h-80 lg:h-auto relative border-b-4 lg:border-b-0 lg:border-r-4 border-brand-950">
                                <img src={service.image} alt={service.title} className="absolute inset-0 w-full h-full object-cover filter grayscale-[40%] contrast-[1.1]" />
                                <div className="absolute inset-0 bg-brand-950/40 mix-blend-multiply"></div>
                                <div className="absolute bottom-6 left-6 bg-brand-accent text-brand-950 font-black uppercase tracking-tight text-3xl px-3 py-1 transform -skew-x-6">
                                    {`0${index + 1}`}
                                </div>
                            </div>

                            {/* Content Side */}
                            <div className="w-full lg:w-7/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,#FFB612_4px,#FFB612_8px)] opacity-50 z-0"></div>

                                <div className="relative z-10">
                                    <h2 className="text-4xl sm:text-5xl font-black text-brand-950 uppercase tracking-tighter mb-4">{service.title}</h2>
                                    <div className="w-24 border-brand-accent mb-6 border-b-8"></div>

                                    <p className="text-brand-600 text-lg mb-10 font-medium leading-relaxed max-w-xl">
                                        {service.desc}
                                    </p>

                                    <div className="bg-brand-50 border-l-8 border-brand-950 p-6 mb-10">
                                        <h3 className="text-sm font-black tracking-widest uppercase text-brand-950 mb-4">Operations Sequence</h3>
                                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                                            {service.process.map((step, i) => (
                                                <li key={i} className="flex items-center text-brand-800 font-bold uppercase tracking-wide text-xs">
                                                    <span className="text-brand-accent mr-2">›</span>
                                                    {step}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Link to={`/quote?service=${service.id}`} className="btn-primary inline-flex items-center shadow-solid hover:shadow-[2px_2px_0_0_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all">
                                        Request Spec & Quote
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default Services;
