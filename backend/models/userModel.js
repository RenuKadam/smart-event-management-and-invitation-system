const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please add a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['organizer', 'participant'],
      message: 'Role must be either: organizer, participant'
    },
    default: 'participant'
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please add your phone number'],
    validate: {
      validator: function(v) {
        // Basic phone number validation
        return /^\+?[\d\s-]+$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  aadhaarCard: {
    number: {
      type: String,
      required: [true, 'Please add your Aadhaar card number'],
      unique: true,
      validate: {
        validator: function(v) {
          // Aadhaar card validation (12 digits)
          return /^\d{12}$/.test(v);
        },
        message: props => 'Please enter a valid 12-digit Aadhaar card number'
      }
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  address: {
    street: {
      type: String,
      required: [true, 'Please add your street address']
    },
    city: {
      type: String,
      required: [true, 'Please add your city']
    },
    state: {
      type: String,
      required: [true, 'Please add your state']
    },
    pincode: {
      type: String,
      required: [true, 'Please add your pincode'],
      validate: {
        validator: function(v) {
          // Indian pincode validation (6 digits)
          return /^\d{6}$/.test(v);
        },
        message: props => 'Please enter a valid 6-digit pincode'
      }
    }
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual field for full profile URL
userSchema.virtual('profileUrl').get(function() {
  return `/api/users/${this._id}`;
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      role: this.role 
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '30d'
    }
  );
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  return this.save();
};

// Alias for matchPassword for backward compatibility
userSchema.methods.correctPassword = userSchema.methods.matchPassword;

// Create indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Check if the model exists before defining it
module.exports = mongoose.models.User || mongoose.model('User', userSchema); 