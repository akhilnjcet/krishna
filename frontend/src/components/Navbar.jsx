import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuthStore();

    const dashboardPath = user?.role === 'admin' ? '/admin' : 
                         user?.role === 'staff' ? '/staff' : '/customer';

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Lodge Manager', path: '/lodge' },
        { name: 'About', path: '/about' },
        { name: 'Services', path: '/services' },
        { name: 'Projects', path: '/projects' },
        { name: 'Blog', path: '/blog' },
        ...(isAuthenticated ? [{ name: 'Dashboard', path: dashboardPath }] : []),
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 transition-colors">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 sm:h-20">

                        {/* Back Button & Logo */}
                        <div className="flex items-center gap-2.5 sm:gap-4 flex-shrink-0">
                            {location.pathname !== '/' && (
                                <button
                                    onClick={() => navigate(-1)}
                                    className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800 text-primary hover:bg-blue-50 hover:text-cta rounded-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
                                    title="Go Back"
                                >
                                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                            )}
                            <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
                                <img 
                                    src="/logo512.png" 
                                    alt="Krishna Engineering Works" 
                                    className="h-11 sm:h-14 md:h-16 w-auto object-contain rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300 dark:shadow-none"
                                />
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
                                                    ? 'bg-blue-50 text-cta dark:bg-slate-800 dark:text-blue-400'
                                                    : 'text-textMain/80 hover:bg-slate-50 dark:bg-slate-800 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
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
                            <ThemeToggle />
                            {!isAuthenticated ? (
                                <>
                                    <Link
                                        to="/login"
                                        className="text-textMain/70 hover:text-primary text-xs font-bold uppercase tracking-widest transition-colors px-4 dark:text-slate-300 dark:hover:text-white"
                                    >
                                        Member Access
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="bg-cta hover:bg-ctaHover text-white px-7 py-3 text-sm font-bold rounded-2xl shadow-xl shadow-blue-100 hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 dark:shadow-none"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            ) : (
                                <button
                                    onClick={() => {
                                        const { logout } = useAuthStore.getState();
                                        logout();
                                        navigate('/login', { replace: true });
                                    }}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-7 py-3 text-sm font-bold rounded-2xl transition-all duration-300 flex items-center gap-2 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-950/40"
                                >
                                    Log Out
                                </button>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <div className="md:hidden flex items-center gap-2 sm:gap-3">
                            <ThemeToggle />
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                className="p-2 text-slate-700 hover:text-cta focus:outline-none dark:text-slate-300"
                                aria-label="Toggle navigation menu"
                            >
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
                        >
                            <div className="px-3 pt-2 pb-4 space-y-1">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        to={link.path}
                                        className={`block px-4 py-3 text-sm font-bold rounded-xl transition-all ${location.pathname === link.path
                                                ? 'bg-blue-50 text-cta dark:bg-slate-800 dark:text-blue-400'
                                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                                            }`}
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                                <div className="pt-3 pb-2 space-y-2.5">
                                    {!isAuthenticated ? (
                                        <>
                                            <Link
                                                to="/register"
                                                className="block w-full text-center bg-cta hover:bg-ctaHover text-white px-4 py-3.5 rounded-xl font-bold text-sm transition-all shadow-md"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                Join Now
                                            </Link>
                                            <Link
                                                to="/login"
                                                className="block w-full text-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 px-4 py-3.5 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-slate-700"
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
                                                navigate('/login', { replace: true });
                                                setIsOpen(false);
                                            }}
                                            className="block w-full bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 px-4 py-3.5 rounded-xl font-bold text-sm transition-all"
                                        >
                                            Log Out
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
        </nav>
    );
};

export default Navbar;
