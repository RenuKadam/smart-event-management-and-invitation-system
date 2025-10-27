const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    verifiedAt: {
        type: Date,
        default: Date.now
    },
    ticketId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent'],
        default: 'present'
    },
    numberOfTickets: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

// Index for faster queries
attendanceSchema.index({ event: 1, ticketId: 1 });
attendanceSchema.index({ booking: 1 });
attendanceSchema.index({ user: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema); 