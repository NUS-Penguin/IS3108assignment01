/**
 * controllers/authController.js - Authentication Controller
 * 
 * Handles user authentication including login, logout, and registration.
 */

const User = require('../models/User');
const { AppError } = require('../middleware/errorMiddleware');
const { isStrongPassword, getPasswordErrors } = require('../utils/validationUtils');
const crypto = require('crypto');

/**
 * Render login page
 */
exports.renderLogin = (req, res) => {
    // Redirect to dashboard if already logged in
    if (req.session && req.session.userId) {
        return res.redirect('/admin/dashboard');
    }

    res.render('auth/login', {
        title: 'Login',
        error: null,
        message: null
    });
};

/**
 * Handle login form submission
 */
exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.render('auth/login', {
                title: 'Login',
                error: 'Username and password are required'
            });
        }

        // Find user
        const user = await User.findOne({ username });
        if (!user) {
            return res.render('auth/login', {
                title: 'Login',
                error: 'Invalid username or password'
            });
        }

        // Check if account is locked
        if (user.isLocked()) {
            const lockMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
            return res.render('auth/login', {
                title: 'Login',
                error: `Account is locked due to too many failed login attempts. Please try again in ${lockMinutes} minutes or contact the administrator.`
            });
        }

        // Verify password
        const isMatch = await user.verifyPassword(password);
        if (!isMatch) {
            // Increment failed login attempts
            await user.incrementLoginAttempts();

            const remainingAttempts = 5 - (user.failedLoginAttempts + 1);
            let errorMessage = 'Invalid username or password';

            if (remainingAttempts > 0 && remainingAttempts <= 3) {
                errorMessage += `. Warning: ${remainingAttempts} attempts remaining before account lock.`;
            } else if (remainingAttempts === 0) {
                errorMessage = 'Too many failed login attempts. Account has been locked for 30 minutes. Please contact the administrator if you need help.';
            }

            return res.render('auth/login', {
                title: 'Login',
                error: errorMessage
            });
        }

        // Reset login attempts on successful login
        await user.resetLoginAttempts();

        // Update last login timestamp
        await user.updateLastLogin();

        // Create session
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.role = user.role;
        req.session.lastLogin = user.lastLogin;

        // Redirect to dashboard
        res.redirect('/admin/dashboard');

    } catch (error) {
        next(error);
    }
};

/**
 * Handle logout
 */
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
            return res.redirect('/admin/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
};

/**
 * Render registration page (optional - for initial setup)
 */
exports.renderRegister = (req, res) => {
    res.render('auth/register', {
        title: 'Register',
        error: null
    });
};

/**
 * Handle registration form submission (optional - for initial setup)
 */
exports.register = async (req, res, next) => {
    try {
        const { username, email, password, confirmPassword } = req.body;

        // Validate input
        if (!username || !email || !password || !confirmPassword) {
            return res.render('auth/register', {
                title: 'Register',
                error: 'All fields are required'
            });
        }

        if (password !== confirmPassword) {
            return res.render('auth/register', {
                title: 'Register',
                error: 'Passwords do not match'
            });
        }

        // Validate password strength
        if (!isStrongPassword(password)) {
            const errors = getPasswordErrors(password);
            return res.render('auth/register', {
                title: 'Register',
                error: errors.join('. ')
            });
        }

        // Create user
        const user = new User({
            username,
            email,
            passwordHash: password // Will be hashed by pre-save hook
        });

        await user.save();

        // Auto-login after registration
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.role = user.role;

        res.redirect('/admin/dashboard');

    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            return res.render('auth/register', {
                title: 'Register',
                error: `${field} already exists`
            });
        }
        next(error);
    }
};

/**
 * Render forgot password page
 */
exports.renderForgotPassword = (req, res) => {
    res.render('auth/forgot-password', {
        title: 'Forgot Password',
        error: null,
        message: null
    });
};

/**
 * Handle forgot password form submission
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.render('auth/forgot-password', {
                title: 'Forgot Password',
                error: 'Email is required',
                message: null
            });
        }

        const user = await User.findOne({ email });

        // Always show success message (don't reveal if email exists)
        if (!user) {
            return res.render('auth/forgot-password', {
                title: 'Forgot Password',
                error: null,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        // Generate reset token
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });

        // In production, send email with reset link
        // For now, just log the token (REMOVE IN PRODUCTION)
        console.log('Password Reset Token:', resetToken);
        console.log('Reset URL:', `http://localhost:${process.env.PORT || 3000}/reset-password/${resetToken}`);

        res.render('auth/forgot-password', {
            title: 'Forgot Password',
            error: null,
            message: 'If an account with that email exists, a password reset link has been sent. (For development: check console logs)'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Render reset password page
 */
exports.renderResetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;

        // Hash the token to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('auth/reset-password', {
                title: 'Reset Password',
                error: 'Password reset token is invalid or has expired',
                validToken: false
            });
        }

        res.render('auth/reset-password', {
            title: 'Reset Password',
            error: null,
            validToken: true,
            token
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Handle reset password form submission
 */
exports.resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        // Hash the token to compare with stored hash
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('auth/reset-password', {
                title: 'Reset Password',
                error: 'Password reset token is invalid or has expired',
                validToken: false
            });
        }

        // Validate passwords
        if (!password || !confirmPassword) {
            return res.render('auth/reset-password', {
                title: 'Reset Password',
                error: 'All fields are required',
                validToken: true,
                token
            });
        }

        if (password !== confirmPassword) {
            return res.render('auth/reset-password', {
                title: 'Reset Password',
                error: 'Passwords do not match',
                validToken: true,
                token
            });
        }

        // Validate password strength
        if (!isStrongPassword(password)) {
            const errors = getPasswordErrors(password);
            return res.render('auth/reset-password', {
                title: 'Reset Password',
                error: errors.join('. '),
                validToken: true,
                token
            });
        }

        // Check if password was used recently
        const isReused = await user.isPasswordReused(password);
        if (isReused) {
            return res.render('auth/reset-password', {
                title: 'Reset Password',
                error: 'You cannot reuse a recent password. Please choose a different password.',
                validToken: true,
                token
            });
        }

        // Update password
        user.passwordHash = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        user.failedLoginAttempts = 0;
        user.accountLocked = false;
        user.lockUntil = null;

        await user.save();

        // Redirect to login with success message
        res.render('auth/login', {
            title: 'Login',
            error: null,
            message: 'Password has been reset successfully. Please login with your new password.'
        });

    } catch (error) {
        next(error);
    }
};
