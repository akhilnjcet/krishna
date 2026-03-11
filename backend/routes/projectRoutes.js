const express = require('express');
const router = express.Router();
const { createProject, getProjects, updateProject, deleteProject } = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('admin'), createProject)
    .get(protect, getProjects);

router.route('/:id')
    .put(protect, authorize('admin', 'staff'), updateProject)
    .delete(protect, authorize('admin'), deleteProject);

module.exports = router;
