const express = require('express');
const router = express.Router();
const { 
    getAdminOverview, 
    getStaffSalary, 
    getCustomerDues, 
    getExpenses, 
    addExpense,
    addSalary,
    getCashFlowForecast,
    addCashFlowAdjustment,
    getCashFlowAdjustments,
    deleteCashFlowAdjustment
} = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/admin-overview', protect, authorize('admin'), getAdminOverview);
router.get('/staff-salary', protect, authorize('staff'), getStaffSalary);
router.get('/customer-dues', protect, authorize('customer'), getCustomerDues);

router.post('/salaries', protect, authorize('admin'), addSalary);

router.route('/expenses')
    .get(protect, authorize('admin'), getExpenses)
    .post(protect, authorize('admin', 'staff'), addExpense);

// Cash Flow Forecasting
router.get('/cash-flow-forecast', protect, authorize('admin', 'accountant'), getCashFlowForecast);
router.get('/adjustments', protect, authorize('admin', 'accountant'), getCashFlowAdjustments);
router.post('/adjustments', protect, authorize('admin', 'accountant'), addCashFlowAdjustment);
router.delete('/adjustments/:id', protect, authorize('admin'), deleteCashFlowAdjustment);

module.exports = router;
