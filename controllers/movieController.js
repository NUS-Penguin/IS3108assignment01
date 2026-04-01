const MovieService = require('../services/movieService');
const { AppError } = require('../middleware/errorMiddleware');

const getMovieFormData = async (id = null) => ({
    movie: id ? await MovieService.getMovieById(id).catch(() => null) : null,
    genres: MovieService.getValidGenres(),
    statuses: MovieService.getValidStatuses()
});

const renderMovieForm = async (res, session, { title, error, id = null }) => {
    const formData = await getMovieFormData(id);
    return res.render('movies/form', {
        title,
        username: session.username,
        ...formData,
        error
    });
};

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

exports.renderForm = async (req, res, next) => {
    try {
        const isEditMode = !!req.params.id;

        if (isEditMode) {
            return renderMovieForm(res, req.session, {
                title: 'Edit Movie',
                id: req.params.id,
                error: null
            });
        }

        return renderMovieForm(res, req.session, {
            title: 'Add New Movie',
            error: null
        });
    } catch (error) {
        next(error);
    }
};

exports.create = async (req, res, next) => {
    try {
        if (req.uploadError) {
            return renderMovieForm(res, req.session, {
                title: 'Add New Movie',
                error: req.uploadError
            });
        }

        await MovieService.createMovie(req.body, req.file || null);

        req.session.flash = { type: 'success', message: 'Movie added successfully' };
        res.redirect('/admin/movies');
    } catch (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return renderMovieForm(res, req.session, {
                title: 'Add New Movie',
                error: 'Poster file is too large. Maximum size is 5MB.'
            });
        }

        if (error instanceof AppError) {
            return renderMovieForm(res, req.session, {
                title: 'Add New Movie',
                error: error.message
            });
        }

        if (error.code === 11000) {
            return res.render('movies/form', {
                title: 'Add New Movie',
                username: req.session.username,
                movie: null,
                genres: MovieService.getValidGenres(),
                statuses: MovieService.getValidStatuses(),
                error: 'A movie with this title already exists. Please use a different title.'
            });
        }

        if (error.name === 'ValidationError') {
            return renderMovieForm(res, req.session, {
                title: 'Add New Movie',
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        if (req.uploadError) {
            return renderMovieForm(res, req.session, {
                title: 'Edit Movie',
                id: req.params.id,
                error: req.uploadError
            });
        }

        await MovieService.updateMovie(req.params.id, req.body, req.file || null);

        req.session.flash = { type: 'success', message: 'Movie updated successfully' };
        res.redirect('/admin/movies');
    } catch (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return renderMovieForm(res, req.session, {
                title: 'Edit Movie',
                id: req.params.id,
                error: 'Poster file is too large. Maximum size is 5MB.'
            });
        }

        if (error.code === 11000) {
            const movie = await MovieService.getMovieById(req.params.id).catch(() => null);
            return res.render('movies/form', {
                title: 'Edit Movie',
                username: req.session.username,
                movie,
                genres: MovieService.getValidGenres(),
                statuses: MovieService.getValidStatuses(),
                error: 'A movie with this title already exists. Please use a different title.'
            });
        }

        if (error instanceof AppError) {
            return renderMovieForm(res, req.session, {
                title: 'Edit Movie',
                id: req.params.id,
                error: error.message
            });
        }

        if (error.name === 'ValidationError') {
            return renderMovieForm(res, req.session, {
                title: 'Edit Movie',
                id: req.params.id,
                error: Object.values(error.errors).map(e => e.message).join(', ')
            });
        }
        next(error);
    }
};

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
