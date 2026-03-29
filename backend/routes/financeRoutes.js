const express = require('express');
const router = express.Router();
const { 
    getAdminOverview, 
    getStaffSalary, 
    getCustomerDues, 
    getExpenses, 
    addExpense 
} = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/admin-overview', protect, authorize('admin'), getAdminOverview);
router.get('/staff-salary', protect, authorize('staff'), getStaffSalary);
router.get('/customer-dues', protect, authorize('customer'), getCustomerDues);

router.route('/expenses')
    .get(protect, authorize('admin'), getExpenses)
    .post(protect, authorize('admin', 'staff'), addExpense);

module.exports = router;
