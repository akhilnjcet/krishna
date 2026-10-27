const express = require('express');
const router = express.Router();
const upload = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        let fileUrl = req.file.path || '';
        if (fileUrl && !fileUrl.startsWith('http')) {
            const normalized = fileUrl.replace(/\\/g, '/').replace(/^\/+/, '');
            fileUrl = `/${normalized}`;
        }

        res.json({
            message: 'File uploaded successfully',
            fileUrl: fileUrl,
            url: fileUrl,
            filePath: fileUrl,
        });
    } catch (error) {
        res.status(500).json({ message: 'File upload failed', error: error.message });
    }
});

module.exports = router;
