/**
 * controllers/movieController.js - Movie Controller
 *
 * Thin layer: validates requests, delegates to MovieService,
 * and renders the appropriate EJS view.
 */

const MovieService = require('../services/movieService');
const { AppError } = require('../middleware/errorMiddleware');

/**
 * GET /admin/movies
 * List all movies, with optional search/filter query params:
 *   ?search=&genre=&status=&releaseYear=
 */
exports.index = async (req, res, next) => {
    try {
        const { search = '', genre = '', status = '', releaseYear = '' } = req.query;

        const movies = await MovieService.getAllMovies({ search, genre, status, releaseYear });

        res.render('movies/index', {
            title: 'Movies',
            username: req.session.username,
            movies,
            genres: MovieService.getValidGenres(),
            statuses: MovieService.getValidStatuses(),
            filters: { search, genre, status, releaseYear }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /admin/movies/new     - Render create form
 * GET /admin/movies/:id/edit - Render edit form
 */
exports.renderForm = async (req, res, next) => {
    try {
        const isEditMode = !!req.params.id;
        const genres = MovieService.getValidGenres();
        const statuses = MovieService.getValidStatuses();

        if (isEditMode) {
            const movie = await MovieService.getMovieById(req.params.id);
            return res.render('movies/form', {
                title: 'Edit Movie',
                username: req.session.username,
                movie,
                genres,
                statuses,
                error: null
            });
        }

        res.render('movies/form', {
            title: 'Add New Movie',
            username: req.session.username,
            movie: null,
            genres,
            statuses,
            error: null
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /admin/movies - Create new movie
 */
exports.create = async (req, res, next) => {
    try {
        await MovieService.createMovie(req.body);

        req.session.flash = { type: 'success', message: 'Movie added successfully' };
        res.redirect('/admin/movies');
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.render('movies/form', {
                title: 'Add New Movie',
                username: req.session.username,
                movie: null,
                genres: MovieService.getValidGenres(),
                statuses: MovieService.getValidStatuses(),
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        next(error);
    }
};

/**
 * PUT /admin/movies/:id - Update movie
 */
exports.update = async (req, res, next) => {
    try {
        await MovieService.updateMovie(req.params.id, req.body);

        req.session.flash = { type: 'success', message: 'Movie updated successfully' };
        res.redirect('/admin/movies');
    } catch (error) {
        if (error.name === 'ValidationError') {
            const movie = await MovieService.getMovieById(req.params.id).catch(() => null);
            return res.render('movies/form', {
                title: 'Edit Movie',
                username: req.session.username,
                movie,
                genres: MovieService.getValidGenres(),
                statuses: MovieService.getValidStatuses(),
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        next(error);
    }
};

/**
 * DELETE /admin/movies/:id - Delete movie
 * Rejected with an informative count if future screenings exist.
 */
exports.delete = async (req, res, next) => {
    try {
        await MovieService.deleteMovie(req.params.id);

        req.session.flash = { type: 'success', message: 'Movie deleted successfully' };
        res.redirect('/admin/movies');
    } catch (error) {
        if (error.statusCode === 400 || error.statusCode === 404) {
            req.session.flash = { type: 'danger', message: error.message };
            return res.redirect('/admin/movies');
        }
        next(error);
    }
};
