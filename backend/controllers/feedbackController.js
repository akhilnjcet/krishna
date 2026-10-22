const Feedback = require('../models/Feedback');

// Public: Submit internal website feedback with user consent
exports.submitFeedback = async (req, res) => {
  try {
    const {
      rating,
      comment,
      services,
      customerName,
      customerPhone,
      consentGiven,
      openedGoogleReview
    } = req.body;

    // Consent validation
    if (consentGiven === false) {
      return res.status(200).json({
        success: true,
        message: 'No internal feedback stored per customer request.'
      });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid rating between 1 and 5 stars.'
      });
    }

    const feedback = new Feedback({
      rating: numericRating,
      comment: (comment || '').trim().slice(0, 2000),
      services: Array.isArray(services) ? services.map(s => String(s).trim()) : [],
      customerName: (customerName || '').trim() || 'Anonymous Customer',
      customerPhone: (customerPhone || '').trim(),
      consentGiven: consentGiven !== false,
      openedGoogleReview: Boolean(openedGoogleReview),
      source: 'Website Review Form'
    });

    await feedback.save();

    res.status(201).json({
      success: true,
      message: 'Feedback received successfully. Thank you for helping us improve!',
      feedback: {
        id: feedback._id,
        rating: feedback.rating,
        createdAt: feedback.createdAt
      }
    });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to record feedback. Please try again.',
      error: err.message
    });
  }
};

// Admin: Get all feedback with aggregate stats
exports.getFeedbacks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [feedbacks, total, stats] = await Promise.all([
      Feedback.find()
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

    res.status(200).json({
      success: true,
      feedbacks,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: aggregate
    });
  } catch (err) {
    console.error('Error fetching feedbacks:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve feedback.',
      error: err.message
    });
  }
};
