import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { FaCalendarAlt, FaMapMarkerAlt, FaUsers, FaTrash, FaEye, FaPlus, FaGlobe } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL;

const MyEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please login to view your events');
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/events/my-events`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data?.data?.events) {
        setEvents(response.data.data.events);
      } else {
        setError('Unable to load events');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setError('Please login to view your events');
        navigate('/login');
      } else if (error.response?.status === 403) {
        setError('You do not have permission to view events');
      } else {
        setError('Failed to load your events');
      }
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (eventId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to publish events');
        navigate('/login');
        return;
      }

      // Split token if it's too long
      const tokenHeader = token.length > 1000 ? token.substring(0, 1000) : token;

      await axios.patch(
        `${API_URL}/events/${eventId}/publish`,
        {},
        {
          headers: {
            Authorization: `Bearer ${tokenHeader}`
          }
        }
      );
      toast.success('Event published successfully');
      fetchEvents(); // Refresh the events list
    } catch (error) {
      console.error('Publish error:', error);
      toast.error(error.response?.data?.message || 'Failed to publish event');
    }
  };

  useEffect(() => {
    if (error) {
      toast.error(error, {
        toastId: 'myEventsError',
      });
    }
  }, [error]);

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/events/${eventId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        toast.success('Event deleted successfully', {
          toastId: 'deleteSuccess',
        });
        fetchEvents();
      } catch (error) {
        toast.error('Failed to delete event', {
          toastId: 'deleteError',
        });
      }
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Events</h1>
        <Link
          to="/create-event"
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Create Event
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div key={event._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="relative h-48 overflow-hidden">
              {event.image ? (
                <img
                  src={event.image.startsWith('data:') ? event.image : `data:image/jpeg;base64,${event.image}`}
                  alt={event.title}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/default-event.jpg';
                  }}
                />
              ) : (
                <img
                  src="/default-event.jpg"
                  alt="Default event"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  event.status === 'published' ? 'bg-green-100 text-green-800' :
                  event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {event.status}
                </span>
              </div>
            </div>

            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">{event.title}</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <FaCalendarAlt className="mr-2" />
                  <span>{new Date(event.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <FaMapMarkerAlt className="mr-2" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center">
                  <FaUsers className="mr-2" />
                  <span>{event.capacity} seats</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <div className="space-x-2">
                  <button
                    onClick={() => navigate(`/events/${event._id}`)}
                    className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200"
                  >
                    <FaEye className="mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(event._id)}
                    className="inline-flex items-center px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                  >
                    <FaTrash className="mr-1" />
                    Delete
                  </button>
                </div>
                {event.status === 'draft' && (
                  <button
                    onClick={() => handlePublish(event._id)}
                    className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Publish
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-600 text-lg">You haven't created any events yet.</p>
            <Link
              to="/create-event"
              className="inline-block mt-4 text-indigo-600 hover:text-indigo-700"
            >
              Create your first event
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyEvents; 