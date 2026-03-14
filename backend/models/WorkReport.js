const mongoose = require('mongoose');

const workReportSchema = new mongoose.Schema({
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    attachments: [{ type: String }], // URLs to files
    projectName: { type: String },
    progress: { type: Number, default: 0 },
    status: { type: String },
    date: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WorkReport', workReportSchema);
