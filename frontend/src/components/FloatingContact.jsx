import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, MessageCircle, ArrowRight } from 'lucide-react';
import api from '../services/api';

const FloatingContact = () => {
    const [links, setLinks] = useState({
        whatsapp: '919446000000',
        phone: '+919446000000',
        email: 'contact@krishna.com'
    });

    useEffect(() => {
        const fetchLinks = async () => {
            try {
                const res = await api.get('/settings/public');
                if (res.data) {
                    const mapped = {};
                    res.data.forEach(s => {
                        if (s.key === 'floating_whatsapp') mapped.whatsapp = s.value;
                        if (s.key === 'floating_phone') mapped.phone = s.value;
                        if (s.key === 'floating_email') mapped.email = s.value;
                    });
                    if (Object.keys(mapped).length > 0) {
                        setLinks(prev => ({ ...prev, ...mapped }));
                    }
                }
            } catch (err) {
                console.error("Relay link sync failure:", err);
            }
        };
        fetchLinks();
    }, []);

    const contacts = [
        { 
            id: 'whatsapp', 
            icon: <MessageCircle className="w-5 h-5" />, 
            label: 'Uplink WhatsApp', 
            link: `https://wa.me/${links.whatsapp}`, 
            color: 'bg-[#25D366]',
            textColor: 'text-white'
        },
        { 
            id: 'phone', 
            icon: <Phone className="w-5 h-5" />, 
            label: 'Direct Line', 
            link: links.phone.startsWith('tel:') ? links.phone : `tel:${links.phone}`, 
            color: 'bg-brand-accent',
            textColor: 'text-brand-950'
        },
        { 
            id: 'email', 
            icon: <Mail className="w-5 h-5" />, 
            label: 'Technical Mail', 
            link: links.email.startsWith('mailto:') ? links.email : `mailto:${links.email}`, 
            color: 'bg-white',
            textColor: 'text-brand-950'
        }
    ];

    return (
        <div className="fixed bottom-10 left-10 z-[100] flex flex-col gap-4 pointer-events-none">
            <AnimatePresence>
                {contacts.map((contact, idx) => (
                    <motion.a
                        key={contact.id}
                        href={contact.link}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + idx * 0.1, duration: 0.5 }}
                        className={`pointer-events-auto flex items-center gap-4 p-4 rounded-2xl shadow-2xl group relative overflow-hidden transition-all hover:pr-12 ${contact.color} ${contact.textColor} border-2 border-black/10`}
                    >
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        
                        <div className="relative z-10 flex items-center justify-center">
                            {contact.icon}
                        </div>
                        
                        <div className="flex flex-col whitespace-nowrap overflow-hidden max-w-0 group-hover:max-w-[200px] transition-all duration-500 ease-in-out">
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 opacity-60">System Link</span>
                            <span className="text-xs font-black uppercase tracking-tight">{contact.label}</span>
                        </div>

                        <div className="absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                    </motion.a>
                ))}
            </AnimatePresence>
            
            {/* BRAVO UNIT DEPLOYMENT MARKER */}
            <div className="mt-4 px-4 py-2 bg-brand-950/40 backdrop-blur-md border border-white/5 rounded-full inline-flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-ping"></div>
                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.3em]">Direct Comms Active</span>
            </div>
        </div>
    );
};

export default FloatingContact;
