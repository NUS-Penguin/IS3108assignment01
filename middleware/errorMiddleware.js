class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    console.error('ERROR 💥:', {
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack
    });

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

    if (err.name === 'CastError') {
        const message = `Invalid ${err.path}: ${err.value}`;
        return res.status(400).render('error', {
            title: 'Invalid ID',
            message,
            user: res.locals.user,
            layout: false
        });
    }

    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Error',
            message: err.message,
            user: res.locals.user,
            layout: false
        });
    }

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
