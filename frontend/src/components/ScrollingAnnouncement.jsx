import React, { useState, useEffect } from 'react';
import { Megaphone, AlertTriangle, Info, Wrench, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ScrollingAnnouncement = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Check if user dismissed announcements in this session
        const isDismissed = sessionStorage.getItem('announcement_bar_dismissed');
        if (isDismissed === 'true') {
            setDismissed(true);
        }

        const fetchAnnouncements = async () => {
            try {
                const res = await api.get('/announcements');
                if (res.data?.success && Array.isArray(res.data.data)) {
                    setAnnouncements(res.data.data);
                }
            } catch (err) {
                // Silently fallback if offline or no announcements
            }
        };

        fetchAnnouncements();
    }, []);

    if (dismissed || announcements.length === 0) {
        return null;
    }

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem('announcement_bar_dismissed', 'true');
    };

    // Determine color theme based on most urgent announcement
    const hasUrgent = announcements.some(a => a.type === 'urgent');
    const hasMaintenance = announcements.some(a => a.type === 'maintenance');
    const hasWarning = announcements.some(a => a.type === 'warning');

    let bgClass = 'bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 text-blue-100 border-b border-blue-700/50';
    let badgeClass = 'bg-blue-500/20 text-blue-300 border-blue-400/30';
    let Icon = Info;

    if (hasUrgent) {
        bgClass = 'bg-gradient-to-r from-rose-900 via-red-900 to-rose-950 text-rose-100 border-b border-rose-700/50';
        badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-400/30';
        Icon = AlertTriangle;
    } else if (hasMaintenance) {
        bgClass = 'bg-gradient-to-r from-purple-900 via-violet-900 to-purple-950 text-purple-100 border-b border-purple-700/50';
        badgeClass = 'bg-purple-500/20 text-purple-300 border-purple-400/30';
        Icon = Wrench;
    } else if (hasWarning) {
        bgClass = 'bg-gradient-to-r from-amber-900 via-yellow-900 to-amber-950 text-amber-100 border-b border-amber-700/50';
        badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-400/30';
        Icon = AlertTriangle;
    }

    return (
        <div 
            className={`relative z-40 w-full overflow-hidden text-xs py-2 px-3 shadow-md transition-colors ${bgClass}`}
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)' }}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                {/* Fixed Label / Icon */}
                <div className="flex items-center gap-2 flex-shrink-0 z-10 pl-1">
                    <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${badgeClass}`}>
                        <Icon className="w-3.5 h-3.5 animate-pulse" />
                        <span>Notice</span>
                    </span>
                </div>

                {/* Scrolling Ticker Track */}
                <div className="flex-1 overflow-hidden relative select-none">
                    <div className="inline-flex whitespace-nowrap animate-marquee gap-12 font-medium">
                        {announcements.map((item, idx) => (
                            <span key={item._id || idx} className="inline-flex items-center gap-2">
                                <span>{item.text}</span>
                                {item.link && (
                                    <a
                                        href={item.link.startsWith('#') ? item.link : item.link}
                                        className="underline hover:text-white inline-flex items-center gap-0.5 font-bold text-[11px]"
                                        target={item.link.startsWith('http') ? '_blank' : '_self'}
                                        rel="noopener noreferrer"
                                    >
                                        <span>Details</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                                <span className="opacity-40">✦</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Dismiss Button */}
                <div className="flex items-center flex-shrink-0 z-10 pr-1">
                    <button
                        onClick={handleDismiss}
                        className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        title="Dismiss announcement"
                        aria-label="Dismiss announcement"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 25s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
};

export default ScrollingAnnouncement;
