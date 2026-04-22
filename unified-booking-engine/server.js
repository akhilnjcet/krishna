require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const apiRoutes = require('./routes/api');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', apiRoutes);

// Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/unifiedLodge';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB successfully connected.');
    
    // Auto-seed dummy data for the college project demonstration
    require('./seed'); 
    
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
        console.log(`Unified Booking System running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to connect to MongoDB:', err);
});
