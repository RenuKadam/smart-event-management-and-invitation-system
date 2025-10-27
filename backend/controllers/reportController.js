const mongoose = require('mongoose');
const Booking = require('../models/bookingModel');
const Event = require('../models/Event');

exports.getEventStatistics = async (req, res) => {
    try {
        const { date, eventId } = req.query;
        const organizerId = req.user._id;

        console.log('Fetching statistics for:', { date, eventId, organizerId });

        // Build match condition for events
        let matchEventCondition = {
            organizer: mongoose.Types.ObjectId(organizerId)
        };

        if (eventId) {
            matchEventCondition._id = mongoose.Types.ObjectId(eventId);
        }

        // First, get all relevant events
        const events = await Event.find(matchEventCondition).lean();
        console.log('Found events:', events.map(e => ({ id: e._id, title: e.title })));

        // Then, get bookings with attendance for these events
        const eventIds = events.map(e => e._id);
        const bookings = await Booking.find({
            event: { $in: eventIds },
            'attendance.status': 'present'
        }).lean();

        console.log('Found bookings with attendance:', bookings.length);

        // Calculate statistics for each event
        const statistics = await Event.aggregate([
            {
                $match: matchEventCondition
            },
            {
                $lookup: {
                    from: 'bookings',
                    let: { eventId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$event', '$$eventId'] }
                            }
                        }
                    ],
                    as: 'allBookings'
                }
            },
            {
                $lookup: {
                    from: 'bookings',
                    let: { eventId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { 
                                    $and: [
                                        { $eq: ['$event', '$$eventId'] },
                                        { $eq: ['$attendance.status', 'present'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'presentBookings'
                }
            },
            {
                $project: {
                    _id: 1,
                    eventTitle: '$title',
                    eventCategory: '$category',
                    totalTickets: { $sum: '$allBookings.tickets' },
                    totalRevenue: { $sum: '$allBookings.total' },
                    totalAttendees: { $sum: '$presentBookings.tickets' },
                    bookingsCount: { $size: '$allBookings' },
                    attendancePercentage: {
                        $multiply: [
                            {
                                $cond: [
                                    { $eq: [{ $sum: '$allBookings.tickets' }, 0] },
                                    0,
                                    {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    { $sum: '$presentBookings.tickets' },
                                                    { $sum: '$allBookings.tickets' }
                                                ]
                                            },
                                            100
                                        ]
                                    }
                                ]
                            },
                            1
                        ]
                    },
                    attendanceDetails: {
                        $map: {
                            input: '$presentBookings',
                            as: 'booking',
                            in: {
                                userName: '$$booking.user.name',
                                userEmail: '$$booking.user.email',
                                tickets: '$$booking.tickets',
                                verifiedAt: '$$booking.attendance.verifiedAt'
                            }
                        }
                    }
                }
            },
            {
                $sort: { eventTitle: 1 }
            }
        ]);

        console.log('Calculated statistics:', JSON.stringify(statistics, null, 2));

        res.status(200).json({
            status: 'success',
            data: {
                statistics
            }
        });
    } catch (err) {
        console.error('Error getting event statistics:', err);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching event statistics',
            error: err.message
        });
    }
}; 