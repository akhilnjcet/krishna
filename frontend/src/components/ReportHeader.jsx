import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, Loader2, Share2, Info } from 'lucide-react';
import { generateGeneralReportPDF } from '../services/pdfService';

const ReportHeader = ({ title, subtitle, data, columns, specializedReport }) => {
    const [generating, setGenerating] = useState(false);

    const handleDownload = async () => {
        setGenerating(true);
        try {
            if (specializedReport) {
                // If a specialized function is passed, use it
                await specializedReport();
            } else if (data && columns) {
                // Otherwise use the generic tabular generator
                generateGeneralReportPDF(data, title, columns);
            } else {
                alert("Report Generation Error: No data provided for this node.");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="mb-10 group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-white border-l-[12px] border-slate-900 rounded-r-[2rem] shadow-xl relative overflow-hidden transition-all hover:shadow-2xl">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 italic">SECURE DATA TERMINAL</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-slate-900 leading-none mb-3">
                        {title} <span className="text-slate-300 font-light italic">Report</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] flex items-center gap-2">
                        <Info className="w-3 h-3" /> {subtitle || 'Operational Analytics and Performance Metrics'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 relative z-10">
                    <button 
                        onClick={handleDownload}
                        disabled={generating}
                        className="flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all active:scale-95 shadow-lg shadow-slate-900/20 disabled:opacity-50"
                    >
                        {generating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileDown className="w-4 h-4 group-hover:animate-bounce" />
                        )}
                        {generating ? 'Compiling...' : 'Download PDF Report'}
                    </button>
                    
                    <button className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-200">
                        <Share2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            {/* Legend / Status Strip */}
            <div className="mt-4 flex items-center gap-6 px-4">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Database Sync: ACTIVE</span>
                </div>
                <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Platform: {navigator.platform.includes('Win') ? 'Windows Node' : 'Mobile Web'}</span>
                </div>
            </div>
        </div>
    );
};

export default ReportHeader;
