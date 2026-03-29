const Quote = require('../models/Quote');

// @desc    Submit a quote (Public)
// @route   POST /api/quotes
// @access  Public
exports.submitQuote = async (req, res) => {
    try {
        const estimatedCost = 5000 + Math.random() * 10000;
        
        const newQuote = await Quote.create({
            ...req.body,
            userId: req.user._id, // Critical association
            estimatedCost,
            status: 'new'
        });

        res.status(201).json(newQuote);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all quotes
// @route   GET /api/quotes
// @access  Private/Admin
exports.getQuotes = async (req, res) => {
    try {
        const quotes = await Quote.find().sort({ createdAt: -1 });
        res.json(quotes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user's quotes
// @route   GET /api/quotes/my-quotes
// @access  Private
exports.getMyQuotes = async (req, res) => {
    try {
        const quotes = await Quote.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(quotes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update quote status
// @route   PUT /api/quotes/:id
// @access  Private/Admin
exports.updateQuote = async (req, res) => {
    try {
        const quote = await Quote.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!quote) return res.status(404).json({ message: 'Quote not found' });
        res.json(quote);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a quote
// @route   DELETE /api/quotes/:id
// @access  Private/Admin
exports.deleteQuote = async (req, res) => {
    try {
        const quote = await Quote.findByIdAndDelete(req.params.id);
        if (!quote) return res.status(404).json({ message: 'Quote not found' });
        res.json({ message: 'Quote removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
