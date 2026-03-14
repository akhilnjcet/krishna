const express = require('express');
const router = express.Router();
const { 
    createPortfolio, 
    getAllPortfolio, 
    getPortfolioById, 
    updatePortfolio, 
    deletePortfolio, 
    uploadPortfolioImages,
    deletePortfolioImage,
    addPortfolioLinks
} = require('../controllers/portfolioController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../config/cloudinary');

// Public routes
router.get('/gallery', getAllPortfolio);
router.get('/:id', getPortfolioById);

// Admin routes
router.post('/create', protect, admin, createPortfolio);
router.post('/:id/upload', protect, admin, upload.array('images', 10), uploadPortfolioImages);
router.post('/:id/links', protect, admin, addPortfolioLinks);
router.put('/update/:id', protect, admin, updatePortfolio);
router.delete('/delete/:id', protect, admin, deletePortfolio);
router.delete('/:id/image/:imageId', protect, admin, deletePortfolioImage);

module.exports = router;
