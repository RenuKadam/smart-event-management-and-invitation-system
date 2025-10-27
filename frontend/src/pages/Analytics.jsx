import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { format } from 'date-fns';
import { FaChartLine, FaTicketAlt, FaRupeeSign, FaUsers } from 'react-icons/fa';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = import.meta.env.VITE_API_URL;

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [eventStats, setEventStats] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [bookingData, setBookingData] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/events/my-events`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const events = response.data.data.events;
      
      // Process events data for statistics
      const stats = processEventStats(events);
      setEventStats(stats);

      // Process revenue data for chart
      const revenue = processRevenueData(events);
      setRevenueData(revenue);

      // Process booking data for chart
      const bookings = processBookingData(events);
      setBookingData(bookings);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processEventStats = (events) => {
    return {
      totalEvents: events.length,
      totalTicketsSold: events.reduce((acc, event) => acc + (event.ticketsSold || 0), 0),
      totalRevenue: events.reduce((acc, event) => {
        const revenue = event.bookingStats?.reduce((sum, stat) => {
          return sum + (stat.revenue || 0);
        }, 0) || 0;
        return acc + revenue;
      }, 0),
      averageTicketsPerEvent: events.length ? 
        (events.reduce((acc, event) => acc + (event.ticketsSold || 0), 0) / events.length).toFixed(1) 
        : 0
    };
  };

  const processRevenueData = (events) => {
    const monthlyRevenue = {};
    
    events.forEach(event => {
      event.bookingStats?.forEach(stat => {
        if (stat.revenue) {
          const date = new Date(event.date);
          const monthYear = format(date, 'MMM yyyy');
          monthlyRevenue[monthYear] = (monthlyRevenue[monthYear] || 0) + stat.revenue;
        }
      });
    });

    return {
      labels: Object.keys(monthlyRevenue),
      datasets: [{
        label: 'Monthly Revenue',
        data: Object.values(monthlyRevenue),
        borderColor: 'rgb(14, 165, 233)',
        backgroundColor: 'rgba(14, 165, 233, 0.5)',
      }]
    };
  };

  const processBookingData = (events) => {
    const bookingsByStatus = {
      confirmed: 0,
      pending: 0,
      cancelled: 0
    };

    events.forEach(event => {
      event.bookingStats?.forEach(stat => {
        if (stat._id && stat.count) {
          bookingsByStatus[stat._id] = (bookingsByStatus[stat._id] || 0) + stat.count;
        }
      });
    });

    return {
      labels: Object.keys(bookingsByStatus),
      datasets: [{
        label: 'Bookings by Status',
        data: Object.values(bookingsByStatus),
        backgroundColor: [
          'rgba(34, 197, 94, 0.5)',  // green for confirmed
          'rgba(234, 179, 8, 0.5)',   // yellow for pending
          'rgba(239, 68, 68, 0.5)',   // red for cancelled
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(234, 179, 8)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 1
      }]
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
        Event Analytics
      </h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <FaChartLine className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
              <p className="text-2xl font-semibold">{eventStats?.totalEvents || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <FaTicketAlt className="text-green-600 dark:text-green-400 text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Tickets Sold</p>
              <p className="text-2xl font-semibold">{eventStats?.totalTicketsSold || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <FaRupeeSign className="text-yellow-600 dark:text-yellow-400 text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-semibold">₹{eventStats?.totalRevenue?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
              <FaUsers className="text-purple-600 dark:text-purple-400 text-xl" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Tickets/Event</p>
              <p className="text-2xl font-semibold">{eventStats?.averageTicketsPerEvent || '0'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Revenue Trend</h2>
          {revenueData && (
            <Line
              data={revenueData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `₹${value}`
                    }
                  }
                }
              }}
            />
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Booking Status Distribution</h2>
          {bookingData && (
            <Bar
              data={bookingData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                }
              }
            }}
          />
        )}
      </div>
    </div>
  </div>
  );
};

export default Analytics; 