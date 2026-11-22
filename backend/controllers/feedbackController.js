const Feedback = require('../models/Feedback');

/**
 * Submit feedback / customer review
 * Works for both authenticated customers (associating with their account)
 * and public website visitors.
 */
exports.submitFeedback = async (req, res) => {
  try {
    const {
      rating,
      comment,
      services,
      customerName,
      customerPhone,
      customerEmail,
      consentGiven,
      openedGoogleReview
    } = req.body;

    // Consent check
    if (consentGiven === false) {
      return res.status(200).json({
        success: true,
        message: 'No internal feedback stored per customer request.'
      });
    }

    // Server-side Rating validation (Strict 1-5 integer)
    const numericRating = Number(rating);
    if (!numericRating || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid star rating between 1 and 5 stars.'
      });
    }

    // Sanitize written feedback (max 2000 chars)
    const sanitizedComment = typeof comment === 'string' ? comment.trim().slice(0, 2000) : '';

    // Sanitize services (array of strings, max 20)
    let sanitizedServices = [];
    if (Array.isArray(services)) {
      sanitizedServices = services
        .map(s => String(s || '').trim())
        .filter(s => s.length > 0 && s.length <= 100)
        .slice(0, 20);
    }

    // Determine customer association
    let customerId = null;
    let finalCustomerName = '';
    let finalCustomerEmail = '';
    let finalCustomerPhone = '';
    let source = 'Website Review Form';

    if (req.user) {
      customerId = req.user._id || req.user.id;
      finalCustomerName = (req.user.name || '').trim() || 'Valued Customer';
      finalCustomerEmail = (req.user.email || '').trim().toLowerCase();
      finalCustomerPhone = (req.user.phone || '').trim();
      source = 'Customer Portal Review';
    } else {
      finalCustomerName = typeof customerName === 'string' ? customerName.trim().slice(0, 100) : 'Anonymous Customer';
      if (!finalCustomerName) finalCustomerName = 'Anonymous Customer';
      finalCustomerEmail = typeof customerEmail === 'string' ? customerEmail.trim().toLowerCase().slice(0, 100) : '';
      finalCustomerPhone = typeof customerPhone === 'string' ? customerPhone.trim().slice(0, 30) : '';
    }

    // Duplicate submission check: prevent identical feedback within 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
    const duplicateQuery = {
      createdAt: { $gte: thirtySecondsAgo },
      rating: numericRating,
      comment: sanitizedComment
    };

    if (customerId) {
      duplicateQuery.customer = customerId;
    } else if (finalCustomerEmail) {
      duplicateQuery.customerEmail = finalCustomerEmail;
    } else if (finalCustomerPhone) {
      duplicateQuery.customerPhone = finalCustomerPhone;
    }

    const recentDuplicate = await Feedback.findOne(duplicateQuery);
    if (recentDuplicate) {
      return res.status(409).json({
        success: false,
        message: 'Your review was already submitted a moment ago. Thank you!'
      });
    }

    const feedback = new Feedback({
      customer: customerId,
      rating: numericRating,
      comment: sanitizedComment,
      services: sanitizedServices,
      customerName: finalCustomerName,
      customerEmail: finalCustomerEmail,
      customerPhone: finalCustomerPhone,
      consentGiven: consentGiven !== false,
      openedGoogleReview: Boolean(openedGoogleReview),
      source,
      status: 'received'
    });

    await feedback.save();

    return res.status(201).json({
      success: true,
      message: 'Thank you for your valuable feedback! It has been successfully saved.',
      feedback: {
        id: feedback._id,
        rating: feedback.rating,
        comment: feedback.comment,
        services: feedback.services,
        customerName: feedback.customerName,
        source: feedback.source,
        createdAt: feedback.createdAt
      }
    });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to record feedback. Please try again.',
      error: err.message
    });
  }
};

/**
 * Get authenticated customer's own submitted feedbacks
 * GET /api/feedback/my-feedback
 */
exports.getMyFeedback = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required to view feedback history.'
      });
    }

    const feedbacks = await Feedback.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks
    });
  } catch (err) {
    console.error('Error fetching customer feedback:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your feedback history.',
      error: err.message
    });
  }
};

/**
 * Admin: Get all feedback with aggregate statistics
 * GET /api/feedback
 */
exports.getFeedbacks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [feedbacks, total, stats] = await Promise.all([
      Feedback.find()
        .populate('customer', 'name email phone role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Feedback.countDocuments(),
      Feedback.aggregate([
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalCount: { $sum: 1 },
            fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            threeStars: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            twoStars: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            oneStars: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
          }
        }
      ])
    ]);

    const aggregate = stats[0] || {
      avgRating: 0,
      totalCount: 0,
      fiveStars: 0,
      fourStars: 0,
      threeStars: 0,
      twoStars: 0,
      oneStars: 0
    };

    return res.status(200).json({
      success: true,
      feedbacks,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: aggregate
    });
  } catch (err) {
    console.error('Error fetching feedbacks:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback.',
      error: err.message
    });
  }
};
