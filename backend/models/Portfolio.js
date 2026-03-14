const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { 
        type: String, 
        required: true,
        enum: ['Welding', 'Roofing', 'Truss Work', 'Fabrication', 'Construction', 'Other']
    },
    description: { type: String, required: true },
    location: { type: String },
    projectDate: { type: Date },
    clientName: { type: String },
    images: [{
        url: { type: String, required: true },
        publicId: { type: String } // Optional for external links like Google Drive
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Portfolio', portfolioSchema);
