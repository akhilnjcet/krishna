const express = require('express');
const router = express.Router();
const Visit = require('../models/Visit');
const { protect, admin } = require('../middleware/authMiddleware');

// Basic in-memory store to prevent rapid refreshes from the same IP
const recentVisits = new Map();

// @route   POST /api/visits
// @desc    Increment visit count
router.post('/', async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const now = Date.now();
        
        // Anti-spam: Ignore if the exact same IP visited within the last 1 minute
        if (recentVisits.has(ip)) {
            const lastVisit = recentVisits.get(ip);
            if (now - lastVisit < 60000) { // 1 minute cooldown
                return res.status(200).json({ message: 'Visit logged recently. Ignored to prevent spam.' });
            }
        }
        
        recentVisits.set(ip, now);
        
        // cleanup old IPs from map occasionally
        if (recentVisits.size > 1000) {
            recentVisits.clear(); 
        }

        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        
        // Find today's document and increment, or create if it doesn't exist
        const updatedVisit = await Visit.findOneAndUpdate(
            { date: today },
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, count: updatedVisit.count });
    } catch (error) {
        console.error('Error tracking visit:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// @route   GET /api/visits
// @desc    Get all visit stats (Total + Daily)
router.get('/', protect, admin, async (req, res) => {
    try {
        const visits = await Visit.find().sort({ date: 1 });
        
        const totalVisits = visits.reduce((sum, record) => sum + record.count, 0);
        
        res.status(200).json({
            success: true,
            totalVisits,
            dailyVisits: visits
        });
    } catch (error) {
        console.error('Error fetching visits:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;
