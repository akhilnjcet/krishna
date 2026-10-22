const express = require('express');
const router = express.Router();
const {
    getCurrentPolicy,
    getPublicPolicySummary,
    getPolicyByVersion,
    recordAcceptance,
    getMyAcceptanceHistory,
    adminGetAllPolicies,
    adminPublishPolicy,
    adminGetAcceptanceRecords,
    submitPrivacyRequest,
    getMyPrivacyRequests,
    exportMyPersonalData,
    adminGetPrivacyRequests,
    adminProcessPrivacyRequest
} = require('../controllers/policyController');
const { protect, admin } = require('../middleware/authMiddleware');

// ─── Public Routes (No authentication required) ───────────────────
router.get('/current/:type', getCurrentPolicy);
router.get('/summary', getPublicPolicySummary);
router.get('/public-summary', getPublicPolicySummary);
router.get('/version/:type/:version', getPolicyByVersion);

// ─── Authenticated User Routes ────────────────────────────────────
router.post('/accept', protect, recordAcceptance);
router.get('/my-acceptance', protect, getMyAcceptanceHistory);
router.post('/privacy-requests', protect, submitPrivacyRequest);
router.get('/privacy-requests/my', protect, getMyPrivacyRequests);
router.get('/privacy-requests/export-my-data', protect, exportMyPersonalData);

// ─── Protected Administrator Routes ──────────────────────────────
router.get('/admin/all', protect, admin, adminGetAllPolicies);
router.post('/admin/publish', protect, admin, adminPublishPolicy);
router.get('/admin/acceptances', protect, admin, adminGetAcceptanceRecords);
router.get('/admin/privacy-requests', protect, admin, adminGetPrivacyRequests);
router.put('/admin/privacy-requests/:id', protect, admin, adminProcessPrivacyRequest);

module.exports = router;
