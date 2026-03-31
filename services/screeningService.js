/**
 * services/screeningService.js - Screening Business Logic
 * 
 * Contains the CRITICAL overlap detection algorithm and screening creation logic.
 */

const Screening = require('../models/Screening');
const Movie = require('../models/Movie');
const Hall = require('../models/Hall');
const { AppError } = require('../middleware/errorMiddleware');

const DEFAULT_CLEANING_BUFFER_MINUTES = Number(process.env.SCREENING_BUFFER_MINUTES || 15);
const BUFFER_BEFORE_MINUTES = Math.max(0, DEFAULT_CLEANING_BUFFER_MINUTES);
const BUFFER_AFTER_MINUTES = Math.max(0, DEFAULT_CLEANING_BUFFER_MINUTES);
const MINUTE_IN_MILLISECONDS = 60000;

class ScreeningService {

    static buildInitialSeatOccupancy(hallDoc) {
        const seatsMatrix = (hallDoc?.seats && hallDoc.seats.length > 0)
            ? hallDoc.seats
            : Array.from(
                { length: Number(hallDoc?.rows || 0) },
                () => Array.from({ length: Number(hallDoc?.columns || 0) }, () => 'regular')
            );

        return seatsMatrix.map((rowSeats = []) => rowSeats.map((seatType) => {
            if (seatType === 'empty') {
                return { type: 'empty', status: 'unavailable' };
            }

            if (seatType === 'unavailable') {
                return { type: 'unavailable', status: 'unavailable' };
            }

            const normalizedType = ['regular', 'vip', 'wheelchair'].includes(seatType) ? seatType : 'regular';
            return {
                type: normalizedType,
                status: 'available'
            };
        }));
    }

    static _getDayBounds(date) {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        return { dayStart, dayEnd };
    }

    static _validateMovieSchedulingEligibility(movieDoc) {
        if (movieDoc.status === 'Archived') {
            throw new AppError(
                `Cannot schedule screenings for archived movie "${movieDoc.title}". Update the movie status first.`,
                400
            );
        }

        if (movieDoc.status === 'Coming Soon' && new Date(movieDoc.releaseDate) > new Date()) {
            const releaseStr = movieDoc.releaseDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            throw new AppError(
                `Cannot schedule "${movieDoc.title}" yet — it is Coming Soon and releases on ${releaseStr}.`,
                400
            );
        }
    }

    /**
     * Create a new screening with overlap detection
     * 
     * @param {Object} data - Screening data { movie, hall, startTime }
     * @returns {Promise<Screening>} Created screening
     * @throws {AppError} If validation fails or overlap detected
     */
    static async createScreening(data) {
        const { movie, hall, startTime } = data;
        const parsedStartTime = new Date(startTime);

        // 1. Validate movie exists
        const movieDoc = await Movie.findById(movie);
        if (!movieDoc) {
            throw new AppError('Movie not found', 404);
        }

        // 1b. Validate movie status allows scheduling
        this._validateMovieSchedulingEligibility(movieDoc);

        // 2. Validate hall exists and is available
        const hallDoc = await Hall.findById(hall);
        if (!hallDoc) {
            throw new AppError('Hall not found', 404);
        }

        if (hallDoc.status !== 'active') {
            throw new AppError('Cannot create screening in a hall under maintenance', 400);
        }

        // 2b. Check if screening date falls within maintenance period
        await this._checkHallMaintenanceConflict(hallDoc, parsedStartTime);

        // 3. Validate start time is in the future
        if (isNaN(parsedStartTime.getTime())) {
            throw new AppError('Invalid screening start time', 400);
        }

        if (parsedStartTime <= new Date()) {
            throw new AppError('Start time must be in the future', 400);
        }

        // 4. Calculate end time
        const endTime = new Date(parsedStartTime.getTime() + movieDoc.durationMinutes * MINUTE_IN_MILLISECONDS);

        // 4b. Prevent accidental duplicates (same movie + hall + exact start time)
        const duplicateScreening = await Screening.findOne({
            movie,
            hall,
            startTime: parsedStartTime,
            status: { $ne: 'Cancelled' }
        });

        if (duplicateScreening) {
            throw new AppError('Duplicate screening detected: same movie, hall, and start time already exists', 400);
        }

        // 5. CRITICAL: Check for overlaps
        await this._checkForOverlap(hall, parsedStartTime, endTime);

        // 6. Create screening
        const screening = new Screening({
            movie,
            hall,
            startTime: parsedStartTime,
            endTime,
            status: 'Scheduled',
            seatOccupancy: this.buildInitialSeatOccupancy(hallDoc)
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
        const beforeBufferMs = BUFFER_BEFORE_MINUTES * MINUTE_IN_MILLISECONDS;
        const afterBufferMs = BUFFER_AFTER_MINUTES * MINUTE_IN_MILLISECONDS;
        const newStartWithBuffer = new Date(startTime.getTime() - beforeBufferMs);
        const newEndWithBuffer = new Date(endTime.getTime() + afterBufferMs);

        // Find candidate screenings in same hall that could overlap this new interval.
        const query = {
            hall: hallId,
            status: { $ne: 'Cancelled' },
            startTime: { $lt: newEndWithBuffer },
            endTime: { $gt: newStartWithBuffer }
        };

        // Exclude current screening if updating
        if (excludeScreeningId) {
            query._id = { $ne: excludeScreeningId };
        }

        const existingScreenings = await Screening.find(query)
            .populate('movie', 'title')
            .populate('hall', 'name');

        // Check for overlap with each existing screening
        for (const existing of existingScreenings) {
            const existingStart = existing.startTime;
            const existingStartWithBuffer = new Date(existing.startTime.getTime() - beforeBufferMs);
            const existingEndWithBuffer = new Date(existing.endTime.getTime() + afterBufferMs);

            // CRITICAL OVERLAP FORMULA
            // Overlap occurs if: (existingStart < newEnd) AND (existingEnd > newStart)
            const hasOverlap = (existingStartWithBuffer < newEndWithBuffer) && (existingEndWithBuffer > newStartWithBuffer);

            if (hasOverlap) {
                const hallName = existing.hall?.name || 'Unknown hall';
                const movieTitle = existing.movie?.title || 'Unknown movie';
                throw new AppError(
                    `Scheduling conflict: ${hallName} already has a screening for "${movieTitle}" ` +
                    `from ${existingStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ` +
                    `to ${existing.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}. ` +
                    `A cleaning buffer of ${BUFFER_BEFORE_MINUTES} minutes before and ${BUFFER_AFTER_MINUTES} minutes after each movie is enforced. Please select another time slot.`,
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
        const parsedStartTime = new Date(startTime);

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

        this._validateMovieSchedulingEligibility(movieDoc);

        // 3. Validate hall exists and is available
        const hallDoc = await Hall.findById(hall);
        if (!hallDoc) {
            throw new AppError('Hall not found', 404);
        }

        if (hallDoc.status !== 'active') {
            throw new AppError('Cannot schedule screening in a hall under maintenance', 400);
        }

        // 3b. Check if screening date falls within maintenance period
        await this._checkHallMaintenanceConflict(hallDoc, parsedStartTime);

        // 3. Validate start time is in the future
        if (isNaN(parsedStartTime.getTime())) {
            throw new AppError('Invalid screening start time', 400);
        }

        if (parsedStartTime <= new Date()) {
            throw new AppError('Start time must be in the future', 400);
        }

        // 4. Calculate end time
        const endTime = new Date(parsedStartTime.getTime() + movieDoc.durationMinutes * MINUTE_IN_MILLISECONDS);

        // 4b. Prevent accidental duplicates when updating
        const duplicateScreening = await Screening.findOne({
            _id: { $ne: screeningId },
            movie,
            hall,
            startTime: parsedStartTime,
            status: { $ne: 'Cancelled' }
        });

        if (duplicateScreening) {
            throw new AppError('Duplicate screening detected: same movie, hall, and start time already exists', 400);
        }

        // 5. CRITICAL: Check for overlaps (excluding current screening)
        await this._checkForOverlap(hall, parsedStartTime, endTime, screeningId);

        // 6. Update screening
        const hallChanged = String(screening.hall) !== String(hall);

        screening.movie = movie;
        screening.hall = hall;
        screening.startTime = parsedStartTime;
        screening.endTime = endTime;
        screening.status = 'Scheduled';

        if (hallChanged || !Array.isArray(screening.seatOccupancy) || screening.seatOccupancy.length === 0) {
            screening.seatOccupancy = this.buildInitialSeatOccupancy(hallDoc);
        }

        await screening.save();
        return screening;
    }

    static async cancelScreening(screeningId) {
        const screening = await Screening.findById(screeningId)
            .populate('movie', 'title')
            .populate('hall', 'name');

        if (!screening) {
            throw new AppError('Screening not found', 404);
        }

        if (screening.status === 'Cancelled') {
            throw new AppError('Screening is already cancelled', 400);
        }

        screening.status = 'Cancelled';
        await screening.save();
        return screening;
    }

    static async markCompletedScreenings() {
        await Screening.updateMany(
            {
                status: 'Scheduled',
                endTime: { $lt: new Date() }
            },
            {
                $set: { status: 'Completed' }
            }
        );
    }

    /**
     * Get upcoming screenings for dashboard
     */
    static async getUpcomingScreenings(limit = 10) {
        return await Screening.find({
            startTime: { $gt: new Date() },
            status: 'Scheduled'
        })
            .sort({ startTime: 1 })
            .limit(limit)
            .populate('movie', 'title durationMinutes genre')
            .populate('hall', 'name');
    }

    /**
     * Get screenings for a specific date
     */
    static async getScreeningsByDate(date) {
        return await Screening.findByDate(date);
    }

    static async getDailyScheduleOverview(date = new Date()) {
        const { dayStart, dayEnd } = this._getDayBounds(date);

        const screenings = await Screening.find({
            startTime: { $lt: dayEnd },
            endTime: { $gt: dayStart },
            status: { $ne: 'Cancelled' }
        })
            .populate('movie', 'title')
            .populate('hall', 'name')
            .sort({ startTime: 1 });

        const hallMap = new Map();
        screenings.forEach((screening) => {
            const hallName = screening.hall?.name || 'Unknown hall';
            if (!hallMap.has(hallName)) {
                hallMap.set(hallName, []);
            }
            hallMap.get(hallName).push(screening);
        });

        return Array.from(hallMap.entries())
            .map(([hallName, hallScreenings]) => ({ hallName, screenings: hallScreenings }))
            .sort((a, b) => a.hallName.localeCompare(b.hallName));
    }

    static async getTimelineScreeningsByDate(date = new Date()) {
        const { dayStart, dayEnd } = this._getDayBounds(date);

        return Screening.find({
            status: { $ne: 'Cancelled' },
            startTime: { $lt: dayEnd },
            endTime: { $gt: dayStart }
        })
            .populate('movie', 'title durationMinutes genre')
            .populate('hall', 'name status')
            .sort({ startTime: 1 });
    }

    /**
     * Check if screening date falls within hall maintenance period
     *
     * @param {Object} hallDoc - Hall document
     * @param {Date} screeningStartTime - Screening start time
     * @throws {AppError} If screening date conflicts with maintenance
     */
    static async _checkHallMaintenanceConflict(hallDoc, screeningStartTime) {
        // If hall has maintenance dates, check for conflicts
        if (hallDoc.maintenanceStartDate && hallDoc.maintenanceEndDate) {
            const maintenanceStart = new Date(hallDoc.maintenanceStartDate);
            const maintenanceEnd = new Date(hallDoc.maintenanceEndDate);

            // Screening is in conflict if it falls within maintenance period
            if (screeningStartTime >= maintenanceStart && screeningStartTime <= maintenanceEnd) {
                const formattedStart = maintenanceStart.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                const formattedEnd = maintenanceEnd.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                throw new AppError(
                    `Cannot schedule screening: ${hallDoc.name} is under maintenance from ${formattedStart} to ${formattedEnd}. Reason: ${hallDoc.maintenanceReason || 'Scheduled maintenance'}`,
                    400
                );
            }
        }
    }
}

module.exports = ScreeningService;
