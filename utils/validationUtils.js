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
 * At least 6 characters, contains letter and number
 */
exports.isStrongPassword = (password) => {
    if (password.length < 6) return false;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasLetter && hasNumber;
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
