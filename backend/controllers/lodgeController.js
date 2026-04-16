const LodgeData = require('../models/LodgeData');

exports.getLodgeData = async (req, res) => {
    try {
        let data = await LodgeData.findOne({ userId: req.user.id });
        if (!data) {
            return res.json({ status: 'new', message: 'No cloud data found' });
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.syncLodgeData = async (req, res) => {
    try {
        const { rooms, payments, complaints, adminPin, appSettings } = req.body;
        
        const update = {
            rooms,
            payments,
            complaints,
            adminPin,
            appSettings,
            lastSynced: Date.now()
        };

        const data = await LodgeData.findOneAndUpdate(
            { userId: req.user.id },
            update,
            { upsert: true, new: true }
        );

        res.json({ success: true, lastSynced: data.lastSynced });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
