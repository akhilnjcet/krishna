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

        // If Cloudinary returned a remote URL, use it directly
        if (fileUrl && fileUrl.startsWith('http')) {
            return res.json({
                message: 'File uploaded successfully',
                fileUrl: fileUrl,
                url: fileUrl,
                filePath: fileUrl,
            });
        }

        // In serverless (Vercel) or mock storage environments, local /tmp disk is ephemeral.
        // Convert images/PDFs under 5MB to a permanent Base64 Data URI so it never 404s.
        const isVercel = process.env.VERCEL === '1';
        const isMock = !process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY.includes('mock');
        if ((isVercel || isMock) && req.file.path && fs.existsSync(req.file.path)) {
            try {
                const ext = path.extname(req.file.originalname).toLowerCase();
                const mime = req.file.mimetype || (ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg');
                const stat = fs.statSync(req.file.path);
                if (stat.size <= 5 * 1024 * 1024) {
                    const base64Data = fs.readFileSync(req.file.path).toString('base64');
                    const dataUri = `data:${mime};base64,${base64Data}`;
                    return res.json({
                        message: 'File uploaded successfully',
                        fileUrl: dataUri,
                        url: dataUri,
                        filePath: dataUri,
                    });
                }
            } catch (readErr) {
                console.warn('Fallback base64 packaging warning:', readErr.message);
            }
        }

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
