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

// Create progress / intelligence update (Accessible by Admin and Staff via POST / or POST /create)
router.post('/', protect, authorize('admin', 'staff'), upload.array('photos', 5), createProgress);
router.post('/create', protect, authorize('admin', 'staff'), upload.array('photos', 5), createProgress);

// Staff specific
router.get('/staff/me', protect, authorize('staff'), getMyProgress);

// Admin specific
router.get('/', protect, admin, getAllProgress);
router.get('/all', protect, admin, getAllProgress);
router.put('/update/:id', protect, admin, updateProgressStatus);
router.delete('/delete/:id', protect, admin, deleteProgress);

// Common / Customer
router.get('/project/:projectId', protect, getProjectProgress);

module.exports = router;
