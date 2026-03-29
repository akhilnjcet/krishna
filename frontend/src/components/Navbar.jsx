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
        <>
            {/* Top thin yellow bar */}
            <div className="bg-brand-accent h-2 w-full"></div>

            {/* Main Navigation */}
            <nav className="bg-brand-950 text-white sticky top-0 z-50 shadow-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">

                        {/* Logo */}
                        <div className="flex-shrink-0">
                            <Link to="/" className="flex items-center gap-3">
                                <div className="bg-brand-accent w-10 h-10 flex items-center justify-center font-black text-brand-950 text-xl transform -skew-x-12">
                                    KE
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                                        KRISHNA
                                    </span>
                                    <span className="text-[0.6rem] font-bold tracking-widest uppercase text-brand-accent leading-none mt-1">
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
                                            className={`uppercase text-sm font-bold tracking-wider px-4 py-8 transition-colors border-b-4 ${isActive
                                                    ? 'border-brand-accent text-brand-accent'
                                                    : 'border-transparent text-gray-300 hover:bg-brand-900 hover:text-white hover:border-brand-accent/50'
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
                            <Link
                                to="/register"
                                className="text-gray-300 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors px-4"
                            >
                                Register
                            </Link>
                            <Link
                                to="/login"
                                className="bg-brand-accent hover:bg-brand-accentHover text-brand-950 px-6 py-2.5 text-sm font-bold uppercase tracking-wider transition-colors"
                                style={{ clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0% 100%)' }}
                            >
                                Sign In
                            </Link>
                        </div>

                        {/* Mobile menu button */}
                        <div className="md:hidden flex items-center">
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="p-2 text-gray-400 hover:text-white focus:outline-none"
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
                    <div className="md:hidden bg-brand-900 border-t border-brand-800">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className={`block px-3 py-4 text-base font-bold uppercase tracking-wider border-l-4 ${location.pathname === link.path
                                            ? 'border-brand-accent bg-brand-950 text-brand-accent'
                                            : 'border-transparent text-gray-300 hover:bg-brand-800 hover:border-gray-500'
                                        }`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="pt-4 pb-2 px-3 space-y-3">
                                <Link
                                    to="/register"
                                    className="block w-full text-center border-2 border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-brand-950 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Register
                                </Link>
                                <Link
                                    to="/login"
                                    className="block w-full text-center bg-brand-accent hover:bg-brand-accentHover text-brand-950 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Sign In
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
};

export default Navbar;
