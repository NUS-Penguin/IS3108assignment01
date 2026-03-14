/**
 * routes/screeningRoutes.js - Screening Routes
 * 
 * RESTful routes for screening management.
 */

const express = require('express');
const router = express.Router();
const screeningController = require('../controllers/screeningController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validateScreening } = require('../middleware/validationMiddleware');

// Apply authentication to all routes
router.use(requireAuth);

// List all screenings
router.get('/', screeningController.index);

// Timeline scheduler APIs
router.get('/timeline/data', screeningController.getTimelineData);
router.post('/timeline', screeningController.createFromTimeline);
router.patch('/timeline/:id/move', screeningController.moveTimelineScreening);
router.patch('/timeline/:id/cancel', screeningController.cancelTimelineScreening);
router.delete('/timeline/:id', screeningController.deleteTimelineScreening);

// Show create form
router.get('/new', screeningController.renderForm);

// Create new screening
router.post('/', validateScreening, screeningController.create);

// Show edit form
router.get('/:id/edit', screeningController.renderForm);

// Show single screening details
router.get('/:id', screeningController.show);

// Update screening
router.put('/:id', validateScreening, screeningController.update);

// Cancel screening
router.patch('/:id/cancel', screeningController.cancel);

// Delete screening
router.delete('/:id', screeningController.delete);

module.exports = router;
