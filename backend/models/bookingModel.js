const mongoose = require('mongoose');
const crypto = require('crypto');
const qr = require('qrcode');

const bookingSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event ID is required']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  tickets: {
    type: Number,
    required: [true, 'Number of tickets is required'],
    min: [1, 'At least one ticket is required'],
    validate: {
      validator: Number.isInteger,
      message: 'Tickets must be a whole number'
    }
  },
  totalAttendees: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative'],
    validate: {
      validator: function(v) {
        return !isNaN(v) && isFinite(v);
      },
      message: 'Total must be a valid number'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  qrCode: {
    data: String,
    scanned: {
      type: Boolean,
      default: false
    },
    scannedAt: Date,
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  ticketId: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  invitationCode: {
    type: String,
    unique: true,
    sparse: true
  },
  confirmationMessage: {
    type: String,
    default: ''
  },
  paymentId: {
    type: String
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  entryTime: {
    type: Date
  },
  otp: {
    code: {
      type: String,
      default: null
    },
    generatedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  attendance: {
    status: {
      type: String,
      enum: ['pending', 'present', 'absent'],
      default: 'pending'
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  verificationStatus: {
    type: String,
    enum: ['Verified', 'Not Verified'],
    default: 'Verified'
  },
  verifiedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create index for faster queries
bookingSchema.index({ event: 1, user: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ invitationCode: 1 });

// Generate unique invitation code
bookingSchema.methods.generateInvitationCode = async function() {
  const eventId = this.event.toString().slice(-4);
  const userId = this.user.toString().slice(-4);
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  this.invitationCode = `${eventId}-${userId}-${random}`;
  return this.invitationCode;
};

// Generate QR code data
bookingSchema.methods.generateQRCode = async function() {
  // Generate unique ticket ID if not exists
  if (!this.ticketId) {
    const eventId = this.event.toString().slice(-4);
    const userId = this.user.toString().slice(-4);
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.ticketId = `TKT-${eventId}-${userId}-${random}`;
  }

  // Create QR code data object
  const qrData = {
    ticketId: this.ticketId,
    eventId: this.event,
    userId: this.user,
    tickets: this.tickets
  };

  // Generate QR code
  try {
    const qrCodeData = await qr.toDataURL(JSON.stringify(qrData));
    this.qrCode.data = qrCodeData;
    await this.save();
    return qrCodeData;
  } catch (error) {
    throw new Error('Error generating QR code');
  }
};

// Pre-save middleware to validate data
bookingSchema.pre('save', function(next) {
  // Ensure tickets is a positive integer
  if (this.tickets && (!Number.isInteger(this.tickets) || this.tickets < 1)) {
    next(new Error('Tickets must be a positive integer'));
    return;
  }
  
  // Ensure total is a non-negative number
  if (this.total && (isNaN(this.total) || this.total < 0)) {
    next(new Error('Total must be a non-negative number'));
    return;
  }
  
  // Generate ticketId if not provided
  if (!this.ticketId) {
    const eventId = this.event.toString().slice(-4);
    const userId = this.user.toString().slice(-4);
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    this.ticketId = `TKT-${eventId}-${userId}-${random}`;
  }
  
  next();
});

// Generate OTP
bookingSchema.methods.generateOTP = async function() {
  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  this.otp = {
    code: otp,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes expiry
    verified: false
  };
  
  await this.save();
  return otp;
};

// Verify OTP
bookingSchema.methods.verifyOTP = function(inputOTP) {
  if (!this.otp?.code) return false;
  if (this.otp.verified) return false;
  if (Date.now() > this.otp.expiresAt) return false;
  return this.otp.code === inputOTP;
};

// Add method to verify attendance
bookingSchema.methods.verifyAttendance = async function(organizerId) {
  try {
    // Ensure the booking has all required information
    if (!this.populated('event') || !this.populated('user')) {
      await this.populate([
        {
          path: 'event',
          select: 'title organizer category date'
        },
        {
          path: 'user',
          select: 'name email'
        }
      ]);
    }

    // Verify OTP hasn't expired
    if (this.otp.expiresAt < new Date()) {
      throw new Error('OTP has expired');
    }

    // Verify OTP hasn't been used
    if (this.otp.verified) {
      throw new Error('OTP has already been used');
    }

    // Verify attendance hasn't been marked
    if (this.attendance.status === 'present') {
      throw new Error('Attendance has already been marked');
    }

    // Update attendance status
    this.attendance = {
      status: 'present',
      verifiedAt: new Date(),
      verifiedBy: organizerId
    };
    this.otp.verified = true;

    // Save and return populated booking
    const savedBooking = await this.save();
    
    // Re-populate to ensure we have all needed fields
    await savedBooking.populate([
      {
        path: 'event',
        select: 'title organizer category date'
      },
      {
        path: 'user',
        select: 'name email'
      }
    ]);

    return savedBooking;
  } catch (error) {
    console.error('Error in verifyAttendance:', error);
    throw error;
  }
};

// Add pre-save middleware to handle attendance updates
bookingSchema.pre('save', async function(next) {
  try {
    // If attendance status is being changed to 'present'
    if (this.isModified('attendance.status') && this.attendance.status === 'present') {
      console.log('Attendance status changed to present for booking:', {
        bookingId: this._id,
        ticketId: this.ticketId,
        eventId: this.event,
        tickets: this.tickets,
        attendanceStatus: this.attendance.status
      });
      
      // Ensure attendance verification details are set
      if (!this.attendance.verifiedAt) {
        this.attendance.verifiedAt = new Date();
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Booking', bookingSchema); 