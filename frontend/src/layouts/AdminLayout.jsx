import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

const AdminLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated || user?.role !== 'admin') {
        return <Navigate to="/login" replace />;
    }

    const navItems = [
        { name: 'Control Center', path: '/admin', icon: '◧' },
        { name: 'Active Projects', path: '/admin/projects', icon: '☰' },
        { name: 'Work Gallery', path: '/admin/portfolio', icon: '◙' },
        { name: 'Quote Requests', path: '/admin/quotes', icon: '¥' },
        { name: 'Staff Roster', path: '/admin/staff', icon: '♙' },
        { name: 'Verification Logs', path: '/admin/logs', icon: '☷' },
        { name: 'Financials', path: '/admin/invoices', icon: '$' },
    ];


    return (
        <div className="min-h-screen bg-brand-50 flex font-sans">
            {/* Sidebar - Heavy Industrial */}
            <aside className="w-72 bg-brand-950 text-white hidden md:flex flex-col fixed h-full z-20 border-r-8 border-brand-accent">

                <div className="p-8 border-b-4 border-brand-800 bg-black">
                    <Link to="/" className="flex flex-col">
                        <span className="text-3xl font-black uppercase tracking-tighter text-white">KRISHNA</span>
                        <div className="text-[10px] font-black tracking-widest uppercase text-brand-accent mt-1">Command Module</div>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto bg-brand-950">
                    <div className="text-[10px] uppercase font-black tracking-widest text-brand-500 mb-4 px-2">Navigation System</div>
                    {navItems.map(item => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center gap-4 px-4 py-3 font-bold uppercase tracking-widest text-xs transition-all border-l-4 ${isActive
                                        ? 'border-brand-accent bg-brand-900 text-brand-accent'
                                        : 'border-transparent text-gray-400 hover:bg-brand-900 hover:text-white hover:border-gray-500'
                                    }`}
                            >
                                <span className="text-lg w-6 flex justify-center font-black">{item.icon}</span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t-4 border-brand-800 bg-black relative">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#FFB612_2px,#FFB612_4px)]"></div>

                    <div className="flex justify-between items-center mb-6">
                        <div className="overflow-hidden">
                            <div className="text-[10px] text-brand-accent font-black uppercase tracking-widest mb-1">Authenticated As</div>
                            <div className="text-sm font-black uppercase tracking-tight truncate text-white">{user?.name}</div>
                            <div className="text-xs font-bold text-gray-500 truncate mt-0.5">{user?.email}</div>
                        </div>
                        <div className="w-12 h-12 bg-brand-900 border-2 border-brand-800 flex items-center justify-center font-black text-brand-accent text-xl">
                            {user?.name?.charAt(0) || 'OP'}
                        </div>
                    </div>

                    <button
                        onClick={logout}
                        className="w-full bg-brand-800 hover:bg-red-600 text-white font-black uppercase tracking-widest py-3 text-xs transition-colors border-2 border-brand-950 flex items-center justify-center gap-2"
                    >
                        Log Out System
                    </button>
                </div>
            </aside>

            {/* Main Content Workspace */}
            <main className="flex-1 md:ml-72 flex flex-col min-h-screen relative bg-brand-50">

                <header className="bg-white h-20 border-b-4 border-brand-200 px-8 flex items-center justify-between sticky top-0 z-10 w-full shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-8 bg-brand-accent hidden md:block"></div>
                        <h1 className="text-2xl font-black text-brand-950 uppercase tracking-tighter">
                            {navItems.find(item => item.path === location.pathname)?.name || 'Control Center'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="bg-brand-100 text-brand-950 text-[10px] font-black px-3 py-1 tracking-widest uppercase border-2 border-brand-200 hidden sm:block">
                            SYSTEM: ONLINE
                        </div>
                        <button className="relative w-10 h-10 bg-brand-100 flex items-center justify-center hover:bg-brand-950 hover:text-white transition-colors border-2 border-brand-200">
                            <span className="font-black">!</span>
                            <span className="absolute -top-2 -right-2 w-4 h-4 bg-brand-accent text-brand-950 text-[10px] font-black flex items-center justify-center shadow-solid">3</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 p-6 md:p-10 overflow-y-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
