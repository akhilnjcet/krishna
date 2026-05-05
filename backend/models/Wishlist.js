const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lodgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lodge', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
