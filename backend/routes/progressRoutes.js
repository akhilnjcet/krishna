const express = require('express');
const router = express.Router();
const {
    createProgress,
    getMyProgress,
    getAllProgress,
    getProjectProgress,
    updateProgressStatus,
    deleteProgress
} = require('../controllers/progressController');
const { protect, admin, authorize } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary');

// Staff specific
router.post('/create', protect, authorize('staff'), upload.array('photos', 5), createProgress);
router.get('/staff/me', protect, authorize('staff'), getMyProgress);

// Admin specific
router.get('/all', protect, admin, getAllProgress);
router.put('/update/:id', protect, admin, updateProgressStatus);
router.delete('/delete/:id', protect, admin, deleteProgress);

// Common / Customer
router.get('/project/:projectId', protect, getProjectProgress);

module.exports = router;
