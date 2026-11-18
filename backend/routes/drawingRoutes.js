const express = require('express');
const router = express.Router();
const drawingController = require('../controllers/drawingController');
const { protect, authorize } = require('../middleware/auth');

// List & Query
router.get('/', protect, drawingController.getDrawings);
router.get('/approved', protect, (req, res, next) => {
    req.query.approvedOnly = 'true';
    next();
}, drawingController.getDrawings);
router.get('/:id', protect, drawingController.getDrawingById);

// Creation & Revisions (Admin, Manager, Engineer)
router.post('/', protect, authorize('admin', 'manager', 'engineer', 'staff'), drawingController.createDrawing);
router.post('/:id/revisions', protect, authorize('admin', 'manager', 'engineer', 'staff'), drawingController.addRevision);

// Review & Approvals (Admin & Authorized Engineers only)
router.patch('/:id/revisions/:revId/review', protect, authorize('admin', 'manager'), drawingController.reviewRevision);

// Archival / Delete (Admin only)
router.delete('/:id', protect, authorize('admin'), drawingController.deleteDrawing);

module.exports = router;
