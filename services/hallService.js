const Hall = require('../models/Hall');
const Screening = require('../models/Screening');
const { AppError } = require('../middleware/errorMiddleware');

class HallService {
    static async getHallStatistics(hallId) {
        const hall = await Hall.findById(hallId);
        if (!hall) {
            throw new AppError('Hall not found', 404);
        }

        const totalScreenings = await Screening.countDocuments({ hall: hallId });
        const upcomingScreenings = await Screening.countDocuments({
            hall: hallId,
            startTime: { $gt: new Date() }
        });

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayScreenings = await Screening.countDocuments({
            hall: hallId,
            date: {
                $gte: todayStart,
                $lte: todayEnd
            }
        });

        return {
            hall,
            totalScreenings,
            upcomingScreenings,
            todayScreenings,
            capacity: hall.capacity,
            seatDistribution: hall.getSeatDistribution(),
            seatingLayout: hall.generateSeatingLayout()
        };
    }

    static validateMaintenanceDates(startDate, endDate) {
        if (!startDate || !endDate) {
            throw new AppError('Both maintenance start and end dates are required', 400);
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new AppError('Invalid date format', 400);
        }

        if (start >= end) {
            throw new AppError('Maintenance end date must be after start date', 400);
        }

        return true;
    }

    static async checkMaintenanceConflicts(hallId, startDate, endDate) {
        const conflictingScreenings = await Screening.countDocuments({
            hall: hallId,
            startTime: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        });

        if (conflictingScreenings > 0) {
            throw new AppError(
                `Cannot schedule maintenance: ${conflictingScreenings} screening(s) scheduled during this period`,
                400
            );
        }

        return true;
    }

    static processSeatMatrix(seatMatrix, rows, columns) {
        if (!seatMatrix || !Array.isArray(seatMatrix)) {
            return [];
        }

        const result = [];
        for (let row = 0; row < rows; row++) {
            const currentRow = [];
            for (let col = 0; col < columns; col++) {
                const index = row * columns + col;
                const seatType = seatMatrix[index] || 'empty';

                if (!['regular', 'vip', 'wheelchair', 'unavailable', 'empty'].includes(seatType)) {
                    throw new AppError(`Invalid seat type: ${seatType}`, 400);
                }

                currentRow.push(seatType);
            }
            result.push(currentRow);
        }

        return result;
    }

    static calculateSeatTypesFromMatrix(seatMatrix) {
        const counts = {
            regular: 0,
            vip: 0,
            wheelchair: 0,
            unavailable: 0,
            empty: 0
        };

        for (const row of seatMatrix) {
            for (const seat of row) {
                if (counts.hasOwnProperty(seat)) {
                    counts[seat]++;
                }
            }
        }

        const seatTypes = [];

        if (counts.regular > 0) {
            seatTypes.push({ type: 'regular', count: counts.regular });
        }

        if (counts.vip > 0) {
            seatTypes.push({ type: 'vip', count: counts.vip });
        }

        if (counts.wheelchair > 0) {
            seatTypes.push({ type: 'wheelchair', count: counts.wheelchair });
        }

        return seatTypes;
    }

    static generateDefaultSeatMatrix(rows, columns) {
        const result = [];

        for (let row = 0; row < rows; row++) {
            const currentRow = [];
            for (let col = 0; col < columns; col++) {
                currentRow.push('regular');
            }
            result.push(currentRow);
        }

        return result;
    }
}

module.exports = HallService;
