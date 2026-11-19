const express = require('express');
const router = express.Router();
const fleetTripController = require('../controllers/fleetTripController');
const { protect } = require('../middleware/authMiddleware');
const { requireDriverPermission } = require('../middleware/driverPermissionMiddleware');

router.use(protect);

// ─── LIST & VIEW TRIPS ────────────────────────────────────────────────
// Drivers see only their assigned trips; Staff/Manager/Admin see according to driver.view_reports / driver.view
router.get('/', fleetTripController.getTrips);
router.get('/:id', fleetTripController.getTripById);

// ─── ASSIGN NEW TRIP ──────────────────────────────────────────────────
// Staff / Manager with driver.assign_trip, or Admin
router.post('/', requireDriverPermission('driver.assign_trip'), fleetTripController.createTrip);

// ─── DRIVER TRIP ACTIONS ──────────────────────────────────────────────
router.post('/:id/confirm', requireDriverPermission('driver.update_trip'), fleetTripController.confirmTrip);
router.post('/:id/start', requireDriverPermission('driver.update_trip'), fleetTripController.startTrip);
router.post('/:id/pause', requireDriverPermission('driver.update_trip'), fleetTripController.pauseTrip);
router.post('/:id/resume', requireDriverPermission('driver.update_trip'), fleetTripController.resumeTrip);
router.post('/:id/complete', requireDriverPermission('driver.update_trip'), fleetTripController.completeTrip);
router.post('/:id/location', requireDriverPermission('driver.update_trip'), fleetTripController.updateLiveLocation);

// ─── UPLOAD TRANSPORT DOCUMENTS / E-WAY BILL ──────────────────────────
// Staff / Manager with driver.manage_documents, or Admin
router.post('/:id/documents', requireDriverPermission('driver.manage_documents'), fleetTripController.attachTripDocument);

module.exports = router;
