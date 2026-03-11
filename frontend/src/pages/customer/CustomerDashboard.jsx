import React from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

const CustomerDashboard = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();

    // Verify authentication and role
    if (!isAuthenticated || user?.role !== 'customer') {
        if (user?.role === 'admin') return <Navigate to="/admin" replace />;
        if (user?.role === 'staff') return <Navigate to="/staff" replace />;
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="bg-brand-50 min-h-screen py-10 md:py-16 px-4 font-sans border-t-8 border-brand-950">
            <div className="max-w-6xl mx-auto">

                {/* Header Block */}
                <div className="bg-brand-950 text-white p-8 flex flex-col md:flex-row justify-between items-start md:items-center border-b-8 border-brand-accent shadow-[8px_8px_0_0_rgba(0,0,0,1)] mb-12">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-accent mb-2">Client Services Portal</div>
                        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter">PROJECT HUB</h1>
                    </div>

                    <div className="mt-6 md:mt-0 flex flex-col md:items-end w-full md:w-auto">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-black uppercase text-white">{user?.name || 'Client Account'}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-brand-400">ID: {(user?._id || user?.id || 'MOCK-ID').substring(0, 8)}</div>
                            </div>
                            <div className="w-12 h-12 bg-white text-brand-950 flex items-center justify-center font-black text-xl border-4 border-brand-accent">
                                {user?.name?.charAt(0) || 'C'}
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-brand-800 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest py-2 px-6 transition-colors border-2 border-brand-950 w-full sm:w-auto"
                        >
                            Secure Logout
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Metrics & Actions */}
                    <div className="lg:col-span-1 space-y-8">

                        {/* Quick Stats */}
                        <div className="bg-white border-4 border-brand-950 p-6 shadow-solid">
                            <h3 className="font-black text-brand-950 uppercase tracking-tighter text-xl mb-6 border-b-4 border-brand-100 pb-2">Account Overview</h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-brand-50 p-3 border-2 border-brand-100">
                                    <span className="text-xs font-black uppercase tracking-widest text-brand-600">Active Projects</span>
                                    <span className="text-xl font-black text-brand-950">1</span>
                                </div>
                                <div className="flex justify-between items-center bg-brand-50 p-3 border-2 border-brand-100">
                                    <span className="text-xs font-black uppercase tracking-widest text-brand-600">Pending Quotes</span>
                                    <span className="text-xl font-black text-brand-500">2</span>
                                </div>
                                <div className="flex justify-between items-center bg-brand-100 p-3 border-l-4 border-brand-accent">
                                    <span className="text-xs font-black uppercase tracking-widest text-brand-950">Balance Due</span>
                                    <span className="text-xl font-black text-brand-950">$45,000</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-brand-950 p-6 border-4 border-brand-800 text-white relative overflow-hidden">
                            <div className="absolute -bottom-10 -right-10 text-9xl text-brand-800 opacity-20 font-black">⚙</div>
                            <h3 className="font-black text-brand-accent uppercase tracking-tighter text-xl mb-6 border-b-2 border-brand-800 pb-2 relative z-10">Quick Actions</h3>

                            <div className="space-y-4 relative z-10">
                                <Link to="/quote" className="block w-full text-center bg-brand-accent hover:bg-white text-brand-950 font-black uppercase tracking-widest py-3 border-2 border-brand-950 transition-colors">
                                    Request New Quote
                                </Link>
                                <button className="block w-full text-center bg-transparent border-2 border-brand-800 hover:border-brand-accent hover:bg-brand-900 text-brand-200 hover:text-white font-black uppercase tracking-widest py-3 transition-colors">
                                    Contact Project Mgr
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Project Tracking */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Active Project Tracker */}
                        <div className="bg-white border-4 border-brand-950 p-6 sm:p-8 shadow-solid">
                            <div className="flex justify-between items-center mb-6 border-b-4 border-brand-950 pb-4">
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-brand-950">
                                    <span className="text-brand-accent mr-3">■</span>
                                    Live Project Tracker
                                </h2>
                                <span className="bg-brand-950 text-brand-accent font-black text-[10px] uppercase tracking-widest px-3 py-1 hidden sm:inline-block">IN PROGRESS</span>
                            </div>

                            <div className="mb-8">
                                <h3 className="text-xl font-black uppercase text-brand-950 mb-1">Warehouse Structural Re-Frame</h3>
                                <p className="text-sm font-bold text-brand-500 uppercase tracking-widest">Tracking ID: PRJ-9942-B</p>
                            </div>

                            {/* Progress Bar System */}
                            <div className="mb-10">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-brand-600 mb-2">
                                    <span>Phase 2 of 5</span>
                                    <span>40% Complete</span>
                                </div>
                                <div className="w-full h-6 bg-brand-100 border-4 border-brand-950 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full bg-brand-accent w-[40%] border-r-4 border-brand-950 relative overflow-hidden">
                                        {/* Striped overlay for active progress */}
                                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.1)_10px,rgba(0,0,0,0.1)_20px)] animate-[progress_1s_linear_infinite]"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Milestone Steps */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-3 bg-brand-50 border-l-4 border-green-500">
                                    <div className="w-6 h-6 bg-green-500 text-white flex items-center justify-center font-black shrink-0">✓</div>
                                    <div>
                                        <h4 className="font-black text-brand-950 uppercase text-sm">Site Audited & Blueprints Approved</h4>
                                        <p className="text-xs font-bold text-brand-500">Completed on Oct 12, 2023</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-3 bg-white border-2 border-brand-950 relative">
                                    <div className="w-6 h-6 bg-brand-accent text-brand-950 flex items-center justify-center font-black border-2 border-brand-950 shrink-0">■</div>
                                    <div>
                                        <h4 className="font-black text-brand-950 uppercase text-sm">Steel Fabrication & Delivery</h4>
                                        <p className="text-xs font-bold text-brand-600">Currently in progress at main yard.</p>
                                    </div>
                                    {/* Blinking indicator */}
                                    <span className="absolute top-4 right-4 w-2 h-2 bg-brand-accent animate-pulse"></span>
                                </div>

                                <div className="flex items-start gap-4 p-3 opacity-50 bg-brand-50 border-2 border-transparent">
                                    <div className="w-6 h-6 bg-brand-200 text-brand-500 flex items-center justify-center font-black border-2 border-brand-300 shrink-0">3</div>
                                    <div>
                                        <h4 className="font-black text-brand-950 uppercase text-sm">On-Site Erection & Welding</h4>
                                        <p className="text-xs font-bold text-brand-500">Pending materials delivery.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Invoices/Quotes Tabular Data */}
                        <div className="bg-white border-4 border-brand-950 shadow-solid overflow-hidden">
                            <div className="p-5 border-b-4 border-brand-950 bg-brand-50">
                                <h3 className="font-black text-brand-950 text-lg uppercase tracking-tighter">Financial Ledger</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[500px]">
                                    <thead>
                                        <tr className="bg-brand-950 text-white text-[10px] uppercase font-black tracking-widest">
                                            <th className="p-4">Reference</th>
                                            <th className="p-4">Type</th>
                                            <th className="p-4">Amount</th>
                                            <th className="p-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm font-bold text-brand-900 divide-y-2 divide-brand-100">
                                        <tr className="hover:bg-brand-50 transition-colors">
                                            <td className="p-4 font-black uppercase text-brand-950">INV-2023-089</td>
                                            <td className="p-4 text-brand-600">Initial Deposit</td>
                                            <td className="p-4">$15,000.00</td>
                                            <td className="p-4">
                                                <span className="bg-green-100 text-green-700 px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-green-200">PAID</span>
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-brand-50 transition-colors">
                                            <td className="p-4 font-black uppercase text-brand-950">INV-2023-102</td>
                                            <td className="p-4 text-brand-600">Milestone 2</td>
                                            <td className="p-4">$45,000.00</td>
                                            <td className="p-4">
                                                <Link to="/customer/invoice/INV-2023-102" className="bg-red-50 hover:bg-red-100 hover:text-red-700 text-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-red-200 transition-colors inline-block text-center w-full max-w-[120px]">
                                                    PAY NOW &rarr;
                                                </Link>
                                            </td>
                                        </tr>
                                        <tr className="hover:bg-brand-50 transition-colors">
                                            <td className="p-4 font-black uppercase text-brand-950">QTE-2023-155</td>
                                            <td className="p-4 text-brand-600">Additional Roofing</td>
                                            <td className="p-4">$8,500.00</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-brand-100 text-brand-950 px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-brand-950 w-full max-w-[120px] inline-block">PENDING APPROVAL</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {/* Custom Animation for Progress Bar processing effect */}
            <style jsx>{`
                @keyframes progress {
                    0% { background-position: 0 0; }
                    100% { background-position: 28px 0; }
                }
            `}</style>
        </div>
    );
};

export default CustomerDashboard;
