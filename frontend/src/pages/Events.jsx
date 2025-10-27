import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    sort: 'date',
    page: 1,
    limit: 9
  });
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to view events');
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/events`, {
        params: filters,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data?.data?.events) {
        setEvents(response.data.data.events);
        setTotalPages(response.data.pagination?.pages || 1);
      } else {
        setEvents([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      if (error.response?.status === 401) {
        toast.error('Please login to view events');
        navigate('/login');
      } else {
        toast.error('Failed to load events');
      }
      setEvents([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
      page: 1 // Reset to first page when filter changes
    });
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
      <h1 className="text-3xl font-bold mb-8">Upcoming Events</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="input"
            >
              <option value="">All Categories</option>
              <option value="concert">Concert</option>
              <option value="conference">Conference</option>
              <option value="workshop">Workshop</option>
              <option value="exhibition">Exhibition</option>
              <option value="sports">Sports</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={filters.date || ''}
              onChange={handleFilterChange}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search events..."
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No events found matching your criteria.</p>
          {user?.role === 'organizer' && (
            <Link to="/create-event" className="btn btn-primary mt-4">
              Create an Event
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event._id} className="card hover:shadow-lg transition-shadow">
              <div className="aspect-w-16 aspect-h-9 mb-4">
                <img
                  src={event.image ? `data:image/jpeg;base64,${event.image}` : '/default-event.jpg'}
                  alt={event.title}
                  className="object-cover rounded-lg"
                />
              </div>
              <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
              <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
              <div className="flex justify-between items-center mb-4">
                <p className="text-gray-600">
                  Price: ₹{event.price}
                </p>
                <span className="text-sm text-gray-500">
                  {format(new Date(event.date), 'MMM d, yyyy')}
                </span>
              </div>
              <Link
                to={`/events/${event._id}`}
                className="btn btn-primary w-full text-center"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Events; 