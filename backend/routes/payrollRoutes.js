const express = require('express');
const router = express.Router();
const { 
    calculateDraftPayroll, 
    createPayroll, 
    getPayrollRecords, 
    updatePaymentStatus 
} = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/draft', protect, authorize('admin', 'manager'), calculateDraftPayroll);

router.route('/')
    .post(protect, authorize('admin'), createPayroll)
    .get(protect, authorize('admin', 'manager', 'staff'), getPayrollRecords);

router.put('/:id/payment', protect, authorize('admin'), updatePaymentStatus);

module.exports = router;
