/**
 * controllers/screeningController.js - Screening Controller
 * 
 * Handles HTTP requests for screening management.
 * Business logic for overlap detection is in screeningService.
 */

const Screening = require('../models/Screening');
const Movie = require('../models/Movie');
const Hall = require('../models/Hall');
const ScreeningService = require('../services/screeningService');
const { AppError } = require('../middleware/errorMiddleware');

/**
 * GET /admin/screenings - List all screenings
 */
exports.index = async (req, res, next) => {
    try {
        const screenings = await Screening.find()
            .populate('movie', 'title durationMinutes genre')
            .populate('hall', 'name status')
            .sort({ startTime: 1 });

        res.render('screenings/index', {
            title: 'Screenings',
            username: req.session.username,
            screenings
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /admin/screenings/new - Render create screening form
 * GET /admin/screenings/:id/edit - Render edit screening form
 * Unified form handler for both create and edit operations
 */
exports.renderForm = async (req, res, next) => {
    try {
        const isEditMode = !!req.params.id;

        const [movies, halls] = await Promise.all([
            Movie.find().sort({ title: 1 }),
            Hall.find({ status: 'active' }).sort({ name: 1 })
        ]);

        if (isEditMode) {
            // Edit mode - fetch screening data
            const screening = await Screening.findById(req.params.id)
                .populate('movie')
                .populate('hall');

            if (!screening) {
                throw new AppError('Screening not found', 404);
            }

            res.render('screenings/form', {
                title: 'Edit Screening',
                username: req.session.username,
                screening,
                movies,
                halls,
                error: null
            });
        } else {
            // Create mode - no screening data
            res.render('screenings/form', {
                title: 'Create New Screening',
                username: req.session.username,
                movies,
                halls,
                error: null
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * POST /admin/screenings - Create new screening
 */
exports.create = async (req, res, next) => {
    try {
        const { movie, hall, startTime } = req.body;

        // Use service to create screening (includes overlap detection)
        const screening = await ScreeningService.createScreening({
            movie,
            hall,
            startTime: new Date(startTime)
        });

        req.session.flash = {
            type: 'success',
            message: 'Screening created successfully'
        };

        res.redirect('/admin/screenings');

    } catch (error) {
        // Re-fetch form data to redisplay form
        const [movies, halls] = await Promise.all([
            Movie.find().sort({ title: 1 }),
            Hall.find({ status: 'active' }).sort({ name: 1 })
        ]);

        return res.render('screenings/form', {
            title: 'Create New Screening',
            username: req.session.username,
            movies,
            halls,
            error: error.message
        });
    }
};

/**
 * PUT /admin/screenings/:id - Update screening
 */
exports.update = async (req, res, next) => {
    try {
        const { movie, hall, startTime } = req.body;

        // Use service to update screening (includes overlap detection)
        const screening = await ScreeningService.updateScreening(req.params.id, {
            movie,
            hall,
            startTime: new Date(startTime)
        });

        req.session.flash = {
            type: 'success',
            message: 'Screening updated successfully'
        };

        res.redirect('/admin/screenings');

    } catch (error) {
        // Re-fetch form data to redisplay form
        const [movies, halls] = await Promise.all([
            Movie.find().sort({ title: 1 }),
            Hall.find({ status: 'active' }).sort({ name: 1 })
        ]);

        const screening = await Screening.findById(req.params.id)
            .populate('movie')
            .populate('hall');

        return res.render('screenings/form', {
            title: 'Edit Screening',
            username: req.session.username,
            screening,
            movies,
            halls,
            error: error.message
        });
    }
};

/**
 * DELETE /admin/screenings/:id - Delete screening
 */
exports.delete = async (req, res, next) => {
    try {
        const screening = await Screening.findById(req.params.id);

        if (!screening) {
            throw new AppError('Screening not found', 404);
        }

        await screening.deleteOne();

        req.session.flash = {
            type: 'success',
            message: 'Screening deleted successfully'
        };

        res.redirect('/admin/screenings');

    } catch (error) {
        next(error);
    }
};
