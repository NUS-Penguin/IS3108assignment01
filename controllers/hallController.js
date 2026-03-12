/**
 * controllers/hallController.js - Hall Controller
 * 
 * Handles HTTP requests for cinema hall management.
 * Controllers are thin - business logic belongs in services.
 * Enhanced for Module 2: Hall Management
 */

const Hall = require('../models/Hall');
const HallService = require('../services/hallService');
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
 * GET /admin/halls/:id - Show hall details with seating layout
 */
exports.show = async (req, res, next) => {
    try {
        const stats = await HallService.getHallStatistics(req.params.id);

        res.render('halls/show', {
            title: `${stats.hall.name} - Hall Details`,
            username: req.session.username,
            hall: stats.hall,
            stats,
            seatingLayout: stats.seatingLayout,
            seatDistribution: stats.seatDistribution
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
        const {
            name,
            rows,
            columns,
            status,
            regularSeats,
            vipSeats,
            wheelchairSeats,
            maintenanceStartDate,
            maintenanceEndDate,
            maintenanceReason
        } = req.body;

        const rowsInt = parseInt(rows);
        const colsInt = parseInt(columns);

        // Process seat types
        const seatTypes = HallService.processSeatTypes(
            regularSeats,
            vipSeats,
            wheelchairSeats
        );

        // Validate seat types don't exceed capacity
        if (seatTypes.length > 0) {
            HallService.validateSeatTypes(rowsInt, colsInt, seatTypes);
        }

        // Create hall object
        const hallData = {
            name,
            rows: rowsInt,
            columns: colsInt,
            status: status || 'active',
            seatTypes: seatTypes.length > 0 ? seatTypes : []
        };

        // Add maintenance fields if status is maintenance
        if (status === 'maintenance') {
            if (!maintenanceStartDate || !maintenanceEndDate) {
                throw new AppError('Maintenance dates are required when status is maintenance', 400);
            }

            HallService.validateMaintenanceDates(maintenanceStartDate, maintenanceEndDate);

            hallData.maintenanceStartDate = new Date(maintenanceStartDate);
            hallData.maintenanceEndDate = new Date(maintenanceEndDate);
            hallData.maintenanceReason = maintenanceReason || null;
        }

        const hall = new Hall(hallData);
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

        if (error instanceof AppError) {
            return res.render('halls/create', {
                title: 'Create New Hall',
                username: req.session.username,
                error: error.message
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

        // Extract seat type counts for form
        const seatTypeCounts = {
            regular: 0,
            vip: 0,
            wheelchair: 0
        };

        if (hall.seatTypes && hall.seatTypes.length > 0) {
            hall.seatTypes.forEach(seat => {
                seatTypeCounts[seat.type] = seat.count;
            });
        }

        res.render('halls/edit', {
            title: 'Edit Hall',
            username: req.session.username,
            hall,
            seatTypeCounts,
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
        const {
            name,
            rows,
            columns,
            status,
            regularSeats,
            vipSeats,
            wheelchairSeats,
            maintenanceStartDate,
            maintenanceEndDate,
            maintenanceReason
        } = req.body;

        const hall = await Hall.findById(req.params.id);

        if (!hall) {
            throw new AppError('Hall not found', 404);
        }

        const rowsInt = parseInt(rows);
        const colsInt = parseInt(columns);

        // Process seat types
        const seatTypes = HallService.processSeatTypes(
            regularSeats,
            vipSeats,
            wheelchairSeats
        );

        // Validate seat types don't exceed capacity
        if (seatTypes.length > 0) {
            HallService.validateSeatTypes(rowsInt, colsInt, seatTypes);
        }

        // Update basic fields
        hall.name = name;
        hall.rows = rowsInt;
        hall.columns = colsInt;
        hall.status = status;
        hall.seatTypes = seatTypes.length > 0 ? seatTypes : [];

        // Handle maintenance fields
        if (status === 'maintenance') {
            if (!maintenanceStartDate || !maintenanceEndDate) {
                throw new AppError('Maintenance dates are required when status is maintenance', 400);
            }

            HallService.validateMaintenanceDates(maintenanceStartDate, maintenanceEndDate);

            // Check for conflicting screenings during maintenance period
            await HallService.checkMaintenanceConflicts(
                hall._id,
                maintenanceStartDate,
                maintenanceEndDate
            );

            hall.maintenanceStartDate = new Date(maintenanceStartDate);
            hall.maintenanceEndDate = new Date(maintenanceEndDate);
            hall.maintenanceReason = maintenanceReason || null;
        } else {
            // Clear maintenance fields if not in maintenance
            hall.maintenanceStartDate = null;
            hall.maintenanceEndDate = null;
            hall.maintenanceReason = null;
        }

        await hall.save();

        req.session.flash = {
            type: 'success',
            message: 'Hall updated successfully'
        };

        res.redirect('/admin/halls');

    } catch (error) {
        if (error.name === 'ValidationError') {
            const hall = await Hall.findById(req.params.id);
            const seatTypeCounts = {
                regular: 0,
                vip: 0,
                wheelchair: 0
            };
            if (hall.seatTypes) {
                hall.seatTypes.forEach(seat => {
                    seatTypeCounts[seat.type] = seat.count;
                });
            }
            return res.render('halls/edit', {
                title: 'Edit Hall',
                username: req.session.username,
                hall,
                seatTypeCounts,
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }

        if (error instanceof AppError) {
            const hall = await Hall.findById(req.params.id);
            const seatTypeCounts = {
                regular: 0,
                vip: 0,
                wheelchair: 0
            };
            if (hall.seatTypes) {
                hall.seatTypes.forEach(seat => {
                    seatTypeCounts[seat.type] = seat.count;
                });
            }
            return res.render('halls/edit', {
                title: 'Edit Hall',
                username: req.session.username,
                hall,
                seatTypeCounts,
                error: error.message
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
                message: `Cannot delete hall with ${futureScreenings} future screening(s) scheduled`
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
