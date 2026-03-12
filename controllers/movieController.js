/**
 * controllers/movieController.js - Movie Controller
 * 
 * Handles HTTP requests for movie management.
 */

const Movie = require('../models/Movie');
const { AppError } = require('../middleware/errorMiddleware');

/**
 * GET /admin/movies - List all movies
 */
exports.index = async (req, res, next) => {
    try {
        const movies = await Movie.find().sort({ createdAt: -1 });

        res.render('movies/index', {
            title: 'Movies',
            username: req.session.username,
            movies
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /admin/movies/new - Render create movie form
 */
exports.renderCreate = (req, res) => {
    res.render('movies/create', {
        title: 'Add New Movie',
        username: req.session.username,
        genres: ['Action', 'Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary', 'Animation', 'Fantasy'],
        error: null
    });
};

/**
 * POST /admin/movies - Create new movie
 */
exports.create = async (req, res, next) => {
    try {
        const { title, description, durationMinutes, genre, releaseDate, posterURL } = req.body;

        const movie = new Movie({
            title,
            description,
            durationMinutes: parseInt(durationMinutes),
            genre,
            releaseDate: new Date(releaseDate),
            posterURL: posterURL || null
        });

        await movie.save();

        req.session.flash = {
            type: 'success',
            message: 'Movie added successfully'
        };

        res.redirect('/admin/movies');

    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.render('movies/create', {
                title: 'Add New Movie',
                username: req.session.username,
                genres: ['Action', 'Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary', 'Animation', 'Fantasy'],
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        next(error);
    }
};

/**
 * GET /admin/movies/:id/edit - Render edit movie form
 */
exports.renderEdit = async (req, res, next) => {
    try {
        const movie = await Movie.findById(req.params.id);

        if (!movie) {
            throw new AppError('Movie not found', 404);
        }

        res.render('movies/edit', {
            title: 'Edit Movie',
            username: req.session.username,
            movie,
            genres: ['Action', 'Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary', 'Animation', 'Fantasy'],
            error: null
        });

    } catch (error) {
        next(error);
    }
};

/**
 * PUT /admin/movies/:id - Update movie
 */
exports.update = async (req, res, next) => {
    try {
        const { title, description, durationMinutes, genre, releaseDate, posterURL } = req.body;

        const movie = await Movie.findById(req.params.id);

        if (!movie) {
            throw new AppError('Movie not found', 404);
        }

        movie.title = title;
        movie.description = description;
        movie.durationMinutes = parseInt(durationMinutes);
        movie.genre = genre;
        movie.releaseDate = new Date(releaseDate);
        movie.posterURL = posterURL || null;

        await movie.save();

        req.session.flash = {
            type: 'success',
            message: 'Movie updated successfully'
        };

        res.redirect('/admin/movies');

    } catch (error) {
        if (error.name === 'ValidationError') {
            const movie = await Movie.findById(req.params.id);
            return res.render('movies/edit', {
                title: 'Edit Movie',
                username: req.session.username,
                movie,
                genres: ['Action', 'Drama', 'Comedy', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary', 'Animation', 'Fantasy'],
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        next(error);
    }
};

/**
 * DELETE /admin/movies/:id - Delete movie
 */
exports.delete = async (req, res, next) => {
    try {
        const movie = await Movie.findById(req.params.id);

        if (!movie) {
            throw new AppError('Movie not found', 404);
        }

        // Check for future screenings
        const hasFuture = await movie.hasFutureScreenings();

        if (hasFuture) {
            req.session.flash = {
                type: 'danger',
                message: 'Cannot delete movie with future screenings scheduled'
            };
            return res.redirect('/admin/movies');
        }

        await movie.deleteOne();

        req.session.flash = {
            type: 'success',
            message: 'Movie deleted successfully'
        };

        res.redirect('/admin/movies');

    } catch (error) {
        next(error);
    }
};
