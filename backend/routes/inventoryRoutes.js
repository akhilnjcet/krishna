const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect, admin, authorize } = require('../middleware/authMiddleware');
const { validateObjectIdParam } = require('../utils/validateInputs');

// Validate all :id route parameters
router.param('id', validateObjectIdParam('id'));


// Metrics
router.get('/stats', protect, authorize('admin', 'staff'), inventoryController.getStats);

// Items CRUD
router.get('/items', protect, authorize('admin', 'staff'), inventoryController.getItems);
router.get('/items/:id', protect, authorize('admin', 'staff'), inventoryController.getItemById);
router.post('/items', protect, admin, inventoryController.createItem);
router.put('/items/:id', protect, admin, inventoryController.updateItem);
router.delete('/items/:id', protect, admin, inventoryController.deleteItem);

// Tool assignment & return
router.post('/tools/:id/assign', protect, admin, inventoryController.assignTool);
router.post('/tools/:id/return', protect, admin, inventoryController.returnTool);

// Material stock adjustment
router.post('/materials/:id/stock', protect, admin, inventoryController.adjustStock);

// Repairs tracking
router.get('/repairs', protect, authorize('admin', 'staff'), inventoryController.getRepairs);
router.post('/repairs', protect, admin, inventoryController.createRepair);
router.put('/repairs/:id', protect, admin, inventoryController.updateRepair);

module.exports = router;
