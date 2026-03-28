import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calendar, User, Tag, ArrowRight, Loader2, 
    AlertCircle, Search, Radio, Terminal
} from 'lucide-react';
import api from '../services/api';
import { getDirectImageUrl } from '../utils/imageUtils';

const Blog = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const res = await api.get('/blogs');
                setPosts(res.data);
            } catch (err) {
                console.error("Archive fetch failure:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, []);

    const filteredPosts = posts.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-[#050505] min-h-screen pb-32 font-sans text-white">

            {/* CINEMATIC HEADER */}
            <div className="relative pt-32 pb-24 px-4 overflow-hidden border-b-[1px] border-white/5">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-accent/5 blur-[120px] rounded-full"></div>

                <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 text-brand-accent font-black text-[10px] uppercase tracking-[0.4em] mb-6"
                    >
                        <Radio className="w-4 h-4" /> Intel Matrix
                    </motion.div>
                    <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter mb-8 text-center italic">
                        FIELD <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-white">REPORTS.</span>
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto font-bold text-center uppercase tracking-tight">
                        Technical bulletins, operational guides, and structural engineering insights.
                    </p>
                    
                    <div className="mt-12 relative w-full max-w-xl">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-700" />
                        <input 
                            type="text" 
                            placeholder="FILTER INTELLIGENCE ARCHIVES..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-6 pl-16 pr-8 text-[11px] font-black uppercase tracking-[0.3em] focus:border-brand-accent outline-none backdrop-blur-3xl transition-all"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <Loader2 className="w-16 h-16 text-brand-accent animate-spin mb-8" />
                        <p className="font-black uppercase tracking-[0.5em] text-[10px] text-gray-600">Retrieving Secure Archives...</p>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-40 bg-white/[0.01] rounded-[4rem] border-2 border-dashed border-white/5">
                        <AlertCircle className="w-20 h-20 text-white/5 mx-auto mb-8" />
                        <p className="text-gray-600 font-black uppercase tracking-[0.4em]">No matching intel logs found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        {/* Main Feed */}
                        <div className="lg:col-span-8 space-y-12">
                            <AnimatePresence>
                                {filteredPosts.map((post, i) => (
                                    <motion.div
                                        key={post._id}
                                        initial={{ opacity: 0, y: 50 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-100px" }}
                                        transition={{ duration: 0.8, delay: (k => k * 0.1)(i) }}
                                        className="bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-3xl flex flex-col md:flex-row group hover:border-brand-accent/30 transition-all duration-500"
                                    >
                                        <div className="w-full md:w-[40%] h-80 md:h-auto relative overflow-hidden">
                                            <img 
                                                src={getDirectImageUrl(post.image)} 
                                                alt={post.title} 
                                                className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000" 
                                            />
                                            <div className="absolute top-8 left-8 bg-brand-accent text-black font-black px-4 py-1.5 text-[9px] uppercase tracking-widest rounded-full shadow-2xl">
                                                {post.category}
                                            </div>
                                        </div>
                                        <div className="w-full md:w-[60%] p-10 lg:p-16 flex flex-col justify-center relative">
                                            <div className="absolute top-0 right-0 p-10 text-white/5 pointer-events-none">
                                                <Terminal className="w-32 h-32" />
                                            </div>

                                            <div className="flex items-center gap-6 text-[9px] font-black text-gray-600 uppercase tracking-[0.4em] mb-6">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3.5 h-3.5 text-brand-accent" /> 
                                                    {new Date(post.createdAt).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 text-brand-accent" /> 
                                                    {post.authorName}
                                                </div>
                                            </div>

                                            <h2 className="text-3xl lg:text-4xl font-black text-white mb-6 uppercase tracking-tighter leading-tight group-hover:text-brand-accent transition-colors italic">
                                                {post.title}
                                            </h2>
                                            
                                            <p className="text-gray-500 mb-10 font-bold uppercase tracking-tight text-sm leading-relaxed line-clamp-3">
                                                {post.excerpt || post.content.substring(0, 150) + '...'}
                                            </p>

                                            <div className="mt-auto">
                                                <button className="group/btn relative inline-flex items-center gap-4 bg-white/5 text-white px-8 py-4 rounded-xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white hover:text-black transition-all active:scale-95 overflow-hidden">
                                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-accent translate-y-full group-hover/btn:translate-y-0 transition-transform"></div>
                                                    Access Report <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-4 space-y-12">
                            <div className="p-10 bg-white/[0.02] border border-white/5 rounded-[3rem] backdrop-blur-3xl sticky top-32">
                                <h3 className="text-brand-accent font-black text-[10px] uppercase tracking-[0.4em] mb-10 flex items-center gap-4">
                                    <Tag className="w-4 h-4" /> Operations Matrix
                                </h3>
                                
                                <div className="space-y-4">
                                    {['Welding Eng.', 'Steel Fabrication', 'Structural Audits', 'Safety Protocols'].map((cat, idx) => (
                                        <div key={idx} className="group cursor-pointer flex justify-between items-center p-5 bg-white/[0.02] rounded-2xl border border-white/5 hover:border-brand-accent/40 transition-all">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">&gt; {cat}</span>
                                            <span className="bg-brand-accent text-black font-black px-2 py-0.5 text-[8px] rounded-md">LIVE</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-20 p-8 bg-brand-accent text-brand-950 rounded-[2rem] relative overflow-hidden shadow-2xl">
                                    <div className="absolute -right-4 -bottom-4 opacity-10">
                                        <Radio className="w-32 h-32" />
                                    </div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter italic leading-none mb-4">DISPATCH LIST</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-8 opacity-60 italic">Structural Integrity Bulletins</p>
                                    <div className="space-y-3">
                                        <input type="email" placeholder="UPLINK EMAIL..." className="w-full bg-white/20 border-2 border-transparent focus:border-brand-950 placeholder:text-brand-950/40 p-5 rounded-xl text-[10px] font-black outline-none" />
                                        <button className="w-full bg-brand-950 text-brand-accent font-black uppercase tracking-[0.4em] py-5 rounded-xl text-[10px] hover:bg-white hover:text-black transition-all">Enable Dispatch</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Blog;
