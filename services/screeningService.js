/**
 * services/screeningService.js - Screening Business Logic
 * 
 * Contains the CRITICAL overlap detection algorithm and screening creation logic.
 */

const Screening = require('../models/Screening');
const Movie = require('../models/Movie');
const Hall = require('../models/Hall');
const { AppError } = require('../middleware/errorMiddleware');

class ScreeningService {

    /**
     * Create a new screening with overlap detection
     * 
     * @param {Object} data - Screening data { movie, hall, startTime }
     * @returns {Promise<Screening>} Created screening
     * @throws {AppError} If validation fails or overlap detected
     */
    static async createScreening(data) {
        const { movie, hall, startTime } = data;

        // 1. Validate movie exists
        const movieDoc = await Movie.findById(movie);
        if (!movieDoc) {
            throw new AppError('Movie not found', 404);
        }

        // 2. Validate hall exists and is available
        const hallDoc = await Hall.findById(hall);
        if (!hallDoc) {
            throw new AppError('Hall not found', 404);
        }

        if (hallDoc.status !== 'active') {
            throw new AppError('Cannot create screening in a hall under maintenance', 400);
        }

        // 3. Validate start time is in the future
        if (startTime <= new Date()) {
            throw new AppError('Start time must be in the future', 400);
        }

        // 4. Calculate end time
        const endTime = new Date(startTime.getTime() + movieDoc.durationMinutes * 60000);

        // 5. CRITICAL: Check for overlaps
        await this._checkForOverlap(hall, startTime, endTime);

        // 6. Create screening
        const screening = new Screening({
            movie,
            hall,
            startTime,
            endTime
        });

        await screening.save();
        return screening;
    }

    /**
     * CRITICAL BUSINESS RULE: Overlap Detection
     * 
     * Two screenings in the SAME hall MUST NOT overlap in time on the SAME date.
     * 
     * Mathematical formula:
     * Overlap occurs IF: (existingStart < newEnd) AND (existingEnd > newStart)
     * 
     * @param {ObjectId} hallId - Hall ID
     * @param {Date} startTime - New screening start time
     * @param {Date} endTime - New screening end time
     * @param {ObjectId} excludeScreeningId - Optional: exclude this screening (for updates)
     * @throws {AppError} If overlap detected
     */
    static async _checkForOverlap(hallId, startTime, endTime, excludeScreeningId = null) {
        // Extract date for same-day comparison (date only, no time)
        const screeningDate = new Date(startTime);
        screeningDate.setHours(0, 0, 0, 0);

        const nextDay = new Date(screeningDate);
        nextDay.setDate(nextDay.getDate() + 1);

        // Find all screenings in same hall on same day
        const query = {
            hall: hallId,
            date: {
                $gte: screeningDate,
                $lt: nextDay
            }
        };

        // Exclude current screening if updating
        if (excludeScreeningId) {
            query._id = { $ne: excludeScreeningId };
        }

        const existingScreenings = await Screening.find(query);

        // Check for overlap with each existing screening
        for (const existing of existingScreenings) {
            const existingStart = existing.startTime;
            const existingEnd = existing.endTime;

            // CRITICAL OVERLAP FORMULA
            // Overlap occurs if: (existingStart < newEnd) AND (existingEnd > newStart)
            const hasOverlap = (existingStart < endTime) && (existingEnd > startTime);

            if (hasOverlap) {
                const existingMovie = await Movie.findById(existing.movie);
                throw new AppError(
                    `Screening overlaps with existing screening of "${existingMovie.title}" ` +
                    `from ${existingStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ` +
                    `to ${existingEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
                    400
                );
            }
        }

        return true; // No overlap found
    }

    /**
     * Update an existing screening with overlap detection
     * 
     * @param {ObjectId} screeningId - ID of screening to update
     * @param {Object} data - Screening data { movie, hall, startTime }
     * @returns {Promise<Screening>} Updated screening
     * @throws {AppError} If validation fails or overlap detected
     */
    static async updateScreening(screeningId, data) {
        const { movie, hall, startTime } = data;

        // 1. Validate screening exists
        const screening = await Screening.findById(screeningId);
        if (!screening) {
            throw new AppError('Screening not found', 404);
        }

        // 2. Validate movie exists
        const movieDoc = await Movie.findById(movie);
        if (!movieDoc) {
            throw new AppError('Movie not found', 404);
        }

        // 3. Validate hall exists and is available
        const hallDoc = await Hall.findById(hall);
        if (!hallDoc) {
            throw new AppError('Hall not found', 404);
        }

        if (hallDoc.status !== 'active') {
            throw new AppError('Cannot schedule screening in a hall under maintenance', 400);
        }

        // 4. Calculate end time
        const endTime = new Date(startTime.getTime() + movieDoc.durationMinutes * 60000);

        // 5. CRITICAL: Check for overlaps (excluding current screening)
        await this._checkForOverlap(hall, startTime, endTime, screeningId);

        // 6. Update screening
        screening.movie = movie;
        screening.hall = hall;
        screening.startTime = startTime;
        screening.endTime = endTime;

        await screening.save();
        return screening;
    }

    /**
     * Get upcoming screenings for dashboard
     */
    static async getUpcomingScreenings(limit = 10) {
        return await Screening.findUpcoming(limit);
    }

    /**
     * Get screenings for a specific date
     */
    static async getScreeningsByDate(date) {
        return await Screening.findByDate(date);
    }
}

module.exports = ScreeningService;
