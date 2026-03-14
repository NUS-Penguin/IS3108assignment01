const express = require('express');
const router = express.Router();
const screeningController = require('../controllers/screeningController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validateScreening } = require('../middleware/validationMiddleware');

router.use(requireAuth);
router.get('/', screeningController.index);
router.get('/timeline/data', screeningController.getTimelineData);
router.post('/timeline', screeningController.createFromTimeline);
router.patch('/timeline/:id/move', screeningController.moveTimelineScreening);
router.patch('/timeline/:id/cancel', screeningController.cancelTimelineScreening);
router.delete('/timeline/:id', screeningController.deleteTimelineScreening);
router.get('/new', screeningController.renderForm);
router.post('/', validateScreening, screeningController.create);
router.get('/:id/edit', screeningController.renderForm);
router.get('/:id', screeningController.show);
router.put('/:id', validateScreening, screeningController.update);
router.patch('/:id/cancel', screeningController.cancel);
router.delete('/:id', screeningController.delete);

module.exports = router;
