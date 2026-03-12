/**
 * middleware/authMiddleware.js - Authentication Middleware
 * 
 * Protects routes requiring authentication.
 */

/**
 * Require authentication for route access
 */
exports.requireAuth = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

/**
 * Require admin role for route access
 */
exports.requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.redirect('/login');
    }

    if (req.session.role !== 'admin') {
        return res.status(403).render('error', {
            title: 'Access Denied',
            message: 'You do not have permission to access this resource. Admin access required.',
            user: res.locals.user
        });
    }

    next();
};

/**
 * Require specific role(s) for route access
 * Usage: requireRole(['admin', 'manager'])
 */
exports.requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.redirect('/login');
        }

        if (!roles.includes(req.session.role)) {
            return res.status(403).render('error', {
                title: 'Access Denied',
                message: `You do not have permission to access this resource. Required role: ${roles.join(' or ')}`,
                user: res.locals.user
            });
        }

        next();
    };
};

/**
 * Redirect to dashboard if already authenticated
 */
exports.redirectIfAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/admin/dashboard');
    }
    next();
};
