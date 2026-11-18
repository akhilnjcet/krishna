const express = require('express');
const router = express.Router();
const handoverController = require('../controllers/handoverController');
const { protect, authorize } = require('../middleware/auth');

// Get Handover details for a project
router.get('/projects/:id/handover', protect, handoverController.getHandoverDetails);

// Initiate / Request Handover (PM / Staff)
router.post('/projects/:id/handover/request', protect, authorize('admin', 'manager', 'staff'), handoverController.requestHandover);

// Update Checklist items & notes
router.put('/projects/:id/handover/checklist', protect, authorize('admin', 'manager', 'staff'), handoverController.updateChecklist);

// Record Customer Acceptance (Customer, Admin, Staff)
router.post('/projects/:id/handover/acceptance', protect, handoverController.recordCustomerAcceptance);

// Final Handover Approval & Certificate Issuance (Admin / Manager only)
router.post('/projects/:id/handover/approve', protect, authorize('admin', 'manager'), handoverController.approveHandover);

module.exports = router;
