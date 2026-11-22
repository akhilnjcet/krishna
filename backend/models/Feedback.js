const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    default: '',
    maxlength: 2000
  },
  services: [{
    type: String,
    trim: true
  }],
  customerName: {
    type: String,
    trim: true,
    default: 'Valued Customer'
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
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
    default: 'Customer Portal Review'
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

feedbackSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
