import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, Target, Shield, Award, Users, 
    Construction, Settings, Radio, CheckCircle2 
} from 'lucide-react';
import api from '../services/api';

const About = () => {
    const [aboutData, setAboutData] = useState({
        about_title: 'ENGINEERING EXCELLENCE SINCE 1999',
        about_content: 'Krishna Engineering Works has been at the forefront of heavy structural fabrication and industrial roofing for over two decades. Our mission is to provide unyielding integrity in every weld and truss we complete.',
        about_image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1200'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAbout = async () => {
            try {
                const res = await api.get('/settings/public');
                if (res.data) {
                    const settingsMap = {};
                    res.data.forEach(s => settingsMap[s.key] = s.value);
                    
                    setAboutData({
                        about_title: settingsMap.about_title || aboutData.about_title,
                        about_content: settingsMap.about_content || aboutData.about_content,
                        about_image: settingsMap.about_image || aboutData.about_image
                    });
                }
            } catch (err) {
                console.error("Failed to fetch corporate bio", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAbout();
    }, [aboutData.about_title, aboutData.about_content, aboutData.about_image]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-[#050505] min-h-screen text-white font-sans selection:bg-brand-accent selection:text-black pb-32">
            
            {/* HERO SECTION */}
            <section className="relative h-[80vh] flex items-center justify-center overflow-hidden pt-20">
                <div className="absolute inset-0 z-0">
                    <img 
                        src={aboutData.about_image} 
                        alt="Corporate Hero" 
                        className="w-full h-full object-cover grayscale-[40%]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black via-black/40 to-[#050505]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1 }}
                    >
                        <div className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 px-8 py-3 rounded-full mb-10">
                            <span className="w-3 h-3 rounded-full bg-brand-accent animate-pulse"></span>
                            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-gray-400 italic">Established 1999 // REINFORCED</span>
                        </div>
                        <h1 className="text-6xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-12 italic">
                            {aboutData.about_title.split(' ').map((word, i) => (
                                <span key={i} className={i === 2 ? "text-brand-accent" : ""}>
                                    {word}{' '}
                                    {i === 1 && <br />}
                                </span>
                            ))}
                        </h1>
                    </motion.div>
                </div>
                
                {/* BLUEPRINT GRID */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
            </section>

            {/* NARRATIVE SECTION */}
            <section className="py-40 relative px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-24">
                        <div className="lg:col-span-12 xl:col-span-7">
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-accent mb-6 block italic">Corporate Manifesto</span>
                            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic mb-12 leading-[0.9]">FORGING <br /> INTEGRITY.</h2>
                            <p className="text-2xl md:text-3xl text-gray-500 font-bold uppercase tracking-tight leading-relaxed mb-16 italic">
                                {aboutData.about_content}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {[
                                    { label: 'Uncompromising Safety', desc: 'Zero tolerance protocols for heavy engineering.', icon: <Shield /> },
                                    { label: 'Precision Engineering', desc: 'Micron-level accuracy in structural fabrication.', icon: <Target /> }
                                ].map((item, i) => (
                                    <div key={i} className="space-y-4">
                                        <div className="text-brand-accent">{item.icon}</div>
                                        <h3 className="text-xl font-black uppercase tracking-widest">{item.label}</h3>
                                        <p className="text-sm font-bold text-gray-600 uppercase tracking-tighter">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-12 xl:col-span-5 relative">
                            <div className="sticky top-32 p-12 bg-white/[0.02] border border-white/5 rounded-[4rem] backdrop-blur-3xl">
                                <Radio className="w-12 h-12 text-brand-accent mb-12 animate-pulse" />
                                <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 italic">OUR DNA</h3>
                                <div className="space-y-6">
                                    {[
                                        'Heavy Structural Design',
                                        'Industrial Metal Roofing',
                                        'Precision TIG Welding',
                                        'Crane Supportive Truss',
                                        'Massive Site Execution'
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-6 text-[11px] font-black uppercase tracking-[0.4em] text-gray-500 hover:text-white transition-colors cursor-default">
                                            <CheckCircle2 className="w-4 h-4 text-brand-accent" /> {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CORE VALUES */}
            <section className="py-40 border-y border-white/5 bg-white/[0.01]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                        {[
                            { label: 'INNOVATION', icon: <Zap /> },
                            { label: 'DURABILITY', icon: <Construction /> },
                            { label: 'QUALITY', icon: <Settings /> },
                        ].map((v, i) => (
                            <div key={i} className="flex flex-col items-center text-center space-y-8">
                                <div className="w-20 h-20 bg-brand-accent text-brand-950 rounded-3xl flex items-center justify-center rotate-12 hover:rotate-0 transition-transform duration-500">
                                    {React.cloneElement(v.icon, { size: 40 })}
                                </div>
                                <h3 className="text-4xl font-black uppercase tracking-tighter italic">{v.label}</h3>
                                <div className="w-12 h-1 bg-brand-accent"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* TEAM / HERITAGE STRIP */}
            <section className="py-40 relative px-6 text-center">
                <div className="max-w-4xl mx-auto">
                    <Users className="w-24 h-24 text-white/5 mx-auto mb-16" />
                    <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-12">BEYOND <br /> <span className="text-brand-accent">STRUCTURES.</span></h2>
                    <p className="text-xl text-gray-500 font-bold uppercase tracking-widest leading-relaxed mb-20 max-w-2xl mx-auto">
                        We build more than just industrial sheds. We build the backbone of national infrastructure and manufacturing progress.
                    </p>
                    <div className="inline-grid grid-cols-3 gap-20">
                        <div className="text-center">
                            <div className="text-4xl font-black text-white italic mb-2 tracking-tighter">150+</div>
                            <div className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600">Specialists</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-black text-white italic mb-2 tracking-tighter">0.1%</div>
                            <div className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600">Error Margin</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-black text-white italic mb-2 tracking-tighter">ISO</div>
                            <div className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-600">Registered</div>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default About;
