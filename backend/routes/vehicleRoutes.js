const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const driverController = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { requireDriverPermission } = require('../middleware/driverPermissionMiddleware');

router.use(protect);

// ─── DRIVER ROUTES (Backward compatibility with /api/vehicles/drivers) ──
router.get('/drivers/summary', requireDriverPermission('driver.view'), driverController.getDriverDashboardSummary);
router.get('/drivers/eligible', requireDriverPermission('driver.view'), driverController.getEligibleDrivers);
router.get('/drivers/staff-candidates', requireDriverPermission('driver.view'), driverController.getStaffCandidates);
router.get('/drivers/check-expiries', requireDriverPermission('driver.view'), driverController.checkLicenseExpiries);
router.get('/drivers', requireDriverPermission('driver.view'), driverController.getDrivers);
router.get('/drivers/:id', requireDriverPermission('driver.view'), driverController.getDriverById);

router.post('/drivers', requireDriverPermission('driver.create'), driverController.createDriver);
router.put('/drivers/:id', requireDriverPermission('driver.edit'), driverController.updateDriver);
router.delete('/drivers/:id', requireDriverPermission('driver.delete'), driverController.deleteDriver);
router.post('/drivers/:driverId/assign', requireDriverPermission('driver.assign_vehicle'), driverController.assignDriverToVehicle);

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
