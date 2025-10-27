import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { initializePayment } from '../services/PaymentService';
import { FaArrowLeft, FaTicketAlt, FaCalendarAlt, FaRupeeSign } from 'react-icons/fa';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [bookingDetails, setBookingDetails] = useState(null);

  // Fetch booking details if not available in location state
  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        if (!bookingId) {
          toast.error('Invalid booking ID');
          return navigate('/my-bookings');
        }

        if (location.state?.bookingDetails) {
          console.log('Using booking details from state:', location.state.bookingDetails);
          const bookingData = location.state.bookingDetails;
          
          // Extract booking details from the nested structure
          const processedBookingData = {
            ...bookingData.booking,
            event: bookingData.event,
            user: bookingData.user
          };

          // Ensure all required fields are present
          if (!processedBookingData.total || !processedBookingData.tickets || !processedBookingData.event) {
            console.error('Missing required fields:', processedBookingData);
            throw new Error('Incomplete booking details');
          }

          setBookingDetails(processedBookingData);
        } else {
          const token = localStorage.getItem('token');
          if (!token) {
            toast.error('Please login to continue');
            return navigate('/login');
          }

          console.log('Fetching booking details for ID:', bookingId);
          const response = await axios.get(`${API_URL}/bookings/${bookingId}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          if (response.data.success) {
            const bookingData = response.data.data;
            console.log('Fetched booking details:', bookingData);
            
            // Validate booking data
            if (!bookingData.total || !bookingData.tickets || !bookingData.event) {
              console.error('Invalid booking data:', bookingData);
              throw new Error('Invalid booking data received from server');
            }

            setBookingDetails(bookingData);
          } else {
            throw new Error(response.data.message || 'Failed to fetch booking details');
          }
        }
      } catch (error) {
        console.error('Error fetching booking details:', error);
        toast.error(error.message || 'Failed to load booking details');
        navigate('/my-bookings');
      }
    };

    fetchBookingDetails();
  }, [bookingId, location.state, navigate]);

  const handlePayment = async () => {
    try {
      if (!bookingDetails || !bookingId) {
        toast.error('Booking details not available');
        return;
      }

      setLoading(true);
      console.log('Initializing payment for booking:', {
        bookingId,
        eventName: bookingDetails.event.title || bookingDetails.event.name,
        amount: bookingDetails.total
      });

      await initializePayment({
        bookingId: bookingId,
        eventName: bookingDetails.event.title || bookingDetails.event.name,
        userName: bookingDetails.user.name,
        userEmail: bookingDetails.user.email,
        userPhone: bookingDetails.user.phoneNumber,
        amount: bookingDetails.total
      });

      toast.success('Payment successful!');
      navigate('/my-bookings');
    } catch (error) {
      console.error('Payment error:', error);
      if (error.response?.status === 503) {
        toast.error('Payment service is temporarily unavailable. Please try again later.');
      } else {
        toast.error(error.response?.data?.message || error.message || 'Payment failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <FaArrowLeft className="mr-2" />
          Back to Event
        </button>

        {/* Payment Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 px-6 py-4">
            <h1 className="text-2xl font-semibold text-white">Complete Your Payment</h1>
          </div>

          {/* Booking Details */}
          <div className="p-6 space-y-6">
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold mb-4">{bookingDetails.event.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <FaCalendarAlt className="text-gray-500 mr-2" />
                  <span>{new Date(bookingDetails.event.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <FaTicketAlt className="text-gray-500 mr-2" />
                  <span>{bookingDetails.tickets} Tickets</span>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Price Details</h3>
              <div className="flex justify-between">
                <span>Ticket Price × {bookingDetails?.tickets || 0}</span>
                <span>₹{((bookingDetails?.total || 0) / (bookingDetails?.tickets || 1)).toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total Amount</span>
                <div className="flex items-center text-lg text-indigo-600">
                  <FaRupeeSign className="mr-1" />
                  {(bookingDetails?.total || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Payment Button */}
            <div className="mt-8">
              <button
                onClick={handlePayment}
                disabled={loading || !bookingDetails?.total}
                className={`w-full py-3 px-4 rounded-md text-white font-medium ${
                  loading || !bookingDetails?.total
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } transition-colors duration-200 flex items-center justify-center`}
              >
                {loading ? (
                  <span className="flex items-center">
                    Processing...
                    <svg className="animate-spin ml-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                ) : (
                  <span className="flex items-center">
                    Pay Now
                    <FaRupeeSign className="ml-2" />
                    {(bookingDetails?.total || 0).toFixed(2)}
                  </span>
                )}
              </button>
            </div>

            {/* Security Note */}
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>Secure payment powered by Razorpay</p>
              <p className="mt-1">Your payment information is encrypted and secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage; 