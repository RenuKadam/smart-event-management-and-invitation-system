const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const Booking = require('../models/bookingModel');
const Event = require('../models/Event');
const mongoose = require('mongoose');

// Get event reports for organizer
router.get('/event-statistics', protect, restrictTo('organizer'), async (req, res) => {
  try {
    const { date, eventId, category } = req.query;
    
    // Create start and end of day for the given date in local timezone
    const startDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setUTCHours(23, 59, 59, 999);

    console.log('Querying for date range:', { startDate, endDate, eventId, category });

    // First, get all events for this organizer with date and category filter
    const eventQuery = { 
      organizer: req.user._id,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Add category filter if provided
    if (category) {
      eventQuery.category = category;
    }

    const organizerEvents = await Event.find(eventQuery).select('_id');
    
    const organizerEventIds = organizerEvents.map(event => event._id);
    
    console.log('Organizer events for date and category:', organizerEventIds);

    // If no events found for the given criteria
    if (organizerEventIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          statistics: []
        }
      });
    }

    // Build match condition
    const matchCondition = {
      event: { $in: organizerEventIds }
    };

    // Add specific event filter if provided
    if (eventId) {
      matchCondition.event = new mongoose.Types.ObjectId(eventId);
    }

    const statistics = await Booking.aggregate([
      {
        $match: matchCondition
      },
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'eventDetails'
        }
      },
      {
        $unwind: {
          path: '$eventDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$event',
          eventTitle: { $first: '$eventDetails.title' },
          eventCategory: { $first: '$eventDetails.category' },
          totalTickets: { $sum: '$tickets' },
          totalRevenue: { $sum: '$total' },
          bookingsCount: { $sum: 1 },
          attendedCount: {
            $sum: {
              $cond: [{ $eq: ['$attendance.status', 'present'] }, 1, 0]
            }
          },
          totalAttendees: {
            $sum: {
              $cond: [{ $eq: ['$attendance.status', 'present'] }, '$tickets', 0]
            }
          },
          attendanceDetails: {
            $push: {
              $cond: [
                { $eq: ['$attendance.status', 'present'] },
                {
                  userName: '$user.name',
                  userEmail: '$user.email',
                  tickets: '$tickets',
                  verifiedAt: '$attendance.verifiedAt'
                },
                null
              ]
            }
          },
          eventDetails: { $first: '$eventDetails' },
          // Only include confirmed bookings in the statistics
          confirmedTickets: {
            $sum: {
              $cond: [{ $eq: ['$status', 'confirmed'] }, '$tickets', 0]
            }
          },
          confirmedRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'confirmed'] }, '$total', 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          eventTitle: 1,
          eventCategory: 1,
          totalTickets: '$confirmedTickets', // Use only confirmed bookings
          totalRevenue: '$confirmedRevenue', // Use only confirmed bookings
          bookingsCount: 1,
          attendedCount: 1,
          totalAttendees: 1,
          attendanceDetails: {
            $filter: {
              input: '$attendanceDetails',
              as: 'detail',
              cond: { $ne: ['$$detail', null] }
            }
          },
          eventDetails: 1
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
});

module.exports = router; 