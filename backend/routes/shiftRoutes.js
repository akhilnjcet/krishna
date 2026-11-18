const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const shiftController = require('../controllers/shiftController');

// All shift management endpoints require authentication and admin privileges
router.use(protect, admin);

// Dedicated Late Arrival Settings & Reports
router.get('/settings/late-arrival', shiftController.getLateArrivalSettings);
router.put('/settings/late-arrival', shiftController.updateLateArrivalSettings);
router.get('/reports/late-arrivals', shiftController.getLateArrivalsReport);

// Dedicated Early Checkout Settings & Reports
router.get('/settings/early-checkout', shiftController.getEarlyCheckoutSettings);
router.put('/settings/early-checkout', shiftController.updateEarlyCheckoutSettings);
router.get('/reports/early-checkouts', shiftController.getEarlyCheckoutsReport);

// Shift CRUD
router.get('/', shiftController.getShifts);
router.get('/roster/today', shiftController.getTodayShiftRoster);
router.get('/:id', shiftController.getShiftById);
router.post('/', shiftController.createShift);
router.put('/:id', shiftController.updateShift);
router.delete('/:id', shiftController.deleteShift);
router.patch('/:id/toggle', shiftController.toggleShiftStatus);
router.post('/:id/assign', shiftController.assignStaffToShift);

// Manual attendance correction with audit trail
router.post('/attendance/correct', shiftController.manualAttendanceCorrection);

module.exports = router;
