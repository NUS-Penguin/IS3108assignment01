/**
 * controllers/authController.js - Authentication Controller
 * 
 * Handles user authentication including login, logout, and registration.
 */

const User = require('../models/User');
const { AppError } = require('../middleware/errorMiddleware');

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
        error: null
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

        // Verify password
        const isMatch = await user.verifyPassword(password);
        if (!isMatch) {
            return res.render('auth/login', {
                title: 'Login',
                error: 'Invalid username or password'
            });
        }

        // Create session
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.role = user.role;

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

        if (password.length < 6) {
            return res.render('auth/register', {
                title: 'Register',
                error: 'Password must be at least 6 characters long'
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
