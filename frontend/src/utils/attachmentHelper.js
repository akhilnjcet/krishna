import { getDirectImageUrl } from './imageUtils';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

/**
 * Resolves an attachment reference into a robust, accessible URL
 */
export const resolveAttachmentUrl = (rawItem) => {
    if (!rawItem) return '';

    // Handle legacy object wrappers
    let url = typeof rawItem === 'object' && rawItem !== null 
        ? (rawItem.url || rawItem.fileUrl || rawItem.path || '') 
        : String(rawItem).trim();

    if (!url) return '';

    // Data URI
    if (url.startsWith('data:')) {
        return url;
    }

    // Google Drive
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
        return getDirectImageUrl(url);
    }

    // Relative /uploads/ path
    if (url.includes('/uploads/') || url.startsWith('uploads/')) {
        return getDirectImageUrl(url);
    }

    return url;
};

/**
 * Detect file category: 'image' | 'pdf' | 'document' | 'other'
 */
export const detectFileType = (urlOrDataUri = '', mimeTypeHint = '') => {
    if (!urlOrDataUri && !mimeTypeHint) return 'other';

    const str = String(urlOrDataUri).toLowerCase();
    const hint = String(mimeTypeHint).toLowerCase();

    if (str.startsWith('data:image/') || hint.startsWith('image/')) {
        return 'image';
    }

    if (str.startsWith('data:application/pdf') || hint === 'application/pdf' || str.endsWith('.pdf') || str.includes('.pdf?')) {
        return 'pdf';
    }

    if (
        str.endsWith('.png') || str.endsWith('.jpg') || str.endsWith('.jpeg') || 
        str.endsWith('.webp') || str.endsWith('.gif') || str.endsWith('.svg') ||
        str.includes('.png?') || str.includes('.jpg?') || str.includes('.jpeg?') || str.includes('.webp?')
    ) {
        return 'image';
    }

    if (
        str.endsWith('.doc') || str.endsWith('.docx') || 
        str.endsWith('.xls') || str.endsWith('.xlsx') || 
        str.endsWith('.csv') || str.endsWith('.txt') ||
        hint.includes('word') || hint.includes('sheet') || hint.includes('excel') || hint.includes('text/')
    ) {
        return 'document';
    }

    return 'other';
};

/**
 * Converts a base64 Data URI to a native Blob safely
 */
export const dataUriToBlob = (dataUri) => {
    try {
        const parts = dataUri.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const byteString = atob(parts[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mime });
    } catch (err) {
        console.error('Error converting data URI to Blob:', err);
        return null;
    }
};

/**
 * Safe download function supporting Web, Android Capacitor APK, and Mobile Chrome
 */
export const safeDownloadAttachment = async ({ url, fileName = 'attachment', mimeType = '' }) => {
    try {
        const safeName = String(fileName || 'attachment')
            .replace(/[/\\?%*:|"<>]/g, '_')
            .replace(/\s+/g, '_');

        const resolved = resolveAttachmentUrl(url);

        // 1. If native Android WebView download interface exists
        if (window.Android && typeof window.Android.downloadBase64File === 'function') {
            try {
                let base64 = '';
                if (resolved.startsWith('data:')) {
                    base64 = resolved.split(',')[1];
                } else {
                    const response = await fetch(resolved);
                    const blob = await response.blob();
                    base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.readAsDataURL(blob);
                    });
                }
                window.Android.downloadBase64File(base64, safeName, mimeType || 'application/octet-stream');
                return true;
            } catch (androidErr) {
                console.warn('Native Android bridge download error, falling back:', androidErr);
            }
        }

        // 2. If running inside Capacitor Native APK
        if (Capacitor.isNativePlatform()) {
            try {
                let base64 = '';
                if (resolved.startsWith('data:')) {
                    base64 = resolved.split(',')[1];
                } else {
                    const response = await fetch(resolved);
                    const blob = await response.blob();
                    base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.readAsDataURL(blob);
                    });
                }

                const savedFile = await Filesystem.writeFile({
                    path: safeName,
                    data: base64,
                    directory: Directory.Documents,
                    recursive: true
                });

                await Share.share({
                    title: safeName,
                    url: savedFile.uri,
                    dialogTitle: `Download ${safeName}`
                });
                return true;
            } catch (capErr) {
                console.warn('Capacitor native download/share failed, falling back to browser download:', capErr);
            }
        }

        // 3. Web Browser standard Blob download
        let blobUrl = '';
        let revokeNeeded = false;

        if (resolved.startsWith('data:')) {
            const blob = dataUriToBlob(resolved);
            if (blob) {
                blobUrl = URL.createObjectURL(blob);
                revokeNeeded = true;
            } else {
                blobUrl = resolved;
            }
        } else {
            try {
                const res = await fetch(resolved, { mode: 'cors' });
                if (res.ok) {
                    const blob = await res.blob();
                    blobUrl = URL.createObjectURL(blob);
                    revokeNeeded = true;
                } else {
                    blobUrl = resolved;
                }
            } catch {
                blobUrl = resolved;
            }
        }

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = safeName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            if (document.body.contains(link)) {
                document.body.removeChild(link);
            }
            if (revokeNeeded && blobUrl.startsWith('blob:')) {
                URL.revokeObjectURL(blobUrl);
            }
        }, 1500);

        return true;
    } catch (err) {
        console.error('Safe download failed:', err);
        // Fallback: open in new tab if possible
        try {
            window.open(url, '_blank');
        } catch (e) {
            alert('Unable to download file. Please check your network connection.');
        }
        return false;
    }
};
