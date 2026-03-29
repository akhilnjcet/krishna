import React, { useState, useEffect, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
    ArrowRight, Zap, Target, Shield, 
    Box, Construction, Gauge, Settings, 
    Hammer, Drill, HardHat, Radio
} from 'lucide-react';
import api from '../services/api';
import FloatingContact from '../components/FloatingContact';

// REUSABLE WELDING SPARK EFFECT
const ButtonSparks = ({ active }) => {
    // Generate sparks only on mount using lazy initial state (fixes cascading render)
    const [sparks] = useState(() => {
        return [...Array(8)].map((_, i) => ({
            id: i,
            angle: (Math.random() * 360) * (Math.PI / 180),
            distance: Math.random() * 60 + 40,
            duration: Math.random() * 0.4 + 0.2
        }));
    });

    if (sparks.length === 0) return null;

    return (
        <AnimatePresence>
            {active && (
                <div className="absolute inset-0 pointer-events-none z-20">
                    {sparks.map((spark) => (
                        <motion.div
                            key={spark.id}
                            className="absolute left-1/2 top-1/2 w-1 h-1 bg-brand-accent rounded-full"
                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                            animate={{ 
                                x: Math.cos(spark.angle) * spark.distance,
                                y: Math.sin(spark.angle) * spark.distance,
                                opacity: 0,
                                scale: 0
                            }}
                            transition={{ duration: spark.duration, ease: "easeOut" }}
                            style={{ boxShadow: '0 0 8px #ffb400' }}
                        />
                    ))}
                </div>
            )}
        </AnimatePresence>
    );
};

const SparkButton = ({ to, children, primary = true }) => {
    const [isSparking, setIsSparking] = useState(false);
    const handleClick = () => {
        setIsSparking(true);
        setTimeout(() => setIsSparking(false), 500);
    };

    return (
        <Link 
            to={to}
            onClick={handleClick}
            className={`relative group px-10 py-5 text-[11px] font-black uppercase tracking-[0.3em] rounded-xl transition-all active:scale-95 flex items-center justify-center gap-4 overflow-hidden shadow-2xl ${
                primary 
                ? 'bg-brand-accent text-brand-950 hover:bg-white' 
                : 'bg-white/5 text-white border border-white/10 hover:border-brand-accent/50 group'
            }`}
        >
            <ButtonSparks active={isSparking} />
            <span className="relative z-10">{children}</span>
            <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-2 ${primary ? 'text-brand-950' : 'text-brand-accent'}`} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        </Link>
    );
};

// BACKGROUND VIDEO & PARALLAX INDUSTRIAL EQUIPMENT
const HeavyBackground = () => {
    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {/* BACKGROUND CINEMATIC VIDEO */}
            <div className="absolute inset-0 z-0 scale-110">
                <video 
                    autoPlay 
                    muted 
                    loop 
                    playsInline
                    className="w-full h-full object-cover filter brightness-[0.3] contrast-[1.2] grayscale-[40%]"
                >
                    <source src="https://cdn.pixabay.com/video/2019/04/16/22881-331215442_large.mp4" type="video/mp4" />
                    {/* Fallback for welding/industrial construction loops */}
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]"></div>
                <div className="absolute inset-0 bg-black/60"></div>
            </div>

            {/* FLOATING SILHOUETTES */}
            <motion.div 
                animate={{ rotate: [-1, 1, -1], y: [-5, 5, -5] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-20 right-[-10%] opacity-[0.05] text-white"
            >
                <Construction className="w-[800px] h-[800px] -scale-x-100" />
            </motion.div>

            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-[-10%] left-[-5%] opacity-[0.03]"
            >
                <Settings className="w-[400px] h-[400px]" />
            </motion.div>

            {/* BLUEPRINT GRID OVERLAY */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay"></div>
        </div>
    );
};

const Home = () => {
    const defaultStats = useMemo(() => [
        { label: 'Projects Completed', value: '500+', icon: <Target className="w-5 h-5" />, key: 'stat_projects' },
        { label: 'Years Experience', value: '25+', icon: <Settings className="w-5 h-5" />, key: 'stat_years' },
        { label: 'Steel Fabricated', value: '12K Tons', icon: <Box className="w-5 h-5" />, key: 'stat_tons' },
        { label: 'Safety Record', value: '100%', icon: <Shield className="w-5 h-5" />, key: 'stat_safety' },
    ], []);

    const [liveStats, setLiveStats] = useState(defaultStats);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/settings/public');
                if (res.data && res.data.length > 0) {
                    const settingsMap = {};
                    res.data.forEach(s => settingsMap[s.key] = s.value);
                    setLiveStats(prev => prev.map(stat => ({
                        ...stat,
                        value: settingsMap[stat.key] || stat.value
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch live stats", err);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="bg-[#050505] min-h-screen text-white font-sans selection:bg-brand-accent selection:text-black translate-x-0">
            {/* Direct Comms Relay */}
            <FloatingContact />
            
            {/* CINEMATIC HERO SECTION */}
            <section className="relative min-h-screen flex items-center pt-24 pb-32 px-4 overflow-hidden border-b-[12px] border-brand-accent">
                <HeavyBackground />
                
                <div className="max-w-7xl mx-auto w-full relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

                        <div className="lg:col-span-12 xl:col-span-8 text-center xl:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1.2, ease: "circOut" }}
                            >
                                <div className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-3xl border border-white/10 px-8 py-3 rounded-full mb-12 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                                    <span className="w-3 h-3 rounded-full bg-brand-accent animate-pulse shadow-[0_0_10px_#ffb400]"></span>
                                    <span className="text-[11px] font-black uppercase tracking-[0.5em] text-gray-400">Pioneer Structural Lab // REINFORCED 5.0</span>
                                </div>

                                <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter leading-[0.8] mb-14 italic text-white drop-shadow-2xl">
                                    ENGINEERED <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-white to-brand-accent bg-[length:200%_auto] animate-shimmer">
                                        DOMINANCE.
                                    </span>
                                </h1>
                                
                                <p className="text-xl md:text-3xl text-gray-400 font-bold uppercase tracking-tight max-w-3xl mb-16 leading-[1.3] mx-auto xl:mx-0">
                                    Forging the future of heavy industrial infrastructure with relentless precision and structural integrity.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-8 justify-center xl:justify-start">
                                    <SparkButton to="/quote">Begin Estimation</SparkButton>
                                    <SparkButton to="/projects" primary={false}>Explore Archives</SparkButton>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM ANCHOR */}
                <div className="absolute bottom-16 right-16 hidden 2xl:block">
                   <div className="flex items-center gap-4 text-brand-accent font-black text-[10px] uppercase tracking-[0.6em] rotate-90 origin-right translate-y-16">
                      <Radio className="w-5 h-5 animate-pulse" /> BROADCASTING LIVE UNIT 01
                   </div>
                </div>
            </section>

            {/* DYNAMIC CAPABILITIES MATRIX */}
            <section className="py-40 relative px-4 overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-32">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.6em] text-brand-accent mb-6 block italic opacity-60">Operations Unit</span>
                            <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic text-white leading-none">CORE SPECIALTIES</h2>
                        </div>
                        <Link to="/services" className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all active:scale-95 shadow-2xl">Matrix Capabilities</Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                        {[
                            { id: 'welding', title: 'Heavy Welding', icon: <Zap />, color: 'from-brand-accent/20 to-transparent' },
                            { id: 'roofing', title: 'Metal Roofing', icon: <Hammer />, color: 'from-blue-500/10 to-transparent' },
                            { id: 'truss', title: 'Truss Systems', icon: <Construction />, color: 'from-emerald-500/10 to-transparent' },
                            { id: 'fabrication', title: 'Steel Fab', icon: <Drill />, color: 'from-orange-500/10 to-transparent' },
                        ].map((service, idx) => (
                            <motion.div key={service.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} viewport={{ once: true }}>
                                <Link to={`/services?type=${service.id}`} className="block h-full group">
                                    <div className="h-full bg-white/[0.02] border border-white/5 rounded-[4rem] p-12 transition-all group-hover:bg-brand-accent group-hover:border-brand-accent group-hover:-translate-y-6 shadow-2xl">
                                        <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-12 bg-gradient-to-br ${service.color} group-hover:bg-brand-950 transition-all shadow-xl shadow-black/40`}>
                                            <div className="text-brand-accent group-hover:scale-125 transition-transform">{React.cloneElement(service.icon, { size: 36 })}</div>
                                        </div>
                                        <h3 className="text-3xl font-black uppercase tracking-tighter text-white group-hover:text-brand-950 mb-6 italic transition-colors">
                                            {service.title}
                                        </h3>
                                        <p className="text-[11px] font-black text-gray-600 group-hover:text-brand-950 uppercase tracking-widest leading-loose font-bold">
                                            Critical path execution for high-pressure heavy environments.
                                        </p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PERFORMANCE STRIP */}
            <section className="bg-brand-accent py-32 relative overflow-hidden border-y-[2px] border-black">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-20 lg:gap-0">
                        {liveStats.map((stat, i) => (
                            <div key={i} className={`flex flex-col items-center justify-center text-brand-950 px-10 ${i !== liveStats.length - 1 ? 'lg:border-r-2 lg:border-brand-950/20' : ''}`}>
                                <div className="mb-6 opacity-40">{stat.icon}</div>
                                <div className="text-6xl md:text-8xl font-black tracking-tighter italic leading-none mb-4">
                                    {stat.value}
                                </div>
                                <div className="text-[11px] font-black uppercase tracking-[0.5em] text-center opacity-70">
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FINAL DEPLOYMENT CTA */}
            <section className="py-60 relative px-4 text-center overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-accent/10 via-transparent to-transparent opacity-50"></div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <motion.div 
                       animate={{ y: [0, -10, 0] }}
                       transition={{ duration: 4, repeat: Infinity }}
                    >
                        <HardHat className="w-24 h-24 text-brand-accent mx-auto mb-16 opacity-40 drop-shadow-[0_0_20px_#ffb400]" />
                    </motion.div>
                    
                    <h2 className="text-7xl md:text-9xl font-black uppercase tracking-tighter text-white mb-12 leading-[0.8] italic">
                        REINFORCE <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-white">EVERYTHING.</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-gray-500 font-bold uppercase tracking-widest mb-24 max-w-2xl mx-auto leading-relaxed italic opacity-80">
                        Implement precision-guided engineering into your next heavy-duty deployment.
                    </p>
                    <div className="inline-block relative">
                        <SparkButton to="/quote">Initiate Project Protocol</SparkButton>
                    </div>
                </div>
            </section>

            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-shimmer {
                    animation: shimmer 15s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default Home;
