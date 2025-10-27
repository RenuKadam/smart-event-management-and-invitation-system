import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const EventReports = () => {
  const [statistics, setStatistics] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ticketId, setTicketId] = useState('');
  const [otp, setOtp] = useState('');
  const [validating, setValidating] = useState(false);

  // Add console logs for debugging
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get(`${API_URL}/events/my-events`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        console.log('Fetched events:', response.data);
        const eventsData = response.data.data.events || [];
        setEvents(eventsData);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(eventsData.map(event => event.category))];
        setCategories(uniqueCategories);
      } catch (err) {
        console.error('Error fetching events:', err);
        toast.error('Error fetching events');
      }
    };

    fetchEvents();
  }, []);

  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure date is in the correct timezone and format for the local date
      const date = new Date(selectedDate);
      // Set time to noon to avoid timezone issues
      date.setHours(12, 0, 0, 0);
      const formattedDate = date.toISOString().split('T')[0];
      console.log('Fetching statistics for date:', formattedDate);
      
      let url = `${API_URL}/reports/event-statistics`;
      const params = new URLSearchParams();
      params.append('date', formattedDate);
      if (selectedEvent) {
        params.append('eventId', selectedEvent);
      }
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      url += `?${params.toString()}`;

      console.log('Fetching from URL:', url);

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Statistics response:', response.data);

      if (response.data.status === 'success') {
        setStatistics(response.data.data.statistics || []);
      } else {
        throw new Error(response.data.message || 'Failed to fetch statistics');
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      
      // Check if user is an organizer
      if (err.response?.status === 403) {
        setError('You do not have permission to view reports. Only organizers can access this feature.');
      } else {
        setError(err.response?.data?.message || 'Error fetching statistics');
      }
      
      toast.error(err.response?.data?.message || 'Error fetching statistics');
      setStatistics([]); // Clear statistics on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchStatistics();
    }
  }, [selectedDate, selectedEvent, selectedCategory]);

  const chartData = {
    labels: statistics.map(stat => `${stat.eventTitle || 'Unknown Event'} (${stat.eventCategory || 'N/A'})`),
    datasets: [
      {
        label: 'Total Tickets Sold',
        data: statistics.map(stat => stat.totalTickets || 0),
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
      {
        label: 'Total Revenue (₹)',
        data: statistics.map(stat => stat.totalRevenue || 0),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Event Statistics for ${selectedDate.toLocaleDateString()}`
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  // Function to generate and download PDF report
  const downloadPDFReport = () => {
    if (statistics.length === 0) {
      toast.error('No data available to generate report');
      return;
    }

    try {
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Event Statistics Report', 14, 20);
      
      // Add date
      doc.setFontSize(12);
      doc.text(`Date: ${selectedDate.toLocaleDateString()}`, 14, 30);
      
      // Add event filter if selected
      if (selectedEvent) {
        const selectedEventObj = events.find(e => e._id === selectedEvent);
        if (selectedEventObj) {
          doc.text(`Event: ${selectedEventObj.name}`, 14, 37);
        }
      }
      
      // Add summary section
      doc.setFontSize(14);
      doc.text('Summary', 14, 50);
      
      // Calculate totals
      const totalTickets = statistics.reduce((sum, stat) => sum + (stat.totalTickets || 0), 0);
      const totalRevenue = statistics.reduce((sum, stat) => sum + (stat.totalRevenue || 0), 0);
      const totalBookings = statistics.reduce((sum, stat) => sum + (stat.bookingsCount || 0), 0);
      
      // Add summary data
      doc.setFontSize(12);
      doc.text(`Total Events: ${statistics.length}`, 20, 60);
      doc.text(`Total Tickets Sold: ${totalTickets}`, 20, 67);
      doc.text(`Total Revenue: ₹${totalRevenue}`, 20, 74);
      doc.text(`Total Bookings: ${totalBookings}`, 20, 81);
      
      // Add detailed statistics table
      doc.setFontSize(14);
      doc.text('Detailed Statistics', 14, 95);
      
      // Prepare table data
      const tableData = statistics.map(stat => [
        stat.eventTitle || 'Unknown Event',
        stat.eventCategory || 'N/A',
        stat.totalTickets || 0,
        stat.totalAttendees || 0,
        stat.totalTickets ? ((stat.totalAttendees || 0) / stat.totalTickets * 100).toFixed(1) : 0,
        `₹${stat.totalRevenue || 0}`,
        stat.bookingsCount || 0
      ]);
      
      // Add table using autoTable
      autoTable(doc, {
        startY: 100,
        head: [['Event Title', 'Category', 'Tickets', 'Attended', 'Attendance %', 'Revenue', 'Bookings']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 30 },
          6: { cellWidth: 25 }
        }
      });
      
      // Save the PDF
      const fileName = `event-report-${selectedDate.toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  // Handle OTP validation
  const handleOTPValidation = async (e) => {
    e.preventDefault();
    if (!otp) {
        toast.error('Please enter the OTP');
        return;
    }

    try {
        setValidating(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
            toast.error('You must be logged in to verify attendance');
            return;
        }

        console.log('Sending OTP verification request:', {
            otp,
            url: `${API_URL}/tickets/verify-otp`
        });

        const response = await axios.post(
            `${API_URL}/tickets/verify-otp`,
            { otp },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        console.log('OTP verification response:', response.data);

        if (response.data.status === 'success') {
            toast.success(response.data.message || 'Attendance verified successfully!');
            setOtp('');
            
            // Wait a short moment before refreshing statistics
            setTimeout(() => {
                fetchStatistics();
            }, 1000);
        } else {
            throw new Error(response.data.message || 'Failed to verify attendance');
        }
    } catch (error) {
        console.error('OTP verification error:', {
            message: error.response?.data?.message || error.message,
            status: error.response?.status,
            data: error.response?.data
        });

        let errorMessage = 'Failed to verify OTP';
        
        if (error.response) {
            if (error.response.status === 401) {
                errorMessage = 'Your session has expired. Please log in again.';
                // Optionally redirect to login page
                // window.location.href = '/login';
            } else if (error.response.status === 403) {
                errorMessage = 'You do not have permission to verify attendance. Only organizers can perform this action.';
            } else if (error.response.status === 404) {
                errorMessage = 'Invalid or expired OTP';
            } else if (error.response.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.response.data?.message) {
                errorMessage = error.response.data.message;
            }
        }

        toast.error(errorMessage);
    } finally {
        setValidating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Event Reports</h2>
          
          {/* Download PDF Button */}
          {!loading && statistics.length > 0 && (
            <button
              onClick={downloadPDFReport}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex items-center"
              aria-label="Download PDF Report"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
          )}
        </div>

        {/* Simplified OTP Validation Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">Validate Attendance</h3>
          <form onSubmit={handleOTPValidation} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                maxLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={validating}
              className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {validating ? 'Validating...' : 'Verify Attendance'}
            </button>
          </form>
        </div>

        {/* Updated form with category dropdown */}
        <form className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" id="event-report-form" name="event-report-form">
          <div className="form-group">
            <label htmlFor="report-date-picker" className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <div className="relative">
              <DatePicker
                id="report-date-picker"
                name="report-date-picker"
                selected={selectedDate}
                onChange={date => setSelectedDate(date)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                dateFormat="yyyy-MM-dd"
                placeholderText="Select date"
                autoComplete="off"
                aria-label="Select report date"
                wrapperClassName="w-full"
                popperClassName="react-datepicker-popper"
                customInput={
                  <input
                    type="text"
                    id="report-date-input"
                    name="report-date-input"
                    autoComplete="off"
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category-select"
              name="category-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedEvent(''); // Reset selected event when category changes
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              autoComplete="off"
              aria-label="Select category"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option 
                  key={category} 
                  value={category}
                  id={`category-option-${category}`}
                  name={`category-option-${category}`}
                >
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="event-select" className="block text-sm font-medium text-gray-700 mb-2">
              Event
            </label>
            <select
              id="event-select"
              name="event-select"
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              autoComplete="off"
              aria-label="Select event"
            >
              <option value="">All Events</option>
              {events
                .filter(event => !selectedCategory || event.category === selectedCategory)
                .map(event => (
                  <option 
                    key={event._id} 
                    value={event._id}
                    id={`event-option-${event._id}`}
                    name={`event-option-${event._id}`}
                  >
                    {event.title} ({event.category})
                  </option>
                ))}
            </select>
          </div>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64" role="status" aria-label="Loading">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-red-600 text-center py-4" role="alert">
            {error}
          </div>
        )}

        {/* Chart */}
        {!loading && !error && statistics.length > 0 && (
          <div className="mt-6">
            <Bar data={chartData} options={chartOptions} aria-label="Event statistics chart" />
          </div>
        )}

        {/* Updated Statistics Table */}
        {!loading && statistics.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">Detailed Statistics</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Tickets
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attended
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance %
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statistics.map((stat, index) => (
                    <tr key={stat._id || index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stat.eventTitle || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stat.eventCategory || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stat.totalTickets || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {stat.totalAttendees || 0} / {stat.totalTickets || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(stat.attendancePercentage || 0).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        ₹{stat.totalRevenue || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Data Message */}
        {!loading && statistics.length === 0 && (
          <div className="text-center py-12" role="alert">
            <p className="text-gray-500">No data available for the selected date</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventReports; 