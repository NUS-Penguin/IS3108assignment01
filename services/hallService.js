/**
 * services/hallService.js - Hall Business Logic
 * 
 * Business logic for hall operations.
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
     * Get hall statistics
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

        return {
            hall,
            totalScreenings,
            upcomingScreenings,
            totalSeats: hall.totalSeats
        };
    }
}

module.exports = HallService;
