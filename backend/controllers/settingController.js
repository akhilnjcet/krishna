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
