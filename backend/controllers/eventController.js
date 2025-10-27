const Event = require('../models/Event');
const Booking = require('../models/bookingModel');

// @desc    Create new event
// @route   POST /api/events
exports.createEvent = async (req, res) => {
    try {
        const eventData = {
            ...req.body,
            organizer: req.user._id,
            status: req.body.status || 'draft'
        };

        if (req.file) {
            eventData.image = req.file.buffer.toString('base64');
        }

        const event = await Event.create(eventData);
        
        // Populate organizer details
        await event.populate('organizer', 'name email');

        res.status(201).json({
            status: 'success',
            data: { event }
        });
    } catch (err) {
        console.error('Error creating event:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message || 'Failed to create event'
        });
    }
};

// @desc    Get all published events
// @route   GET /api/events
exports.getAllEvents = async (req, res) => {
    try {
        // Only show published events
        const filters = { status: 'published' };
        
        // Add search and filter options
        if (req.query.search) {
            filters.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }
        
        if (req.query.category) {
            filters.category = req.query.category;
        }
        
        if (req.query.minPrice) {
            filters.price = { $gte: Number(req.query.minPrice) };
        }
        
        if (req.query.maxPrice) {
            filters.price = { ...filters.price, $lte: Number(req.query.maxPrice) };
        }
        
        // Date filters
        if (req.query.date) {
            const selectedDate = new Date(req.query.date);
            const nextDay = new Date(selectedDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            filters.date = {
                $gte: selectedDate,
                $lt: nextDay
            };
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Query events with filters and pagination
        const events = await Event.find(filters)
            .populate('organizer', 'name email')
            .sort(req.query.sort || '-createdAt')
            .skip(skip)
            .limit(limit);

        // Get total count for pagination
        const total = await Event.countDocuments(filters);

        res.status(200).json({
            status: 'success',
            results: events.length,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            },
            data: { events }
        });
    } catch (err) {
        console.error('Error in getAllEvents:', err);
        res.status(400).json({
            status: 'fail',
            message: err.message || 'Failed to fetch events'
        });
    }
};

// @desc    Get event details
// @route   GET /api/events/:id
exports.getEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'name email');

        if (!event) {
            return res.status(404).json({
                status: 'fail',
                message: 'Event not found'
            });
        }

        // Get booking statistics
        const stats = await Booking.aggregate([
            { $match: { event: event._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalTickets: { $sum: '$tickets' }
                }
            }
        ]);

        res.status(200).json({
            status: 'success',
            data: {
                event,
                bookingStats: stats
            }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message || 'Failed to fetch event details'
        });
    }
};

// @desc    Update event
// @route   PUT /api/events/:id
exports.updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                status: 'fail',
                message: 'Event not found'
            });
        }

        // Check ownership
        if (event.organizer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'fail',
                message: 'Not authorized to update this event'
            });
        }

        // Update event
        Object.assign(event, req.body);
        
        // Handle image update if provided
        if (req.file) {
            event.image = req.file.buffer.toString('base64');
        }

        // Check if event should be marked as sold out
        if (event.ticketsSold >= event.capacity) {
            event.status = 'sold_out';
        }

        await event.save();
        await event.populate('organizer', 'name email');

        res.status(200).json({
            status: 'success',
            data: { event }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message || 'Failed to update event'
        });
    }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                status: 'fail',
                message: 'Event not found'
            });
        }

        // Check ownership
        if (event.organizer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'fail',
                message: 'Not authorized to delete this event'
            });
        }

        // Delete event and associated bookings
        await Promise.all([
            Event.findByIdAndDelete(req.params.id),
            Booking.deleteMany({ event: req.params.id })
        ]);

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message || 'Failed to delete event'
        });
    }
};

// @desc    Get organizer's events
// @route   GET /api/events/my-events
exports.getMyEvents = async (req, res) => {
    try {
        const events = await Event.find({ organizer: req.user._id })
            .populate('organizer', 'name email')
            .sort('-createdAt');

        // Get booking statistics for each event
        const eventsWithStats = await Promise.all(
            events.map(async (event) => {
                const stats = await Booking.aggregate([
                    { $match: { event: event._id } },
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 },
                            totalTickets: { $sum: '$tickets' },
                            revenue: { $sum: '$total' }
                        }
                    }
                ]);

                return {
                    ...event.toObject(),
                    bookingStats: stats
                };
            })
        );

        res.status(200).json({
            status: 'success',
            results: events.length,
            data: {
                events: eventsWithStats
            }
        });
    } catch (err) {
        console.error('Error in getMyEvents:', err);
        res.status(400).json({
            status: 'fail',
            message: 'Failed to fetch your events'
        });
    }
};

// @desc    Publish event
// @route   PATCH /api/events/:id/publish
exports.publishEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({
                status: 'fail',
                message: 'Event not found'
            });
        }

        // Check ownership
        if (event.organizer.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'fail',
                message: 'Not authorized to publish this event'
            });
        }

        event.status = 'published';
        await event.save();

        res.status(200).json({
            status: 'success',
            data: { event }
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        });
    }
}; 