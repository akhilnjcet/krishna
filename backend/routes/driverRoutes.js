const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { requireDriverPermission } = require('../middleware/driverPermissionMiddleware');

router.use(protect);

// ─── DRIVER PORTAL SELF-SERVICE ROUTES (Mobile-First) ────────────────
router.get('/portal/me', requireDriverPermission('driver.portal'), driverController.getDriverPortalData);
router.get('/portal/vehicle', requireDriverPermission('driver.my_vehicle'), driverController.getDriverAssignedVehicle);
router.post('/issues/report', requireDriverPermission('driver.report_issue'), driverController.reportIssue);
router.get('/issues', driverController.getDriverIssues);
router.post('/emergency/alert', requireDriverPermission('driver.emergency'), driverController.sendEmergencyAlert);
router.get('/emergency/contacts', driverController.getEmergencyContacts);
router.put('/emergency/contacts', authorize('admin'), driverController.updateEmergencyContacts);

// ─── DRIVER PERMISSIONS MANAGEMENT (ADMIN ONLY) ───────────────────────
router.get('/permissions/matrix', authorize('admin'), driverController.getDriverPermissionMatrix);
router.put('/permissions/user/:targetUserId', authorize('admin'), driverController.updateUserDriverPermissions);
router.get('/permissions/my', driverController.getMyDriverPermissions);

// ─── OPERATIONAL & ADMIN DRIVER ROUTES ───────────────────────────────
router.get('/summary', requireDriverPermission('driver.view'), driverController.getDriverDashboardSummary);
router.get('/eligible', requireDriverPermission('driver.view'), driverController.getEligibleDrivers);
router.get('/staff-candidates', requireDriverPermission('driver.view'), driverController.getStaffCandidates);
router.get('/check-expiries', requireDriverPermission('driver.view'), driverController.checkLicenseExpiries);
router.get('/emergency/alerts', requireDriverPermission('driver.view'), driverController.getEmergencyAlerts);

router.get('/', requireDriverPermission('driver.view'), driverController.getDrivers);
router.get('/:id', requireDriverPermission('driver.view'), driverController.getDriverById);

// Account Creation: STRICTLY BLOCKED for staff; Manager requires driver.create; Admin allowed
router.post('/', requireDriverPermission('driver.create'), driverController.createDriver);

// Profile Updates: Manager requires driver.edit; Staff blocked from account editing
router.put('/:id', requireDriverPermission('driver.edit'), driverController.updateDriver);

// Activation / Deactivation: Manager requires driver.activate/driver.deactivate; Staff strictly blocked
router.patch('/:id/status', requireDriverPermission('driver.activate'), driverController.toggleDriverStatus);

// Password Reset: Manager requires driver.password_reset; Staff strictly blocked
router.post('/:id/reset-password', requireDriverPermission('driver.password_reset'), driverController.resetDriverPassword);

// Account Deletion: Manager requires driver.delete; Staff strictly blocked
router.delete('/:id', requireDriverPermission('driver.delete'), driverController.deleteDriver);

// Vehicle Assignment: Admin, Manager, Staff (with driver.assign_vehicle)
router.post('/:driverId/assign', requireDriverPermission('driver.assign_vehicle'), driverController.assignDriverToVehicle);

// Issue Status Updates (Staff / Manager / Admin)
router.patch('/issues/:id/status', requireDriverPermission('driver.manage_issues'), driverController.updateIssueStatus);

module.exports = router;
