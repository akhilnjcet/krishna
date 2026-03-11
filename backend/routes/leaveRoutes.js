const express = require('express');
const router = express.Router();
const { applyLeave, getLeaves, updateLeaveStatus } = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('staff'), applyLeave)
    .get(protect, authorize('admin', 'staff'), getLeaves);

router.route('/:id/status')
    .put(protect, authorize('admin'), updateLeaveStatus);

module.exports = router;
