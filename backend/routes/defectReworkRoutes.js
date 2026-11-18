const express = require('express');
const router = express.Router();
const defectController = require('../controllers/defectReworkController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/defects', protect, defectController.getAllDefects);
router.post('/defects', protect, authorize('admin', 'manager', 'staff'), defectController.createDefect);
router.put('/defects/:id/assign-rework', protect, authorize('admin', 'manager'), defectController.assignRework);
router.put('/defects/:id/complete-rework', protect, authorize('admin', 'manager', 'staff'), defectController.completeRework);
router.put('/defects/:id/reinspect', protect, authorize('admin', 'manager'), defectController.reinspectDefect);
router.put('/defects/:id/close', protect, authorize('admin', 'manager'), defectController.closeDefect);
router.get('/defects/analytics/summary', protect, defectController.getDefectAnalytics);

module.exports = router;
