import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { FaRupeeSign, FaCheck, FaTimes, FaEye, FaSearch, FaSort } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

// Safely get API URL with fallback
const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL;
  return url ? url.trim() : 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

const EventBookings = () => {
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingBooking, setUpdatingBooking] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    fetchEvents();
  }, []);

  // Apply filters and sort
  useEffect(() => {
    let result = [...bookings];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(booking => 
        booking.user.name.toLowerCase().includes(searchLower) ||
        booking.user.email.toLowerCase().includes(searchLower) ||
        booking.event.title.toLowerCase().includes(searchLower)
      );
    }

    // Apply date range filter
    if (startDate) {
      result = result.filter(booking => new Date(booking.createdAt) >= startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(booking => new Date(booking.createdAt) <= endOfDay);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle nested properties
      if (sortField === 'user.name') {
        aValue = a.user.name;
        bValue = b.user.name;
      } else if (sortField === 'event.title') {
        aValue = a.event.title;
        bValue = b.event.title;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredBookings(result);
  }, [bookings, searchTerm, startDate, endDate, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const eventsResponse = await axios.get(`${API_URL}/events/my-events`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const eventsList = eventsResponse.data.data.events;
      setEvents(eventsList);

      // Fetch bookings for each event
      const bookingsPromises = eventsList.map(event => 
        axios.get(`${API_URL}/bookings/event/${event._id}/bookings`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      );

      const bookingsResponses = await Promise.all(bookingsPromises);
      const allBookings = bookingsResponses.flatMap(response => 
        response.data.data.bookings || []
      );

      setBookings(allBookings);
    } catch (error) {
      console.error('Error fetching data:', error);
      
      if (error.response?.status === 401) {
        toast.error('Please login to view bookings');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to view bookings');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load bookings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      setUpdatingBooking(bookingId);
      const token = localStorage.getItem('token');
      
      await axios.put(
        `${API_URL}/bookings/${bookingId}/status`,
        { 
          status: newStatus,
          message: message 
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Update local state
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === bookingId
            ? { ...booking, status: newStatus, confirmationMessage: message }
            : booking
        )
      );

      toast.success(`Booking ${newStatus} successfully`);
      setShowModal(false);
      setMessage('');
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error(error.response?.data?.message || 'Failed to update booking status');
    } finally {
      setUpdatingBooking(null);
    }
  };

  const openStatusModal = (booking, status) => {
    setSelectedBooking({ ...booking, newStatus: status });
    setMessage('');
    setShowModal(true);
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
      <h1 className="text-3xl font-bold mb-8">Event Bookings</h1>

      {/* Search and Filter Section */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500"
          />
          <FaSearch className="absolute right-3 top-3 text-gray-400" />
        </div>
        
        <DatePicker
          selected={startDate}
          onChange={date => setStartDate(date)}
          placeholderText="Start Date"
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500"
          dateFormat="yyyy-MM-dd"
          isClearable
        />
        
        <DatePicker
          selected={endDate}
          onChange={date => setEndDate(date)}
          placeholderText="End Date"
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-primary-500"
          dateFormat="yyyy-MM-dd"
          isClearable
        />

        <button
          onClick={() => {
            setSearchTerm('');
            setStartDate(null);
            setEndDate(null);
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {/* Bookings Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('user.name')}>
                Customer {sortField === 'user.name' && <FaSort className="inline ml-1" />}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('tickets')}>
                Tickets {sortField === 'tickets' && <FaSort className="inline ml-1" />}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('total')}>
                Total {sortField === 'total' && <FaSort className="inline ml-1" />}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('status')}>
                Status {sortField === 'status' && <FaSort className="inline ml-1" />}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('createdAt')}>
                Booked On {sortField === 'createdAt' && <FaSort className="inline ml-1" />}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Verification
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBookings.map((booking) => (
              <tr key={booking._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{booking.user.name}</div>
                  <div className="text-sm text-gray-500">{booking.user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {booking.tickets}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <FaRupeeSign className="inline-block mr-1" />{booking.total}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(booking.createdAt), 'MMM d, yyyy h:mm a')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    booking.verificationStatus === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {booking.verificationStatus}
                    {booking.verifiedAt && (
                      <span className="ml-2 text-gray-500">
                        ({format(new Date(booking.verifiedAt), 'MMM d, yyyy h:mm a')})
                      </span>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status Update Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Update Booking Status</h2>
            <p className="mb-4">
              Are you sure you want to mark this booking as{' '}
              <span className="font-semibold">{selectedBooking?.newStatus}</span>?
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message (optional)"
              className="w-full p-2 border rounded mb-4"
              rows="3"
            />
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedBooking?._id, selectedBooking?.newStatus)}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                disabled={updatingBooking === selectedBooking?._id}
              >
                {updatingBooking === selectedBooking?._id ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventBookings; 