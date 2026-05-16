const Quote = require('../models/Quote');
const User = require('../models/User');
const { EVENTS, sendNotification } = require('../services/notificationService');

// @desc    Submit a quote (Public)
// @route   POST /api/quotes
// @access  Public
exports.submitQuote = async (req, res) => {
    try {
        const { name, phone, location, serviceType, description } = req.body;
        
        const newQuote = new Quote({
            userId: req.user ? req.user._id : null,
            name,
            phone,
            location,
            serviceType,
            description,
            status: 'new'
        });

        await newQuote.save();
        
        res.status(201).json({
            message: 'Krisha Buildings: Operation request logged successfully.',
            quote: newQuote
        });

        // Send Quote Requested Notification (Non-blocking)
        if (req.user) {
            sendNotification(EVENTS.QUOTE_REQUESTED, req.user).catch(err => console.error('Quote Notify Error:', err));
        }
    } catch (error) {
        res.status(500).json({ message: `Krisha Buildings: Quote System Error - ${error.message}` });
    }
};

// @desc    Get all quotes
// @route   GET /api/quotes
// @access  Private/Admin
exports.getQuotes = async (req, res) => {
    try {
        const quotes = await Quote.find().populate('userId', 'name email').sort({ createdAt: -1 });
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
        const quote = await Quote.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('userId', 'name email');
        if (!quote) return res.status(404).json({ message: 'Quote not found' });
        
        res.json(quote);

        // Notify Customer if status changed
        if (req.body.status && quote.userId) {
            let event = null;
            if (req.body.status === 'accepted') event = EVENTS.QUOTE_ACCEPTED;
            else if (req.body.status === 'rejected') event = EVENTS.QUOTE_REJECTED;
            
            if (event) {
                sendNotification(event, quote.userId).catch(console.error);
            }
        }
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
