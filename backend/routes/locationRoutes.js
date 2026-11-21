const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect, admin } = require('../middleware/authMiddleware');

// User operations (Staff & Driver location sharing)
router.post('/update', protect, locationController.updateLiveLocation);
router.post('/stop', protect, locationController.stopLocationSharing);
router.get('/status', protect, locationController.getMyLocationStatus);

// Admin-only Live Location Dashboard & Trail operations
router.get('/live-all', protect, admin, locationController.getAllLiveLocations);
router.get('/user/:id/trail', protect, admin, locationController.getUserLocationTrail);

module.exports = router;
