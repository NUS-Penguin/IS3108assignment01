/**
 * controllers/userController.js - User Management Controller
 *
 * Thin request/response layer for user management operations.
 * Delegates all business logic to UserService and renders appropriate views.
 */

const UserService = require('../services/userService');
const { AppError } = require('../middleware/errorMiddleware');

/**
 * GET /admin/users
 * List all users with their roles and creation dates
 */
exports.index = async (req, res, next) => {
    try {
        const users = await UserService.getAllUsers();

        res.render('users/index', {
            title: 'User Management',
            username: req.session.username,
            userRole: req.session.role,
            users,
            flash: req.session.flash
        });

        // Clear flash message after rendering
        req.session.flash = null;

    } catch (error) {
        next(error);
    }
};

/**
 * GET /admin/users/new
 * Show create user form
 */
exports.renderCreate = async (req, res, next) => {
    try {
        const roles = UserService.getValidRoles();

        res.render('users/create', {
            title: 'Register New Account',
            username: req.session.username,
            userRole: req.session.role,
            roles,
            user: null,
            error: null,
            formAction: 'create',
            initialRole: 'admin',
            pageTitle: 'Register New Account',
            submitText: 'Create Account',
            formDescription: 'Add a new account'
        });

    } catch (error) {
        next(error);
    }
};

/**
 * POST /admin/users
 * Create new user from form submission
 */
exports.create = async (req, res, next) => {
    try {
        // Create user via service (validates all fields)
        await UserService.createUser(req.body, req.session.userId);

        req.session.flash = {
            type: 'success',
            message: `User "${req.body.username}" created successfully`
        };
        res.redirect('/admin/users');

    } catch (error) {
        // Handle specific errors by re-rendering form with error message
        if (error instanceof AppError) {
            return res.render('users/create', {
                title: 'Register New Account',
                username: req.session.username,
                userRole: req.session.role,
                roles: UserService.getValidRoles(),
                user: null,
                error: error.message,
                formAction: 'create',
                initialRole: 'admin',
                pageTitle: 'Register New Account',
                submitText: 'Create Account',
                formDescription: 'Add a new account'
            });
        }

        // Handle duplicate key error from schema validation
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.render('users/create', {
                title: 'Register New Account',
                username: req.session.username,
                userRole: req.session.role,
                roles: UserService.getValidRoles(),
                user: null,
                error: `${field} already exists. Please use another.`,
                formAction: 'create',
                initialRole: 'admin',
                pageTitle: 'Register New Account',
                submitText: 'Create Account',
                formDescription: 'Add a new account'
            });
        }

        // Handle validation error
        if (error.name === 'ValidationError') {
            return res.render('users/create', {
                title: 'Register New Account',
                username: req.session.username,
                userRole: req.session.role,
                roles: UserService.getValidRoles(),
                user: null,
                error: Object.values(error.errors).map(e => e.message).join('. '),
                formAction: 'create',
                initialRole: 'admin',
                pageTitle: 'Register New Account',
                submitText: 'Create Account',
                formDescription: 'Add a new account'
            });
        }

        next(error);
    }
};

/**
 * GET /admin/users/:id/edit
 * Show edit user form
 */
exports.renderEdit = async (req, res, next) => {
    try {
        const user = await UserService.getUserById(req.params.id);
        const roles = UserService.getValidRoles();

        res.render('users/edit', {
            title: 'Edit User',
            username: req.session.username,
            userRole: req.session.role,
            user,
            roles,
            error: null,
            formAction: 'edit'
        });

    } catch (error) {
        if (error instanceof AppError && error.statusCode === 404) {
            req.session.flash = { type: 'danger', message: 'User not found' };
            return res.redirect('/admin/users');
        }
        next(error);
    }
};

/**
 * PUT /admin/users/:id
 * Update user details and/or role
 */
exports.update = async (req, res, next) => {
    try {
        await UserService.updateUser(req.params.id, req.body);

        req.session.flash = {
            type: 'success',
            message: 'User updated successfully'
        };
        res.redirect('/admin/users');

    } catch (error) {
        if (error instanceof AppError) {
            // Re-render form with error message
            const user = await UserService.getUserById(req.params.id).catch(() => null);
            return res.render('users/edit', {
                title: 'Edit User',
                username: req.session.username,
                userRole: req.session.role,
                user,
                roles: UserService.getValidRoles(),
                error: error.message,
                formAction: 'edit'
            });
        }

        // Handle duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            const user = await UserService.getUserById(req.params.id).catch(() => null);
            return res.render('users/edit', {
                title: 'Edit User',
                username: req.session.username,
                userRole: req.session.role,
                user,
                roles: UserService.getValidRoles(),
                error: `${field} already exists. Please use another.`,
                formAction: 'edit'
            });
        }

        // Handle validation error
        if (error.name === 'ValidationError') {
            const user = await UserService.getUserById(req.params.id).catch(() => null);
            return res.render('users/edit', {
                title: 'Edit User',
                username: req.session.username,
                userRole: req.session.role,
                user,
                roles: UserService.getValidRoles(),
                error: Object.values(error.errors).map(e => e.message).join('. '),
                formAction: 'edit'
            });
        }

        next(error);
    }
};

/**
 * DELETE /admin/users/:id
 * Delete user account
 */
exports.delete = async (req, res, next) => {
    try {
        const user = await UserService.getUserById(req.params.id);

        // Prevent self-deletion
        if (user._id.toString() === req.session.userId) {
            req.session.flash = {
                type: 'danger',
                message: 'You cannot delete your own account'
            };
            return res.redirect('/admin/users');
        }

        await UserService.deleteUser(req.params.id);

        req.session.flash = {
            type: 'success',
            message: `User "${user.username}" deleted successfully`
        };
        res.redirect('/admin/users');

    } catch (error) {
        if (error instanceof AppError && error.statusCode === 404) {
            req.session.flash = { type: 'danger', message: 'User not found' };
            return res.redirect('/admin/users');
        }

        req.session.flash = { type: 'danger', message: 'Error deleting user' };
        res.redirect('/admin/users');
    }
};
