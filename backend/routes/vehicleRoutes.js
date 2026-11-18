const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

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
