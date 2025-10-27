import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config/constants';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';

const BookingSuccess = () => {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const response = await axios.get(`${API_URL}/bookings/${bookingId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setBooking(response.data.booking);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching booking:', error);
        toast.error('Error fetching booking details');
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-code');
    if (canvas) {
      const pngUrl = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream');
      
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `event-ticket-${bookingId}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600">Booking Not Found</h2>
          <Link to="/events" className="text-primary-600 hover:text-primary-700">
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-3xl font-extrabold text-gray-900">
              Booking Successful!
            </h2>
            <p className="mt-2 text-lg text-gray-600">
              Thank you for booking. Your ticket details are below.
            </p>
          </div>

          <div className="border-t border-b border-gray-200 py-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Booking ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{booking._id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Event</dt>
                <dd className="mt-1 text-sm text-gray-900">{booking.event?.title}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Number of Tickets</dt>
                <dd className="mt-1 text-sm text-gray-900">{booking.tickets}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                <dd className="mt-1 text-sm text-gray-900">₹{booking.total}</dd>
              </div>
            </dl>
          </div>

          {/* QR Code Section */}
          <div className="mt-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Entry QR Code</h3>
            <div className="flex flex-col items-center justify-center space-y-4">
              <QRCodeSVG
                id="qr-code"
                value={JSON.stringify({
                  bookingId: booking._id,
                  eventId: booking.event?._id,
                  userId: booking.user,
                  tickets: booking.tickets,
                  ticketId: booking.ticketId
                })}
                size={200}
                level="H"
                includeMargin={true}
              />
              <button
                onClick={downloadQRCode}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg
                  className="h-5 w-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download QR Code
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Please show this QR code at the event entrance for entry.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/my-bookings"
              className="text-primary-600 hover:text-primary-700"
            >
              View My Bookings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess; 