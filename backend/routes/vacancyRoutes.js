const express = require('express');
const router = express.Router();
const {
    getPublicVacancies,
    getAdminVacancies,
    createVacancy,
    updateVacancy,
    deleteVacancy,
    getBanner,
    saveBanner,
    deleteBanner
} = require('../controllers/vacancyController');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateObjectIdParam } = require('../utils/validateInputs');

router.param('id', validateObjectIdParam('id'));

// Public routes
router.get('/', getPublicVacancies);
router.get('/banner', getBanner);

// Admin-only routes
router.get('/admin', protect, admin, getAdminVacancies);
router.post('/', protect, admin, createVacancy);
router.put('/:id', protect, admin, updateVacancy);
router.delete('/:id', protect, admin, deleteVacancy);

// Banner management (Admin)
router.post('/banner', protect, admin, saveBanner);
router.delete('/banner', protect, admin, deleteBanner);

module.exports = router;
