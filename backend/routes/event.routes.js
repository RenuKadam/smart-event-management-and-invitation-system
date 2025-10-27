const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  publishEvent,
  unpublishEvent
} = require('../controllers/eventController');

// Public routes
router.get('/', getEvents);
router.get('/:id', getEvent);

// Protected routes
router.use(protect);
router.post('/', createEvent);
router.get('/my-events', getMyEvents);
router.route('/:id')
  .put(updateEvent)
  .delete(deleteEvent);

// Event status routes
router.put('/:id/publish', publishEvent);
router.put('/:id/unpublish', unpublishEvent);

module.exports = router; 