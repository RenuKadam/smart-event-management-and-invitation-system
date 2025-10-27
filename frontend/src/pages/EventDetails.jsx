import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FaRupeeSign, FaCalendarAlt, FaMapMarkerAlt, FaUsers, FaUser, FaTicketAlt } from 'react-icons/fa';
import { initializePayment } from '../services/PaymentService';

const API_URL = import.meta.env.VITE_API_URL;

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState({
    tickets: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/events/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setEvent(response.data.data.event);
    } catch (error) {
      console.error('Error fetching event:', error);
      if (error.response?.status === 401) {
        toast.error('Please login to view event details');
        navigate('/login');
      } else {
        toast.error('Failed to load event details');
        navigate('/events');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault(); // Prevent form submission
    try {
      // Check if user is logged in
      if (!user) {
        toast.error('Please log in to book tickets');
        navigate('/login');
        return;
      }
      
      // Check if user has a valid token
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Your session has expired. Please log in again');
        navigate('/login');
        return;
      }

      // Prevent organizers from booking events
      if (user.role === 'organizer') {
        toast.error('Organizers cannot book events');
        return;
      }

      // Prevent booking your own event
      if (event.organizer._id === user._id) {
        toast.error('You cannot book your own event');
        return;
      }

      // Check if event is available for booking
      if (event.status !== 'published') {
        toast.error('This event is not available for booking');
        return;
      }

      // Check if event date has passed
      if (new Date(event.date) < new Date()) {
        toast.error('This event has already taken place');
        return;
      }

      // Check if ticket count is valid
      const ticketCount = parseInt(bookingData.tickets);
      if (!ticketCount || isNaN(ticketCount) || ticketCount < 1) {
        toast.error('Please select a valid number of tickets');
        return;
      }
      
      // Check if event has a valid ID
      if (!event._id) {
        toast.error('Invalid event ID');
        return;
      }
      
      // Check if event has a valid price
      if (!event.price || isNaN(event.price)) {
        toast.error('Event price is not valid');
        return;
      }

      setIsLoading(true);
      
      // Check if enough tickets are available
      const availableTickets = event.capacity - (event.ticketsSold || 0);
      if (ticketCount > availableTickets) {
        toast.error(`Only ${availableTickets} tickets available`);
        return;
      }

      console.log('Request payload:', {
        event: event._id,
        tickets: ticketCount,
        total: event.price * ticketCount
      });
      console.log('Auth token:', localStorage.getItem('token'));
      
      // Create booking first
      const response = await axios.post(
        `${API_URL}/bookings`,
        {
          event: event._id,
          tickets: ticketCount,
          total: event.price * ticketCount
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Booking response:', response);
      const bookingDetails = response.data.data;
      console.log('Booking created:', bookingDetails);

      // Redirect to payment page with booking details
      navigate(`/payment/${bookingDetails.booking._id}`, {
        state: {
          bookingDetails: {
            booking: {
              ...bookingDetails.booking,
              total: event.price * ticketCount,
              tickets: ticketCount
            },
            event: {
              ...event,
              name: event.title,
              price: event.price
            },
            user: {
              name: user.name,
              email: user.email,
              phoneNumber: user.phoneNumber
            }
          }
        }
      });

    } catch (error) {
      console.error('Booking error:', error);
      
      // Handle specific error cases
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', error.response.data);
        
        if (error.response.status === 400) {
          if (error.response.data.message === 'Duplicate key error') {
            toast.error(`Booking failed: ${error.response.data.field} already exists. Please try again.`);
          } else {
            toast.error(error.response.data.message || 'Invalid booking data');
          }
        } else if (error.response.status === 401) {
          toast.error('Your session has expired. Please log in again');
          navigate('/login');
        } else if (error.response.status === 404) {
          toast.error('Event not found');
        } else {
          toast.error(error.response.data.message || 'Failed to book event');
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        toast.error('No response from server. Please try again later');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        toast.error('An error occurred while booking');
      }
    } finally {
      setIsLoading(false);
      setShowBookingModal(false);
    }
  };

  const isEventAvailable = () => {
    if (!event) return false;
    if (event.status !== 'published') return false;
    if (new Date(event.date) < new Date()) return false;
    return (event.capacity - (event.ticketsSold || 0)) > 0;
  };

  // Add input validation handler
  const handleTicketChange = (e) => {
    const value = parseInt(e.target.value) || 1; // Default to 1 if NaN
    const tickets = Math.max(1, Math.min(value, event?.capacity || 1)); // Clamp between 1 and capacity
    setBookingData({ tickets });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Event not found</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fadeIn">
      {event && (
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="card">
              <div className="hover-zoom mb-6">
                <img
                  src={event.image ? `data:image/jpeg;base64,${event.image}` : '/default-event.jpg'}
                  alt={event.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
              <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                {event.title}
              </h1>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center group">
                  <FaCalendarAlt className="text-gray-500 mr-2 group-hover:text-primary-600 transition-colors" />
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">
                      {format(new Date(event.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center group">
                  <FaMapMarkerAlt className="text-gray-500 mr-2 group-hover:text-primary-600 transition-colors" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">{event.location}</p>
                  </div>
                </div>
                <div className="flex items-center group">
                  <FaUsers className="text-gray-500 mr-2 group-hover:text-primary-600 transition-colors" />
                  <div>
                    <p className="text-sm text-gray-500">Capacity</p>
                    <p className="font-medium">
                      {event.capacity - (event.ticketsSold || 0)} available
                    </p>
                  </div>
                </div>
              </div>
              <div className="prose max-w-none">
                <h2 className="text-xl font-semibold mb-2">About this Event</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
              </div>
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-2">Organizer</h2>
                <div className="flex items-center group">
                  <div className="bg-primary-100 p-3 rounded-full mr-3">
                    <FaUser className="text-primary-600 group-hover:text-primary-700 transition-colors" />
                  </div>
                  <div>
                    <p className="font-medium">{event.organizer.name}</p>
                    <p className="text-gray-500">{event.organizer.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="card sticky top-4">
              <div className="mb-6">
                <p className="text-gray-600 mb-1">Price per ticket</p>
                <p className="price-tag text-2xl">
                  <FaRupeeSign className="mr-1" />
                  {event.price.toFixed(2)}
                </p>
              </div>

              {user && user.role === 'participant' && (
                <form onSubmit={handleBooking}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Tickets
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={event.capacity - (event.ticketsSold || 0)}
                      value={bookingData.tickets}
                      onChange={handleTicketChange}
                      className="input"
                      disabled={!isEventAvailable()}
                    />
                  </div>

                  <div className="mb-6">
                    <p className="text-lg font-semibold price-tag">
                      Total: <FaRupeeSign className="mx-1" />
                      {(event.price * bookingData.tickets).toFixed(2)}
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={!isEventAvailable()}
                  >
                    {isEventAvailable() ? 'Book Now' : 'Event Not Available'}
                  </button>
                  {!isEventAvailable() && (
                    <p className="text-sm text-red-600 mt-2 text-center">
                      {event.status !== 'published' ? 'This event is not yet published' :
                       new Date(event.date) < new Date() ? 'This event has already taken place' :
                       'No tickets available'}
                    </p>
                  )}
                </form>
              )}

              {(!user || user.role === 'organizer') && (
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    {!user ? 'Please login to book tickets' : 'Organizers cannot book tickets'}
                  </p>
                  {!user && (
                    <Link to="/login" className="btn btn-primary w-full">
                      Login to Book
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails; 