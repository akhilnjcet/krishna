const express = require('express');
const router = express.Router();
const { createProject, getProjects, updateProject, deleteProject, proposeTimeline, sendTimeline } = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorize('admin'), createProject)
    .get(protect, getProjects);

router.route('/:id')
    .put(protect, authorize('admin', 'staff'), updateProject)
    .delete(protect, authorize('admin'), deleteProject);

router.route('/:id/propose-timeline')
    .put(protect, authorize('admin', 'staff'), proposeTimeline);

router.route('/:id/send-timeline')
    .put(protect, authorize('admin'), sendTimeline);


module.exports = router;
