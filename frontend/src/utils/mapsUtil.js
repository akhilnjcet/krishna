/**
 * Google Maps Navigation Utility for Krishna ERP Fleet & Logistics
 * Opens Google Maps Navigation for a given trip destination.
 * - Prioritizes valid coordinates (LAT, LNG) when available.
 * - Otherwise cleanly URL-encodes destination address or site name.
 * - Falls back gracefully without crashing or opening dead windows.
 */
export const openGoogleMapsNavigation = (trip) => {
    if (!trip) {
        alert('Trip details are not available.');
        return;
    }

    const loc = trip.destinationLocation || {};
    const hasLat = loc.lat !== undefined && loc.lat !== null && !isNaN(Number(loc.lat));
    const hasLng = loc.lng !== undefined && loc.lng !== null && !isNaN(Number(loc.lng));

    let targetUrl = '';

    if (hasLat && hasLng && Number(loc.lat) !== 0 && Number(loc.lng) !== 0) {
        targetUrl = `https://www.google.com/maps/dir/?api=1&destination=${Number(loc.lat)},${Number(loc.lng)}`;
    } else {
        const query = (trip.destinationAddress || trip.destination || '').trim();
        if (query) {
            targetUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
        }
    }

    if (!targetUrl) {
        alert('Destination address or GPS coordinates are not configured for this trip.');
        return;
    }

    window.open(targetUrl, '_blank', 'noopener,noreferrer');
};

export default openGoogleMapsNavigation;
