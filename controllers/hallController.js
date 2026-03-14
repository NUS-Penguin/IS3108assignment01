const Hall = require('../models/Hall');
const HallService = require('../services/hallService');
const { AppError } = require('../middleware/errorMiddleware');

const normalizeSeatMatrixInput = (seatMatrix) => {
    if (Array.isArray(seatMatrix)) {
        return seatMatrix;
    }

    if (typeof seatMatrix === 'string' && seatMatrix.trim() !== '') {
        try {
            const parsed = JSON.parse(seatMatrix);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            throw new AppError('Invalid seat layout data submitted', 400);
        }
    }

    return [];
};

const getSeatTypeCounts = (hall) => {
    const seatTypeCounts = {
        regular: 0,
        vip: 0,
        wheelchair: 0
    };

    if (hall?.seatTypes?.length) {
        hall.seatTypes.forEach((seat) => {
            seatTypeCounts[seat.type] = seat.count;
        });
    }

    return seatTypeCounts;
};

const renderEditFormWithError = async (res, session, hallId, error) => {
    const hall = await Hall.findById(hallId);
    return res.render('halls/form', {
        title: 'Edit Hall',
        username: session.username,
        hall,
        seatTypeCounts: getSeatTypeCounts(hall),
        seatMatrix: hall?.seats || [],
        error
    });
};

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

exports.renderForm = async (req, res, next) => {
    try {
        const isEditMode = !!req.params.id;

        if (isEditMode) {
            const hall = await Hall.findById(req.params.id);

            if (!hall) {
                throw new AppError('Hall not found', 404);
            }
            const seatMatrix = hall.seats || [];

            res.render('halls/form', {
                title: 'Edit Hall',
                username: req.session.username,
                hall,
                seatTypeCounts: getSeatTypeCounts(hall),
                seatMatrix,
                error: null
            });
        } else {
            res.render('halls/form', {
                title: 'Create New Hall',
                username: req.session.username,
                error: null
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.create = async (req, res, next) => {
    try {
        const {
            name,
            rows,
            columns,
            status,
            maintenanceStartDate,
            maintenanceEndDate,
            maintenanceReason,
            seatMatrix
        } = req.body;

        const rowsInt = parseInt(rows, 10);
        const colsInt = parseInt(columns, 10);

        let seatsArray = [];
        let seatTypes = [];

        const normalizedSeatMatrix = normalizeSeatMatrixInput(seatMatrix);

        if (normalizedSeatMatrix.length > 0) {
            seatsArray = HallService.processSeatMatrix(normalizedSeatMatrix, rowsInt, colsInt);
            seatTypes = HallService.calculateSeatTypesFromMatrix(seatsArray);
        } else {
            seatsArray = HallService.generateDefaultSeatMatrix(rowsInt, colsInt);
            seatTypes = [{ type: 'regular', count: rowsInt * colsInt }];
        }

        const hallData = {
            name,
            rows: rowsInt,
            columns: colsInt,
            status: status || 'active',
            seatTypes: seatTypes,
            seats: seatsArray
        };

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
            return res.render('halls/form', {
                title: 'Create New Hall',
                username: req.session.username,
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }

        if (error instanceof AppError) {
            return res.render('halls/form', {
                title: 'Create New Hall',
                username: req.session.username,
                error: error.message
            });
        }

        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const {
            name,
            rows,
            columns,
            status,
            seatMatrix,
            maintenanceStartDate,
            maintenanceEndDate,
            maintenanceReason
        } = req.body;

        const hall = await Hall.findById(req.params.id);

        if (!hall) {
            throw new AppError('Hall not found', 404);
        }

        const rowsInt = parseInt(rows, 10);
        const colsInt = parseInt(columns, 10);

        let seatsArray = [];
        let seatTypes = [];

        const normalizedSeatMatrix = normalizeSeatMatrixInput(seatMatrix);

        if (normalizedSeatMatrix.length > 0) {
            seatsArray = HallService.processSeatMatrix(normalizedSeatMatrix, rowsInt, colsInt);
            seatTypes = HallService.calculateSeatTypesFromMatrix(seatsArray);
        } else {
            seatsArray = HallService.generateDefaultSeatMatrix(rowsInt, colsInt);
            seatTypes = [{ type: 'regular', count: rowsInt * colsInt }];
        }

        hall.seats = seatsArray;
        hall.seatTypes = seatTypes;

        hall.name = name;
        hall.rows = rowsInt;
        hall.columns = colsInt;
        hall.status = status;

        if (status === 'maintenance') {
            if (!maintenanceStartDate || !maintenanceEndDate) {
                throw new AppError('Maintenance dates are required when status is maintenance', 400);
            }

            HallService.validateMaintenanceDates(maintenanceStartDate, maintenanceEndDate);

            await HallService.checkMaintenanceConflicts(
                hall._id,
                maintenanceStartDate,
                maintenanceEndDate
            );

            hall.maintenanceStartDate = new Date(maintenanceStartDate);
            hall.maintenanceEndDate = new Date(maintenanceEndDate);
            hall.maintenanceReason = maintenanceReason || null;
        } else {
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
            return renderEditFormWithError(
                res,
                req.session,
                req.params.id,
                Object.values(error.errors).map(e => e.message).join(', ')
            );
        }

        if (error instanceof AppError) {
            return renderEditFormWithError(res, req.session, req.params.id, error.message);
        }

        next(error);
    }
};

exports.delete = async (req, res, next) => {
    try {
        const hall = await Hall.findById(req.params.id);

        if (!hall) {
            throw new AppError('Hall not found', 404);
        }

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
