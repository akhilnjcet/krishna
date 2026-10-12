import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ className = "", darkNavbar = false }) => {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <button
            type="button"
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            className={`p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-center ${
                darkNavbar 
                ? 'bg-white/10 dark:bg-slate-800/80 border-white/10 dark:border-slate-700 text-white hover:bg-white/20 dark:hover:bg-slate-700' 
                : theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-yellow-400 hover:bg-slate-700 hover:text-yellow-300 shadow-sm'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
            } ${className}`}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
    );
};

export default ThemeToggle;
