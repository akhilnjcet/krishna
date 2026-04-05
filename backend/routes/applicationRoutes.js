const express = require('express');
const router = express.Router();
const { 
    getApplications, 
    updateApplicationStatus, 
    deleteApplication,
    createApplication
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/', protect, authorize('admin', 'staff'), getApplications);
router.post('/', protect, authorize('staff'), createApplication);
router.put('/:id/status', protect, authorize('admin'), updateApplicationStatus);
router.delete('/:id', protect, authorize('admin'), deleteApplication);

module.exports = router;
