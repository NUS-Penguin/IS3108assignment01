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
router.get('/new', screeningController.renderCreate);

// Create new screening
router.post('/', screeningController.create);

// Delete screening
router.delete('/:id', screeningController.delete);

module.exports = router;
