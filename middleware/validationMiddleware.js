/**
 * middleware/validationMiddleware.js - Input Validation Middleware
 * 
 * Validates request data before processing.
 */

const { AppError } = require('./errorMiddleware');

/**
 * Validate screening creation data
 */
exports.validateScreening = (req, res, next) => {
    const { movie, hall, startTime } = req.body;

    // Check required fields
    if (!movie || !hall || !startTime) {
        return next(new AppError('Movie, hall, and start time are required', 400));
    }

    // Validate startTime is a valid date
    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
        return next(new AppError('Invalid start time format', 400));
    }

    // Validate startTime is in the future
    if (startDate <= new Date()) {
        return next(new AppError('Start time must be in the future', 400));
    }

    next();
};

/**
 * Validate hall creation/update data
 */
exports.validateHall = (req, res, next) => {
    const { name, rows, columns } = req.body;

    if (!name || !rows || !columns) {
        return next(new AppError('Name, rows, and columns are required', 400));
    }

    const rowsNum = parseInt(rows);
    const colsNum = parseInt(columns);

    if (isNaN(rowsNum) || rowsNum < 1 || rowsNum > 26) {
        return next(new AppError('Rows must be between 1 and 26', 400));
    }

    if (isNaN(colsNum) || colsNum < 1 || colsNum > 50) {
        return next(new AppError('Columns must be between 1 and 50', 400));
    }

    next();
};

/**
 * Validate movie creation/update data
 */
exports.validateMovie = (req, res, next) => {
    const { title, description, durationMinutes, genre, releaseDate, status } = req.body;

    if (!title || !description || !durationMinutes || !genre || !releaseDate) {
        return next(new AppError('All required fields must be filled', 400));
    }

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration < 1 || duration > 500) {
        return next(new AppError('Duration must be between 1 and 500 minutes', 400));
    }

    const release = new Date(releaseDate);
    if (isNaN(release.getTime())) {
        return next(new AppError('Invalid release date format', 400));
    }

    const VALID_STATUSES = ['Now Showing', 'Coming Soon', 'Archived'];
    if (status && !VALID_STATUSES.includes(status)) {
        return next(new AppError('Status must be Now Showing, Coming Soon, or Archived', 400));
    }

    next();
};
