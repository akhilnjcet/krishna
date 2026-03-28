const express = require('express');
const router = express.Router();
const { 
    getBlogs, 
    getBlogById, 
    createBlog, 
    updateBlog, 
    deleteBlog 
} = require('../controllers/blogController');
const { protect, admin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getBlogs);
router.get('/:id', getBlogById);

// Protected routes (Admin only)
router.post('/', protect, admin, createBlog);
router.put('/:id', protect, admin, updateBlog);
router.delete('/:id', protect, admin, deleteBlog);

module.exports = router;
