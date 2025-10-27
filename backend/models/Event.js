const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide event title'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Please provide event description']
    },
    date: {
        type: Date,
        required: [true, 'Please provide event date']
    },
    time: {
        type: String,
        required: [true, 'Please provide event time']
    },
    endTime: {
        type: String,
        required: [true, 'Please provide event end time']
    },
    location: {
        type: String,
        required: [true, 'Please provide event location']
    },
    venue: {
        name: String,
        address: String,
        city: String,
        state: String,
        zipCode: String,
        googleMapsLink: String
    },
    price: {
        type: Number,
        required: [true, 'Please provide ticket price'],
        min: 0
    },
    category: {
        type: String,
        required: [true, 'Please provide event category'],
        enum: ['conference', 'seminar', 'workshop', 'party', 'concert', 'sports', 'other']
    },
    capacity: {
        type: Number,
        required: [true, 'Please provide event capacity'],
        min: 1
    },
    ticketsSold: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'cancelled', 'sold_out', 'completed'],
        default: 'draft'
    },
    image: {
        type: String,
        default: null
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPrivate: {
        type: Boolean,
        default: false
    },
    registrationDeadline: {
        type: Date
    },
    additionalDetails: {
        dresscode: String,
        ageRestriction: String,
        parking: String,
        food: String
    },
    tags: [{
        type: String
    }],
    socialMedia: {
        facebook: String,
        twitter: String,
        instagram: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual field for available tickets
eventSchema.virtual('availableTickets').get(function() {
    return this.capacity - this.ticketsSold;
});

// Virtual field for booking status
eventSchema.virtual('isSoldOut').get(function() {
    return this.ticketsSold >= this.capacity;
});

// Index for better query performance
eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ organizer: 1, status: 1 });
eventSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('Event', eventSchema); 