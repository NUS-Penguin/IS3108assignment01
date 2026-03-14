const express = require('express');
const router = express.Router();
const hallController = require('../controllers/hallController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validateHall } = require('../middleware/validationMiddleware');

router.use(requireAuth);

router.get('/', hallController.index);
router.get('/new', hallController.renderForm);
router.post('/', validateHall, hallController.create);
router.get('/:id', hallController.show);
router.get('/:id/edit', hallController.renderForm);
router.put('/:id', validateHall, hallController.update);
router.delete('/:id', hallController.delete);

module.exports = router;
