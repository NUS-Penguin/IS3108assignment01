/**
 * utils/validationUtils.js - Validation Utility Functions
 * 
 * Reusable validation helper functions.
 */

/**
 * Check if string is empty or whitespace only
 */
exports.isEmpty = (str) => {
    return !str || str.trim().length === 0;
};

/**
 * Validate email format
 */
exports.isValidEmail = (email) => {
    const regex = /^\S+@\S+\.\S+$/;
    return regex.test(email);
};

/**
 * Validate URL format
 */
exports.isValidURL = (url) => {
    try {
        new URL(url);
        return true;
    } catch (err) {
        return false;
    }
};

/**
 * Validate password strength
 * Requirements:
 * - Minimum length: 8 characters
 * - At least one uppercase letter
 * - At least one number
 * - At least one special character
 */
exports.isStrongPassword = (password) => {
    if (password.length < 8) return false;

    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasUppercase && hasNumber && hasSpecialChar;
};

/**
 * Get detailed password validation errors
 */
exports.getPasswordErrors = (password) => {
    const errors = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return errors;
};

/**
 * Sanitize string - remove HTML tags
 */
exports.sanitizeString = (str) => {
    return str.replace(/<[^>]*>/g, '');
};

/**
 * Validate MongoDB ObjectId format
 */
exports.isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate number is within range
 */
exports.isInRange = (num, min, max) => {
    const n = Number(num);
    return !isNaN(n) && n >= min && n <= max;
};

/**
 * Validate date is in the future
 */
exports.isFutureDate = (date) => {
    return new Date(date) > new Date();
};

/**
 * Trim all string values in an object
 */
exports.trimObjectValues = (obj) => {
    const trimmed = {};
    for (const [key, value] of Object.entries(obj)) {
        trimmed[key] = typeof value === 'string' ? value.trim() : value;
    }
    return trimmed;
};
