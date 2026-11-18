const express = require('express');
const router = express.Router();
const { 
    createProject, 
    getProjects, 
    updateProject, 
    deleteProject, 
    cancelProject, 
    proposeTimeline, 
    sendTimeline,
    requestAdditionalWork,
    updateAdditionalWorkStatus,
    deleteAdditionalWork,
    addMilestone,
    updateMilestone,
    updateMilestoneStatus,
    getMilestoneDelays
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validateObjectIdParam } = require('../utils/validateInputs');

// Milestone delay summary across all projects
router.get('/milestones/delays', protect, getMilestoneDelays);

// Validate all :id and :workId route parameters
router.param('id', validateObjectIdParam('id'));
router.param('workId', validateObjectIdParam('workId'));

router.route('/')
    .post(protect, authorize('admin'), createProject)
    .get(protect, getProjects);

router.route('/:id')
    .put(protect, authorize('admin', 'staff'), updateProject)
    .delete(protect, authorize('admin'), deleteProject);

router.route('/:id/cancel')
    .put(protect, authorize('admin'), cancelProject);

router.route('/:id/propose-timeline')
    .put(protect, authorize('admin', 'staff'), proposeTimeline);

router.route('/:id/send-timeline')
    .put(protect, authorize('admin'), sendTimeline);

// Milestone routes
router.post('/:id/milestones', protect, authorize('admin', 'staff'), addMilestone);
router.put('/:id/milestones/:milestoneId', protect, authorize('admin', 'staff'), updateMilestone);
router.patch('/:id/milestones/:milestoneId/status', protect, authorize('admin', 'staff'), updateMilestoneStatus);

router.route('/:id/additional-work')
    .post(protect, authorize('admin', 'customer'), requestAdditionalWork);

router.route('/:id/additional-work/:workId')
    .put(protect, authorize('admin'), updateAdditionalWorkStatus)
    .delete(protect, authorize('admin'), deleteAdditionalWork);

module.exports = router;
