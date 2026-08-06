#!/usr/bin/env node
/**
 * import-to-atlas.js
 * 
 * Imports all exported JSON files into MongoDB Atlas.
 * 
 * Usage: ATLAS_URI="mongodb+srv://user:pass@cluster.mongodb.net/krishna-erp" node import-to-atlas.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const ATLAS_URI = process.env.ATLAS_URI || process.env.MONGODB_URI;
const EXPORT_DIR = path.join(__dirname, 'atlas-export');

if (!ATLAS_URI || ATLAS_URI.includes('localhost')) {
    console.error('❌ ERROR: Please provide your Atlas URI.');
    console.error('   Run: set ATLAS_URI=mongodb+srv://user:pass@cluster.mongodb.net/krishna-erp');
    console.error('   Then: node import-to-atlas.js');
    process.exit(1);
}

(async () => {
    try {
        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(ATLAS_URI);
        const db = mongoose.connection.db;
        console.log('✅ Connected to Atlas!\n');

        const jsonFiles = fs.readdirSync(EXPORT_DIR).filter(f => f.endsWith('.json'));

        for (const file of jsonFiles) {
            const collectionName = file.replace('.json', '');
            const docs = JSON.parse(fs.readFileSync(path.join(EXPORT_DIR, file), 'utf8'));

            if (docs.length === 0) {
                console.log(`  ⏭  ${collectionName}: empty, skipped`);
                continue;
            }

            // Convert string _id fields back to ObjectId where needed
            const collection = db.collection(collectionName);

            // Drop existing docs with same IDs to avoid duplicates
            const ids = docs.filter(d => d._id).map(d => d._id);
            if (ids.length > 0) {
                await collection.deleteMany({ _id: { $in: ids } }).catch(() => {});
            }

            await collection.insertMany(docs, { ordered: false });
            console.log(`  ✓ ${collectionName}: ${docs.length} documents imported`);
        }

        console.log('\n✅ Atlas import complete!');
        console.log('\nNow set your Vercel environment variable:');
        console.log('   MONGODB_URI = ' + ATLAS_URI);
        await mongoose.disconnect();
    } catch (err) {
        console.error('Import error:', err.message);
        process.exit(1);
    }
})();
