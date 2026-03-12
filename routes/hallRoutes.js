/**
 * routes/hallRoutes.js - Cinema Hall Routes
 * 
 * RESTful routes for hall management.
 */

const express = require('express');
const router = express.Router();
const hallController = require('../controllers/hallController');
const { requireAuth } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(requireAuth);

// List all halls
router.get('/', hallController.index);

// Show create form
router.get('/new', hallController.renderCreate);

// Create new hall
router.post('/', hallController.create);

// Show edit form
router.get('/:id/edit', hallController.renderEdit);

// Update hall
router.put('/:id', hallController.update);

// Delete hall
router.delete('/:id', hallController.delete);

module.exports = router;
