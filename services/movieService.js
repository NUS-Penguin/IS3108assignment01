const Movie = require('../models/Movie');
const Screening = require('../models/Screening');
const { AppError } = require('../middleware/errorMiddleware');

const VALID_GENRES = [
    'Action', 'Drama', 'Comedy', 'Horror', 'Sci-Fi',
    'Romance', 'Thriller', 'Documentary', 'Animation', 'Fantasy'
];

const VALID_STATUSES = ['Now Showing', 'Coming Soon', 'Archived'];

class MovieService {
    static async getAllMovies(filters = {}) {
        const movies = await Movie.search(filters);
        return MovieService._attachScreeningCounts(movies);
    }

    static async getMovieById(id) {
        const movie = await Movie.findById(id);
        if (!movie) {
            throw new AppError('Movie not found', 404);
        }
        return movie;
    }

    static async createMovie(data, posterFile = null) {
        const { title, description, durationMinutes, genre, releaseDate, status } = data;
        const posterPath = posterFile ? `/uploads/posters/${posterFile.filename}` : '';

        const movie = new Movie({
            title,
            description,
            durationMinutes: parseInt(durationMinutes, 10),
            genre,
            releaseDate: new Date(releaseDate),
            posterPath,
            status: status || 'Now Showing'
        });

        await movie.save();
        return movie;
    }

    static async updateMovie(id, data, posterFile = null) {
        const movie = await Movie.findById(id);
        if (!movie) {
            throw new AppError('Movie not found', 404);
        }

        const { title, description, durationMinutes, genre, releaseDate, status } = data;

        movie.title = title;
        movie.description = description;
        movie.durationMinutes = parseInt(durationMinutes, 10);
        movie.genre = genre;
        movie.releaseDate = new Date(releaseDate);
        if (posterFile) {
            movie.posterPath = `/uploads/posters/${posterFile.filename}`;
            movie.posterURL = null;
        }
        if (status) {
            movie.status = status;
        }

        await movie.save();
        return movie;
    }

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

    static getValidGenres() {
        return VALID_GENRES;
    }

    static getValidStatuses() {
        return VALID_STATUSES;
    }

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
