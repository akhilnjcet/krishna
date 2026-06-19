import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Phone, MessageCircle, MapPin, CheckCircle,
    ArrowRight, Wrench, Shield, Zap, Settings, Award, Layers, Users,
    ChevronLeft, ChevronRight, Quote, Star, Clock
} from 'lucide-react';
import FloatingContact from '../components/FloatingContact';
import api from '../services/api';
import AdBanner from '../components/AdBanner';
import { getDirectImageUrl } from '../utils/imageUtils';

/* ─── Animation Variants ─────────────────────────────────────────── */
const fadeUp = {
    hidden: { opacity: 0, y: 50 },
    visible: (i = 0) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.8, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }
    })
};

const fadeRight = {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } }
};

const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.13 } }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: (i = 0) => ({
        opacity: 1, scale: 1,
        transition: { duration: 0.7, delay: i * 0.1, type: "spring", stiffness: 120 }
    })
};

/* ─── Animated Word Reveal (Hero Title) ─────────────────────────── */
const WordReveal = ({ text, className }) => {
    const words = text.split(' ');
    return (
        <span className={className}>
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    className="inline-block mr-[0.25em]"
                    variants={fadeUp}
                    custom={i}
                >
                    {word}
                </motion.span>
            ))}
        </span>
    );
};

/* ─── Animated Counter ───────────────────────────────────────────── */
const AnimatedCounter = ({ target, suffix }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
            { threshold: 0.5 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [started]);

    useEffect(() => {
        if (!started) return;
        const cleanTarget = target.replace(/,/g, '');
        const num = parseFloat(cleanTarget);
        if (isNaN(num)) {
            setCount(0);
            return;
        }
        let start = 0;
        const duration = 1500;
        const stepsCount = duration / 16;
        const step = num / stepsCount;
        const timer = setInterval(() => {
            start += step;
            if (start >= num) { setCount(num); clearInterval(timer); }
            else setCount(start);
        }, 16);
        return () => clearInterval(timer);
    }, [started, target]);

    const cleanTarget = target.replace(/,/g, '');
    const isFloat = cleanTarget.includes('.');
    const decimalPlaces = isFloat ? cleanTarget.split('.')[1].length : 0;
    const formattedCount = count.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
    });

    return (
        <span ref={ref} className="tabular-nums">
            {formattedCount}{suffix}
        </span>
    );
};

/* ─── Main Component ─────────────────────────────────────────────── */
const Home = () => {
    const [projects, setProjects] = useState([]);
    const [activeProjectIdx, setActiveProjectIdx] = useState(0);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const heroRef = useRef(null);

    const [settings, setSettings] = useState({
        about_title: 'Building Trust Through Quality Craftsmanship',
        about_content: "For over 25 years, Krishna Engineering Works has been a trusted pioneer in fabrication, welding, and industrial services across Kerala. Built on a foundation of unyielding quality, remarkable durability, and unwavering commitment to customer satisfaction.",
        map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3917.86141356417!2d76.3951277!3d10.8981353!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba7d7df303996fd%3A0xe144438f2273f6f2!2sKrishna%20engineering%20works%20thiruzhiyode.(welding%20workshop)!5e0!3m2!1sen!2sin!4v1775472335434!5m2!1sen!2sin',
        stat_years: '25+',
        stat_projects: '1200+',
        stat_clients: '450+',
        stat_satisfaction: '99%',
        footer_address: 'Thiruvazhiyode, Sreekrishnapuram, Kerala 679514',
        footer_phone: '+91 9447940835', floating_whatsapp: '919447940835',
        floating_phone: '+919447940835'
    });

    /* Parallax scroll — only moves bg, content stays visible */
    const { scrollY } = useScroll();
    const heroY = useTransform(scrollY, [0, 600], [0, 180]);
    const smoothHeroY = useSpring(heroY, { stiffness: 80, damping: 20 });

    /* Mouse parallax on hero */
    useEffect(() => {
        const handler = (e) => setMousePos({ x: e.clientX / window.innerWidth - 0.5, y: e.clientY / window.innerHeight - 0.5 });
        window.addEventListener('mousemove', handler);
        return () => window.removeEventListener('mousemove', handler);
    }, []);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [settingsRes, projectsRes] = await Promise.allSettled([
                    api.get('/settings/public'),
                    api.get('/portfolio/gallery')
                ]);
                if (settingsRes.status === 'fulfilled' && settingsRes.value?.data?.length > 0) {
                    const map = {};
                    settingsRes.value.data.forEach(s => map[s.key] = s.value);
                    setSettings(prev => ({ ...prev, ...map }));
                }
                if (projectsRes.status === 'fulfilled' && projectsRes.value?.data) {
                    setProjects(projectsRes.value.data);
                }
            } catch (e) { console.error('Fetch error', e); }
        };
        fetchAll();
    }, []);



    const defaultProjects = [
        { images: [{ url: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=700&h=500&fit=crop' }], title: 'Industrial Steel Structure' },
        { images: [{ url: 'https://images.unsplash.com/photo-1541888087405-ebcfca2be2b1?w=700&h=500&fit=crop' }], title: 'Pipeline Welding' },
        { images: [{ url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=700&h=500&fit=crop' }], title: 'Factory Roofing' },
        { images: [{ url: 'https://images.unsplash.com/photo-1510265236892-329bfd7de7a1?w=700&h=500&fit=crop' }], title: 'Custom Iron Gates' },
        { images: [{ url: 'https://images.unsplash.com/photo-1590496793907-9b24479abccb?w=700&h=500&fit=crop' }], title: 'Commercial Grills' },
        { images: [{ url: 'https://images.unsplash.com/photo-1621213349942-0f723e421cd0?w=700&h=500&fit=crop' }], title: 'On-site Repair' }
    ];
    const displayedProjects = (projects && projects.length > 0) ? projects.slice(0, 6) : defaultProjects;

    useEffect(() => {
        const pCount = displayedProjects.length;
        if (pCount === 0) return;
        const pInterval = setInterval(() => {
            setActiveProjectIdx(i => (i + 1) % pCount);
        }, 4000);
        return () => clearInterval(pInterval);
    }, [displayedProjects.length]);

    return (
        <>
            <FloatingContact />

            <div className="bg-white text-slate-800 overflow-x-hidden">

                {/* ════════════════════════════════════════
                    1. HERO SECTION — Immersive Animated 
                    ════════════════════════════════════════ */}
                <section ref={heroRef} className="relative min-h-screen flex items-center bg-white overflow-hidden">
                    {/* Dynamic animated gradient bg */}
                    <motion.div
                        animate={{ background: [
                            'radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.06) 0%, transparent 60%)',
                            'radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.08) 0%, transparent 60%)',
                            'radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.06) 0%, transparent 60%)',
                        ]}}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0"
                    />

                    {/* Large background wordmark */}
                    <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.04 }}
                            transition={{ delay: 2 }}
                            className="text-[22vw] font-black text-blue-900/10 uppercase tracking-tighter leading-none"
                        >
                            KEW
                        </motion.span>
                    </div>

                    {/* Floating orbs — mouse parallax */}
                    <motion.div
                        animate={{ x: mousePos.x * 60, y: mousePos.y * 40 }}
                        transition={{ type: 'spring', stiffness: 40, damping: 15 }}
                        className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-blue-300/20 rounded-full blur-[120px] pointer-events-none"
                    />
                    <motion.div
                        animate={{ x: mousePos.x * -40, y: mousePos.y * 30 }}
                        transition={{ type: 'spring', stiffness: 40, damping: 15 }}
                        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[100px] pointer-events-none"
                    />

                    {/* Grid overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

                    {/* Parallax hero bg image */}
                    <motion.div style={{ y: smoothHeroY }} className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&q=80')] bg-cover bg-center opacity-[0.04]" />
                    </motion.div>

                    {/* Hero content */}
                    <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-28">
                        <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-5xl">

                            {/* Badge */}
                            <motion.div variants={fadeUp} custom={0}
                                className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-blue-50/80 border border-blue-100 backdrop-blur-sm mb-12"
                            >
                                <motion.span
                                    animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-2 h-2 rounded-full bg-blue-600"
                                />
                                <span className="text-blue-700 text-xs font-black uppercase tracking-[0.3em]">
                                    Established 1999 · Certified Excellence
                                </span>
                            </motion.div>

                            {/* Animated headline */}
                            <motion.div variants={stagger} className="mb-8">
                                <div className="text-[clamp(3rem,8vw,6.5rem)] font-black text-slate-900 leading-[0.95] tracking-[-0.03em] font-poppins">
                                    <WordReveal text="Precision" className="block" />
                                    <span className="block overflow-hidden">
                                        <motion.span
                                            variants={fadeUp}
                                            custom={2}
                                            className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-cta to-blue-600"
                                        >
                                            Engineering
                                        </motion.span>
                                    </span>
                                    <WordReveal text="Redefined." className="block" />
                                </div>
                            </motion.div>

                            <motion.p variants={fadeUp} custom={5}
                                className="text-lg md:text-xl text-slate-600 mb-14 max-w-2xl leading-relaxed font-medium"
                            >
                                Kerala's premier industrial fabrication & welding specialists.
                                Over two decades of precision engineering — delivered on-time, every time.
                            </motion.p>

                            {/* CTA Buttons */}
                            <motion.div variants={fadeUp} custom={6} className="flex flex-wrap gap-5 mb-24">
                                <Link to="/quote" className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-base flex items-center gap-3 overflow-hidden shadow-[0_0_40px_rgba(37,99,235,0.2)] transition-all hover:shadow-[0_0_60px_rgba(37,99,235,0.4)] hover:-translate-y-1">
                                    <span className="relative z-10">Start Your Project</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform relative z-10" />
                                    {/* shimmer sweep */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                </Link>
                                 <a href={(settings.floating_phone || settings.footer_phone || '+918594030186').startsWith('tel:') ? (settings.floating_phone || settings.footer_phone || '+918594030186') : `tel:${(settings.floating_phone || settings.footer_phone || '+918594030186').replace(/\s+/g, '')}`} className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl border border-slate-200 hover:border-slate-300 flex items-center gap-3 transition-all hover:-translate-y-1 text-base shadow-sm">
                                    <motion.span animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                                        <Phone className="w-5 h-5 text-blue-600" />
                                    </motion.span>
                                    Speak with Experts
                                </a>
                            </motion.div>

                            {/* ── PERFORMANCE METRICS ── 
                                Glassmorphism cards with animated counters */}
                            <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-10 border-t border-slate-200">
                                {[
                                    { label: 'Projects Completed', value: (settings.stat_projects || '1200+').replace(/[^0-9,.]/g, ''), suffix: (settings.stat_projects || '1200+').replace(/[0-9,. ]/g, '') || '+', icon: <Layers className="w-7 h-7" />, color: 'from-blue-50/50 to-white', glow: 'shadow-blue-100/40', border: 'border-blue-100', iconColor: 'text-blue-600', bgIcon: 'bg-blue-50' },
                                    { label: 'Happy Clients', value: (settings.stat_clients || '450+').replace(/[^0-9,.]/g, ''), suffix: (settings.stat_clients || '450+').replace(/[0-9,. ]/g, '') || '+', icon: <Users className="w-7 h-7" />, color: 'from-cyan-50/50 to-white', glow: 'shadow-cyan-100/40', border: 'border-cyan-100', iconColor: 'text-cyan-600', bgIcon: 'bg-cyan-50' },
                                    { label: 'Years Experience', value: (settings.stat_years || '25+').replace(/[^0-9.]/g, ''), suffix: (settings.stat_years || '25+').replace(/[0-9. ]/g, '') || '+', icon: <Award className="w-7 h-7" />, color: 'from-yellow-50/50 to-white', glow: 'shadow-yellow-100/40', border: 'border-yellow-100', iconColor: 'text-yellow-600', bgIcon: 'bg-yellow-50' },
                                    { label: 'Client Satisfaction', value: (settings.stat_satisfaction || '99%').replace(/[^0-9.]/g, ''), suffix: (settings.stat_satisfaction || '99%').replace(/[0-9. ]/g, '') || '%', icon: <Shield className="w-7 h-7" />, color: 'from-green-50/50 to-white', glow: 'shadow-green-100/40', border: 'border-green-100', iconColor: 'text-green-600', bgIcon: 'bg-green-50' },
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        variants={scaleIn}
                                        custom={i}
                                        whileHover={{ y: -10, scale: 1.03 }}
                                        className={`relative p-6 rounded-3xl bg-gradient-to-br ${stat.color} border ${stat.border} shadow-xl ${stat.glow} overflow-hidden cursor-default group`}
                                    >
                                        {/* Background shine on hover */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-slate-50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                        <div className={`w-12 h-12 ${stat.bgIcon} rounded-2xl flex items-center justify-center mb-4 ${stat.iconColor} group-hover:scale-110 transition-transform`}>{stat.icon}</div>
                                        <div className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-2">
                                            <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 group-hover:text-slate-600 transition-colors">
                                            {stat.label}
                                        </div>
                                        {/* Bottom accent line */}
                                        <div className={`absolute bottom-0 left-0 h-0.5 ${stat.iconColor} bg-current w-0 group-hover:w-full transition-all duration-700`} />
                                    </motion.div>
                                ))}
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* scroll indicator */}
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400/50"
                    >
                        <span className="text-[9px] font-black uppercase tracking-[0.4em]">Scroll</span>
                        <div className="w-5 h-9 rounded-full border border-slate-300 flex justify-center pt-1.5">
                            <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1 h-2 bg-slate-400 rounded-full" />
                        </div>
                    </motion.div>
                </section>

                {/* Banner Ad Placement */}
                {/* Banner Ad Placement */}
                <div className="bg-slate-50 pt-12 pb-6 border-b border-slate-200">
                    <div className="max-w-7xl mx-auto px-6">
                        <AdBanner adSlot="7234567890" adFormat="horizontal" />
                    </div>
                </div>

                {/* ════════════════════════════════════════
                    2. ABOUT SECTION — Cinematic reveal   
                    ════════════════════════════════════════ */}
                <section id="about" className="py-36 bg-[#F8FAFC] relative overflow-hidden">
                    {/* Ambient glow */}
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-[150px] pointer-events-none -translate-x-1/2 -translate-y-1/2 opacity-40" />
                    <div className="max-w-7xl mx-auto px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                            {/* Text */}
                            <motion.div
                                initial="hidden" whileInView="visible"
                                viewport={{ once: true, margin: "-80px" }} variants={stagger}
                            >
                                <motion.p variants={fadeUp} custom={0} className="text-blue-600 font-black uppercase tracking-[0.4em] text-xs mb-5">Our Story</motion.p>
                                <motion.h2 variants={fadeUp} custom={1} className="text-5xl md:text-6xl font-black text-slate-900 leading-tight tracking-tighter mb-8 font-poppins">
                                    {settings.about_title}
                                </motion.h2>
                                <motion.p variants={fadeUp} custom={2} className="text-slate-600 text-lg leading-relaxed mb-12 font-medium">
                                    {settings.about_content}
                                </motion.p>
                                <motion.div variants={fadeUp} custom={3} className="space-y-5">
                                    {['ISI Certified Steel Works', 'On-Site Mobile Fabrication Units', '25+ Year Track Record of Delivery', 'Transparent, Competitive Pricing'].map((item, i) => (
                                        <div key={i} className="flex items-center gap-4">
                                            <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200/50 flex items-center justify-center flex-shrink-0">
                                                <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                                            </div>
                                            <span className="text-slate-700 font-semibold">{item}</span>
                                        </div>
                                    ))}
                                </motion.div>
                            </motion.div>

                            {/* Images — stacked 3D reveal */}
                            <motion.div
                                initial="hidden" whileInView="visible"
                                viewport={{ once: true }} variants={fadeRight}
                                className="relative h-[600px]"
                            >
                                <motion.div whileHover={{ scale: 1.03, rotate: -1 }} transition={{ type: 'spring', stiffness: 200 }}
                                    className="absolute top-0 left-0 right-16 h-[380px] rounded-[3rem] overflow-hidden shadow-[0_25px_50px_rgba(15,23,42,0.15)]"
                                >
                                    <img src="https://images.unsplash.com/photo-1542626991-cbc4e32524cc?w=700&h=500&fit=crop" alt="Welding" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.03, rotate: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                                    className="absolute bottom-0 right-0 left-16 h-[280px] rounded-[3rem] overflow-hidden shadow-[0_25px_50px_rgba(15,23,42,0.15)] border border-slate-100"
                                >
                                    <img src="https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?w=700&h=400&fit=crop" alt="Fabrication" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                                </motion.div>
                                {/* Floating stat badge */}
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                    className="absolute top-1/2 right-4 -translate-y-1/2 bg-blue-600 text-white p-6 rounded-3xl shadow-2xl shadow-blue-600/40 z-10"
                                >
                                    <div className="text-4xl font-black leading-none">{settings.stat_years}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-1">Years</div>
                                </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════
                    3. SERVICES — 3D Perspective Cards     
                    ════════════════════════════════════════ */}
                <section id="services" className="py-36 bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-50 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/3 pointer-events-none opacity-60" />
                    <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-24">
                            <motion.p variants={fadeUp} custom={0} className="text-blue-500 font-black uppercase tracking-[0.4em] text-xs mb-4">What We Do</motion.p>
                            <motion.h2 variants={fadeUp} custom={1} className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter mb-6">End-to-End Metal Solutions</motion.h2>
                            <motion.p variants={fadeUp} custom={2} className="text-slate-500 text-xl max-w-2xl mx-auto font-medium">
                                World-class engineering services tailored for industrial and residential needs.
                            </motion.p>
                        </motion.div>

                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={stagger}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                        >
                            {[
                                { title: 'Steel Fabrication', icon: <Settings className="w-8 h-8" />, desc: 'Heavy structural steel for industrial frameworks, sheds, and construction.', color: 'bg-blue-50 text-blue-600', border: 'border-blue-100', glow: 'hover:shadow-blue-100' },
                                { title: 'Welding Services', icon: <Zap className="w-8 h-8" />, desc: 'Precision TIG & MIG welding by certified pros for high-durability joins.', color: 'bg-yellow-50 text-yellow-600', border: 'border-yellow-100', glow: 'hover:shadow-yellow-100' },
                                { title: 'Gate & Grill Works', icon: <Shield className="w-8 h-8" />, desc: 'Custom residential gates, rolling shutters, and security grills.', color: 'bg-green-50 text-green-600', border: 'border-green-100', glow: 'hover:shadow-green-100' },
                                { title: 'Industrial Projects', icon: <Wrench className="w-8 h-8" />, desc: 'Factory maintenance, machinery repair, and high-pressure pipeline welding.', color: 'bg-violet-50 text-violet-600', border: 'border-violet-100', glow: 'hover:shadow-violet-100' },
                            ].map((svc, i) => (
                                <motion.div
                                    key={i}
                                    variants={scaleIn}
                                    custom={i}
                                    whileHover={{ y: -16, rotateX: 5, scale: 1.02 }}
                                    style={{ perspective: 800 }}
                                    className={`group p-10 bg-white rounded-[2.5rem] border ${svc.border} shadow-xl ${svc.glow} hover:shadow-2xl transition-all duration-500 flex flex-col items-start`}
                                >
                                    <div className={`w-20 h-20 ${svc.color} rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700 shadow-sm`}>
                                        {svc.icon}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight">{svc.title}</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed font-semibold flex-1">{svc.desc}</p>
                                    <div className="mt-8 flex items-center gap-2 text-blue-600 font-bold text-sm group-hover:gap-4 transition-all">
                                        <span>Learn More</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* ════════════════════════════════════════
                    4. PORTFOLIO / GALLERY — animated grid 
                    ════════════════════════════════════════ */}
                <section id="portfolio" className="py-36 bg-slate-50 overflow-hidden border-y border-slate-200/50">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                            <div>
                                <motion.p variants={fadeUp} custom={0} className="text-blue-600 font-black uppercase tracking-[0.4em] text-xs mb-3">Our Work</motion.p>
                                <motion.h2 variants={fadeUp} custom={1} className="text-5xl font-black text-slate-900 tracking-tighter">Recent Projects</motion.h2>
                            </div>
                            <motion.div variants={fadeUp} custom={2}>
                                <Link to="/projects" className="group flex items-center gap-3 text-slate-500 hover:text-primary font-bold transition-colors">
                                    View All <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                                </Link>
                            </motion.div>
                        </motion.div>

                        {/* Auto-scrolling Project Slideshow */}
                        <div className="relative w-full max-w-4xl mx-auto h-[350px] sm:h-[450px] rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-200/60 group cursor-pointer bg-white">
                            <Link to="/projects" className="block w-full h-full relative">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeProjectIdx}
                                        initial={{ opacity: 0, scale: 1.05 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.6 }}
                                        className="absolute inset-0 w-full h-full"
                                    >
                                        <img
                                            src={displayedProjects[activeProjectIdx]?.images?.[0]?.url ? getDirectImageUrl(displayedProjects[activeProjectIdx].images[0].url) : (displayedProjects[activeProjectIdx]?.images?.[0]?.url || displayedProjects[activeProjectIdx]?.url)}
                                            alt={displayedProjects[activeProjectIdx]?.title}
                                            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700"
                                        />
                                        {/* Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-8 sm:p-12">
                                            <p className="text-blue-400 text-xs font-black uppercase tracking-widest mb-2">Completed Project</p>
                                            <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4">{displayedProjects[activeProjectIdx]?.title}</h3>
                                            <span className="inline-flex items-center gap-2 text-white/70 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">
                                                View all photos <ArrowRight className="w-4 h-4" />
                                            </span>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                                
                                {/* Right arrow hover indicator */}
                                <div className="absolute top-5 right-5 w-10 h-10 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20">
                                    <ArrowRight className="w-4 h-4 text-white" />
                                </div>
                            </Link>

                            {/* Dot Indicators */}
                            <div className="absolute bottom-6 right-8 flex gap-2 z-20">
                                {displayedProjects.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setActiveProjectIdx(idx);
                                        }}
                                        className={`h-2 rounded-full transition-all duration-300 ${idx === activeProjectIdx ? 'bg-blue-500 w-6' : 'bg-white/40 w-2'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════
                    5. PROFESSIONAL TRUST & REPUTATION SECTION
                    ════════════════════════════════════════ */}
                <section className="py-36 bg-white relative overflow-hidden">
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-50 rounded-full blur-[100px] pointer-events-none opacity-60" />
                    <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
                        {/* Header */}
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-24">
                            <motion.p variants={fadeUp} custom={0} className="text-blue-500 font-black uppercase tracking-[0.4em] text-xs mb-4">Reputation & Trust</motion.p>
                            <motion.h2 variants={fadeUp} custom={1} className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Uncompromising Quality & Standards</motion.h2>
                            <motion.p variants={fadeUp} custom={2} className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                                Trusted by industrial and residential clients across Kerala. Certified expertise and a proven track record.
                            </motion.p>
                        </motion.div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
                            {/* Left Side: Core Trust Badges */}
                            <motion.div 
                                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                                className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-blue-50/20 border border-slate-100 rounded-[2.5rem] p-10 shadow-xl shadow-slate-100/50"
                            >
                                <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight border-l-4 border-blue-600 pl-4">Our Quality Guarantees</h3>
                                <div className="space-y-6">
                                    {[
                                        { text: '⭐ 4.8+ Rated Company', desc: 'Consistently high performance and client feedback ratings.' },
                                        { text: '🏆 Trusted Industrial Service Provider', desc: 'Serving Kerala\'s heavy industries with excellence.' },
                                        { text: '✅ Professional Team', desc: 'ISI Certified engineers and expert AWS/ASME standard welders.' },
                                        { text: '✅ Quality Assured Work', desc: 'Strict inspection protocols on raw materials and final weld joints.' },
                                        { text: '✅ Timely Project Delivery', desc: 'Rigorous project management to guarantee on-time handover.' },
                                        { text: '✅ Customer Satisfaction Focused', desc: 'Dedicated support lines and transparent quoting.' },
                                    ].map((badge, idx) => (
                                        <motion.div key={idx} variants={fadeUp} className="flex gap-4 items-start">
                                            <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{badge.text}</h4>
                                                <p className="text-xs text-slate-500 font-medium mt-0.5">{badge.desc}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* Right Side: Trust & Stats Grid */}
                            <motion.div 
                                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                                className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6"
                            >
                                {[
                                    { title: '⭐ 4.8+ Google Rating', desc: '4.8+ Rated on Google Business Profile', sub: 'Verified Client Reviews', icon: <Star className="w-8 h-8 text-yellow-500 fill-current" />, color: 'from-yellow-50/50 to-white', border: 'border-yellow-100', shadow: 'shadow-yellow-100/30' },
                                    { title: '🏗️ 500+ Projects Completed', desc: 'Successfully executed fabrication and erection projects.', sub: 'Industrial & Residential', icon: <Layers className="w-8 h-8 text-blue-600" />, color: 'from-blue-50/50 to-white', border: 'border-blue-100', shadow: 'shadow-blue-100/30' },
                                    { title: '👷 100+ Happy Clients', desc: 'Active customers across industrial factories & residential sectors.', sub: '100% Retained Service contracts', icon: <Users className="w-8 h-8 text-cyan-600" />, color: 'from-cyan-50/50 to-white', border: 'border-cyan-100', shadow: 'shadow-cyan-100/30' },
                                    { title: '📍 Services Across Kerala', desc: 'Statewide logistics and on-site mobile fabrication units.', sub: 'All 14 Districts Covered', icon: <MapPin className="w-8 h-8 text-emerald-600" />, color: 'from-emerald-50/50 to-white', border: 'border-emerald-100', shadow: 'shadow-emerald-100/30' },
                                    { title: '⏱️ On-Time Delivery Commitment', desc: 'Rigid adherence to contract timelines and scheduled handovers.', sub: 'Zero Project Overruns', icon: <Clock className="w-8 h-8 text-indigo-600" />, color: 'from-indigo-50/50 to-white', border: 'border-indigo-100', shadow: 'shadow-indigo-100/30' },
                                ].map((card, idx) => (
                                    <motion.div 
                                        key={idx}
                                        variants={scaleIn}
                                        custom={idx}
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        className={`p-8 bg-gradient-to-br ${card.color} border ${card.border} rounded-[2.5rem] shadow-xl ${card.shadow} flex flex-col items-start transition-all cursor-default group ${idx === 4 ? 'sm:col-span-2' : ''}`}
                                    >
                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md border border-slate-50 mb-6 group-hover:scale-110 transition-transform">
                                            {card.icon}
                                        </div>
                                        <h4 className="text-xl font-black text-slate-900 tracking-tight mb-2">{card.title}</h4>
                                        <p className="text-xs text-slate-500 font-semibold leading-relaxed flex-grow">{card.desc}</p>
                                        <div className="w-full border-t border-slate-100/50 pt-4 mt-6 flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            <span>{card.sub}</span>
                                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600">Verified ✓</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* ════════════════════════════════════════
                    6. CTA BANNER                          
                    ════════════════════════════════════════ */}
                <section className="py-24 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 relative overflow-hidden">
                    <motion.div animate={{ x: [0, 60, 0] }} transition={{ duration: 12, repeat: Infinity }} className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] bg-white/5 rounded-full blur-[80px] pointer-events-none" />
                    <motion.div animate={{ x: [0, -60, 0] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] bg-indigo-800/40 rounded-full blur-[80px] pointer-events-none" />
                    <div className="max-w-5xl mx-auto px-6 text-center relative">
                        <motion.h2 initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                            className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter"
                        >
                            Ready to Start Your Next Project?
                        </motion.h2>
                        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.2 }} viewport={{ once: true }}
                            className="text-xl text-blue-100 mb-12 font-medium"
                        >
                            Get a free consultation and competitive quote within 24 hours.
                        </motion.p>
                        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} viewport={{ once: true }}
                            className="flex flex-wrap justify-center gap-5"
                        >
                            <Link to="/quote" className="group px-10 py-5 bg-white text-blue-700 font-black rounded-2xl hover:-translate-y-2 transition-all shadow-2xl text-lg flex items-center gap-3">
                                Get Free Quote <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                            </Link>
                            <a href={`tel:${settings.footer_phone}`} className="px-10 py-5 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl border border-white/20 hover:-translate-y-2 transition-all text-lg flex items-center gap-3">
                                <Phone className="w-5 h-5" /> {settings.footer_phone}
                            </a>
                        </motion.div>
                    </div>
                </section>

                {/* ════════════════════════════════════════
                    7. CONTACT SECTION                     
                    ════════════════════════════════════════ */}
                <section id="contact" className="py-36 bg-slate-50 text-slate-800 overflow-hidden border-t border-slate-200/50">
                    <div className="max-w-7xl mx-auto px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                                <motion.p variants={fadeUp} custom={0} className="text-blue-600 font-black uppercase tracking-[0.4em] text-xs mb-4">Get In Touch</motion.p>
                                <motion.h2 variants={fadeUp} custom={1} className="text-5xl font-black text-slate-900 tracking-tighter mb-6 font-poppins">Free Consultation</motion.h2>
                                <motion.p variants={fadeUp} custom={2} className="text-slate-600 text-lg mb-12 font-medium">Have a project in mind? Let's discuss. We provide estimates across Kerala.</motion.p>
                                <motion.div variants={stagger} className="space-y-6">
                                    {[
                                        { icon: <Phone className="w-5 h-5" />, label: 'Direct Line', value: settings.footer_phone, href: `tel:${settings.footer_phone}` },
                                        { icon: <MessageCircle className="w-5 h-5" />, label: 'WhatsApp', value: `+${settings.floating_whatsapp}`, href: `https://wa.me/${settings.floating_whatsapp}`, green: true },
                                        { icon: <MapPin className="w-5 h-5" />, label: 'Location', value: settings.footer_address },
                                    ].map((item, i) => (
                                        <motion.div key={i} variants={fadeUp} custom={i + 3}>
                                            {item.href ? (
                                                <a href={item.href} className="flex items-center gap-5 p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:border-blue-500/30 hover:bg-blue-50/20 hover:shadow-md transition-all group">
                                                    <div className={`w-12 h-12 rounded-2xl ${item.green ? 'bg-green-500/20 text-green-600' : 'bg-blue-500/20 text-blue-600'} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>{item.icon}</div>
                                                    <div><p className="text-slate-400 text-xs font-black uppercase tracking-wider mb-1">{item.label}</p><p className="text-slate-800 font-black text-lg">{item.value}</p></div>
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-5 p-5 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
                                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-600 flex items-center justify-center flex-shrink-0">{item.icon}</div>
                                                    <div><p className="text-slate-400 text-xs font-black uppercase tracking-wider mb-1">{item.label}</p><p className="text-slate-800 font-bold">{item.value}</p></div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </motion.div>

                            {/* Contact Form */}
                            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeRight}
                                className="bg-white border border-slate-200/60 rounded-[3rem] p-10 shadow-xl shadow-slate-100/55"
                            >
                                <h3 className="text-2xl font-black text-slate-900 mb-8 font-poppins">Send a Message</h3>
                                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); alert("Message sent! We'll contact you within 2 hours."); }}>
                                    {[
                                        { label: 'Full Name', type: 'text', placeholder: 'Your Name' },
                                        { label: 'Phone Number', type: 'tel', placeholder: '+91 00000 00000' },
                                    ].map((field, i) => (
                                        <div key={i}>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{field.label}</label>
                                            <input type={field.type} placeholder={field.placeholder} required
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-sm"
                                            />
                                        </div>
                                    ))}
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Message</label>
                                        <textarea rows={4} placeholder="Tell us about your project..." required
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none font-medium text-sm"
                                        />
                                    </div>
                                    <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-colors shadow-lg shadow-blue-600/20 text-lg flex items-center justify-center gap-3 group"
                                    >
                                        Send Message <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </motion.button>
                                </form>
                            </motion.div>
                        </div>

                        {/* Map */}
                        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
                            className="mt-16 rounded-[2.5rem] overflow-hidden h-64 border border-slate-200/60 shadow-sm bg-white"
                        >
                            <iframe src={settings.map_embed_url} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Location Map" />
                        </motion.div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default Home;
