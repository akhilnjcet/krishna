import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const Quote = () => {
    const [searchParams] = useSearchParams();
    const initialService = searchParams.get('service') || 'welding';

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        location: '',
        serviceType: initialService,
        description: '',
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [estimation, setEstimation] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('/api/quotes', formData);
            setSuccess(true);
            setEstimation(response.data.estimatedCost);
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred while submitting the operation request.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="bg-brand-50 min-h-screen py-24 px-4 flex items-center justify-center font-sans relative overflow-hidden">

            {/* Background Industrial Accents */}
            <div className="absolute top-0 left-0 w-32 h-full bg-[repeating-linear-gradient(45deg,rgba(0,0,0,0.03)_0,rgba(0,0,0,0.03)_10px,transparent_10px,transparent_20px)] border-r-4 border-brand-950/10"></div>

            <div className="max-w-4xl mx-auto w-full z-10 ml-0 md:ml-16">

                <div className="mb-10 pl-4 border-l-8 border-brand-accent">
                    <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-4xl md:text-6xl font-black text-brand-950 uppercase tracking-tighter leading-none mb-3">
                        JOB <span className="text-gray-400">ESTIMATE</span>
                    </motion.h1>
                    <p className="text-lg text-brand-700 font-bold uppercase tracking-widest text-sm">
                        Automated Heavy Industry Cost Calculator
                    </p>
                </div>

                {success ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white border-4 border-brand-950 shadow-solid p-10 md:p-16 relative"
                    >
                        <div className="bg-[#4CAF50] text-white font-black uppercase text-4xl w-20 h-20 flex items-center justify-center mb-8 border-4 border-brand-950 transform rotate-3 shadow-solid">
                            ✓
                        </div>

                        <h2 className="text-4xl font-black text-brand-950 mb-4 uppercase tracking-tighter">DATA LOGGED</h2>
                        <p className="text-brand-600 mb-10 text-lg font-medium max-w-xl">
                            Your project specifications have been fed into our proprietary estimation engine. Preliminary results are ready.
                        </p>

                        {estimation && (
                            <div className="bg-brand-100 border-4 border-brand-950 p-8 mb-10 relative overflow-hidden">
                                <div className="absolute top-0 left-0 bg-brand-accent text-brand-950 text-[10px] font-black tracking-widest uppercase px-3 py-1 border-b-2 border-r-2 border-brand-950">
                                    SYSTEM OUTPUT
                                </div>
                                <div className="mt-4">
                                    <h3 className="text-brand-600 font-bold uppercase tracking-widest text-xs mb-1">Calculated Estimate</h3>
                                    <div className="text-6xl sm:text-7xl font-black text-brand-950 tracking-tighter">
                                        <span className="text-brand-400 text-4xl mr-1">$</span>
                                        {estimation.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                                <div className="bg-brand-950 text-white text-[10px] uppercase font-bold p-2 mt-6">
                                    NOTICE: Output is a base calculation only. Subject to material index fluctuation.
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => { setSuccess(false); setFormData({ ...formData, description: '' }); setEstimation(null); }}
                            className="bg-white border-4 border-brand-950 hover:bg-brand-950 hover:text-white text-brand-950 font-black uppercase tracking-widest py-4 px-8 transition-colors select-none"
                        >
                            Start New Entry
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border-4 border-brand-950 shadow-solid"
                    >
                        {/* Form Header Bar */}
                        <div className="bg-brand-950 text-white p-4 flex justify-between items-center border-b-4 border-brand-accent">
                            <span className="font-black tracking-widest uppercase text-xs">Job Parameter Input</span>
                            <span className="text-brand-accent font-black">SYS.1</span>
                        </div>

                        <div className="p-8 md:p-12 bg-[#FDFDFD]">
                            {error && <div className="bg-red-50 text-red-700 p-4 border-4 border-red-600 text-sm font-bold uppercase tracking-wide mb-8 flex items-center gap-3">
                                <span className="text-xl">⚠️</span> {error}
                            </div>}

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div>
                                        <label className="block text-xs uppercase font-black text-brand-950 mb-2 tracking-widest">Client Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border-2 border-brand-300 focus:border-brand-950 focus:ring-0 transition-colors bg-white font-medium text-brand-900 rounded-none shadow-[2px_2px_0_0_#d4d4d4]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase font-black text-brand-950 mb-2 tracking-widest">Contact Phone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            required
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border-2 border-brand-300 focus:border-brand-950 focus:ring-0 transition-colors bg-white font-medium text-brand-900 rounded-none shadow-[2px_2px_0_0_#d4d4d4]"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    <div>
                                        <label className="block text-xs uppercase font-black text-brand-950 mb-2 tracking-widest">Site Location</label>
                                        <input
                                            type="text"
                                            name="location"
                                            required
                                            value={formData.location}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border-2 border-brand-300 focus:border-brand-950 focus:ring-0 transition-colors bg-white font-medium text-brand-900 rounded-none shadow-[2px_2px_0_0_#d4d4d4]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase font-black text-brand-950 mb-2 tracking-widest">Operation Type</label>
                                        <div className="relative">
                                            <select
                                                name="serviceType"
                                                value={formData.serviceType}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 border-2 border-brand-300 focus:border-brand-950 focus:ring-0 transition-colors bg-white font-bold text-brand-900 appearance-none rounded-none shadow-[2px_2px_0_0_#d4d4d4] uppercase text-sm"
                                            >
                                                <option value="welding">01 - Welding Service</option>
                                                <option value="roofing">02 - Metal Roofing</option>
                                                <option value="truss">03 - Truss Assembly</option>
                                                <option value="fabrication">04 - Component Fabrication</option>
                                                <option value="construction">05 - Site Construction</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-brand-950 font-bold">
                                                ▼
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase font-black text-brand-950 mb-2 tracking-widest">Work Order Specs</label>
                                    <textarea
                                        name="description"
                                        required
                                        rows="5"
                                        value={formData.description}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 border-2 border-brand-300 focus:border-brand-950 focus:ring-0 transition-colors bg-white font-medium text-brand-900 resize-none rounded-none shadow-[2px_2px_0_0_#d4d4d4]"
                                        placeholder="Enter structural dimensions, needed alloy type, and operational timeline..."
                                    ></textarea>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`w-full bg-brand-accent hover:bg-brand-accentHover text-brand-950 font-black tracking-widest uppercase text-lg py-5 border-4 border-brand-950 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center justify-center ${loading ? 'opacity-80 pointer-events-none' : ''}`}
                                    >
                                        {loading ? (
                                            <span className="animate-pulse">PROCESSING DATA...</span>
                                        ) : 'EXECUTE CALCULATION'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Quote;
