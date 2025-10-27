const asyncHandler = require('express-async-handler');
const Payment = require('../models/Payment');
const Booking = require('../models/bookingModel');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Event = require('../models/Event');

// Initialize Razorpay with error handling
let razorpay;
let razorpayInitialized = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

const debugLog = (message, data = {}) => {
  console.log(`[Razorpay Debug] ${message}`, {
    timestamp: new Date().toISOString(),
    ...data
  });
};

const errorLog = (message, error = {}) => {
  console.error(`[Razorpay Error] ${message}`, {
    timestamp: new Date().toISOString(),
    ...(error.response?.data || {}),
    code: error.code,
    statusCode: error.statusCode,
    message: error.message,
    stack: error.stack
  });
};

const initializeRazorpay = async () => {
  try {
    if (razorpayInitialized && razorpay) {
      debugLog('Razorpay already initialized');
      return true;
    }

    if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
      errorLog('Max initialization attempts reached');
      return false;
    }

    initializationAttempts++;
    debugLog('Attempting Razorpay initialization', { attempt: initializationAttempts });

    // Validate environment variables
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      errorLog('Missing Razorpay credentials', {
        keyId: keyId ? 'present' : 'missing',
        keySecret: keySecret ? 'present' : 'missing'
      });
      return false;
    }

    debugLog('Creating Razorpay instance', {
      keyIdPrefix: keyId.substring(0, 8),
      environment: process.env.NODE_ENV
    });

    // Create Razorpay instance
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    // Test the connection
    debugLog('Testing Razorpay connection');
    await razorpay.orders.all({ count: 1 });

    debugLog('Razorpay initialization successful');
    razorpayInitialized = true;
    initializationAttempts = 0;
    return true;
  } catch (error) {
    errorLog('Razorpay initialization failed', error);
    razorpay = null;
    razorpayInitialized = false;

    if (error.statusCode === 401) {
      errorLog('Invalid Razorpay credentials - Please check your API keys');
      return false;
    }

    return false;
  }
};

// @desc    Create a new order
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  try {
    debugLog('Received create order request', {
      bookingId: req.body.bookingId,
      userId: req.user._id
    });

    // Initialize Razorpay
    const initialized = await initializeRazorpay();
    if (!initialized) {
      errorLog('Razorpay initialization failed');
      return res.status(503).json({
        success: false,
        message: 'Payment service is temporarily unavailable. Please try again later.',
        error: 'RAZORPAY_INIT_FAILED'
      });
    }

    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required',
        error: 'MISSING_BOOKING_ID'
      });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId).populate('event', 'name price');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        error: 'BOOKING_NOT_FOUND'
      });
    }

    // Validate booking
    if (booking.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid',
        error: 'BOOKING_ALREADY_PAID'
      });
    }

    if (!booking.total || booking.total <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking amount',
        error: 'INVALID_AMOUNT'
      });
    }

    debugLog('Creating Razorpay order', {
      bookingId,
      amount: booking.total,
      eventName: booking.event.name,
      eventPrice: booking.event.price
    });

    // Create Razorpay order
    const orderAmount = Math.round(booking.total * 100); // Convert to paise
    const order = await razorpay.orders.create({
      amount: orderAmount,
      currency: 'INR',
      receipt: bookingId,
      notes: {
        bookingId: bookingId,
        userId: req.user._id.toString(),
        eventName: booking.event.name
      }
    });

    debugLog('Razorpay order created', {
      orderId: order.id,
      amount: order.amount,
      status: order.status
    });

    // Create payment record
    const payment = await Payment.create({
      user: req.user._id,
      booking: bookingId,
      amount: booking.total,
      orderId: order.id,
      status: 'pending',
      currency: 'INR'
    });

    debugLog('Payment record created', {
      paymentId: payment._id,
      status: payment.status
    });

    return res.status(201).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      }
    });
  } catch (error) {
    errorLog('Order creation failed', error);

    // Handle specific Razorpay errors
    if (error.statusCode === 401) {
      return res.status(503).json({
        success: false,
        message: 'Payment service authentication failed',
        error: 'AUTH_FAILED'
      });
    }

    if (error.code === 'BAD_REQUEST_ERROR') {
      return res.status(400).json({
        success: false,
        message: error.description || 'Invalid request parameters',
        error: 'BAD_REQUEST'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to process payment request. Please try again later.',
      error: 'INTERNAL_ERROR'
    });
  }
});

// @desc    Verify payment
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = asyncHandler(async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      bookingId
    } = req.body;

    // Verify the payment signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed"
      });
    }

    // Update payment record
    const payment = await Payment.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: 'completed'
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    // Update booking status and generate invitation code
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentId: razorpay_payment_id
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Generate invitation code if not exists
    if (!booking.invitationCode) {
      await booking.generateInvitationCode();
      await booking.save();
    }
    
    // Update event tickets sold
    const event = await Event.findById(booking.event);
    if (event) {
      event.ticketsSold = (event.ticketsSold || 0) + booking.tickets;
      if (event.ticketsSold >= event.capacity) {
        event.status = 'sold_out';
      }
      await event.save();
    }

    res.json({
      success: true,
      data: {
        payment,
        booking: {
          ...booking.toObject(),
          invitationCode: booking.invitationCode
        }
      },
      message: "Payment verified successfully"
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: "Payment verification failed"
    });
  }
});

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
const getPaymentHistory = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id })
    .populate('booking')
    .sort('-createdAt');

  res.status(200).json(payments);
});

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentHistory
}; 