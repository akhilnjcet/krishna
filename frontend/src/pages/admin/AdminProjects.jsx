import React from 'react';
import { motion } from 'framer-motion';

const AdminProjects = () => {
    // Mock Data
    const projects = [
        { id: 'PRJ-9942-B', title: 'Warehouse Structural Re-Frame', client: 'ACME Corp Client', status: 'In Progress', progress: 40, date: 'Oct 12, 2023', manager: 'Field Operator 01' },
        { id: 'PRJ-1082-A', title: 'Steel Fabrication - Bridge Support', client: 'Metro City Transit', status: 'Completed', progress: 100, date: 'Sep 05, 2023', manager: 'Admin' },
        { id: 'PRJ-1100-C', title: 'Pipeline Welding Repair', client: 'Global Petro', status: 'Pending Materials', progress: 10, date: 'Nov 01, 2023', manager: 'Unassigned' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans">
            <div className="flex justify-between items-center mb-8 border-b-4 border-brand-950 pb-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Director View</div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-brand-950">Active Projects Registry</h2>
                </div>
                <button className="bg-brand-accent hover:bg-brand-400 text-brand-950 font-black uppercase tracking-widest text-xs py-3 px-6 border-4 border-brand-950 shadow-solid active:translate-y-1 active:translate-x-1 active:shadow-none transition-all">
                    + Commission New Project
                </button>
            </div>

            <div className="bg-white border-4 border-brand-950 shadow-[8px_8px_0_0_rgba(0,0,0,1)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-brand-950 text-white text-[10px] uppercase font-black tracking-widest">
                                <th className="p-4 border-r border-brand-800 border-opacity-30">Tracking ID</th>
                                <th className="p-4 border-r border-brand-800 border-opacity-30">Job Title / Client</th>
                                <th className="p-4 border-r border-brand-800 border-opacity-30">Phase %</th>
                                <th className="p-4 border-r border-brand-800 border-opacity-30">Date Commenced</th>
                                <th className="p-4 border-r border-brand-800 border-opacity-30">Lead Operator</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-bold text-brand-900 divide-y-2 divide-brand-100">
                            {projects.map((prj, i) => (
                                <motion.tr
                                    key={prj.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="hover:bg-brand-50 transition-colors"
                                >
                                    <td className="p-4 border-r border-brand-100 font-black text-brand-950">{prj.id}</td>
                                    <td className="p-4 border-r border-brand-100">
                                        <div className="font-black uppercase text-brand-950">{prj.title}</div>
                                        <div className="text-[10px] uppercase tracking-widest text-brand-500">{prj.client}</div>
                                    </td>
                                    <td className="p-4 border-r border-brand-100">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-12 text-right ${prj.progress === 100 ? 'text-green-600' : 'text-brand-950'}`}>{prj.progress}%</span>
                                            <div className="w-full h-2 bg-brand-200">
                                                <div
                                                    className={`h-full ${prj.progress === 100 ? 'bg-green-500' : 'bg-brand-accent'}`}
                                                    style={{ width: `${prj.progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 border-r border-brand-100 text-brand-600">{prj.date}</td>
                                    <td className="p-4 border-r border-brand-100">
                                        <span className={`px-2 py-1 text-[10px] uppercase font-black tracking-widest ${prj.manager === 'Unassigned' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-brand-100 text-brand-950 border border-brand-200'}`}>
                                            {prj.manager}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button className="text-[10px] font-black tracking-widest uppercase border-b-2 border-brand-950 pb-1 hover:text-brand-accent transition-colors">Manage</button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminProjects;
