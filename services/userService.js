/**
 * services/userService.js - User Management Business Logic
 *
 * Handles all user management operations: creation, retrieval, updates, and deletion.
 * Enforces business rules for user management including role validation and duplicate prevention.
 */

const User = require('../models/User');
const { AppError } = require('../middleware/errorMiddleware');
const { isStrongPassword, getPasswordErrors } = require('../utils/validationUtils');

const VALID_ROLES = ['admin', 'manager'];

class UserService {

    /**
     * Retrieve all users
     * @returns {Promise<Array>} Array of user documents (excluding password hashes)
     */
    static async getAllUsers() {
        const users = await User.find()
            .select('-passwordHash -passwordHistory')
            .sort({ createdAt: -1 });
        return users;
    }

    /**
     * Find a single user by ID
     * @param {string} id - User MongoDB ObjectId
     * @returns {Promise<User>}
     * @throws {AppError} 404 if not found
     */
    static async getUserById(id) {
        const user = await User.findById(id).select('-passwordHash -passwordHistory');
        if (!user) {
            throw new AppError('User not found', 404);
        }
        return user;
    }

    /**
     * Create a new user
     * @param {Object} data - User data { username, email, password, confirmPassword, role }
     * @param {string} adminId - ID of admin creating this user (for audit trail)
     * @returns {Promise<User>} Created user (without password hash)
     * @throws {AppError} 400 for validation errors
     * @throws {AppError} 400 for duplicate username/email
     */
    static async createUser(data, adminId) {
        const { username, email, password, confirmPassword, role } = data;

        // Validate required fields
        if (!username || !email || !password || !confirmPassword) {
            throw new AppError('All fields are required', 400);
        }

        // Validate role
        if (!VALID_ROLES.includes(role)) {
            throw new AppError(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, 400);
        }

        // Validate passwords match
        if (password !== confirmPassword) {
            throw new AppError('Passwords do not match', 400);
        }

        // Validate password strength
        if (!isStrongPassword(password)) {
            const errors = getPasswordErrors(password);
            throw new AppError(`Password is too weak. ${errors.join('. ')}`, 400);
        }

        // Check for existing username
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            throw new AppError('Username already exists. Please choose another.', 400);
        }

        // Check for existing email
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            throw new AppError('Email already exists. Please use another.', 400);
        }

        // Create user
        const user = new User({
            username,
            email,
            passwordHash: password, // Pre-save hook will hash this
            role
        });

        await user.save();

        // Return user without sensitive fields
        return await User.findById(user._id).select('-passwordHash -passwordHistory');
    }

    /**
     * Update user details and/or role
     * @param {string} id - User MongoDB ObjectId
     * @param {Object} data - Fields to update { email, role, password?, confirmPassword? }
     * @returns {Promise<User>} Updated user (without password hash)
     * @throws {AppError} 404 if user not found
     * @throws {AppError} 400 for validation errors
     */
    static async updateUser(id, data) {
        const user = await User.findById(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const { email, role, password, confirmPassword } = data;

        // Update email if provided
        if (email && email !== user.email) {
            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                throw new AppError('Email already exists. Please use another.', 400);
            }
            user.email = email;
        }

        // Update role if provided
        if (role) {
            if (!VALID_ROLES.includes(role)) {
                throw new AppError(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, 400);
            }
            user.role = role;
        }

        // Update password if provided
        if (password || confirmPassword) {
            if (!password || !confirmPassword) {
                throw new AppError('Both password fields are required to change password', 400);
            }

            if (password !== confirmPassword) {
                throw new AppError('Passwords do not match', 400);
            }

            if (!isStrongPassword(password)) {
                const errors = getPasswordErrors(password);
                throw new AppError(`Password is too weak. ${errors.join('. ')}`, 400);
            }

            // Check if user is reusing recent password
            const isReused = await user.isPasswordReused(password);
            if (isReused) {
                throw new AppError('You cannot reuse a recent password. Please choose a different one.', 400);
            }

            user.passwordHash = password; // Pre-save hook will hash this
        }

        await user.save();

        // Return updated user without sensitive fields
        return await User.findById(user._id).select('-passwordHash -passwordHistory');
    }

    /**
     * Delete a user account
     * @param {string} id - User MongoDB ObjectId
     * @throws {AppError} 404 if user not found
     */
    static async deleteUser(id) {
        const user = await User.findById(id);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        await user.deleteOne();
    }

    /**
     * Get valid role options
     * @returns {Array} List of valid roles
     */
    static getValidRoles() {
        return VALID_ROLES;
    }
}

module.exports = UserService;
