import React, { useEffect, useRef } from 'react';

/**
 * Reusable Google AdSense Banner Component
 * Usage:
 * <AdBanner adSlot="1234567890" adFormat="auto" /> // Responsive by default
 */
const AdBanner = ({ 
    adSlot, 
    adFormat = 'auto', 
    fullWidthResponsive = true, 
    style = { display: 'block' },
    className = "" 
}) => {
    const isAdLoaded = useRef(false);

    useEffect(() => {
        // Prevent duplicate push in development or strict mode
        if (!isAdLoaded.current) {
            try {
                if (window && typeof window !== 'undefined') {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                }
                isAdLoaded.current = true;
            } catch (err) {
                console.error("AdSense Error: ", err.message);
            }
        }
    }, []);

    if (!adSlot) return null;

    // Placeholder check during local development
    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    return (
        <div className={`ad-container w-full overflow-hidden ${className}`}>
            {isLocalhost && (
                <div className="py-2 text-center text-gray-400 text-xs">
                    [AdSense Slot: {adSlot}]
                </div>
            )}
            <ins 
                className="adsbygoogle"
                style={style}
                data-ad-client="ca-pub-6256142895089758"
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
            ></ins>
        </div>
    );
};

export default AdBanner;
