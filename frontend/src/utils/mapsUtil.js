/**
 * Google Maps Navigation Utility for Krishna ERP Fleet & Logistics
 * Supports:
 * 1. Saved Google Maps URL (verified against allowed Google Maps domains).
 * 2. Saved GPS coordinates (lat, lng).
 * 3. Specific Drop Point / landmark location name.
 * 4. Fallback to Destination address or name with mandatory driver confirmation warning.
 * 5. Safe rejection when no usable location exists.
 */

/**
 * Validates whether a URL string is an authentic Google Maps URL.
 */
export const isValidGoogleMapsUrl = (urlString) => {
    if (!urlString || typeof urlString !== 'string') return false;
    const trimmed = urlString.trim();
    if (!/^https?:\/\//i.test(trimmed)) return false;

    try {
        const parsed = new URL(trimmed);
        const host = parsed.hostname.toLowerCase();
        
        // Allowed Google Maps hostnames and patterns
        const isAllowed = 
            host === 'maps.google.com' ||
            host === 'maps.app.goo.gl' ||
            host === 'goo.gl' ||
            ((host === 'google.com' || host === 'www.google.com' || host.endsWith('.google.com') || host.endsWith('.google.co.in')) && 
             (parsed.pathname.startsWith('/maps') || parsed.pathname.startsWith('/search')));
        
        return Boolean(isAllowed);
    } catch {
        return false;
    }
};

/**
 * Parses coordinates from object { lat, lng } or string "lat, lng".
 */
export const parseCoordinates = (input) => {
    if (!input) return null;
    if (typeof input === 'object' && input.lat !== undefined && input.lat !== null && input.lng !== undefined && input.lng !== null) {
        const lat = Number(input.lat);
        const lng = Number(input.lng);
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            return { lat, lng };
        }
    }
    if (typeof input === 'string') {
        const match = input.trim().match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
        if (match) {
            const lat = Number(match[1]);
            const lng = Number(match[3]);
            if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                return { lat, lng };
            }
        }
    }
    return null;
};

/**
 * Opens Google Maps Navigation safely adhering to ERP verification rules.
 * @param {object} trip - The trip object containing destination details.
 * @param {object} options - Optional callbacks or settings.
 */
export const openGoogleMapsNavigation = (trip, options = {}) => {
    if (!trip) {
        alert('Trip details are not available.');
        return { success: false, reason: 'missing_trip' };
    }

    // 1. Check if a valid Google Maps link was saved (in trip.mapLink or trip.dropPoint)
    const rawMapLink = (trip.mapLink || '').trim();
    if (rawMapLink) {
        if (isValidGoogleMapsUrl(rawMapLink)) {
            window.open(rawMapLink, '_blank', 'noopener,noreferrer');
            return { success: true, type: 'map_link', url: rawMapLink };
        } else if (/^https?:\/\//i.test(rawMapLink)) {
            // Non-Google link: warn driver before opening external link
            const proceed = window.confirm(
                `⚠️ Security Notice: The saved map link is not a standard Google Maps destination:\n\n${rawMapLink}\n\nDo you want to proceed and open this external link?`
            );
            if (proceed) {
                window.open(rawMapLink, '_blank', 'noopener,noreferrer');
                return { success: true, type: 'external_link', url: rawMapLink };
            }
            return { success: false, reason: 'untrusted_url_cancelled' };
        }
    }

    // Also check if dropPoint itself contains a valid URL
    const rawDropPoint = (trip.dropPoint || '').trim();
    if (rawDropPoint && isValidGoogleMapsUrl(rawDropPoint)) {
        window.open(rawDropPoint, '_blank', 'noopener,noreferrer');
        return { success: true, type: 'drop_point_url', url: rawDropPoint };
    }

    // 2. Check if valid GPS coordinates were saved
    const coords = parseCoordinates(trip.destinationCoords) || 
                   parseCoordinates(trip.destinationLocation) ||
                   parseCoordinates(rawDropPoint) ||
                   parseCoordinates(rawMapLink);
    
    if (coords) {
        const targetUrl = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`;
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return { success: true, type: 'coordinates', coords, url: targetUrl };
    }

    // 3. Check if specific Drop Point / Landmark text was saved
    if (rawDropPoint) {
        const targetUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(rawDropPoint)}`;
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return { success: true, type: 'drop_point_text', dropPoint: rawDropPoint, url: targetUrl };
    }

    // 4. Fallback to Destination Name / Address (when no map link or drop point was provided)
    const fallbackDestination = (trip.destinationAddress || trip.destination || '').trim();
    if (fallbackDestination) {
        const warningMessage = 
            `⚠️ Map location was not added by the dispatcher.\n\n` +
            `Destination to search: "${fallbackDestination}"\n\n` +
            `Please confirm the destination before navigating. Do you wish to search this location in Google Maps?`;
        
        const driverConfirmed = window.confirm(warningMessage);
        if (driverConfirmed) {
            const targetUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fallbackDestination)}`;
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
            return { success: true, type: 'destination_fallback', query: fallbackDestination, url: targetUrl };
        }
        return { success: false, reason: 'fallback_cancelled_by_driver' };
    }

    // 5. No usable location information exists
    alert('Map location was not added. Please confirm the destination before navigating.');
    return { success: false, reason: 'no_location_data' };
};

export default openGoogleMapsNavigation;
