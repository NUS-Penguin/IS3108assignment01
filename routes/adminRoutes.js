const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/dashboard', dashboardController.index);
router.get('/settings', dashboardController.renderSettings);

module.exports = router;
