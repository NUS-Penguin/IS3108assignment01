const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validateMovie } = require('../middleware/validationMiddleware');
const { handlePosterUpload } = require('../middleware/uploadMiddleware');

router.use(requireAuth);
router.get('/', movieController.index);
router.get('/new', movieController.renderForm);
router.post('/', handlePosterUpload, validateMovie, movieController.create);
router.get('/:id/edit', movieController.renderForm);
router.put('/:id', handlePosterUpload, validateMovie, movieController.update);
router.delete('/:id', movieController.delete);

module.exports = router;
