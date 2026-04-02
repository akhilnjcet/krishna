import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const { user, isAuthenticated } = useAuthStore();

    const dashboardPath = user?.role === 'admin' ? '/admin' : 
                         user?.role === 'staff' ? '/staff' : '/customer';

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'About', path: '/about' },
        { name: 'Services', path: '/services' },
        { name: 'Projects', path: '/projects' },
        { name: 'Blog', path: '/blog' },
        ...(isAuthenticated ? [{ name: 'Dashboard', path: dashboardPath }] : []),
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">

                        {/* Logo */}
                        <div className="flex-shrink-0">
                            <Link to="/" className="flex items-center gap-3 group">
                                <div className="bg-primary w-11 h-11 flex items-center justify-center font-black text-white text-xl rounded-2xl shadow-lg shadow-blue-100 group-hover:scale-105 transition-transform duration-300">
                                    KE
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold tracking-tight text-primary leading-none font-poppins">
                                        KRISHNA
                                    </span>
                                    <span className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-secondary leading-none mt-1.5 transition-colors group-hover:text-cta">
                                        Engineering Works
                                    </span>
                                </div>
                            </Link>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:block">
                            <div className="ml-10 flex items-center space-x-1">
                                {navLinks.map((link) => {
                                    const isActive = location.pathname === link.path;
                                    return (
                                        <Link
                                            key={link.name}
                                            to={link.path}
                                            className={`text-sm font-semibold tracking-tight px-5 py-2.5 rounded-xl transition-all duration-300 ${isActive
                                                    ? 'bg-blue-50 text-cta'
                                                    : 'text-textMain/80 hover:bg-slate-50 hover:text-primary'
                                                }`}
                                        >
                                            {link.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Desktop Cta */}
                        <div className="hidden md:flex items-center gap-4">
                            {!isAuthenticated ? (
                                <>
                                    <Link
                                        to="/login"
                                        className="text-textMain/70 hover:text-primary text-xs font-bold uppercase tracking-widest transition-colors px-4"
                                    >
                                        Member Access
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="bg-cta hover:bg-ctaHover text-white px-7 py-3 text-sm font-bold rounded-2xl shadow-xl shadow-blue-100 hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        const { logout } = useAuthStore.getState();
                                        logout();
                                        window.location.replace('/login');
                                    }}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-7 py-3 text-sm font-bold rounded-2xl transition-all duration-300 flex items-center gap-2"
                                >
                                    Log Out
                                </button>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <div className="md:hidden flex items-center">
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="p-2 text-primary hover:text-cta focus:outline-none"
                            >
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {isOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>

                    </div>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden bg-white border-t border-slate-100 shadow-2xl">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className={`block px-5 py-4 text-sm font-bold rounded-2xl transition-all ${location.pathname === link.path
                                            ? 'bg-blue-50 text-cta'
                                            : 'text-textMain/70 hover:bg-slate-50'
                                        }`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-4 pb-2 px-3 space-y-3">
                                {!isAuthenticated ? (
                                    <>
                                        <Link
                                            to="/register"
                                            className="block w-full text-center bg-cta text-white px-4 py-4 rounded-2xl font-bold transition-all"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            Join Now
                                        </Link>
                                        <Link
                                            to="/login"
                                            className="block w-full text-center bg-surface text-primary px-4 py-4 rounded-2xl font-bold transition-all"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            Member Login
                                        </Link>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            const { logout } = useAuthStore.getState();
                                            logout();
                                            window.location.replace('/login');
                                            setIsOpen(false);
                                        }}
                                        className="block w-full bg-rose-50 text-rose-600 px-4 py-4 rounded-2xl font-bold transition-all"
                                    >
                                        Log Out
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
        </nav>
    );
};

export default Navbar;
