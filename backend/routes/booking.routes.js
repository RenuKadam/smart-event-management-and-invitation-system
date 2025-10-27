const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createBooking,
  updateBookingStatus,
  getMyBookings,
  getEventBookings,
  verifyInvitationCode,
  getBooking,
  sendInvitationCode
} = require('../controllers/bookingController');

// Routes
router.post('/', protect, createBooking);
router.get('/my-bookings', protect, getMyBookings);
router.get('/event/:eventId/bookings', protect, getEventBookings);
router.put('/:bookingId/status', protect, updateBookingStatus);
router.post('/verify-code', protect, verifyInvitationCode);
router.get('/:id', protect, getBooking);
router.post('/:id/send-invitation', protect, sendInvitationCode);

module.exports = router; 