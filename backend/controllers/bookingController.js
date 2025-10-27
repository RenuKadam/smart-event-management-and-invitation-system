const asyncHandler = require('express-async-handler');
const Booking = require('../models/bookingModel');
const Event = require('../models/Event');
const User = require('../models/userModel');
const crypto = require('crypto');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = asyncHandler(async (req, res) => {
  try {
    console.log('Booking request received:', {
      body: req.body,
      user: req.user ? req.user._id : 'No user',
      headers: req.headers
    });
    
    // Validate request body
    const { eventId, event, tickets, total } = req.body;
    
    // Use either eventId or event field
    const eventIdToUse = eventId || event;
    
    if (!eventIdToUse) {
      console.log('Error: Event ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    if (!tickets || isNaN(tickets) || tickets < 1) {
      console.log('Error: Invalid ticket count');
      return res.status(400).json({
        success: false,
        message: 'Valid ticket count is required'
      });
    }

    console.log('Looking for event with ID:', eventIdToUse);
    const eventObj = await Event.findById(eventIdToUse);
    if (!eventObj) {
      console.log('Error: Event not found with ID:', eventIdToUse);
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    console.log('Event found:', { 
      id: eventObj._id, 
      title: eventObj.title,
      capacity: eventObj.capacity,
      ticketsSold: eventObj.ticketsSold || 0,
      price: eventObj.price
    });

    // Check if enough tickets are available
    const availableTickets = eventObj.capacity - (eventObj.ticketsSold || 0);
    console.log('Available tickets:', availableTickets, 'Requested tickets:', tickets);
    
    if (tickets > availableTickets) {
      console.log('Error: Not enough tickets available');
      return res.status(400).json({
        success: false,
        message: `Only ${availableTickets} tickets available`
      });
    }

    // Calculate total if not provided
    const calculatedTotal = total || (eventObj.price ? eventObj.price * tickets : 0);
    console.log('Calculated total:', calculatedTotal);

    // Generate a unique ticket ID
    const eventIdShort = eventIdToUse.toString().slice(-4);
    const userIdShort = req.user._id.toString().slice(-4);
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    const ticketId = `TKT-${eventIdShort}-${userIdShort}-${random}`;
    console.log('Generated ticket ID:', ticketId);

    console.log('Creating booking with data:', {
      event: eventIdToUse,
      user: req.user._id,
      tickets,
      total: calculatedTotal,
      ticketId
    });
    
    // Create the booking with verification status
    const booking = await Booking.create({
      event: eventIdToUse,
      user: req.user._id,
      tickets,
      total: calculatedTotal,
      ticketId,
      status: 'pending',
      confirmationMessage: '',
      verificationStatus: 'Verified', // Automatically verified for logged-in users
      verifiedAt: new Date() // Add verification timestamp
    });
    
    console.log('Booking created successfully:', booking._id);
    
    return res.status(201).json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    console.error('Error in createBooking:', error);
    console.error('Error stack:', error.stack);
    
    // Check for specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate key error',
        field: Object.keys(error.keyPattern)[0]
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error while creating booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Get bookings for a specific event
// @route   GET /api/bookings/event/:eventId/bookings
// @access  Private
const getEventBookings = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Check if user is the event organizer
  if (event.organizer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view these bookings');
  }

  const bookings = await Booking.find({ event: req.params.eventId })
    .populate('user', 'name email phoneNumber')
    .populate({
      path: 'event',
      select: 'title date price organizer',
      populate: {
        path: 'organizer',
        select: 'name email'
      }
    })
    .sort('-createdAt')
    .lean() // Use lean for better performance
    .then(bookings => bookings.map(booking => ({
      ...booking,
      verificationStatus: 'Verified', // All bookings are verified since users must be logged in
      verifiedAt: booking.createdAt // Use booking creation time as verification time
    })));

  res.json({
    success: true,
    data: { bookings }
  });
});

// @desc    Update booking status
// @route   PUT /api/bookings/:bookingId/status
// @access  Private
const updateBookingStatus = asyncHandler(async (req, res) => {
  const { status, message } = req.body;
  const booking = await Booking.findById(req.params.bookingId)
    .populate({
      path: 'event',
      populate: {
        path: 'organizer',
        select: 'name email'
      }
    })
    .populate('user');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Check if user is the event organizer
  if (booking.event.organizer._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this booking');
  }

  const previousStatus = booking.status;
  booking.status = status;
  
  // Update event's ticketsSold count
  const event = await Event.findById(booking.event._id);
  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Handle ticketsSold updates based on status changes
  if (status === 'confirmed' && previousStatus !== 'confirmed') {
    // Generate invitation code when booking is confirmed
    await booking.generateInvitationCode();
    
    // Increment ticketsSold when confirming a booking
    event.ticketsSold = (event.ticketsSold || 0) + booking.tickets;
    if (event.ticketsSold >= event.capacity) {
      event.status = 'sold_out';
    }
  } else if (previousStatus === 'confirmed' && status !== 'confirmed') {
    // Decrement ticketsSold when cancelling a confirmed booking
    event.ticketsSold = Math.max(0, (event.ticketsSold || 0) - booking.tickets);
    if (event.status === 'sold_out' && event.ticketsSold < event.capacity) {
      event.status = 'published';
    }
    // Clear invitation code when booking is cancelled
    booking.invitationCode = undefined;
  }

  // Add confirmation message when booking is confirmed
  if (status === 'confirmed') {
    const confirmationMessage = `
Your booking for "${booking.event.title}" has been confirmed!

Event Details:
- Event: ${booking.event.title}
- Date: ${new Date(booking.event.date).toLocaleDateString()}
- Number of Tickets: ${booking.tickets}
- Total Amount: ₹${booking.total}
- Invitation Code: ${booking.invitationCode}

Please keep your invitation code safe. You'll need to show this code at the event entrance.
${message ? '\nAdditional Information: ' + message : ''}

Please arrive 15 minutes before the event starts.
Thank you for booking with us!`;
    
    booking.confirmationMessage = confirmationMessage;
  } else if (status === 'cancelled') {
    booking.confirmationMessage = message || 'Booking has been cancelled.';
  }

  // Save both booking and event updates
  await Promise.all([
    booking.save(),
    event.save()
  ]);

  res.json({
    success: true,
    data: { booking }
  });
});

// @desc    Get my bookings
// @route   GET /api/bookings/my-bookings
// @access  Private
const getMyBookings = asyncHandler(async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('event')
      .sort('-createdAt')
      .lean(); // Use lean() for better performance

    // Transform bookings to include verification status
    const transformedBookings = bookings.map(booking => ({
      ...booking,
      verificationStatus: booking.status === 'confirmed' ? 'Verified' : 'Not Verified'
    }));

    res.status(200).json({
      success: true,
      data: {
        bookings: transformedBookings
      }
    });
  } catch (error) {
    console.error('Error in getMyBookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings'
    });
  }
});

// @desc    Verify invitation code
// @route   POST /api/bookings/verify-code
// @access  Private
const verifyInvitationCode = asyncHandler(async (req, res) => {
  const { invitationCode } = req.body;

  const booking = await Booking.findOne({ invitationCode })
    .populate({
      path: 'event',
      select: 'title date time location'
    })
    .populate('user', 'name email');

  if (!booking) {
    res.status(404);
    throw new Error('Invalid invitation code');
  }

  if (booking.status !== 'confirmed') {
    res.status(400);
    throw new Error('This booking is not confirmed');
  }

  res.json({
    success: true,
    data: {
      booking,
      isValid: true,
      message: 'Invitation code is valid'
    }
  });
});

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('event', 'title date price image')
    .populate('user', 'name email phoneNumber');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Check if user is authorized to view this booking
  if (booking.user._id.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to view this booking');
  }

  res.json({
    success: true,
    data: booking
  });
});

// @desc    Send invitation code to user
// @route   POST /api/bookings/:id/send-invitation
// @access  Private
const sendInvitationCode = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('event')
    .populate('user');

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Check if user is the event organizer
  if (booking.event.organizer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to send invitation code');
  }

  // Check if booking is confirmed
  if (booking.status !== 'confirmed') {
    res.status(400);
    throw new Error('Cannot send invitation code for unconfirmed booking');
  }

  // Check if invitation code exists
  if (!booking.invitationCode) {
    await booking.generateInvitationCode();
    await booking.save();
  }

  // Create invitation message
  const message = `
Dear ${booking.user.name},

Your booking for "${booking.event.title}" has been confirmed!

Event Details:
- Event: ${booking.event.title}
- Date: ${new Date(booking.event.date).toLocaleDateString()}
- Location: ${booking.event.location}
- Number of Tickets: ${booking.tickets}
- Total Amount: ₹${booking.total}

Your Invitation Code: ${booking.invitationCode}

Please keep this code safe and present it at the event entrance.
This code is unique to your booking and cannot be replaced if lost.

Thank you for booking with us!

Best regards,
${req.user.name}
Event Organizer
  `;

  // TODO: Implement email sending here
  // For now, we'll just return success
  console.log('Invitation message:', message);

  res.json({
    success: true,
    message: 'Invitation code sent successfully',
    data: {
      invitationCode: booking.invitationCode,
      message
    }
  });
});

// Verify ticket at event entry
const verifyTicket = async (req, res) => {
  try {
    const { bookingId, eventId, userId, ticketId } = req.body;

    // Find the booking
    const booking = await Booking.findOne({
      _id: bookingId,
      event: eventId,
      user: userId,
      ticketId: ticketId
    }).populate('event');

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid ticket or booking not found'
      });
    }

    // Check if ticket is already used
    if (booking.isUsed) {
      return res.status(400).json({
        status: 'error',
        message: 'Ticket has already been used'
      });
    }

    // Check if the event date is valid
    const eventDate = new Date(booking.event.date);
    const now = new Date();
    
    if (eventDate < now.setHours(0, 0, 0, 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Event has already passed'
      });
    }

    // Mark ticket as used
    booking.isUsed = true;
    booking.entryTime = new Date();
    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Ticket verified successfully',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Error verifying ticket:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error verifying ticket'
    });
  }
};

module.exports = {
  createBooking,
  getEventBookings,
  updateBookingStatus,
  getMyBookings,
  verifyInvitationCode,
  getBooking,
  sendInvitationCode,
  verifyTicket
}; 