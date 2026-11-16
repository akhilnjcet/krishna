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
    deleteBanner,
    getCareerContact,
    saveCareerContact
} = require('../controllers/vacancyController');
const { protect, admin } = require('../middleware/authMiddleware');
const { validateObjectIdParam } = require('../utils/validateInputs');

router.param('id', validateObjectIdParam('id'));

// Public routes
router.get('/', getPublicVacancies);
router.get('/banner', getBanner);
router.get('/contact', getCareerContact);

// Admin-only routes
router.get('/admin', protect, admin, getAdminVacancies);
router.post('/', protect, admin, createVacancy);
router.put('/:id', protect, admin, updateVacancy);
router.delete('/:id', protect, admin, deleteVacancy);

// Banner management (Admin)
router.post('/banner', protect, admin, saveBanner);
router.delete('/banner', protect, admin, deleteBanner);

// Career Contact Settings (Admin)
router.post('/contact', protect, admin, saveCareerContact);

module.exports = router;
