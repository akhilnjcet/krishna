const express = require('express');
const router = express.Router();
const { createTask, getTasks, updateTaskStatus, deleteTask } = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getTasks)
    .post(protect, authorize('admin'), createTask);

router.route('/:id/status')
    .put(protect, updateTaskStatus);

router.route('/:id')
    .delete(protect, authorize('admin'), deleteTask);

module.exports = router;
