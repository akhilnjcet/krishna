const express = require('express');
const router = express.Router();
const warrantyController = require('../controllers/warrantyServiceController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Warranty Registrations
router.get('/warranties', protect, warrantyController.getAllWarranties);
router.post('/warranties', protect, authorize('admin', 'manager'), warrantyController.createWarranty);

// Service Requests / Complaints
router.get('/service-requests', protect, warrantyController.getAllServiceRequests);
router.post('/service-requests', protect, warrantyController.createServiceRequest);
router.put('/service-requests/:id/assign', protect, authorize('admin', 'manager'), warrantyController.assignTechnician);
router.put('/service-requests/:id/record-repair', protect, authorize('admin', 'manager', 'staff'), warrantyController.recordRepair);
router.put('/service-requests/:id/signoff', protect, warrantyController.customerSignOff);

module.exports = router;
