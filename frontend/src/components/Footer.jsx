import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Footer = () => {
    const [settings, setSettings] = useState({
        footer_description: 'Heavy structural engineering, industrial roofing, and precision fabrication for modern commercial enterprises everywhere. Built unyielding.',
        footer_address: 'Industrial Area Phase 1,\nTech Sector, 123456',
        footer_phone: '+91 98765 43210',
        footer_email: 'HELLO@KRISHNAENGG.COM',
        social_in: '#',
        social_fb: '#',
        social_x: '#'
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings/public');
                if (res.data && res.data.length > 0) {
                    const settingsObj = {};
                    res.data.forEach(s => {
                        settingsObj[s.key] = s.value;
                    });
                    setSettings(prev => ({ ...prev, ...settingsObj }));
                }
            } catch (err) {
                console.error("Failed to fetch footer settings", err);
            }
        };
        fetchSettings();
    }, []);

    return (
        <footer className="bg-brand-950 text-white font-sans border-t-[12px] border-brand-accent">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">

                    <div className="md:col-span-5 pr-8">
                        <Link to="/" className="inline-block mb-6 group">
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-accent w-12 h-12 flex items-center justify-center font-black text-brand-950 text-2xl transform -skew-x-12 group-hover:bg-white transition-colors">
                                    KE
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-3xl font-black uppercase tracking-tighter text-white leading-none">
                                        KRISHNA
                                    </span>
                                    <span className="text-[0.65rem] font-black tracking-widest uppercase text-brand-accent leading-none mt-1">
                                        Engineering Works
                                    </span>
                                </div>
                            </div>
                        </Link>
                        <p className="text-brand-400 font-medium leading-relaxed mb-8 max-w-sm text-sm">
                            {settings.footer_description}
                        </p>
                        <div className="flex gap-4">
                            <a href={settings.social_in} target="_blank" rel="noreferrer" className="w-10 h-10 bg-brand-900 border-2 border-brand-800 flex items-center justify-center hover:bg-brand-accent hover:border-brand-accent transition text-white hover:text-brand-950 font-black cursor-pointer uppercase text-xs">IN</a>
                            <a href={settings.social_fb} target="_blank" rel="noreferrer" className="w-10 h-10 bg-brand-900 border-2 border-brand-800 flex items-center justify-center hover:bg-brand-accent hover:border-brand-accent transition text-white hover:text-brand-950 font-black cursor-pointer uppercase text-xs">FB</a>
                            <a href={settings.social_x} target="_blank" rel="noreferrer" className="w-10 h-10 bg-brand-900 border-2 border-brand-800 flex items-center justify-center hover:bg-brand-accent hover:border-brand-accent transition text-white hover:text-brand-950 font-black cursor-pointer uppercase text-xs">X</a>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <h3 className="text-brand-accent font-black uppercase tracking-widest text-sm mb-6 border-b-2 border-brand-800 pb-2 inline-block">Company</h3>
                        <ul className="space-y-3 font-bold text-sm text-brand-300">
                            <li><Link to="/about" className="hover:text-brand-accent transition flex items-center gap-2">About Us</Link></li>
                            <li><Link to="/services" className="hover:text-brand-accent transition flex items-center gap-2">Services</Link></li>
                            <li><Link to="/projects" className="hover:text-brand-accent transition flex items-center gap-2">Portfolio</Link></li>
                        </ul>
                    </div>

                    <div className="md:col-span-2">
                        <h3 className="text-brand-accent font-black uppercase tracking-widest text-sm mb-6 border-b-2 border-brand-800 pb-2 inline-block">Operations</h3>
                        <ul className="space-y-3 font-bold text-sm text-brand-300">
                            <li><Link to="/services?type=welding" className="hover:text-brand-accent transition">Heavy Welding</Link></li>
                            <li><Link to="/services?type=roofing" className="hover:text-brand-accent transition">Metal Roofing</Link></li>
                            <li><Link to="/services?type=truss" className="hover:text-brand-accent transition">Truss Assembly</Link></li>
                            <li><Link to="/services?type=fabrication" className="hover:text-brand-accent transition">Steel Fab</Link></li>
                        </ul>
                    </div>

                    <div className="md:col-span-3">
                        <h3 className="text-brand-accent font-black uppercase tracking-widest text-sm mb-6 border-b-2 border-brand-800 pb-2 inline-block">Dispatch / Comms</h3>
                        <ul className="space-y-4 font-bold text-sm text-brand-300">
                            <li className="flex items-start gap-3">
                                <span className="text-brand-accent mt-1">⌖</span>
                                <span className="uppercase tracking-wide whitespace-pre-line">{settings.footer_address}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-brand-accent">☎</span>
                                <span className="tracking-wide">{settings.footer_phone}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="text-brand-accent">✉</span>
                                <span className="tracking-wide uppercase">{settings.footer_email}</span>
                            </li>
                        </ul>
                    </div>

                </div>
            </div>

            {/* Heavy bottom bar */}
            <div className="bg-black py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-xs font-bold text-brand-600 uppercase tracking-widest">
                    <p>&copy; {new Date().getFullYear()} KRISHNA ENGINEERING WORKS. UNYIELDING QUALITY.</p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                        <Link to="/privacy" className="hover:text-white transition">Privacy Spec</Link>
                        <Link to="/terms" className="hover:text-white transition">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
