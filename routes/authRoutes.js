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

// Registration routes (optional - for initial setup)
router.get('/register', authController.renderRegister);
router.post('/register', authController.register);

module.exports = router;
