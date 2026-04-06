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

    // Placeholder check during local development
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    return (
        <div className={`ad-container w-full overflow-hidden my-4 ${className} ${isLocalhost ? 'bg-gray-100 flex items-center justify-center border border-dashed border-gray-300 min-h-[100px]' : ''}`}>
            {isLocalhost && (
                <span className="text-gray-400 text-sm font-medium">
                    Google AdSense Banner (AdSlot: {adSlot || "None"}) <br/> Note: Ads don't show on localhost.
                </span>
            )}
            <ins 
                className="adsbygoogle"
                style={style}
                data-ad-client="ca-pub-5645308067552960"
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
            ></ins>
        </div>
    );
};

export default AdBanner;
