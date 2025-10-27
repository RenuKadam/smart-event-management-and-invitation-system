import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { FaRupeeSign, FaCalendarAlt, FaTicketAlt, FaTimes, FaCopy, FaSearch } from 'react-icons/fa';
import { MdConfirmationNumber } from 'react-icons/md';
import { QRCodeCanvas } from 'qrcode.react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const LOCAL_IP = '192.168.137.1'; // Your local network IP
const API_URL = import.meta.env.VITE_API_URL?.replace('localhost', LOCAL_IP) || `http://${LOCAL_IP}:5000/api`;

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const navigate = useNavigate();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    fetchBookings();
    // Check if logo exists
    const img = new Image();
    img.onload = () => setLogoLoaded(true);
    img.onerror = () => setLogoLoaded(false);
    img.src = '/logo.png';
  }, []);

  // Apply filters
  useEffect(() => {
    let result = [...bookings];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(booking => 
        booking.event?.title.toLowerCase().includes(searchLower)
      );
    }

    // Apply date filter
    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);
      
      result = result.filter(booking => {
        const eventDate = new Date(booking.event?.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === filterDate.getTime();
      });
    }

    setFilteredBookings(result);
  }, [bookings, searchTerm, selectedDate]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to view your bookings');
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/bookings/my-bookings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data?.data?.bookings) {
        setBookings(response.data.data.bookings);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      if (error.response?.status === 401) {
        toast.error('Please login to view your bookings');
        navigate('/login');
      } else {
        toast.error('Failed to load bookings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/bookings/${bookingId}/status`,
        { status: 'cancelled' },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      toast.success('Booking cancelled successfully');
      fetchBookings(); // Refresh the bookings list
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const copyInvitationCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Invitation code copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast.error('Failed to copy code to clipboard');
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const downloadQRCode = (booking) => {
    const canvasElement = document.getElementById(`qr-${booking._id}`);
    if (!canvasElement) {
      toast.error('Could not find QR code element');
      return;
    }

    try {
      // The element is already a canvas, so we can use it directly
      const pngUrl = canvasElement.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `event-ticket-${booking._id}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">My Bookings</h1>

        {/* Search and Filter Section */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by event name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <FaSearch className="absolute right-3 top-3 text-gray-400" />
          </div>
          
          <div>
            <DatePicker
              selected={selectedDate}
              onChange={date => setSelectedDate(date)}
              placeholderText="Filter by event date"
              className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
              dateFormat="yyyy-MM-dd"
              isClearable
            />
          </div>

          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedDate(null);
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            Clear Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBookings.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400">No bookings found matching your criteria.</p>
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div key={booking._id} className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                {booking.event?.image && (
                  <img
                    src={booking.event.image.startsWith('data:') ? booking.event.image : `data:image/jpeg;base64,${booking.event.image}`}
                    alt={booking.event.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.target.src = '/default-event.jpg';
                      e.target.onerror = null;
                    }}
                  />
                )}
                
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    {booking.event?.title}
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <span className="text-gray-400 text-sm">Date</span>
                      <p className="text-white">
                        {new Date(booking.event?.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Tickets</span>
                      <p className="text-white">{booking.tickets}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Total</span>
                      <p className="text-white">₹ {booking.total}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">Status</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>

                  {booking.status === 'confirmed' && (
                    <div className="mt-4 border-t border-gray-700 pt-4">
                      <div className="mb-4">
                        <h3 className="text-lg font-medium text-white mb-2">Entry QR Code</h3>
                        <div className="flex flex-col items-center justify-center bg-white p-4 rounded-lg">
                          <QRCodeCanvas
                            id={`qr-${booking._id}`}
                            value={`http://192.168.137.1:5000/api/tickets/validate/${booking.ticketId}?eventId=${booking.event?._id}`}
                            size={200}
                            level="H"
                            includeMargin={true}
                            imageSettings={
                              logoLoaded
                                ? {
                                    src: '/logo.png',
                                    width: 40,
                                    height: 40,
                                    excavate: true,
                                  }
                                : undefined
                            }
                          />
                          <button
                            onClick={() => downloadQRCode(booking)}
                            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors flex items-center"
                          >
                            <MdConfirmationNumber className="mr-2" />
                            Download Ticket
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {booking.status === 'pending' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleCancel(booking._id)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center"
                      >
                        <FaTimes className="mr-2" />
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {bookings.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-white mb-4">No bookings found</h3>
            <Link
              to="/events"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              Browse Events
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBookings; 