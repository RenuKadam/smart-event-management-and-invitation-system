const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { protect, restrictTo } = require('../middleware/auth');

// Generate QR code after payment
router.get('/generate/:bookingId', protect, ticketController.generateQRCode);

// Validate ticket (public route that can be accessed by any QR scanner)
router.get('/validate/:ticketId', ticketController.validateTicket);

// Verify OTP and mark attendance (organizer only)
router.post('/verify-otp', protect, restrictTo('organizer'), ticketController.verifyOTP);

// Get ticket status
router.get('/status/:ticketId', protect, ticketController.getTicketStatus);

module.exports = router; 