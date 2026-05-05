const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration
const isVercel = process.env.VERCEL === '1';
const isMock = !process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY.includes('mock');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

let storage;

if (isMock) {
    // Local Storage Fallback
    const uploadDir = isVercel ? '/tmp/uploads' : 'uploads';
    if (!fs.existsSync(uploadDir)) {
        try { fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}
    }
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        }
    });
} else {
    // Cloudinary Storage
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'krishna-erp/uploads',
            allowedFormats: ['jpg', 'png', 'jpeg', 'pdf'],
        },
    });
}

const upload = multer({ storage: storage });

module.exports = upload;
