/**
 * routes/adminRoutes.js - Admin Dashboard Routes
 * 
 * Protected routes for admin dashboard.
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');

// Apply authentication to all admin routes
router.use(requireAuth);

// Dashboard
router.get('/dashboard', dashboardController.index);
router.get('/settings', dashboardController.renderSettings);

module.exports = router;
