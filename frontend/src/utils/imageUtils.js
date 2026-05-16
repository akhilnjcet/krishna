import useSignalStore from '../stores/signalStore';

/**
 * Transforms various image hosting URLs (like Google Drive) into direct image links
 * that can be used in <img> tags.
 * Also handles local upload paths by prepending the current API base URL.
 */
export const getDirectImageUrl = (url) => {
    if (!url) return '';

    // Handle local storage paths (e.g., "uploads\image.jpg" or "uploads/image.jpg")
    if (url.startsWith('uploads') || url.includes('\\uploads') || url.includes('/uploads')) {
        const apiUrl = import.meta.env.VITE_API_URL || useSignalStore.getState().getApiUrl();
        const baseUrl = apiUrl.replace(/\/api$/, ''); // Remove /api suffix to get root
        
        // Normalize slashes and ensure path is relative to root
        const normalizedPath = url.replace(/\\/g, '/');
        return `${baseUrl}/${normalizedPath}`;
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
            // High-quality thumbnail/preview link (Works for almost all public files without rate limits)
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
        }
    }

    return url;
};
