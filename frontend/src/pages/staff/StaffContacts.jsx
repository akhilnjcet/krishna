import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { 
    Users, Phone, Mail, Search, 
    Loader2, UserCheck, Shield, ExternalLink,
    MessageCircle, MapPin, BadgeCheck, PhoneCall
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const StaffContacts = () => {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchContacts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/auth/users?role=customer');
            setContacts(res.data);
        } catch (err) {
            console.error("Connectivity issue while fetching directories:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const filteredContacts = contacts.filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] italic">Accessing Encrypted Directory...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
            
            {/* Contextual Header */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <UserCheck className="w-40 h-40" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-2">Operational Resources</div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Field Contacts</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-3 flex items-center gap-2">
                            <BadgeCheck className="w-4 h-4 text-emerald-500" />
                            Official Customer Communications Directory
                        </p>
                    </div>

                    <div className="relative group w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search by Identity or Metadata..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-indigo-600/20 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-300 shadow-inner"
                        />
                    </div>
                </div>
            </div>

            {/* Grid of Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence>
                    {filteredContacts.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-[0.2em] italic opacity-50">
                            No authorized identities found in this sector.
                        </div>
                    ) : filteredContacts.map((contact, i) => (
                        <motion.div 
                            key={contact._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:shadow-indigo-100 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-[4rem] group-hover:bg-indigo-600 transition-colors duration-500 flex items-center justify-center pl-4 pb-4">
                                <ExternalLink className="w-5 h-5 text-indigo-200 group-hover:text-white" />
                            </div>

                            <div className="flex items-center gap-6 mb-8 mt-2">
                                <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center font-black text-white text-2xl shadow-xl group-hover:scale-105 transition-transform duration-500">
                                    {contact.name?.charAt(0)}
                                </div>
                                <div className="text-left">
                                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight group-hover:text-indigo-600 transition-colors leading-none mb-2">{contact.name}</h3>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Verified Client</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group-hover:bg-white transition-colors">
                                    <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600 border border-slate-50">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <div className="text-left min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Corporate Email</p>
                                        <p className="text-sm font-bold text-slate-700 truncate">{contact.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group-hover:bg-white transition-colors">
                                    <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600 border border-slate-50">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Mobile Registry</p>
                                        <p className="text-sm font-bold text-slate-700">{contact.phone || contact.phoneNumber || 'Unlisted'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <a 
                                    href={`tel:${contact.phone || contact.phoneNumber}`}
                                    className="flex-1 bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10"
                                >
                                    <PhoneCall className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Voice</span>
                                </a>
                                <a 
                                    href={`https://wa.me/${(contact.phone || contact.phoneNumber)?.replace(/\D/g, '') || ''}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 border-2 border-slate-100 bg-white text-slate-600 p-4 rounded-2xl flex items-center justify-center gap-2 hover:border-indigo-200 hover:text-indigo-600 transition-all"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Message</span>
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default StaffContacts;
