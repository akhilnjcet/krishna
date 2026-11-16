const mongoose = require('mongoose');

const vacancySchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    jobType: { 
        type: String, 
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Walk-in'], 
        default: 'Full-time' 
    },
    experience: { type: String, default: 'Freshers / Experienced' },
    location: { type: String, default: 'Industrial Area, Thiruvazhiyode, Palakkad, Kerala' },
    salary: { type: String, default: 'Competitive / Commensurate with experience' },
    openings: { type: Number, default: 1 },
    description: { type: String, required: true },
    requirements: { type: [String], default: [] },
    circularUrl: { type: String, default: '' },       // Uploaded PDF or image circular
    circularType: { 
        type: String, 
        enum: ['pdf', 'image', 'drive', 'none'], 
        default: 'none' 
    },
    driveUrl: { type: String, default: '' },          // Google Drive link for circular
    deadline: { type: Date },
    isUrgent: { type: Boolean, default: false },
    status: { 
        type: String, 
        enum: ['open', 'closed'], 
        default: 'open' 
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Vacancy', vacancySchema);
