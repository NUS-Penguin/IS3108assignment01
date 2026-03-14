const express = require('express');
const path = require('path');
const methodOverride = require('method-override');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hallRoutes = require('./routes/hallRoutes');
const movieRoutes = require('./routes/movieRoutes');
const screeningRoutes = require('./routes/screeningRoutes');

const app = express();
connectDB();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60
    }),
    cookie: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 1000 * 60 * 60 * 24,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
}));

app.use((req, res, next) => {
    res.locals.flash = req.session.flash;
    res.locals.user = req.session.userId ? {
        id: req.session.userId,
        username: req.session.username
    } : null;
    delete req.session.flash;
    next();
});

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/halls', hallRoutes);
app.use('/admin/movies', movieRoutes);
app.use('/admin/screenings', screeningRoutes);

app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 - Page Not Found',
        message: 'The page you are looking for does not exist.',
        user: res.locals.user
    });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🎬 CineVillage Admin Portal running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
