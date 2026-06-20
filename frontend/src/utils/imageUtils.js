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
        
        const apiUrl = import.meta.env.VITE_API_URL || useSignalStore.getState().getApiUrl();
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

/**
 * Extracts folder ID from a Google Drive URL
 */
export const extrairFolderId = (url) => {
    if (!url) return null;
    // Match /folders/ID
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) return folderMatch[1];
    
    // Match folders?id=ID or ?id=ID
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];
    
    return null;
};

/**
 * Expands any Google Drive folder URLs in an array of images to individual file links client-side.
 */
export const expandGoogleDriveFolders = async (images) => {
    if (!images || images.length === 0) return [];
    
    const expanded = [];
    const apiKey = 'AIzaSyBI74NjzwHDCvxT08KExFV1p8ISO61M_nI';

    for (const img of images) {
        const url = typeof img === 'string' ? img : img?.url;
        if (!url) continue;

        const folderId = extrairFolderId(url);
        if (folderId && (url.includes('/folders/') || url.includes('/drive/folders/'))) {
            try {
                const response = await fetch(
                    `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'&key=${apiKey}&fields=files(id)&pageSize=100`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.files && data.files.length > 0) {
                        data.files.forEach(file => {
                            if (typeof img === 'string') {
                                expanded.push(`https://drive.google.com/file/d/${file.id}/view`);
                            } else {
                                expanded.push({
                                    ...img,
                                    url: `https://drive.google.com/file/d/${file.id}/view`,
                                    _id: file.id
                                });
                            }
                        });
                        continue;
                    }
                } else {
                    console.warn('Google Drive API directory list error response status:', response.status);
                }
            } catch (err) {
                console.error('Client-side Google Drive folder expansion failed for:', url, err);
            }
        }
        expanded.push(img);
    }
    return expanded;
};

