const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'mock-cloud-name',
    api_key: process.env.CLOUDINARY_API_KEY || 'mock-api-key',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'mock-api-secret'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'krishna-erp/uploads',
        allowedFormats: ['jpg', 'png', 'jpeg', 'pdf'],
    },
});

const upload = multer({ storage: storage });

module.exports = upload;
