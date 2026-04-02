import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
    Phone, Mail, MessageCircle, MapPin, Search, CheckCircle, 
    Star, ArrowRight, Wrench, Shield, Zap, Settings, Award 
} from 'lucide-react';
import FloatingContact from '../components/FloatingContact';
import api from '../services/api';
import { getDirectImageUrl } from '../utils/imageUtils';

const Home = () => {
    const [projects, setProjects] = useState([]);
    const [settings, setSettings] = useState({
        about_title: 'Building Trust Through Quality Craftsmanship',
        about_content: "For over 25 years, **Krishna Engineering Works** has been a trusted pioneer in the fabrication, welding, and industrial services sector across Kerala. We have built our reputation on a foundation of unyielding quality, remarkable durability, and unwavering commitment to customer satisfaction.",
        map_embed_url: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d251482.68658826724!2d76.16084920612662!3d9.982342759902633!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b080d514abec6bf%3A0xbd582caa5844192!2sKochi%2C%20Kerala!5e0!3m2!1sen!2sin!4v1709230552399!5m2!1sen!2sin',
        stat_years: '25+',
        footer_address: 'Kochi, Kerala, India',
        footer_phone: '+91 9446 000 000',
        floating_whatsapp: '919446000000'
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings/public');
                if (res.data && res.data.length > 0) {
                    const settingsMap = {};
                    res.data.forEach(s => settingsMap[s.key] = s.value);
                    setSettings(prev => ({ ...prev, ...settingsMap }));
                }
            } catch (err) {
                console.error("Failed to fetch settings", err);
            }
        };

        const fetchProjects = async () => {
            try {
                const res = await api.get('/portfolio/gallery');
                if (res.data) setProjects(res.data);
            } catch (err) {
                console.error("Failed to fetch projects", err);
            }
        };

        fetchSettings();
        fetchProjects();
    }, []);

    const fadeIn = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const stagger = {
        visible: { transition: { staggerChildren: 0.1 } }
    };

    return (
        <div className="bg-brand-50 text-brand-900 font-sans min-h-screen">
            <FloatingContact />

            {/* 1. HERO SECTION */}
            <section className="relative min-h-[90vh] flex items-center bg-brand-950 overflow-hidden">
                {/* Background Pattern & Overlay */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-[0.25] mix-blend-luminosity"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/90 to-brand-950/70"></div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-20">
                    <motion.div 
                        initial="hidden" animate="visible" variants={fadeIn}
                        className="max-w-3xl"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-800/80 border border-brand-700 backdrop-blur-sm mb-6 text-brand-300 text-sm font-semibold tracking-wider uppercase">
                            <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
                            25+ Years Experience | On-site Service | Budget Friendly
                        </div>
                        
                        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
                            Krishna <span className="text-brand-accent">Engineering</span> Works
                        </h1>
                        
                        <p className="text-xl md:text-2xl text-brand-200 mb-10 max-w-2xl font-light">
                            Expert Fabrication & Welding Services in Kerala. We deliver industrial-grade durability with precision craftsmanship.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/quote" className="px-8 py-4 bg-brand-accent hover:bg-brand-accentHover text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-brand-accent/20">
                                Get Free Quote <ArrowRight className="w-5 h-5" />
                            </Link>
                            <a href="tel:+919446000000" className="px-8 py-4 bg-brand-800 hover:bg-brand-700 text-white font-bold rounded-lg transition-colors border border-brand-600 flex items-center justify-center gap-2">
                                <Phone className="w-5 h-5" /> Call Now
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 2. ABOUT SECTION */}
            <section className="py-24 bg-white" id="about">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn}>
                            <h2 className="text-brand-accent font-bold uppercase tracking-wider mb-2">About Us</h2>
                            <h3 className="text-4xl font-black text-brand-950 mb-6">{settings.about_title}</h3>
                            <p className="text-brand-600 text-lg leading-relaxed mb-6">
                                {settings.about_content}
                            </p>
                            <div className="bg-brand-50 border-l-4 border-brand-accent p-6 rounded-r-lg">
                                <p className="text-brand-800 font-medium">
                                    "Whether it's a massive structural fabrication project or a precision gate design, we bring the same level of expertise and dedication to ensure long-term trust."
                                </p>
                            </div>
                        </motion.div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <img src="https://images.unsplash.com/photo-1542626991-cbc4e32524cc?w=600&h=600&fit=crop" alt="Welding Worker" className="rounded-2xl shadow-xl w-full h-64 object-cover" />
                            <img src="https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?w=600&h=600&fit=crop" alt="Steel Fabrication" className="rounded-2xl shadow-xl w-full h-64 object-cover mt-8" />
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. SERVICES SECTION */}
            <section className="py-24 bg-brand-50" id="services">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-brand-accent font-bold uppercase tracking-wider mb-2">Our Services</h2>
                        <h3 className="text-4xl font-black text-brand-950">Industrial & Residential Solutions</h3>
                    </div>

                    <motion.div 
                        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
                    >
                        {[
                            { title: 'Steel Fabrication', icon: <Settings className="w-8 h-8"/>, desc: 'Heavy structural steel fabrication for industrial frameworks and construction projects.' },
                            { title: 'Welding Services', icon: <Zap className="w-8 h-8"/>, desc: 'Precision TIG and MIG welding by certified professionals for robust joins.' },
                            { title: 'Gate & Grill Works', icon: <Shield className="w-8 h-8"/>, desc: 'Custom designed residential and commercial gates, rolling shutters, and security grills.' },
                            { title: 'Industrial Maintenance', icon: <Wrench className="w-8 h-8"/>, desc: 'On-site factory maintenance, machinery repair, and pipeline welding.' },
                        ].map((srv, idx) => (
                            <motion.div key={idx} variants={fadeIn} className="bg-white p-8 rounded-2xl shadow-lg border border-brand-100 hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-16 h-16 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent mb-6">
                                    {srv.icon}
                                </div>
                                <h4 className="text-xl font-bold text-brand-950 mb-3">{srv.title}</h4>
                                <p className="text-brand-600">{srv.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* 4. PORTFOLIO / GALLERY */}
            <section className="py-24 bg-brand-950 text-white" id="portfolio">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-brand-accent font-bold uppercase tracking-wider mb-2">Portfolio</h2>
                            <h3 className="text-4xl font-black">Our Recent Works</h3>
                        </div>
                        <Link to="/projects" className="hidden sm:flex text-brand-300 hover:text-brand-accent transition-colors items-center gap-2">
                            View All Projects <ArrowRight className="w-4 h-4"/>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(projects.length > 0 ? projects : [
                            { images: [{url: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=600&fit=crop'}], title: 'Industrial Steel Structure' },
                            { images: [{url: 'https://images.unsplash.com/photo-1541888087405-ebcfca2be2b1?w=800&h=600&fit=crop'}], title: 'Pipeline Welding' },
                            { images: [{url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&h=600&fit=crop'}], title: 'Factory Roofing Deck' },
                            { images: [{url: 'https://images.unsplash.com/photo-1510265236892-329bfd7de7a1?w=800&h=600&fit=crop'}], title: 'Custom Iron Gates' },
                            { images: [{url: 'https://images.unsplash.com/photo-1590496793907-9b24479abccb?w=800&h=600&fit=crop'}], title: 'Commercial Grills' },
                            { images: [{url: 'https://images.unsplash.com/photo-1621213349942-0f723e421cd0?w=800&h=600&fit=crop'}], title: 'On-site Repair Unit' },
                        ]).slice(0, 6).map((item, i) => {
                            const imgUrl = item.images && item.images.length > 0 
                                ? getDirectImageUrl(item.images[0].url) 
                                : 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=600&fit=crop';
                            
                            return (
                                <div key={item._id || i} className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-brand-800">
                                    <img src={imgUrl} alt={item.title || 'Work'} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                                        <h4 className="text-xl font-bold">{item.title || 'Ongoing Project'}</h4>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 5. WHY CHOOSE US */}
            <section className="py-24 bg-white" id="why-us">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="order-2 lg:order-1 relative h-full min-h-[400px]">
                            <img src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&h=800&fit=crop" alt="Experience" className="absolute inset-0 w-full h-full object-cover rounded-2xl shadow-xl" />
                            <div className="absolute -bottom-8 -right-8 bg-brand-accent p-8 rounded-2xl text-white shadow-2xl hidden md:block">
                                <div className="text-5xl font-black mb-2">{settings.stat_years}</div>
                                <div className="font-bold uppercase tracking-wider text-sm">Years of Excellence</div>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2">
                            <h2 className="text-brand-accent font-bold uppercase tracking-wider mb-2">Why Choose Us</h2>
                            <h3 className="text-4xl font-black text-brand-950 mb-8">The Benchmark of Reliability</h3>
                            
                            <div className="space-y-6">
                                {[
                                    { title: '25+ Years Experience', desc: 'Decades of field-tested expertise in heavy and structural works.', icon: <Award className="w-6 h-6"/> },
                                    { title: 'Skilled Workers', desc: 'Highly trained and certified welding professionals.', icon: <CheckCircle className="w-6 h-6"/> },
                                    { title: 'On-Time Delivery', desc: 'Strict adherence to project timelines and schedules.', icon: <CheckCircle className="w-6 h-6"/> },
                                    { title: 'Affordable Pricing', desc: 'Budget-friendly quotes with no hidden costs.', icon: <CheckCircle className="w-6 h-6"/> },
                                    { title: 'On-Site Service Available', desc: 'Mobile fabrication units that come right to your location.', icon: <CheckCircle className="w-6 h-6"/> },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex gap-4 items-start">
                                        <div className="mt-1 text-brand-accent">{item.icon}</div>
                                        <div>
                                            <h4 className="text-lg font-bold text-brand-950">{item.title}</h4>
                                            <p className="text-brand-600 text-sm mt-1">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. TESTIMONIALS */}
            <section className="py-24 bg-brand-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-brand-accent font-bold uppercase tracking-wider mb-2">Testimonials</h2>
                        <h3 className="text-4xl font-black text-brand-950">Words from Our Clients</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { name: 'Rajeev Nair', review: 'Exceptional service! They did the entire structural roofing for our new warehouse. Highly professional and completed the project before the deadline.' },
                            { name: 'Mathew Thomas', review: 'Krishna Engineering Works replaced my old residential gates with stunning modern designs. The finish is extremely durable and budget-friendly.' },
                            { name: 'Siddharth Menon', review: 'Their on-site welding team saved our factory from a major production halt. Very fast response and high-quality repair work.' },
                        ].map((review, i) => (
                            <div key={i} className="bg-white p-8 rounded-2xl shadow-md border border-brand-100">
                                <div className="flex text-yellow-400 mb-4">
                                    {[...Array(5)].map((_, j) => <Star key={j} className="w-5 h-5 fill-current" />)}
                                </div>
                                <p className="text-brand-600 italic mb-6">"{review.review}"</p>
                                <div className="font-bold text-brand-950">- {review.name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 7. CONTACT SECTION */}
            <section className="py-24 bg-white" id="contact">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                        <div>
                            <h2 className="text-brand-accent font-bold uppercase tracking-wider mb-2">Contact Us</h2>
                            <h3 className="text-4xl font-black text-brand-950 mb-6">Get in Touch for a Free Consultation</h3>
                            <p className="text-brand-600 mb-10 text-lg">
                                Have a project in mind? Let's discuss your requirements. We provide estimations and consultations across Kerala.
                            </p>

                            <div className="space-y-6">
                                <a href={`tel:${settings.footer_phone}`} className="flex items-center gap-4 group">
                                    <div className="w-14 h-14 bg-brand-50 text-brand-accent rounded-full flex items-center justify-center group-hover:bg-brand-accent group-hover:text-white transition-colors">
                                        <Phone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-brand-500 font-medium tracking-wider uppercase">Direct Line</div>
                                        <div className="text-xl font-bold text-brand-950">{settings.footer_phone}</div>
                                    </div>
                                </a>
                                <a href={`https://wa.me/${settings.floating_whatsapp}`} className="flex items-center gap-4 group">
                                    <div className="w-14 h-14 bg-brand-50 text-green-500 rounded-full flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
                                        <MessageCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-brand-500 font-medium tracking-wider uppercase">WhatsApp</div>
                                        <div className="text-xl font-bold text-brand-950">+{settings.floating_whatsapp}</div>
                                    </div>
                                </a>
                                <div className="flex items-center gap-4 group">
                                    <div className="w-14 h-14 bg-brand-50 text-brand-accent rounded-full flex items-center justify-center group-hover:bg-brand-accent group-hover:text-white transition-colors">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-brand-500 font-medium tracking-wider uppercase">Location</div>
                                        <div className="text-lg font-bold text-brand-950">{settings.footer_address}</div>
                                    </div>
                                </div>
                                <div className="mt-4 rounded-2xl overflow-hidden h-48 border border-brand-200">
                                    <iframe 
                                        src={settings.map_embed_url} 
                                        width="100%" 
                                        height="100%" 
                                        style={{ border: 0 }} 
                                        allowFullScreen="" 
                                        loading="lazy" 
                                        referrerPolicy="no-referrer-when-downgrade"
                                        title="Location Map">
                                    </iframe>
                                </div>
                            </div>
                        </div>

                        <div className="bg-brand-50 p-8 md:p-10 rounded-3xl border border-brand-100 shadow-xl">
                            <h4 className="text-2xl font-black text-brand-950 mb-6">Send a Message</h4>
                            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Message sent successfully!"); }}>
                                <div>
                                    <label className="block text-sm font-bold text-brand-700 mb-2">Full Name</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all" placeholder="John Doe" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-brand-700 mb-2">Phone Number</label>
                                    <input type="tel" className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all" placeholder="+91 00000 00000" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-brand-700 mb-2">Message</label>
                                    <textarea rows="4" className="w-full px-4 py-3 rounded-xl border border-brand-200 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 outline-none transition-all" placeholder="Tell us about your project..." required></textarea>
                                </div>
                                <button type="submit" className="w-full py-4 bg-brand-accent hover:bg-brand-accentHover text-white font-bold rounded-xl transition-colors shadow-lg shadow-brand-accent/30 mt-4">
                                    Submit Request
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default Home;
