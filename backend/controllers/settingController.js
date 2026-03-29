const SystemSetting = require('../models/SystemSetting');

exports.getSettings = async (req, res) => {
    try {
        const settings = await SystemSetting.find();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const { settings } = req.body; // Expecting an object { key: value, ... }
        
        const updatePromises = Object.entries(settings).map(([key, value]) => {
            return SystemSetting.findOneAndUpdate(
                { key },
                { value, updatedAt: Date.now() },
                { upsert: true, new: true }
            );
        });

        await Promise.all(updatePromises);
        res.json({ message: "Settings updated successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getPublicSettings = async (req, res) => {
    try {
        // Only return non-sensitive settings for public view
        const publicKeys = [
            'systemName', 'footer_description', 'footer_address', 
            'footer_phone', 'footer_email', 'social_in', 'social_fb', 'social_x',
            'floating_whatsapp', 'floating_phone', 'floating_email',
            'footer_copyright', 'footer_tos', 'footer_privacy'
        ];
        const settings = await SystemSetting.find({ key: { $in: publicKeys } });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getWhatsAppStatus = async (req, res) => {
    try {
        const { getWhatsAppStatus, ensureWhatsApp } = require('../services/whatsappService');
        
        // Force a connection check if not already connected
        await ensureWhatsApp();
        
        const status = await getWhatsAppStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
