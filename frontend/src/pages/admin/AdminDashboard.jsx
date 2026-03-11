import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-8 font-sans">

            {/* Heavy Top Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                <div className="bg-white p-6 border-4 border-brand-950 shadow-[4px_4px_0_0_#000] flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-brand-100 border-b-4 border-l-4 border-brand-950 flex items-center justify-center font-black text-xl text-brand-500 group-hover:bg-brand-accent group-hover:text-brand-950 transition-colors">🏗</div>
                    <div>
                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Active Projects</p>
                        <h3 className="text-5xl font-black text-brand-950 tracking-tighter">12</h3>
                    </div>
                    <div className="mt-6 w-full h-1 bg-brand-100"><div className="w-[60%] h-full bg-brand-950"></div></div>
                </div>

                <div className="bg-white p-6 border-4 border-brand-950 shadow-[4px_4px_0_0_#000] flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-brand-100 border-b-4 border-l-4 border-brand-950 flex items-center justify-center font-black text-xl text-brand-500 group-hover:bg-brand-accent group-hover:text-brand-950 transition-colors">¥</div>
                    <div>
                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Pending Quotes</p>
                        <h3 className="text-5xl font-black text-brand-950 tracking-tighter">5</h3>
                    </div>
                    <div className="mt-6 text-xs font-bold text-brand-500 uppercase">+2 since yesterday</div>
                </div>

                <div className="bg-white p-6 border-4 border-brand-950 shadow-[4px_4px_0_0_#000] flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-brand-100 border-b-4 border-l-4 border-brand-950 flex items-center justify-center font-black text-xl text-brand-500 group-hover:bg-brand-accent group-hover:text-brand-950 transition-colors">♙</div>
                    <div>
                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest mb-2">Attendance Today</p>
                        <h3 className="text-5xl font-black text-brand-950 tracking-tighter">42<span className="text-xl text-brand-400 font-bold ml-1">/45</span></h3>
                    </div>
                    <div className="mt-6 text-xs font-bold text-red-500 uppercase">3 absent (FaceAPI log)</div>
                </div>

                <div className="bg-brand-950 text-white p-6 border-4 border-brand-accent shadow-[4px_4px_0_0_#FFB612] flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-transform">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-brand-800 border-b-4 border-l-4 border-brand-accent flex items-center justify-center font-black text-xl text-brand-accent">$</div>
                    <div>
                        <p className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-2">Unpaid Invoices</p>
                        <h3 className="text-5xl font-black tracking-tighter text-brand-accent">84<span className="text-2xl ml-1">K</span></h3>
                    </div>
                    <Link to="/admin/invoices" className="mt-6 text-xs font-black uppercase tracking-widest hover:text-white transition-colors">Review Ledgers &rarr;</Link>
                </div>

            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Recent Projects Table */}
                <div className="bg-white col-span-1 lg:col-span-2 border-4 border-brand-950 shadow-solid">
                    <div className="p-5 border-b-4 border-brand-950 flex justify-between items-center bg-brand-50">
                        <h3 className="font-black text-brand-950 text-xl uppercase tracking-tighter">Active Projects Array</h3>
                        <button className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-950 border-2 border-brand-300 hover:border-brand-950 px-3 py-1 transition-all">View Full List</button>
                    </div>
                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-brand-950 text-white text-[10px] uppercase font-black tracking-widest">
                                    <th className="p-4">Project Ident</th>
                                    <th className="p-4">Client</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Progress</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-brand-900 divide-y-4 divide-brand-100">
                                <tr className="hover:bg-brand-50 transition-colors">
                                    <td className="p-4 font-black uppercase text-brand-950">National Stadium Truss</td>
                                    <td className="p-4 font-bold">Apex Builders</td>
                                    <td className="p-4">
                                        <span className="bg-brand-950 text-brand-accent px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-brand-950">Active Sys</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="w-full bg-brand-100 h-3 border-2 border-brand-950"><div className="bg-brand-accent h-full border-r-2 border-brand-950" style={{ width: '60%' }}></div></div>
                                    </td>
                                </tr>
                                <tr className="hover:bg-brand-50 transition-colors">
                                    <td className="p-4 font-black uppercase text-brand-950">Warehouse Pipeline TIG</td>
                                    <td className="p-4 font-bold">ChemCorp</td>
                                    <td className="p-4">
                                        <span className="bg-white text-brand-950 px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-brand-950">Awaiting Mat.</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="w-full bg-brand-100 h-3 border-2 border-brand-950"><div className="bg-brand-accent h-full border-r-2 border-brand-950" style={{ width: '10%' }}></div></div>
                                    </td>
                                </tr>
                                <tr className="hover:bg-brand-50 transition-colors">
                                    <td className="p-4 font-black uppercase text-brand-950">Automotive Plant Roof</td>
                                    <td className="p-4 font-bold">Ford Motors</td>
                                    <td className="p-4">
                                        <span className="bg-green-500 text-white px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-green-600">Near Finish</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="w-full bg-brand-100 h-3 border-2 border-brand-950"><div className="bg-green-500 h-full border-r-2 border-green-600" style={{ width: '90%' }}></div></div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* System Alerts */}
                <div className="bg-white col-span-1 border-4 border-red-600 shadow-[4px_4px_0_0_#DC2626]">
                    <div className="p-5 border-b-4 border-red-600 bg-red-50 flex items-center gap-3">
                        <span className="text-red-600 font-black text-2xl animate-pulse">!</span>
                        <h3 className="font-black text-red-700 text-xl uppercase tracking-tighter">System Priority</h3>
                    </div>
                    <div className="p-6 space-y-6">

                        <div className="border-l-4 border-red-500 pl-4">
                            <h4 className="font-black text-brand-950 uppercase text-sm mb-1">3 Staff Absent W.O.L.</h4>
                            <p className="text-brand-600 text-xs font-bold leading-relaxed">System log: Face-API rollcall failed at 09:00 AM.</p>
                            <button className="mt-3 bg-red-50 text-red-600 border-2 border-red-200 hover:border-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors">
                                Audit Log &rarr;
                            </button>
                        </div>

                        <div className="border-l-4 border-brand-100 pt-4 border-t-2 border-t-brand-100 pl-4 mt-4">
                            <h4 className="font-black text-brand-950 uppercase text-sm mb-1">New Quote Request</h4>
                            <p className="text-brand-600 text-xs font-bold leading-relaxed">AI Pre-Calc: $45,000.<br />Location: Texas Sector.</p>
                            <button className="mt-3 bg-brand-50 text-brand-950 border-2 border-brand-200 hover:border-brand-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors">
                                Review File &rarr;
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminDashboard;
