import useSignalStore from '../stores/signalStore';

/**
 * Transforms various image hosting URLs (like Google Drive) into direct image links
 * that can be used in <img> tags.
 */
export const getDirectImageUrl = (url) => {
    if (!url) return '';

    // Handle relative uploads or fix hardcoded mismatched hosts (e.g. localhost vs production)
    if (url.includes('/uploads/') || url.startsWith('uploads/')) {
        let relativePath = url;
        if (url.includes('/uploads/')) {
            relativePath = url.substring(url.indexOf('/uploads/'));
        } else {
            relativePath = `/${url}`;
        }
        
        const apiUrl = useSignalStore.getState().getApiUrl();
        const origin = apiUrl.includes('/api') ? apiUrl.split('/api')[0] : apiUrl;
        return `${origin}${relativePath}`;
    }

    // If it's already a direct lh3 link, just return it
    if (url.includes('googleusercontent.com')) return url;

    // Handle Google Drive links
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        let fileId = '';
        
        // Match /file/d/ID/view
        const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            fileId = fileIdMatch[1];
        } else {
            // Match ?id=ID
            const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (idParamMatch && idParamMatch[1]) {
                fileId = idParamMatch[1];
            }
        }

        if (fileId) {
            // Direct export view link as requested by requirement 6
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
    }

    return url;
};
