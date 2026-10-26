const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configuration
const isVercel = process.env.VERCEL === '1';
const isMock = !process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY.includes('mock');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Strict File Upload Whitelist & Security Rules
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
]);

// Explicitly blocked high-risk executable & script extensions
const FORBIDDEN_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.phtml', '.php3', '.php4', '.php5',
    '.js', '.mjs', '.cjs', '.py', '.rb', '.pl', '.jar', '.war', '.ear',
    '.svg', '.html', '.htm', '.xhtml', '.asp', '.aspx', '.jsp', '.jspx',
    '.dll', '.so', '.dylib', '.scr', '.vbs', '.wsf', '.msi', '.ps1'
]);

/**
 * Strict file validation filter
 */
const fileFilter = (req, file, cb) => {
    if (!file || !file.originalname) {
        return cb(new Error('Invalid file payload: file is missing or unnamed.'), false);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    // 1. Block dangerous executables, scripts, and active content
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
        return cb(new Error(`Security Violation: Uploading executable or script files (${ext}) is strictly prohibited.`), false);
    }

    // 2. Enforce allowed extension whitelist
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return cb(new Error(`Invalid file extension "${ext}". Allowed types: JPG, PNG, WEBP, GIF, PDF.`), false);
    }

    // 3. Enforce allowed MIME type whitelist
    if (!ALLOWED_MIME_TYPES.has(mime)) {
        return cb(new Error(`Invalid MIME type "${mime}". Content does not match permitted document or image types.`), false);
    }

    cb(null, true);
};

let storage;

if (isMock) {
    // Local Storage Fallback with crypto randomized filenames (prevents path traversal ../ and collisions)
    const uploadDir = isVercel ? '/tmp/uploads' : 'uploads';
    if (!fs.existsSync(uploadDir)) {
        try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}
    }
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const safeRandomName = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${ext}`;
            cb(null, safeRandomName);
        }
    });
} else {
    // Cloudinary Storage
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'krishna-erp/uploads',
            allowedFormats: ['jpg', 'png', 'jpeg', 'webp', 'gif', 'pdf'],
            public_id: (req, file) => {
                const ext = path.extname(file.originalname).toLowerCase();
                const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
                return `${Date.now()}_${baseName}_${crypto.randomBytes(8).toString('hex')}`;
            }
        },
    });
}

// Enforce 10 MB maximum file size limit
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 10
    }
});

module.exports = upload;

