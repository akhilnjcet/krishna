import React from 'react';
import { motion } from 'framer-motion';

const AdminStaff = () => {
    // Mock Data
    const staff = [
        { id: 'STF-01', name: 'Field Operator 01', role: 'Welding Specialist', status: 'Active Shift', currProject: 'PRJ-9942-B', attendance: '100% (Face Verified)' },
        { id: 'STF-02', name: 'Field Operator 02', role: 'Heavy Machinery Driver', status: 'Off Duty', currProject: 'N/A', attendance: '85% (Sick Leave Oct 12)' },
        { id: 'STF-03', name: 'Site Supervisor A', role: 'Project Manager', status: 'Active Shift', currProject: 'PRJ-1082-A', attendance: '100% (Face Verified)' },
    ];

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans">
            <div className="flex justify-between items-center mb-8 border-b-4 border-brand-950 pb-4">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Human Resources</div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-brand-950">Personnel Deployment</h2>
                </div>
                <button className="bg-brand-950 hover:bg-brand-800 text-white font-black uppercase tracking-widest text-xs py-3 px-6 border-4 border-brand-950 shadow-solid active:translate-y-1 active:translate-x-1 active:shadow-none transition-all">
                    Access AI Attendance Logs
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {staff.map((person, i) => (
                    <motion.div
                        key={person.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={`border-4 border-brand-950 p-6 flex flex-col justify-between ${person.status === 'Active Shift' ? 'bg-white shadow-[8px_8px_0_0_rgba(0,0,0,1)]' : 'bg-brand-50 opacity-80'
                            }`}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-16 h-16 bg-brand-200 border-2 border-brand-950 flex items-center justify-center font-black text-2xl text-brand-500 mb-4">
                                    {person.name.charAt(0)}
                                </div>
                                <span className={`px-2 py-1 text-[10px] uppercase font-black tracking-widest ${person.status === 'Active Shift' ? 'bg-green-100 border border-green-500 text-green-700' : 'bg-brand-200 border border-brand-400 text-brand-600'
                                    }`}>
                                    {person.status}
                                </span>
                            </div>

                            <h3 className="text-xl font-black text-brand-950 uppercase tracking-tighter mb-1">{person.name}</h3>
                            <p className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-6">ID: {person.id} | {person.role}</p>

                            <div className="space-y-3 mb-6">
                                <div className="bg-brand-50 p-3 border-l-4 border-brand-950">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Current Assignment</div>
                                    <div className="font-bold text-brand-950">{person.currProject}</div>
                                </div>
                                <div className="bg-brand-50 p-3 border-l-4 border-brand-accent">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-500 mb-1">Attendance Record (Past 30d)</div>
                                    <div className="font-bold text-brand-950">{person.attendance}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 border-t-2 border-brand-100 pt-4 mt-auto">
                            <button className="flex-1 bg-white hover:bg-brand-50 text-brand-950 font-black uppercase tracking-widest text-[10px] py-2 border-2 border-brand-950 transition-colors">
                                Profile
                            </button>
                            <button className="flex-1 bg-brand-accent hover:bg-brand-400 text-brand-950 font-black uppercase tracking-widest text-[10px] py-2 border-2 border-brand-950 transition-colors">
                                Re-Assign
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AdminStaff;
