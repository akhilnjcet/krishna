const webpush = require('web-push');
const SystemSetting = require('../models/SystemSetting');

let isInitialized = false;

const initializeWebPush = async () => {
    if (isInitialized) return;
    try {
        let setting = await SystemSetting.findOne({ key: 'vapid_keys' });
        let vapidKeys;
        if (!setting) {
            vapidKeys = webpush.generateVAPIDKeys();
            setting = await SystemSetting.create({
                key: 'vapid_keys',
                value: JSON.stringify(vapidKeys)
            });
            console.log("🔑 Generated and persisted new VAPID keys for Web Push.");
        } else {
            vapidKeys = JSON.parse(setting.value);
        }
        
        webpush.setVapidDetails(
            'mailto:krishnaengineeringworks0715@gmail.com',
            vapidKeys.publicKey,
            vapidKeys.privateKey
        );
        
        isInitialized = true;
        return vapidKeys.publicKey;
    } catch (err) {
        console.error("❌ Failed to initialize Web Push VAPID keys:", err.message);
        return null;
    }
};

const sendPushNotification = async (subscription, payload) => {
    try {
        await initializeWebPush();
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        return { success: true };
    } catch (err) {
        console.error("❌ Web Push trigger failed:", err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription is no longer valid or has expired
            return { success: false, expired: true };
        }
        return { success: false, error: err.message };
    }
};

module.exports = {
    initializeWebPush,
    sendPushNotification
};
