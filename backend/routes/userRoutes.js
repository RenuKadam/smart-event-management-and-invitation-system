const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const User = require('../models/userModel');

// Public routes
router.post('/signup', async (req, res) => {
  try {
    // Log the received data
    console.log('Received signup data:', req.body);
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'password', 'phoneNumber', 'role'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate nested objects
    if (!req.body.aadhaarCard?.number) {
      return res.status(400).json({
        status: 'fail',
        message: 'Aadhaar card number is required'
      });
    }

    if (!req.body.address?.street || !req.body.address?.city || 
        !req.body.address?.state || !req.body.address?.pincode) {
      return res.status(400).json({
        status: 'fail',
        message: 'All address fields are required'
      });
    }

    // Continue with user creation
    const user = await User.create(req.body);
    
    // Generate token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      status: 'success',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Server signup error:', error);
    
    // Handle duplicate key errors (like email)
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'fail',
        message: messages.join(', ')
      });
    }

    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});
router.post('/login', userController.login);

// Protected routes
router.get('/me', protect, userController.getMe);

// Update user profile
router.patch('/profile', protect, async (req, res) => {
  try {
    // Fields that are not allowed to be updated
    const restrictedFields = ['email', 'password', 'role'];
    
    // Remove restricted fields from the update
    const updateData = Object.keys(req.body).reduce((obj, key) => {
      if (!restrictedFields.includes(key)) {
        obj[key] = req.body[key];
      }
      return obj;
    }, {});

    // Validate Aadhaar number if provided
    if (updateData.aadhaarCard?.number) {
      if (!/^\d{12}$/.test(updateData.aadhaarCard.number)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Please provide a valid 12-digit Aadhaar number'
        });
      }
    }

    // Validate pincode if provided
    if (updateData.address?.pincode) {
      if (!/^\d{6}$/.test(updateData.address.pincode)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Please provide a valid 6-digit pincode'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

// Delete user profile
router.delete('/profile', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    res.status(204).json({
      status: 'success',
      data: null
    });
  }
  catch (error) {
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
});

module.exports = router; 