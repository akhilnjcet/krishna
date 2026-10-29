const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
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

// Stream or serve uploaded files directly
router.get('/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const safeName = path.basename(filename);
        const isVercel = process.env.VERCEL === '1';
        const uploadDir = isVercel ? '/tmp/uploads' : path.join(__dirname, '..', 'uploads');
        const filePath = path.join(uploadDir, safeName);

        if (fs.existsSync(filePath)) {
            return res.sendFile(filePath);
        }
        res.status(404).json({ message: 'File not found' });
    } catch (e) {
        res.status(500).json({ message: 'Error retrieving file', error: e.message });
    }
});

module.exports = router;
