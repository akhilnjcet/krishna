const express = require('express');
const router = express.Router();
const bomCostingController = require('../controllers/bomCostingController');
const { protect, admin, authorize } = require('../middleware/authMiddleware');

// ─── BILL OF MATERIALS (BOM) ───
router.get('/bom', protect, authorize('admin', 'staff', 'manager', 'accountant'), bomCostingController.getAllBOMs);
router.get('/bom/:id', protect, authorize('admin', 'staff', 'manager', 'accountant'), bomCostingController.getBOMById);
router.post('/bom', protect, authorize('admin', 'manager'), bomCostingController.createBOM);
router.put('/bom/:id', protect, authorize('admin', 'manager'), bomCostingController.updateBOM);
router.patch('/bom/:id/status', protect, admin, bomCostingController.updateBOMStatus);

// ─── MATERIAL REQUESTS & APPROVALS ───
router.get('/material-requests', protect, authorize('admin', 'staff', 'manager', 'accountant'), bomCostingController.getAllMaterialRequests);
router.post('/material-requests', protect, authorize('admin', 'staff', 'manager'), bomCostingController.createMaterialRequest);
router.post('/material-requests/:id/review', protect, admin, bomCostingController.reviewMaterialRequest);

// ─── MATERIAL CONSUMPTION, RETURNS & WASTAGE ───
router.get('/material-consumption/history', protect, authorize('admin', 'staff', 'manager', 'accountant'), bomCostingController.getConsumptionHistory);
router.post('/material-consumption/record', protect, authorize('admin', 'staff', 'manager'), bomCostingController.recordMaterialConsumption);
router.post('/material-consumption/return', protect, authorize('admin', 'staff', 'manager'), bomCostingController.returnMaterialToInventory);

// ─── PROJECT COSTING & PROFITABILITY ENGINE ───
router.get('/project-costing', protect, authorize('admin', 'manager', 'accountant'), bomCostingController.getAllProjectsCosting);
router.get('/project-costing/dashboard/summary', protect, authorize('admin', 'manager', 'accountant'), bomCostingController.getCostingDashboardSummary);
router.get('/project-costing/reports/wastage', protect, authorize('admin', 'manager', 'accountant'), bomCostingController.getWastageReports);
router.get('/project-costing/:projectId', protect, authorize('admin', 'manager', 'accountant'), bomCostingController.getSingleProjectCosting);

module.exports = router;
