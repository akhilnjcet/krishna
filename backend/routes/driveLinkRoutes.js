const express = require('express');
const router = express.Router();
const DriveLink = require('../models/DriveLink');
const { protect, admin } = require('../middleware/authMiddleware');
const { listarArquivosDaPasta, extrairFolderId } = require('../utils/driveHelper');

// @route   POST /api/drive-link/save
// @desc    Save Google Drive folder/file link permanently in MongoDB
// @access  Private/Admin
router.post('/save', protect, admin, async (req, res) => {
    try {
        const { link } = req.body;
        if (!link) {
            return res.status(400).json({ message: 'Drive link is required' });
        }

        let driveLink = await DriveLink.findOne();
        if (driveLink) {
            driveLink.link = link.trim();
            await driveLink.save();
        } else {
            driveLink = await DriveLink.create({ link: link.trim() });
        }

        console.log('Link saved successfully:', link.trim());
        res.status(200).json({ 
            message: 'Link saved successfully', 
            data: driveLink 
        });
    } catch (err) {
        console.error('Error saving Drive link:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// @route   GET /api/drive-link
// @desc    Get the saved Google Drive link from database, along with files if folder
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const driveLink = await DriveLink.findOne();
        
        if (driveLink) {
            console.log('Link fetched successfully:', driveLink.link);
            
            let files = [];
            const folderId = extrairFolderId(driveLink.link);
            if (folderId) {
                try {
                    files = await listarArquivosDaPasta(folderId);
                } catch (err) {
                    console.error('Failed to list folder files:', err);
                    // Fallback to the link itself if it's not listable
                    files = [driveLink.link];
                }
            } else {
                files = [driveLink.link];
            }

            res.status(200).json({
                _id: driveLink._id,
                link: driveLink.link,
                files: files
            });
        } else {
            console.log('Link fetched successfully: (No link set yet)');
            res.status(200).json({ link: '', files: [] });
        }
    } catch (err) {
        console.error('Error fetching Drive link:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

module.exports = router;
