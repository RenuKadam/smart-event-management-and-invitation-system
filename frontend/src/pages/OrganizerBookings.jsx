import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaEnvelope, FaTicketAlt, FaCheck, FaTimes } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL;

const OrganizerBookings = () => {
  const { eventId } = useParams();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, [eventId]);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/bookings/event/${eventId}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setBookings(response.data.data.bookings);
      }
    } catch (error) {
      toast.error('Failed to fetch bookings');
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitationCode = async (bookingId) => {
    try {
      setSendingInvite(bookingId);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/bookings/${bookingId}/send-invitation`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success('Invitation code sent successfully');
        // Update the booking in the list
        setBookings(bookings.map(booking => 
          booking._id === bookingId 
            ? { ...booking, invitationSent: true }
            : booking
        ));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send invitation code');
    } finally {
      setSendingInvite(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Event Bookings</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tickets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr key={booking._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {booking.user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {booking.user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaTicketAlt className="text-gray-400 mr-2" />
                      <span>{booking.tickets}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {booking.status === 'confirmed' ? (
                      <div className="flex items-center text-green-600">
                        <FaCheck className="mr-1" />
                        Paid
                      </div>
                    ) : (
                      <div className="flex items-center text-yellow-600">
                        <FaTimes className="mr-1" />
                        Pending
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {booking.qrCode?.scanned ? (
                      <div className="flex items-center text-green-600">
                        <FaCheck className="mr-1" />
                        <span>
                          Attended at {new Date(booking.qrCode.scannedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ) : booking.status === 'confirmed' ? (
                      <div className="flex items-center text-gray-500">
                        <span>Not attended yet</span>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => sendInvitationCode(booking._id)}
                        disabled={sendingInvite === booking._id || booking.invitationSent}
                        className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md 
                          ${booking.invitationSent
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'text-indigo-600 bg-indigo-100 hover:bg-indigo-200'}`}
                      >
                        {sendingInvite === booking._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                        ) : (
                          <>
                            <FaEnvelope className="mr-2" />
                            {booking.invitationSent ? 'Invitation Sent' : 'Send Invitation'}
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrganizerBookings; 