import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const services = [
    { id: 'welding', title: 'Heavy Welding', desc: 'Industrial-grade structural welding. Certified professionals ensuring maximum joint integrity.', icon: 'W' },
    { id: 'roofing', title: 'Metal Roofing', desc: 'Durable, heavy-duty industrial roofing systems designed to withstand extreme conditions.', icon: 'R' },
    { id: 'truss', title: 'Truss Systems', desc: 'Massive steel truss fab and erection for hangars, plants, and large span facilities.', icon: 'T' },
    { id: 'fabrication', title: 'Steel Fab', custom: true, desc: 'Complete structural steel fabrication from raw material to finished assembly.', icon: 'F' },
];

const Home = () => {
    return (
        <div className="bg-white min-h-screen">
            {/* Heavy Hero Section */}
            <section className="relative bg-brand-950 text-white pt-24 pb-32 overflow-hidden border-b-8 border-brand-accent">
                <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay border-b border-brand-800">
                    {/* Industrial patterned background could go here, using stripes for now */}
                    <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#111_10px,#111_20px)]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6 }}
                            className="mt-10 lg:mt-0"
                        >
                            <div className="bg-brand-accent text-brand-950 uppercase font-black tracking-widest text-xs px-3 py-1 inline-block mb-6 transform -skew-x-12">
                                Heavy Construction & Engineering
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-none">
                                BUILT TO <br /><span className="text-brand-accent">LAST.</span>
                            </h1>
                            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-lg font-medium leading-relaxed">
                                Krishna Engineering Works provides relentless power and precision in structural steel, welding, and industrial solutions.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link to="/quote" className="btn-primary flex items-center justify-center gap-2">
                                    Request an Estimate
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </Link>
                                <Link to="/projects" className="bg-transparent hover:bg-white text-white hover:text-brand-950 border-2 border-white font-bold uppercase tracking-wider px-6 py-3 transition-colors text-center">
                                    View Projects
                                </Link>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8 }}
                            className="relative hidden md:block"
                        >
                            <div className="absolute -inset-4 bg-brand-accent transform rotate-3 -z-10 shadow-solid"></div>
                            <img
                                src="https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80"
                                alt="Industrial Metal Work"
                                className="w-full h-[500px] object-cover filter contrast-125 grayscale-[20%]"
                            />

                            {/* Heavy blocky stat card */}
                            <div className="absolute -bottom-10 -left-10 bg-brand-950 border-[6px] border-brand-accent p-6 text-white text-center transform -skew-x-6">
                                <div className="text-4xl font-black text-brand-accent transform skew-x-6">20+</div>
                                <div className="text-sm font-bold uppercase tracking-widest transform skew-x-6">Years Strong</div>
                            </div>
                        </motion.div>

                    </div>
                </div>
            </section>

            {/* Solid Capabilities Section */}
            <section className="section-pad bg-brand-50">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6 border-b-4 border-brand-950 pb-6">
                    <div className="max-w-3xl">
                        <h2 className="text-4xl md:text-5xl font-black text-brand-950 uppercase tracking-tighter">Core Capabilities</h2>
                        <p className="text-brand-600 font-medium mt-4 text-lg">Engineered for maximum durability and structural integrity.</p>
                    </div>
                    <Link to="/services" className="bg-brand-950 hover:bg-brand-900 text-white font-bold uppercase tracking-widest px-6 py-3 transition-colors shrink-0 text-sm flex items-center gap-2">
                        All Services
                        <span className="text-brand-accent">→</span>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {services.map((service, index) => (
                        <Link
                            to={`/services?type=${service.id}`}
                            key={service.id}
                            className="bg-white border-2 border-brand-200 hover:border-brand-accent p-8 transition-all group relative overflow-hidden flex flex-col h-full hover:-translate-y-2 hover:shadow-solid"
                        >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-brand-200 group-hover:bg-brand-accent transition-colors flex items-center justify-center -mr-8 -mt-8 transform rotate-45"></div>

                            <div className="text-5xl font-black text-brand-200 group-hover:text-brand-950 mb-6 transition-colors font-display">
                                {service.icon}
                            </div>

                            <h4 className="text-2xl font-black text-brand-950 uppercase tracking-tight mb-4">{service.title}</h4>
                            <p className="text-brand-600 font-medium leading-relaxed flex-1">{service.desc}</p>

                            <div className="mt-8 text-brand-accent font-black tracking-widest uppercase flex items-center gap-2 text-sm group-hover:gap-4 transition-all">
                                Learn More <span>&rarr;</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Industrial Stats Section */}
            <section className="bg-brand-accent text-brand-950 py-24 relative overflow-hidden border-y-[12px] border-brand-950">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center divide-x-0 md:divide-x-4 divide-brand-950/20">
                        <div className="px-4">
                            <div className="text-6xl md:text-7xl font-black mb-2 tracking-tighter">500<span className="text-brand-900">+</span></div>
                            <div className="text-sm md:text-base font-bold uppercase tracking-widest text-brand-800">Projects Delivered</div>
                        </div>
                        <div className="px-4">
                            <div className="text-6xl md:text-7xl font-black mb-2 tracking-tighter">50<span className="text-brand-900">+</span></div>
                            <div className="text-sm md:text-base font-bold uppercase tracking-widest text-brand-800">Expert Engineers</div>
                        </div>
                        <div className="px-4">
                            <div className="text-6xl md:text-7xl font-black mb-2 tracking-tighter">10<span className="text-brand-900">K</span></div>
                            <div className="text-sm md:text-base font-bold uppercase tracking-widest text-brand-800">Tons of Steel</div>
                        </div>
                        <div className="px-4">
                            <div className="text-6xl md:text-7xl font-black mb-2 tracking-tighter">100<span className="text-brand-900">%</span></div>
                            <div className="text-sm md:text-base font-bold uppercase tracking-widest text-brand-800">Safety Record</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-brand-950 text-white py-24 text-center">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">Ready to Build?</h2>
                    <p className="text-xl text-gray-400 mb-10 font-medium">Get a precise estimate for your next heavy industrial project.</p>
                    <Link to="/quote" className="btn-primary text-lg px-12 py-5 inline-block text-brand-950 shadow-solid">
                        Start Estimation Process
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Home;
