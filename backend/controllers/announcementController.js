const Announcement = require('../models/Announcement');

// @desc    Get active announcements for public marquee
// @route   GET /api/announcements
// @access  Public
exports.getPublicAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find({ isActive: true })
            .sort({ createdAt: -1 });
        res.json({ success: true, count: announcements.length, data: announcements });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all announcements for admin
// @route   GET /api/announcements/admin
// @access  Private/Admin
exports.getAdminAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: announcements.length, data: announcements });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create new announcement
// @route   POST /api/announcements
// @access  Private/Admin
exports.createAnnouncement = async (req, res) => {
    try {
        const { text, type, link, isActive } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, message: 'Announcement text is required.' });
        }

        const announcement = await Announcement.create({
            text: text.trim(),
            type: ['info', 'warning', 'maintenance', 'urgent'].includes(type) ? type : 'info',
            link: link ? link.trim() : '',
            isActive: isActive !== undefined ? Boolean(isActive) : true,
            createdBy: req.user?._id
        });

        res.status(201).json({ success: true, data: announcement, message: 'Announcement created successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private/Admin
exports.updateAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Announcement not found.' });
        }

        res.json({ success: true, data: announcement, message: 'Announcement updated successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
exports.deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndDelete(req.params.id);
        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Announcement not found.' });
        }
        res.json({ success: true, message: 'Announcement deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
