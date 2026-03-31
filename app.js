/**
 * app.js - Application Entry Point
 * 
 * This is the main entry point for the CineVillage Admin Portal.
 * It configures Express, middleware, routes, and starts the server.
 */

const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

// Import configuration
const connectDB = require('./config/db');

// Import middleware
const { errorHandler } = require('./middleware/errorMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hallRoutes = require('./routes/hallRoutes');
const movieRoutes = require('./routes/movieRoutes');
const screeningRoutes = require('./routes/screeningRoutes');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// EJS Layouts
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Method override for PUT and DELETE
app.use(methodOverride('_method'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
}));

// Flash message middleware
app.use((req, res, next) => {
    res.locals.flash = req.session.flash;
    res.locals.user = req.session.userId ? {
        id: req.session.userId,
        username: req.session.username
    } : null;
    res.locals.userRole = req.session.role || 'manager';
    delete req.session.flash;
    next();
});

// Routes
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/halls', hallRoutes);
app.use('/admin/movies', movieRoutes);
app.use('/admin/screenings', screeningRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.',
        user: res.locals.user
    });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🎬 CineVillage Admin Portal running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
