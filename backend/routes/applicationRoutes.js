const express = require('express');
const router = express.Router();
const { 
    getApplications, 
    getApplicationById,
    getApplicationComparison,
    reviewApplication,
    updateApplicationStatus, 
    deleteApplication,
    createApplication
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateObjectIdParam } = require('../utils/validateInputs');

router.param('id', validateObjectIdParam('id'));

router.get('/', protect, authorize('admin', 'staff'), getApplications);
router.get('/:id', protect, authorize('admin', 'staff'), getApplicationById);
router.get('/:id/comparison', protect, authorize('admin', 'staff'), getApplicationComparison);
router.post('/', protect, authorize('staff'), createApplication);
router.put('/:id/review', protect, authorize('admin'), reviewApplication);
router.put('/:id/status', protect, authorize('admin'), updateApplicationStatus);
router.delete('/:id', protect, authorize('admin'), deleteApplication);

module.exports = router;
