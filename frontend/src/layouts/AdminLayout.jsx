import React from 'react';
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

const AdminLayout = () => {
    const { user, isAuthenticated, logout } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated || user?.role !== 'admin') {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        logout();
        window.location.replace('/login');
    };

    const navItems = [
        { name: 'Control', path: '/admin', icon: '◧' },
        { name: 'Projects', path: '/admin/projects', icon: '☰' },
        { name: 'Gallery', path: '/admin/portfolio', icon: '◙' },
        { name: 'Quotes', path: '/admin/quotes', icon: '¥' },
        { name: 'Intel', path: '/admin/blog', icon: '▩' },
    ];

    const fullNavItems = [
        ...navItems,
        { name: 'Production', path: '/admin/progress', icon: '◰' },
        { name: 'Staff', path: '/admin/staff', icon: '♙' },
        { name: 'Logs', path: '/admin/logs', icon: '☷' },
        { name: 'Financials', path: '/admin/finance', icon: '$' },
        { name: 'AI Chat', path: '/admin/chat', icon: '⎋' },
    ];

    return (
        <div className="min-h-screen bg-brand-50 flex font-sans overflow-x-hidden md:flex-row flex-col">
            
            {/* DESKTOP SIDEBAR - Heavy Industrial */}
            <aside className="w-72 bg-brand-950 text-white hidden md:flex flex-col fixed h-full z-20 border-r-8 border-brand-accent">
                <div className="p-8 border-b-4 border-brand-800 bg-black">
                    <Link to="/" className="flex flex-col">
                        <span className="text-3xl font-black uppercase tracking-tighter text-white">KRISHNA</span>
                        <div className="text-[10px] font-black tracking-widest uppercase text-brand-accent mt-1">Command Module</div>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto bg-brand-950">
                    <div className="text-[10px] uppercase font-black tracking-widest text-brand-500 mb-4 px-2 tracking-[0.3em]">Navigation System</div>
                    {fullNavItems.map(item => {
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
                    <div className="flex justify-between items-center mb-6">
                        <div className="overflow-hidden">
                            <div className="text-[10px] text-brand-accent font-black uppercase tracking-widest mb-1 leading-none">Status: Primary Op</div>
                            <div className="text-sm font-black uppercase tracking-tight truncate text-white">{user?.name}</div>
                        </div>
                        <div className="w-10 h-10 bg-brand-900 border-2 border-brand-800 flex items-center justify-center font-black text-brand-accent text-xl">
                            {user?.name?.charAt(0) || 'K'}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full bg-brand-800 hover:bg-red-600 text-white font-black uppercase tracking-widest py-3 text-[10px] transition-colors border-2 border-brand-950"
                    >
                        Log Out System
                    </button>
                </div>
            </aside>

            {/* MOBILE NAVIGATION DOCK (BOTTOM) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-950 border-t-4 border-brand-accent z-[100] grid grid-cols-5 h-16 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                {navItems.map(item => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link 
                            key={item.name} 
                            to={item.path}
                            className={`flex flex-col items-center justify-center transition-all ${isActive ? 'bg-brand-accent text-brand-950' : 'text-gray-500'}`}
                        >
                            <span className="text-2xl font-black mb-1">{item.icon}</span>
                            <span className="text-[7px] font-black uppercase tracking-widest leading-none">{item.name}</span>
                        </Link>
                    )
                })}
            </div>

            {/* MAIN CONTENT WORKSPACE */}
            <main className="flex-1 md:ml-72 flex flex-col min-h-screen relative bg-brand-50 pb-20 md:pb-0">
                <header className="bg-white h-20 border-b-4 border-brand-200 px-6 md:px-8 flex items-center justify-between sticky top-0 z-10 w-full shadow-sm">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-1.5 h-6 bg-brand-accent md:w-2 md:h-8"></div>
                        <h1 className="text-lg md:text-2xl font-black text-brand-950 uppercase tracking-tighter leading-none">
                            {fullNavItems.find(item => item.path === location.pathname)?.name || 'Control Center'}
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:block bg-brand-100 text-brand-950 text-[10px] font-black px-3 py-1 tracking-widest uppercase border-2 border-brand-200">
                           SYNC: OK
                        </div>
                        <div className="flex items-center gap-3 md:gap-4">
                            <span className="text-[9px] font-black text-brand-accent bg-brand-950 px-2 py-1 transform skew-x-[-12deg] md:block hidden">ADMIN_UNIT_01</span>
                            <button onClick={handleLogout} className="md:hidden text-white bg-red-600 font-black text-[9px] px-3 py-2 uppercase tracking-widest rounded-md">OFF</button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-4 md:p-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
