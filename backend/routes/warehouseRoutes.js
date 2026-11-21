const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouseController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Warehouses / Locations
router.get('/warehouses', protect, warehouseController.getAllWarehouses);
router.post('/warehouses', protect, authorize('admin', 'manager'), warehouseController.createWarehouse);
router.put('/warehouses/:id', protect, authorize('admin', 'manager'), warehouseController.updateWarehouse);
router.delete('/warehouses/:id', protect, authorize('admin', 'manager'), warehouseController.deleteWarehouse);
router.get('/warehouses/stock-overview', protect, warehouseController.getLocationStockOverview);

// Stock Transfers
router.get('/stock-transfers', protect, warehouseController.getAllStockTransfers);
router.post('/stock-transfers', protect, authorize('admin', 'manager', 'staff'), warehouseController.createStockTransfer);
router.put('/stock-transfers/:id/assign-trip', protect, authorize('admin', 'manager', 'staff'), warehouseController.assignTripToTransfer);
router.put('/stock-transfers/:id/dispatch', protect, authorize('admin', 'manager'), warehouseController.dispatchStockTransfer);
router.put('/stock-transfers/:id/receive', protect, authorize('admin', 'manager', 'staff'), warehouseController.receiveStockTransfer);

// Barcode & QR Rapid Operations
router.get('/inventory/scan-lookup/:code', protect, warehouseController.scanLookup);
router.post('/inventory/scan-action', protect, authorize('admin', 'manager', 'staff'), warehouseController.scanAction);

module.exports = router;
