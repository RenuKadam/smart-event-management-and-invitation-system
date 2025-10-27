const mongoose = require('mongoose');
const Booking = require('../models/bookingModel');
const Event = require('../models/Event');
const User = require('../models/userModel');
const Attendance = require('../models/attendanceModel');
const asyncHandler = require('express-async-handler');

// Generate QR code after successful payment
exports.generateQRCode = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.bookingId);
        
        if (!booking) {
            return res.status(404).json({
                status: 'fail',
                message: 'Booking not found'
            });
        }

        // Check if payment is completed
        if (booking.paymentStatus !== 'completed') {
            return res.status(400).json({
                status: 'fail',
                message: 'Payment must be completed before generating QR code'
            });
        }

        // Generate QR code
        const qrCode = await booking.generateQRCode();

        res.status(200).json({
            status: 'success',
            data: {
                qrCode,
                ticketId: booking.ticketId
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Scan QR code for entry
exports.scanQRCode = async (req, res) => {
    try {
        const { ticketData } = req.body;
        const scannedData = JSON.parse(ticketData);

        // Find the booking
        const booking = await Booking.findOne({
            ticketId: scannedData.ticketId,
            event: scannedData.eventId
        }).populate('event');

        if (!booking) {
            return res.status(404).json({
                status: 'fail',
                message: 'Invalid ticket'
            });
        }

        // Check if ticket is already scanned
        if (booking.qrCode.scanned) {
            return res.status(400).json({
                status: 'fail',
                message: 'Ticket already used for entry',
                scannedAt: booking.qrCode.scannedAt
            });
        }

        // Check if event date is valid
        const eventDate = new Date(booking.event.date);
        const now = new Date();
        
        // Check if scanning is within 12 hours before or after event time
        const timeDiff = Math.abs(eventDate - now) / (1000 * 60 * 60); // difference in hours
        if (timeDiff > 12) {
            return res.status(400).json({
                status: 'fail',
                message: 'Ticket can only be scanned within 12 hours of the event time'
            });
        }

        // Update booking with scan information
        booking.qrCode.scanned = true;
        booking.qrCode.scannedAt = new Date();
        booking.qrCode.scannedBy = 'system'; // Mark as system-validated
        await booking.save();

        // Notify the event organizer (you can implement this later)
        // await notifyOrganizer(booking);

        res.status(200).json({
            status: 'success',
            message: 'Entry confirmed',
            data: {
                ticketId: booking.ticketId,
                eventId: booking.event._id,
                eventTitle: booking.event.title,
                scannedAt: booking.qrCode.scannedAt,
                tickets: booking.tickets,
                validEntry: true
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Get ticket status
exports.getTicketStatus = async (req, res) => {
    try {
        const booking = await Booking.findOne({
            ticketId: req.params.ticketId
        }).populate('event user');

        if (!booking) {
            return res.status(404).json({
                status: 'fail',
                message: 'Ticket not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                ticketId: booking.ticketId,
                event: booking.event.name,
                user: booking.user.name,
                tickets: booking.tickets,
                scanned: booking.qrCode.scanned,
                scannedAt: booking.qrCode.scannedAt
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
};

// Validate ticket when scanned with QR scanner
exports.validateTicket = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { eventId } = req.query;

        console.log('Validating ticket:', { ticketId, eventId });

        if (!ticketId || !eventId) {
            console.log('Missing required parameters');
            return res.status(400).send(`
                <html><head><title>Invalid Request</title></head>
                <body><h1>Invalid Request</h1><p>Missing required ticket information.</p></body></html>
            `);
        }

        // Find the booking with populated event details
        const booking = await Booking.findOne({
            ticketId: ticketId,
            event: eventId
        }).populate({
            path: 'event',
            select: 'title organizer category date'
        });

        console.log('Found booking:', booking);

        if (!booking) {
            return res.status(404).send(`
                <html><head><title>Invalid Ticket</title></head>
                <body><h1>Invalid Ticket</h1><p>This ticket is not valid or has been tampered with.</p></body></html>
            `);
        }

        // Check if attendance is already verified
        if (booking.attendance?.status === 'present') {
            return res.status(400).send(`
                <html>
                    <head>
                        <title>Already Verified</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                            .warning { color: #f59e0b; }
                            .container { max-width: 500px; margin: 0 auto; }
                            .time { font-weight: bold; margin-top: 10px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1 class="warning">Attendance Already Marked</h1>
                            <p>This ticket has already been verified</p>
                            <p class="time">Verified at: ${new Date(booking.attendance.verifiedAt).toLocaleString()}</p>
                        </div>
                    </body>
                </html>
            `);
        }

        // Generate new OTP
        const otp = await booking.generateOTP();
        console.log('Generated OTP:', otp);

        // Return OTP page
        return res.status(200).send(`
            <html>
                <head>
                    <title>Attendance Verification</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; text-align: center; background-color: #f3f4f6; }
                        .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                        .otp { font-size: 2.5rem; letter-spacing: 0.5rem; font-weight: bold; color: #4f46e5; margin: 2rem 0; }
                        .info { color: #4b5563; margin-bottom: 1rem; }
                        .event-title { font-size: 1.25rem; font-weight: bold; color: #1f2937; margin-bottom: 0.5rem; }
                        .expires { color: #dc2626; font-size: 0.875rem; margin-top: 1rem; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1 class="event-title">${booking.event.title}</h1>
                        <p class="info">Show this OTP to the organizer to verify your attendance</p>
                        <div class="otp">${otp}</div>
                        <p class="info">Tickets: ${booking.tickets}</p>
                        <p class="expires">OTP expires in 30 minutes</p>
                    </div>
                </body>
            </html>
        `);
    } catch (err) {
        console.error('Error validating ticket:', err);
        return res.status(500).send(`
            <html><head><title>Error</title></head>
            <body><h1>Error</h1><p>An error occurred while validating the ticket.</p></body></html>
        `);
    }
};

// Verify OTP and mark attendance
exports.verifyOTP = asyncHandler(async (req, res) => {
    try {
        const { otp } = req.body;
        
        if (!otp) {
            return res.status(400).json({
                status: 'error',
                message: 'OTP is required'
            });
        }

        // Find booking with matching OTP
        const booking = await Booking.findOne({
            'otp.code': otp,
            'otp.verified': false,
            'otp.expiresAt': { $gt: new Date() },
            status: 'confirmed',
            paymentStatus: 'completed'
        }).populate('event').populate('user');

        if (!booking) {
            return res.status(404).json({
                status: 'error',
                message: 'Invalid or expired OTP'
            });
        }

        // Verify the organizer has permission for this event
        if (booking.event.organizer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'You do not have permission to verify attendance for this event'
            });
        }

        // Mark attendance
        const now = new Date();
        booking.attendance = {
            status: 'present',
            verifiedAt: now,
            verifiedBy: req.user._id
        };
        booking.otp.verified = true;
        booking.totalAttendees = booking.tickets; // Update total attendees
        booking.entryTime = now;

        // Save the booking
        await booking.save();

        // Create attendance record
        const attendanceRecord = new Attendance({
            booking: booking._id,
            event: booking.event._id,
            user: booking.user._id,
            verifiedBy: req.user._id,
            verifiedAt: now,
            ticketId: booking.ticketId,
            status: 'present',
            numberOfTickets: booking.tickets
        });

        await attendanceRecord.save();

        return res.status(200).json({
            status: 'success',
            message: 'Attendance verified successfully',
            data: {
                booking: {
                    ...booking.toObject(),
                    verificationStatus: 'Verified'
                }
            }
        });
    } catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to verify attendance'
        });
    }
}); 