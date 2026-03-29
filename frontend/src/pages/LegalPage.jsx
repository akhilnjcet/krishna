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
                    if (setting) setContent(setting.value);
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
