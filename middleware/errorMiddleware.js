/**
 * middleware/errorMiddleware.js - Centralized Error Handling
 * 
 * Custom error class and global error handling middleware.
 */

/**
 * Custom AppError class for operational errors
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global error handling middleware
 * Must be the last middleware in app.js
 */
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error for debugging
    console.error('ERROR 💥:', {
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        const message = `Invalid input data: ${errors.join('. ')}`;
        return res.status(400).render('error', {
            title: 'Validation Error',
            message,
            user: res.locals.user,
            layout: false
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        const message = `${field} '${value}' already exists. Please use another value.`;
        return res.status(400).render('error', {
            title: 'Duplicate Entry',
            message,
            user: res.locals.user,
            layout: false
        });
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        const message = `Invalid ${err.path}: ${err.value}`;
        return res.status(400).render('error', {
            title: 'Invalid ID',
            message,
            user: res.locals.user,
            layout: false
        });
    }

    // Operational error (AppError)
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Error',
            message: err.message,
            user: res.locals.user,
            layout: false
        });
    }

    // Programming or unknown error - don't leak details
    return res.status(500).render('error', {
        title: 'Something went wrong',
        message: process.env.NODE_ENV === 'development'
            ? err.message
            : 'An unexpected error occurred. Please try again later.',
        user: res.locals.user,
        layout: false
    });
};

module.exports = { AppError, errorHandler };
