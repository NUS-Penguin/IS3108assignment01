/**
 * routes/authRoutes.js - Authentication Routes
 * 
 * Public routes for user authentication.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Home route - redirect to login or dashboard
router.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/admin/dashboard');
    }
    res.redirect('/login');
});

// Login routes
router.get('/login', authController.renderLogin);
router.post('/login', authController.login);

// Logout route
router.post('/logout', authController.logout);

// Registration routes (REMOVED - Admins can only be created by existing admins)
// router.get('/register', authController.renderRegister);
// router.post('/register', authController.register);

// Password reset routes
router.get('/forgot-password', authController.renderForgotPassword);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token', authController.renderResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
