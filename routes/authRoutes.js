const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/admin/dashboard');
    }
    res.redirect('/login');
});

router.get('/login', authController.renderLogin);
router.post('/login', authController.login);

router.post('/logout', authController.logout);

router.get('/register', authController.renderRegister);
router.post('/register', authController.register);

router.get('/forgot-password', authController.renderForgotPassword);
router.post('/forgot-password', authController.forgotPassword);
router.get('/reset-password/:token', authController.renderResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;
