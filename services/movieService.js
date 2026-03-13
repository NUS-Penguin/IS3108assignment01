/**
 * services/movieService.js - Movie Business Logic
 *
 * Handles all business operations for the movie catalogue:
 * searching/filtering, creation, update, and safe deletion
 * with future-screening validation.
 */

const Movie = require('../models/Movie');
const Screening = require('../models/Screening');
const { AppError } = require('../middleware/errorMiddleware');

const VALID_GENRES = [
    'Action', 'Drama', 'Comedy', 'Horror', 'Sci-Fi',
    'Romance', 'Thriller', 'Documentary', 'Animation', 'Fantasy'
];

const VALID_STATUSES = ['Now Showing', 'Coming Soon', 'Archived'];

class MovieService {

    /**
     * Retrieve all movies, optionally filtered.
     *
     * @param {Object} filters - { search, genre, status, releaseYear }
     * @returns {Promise<Array>} Movies with futureScreeningsCount attached
     */
    static async getAllMovies(filters = {}) {
        const movies = await Movie.search(filters);
        return MovieService._attachScreeningCounts(movies);
    }

    /**
     * Find a single movie by ID.
     *
     * @param {string} id - Mongoose ObjectId string
     * @returns {Promise<Movie>}
     * @throws {AppError} 404 if not found
     */
    static async getMovieById(id) {
        const movie = await Movie.findById(id);
        if (!movie) {
            throw new AppError('Movie not found', 404);
        }
        return movie;
    }

    /**
     * Create a new movie.
     *
     * @param {Object} data - Movie field values from request body
     * @returns {Promise<Movie>} Saved movie document
     */
    static async createMovie(data) {
        const { title, description, durationMinutes, genre, releaseDate, posterURL, status } = data;

        const movie = new Movie({
            title,
            description,
            durationMinutes: parseInt(durationMinutes, 10),
            genre,
            releaseDate: new Date(releaseDate),
            posterURL: posterURL || null,
            status: status || 'Now Showing'
        });

        await movie.save();
        return movie;
    }

    /**
     * Update an existing movie.
     *
     * @param {string} id - Movie ObjectId
     * @param {Object} data - Updated field values
     * @returns {Promise<Movie>} Updated movie document
     * @throws {AppError} 404 if not found
     */
    static async updateMovie(id, data) {
        const movie = await Movie.findById(id);
        if (!movie) {
            throw new AppError('Movie not found', 404);
        }

        const { title, description, durationMinutes, genre, releaseDate, posterURL, status } = data;

        movie.title = title;
        movie.description = description;
        movie.durationMinutes = parseInt(durationMinutes, 10);
        movie.genre = genre;
        movie.releaseDate = new Date(releaseDate);
        movie.posterURL = posterURL || null;
        if (status) {
            movie.status = status;
        }

        await movie.save();
        return movie;
    }

    /**
     * Safely delete a movie.
     * Rejects deletion if future screenings exist, providing an actionable
     * message that includes the exact count.
     *
     * @param {string} id - Movie ObjectId
     * @throws {AppError} 400 with count if future screenings exist
     * @throws {AppError} 404 if movie not found
     */
    static async deleteMovie(id) {
        const movie = await Movie.findById(id);
        if (!movie) {
            throw new AppError('Movie not found', 404);
        }

        const futureCount = await movie.getFutureScreeningsCount();
        if (futureCount > 0) {
            const plural = futureCount === 1 ? 'screening' : 'screenings';
            throw new AppError(
                `This movie has ${futureCount} future ${plural} scheduled. Please remove or reschedule them before deleting.`,
                400
            );
        }

        await movie.deleteOne();
    }

    /**
     * Returns the list of valid genre options.
     * @returns {string[]}
     */
    static getValidGenres() {
        return VALID_GENRES;
    }

    /**
     * Returns the list of valid status options.
     * @returns {string[]}
     */
    static getValidStatuses() {
        return VALID_STATUSES;
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Attach future screening counts to an array of movie documents.
     * Uses a single aggregation pipeline for efficiency.
     *
     * @param {Movie[]} movies
     * @returns {Promise<Object[]>} Plain objects with futureScreeningsCount
     */
    static async _attachScreeningCounts(movies) {
        if (movies.length === 0) return [];

        const movieIds = movies.map(m => m._id);
        const now = new Date();

        const counts = await Screening.aggregate([
            { $match: { movie: { $in: movieIds }, startTime: { $gt: now } } },
            { $group: { _id: '$movie', count: { $sum: 1 } } }
        ]);

        const countMap = {};
        counts.forEach(({ _id, count }) => {
            countMap[_id.toString()] = count;
        });

        return movies.map(movie => {
            const plain = movie.toObject({ virtuals: true });
            plain.futureScreeningsCount = countMap[movie._id.toString()] || 0;
            return plain;
        });
    }
}

module.exports = MovieService;
