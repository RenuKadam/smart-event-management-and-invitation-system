const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createOrder,
  verifyPayment,
  getPaymentHistory
} = require('../controllers/paymentController');

// Test endpoint for Razorpay connection
router.get('/test-connection', async (req, res) => {
  const Razorpay = require('razorpay');
  try {
    console.log('Testing Razorpay connection with:', {
      keyId: process.env.RAZORPAY_KEY_ID ? 'Present' : 'Missing',
      keySecret: process.env.RAZORPAY_KEY_SECRET ? 'Present' : 'Missing'
    });

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET 
    });

    const response = await razorpay.orders.all({ count: 1 });
    console.log('Razorpay test successful:', {
      status: 'success',
      ordersCount: response.length
    });

    res.json({
      success: true,
      message: 'Razorpay connection successful',
      credentials: {
        keyId: process.env.RAZORPAY_KEY_ID.substring(0, 8) + '...',
        environment: process.env.NODE_ENV
      }
    });
  } catch (error) {
    console.error('Razorpay test failed:', {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode
    });

    res.status(500).json({
      success: false,
      message: 'Razorpay connection failed',
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      }
    });
  }
});

// Apply authentication middleware to all routes
router.use(protect);

// Handle preflight requests
router.options('*', (req, res) => {
  res.sendStatus(200);
});

// Payment routes
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/history', getPaymentHistory);

module.exports = router; 