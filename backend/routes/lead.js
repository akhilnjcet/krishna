const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const chatController = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { publicSubmissionLimiter, honeypotProtection } = require('../middleware/abuseProtection');

// Public capture for chat widget & website inquiries
router.post('/', publicSubmissionLimiter, honeypotProtection, chatController.captureLead);

// Protected CRM routes
router.get('/', protect, authorize('admin', 'staff', 'manager'), leadController.getLeads);
router.post('/manual', protect, authorize('admin', 'staff', 'manager'), leadController.createManualLead);
router.put('/:id', protect, authorize('admin', 'staff', 'manager'), leadController.updateLead);
router.post('/:id/follow-up', protect, authorize('admin', 'staff', 'manager'), leadController.addFollowUp);
router.put('/:id/follow-up/:followUpId/complete', protect, authorize('admin', 'staff', 'manager'), leadController.completeFollowUp);
router.post('/:id/convert', protect, authorize('admin', 'manager'), leadController.convertLeadToCustomer);
router.delete('/:id', protect, authorize('admin'), leadController.deleteLead);

module.exports = router;
