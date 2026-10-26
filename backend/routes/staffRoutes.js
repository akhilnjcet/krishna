const express = require('express');
const router = express.Router();
const { getStaff, addStaff, updateStaff, deleteStaff, registerFace, getStaffById, deleteFaceData, cleanupBiometrics, resetAllBiometrics } = require('../controllers/staffController');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateObjectIdParam } = require('../utils/validateInputs');

router.param('id', validateObjectIdParam('id'));

router.get('/', protect, admin, getStaff);
router.get('/:id', protect, admin, getStaffById);
router.post('/', protect, admin, addStaff);
router.put('/:id', protect, admin, updateStaff);
router.delete('/:id', protect, admin, deleteStaff);
router.post('/cleanup-biometrics', protect, admin, cleanupBiometrics);
router.post('/reset-all-biometrics', protect, admin, resetAllBiometrics);
router.post('/:id/register-face', protect, admin, registerFace);
router.delete('/:id/face', protect, admin, deleteFaceData);

module.exports = router;
