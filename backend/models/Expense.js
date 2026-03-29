const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, enum: ['material', 'fuel', 'machinery', 'utilities', 'others'], default: 'others' },
    description: { type: String },
    date: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Expense', expenseSchema);
