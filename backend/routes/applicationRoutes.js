const express = require('express');
const router = express.Router();
const { 
    getApplications, 
    updateApplicationStatus, 
    deleteApplication,
    createApplication
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateObjectIdParam } = require('../utils/validateInputs');

router.param('id', validateObjectIdParam('id'));

router.get('/', protect, authorize('admin', 'staff'), getApplications);
router.post('/', protect, authorize('staff'), createApplication);
router.put('/:id/status', protect, authorize('admin'), updateApplicationStatus);
router.delete('/:id', protect, authorize('admin'), deleteApplication);

module.exports = router;
