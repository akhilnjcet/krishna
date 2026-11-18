const express = require('express');
const router = express.Router();
const productionPlanController = require('../controllers/productionPlanController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', productionPlanController.getProductionPlans);
router.get('/calendar', productionPlanController.getProductionCalendar);
router.get('/reports/summary', productionPlanController.getProductionReports);
router.get('/:id', productionPlanController.getProductionPlanById);

router.post('/', authorize('admin', 'staff'), productionPlanController.createProductionPlan);
router.put('/:id', authorize('admin', 'staff'), productionPlanController.updateProductionPlan);
router.patch('/:id/reschedule', authorize('admin', 'staff'), productionPlanController.reschedulePlan);
router.post('/:id/stages/:stageId/progress', authorize('admin', 'staff'), productionPlanController.recordStageProgress);

module.exports = router;
