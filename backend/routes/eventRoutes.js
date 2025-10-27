const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { protect, restrictTo } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Public routes
router.get('/', eventController.getAllEvents);

// Protected routes
router.use(protect);

// Organizer routes - specific routes first
router.get('/my-events', restrictTo('organizer'), eventController.getMyEvents);
router.post('/', 
    restrictTo('organizer'),
    upload.single('image'),
    eventController.createEvent
);

// Publish route
router.patch('/:id/publish', restrictTo('organizer'), eventController.publishEvent);

// Generic routes last
router.get('/:id', eventController.getEvent);
router.patch('/:id', restrictTo('organizer'), eventController.updateEvent);
router.delete('/:id', restrictTo('organizer'), eventController.deleteEvent);

module.exports = router; 