/**
 * controllers/hallController.js - Hall Controller
 * 
 * Handles HTTP requests for cinema hall management.
 * Controllers are thin - business logic belongs in services.
 */

const Hall = require('../models/Hall');
const { AppError } = require('../middleware/errorMiddleware');

/**
 * GET /admin/halls - List all halls
 */
exports.index = async (req, res, next) => {
    try {
        const halls = await Hall.find().sort({ createdAt: -1 });

        res.render('halls/index', {
            title: 'Cinema Halls',
            username: req.session.username,
            halls
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /admin/halls/new - Render create hall form
 */
exports.renderCreate = (req, res) => {
    res.render('halls/create', {
        title: 'Create New Hall',
        username: req.session.username,
        error: null
    });
};

/**
 * POST /admin/halls - Create new hall
 */
exports.create = async (req, res, next) => {
    try {
        const { name, rows, columns, status } = req.body;

        const hall = new Hall({
            name,
            rows: parseInt(rows),
            columns: parseInt(columns),
            status: status || 'active'
        });

        await hall.save();

        req.session.flash = {
            type: 'success',
            message: 'Hall created successfully'
        };

        res.redirect('/admin/halls');

    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.render('halls/create', {
                title: 'Create New Hall',
                username: req.session.username,
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        next(error);
    }
};

/**
 * GET /admin/halls/:id/edit - Render edit hall form
 */
exports.renderEdit = async (req, res, next) => {
    try {
        const hall = await Hall.findById(req.params.id);

        if (!hall) {
            throw new AppError('Hall not found', 404);
        }

        res.render('halls/edit', {
            title: 'Edit Hall',
            username: req.session.username,
            hall,
            error: null
        });

    } catch (error) {
        next(error);
    }
};

/**
 * PUT /admin/halls/:id - Update hall
 */
exports.update = async (req, res, next) => {
    try {
        const { name, rows, columns, status } = req.body;

        const hall = await Hall.findById(req.params.id);

        if (!hall) {
            throw new AppError('Hall not found', 404);
        }

        hall.name = name;
        hall.rows = parseInt(rows);
        hall.columns = parseInt(columns);
        hall.status = status;

        await hall.save();

        req.session.flash = {
            type: 'success',
            message: 'Hall updated successfully'
        };

        res.redirect('/admin/halls');

    } catch (error) {
        if (error.name === 'ValidationError') {
            const hall = await Hall.findById(req.params.id);
            return res.render('halls/edit', {
                title: 'Edit Hall',
                username: req.session.username,
                hall,
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        next(error);
    }
};

/**
 * DELETE /admin/halls/:id - Delete hall
 */
exports.delete = async (req, res, next) => {
    try {
        const hall = await Hall.findById(req.params.id);

        if (!hall) {
            throw new AppError('Hall not found', 404);
        }

        // Check for future screenings
        const Screening = require('../models/Screening');
        const futureScreenings = await Screening.countDocuments({
            hall: hall._id,
            startTime: { $gt: new Date() }
        });

        if (futureScreenings > 0) {
            req.session.flash = {
                type: 'danger',
                message: 'Cannot delete hall with future screenings scheduled'
            };
            return res.redirect('/admin/halls');
        }

        await hall.deleteOne();

        req.session.flash = {
            type: 'success',
            message: 'Hall deleted successfully'
        };

        res.redirect('/admin/halls');

    } catch (error) {
        next(error);
    }
};
