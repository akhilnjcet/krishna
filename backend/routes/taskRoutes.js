const express = require('express');
const router = express.Router();
const { 
    createTask, 
    getTasks, 
    updateTaskStatus, 
    deleteTask,
    updateTaskProgress,
    reportTaskDelay,
    adminUpdateTask,
    getTaskStats
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getTasks)
    .post(protect, authorize('admin'), createTask);

router.get('/stats', protect, authorize('admin'), getTaskStats);

router.put('/:id/admin', protect, authorize('admin'), adminUpdateTask);
router.put('/:id/progress', protect, updateTaskProgress);
router.put('/:id/delay', protect, reportTaskDelay);

router.route('/:id/status')
    .put(protect, updateTaskStatus);

router.route('/:id')
    .delete(protect, authorize('admin'), deleteTask);

module.exports = router;
