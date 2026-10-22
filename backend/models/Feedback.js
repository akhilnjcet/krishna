const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    default: ''
  },
  services: [{
    type: String,
    trim: true
  }],
  customerName: {
    type: String,
    trim: true,
    default: 'Anonymous Customer'
  },
  customerPhone: {
    type: String,
    trim: true,
    default: ''
  },
  consentGiven: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    default: 'Website Review Form'
  },
  openedGoogleReview: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['received', 'reviewed', 'archived'],
    default: 'received'
  }
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
