/**
 * routes/screeningRoutes.js - Screening Routes
 * 
 * RESTful routes for screening management.
 */

const express = require('express');
const router = express.Router();
const screeningController = require('../controllers/screeningController');
const { requireAuth } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(requireAuth);

// List all screenings
router.get('/', screeningController.index);

// Show create form
router.get('/new', screeningController.renderForm);

// Create new screening
router.post('/', screeningController.create);

// Show edit form
router.get('/:id/edit', screeningController.renderForm);

// Update screening
router.put('/:id', screeningController.update);

// Delete screening
router.delete('/:id', screeningController.delete);

module.exports = router;
