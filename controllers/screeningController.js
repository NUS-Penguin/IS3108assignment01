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

const DEFAULT_CLEANING_BUFFER_MINUTES = Number(process.env.SCREENING_BUFFER_MINUTES || 15);
const TIMELINE_SLOT_MINUTES = 30;

const _normalizeSelectedDate = (dateValue) => {
    const selectedDate = dateValue ? new Date(dateValue) : new Date();
    const normalizedDate = isNaN(selectedDate.getTime()) ? new Date() : selectedDate;
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
};

const _toDateInputValue = (date) => {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
};

const _serializeScreening = (screening) => ({
    id: String(screening._id),
    status: screening.status,
    startTime: screening.startTime,
    endTime: screening.endTime,
    movie: screening.movie ? {
        id: String(screening.movie._id),
        title: screening.movie.title,
        durationMinutes: screening.movie.durationMinutes,
        genre: screening.movie.genre,
        poster: screening.movie.posterPath || screening.movie.posterURL || ''
    } : null,
    hall: screening.hall ? {
        id: String(screening.hall._id),
        name: screening.hall.name,
        status: screening.hall.status
    } : null
});

const _snapToTimelineSlot = (dateValue) => {
    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {
        throw new AppError('Invalid start time format', 400);
    }

    const roundedMinutes = Math.round(date.getMinutes() / TIMELINE_SLOT_MINUTES) * TIMELINE_SLOT_MINUTES;
    if (roundedMinutes >= 60) {
        date.setHours(date.getHours() + 1, 0, 0, 0);
    } else {
        date.setMinutes(roundedMinutes, 0, 0);
    }

    return date;
};

/**
 * GET /admin/screenings - List all screenings
 */
exports.index = async (req, res, next) => {
    try {
        await ScreeningService.markCompletedScreenings();

        const normalizedDate = _normalizeSelectedDate(req.query.date);
        const selectedDateValue = _toDateInputValue(normalizedDate);

        const [halls, movies, timelineScreenings] = await Promise.all([
            Hall.find().sort({ name: 1 }),
            Movie.find({ status: { $ne: 'Archived' } }).sort({ title: 1 }),
            ScreeningService.getTimelineScreeningsByDate(normalizedDate)
        ]);

        const timelineHalls = halls.map((hall) => ({
            id: String(hall._id),
            name: hall.name,
            status: hall.status
        }));

        res.render('screenings/index', {
            title: 'Screenings',
            username: req.session.username,
            selectedDateValue,
            cleaningBufferMinutes: DEFAULT_CLEANING_BUFFER_MINUTES,
            halls,
            timelineHalls,
            movies,
            timelineScreenings: timelineScreenings.map(_serializeScreening)
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /admin/screenings/:id - Show screening occupancy (read-only)
 */
exports.show = async (req, res, next) => {
    try {
        const screening = await Screening.findById(req.params.id)
            .populate('movie')
            .populate('hall');

        if (!screening) {
            throw new AppError('Screening not found', 404);
        }

        const fallbackOccupancy = ScreeningService.buildInitialSeatOccupancy(screening.hall);
        const hasValidOccupancy = Array.isArray(screening.seatOccupancy) && screening.seatOccupancy.length > 0;
        const seatOccupancy = hasValidOccupancy ? screening.seatOccupancy : fallbackOccupancy;

        if (!hasValidOccupancy) {
            screening.seatOccupancy = fallbackOccupancy;
            await screening.save();
        }

        const flatSeats = seatOccupancy.flat().filter((seat) => seat && seat.type !== 'empty');
        const occupiedSeats = flatSeats.filter((seat) => seat.status === 'occupied').length;
        const unavailableSeats = flatSeats.filter((seat) => seat.status === 'unavailable').length;
        const availableSeats = flatSeats.filter((seat) => seat.status === 'available').length;
        const totalSeats = flatSeats.length;

        res.render('screenings/show', {
            title: 'Screening Seat Overview',
            username: req.session.username,
            screening,
            seatOccupancy,
            stats: {
                totalSeats,
                occupiedSeats,
                availableSeats,
                unavailableSeats
            }
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
        const redirectTo = req.body?.redirectTo;

        if (!screening) {
            throw new AppError('Screening not found', 404);
        }

        await screening.deleteOne();

        req.session.flash = {
            type: 'success',
            message: 'Screening deleted successfully'
        };

        if (redirectTo === 'dashboard') {
            return res.redirect('/admin/dashboard');
        }

        res.redirect('/admin/screenings');

    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /admin/screenings/:id/cancel - Cancel screening
 */
exports.cancel = async (req, res, next) => {
    try {
        const screening = await ScreeningService.cancelScreening(req.params.id);

        req.session.flash = {
            type: 'warning',
            message: `Screening for "${screening.movie?.title || 'movie'}" in ${screening.hall?.name || 'hall'} has been cancelled`
        };

        res.redirect('/admin/screenings');
    } catch (error) {
        next(error);
    }
};

/**
 * GET /admin/screenings/timeline/data?date=YYYY-MM-DD
 */
exports.getTimelineData = async (req, res) => {
    try {
        await ScreeningService.markCompletedScreenings();
        const normalizedDate = _normalizeSelectedDate(req.query.date);
        const timelineScreenings = await ScreeningService.getTimelineScreeningsByDate(normalizedDate);

        return res.json({
            success: true,
            selectedDate: _toDateInputValue(normalizedDate),
            screenings: timelineScreenings.map(_serializeScreening)
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to load timeline data'
        });
    }
};

/**
 * POST /admin/screenings/timeline
 */
exports.createFromTimeline = async (req, res) => {
    try {
        const { movieId, hallId, startDateTime } = req.body;

        if (!movieId || !hallId || !startDateTime) {
            throw new AppError('Movie, hall, and start time are required', 400);
        }

        const snappedStartTime = _snapToTimelineSlot(startDateTime);

        const created = await ScreeningService.createScreening({
            movie: movieId,
            hall: hallId,
            startTime: snappedStartTime
        });

        const screening = await Screening.findById(created._id)
            .populate('movie', 'title durationMinutes genre')
            .populate('hall', 'name status');

        return res.status(201).json({
            success: true,
            message: 'Screening scheduled successfully',
            screening: _serializeScreening(screening)
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to schedule screening'
        });
    }
};

/**
 * PATCH /admin/screenings/timeline/:id/move
 */
exports.moveTimelineScreening = async (req, res) => {
    try {
        const { hallId, startDateTime } = req.body;

        if (!hallId || !startDateTime) {
            throw new AppError('Hall and start time are required to move screening', 400);
        }

        const snappedStartTime = _snapToTimelineSlot(startDateTime);

        const existing = await Screening.findById(req.params.id);
        if (!existing) {
            throw new AppError('Screening not found', 404);
        }

        const updated = await ScreeningService.updateScreening(req.params.id, {
            movie: existing.movie,
            hall: hallId,
            startTime: snappedStartTime
        });

        const screening = await Screening.findById(updated._id)
            .populate('movie', 'title durationMinutes genre')
            .populate('hall', 'name status');

        return res.json({
            success: true,
            message: 'Screening moved successfully',
            screening: _serializeScreening(screening)
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to move screening'
        });
    }
};

/**
 * DELETE /admin/screenings/timeline/:id
 */
exports.deleteTimelineScreening = async (req, res) => {
    try {
        const screening = await Screening.findById(req.params.id);

        if (!screening) {
            throw new AppError('Screening not found', 404);
        }

        await screening.deleteOne();

        return res.json({
            success: true,
            message: 'Screening deleted successfully'
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to delete screening'
        });
    }
};

/**
 * PATCH /admin/screenings/timeline/:id/cancel
 */
exports.cancelTimelineScreening = async (req, res) => {
    try {
        const screening = await ScreeningService.cancelScreening(req.params.id);

        return res.json({
            success: true,
            message: `Screening for "${screening.movie?.title || 'movie'}" has been cancelled`
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to cancel screening'
        });
    }
};
