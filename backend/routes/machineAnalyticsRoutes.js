const express = require('express');
const router = express.Router();
const machineAnalyticsController = require('../controllers/machineAnalyticsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/logs', machineAnalyticsController.getMachineLogs);
router.get('/analytics', machineAnalyticsController.getMachineAnalytics);
router.post('/logs', authorize('admin', 'staff'), machineAnalyticsController.recordMachineLog);

module.exports = router;
