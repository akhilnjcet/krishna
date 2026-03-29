import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import AttendanceScanner from './AttendanceScanner';

const StaffDashboard = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();

    // Verify authentication and role
    if (!isAuthenticated || user?.role !== 'staff') {
        if (user?.role === 'admin') return <Navigate to="/admin" replace />;
        if (user?.role === 'customer') return <Navigate to="/customer" replace />;
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        logout();
        window.location.replace('/login');
    };

    return (
        <div className="bg-brand-50 min-h-screen py-16 px-4 font-sans border-t-8 border-brand-950">
            <div className="max-w-6xl mx-auto">

                {/* Header System */}
                <div className="bg-brand-950 text-white p-8 flex flex-col md:flex-row justify-between items-start md:items-center border-b-8 border-brand-accent shadow-[8px_8px_0_0_rgba(0,0,0,1)] mb-12">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-accent mb-2">Staff Operations Module</div>
                        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter">OPERATOR PORTAL</h1>
                    </div>

                    <div className="mt-6 md:mt-0 flex flex-col md:items-end w-full md:w-auto">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-black uppercase text-white">{user?.name || 'Operator'}</div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-brand-400">ID: {(user?._id || user?.id || 'MOCK-ID').substring(0, 8)}</div>
                            </div>
                            <div className="w-12 h-12 bg-white text-brand-950 flex items-center justify-center font-black text-xl border-4 border-brand-accent">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-brand-800 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest py-2 px-6 transition-colors border-2 border-brand-950 w-full sm:w-auto"
                        >
                            End Shift [Logout]
                        </button>
                    </div>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                    {/* Primary Function: Attendance */}
                    <div className="md:col-span-8 space-y-8">
                        <AttendanceScanner />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">
                            <div 
                                onClick={() => navigate('/staff/tasks')}
                                className="bg-white border-4 border-brand-950 p-6 flex flex-col items-center justify-center text-center shadow-solid hover:-translate-y-1 transition-transform cursor-pointer"
                            >
                                <div className="w-16 h-16 bg-brand-100 flex items-center justify-center font-black text-3xl text-brand-950 mb-4 border-2 border-brand-950">
                                    ☰
                                </div>
                                <h3 className="font-black text-brand-950 uppercase tracking-tight text-lg mb-2">My Tasks</h3>
                                <p className="text-xs text-brand-600 font-bold">Review active structural assignments.</p>
                            </div>

                            <div 
                                onClick={() => navigate('/staff/leave')}
                                className="bg-white border-4 border-brand-950 p-6 flex flex-col items-center justify-center text-center shadow-solid hover:-translate-y-1 transition-transform cursor-pointer"
                            >
                                <div className="w-16 h-16 bg-brand-100 flex items-center justify-center font-black text-3xl text-brand-950 mb-4 border-2 border-brand-950">
                                    ⚕
                                </div>
                                <h3 className="font-black text-brand-950 uppercase tracking-tight text-lg mb-2">Leave Request</h3>
                                <p className="text-xs text-brand-600 font-bold">Submit time-off authorization.</p>
                            </div>

                            <div 
                                onClick={() => navigate('/staff/progress')}
                                className="bg-white border-4 border-brand-950 p-6 flex flex-col items-center justify-center text-center shadow-solid hover:-translate-y-1 transition-transform cursor-pointer sm:col-span-2"
                            >
                                <div className="w-16 h-16 bg-brand-accent flex items-center justify-center font-black text-3xl text-brand-950 mb-4 border-2 border-brand-950">
                                    ⚙
                                </div>
                                <h3 className="font-black text-brand-950 uppercase tracking-tight text-lg mb-2">Work Progress</h3>
                                <p className="text-xs text-brand-600 font-bold">Report site daily updates & upload photos.</p>
                            </div>
                        </div>

                    </div>

                    {/* Secondary Status Panel */}
                    <div className="md:col-span-4">
                        <div className="bg-brand-950 text-white p-8 border-4 border-brand-accent h-full relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 w-20 h-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#FFB612_2px,#FFB612_4px)] transform rotate-45 opacity-50"></div>

                            <h3 className="text-xl font-black uppercase tracking-tighter text-brand-accent mb-6 border-b-2 border-brand-800 pb-2">Status Log</h3>

                            <ul className="space-y-6">
                                <li className="relative pl-6">
                                    <span className="absolute left-0 top-1 w-2 h-2 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                                    <h4 className="font-black uppercase text-sm mb-1 tracking-tight">Clearance Standard</h4>
                                    <p className="text-xs text-brand-400 font-bold">Safety protocols verified.</p>
                                </li>
                                <li className="relative pl-6">
                                    <span className="absolute left-0 top-1 w-2 h-2 bg-brand-accent shadow-[0_0_8px_rgba(255,182,18,0.8)]"></span>
                                    <h4 className="font-black uppercase text-sm mb-1 tracking-tight">Payroll Cycle</h4>
                                    <p className="text-xs text-brand-400 font-bold">Disbursement in 4 days.</p>
                                </li>
                                <li className="relative pl-6">
                                    <span className="absolute left-0 top-1 w-2 h-2 bg-white"></span>
                                    <h4 className="font-black uppercase text-sm mb-1 tracking-tight">System Notice</h4>
                                    <p className="text-xs text-brand-400 font-bold">Server maintenance at 0200h.</p>
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;
