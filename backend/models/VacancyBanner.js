const mongoose = require('mongoose');

const vacancyBannerSchema = new mongoose.Schema({
    title: { type: String, default: 'Urgent Job Vacancies' },
    description: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    driveUrl: { type: String, default: '' },          // Google Drive link for full-res circular / banner
    actionLink: { type: String, default: '#/careers' },
    isActive: { type: Boolean, default: true },
    isUrgent: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('VacancyBanner', vacancyBannerSchema);
