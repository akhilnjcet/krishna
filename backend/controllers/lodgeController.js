const LodgeData = require('../models/LodgeData');

exports.getLodgeData = async (req, res) => {
    try {
        let userId = req.user.id;
        if (userId === 'failsafe-admin') userId = "00000000000000000000ad14";
        let data = await LodgeData.findOne({ userId });
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
        
        let userId = req.user.id;
        if (userId === 'failsafe-admin') userId = "00000000000000000000ad14";

        // 1. Fetch current data for comparison
        const oldData = await LodgeData.findOne({ userId });
        
        const update = {
            rooms,
            payments,
            complaints,
            adminPin,
            appSettings,
            lastSynced: Date.now()
        };

        const data = await LodgeData.findOneAndUpdate(
            { userId },
            update,
            { upsert: true, new: true }
        );

        // 2. Differential Notification Logic (Non-blocking)
        console.log(`[SYNC] Processing ${rooms.length} rooms and ${complaints.length} complaints for user ${userId}`);
        
        if (oldData) {
            const User = require('../models/User');
            const { EVENTS, sendNotification } = require('../services/notificationService');

            // Helper to find user by name or phone
            const findTargetUser = async (identifier) => {
                if (!identifier) return null;
                // 1. Try exact name
                let u = await User.findOne({ name: identifier });
                if (u) return u;
                // 2. Try partial name
                u = await User.findOne({ name: { $regex: new RegExp(identifier, 'i') } });
                if (u) return u;
                // 3. Try phone (if identifier looks like one)
                const cleanPhone = identifier.replace(/\D/g, '');
                if (cleanPhone.length >= 10) {
                    u = await User.findOne({ 
                        $or: [{ phone: cleanPhone }, { phoneNumber: cleanPhone }] 
                    });
                }
                return u;
            };

            // A. Check for new tenant assignments
            rooms.forEach(async (newRoom) => {
                const oldRoom = oldData.rooms.find(r => r.id === newRoom.id);
                if (newRoom.status === 'occupied' && (!oldRoom || oldRoom.status !== 'occupied')) {
                    console.log(`[SYNC] Detected New Assignment: Room ${newRoom.number} -> ${newRoom.tenant}`);
                    const user = await findTargetUser(newRoom.tenant);
                    if (user) {
                        const notifyData = {
                            name: user.name,
                            room: newRoom.number,
                            pin: newRoom.pin
                        };
                        sendNotification(EVENTS.BOOKING_CREATED, user, notifyData)
                            .then(() => console.log(`[SYNC] Notification Sent to ${user.name}`))
                            .catch(e => console.error('[SYNC] Notify Fail:', e.message));
                    } else {
                        console.warn(`[SYNC] Could not find user for tenant: ${newRoom.tenant}`);
                    }
                }
            });

            // B. Check for resolved complaints
            complaints.forEach(async (newComp) => {
                const oldComp = oldData.complaints.find(c => c.id === newComp.id);
                if (newComp.resolved && (!oldComp || !oldComp.resolved)) {
                    console.log(`[SYNC] Detected Resolved Complaint: ${newComp.title}`);
                    const user = await findTargetUser(newComp.userName || newComp.tenant);
                    if (user) {
                        const notifyData = { name: user.name, title: newComp.title };
                        sendNotification(EVENTS.COMPLAINT_RESOLVED, user, notifyData)
                            .then(() => console.log(`[SYNC] Resolution Sent to ${user.name}`))
                            .catch(e => console.error('[SYNC] Resolve Fail:', e.message));
                    }
                }
            });

            // C. Check for new verified payments
            payments.forEach(async (newPay) => {
                const oldPay = oldData.payments.find(p => p.id === newPay.id);
                if (newPay.status === 'Completed' && (!oldPay || oldPay.status !== 'Completed')) {
                    console.log(`[SYNC] Detected New Payment: ₹${newPay.amount} for ${newPay.tenant}`);
                    const user = await findTargetUser(newPay.tenant);
                    if (user) {
                        const notifyData = {
                            name: user.name,
                            amount: newPay.amount,
                            room: newPay.roomNumber || 'Stay'
                        };
                        sendNotification(EVENTS.PAYMENT_SUCCESS, user, notifyData)
                            .then(() => console.log(`[SYNC] Payment Success Sent to ${user.name}`))
                            .catch(e => console.error('[SYNC] Pay Success Fail:', e.message));
                    }
                }
            });
        } else {
            console.log('[SYNC] Initial data baseline established. Notifications will trigger on next change.');
        }

        res.json({ success: true, lastSynced: data.lastSynced });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
