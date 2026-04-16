const express = require('express');
const router = express.Router();
const { getLodgeData, syncLodgeData } = require('../controllers/lodgeController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getLodgeData);
router.post('/sync', protect, syncLodgeData);

module.exports = router;
