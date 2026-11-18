const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const driverController = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// ─── DRIVER ROUTES (Must be defined before /:id) ──────────────────────
router.get('/drivers/summary', driverController.getDriverDashboardSummary);
router.get('/drivers/eligible', driverController.getEligibleDrivers);
router.get('/drivers/staff-candidates', driverController.getStaffCandidates);
router.get('/drivers/check-expiries', driverController.checkLicenseExpiries);
router.get('/drivers', driverController.getDrivers);
router.get('/drivers/:id', driverController.getDriverById);

router.post('/drivers', authorize('admin', 'staff'), driverController.createDriver);
router.put('/drivers/:id', authorize('admin', 'staff'), driverController.updateDriver);
router.delete('/drivers/:id', authorize('admin'), driverController.deleteDriver);
router.post('/drivers/:driverId/assign', authorize('admin', 'staff'), driverController.assignDriverToVehicle);

// ─── VEHICLE ROUTES ──────────────────────────────────────────────────
router.get('/', vehicleController.getVehicles);
router.get('/reports/summary', vehicleController.getFleetReports);
router.get('/:id', vehicleController.getVehicleById);

router.post('/', authorize('admin', 'staff'), vehicleController.createVehicle);
router.put('/:id', authorize('admin', 'staff'), vehicleController.updateVehicle);

router.post('/:id/documents', authorize('admin', 'staff'), vehicleController.addVehicleDocument);
router.post('/:id/trips', authorize('admin', 'staff'), vehicleController.recordTrip);
router.patch('/:id/trips/:tripId/complete', authorize('admin', 'staff'), vehicleController.completeTrip);

router.post('/:id/fuel', authorize('admin', 'staff'), vehicleController.recordFuelExpense);
router.post('/:id/service', authorize('admin', 'staff'), vehicleController.recordServiceExpense);

module.exports = router;
