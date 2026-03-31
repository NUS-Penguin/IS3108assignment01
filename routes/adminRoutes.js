/**
 * routes/adminRoutes.js - Admin Dashboard Routes
 *
 * Protected routes for admin dashboard and user management.
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const userController = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Apply authentication to all admin routes
router.use(requireAuth);

// Dashboard
router.get('/dashboard', dashboardController.index);
router.get('/settings', dashboardController.renderSettings);

// User Management (requires admin role)
router.use('/users', requireAdmin);

router.get('/users', userController.index);
router.get('/users/new', userController.renderCreate);
router.post('/users', userController.create);
router.get('/users/:id/edit', userController.renderEdit);
router.put('/users/:id', userController.update);
router.delete('/users/:id', userController.delete);

module.exports = router;
