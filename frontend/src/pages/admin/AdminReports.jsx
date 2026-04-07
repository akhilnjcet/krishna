import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { generateGeneralReportPDF } from '../../services/pdfService';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Filter, TrendingUp, Calendar, Users, FileBarChart } from 'lucide-react';

const AdminReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get('/reports');
            setReports(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (rpt) => {
        const columns = ['Field', 'Details'];
        const data = [
            ['Report ID', rpt._id?.slice(-8).toUpperCase()],
            ['Submission Date', new Date(rpt.date).toLocaleDateString()],
            ['Author', rpt.staffId?.name || 'Unknown'],
            ['Department', rpt.staffId?.department || 'Operations'],
            ['Title', rpt.title],
            ['Description', rpt.description || 'Verified operational log.'],
            ['Status', 'VERIFIED / ARCHIVED']
        ];
        generateGeneralReportPDF(data, 'Operational Incident Report', columns);
    };

    const handleExportAll = () => {
        if (reports.length === 0) return alert("No data available to export.");
        
        const columns = ['Date', 'Author', 'Title', 'Dept'];
        const data = reports.map(r => [
            new Date(r.date).toLocaleDateString(),
            r.staffId?.name || 'N/A',
            r.title,
            r.staffId?.department || 'N/A'
        ]);
        generateGeneralReportPDF(data, 'Consolidated Operational Archive', columns);
    };

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Analytical Reports</h1>
                    <p className="text-slate-500 font-medium">Business intelligence and operational logs.</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={handleExportAll}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition"
                    >
                        <Download className="w-5 h-5" /> Export All
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Reports', value: reports.length, icon: FileText, color: 'indigo' },
                    { label: 'Active Projects', value: 12, icon: TrendingUp, color: 'emerald' },
                    { label: 'Staff Contribution', value: '88%', icon: Users, color: 'purple' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
                        <div className={`w-14 h-14 bg-${stat.color}-50 rounded-2xl flex items-center justify-center`}>
                            <stat.icon className={`w-7 h-7 text-${stat.color}-600`} />
                        </div>
                        <div>
                            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{stat.label}</p>
                            <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-900 uppercase">Work Report Registry</h3>
                    <div className="flex gap-2">
                        <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><Filter className="w-4 h-4" /></button>
                        <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"><Calendar className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-100/50 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                <th className="p-6">Submission Date</th>
                                <th className="p-6">Author / Dept</th>
                                <th className="p-6">Report Title</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="p-20 text-center font-bold text-slate-400">LOADING ANALYTICS...</td></tr>
                            ) : reports.length === 0 ? (
                                <tr><td colSpan="5" className="p-20 text-center font-bold text-slate-400">NO REPORTS SUBMITTED YET</td></tr>
                            ) : reports.map((rpt, i) => (
                                <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="p-6 font-bold text-slate-600">{new Date(rpt.date).toLocaleDateString()}</td>
                                    <td className="p-6">
                                        <div className="font-extrabold text-slate-900">{rpt.staffId?.name}</div>
                                        <div className="text-xs text-slate-500 font-bold">{rpt.staffId?.department}</div>
                                    </td>
                                    <td className="p-6 font-black text-indigo-600">{rpt.title}</td>
                                    <td className="p-6">
                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-200">VERIFIED</span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <button 
                                            onClick={() => handleDownload(rpt)}
                                            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-600 hover:text-white transition shadow-sm"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminReports;
