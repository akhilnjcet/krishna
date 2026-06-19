const express = require('express');
const router = express.Router();
const { 
    addOvertime, 
    editOvertime, 
    deleteOvertime, 
    getOvertimeLogs 
} = require('../controllers/overtimeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('admin', 'manager'), addOvertime)
    .get(protect, authorize('admin', 'manager', 'staff'), getOvertimeLogs);

router.route('/:id')
    .put(protect, authorize('admin', 'manager'), editOvertime)
    .delete(protect, authorize('admin', 'manager'), deleteOvertime);

module.exports = router;
