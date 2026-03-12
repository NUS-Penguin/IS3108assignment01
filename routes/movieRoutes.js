/**
 * routes/movieRoutes.js - Movie Routes
 * 
 * RESTful routes for movie management.
 */

const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { requireAuth } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(requireAuth);

// List all movies
router.get('/', movieController.index);

// Show create form
router.get('/new', movieController.renderForm);

// Create new movie
router.post('/', movieController.create);

// Show edit form
router.get('/:id/edit', movieController.renderForm);

// Update movie
router.put('/:id', movieController.update);

// Delete movie
router.delete('/:id', movieController.delete);

module.exports = router;
