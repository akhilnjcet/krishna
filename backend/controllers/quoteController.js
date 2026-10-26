const Quote = require('../models/Quote');
const { sendStatusUpdateEmail } = require('../services/emailService');

const validateCoordinates = (lat, lng) => {
    if (lat !== undefined && lat !== null && lat !== '') {
        const numLat = Number(lat);
        if (isNaN(numLat) || numLat < -90 || numLat > 90) {
            return 'Invalid latitude. Must be a valid number between -90 and 90.';
        }
    }
    if (lng !== undefined && lng !== null && lng !== '') {
        const numLng = Number(lng);
        if (isNaN(numLng) || numLng < -180 || numLng > 180) {
            return 'Invalid longitude. Must be a valid number between -180 and 180.';
        }
    }
    return null;
};

const sanitizeWorksiteLocation = (loc) => {
    if (!loc) return undefined;
    const hasLat = loc.latitude !== undefined && loc.latitude !== null && loc.latitude !== '';
    const hasLng = loc.longitude !== undefined && loc.longitude !== null && loc.longitude !== '';
    
    return {
        address: typeof loc.address === 'string' ? loc.address.trim() : '',
        latitude: hasLat ? Number(loc.latitude) : null,
        longitude: hasLng ? Number(loc.longitude) : null,
        source: ['gps', 'manual', 'search', 'none'].includes(loc.source) ? loc.source : (hasLat && hasLng ? 'manual' : 'none'),
        accuracy: (loc.accuracy !== undefined && loc.accuracy !== null && !isNaN(Number(loc.accuracy))) ? Number(loc.accuracy) : null,
        capturedAt: (hasLat && hasLng) ? (loc.capturedAt ? new Date(loc.capturedAt) : new Date()) : null
    };
};

// @desc    Submit a quote (Private)
// @route   POST /api/quotes
// @access  Private
exports.submitQuote = async (req, res) => {
    try {
        const body = { ...req.body };

        if (body.worksiteLocation) {
            const coordError = validateCoordinates(body.worksiteLocation.latitude, body.worksiteLocation.longitude);
            if (coordError) {
                return res.status(400).json({ message: coordError });
            }
            body.worksiteLocation = sanitizeWorksiteLocation(body.worksiteLocation);
            if (!body.location && body.worksiteLocation.address) {
                body.location = body.worksiteLocation.address;
            }
        }

        if (!body.location) {
            return res.status(400).json({ message: 'Location is required' });
        }

        const newQuote = await Quote.create({
            ...body,
            userId: req.user ? req.user._id : null,
            estimatedCost: 0,
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

// @desc    Update quote status / worksite location / details
// @route   PUT /api/quotes/:id
// @access  Private (Admin, Staff, or Quote Owner)
exports.updateQuote = async (req, res) => {
    try {
        const existingQuote = await Quote.findById(req.params.id);
        if (!existingQuote) return res.status(404).json({ message: 'Quote not found' });

        const isAdminOrStaff = req.user && ['admin', 'staff'].includes(req.user.role);
        const isOwner = req.user && existingQuote.userId && existingQuote.userId.toString() === req.user._id.toString();

        if (!isAdminOrStaff && !isOwner) {
            return res.status(403).json({ message: 'Not authorized to modify this quotation' });
        }

        const updates = { ...req.body };

        // If customer, prevent altering sensitive financial or workflow fields
        if (!isAdminOrStaff && isOwner) {
            delete updates.status;
            delete updates.estimatedCost;
            delete updates.userId;
        }

        if (updates.worksiteLocation) {
            const coordError = validateCoordinates(updates.worksiteLocation.latitude, updates.worksiteLocation.longitude);
            if (coordError) {
                return res.status(400).json({ message: coordError });
            }
            updates.worksiteLocation = sanitizeWorksiteLocation(updates.worksiteLocation);
            if (updates.worksiteLocation.address && !updates.location) {
                updates.location = updates.worksiteLocation.address;
            }
        }

        const quote = await Quote.findByIdAndUpdate(req.params.id, updates, { new: true }).populate('userId', 'name email');
        
        res.json(quote);

        // Notify Customer if status changed
        if (updates.status && updates.status !== existingQuote.status && quote.userId?.email) {
            sendStatusUpdateEmail(quote.userId.email, quote.userId.name, `${quote.serviceType} Quote`, updates.status).catch(console.error);
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
