require('dotenv').config();
const mongoose = require('mongoose');

const forceReindex = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('--- DATABASE RE-INDEXING TERMINAL ---');

        const User = mongoose.connection.collection('users');

        console.log('1. Fetching current operational indexes...');
        const indexes = await User.indexes();
        console.log(`- Current Index Count: ${indexes.length}`);

        console.log('2. Dropping potentially corrupted unique constraints...');
        try {
            await User.dropIndex('username_1');
            console.log('✅ Dropped: username_1');
        } catch (e) {
            console.log('ℹ️  username_1 index already clear.');
        }

        try {
            await User.dropIndex('staff_id_1');
            console.log('✅ Dropped: staff_id_1');
        } catch (e) {
            console.log('ℹ️  staff_id_1 index already clear.');
        }

        console.log('3. Re-mapping Sparse Unique Registry...');
        // We use createIndex with sparse: true to allow multiple users to have NO staff_id or NO username
        await User.createIndex({ username: 1 }, { unique: true, sparse: true });
        console.log('✅ Re-indexed: username [Sparse/Unique]');

        await User.createIndex({ staff_id: 1 }, { unique: true, sparse: true });
        console.log('✅ Re-indexed: staff_id [Sparse/Unique]');

        console.log('\n--- SYSTEM RE-SYNCHRONIZED ---');
        console.log('You may now restart your server and register "rohit" or "rohini".');
        
        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('Re-indexing Failure:', err);
        process.exit(1);
    }
};

forceReindex();
