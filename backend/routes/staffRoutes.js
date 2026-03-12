const express = require('express');
const router = express.Router();
const { getStaff, addStaff, updateStaff, deleteStaff, registerFace, getStaffById } = require('../controllers/staffController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getStaff);
router.get('/:id', protect, admin, getStaffById);
router.post('/', protect, admin, addStaff);
router.put('/:id', protect, admin, updateStaff);
router.delete('/:id', protect, admin, deleteStaff);
router.post('/:id/register-face', protect, admin, registerFace);

module.exports = router;
