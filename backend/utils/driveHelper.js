const { google } = require('googleapis');

const drive = google.drive({
    version: 'v3',
    auth: process.env.DRIVE_API_KEY
});

/**
 * Extracts all image file links from a Google Drive folder
 * @param {string} folderId 
 * @returns {Promise<string[]>} List of direct image links
 */
const listarArquivosDaPasta = async (folderId) => {
    try {
        const response = await drive.files.list({
            q: `'${folderId}' in parents and mimeType contains 'image/'`,
            fields: 'files(id, name, webViewLink)',
            pageSize: 100
        });

        const files = response.data.files;
        if (!files || files.length === 0) {
            return [];
        }

        // Return individual web links (the frontend will transform them using getDirectImageUrl)
        return files.map(file => `https://drive.google.com/file/d/${file.id}/view`);
    } catch (err) {
        console.error('Error listing Drive folder:', err);
        throw err;
    }
};

/**
 * Extracts folder ID from a Google Drive URL
 * @param {string} url 
 * @returns {string|null}
 */
const extrairFolderId = (url) => {
    // Match /folders/ID
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) return folderMatch[1];
    
    // Match folders?id=ID or ?id=ID
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];
    
    return null;
};

module.exports = {
    listarArquivosDaPasta,
    extrairFolderId
};
