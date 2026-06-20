import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { getDirectImageUrl } from '../utils/imageUtils';

/**
 * A reusable image wrapper that automatically resolves Google Drive preview URLs,
 * intercepts image loading failures (like 3rd party cookie blocking) to direct requests
 * via usercontent CDN fallback, and gracefully displays restricted-access status
 * when public view rights are missing.
 */
export default function DriveImage({ src, alt, className }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState('');

    useEffect(() => {
        const directSrc = getDirectImageUrl(src);
        setCurrentSrc(directSrc);
        setLoading(true);
        setError(false);
    }, [src]);

    const handleImageError = () => {
        if (currentSrc.includes('drive.google.com/uc')) {
            const idMatch = currentSrc.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (idMatch && idMatch[1]) {
                const fallbackUrl = `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
                console.log('Image load failed for uc. Trying fallback:', fallbackUrl);
                setCurrentSrc(fallbackUrl);
                return;
            }
        }
        setLoading(false);
        setError(true);
        console.log('Image load failed:', currentSrc);
    };

    return (
        <div className={`relative ${className} bg-slate-100 flex items-center justify-center border rounded-xl overflow-hidden`}>
            {loading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            {error ? (
                <div className="text-center p-2 text-slate-400 flex flex-col items-center justify-center gap-1 w-full h-full">
                    <ShieldAlert className="w-4.5 h-4.5 text-slate-400" />
                    <span className="text-[9px] font-black uppercase tracking-wider leading-tight">Access Restricted</span>
                    <span className="text-[7px] text-slate-400 lowercase font-medium">make link public</span>
                </div>
            ) : (
                currentSrc && (
                    <img 
                        src={currentSrc} 
                        alt={alt || "Drive asset"} 
                        className={`w-full h-full object-cover transition-all duration-300 ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                        onLoad={() => {
                            setLoading(false);
                            console.log('Image loaded successfully:', currentSrc);
                        }}
                        onError={handleImageError}
                    />
                )
            )}
        </div>
    );
}
