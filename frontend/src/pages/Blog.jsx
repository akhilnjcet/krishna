import React from 'react';
import { motion } from 'framer-motion';

const blogPosts = [
    {
        id: 1,
        title: 'Advanced Techniques in Industrial TIG Welding',
        excerpt: 'TIG welding offers unparalleled precision for heavy fabrication. Learn how our certified welders utilize advanced tungsten inert gas techniques for critical joints.',
        image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        date: 'Oct 12, 2026',
        author: 'Chief Engineer',
        category: 'Welding'
    },
    {
        id: 2,
        title: 'The Future of Heavy Steel Buildings',
        excerpt: 'Pre-engineered immense steel buildings are revolutionizing industrial construction by drastically reducing timeline while maximizing load-bearing integrity.',
        image: 'https://images.unsplash.com/photo-1541888081628-910c22faaa95?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        date: 'Sep 28, 2026',
        author: 'Structural Designer',
        category: 'Construction'
    },
    {
        id: 3,
        title: 'Maintaining Industrial Metal Roofing',
        excerpt: 'A comprehensive operational guide on inspecting, cleaning, and repairing heavy-gauge metal roofing to prevent costly structural liabilities.',
        image: 'https://images.unsplash.com/photo-1504307651254-35680f356f12?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        date: 'Sep 15, 2026',
        author: 'Roofing Specialist',
        category: 'Maintenance'
    }
];

const Blog = () => {
    return (
        <div className="bg-brand-50 min-h-screen pb-24 font-sans">

            {/* Heavy Header */}
            <div className="bg-brand-950 pt-24 pb-20 px-4 border-b-8 border-brand-accent">
                <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                    <div className="bg-white text-brand-950 uppercase font-black tracking-widest text-[10px] sm:text-xs px-4 py-1.5 inline-block mb-6 border-x-4 border-brand-accent">
                        Field Reports
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4 leading-none">
                        INDUSTRY <span className="text-brand-accent">INTEL</span>
                    </h1>
                    <p className="text-lg text-brand-400 font-medium max-w-2xl mt-4">
                        Technical bulletins, operational guides, and structural engineering insights.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* Main Feed */}
                <div className="lg:col-span-8 space-y-12">
                    {blogPosts.map((post, i) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.4, delay: i * 0.1 }}
                            className="bg-white border-4 border-brand-950 shadow-solid flex flex-col md:flex-row group hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-300"
                        >
                            <div className="w-full md:w-2/5 h-64 md:h-auto relative border-b-4 md:border-b-0 md:border-r-4 border-brand-950 overflow-hidden">
                                <img src={post.image} alt={post.title} className="w-full h-full object-cover filter contrast-125 grayscale-[20%] group-hover:grayscale-0 transition-all duration-500" />
                                <div className="absolute top-0 left-0 bg-brand-accent text-brand-950 font-black px-3 py-1 text-xs uppercase tracking-widest border-b-4 border-r-4 border-brand-950">
                                    {post.category}
                                </div>
                            </div>
                            <div className="w-full md:w-3/5 p-8 lg:p-10 flex flex-col justify-center bg-white">
                                <div className="flex items-center text-[10px] font-black tracking-widest text-brand-500 mb-4 space-x-4 uppercase">
                                    <span>{post.date}</span>
                                    <span className="text-brand-accent font-black text-lg leading-none mt-[-4px]">•</span>
                                    <span>{post.author}</span>
                                </div>
                                <h2 className="text-2xl lg:text-3xl font-black text-brand-950 mb-4 uppercase tracking-tighter leading-tight group-hover:text-brand-accent transition-colors">{post.title}</h2>
                                <div className="w-12 h-1 bg-brand-950 mb-4"></div>
                                <p className="text-brand-700 mb-8 font-medium leading-relaxed">{post.excerpt}</p>
                                <div className="mt-auto">
                                    <button className="bg-brand-950 text-white hover:bg-brand-accent hover:text-brand-950 font-black tracking-widest uppercase text-xs px-6 py-3 transition-colors border-2 border-transparent">
                                        Read Report &rarr;
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-10">

                    {/* AdSense Stub Sidebar */}
                    <div className="bg-gray-200 border-4 border-gray-300 border-dashed h-64 flex flex-col items-center justify-center p-8 text-center text-gray-500 text-sm font-bold uppercase tracking-widest relative">
                        <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                        ADVERTISEMENT BLOCK
                        <div className="absolute top-0 right-0 bg-gray-300 text-white text-[8px] px-1 m-1">AD</div>
                    </div>

                    {/* Categories */}
                    <div className="bg-white border-4 border-brand-950 p-8 shadow-solid">
                        <h3 className="text-2xl font-black text-brand-950 mb-6 uppercase tracking-tighter border-b-4 border-brand-accent pb-2 inline-block">
                            Operations
                        </h3>
                        <ul className="space-y-3 mt-4">
                            {['Welding Eng.', 'Steel Fabrication', 'Structural Audits', 'Safety Protocols'].map((cat, idx) => (
                                <li key={idx} className="flex justify-between items-center group cursor-pointer border-b-2 border-brand-100 pb-3 hover:border-brand-950 transition-colors">
                                    <span className="text-brand-800 font-bold uppercase text-sm group-hover:text-brand-accent transition-colors">&gt;&gt; {cat}</span>
                                    <span className="bg-brand-100 text-brand-950 group-hover:bg-brand-accent font-black px-2 py-1 text-xs transition-colors">{Math.floor(Math.random() * 20) + 1}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Newsletter / Bulletin */}
                    <div className="bg-brand-950 border-4 border-brand-accent p-8 text-white relative">
                        <div className="absolute top-0 right-0 bg-brand-accent w-12 h-12 flex items-center justify-center -mr-6 -mt-6 transform rotate-12">
                            <span className="text-brand-950 font-black text-2xl animate-pulse">!</span>
                        </div>
                        <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter text-brand-accent">Dispatch List</h3>
                        <p className="text-brand-300 text-sm font-medium mb-6">Receive priority operational bulletins and structural insights.</p>
                        <div>
                            <input type="email" placeholder="ENTER EMAIL ADDRESS" className="w-full bg-white border-4 border-transparent focus:border-brand-accent rounded-none px-4 py-3 text-brand-950 font-bold text-sm outline-none mb-3" />
                            <button className="w-full bg-brand-accent hover:bg-white text-brand-950 font-black uppercase tracking-widest text-sm py-4 transition-colors">Sub to Dispatch</button>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default Blog;
