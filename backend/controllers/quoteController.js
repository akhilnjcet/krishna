const Quote = require('../models/Quote');

// @desc    Submit a quote (Public)
// @route   POST /api/quotes
// @access  Public
exports.submitQuote = async (req, res) => {
    try {
        const estimatedCost = 5000 + Math.random() * 10000;
        let quote = { ...req.body, estimatedCost, _id: 'mock-quote-id' };

        try {
            const newQuote = await Quote.create(req.body);
            newQuote.estimatedCost = estimatedCost;
            await newQuote.save();
            quote = newQuote;
        } catch (dbError) {
            console.log("Database offline or error, returning mock quote estimation.");
        }

        res.status(201).json(quote);
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
