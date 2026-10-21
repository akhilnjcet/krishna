const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect, admin } = require('../middleware/authMiddleware');

// Metrics
router.get('/stats', protect, inventoryController.getStats);

// Items CRUD
router.get('/items', protect, inventoryController.getItems);
router.get('/items/:id', protect, inventoryController.getItemById);
router.post('/items', protect, admin, inventoryController.createItem);
router.put('/items/:id', protect, admin, inventoryController.updateItem);
router.delete('/items/:id', protect, admin, inventoryController.deleteItem);

// Tool assignment & return
router.post('/tools/:id/assign', protect, admin, inventoryController.assignTool);
router.post('/tools/:id/return', protect, admin, inventoryController.returnTool);

// Material stock adjustment
router.post('/materials/:id/stock', protect, admin, inventoryController.adjustStock);

// Repairs tracking
router.get('/repairs', protect, inventoryController.getRepairs);
router.post('/repairs', protect, admin, inventoryController.createRepair);
router.put('/repairs/:id', protect, admin, inventoryController.updateRepair);

module.exports = router;
