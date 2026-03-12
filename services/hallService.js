/**
 * services/hallService.js - Hall Business Logic
 * 
 * Business logic for hall operations including seat configuration,
 * maintenance scheduling, and seating layout generation.
 * Enhanced for Module 2: Hall Management
 */

const Hall = require('../models/Hall');
const Screening = require('../models/Screening');
const { AppError } = require('../middleware/errorMiddleware');

class HallService {

    /**
     * Get all active halls
     */
    static async getActiveHalls() {
        return await Hall.findActive();
    }

    /**
     * Check if hall can be deleted (no future screenings)
     */
    static async canDeleteHall(hallId) {
        const futureScreenings = await Screening.countDocuments({
            hall: hallId,
            startTime: { $gt: new Date() }
        });

        return futureScreenings === 0;
    }

    /**
     * Get hall statistics including seating and screening information
     */
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

        // Get today's screenings
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

    /**
     * Validate seat type configuration
     * Ensures seat types don't exceed hall capacity and are properly distributed
     */
    static validateSeatTypes(rows, columns, seatTypes) {
        const capacity = rows * columns;

        if (!seatTypes || seatTypes.length === 0) {
            // If no seat types specified, default to all regular seats
            return true;
        }

        // Calculate total seats from seat types
        const totalConfiguredSeats = seatTypes.reduce((sum, seat) => {
            return sum + (parseInt(seat.count) || 0);
        }, 0);

        if (totalConfiguredSeats > capacity) {
            throw new AppError(
                `Total seat types (${totalConfiguredSeats}) cannot exceed hall capacity (${capacity})`,
                400
            );
        }

        // Validate each seat type count is non-negative
        for (const seat of seatTypes) {
            if (seat.count < 0) {
                throw new AppError(`Seat count for ${seat.type} cannot be negative`, 400);
            }
        }

        return true;
    }

    /**
     * Process seat types from form data
     * Converts form input into proper seatTypes array
     */
    static processSeatTypes(regularCount, vipCount, wheelchairCount) {
        const seatTypes = [];

        const regular = parseInt(regularCount) || 0;
        const vip = parseInt(vipCount) || 0;
        const wheelchair = parseInt(wheelchairCount) || 0;

        if (regular > 0) {
            seatTypes.push({ type: 'regular', count: regular });
        }

        if (vip > 0) {
            seatTypes.push({ type: 'vip', count: vip });
        }

        if (wheelchair > 0) {
            seatTypes.push({ type: 'wheelchair', count: wheelchair });
        }

        return seatTypes;
    }

    /**
     * Validate maintenance dates
     */
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

    /**
     * Check if hall has conflicting screenings during maintenance period
     */
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

    /**
     * Process seat matrix data from the form
     * Converts flat seat matrix array to 2D array for storage
     */
    static processSeatMatrix(seatMatrix, rows, columns) {
        if (!seatMatrix || !Array.isArray(seatMatrix)) {
            return [];
        }

        // Convert flat array to 2D matrix
        const result = [];
        for (let row = 0; row < rows; row++) {
            const currentRow = [];
            for (let col = 0; col < columns; col++) {
                const index = row * columns + col;
                const seatType = seatMatrix[index] || 'empty';

                // Validate seat type
                if (!['regular', 'vip', 'wheelchair', 'unavailable', 'empty'].includes(seatType)) {
                    throw new AppError(`Invalid seat type: ${seatType}`, 400);
                }

                currentRow.push(seatType);
            }
            result.push(currentRow);
        }

        return result;
    }

    /**
     * Generate seat matrix from seat type counts (fallback method)
     * Creates a simple distribution when visual configuration is not used
     */
    static generateSeatMatrixFromTypes(rows, columns, seatTypes) {
        const result = [];
        let seatIndex = 0;

        // Initialize all seats as empty
        for (let row = 0; row < rows; row++) {
            const currentRow = [];
            for (let col = 0; col < columns; col++) {
                currentRow.push('empty');
            }
            result.push(currentRow);
        }

        // Distribute seat types
        for (const seatType of seatTypes) {
            for (let count = 0; count < seatType.count && seatIndex < rows * columns; count++) {
                const row = Math.floor(seatIndex / columns);
                const col = seatIndex % columns;
                result[row][col] = seatType.type;
                seatIndex++;
            }
        }

        return result;
    }

    /**
     * Get hall utilization rate
     */
    static async getHallUtilization(hallId, days = 7) {
        const hall = await Hall.findById(hallId);
        if (!hall) {
            throw new AppError('Hall not found', 404);
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const screenings = await Screening.countDocuments({
            hall: hallId,
            startTime: { $gte: startDate, $lte: new Date() }
        });

        // Calculate max possible screenings (assuming 4-hour average movie + 15 min cleaning)
        const avgScreeningDuration = 4.25; // hours
        const operatingHours = 16; // 8 AM to 12 AM
        const maxScreeningsPerDay = Math.floor(operatingHours / avgScreeningDuration);
        const maxPossibleScreenings = maxScreeningsPerDay * days;

        const utilizationRate = maxPossibleScreenings > 0
            ? Math.round((screenings / maxPossibleScreenings) * 100)
            : 0;

        return {
            screenings,
            days,
            maxPossibleScreenings,
            utilizationRate
        };
    }
}

module.exports = HallService;
