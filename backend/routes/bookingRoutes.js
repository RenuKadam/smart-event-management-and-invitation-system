const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  getMyBookings,
  verifyTicket
} = require('../controllers/bookingController');

// Protect all routes after this middleware
router.use(protect);

router.post('/verify-ticket', restrictTo('organizer'), verifyTicket);
router.get('/my-bookings', getMyBookings);
router.post('/', createBooking);
router.get('/', getBookings);
router.get('/:id', getBooking);
router.patch('/:id', updateBooking);
router.delete('/:id', deleteBooking);

module.exports = router; 