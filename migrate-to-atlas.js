#!/usr/bin/env node
/**
 * migrate-to-atlas.js
 * 
 * Exports all collections from local MongoDB to JSON files
 * so you can import them to MongoDB Atlas.
 * 
 * Run: node migrate-to-atlas.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const LOCAL_URI = 'mongodb://localhost:27017/krishna-erp';
const OUT_DIR = path.join(__dirname, 'atlas-export');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
    try {
        console.log('Connecting to local MongoDB...');
        await mongoose.connect(LOCAL_URI);
        const db = mongoose.connection.db;

        const collections = await db.listCollections().toArray();
        console.log(`Found ${collections.length} collections:`);

        for (const col of collections) {
            const name = col.name;
            const docs = await db.collection(name).find({}).toArray();
            const outFile = path.join(OUT_DIR, `${name}.json`);
            fs.writeFileSync(outFile, JSON.stringify(docs, null, 2));
            console.log(`  ✓ ${name}: ${docs.length} documents → ${outFile}`);
        }

        console.log('\n✅ Export complete. Files saved to: ' + OUT_DIR);
        console.log('\nNext steps:');
        console.log('1. Go to https://cloud.mongodb.com → Create Free Cluster');
        console.log('2. Create Database User with read/write permissions');
        console.log('3. Add 0.0.0.0/0 to Network Access (Allow from Anywhere)');
        console.log('4. Get your connection string (srv format)');
        console.log('5. Import collections using mongoimport or Atlas Data Import');
        console.log('6. Set MONGODB_URI in Vercel Environment Variables');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Migration error:', err.message);
        process.exit(1);
    }
})();
