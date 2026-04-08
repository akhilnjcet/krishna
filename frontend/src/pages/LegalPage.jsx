import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';

const LegalPage = ({ type }) => {
    const [content, setContent] = useState('Loading intelligence directives...');
    const [title, setTitle] = useState('');

    useEffect(() => {
        const fetchLegal = async () => {
            try {
                const res = await api.get('/settings/public');
                if (res.data) {
                    const key = type === 'terms' ? 'footer_tos' : 'footer_privacy';
                    const setting = res.data.find(s => s.key === key);
                    if (setting && setting.value) {
                        setContent(setting.value);
                    } else {
                        // High-quality default content for AdSense approval
                        if (type === 'privacy') {
                            setContent(`
                                PRIVACY POLICY
                                Last updated: April 2026

                                At Krishna Engineering Works, we prioritize the privacy of our visitors. This Privacy Protocol document contains types of information that is collected and recorded by our system and how we use it.

                                1. INFORMATION WE COLLECT
                                The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.

                                2. HOW WE USE YOUR INFORMATION
                                We use the information we collect in various ways, including to:
                                - Provide, operate, and maintain our engineering portal.
                                - Improve, personalize, and expand our services.
                                - Understand and analyze how you use our portal.
                                - Develop new products, services, features, and functionality.
                                - Communicate with you for customer service and updates.

                                3. LOG FILES
                                Krishna Engineering Works follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and a part of hosting services' analytics.

                                4. COOKIES AND WEB BEACONS
                                Like any other website, we use 'cookies'. These cookies are used to store information including visitors' preferences, and the pages on the website that the visitor accessed or visited.
                            `);
                        } else {
                            setContent(`
                                TERMS OF SERVICE
                                Last updated: April 2026

                                By accessing this website, we assume you accept these terms and conditions. Do not continue to use Krishna Engineering Works if you do not agree to take all of the terms and conditions stated on this page.

                                1. INTELLECTUAL PROPERTY
                                Unless otherwise stated, Krishna Engineering Works and/or its licensors own the intellectual property rights for all material on this website. All intellectual property rights are reserved.

                                2. USER RESTRICTIONS
                                You are specifically restricted from all of the following:
                                - Publishing any website material in any other media.
                                - Selling, sublicensing and/or otherwise commercializing any website material.
                                - Publicly performing and/or showing any website material.
                                - Using this website in any way that is or may be damaging to this website.

                                3. LIMITATION OF LIABILITY
                                In no event shall Krishna Engineering Works, nor any of its officers, directors and employees, be held liable for anything arising out of or in any way connected with your use of this website.
                            `);
                        }
                    }
                    setTitle(type === 'terms' ? 'TERMS OF SERVICE' : 'PRIVACY PROTOCOL');
                }
            } catch (err) {
                console.error("Legal sync failure:", err);
            }
        };
        fetchLegal();
        window.scrollTo(0, 0);
    }, [type]);

    return (
        <div className="bg-[#050505] min-h-screen text-white font-sans py-32 px-4">
            <div className="max-w-4xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-16 border-l-8 border-brand-accent pl-8"
                >
                    <span className="text-brand-accent font-black uppercase tracking-[0.5em] text-[10px] mb-4 block">System Directive v1.0</span>
                    <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none">{title}</h1>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/[0.02] border border-white/5 p-10 md:p-16 rounded-[3rem] backdrop-blur-3xl"
                >
                    <div className="prose prose-invert max-w-none">
                        <p className="text-gray-400 font-medium leading-relaxed whitespace-pre-line text-lg">
                            {content}
                        </p>
                    </div>
                </motion.div>

                <div className="mt-12 flex justify-center">
                    <div className="px-6 py-2 bg-brand-accent/10 border border-brand-accent/20 rounded-full">
                        <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest">End of Intelligence Brief</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalPage;
