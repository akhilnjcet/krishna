const mongoose = require('mongoose');
const SystemSetting = require('./models/SystemSetting');
require('dotenv').config();

const MONGO_URI = "mongodb://8594030186:123@ac-ct6axle-shard-00-00.9vipymx.mongodb.net:27017,ac-ct6axle-shard-00-01.9vipymx.mongodb.net:27017,ac-ct6axle-shard-00-02.9vipymx.mongodb.net:27017/gf?ssl=true&replicaSet=atlas-df9pyq-shard-0&authSource=admin&retryWrites=true&w=majority";

const settings = [
    {
        key: 'map_embed_url',
        value: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3917.86141356417!2d76.3951277!3d10.8981353!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba7d7df303996fd%3A0xe144438f2273f6f2!2sKrishna%20engineering%20works%20thiruvazhiyode.(welding%20workshop)!5e0!3m2!1sen!2sin!4v1775236981093!5m2!1sen!2sin',
        category: 'general',
        description: 'Google Maps Embed URL for Workshop'
    },
    {
        key: 'footer_address',
        value: 'Thiruvazhiyode, Sreekrishnapuram, Kerala 679514',
        category: 'general',
        description: 'Workshop Primary Address'
    },
    {
        key: 'footer_phone',
        value: '+91 85940 30186',
        category: 'general'
    },
    {
        key: 'floating_whatsapp',
        value: '918594030186',
        category: 'general'
    }
];

async function seedSettings() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB for settings update...");

        for (const s of settings) {
            await SystemSetting.findOneAndUpdate(
                { key: s.key },
                s,
                { upsert: true, new: true }
            );
            console.log(`Updated setting: ${s.key}`);
        }

        console.log("Settings synchronization complete!");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seedSettings();
