const mongoose = require('mongoose');

const chatbotContactSettingSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Krishna Engineering Works' },
  contactPerson: { type: String, default: 'Managing Director / Desk' },
  primaryPhone: { type: String, default: '+919447940835' },
  secondaryPhone: { type: String, default: '' },
  whatsappNumber: { type: String, default: '+919447940835' },
  email: { type: String, default: 'contact@krishnaengg.com' },
  website: { type: String, default: 'https://krishna-akhilnjcets-projects.vercel.app' },
  businessHours: { type: String, default: 'Mon - Sat: 9:00 AM - 6:00 PM' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('ChatbotContactSetting', chatbotContactSettingSchema);
