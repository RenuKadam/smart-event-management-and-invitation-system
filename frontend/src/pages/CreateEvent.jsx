import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaDollarSign, FaUsers, FaImage, FaSave, FaRupeeSign } from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL;

const CreateEvent = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    price: '',
    capacity: '',
    category: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    if (e.target.name === 'image') {
      const file = e.target.files[0];
      if (file) {
        // Check file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
          e.target.value = ''; // Clear the file input
          return;
        }
        setFormData({ ...formData, image: file });
      }
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const validateForm = () => {
    const errors = [];

    // Check required fields
    if (!formData.title.trim()) errors.push('title');
    if (!formData.description.trim()) errors.push('description');
    if (!formData.date) errors.push('date');
    if (!formData.time) errors.push('time');
    if (!formData.endTime) errors.push('end time');
    if (!formData.location.trim()) errors.push('location');
    if (!formData.price || isNaN(formData.price) || Number(formData.price) < 0) errors.push('price');
    if (!formData.capacity || isNaN(formData.capacity) || Number(formData.capacity) < 1) errors.push('capacity');
    if (!formData.category) errors.push('category');

    // Validate time range
    if (formData.time && formData.endTime) {
      const startTime = new Date(`2000-01-01T${formData.time}`);
      const endTime = new Date(`2000-01-01T${formData.endTime}`);
      if (endTime <= startTime) {
        errors.push('end time must be after start time');
      }
    }

    // Check category validity
    const validCategories = ['concert', 'conference', 'workshop', 'exhibition', 'sports', 'other'];
    if (formData.category && !validCategories.includes(formData.category)) {
      errors.push('invalid_category');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const errors = validateForm();
    if (errors.length > 0) {
      if (errors.includes('invalid_category')) {
        toast.error('Please select a valid category');
      } else {
        toast.error(`Please fill in: ${errors.join(', ')}`);
      }
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to create an event');
        return;
      }

      // Create FormData object
      const formDataToSend = new FormData();
      
      // Combine date and time into a single datetime string
      const eventDateTime = new Date(`${formData.date}T${formData.time}`);
      
      // Prepare the event data according to the backend model
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: eventDateTime.toISOString(),
        time: formData.time,
        endTime: formData.endTime,
        location: formData.location.trim(),
        price: Number(formData.price),
        capacity: Number(formData.capacity),
        category: formData.category,
        status: 'draft'
      };

      // Append all fields to FormData
      Object.keys(eventData).forEach(key => {
        formDataToSend.append(key, eventData[key]);
      });

      if (formData.image) {
        formDataToSend.append('image', formData.image);
      }

      const response = await axios.post(`${API_URL}/events`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      
      toast.success('Event created successfully');
      navigate('/my-events');
    } catch (error) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 401) {
        toast.error('Please login to create an event');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to create events');
      } else {
        toast.error('Failed to create event. Please check all fields and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Event</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            name="title"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            value={formData.title}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            required
            rows="4"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FaCalendarAlt className="mr-2" />
              Date
            </label>
            <input
              type="date"
              name="date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={formData.date}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FaClock className="mr-2" />
              Start Time
            </label>
            <input
              type="time"
              name="time"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={formData.time}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 flex items-center">
            <FaClock className="mr-2" />
            End Time
          </label>
          <input
            type="time"
            name="endTime"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            value={formData.endTime}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 flex items-center">
            <FaMapMarkerAlt className="mr-2" />
            Location
          </label>
          <input
            type="text"
            name="location"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            value={formData.location}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FaRupeeSign className="mr-2" />
              Price (₹)
            </label>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaRupeeSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              name="price"
              required
              min="0"
              step="1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={formData.price}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              <FaUsers className="mr-2" />
              Capacity
            </label>
            <input
              type="number"
              name="capacity"
              required
              min="1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={formData.capacity}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            name="category"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="">Select a category</option>
            <option value="concert">Concert</option>
            <option value="conference">Conference</option>
            <option value="workshop">Workshop</option>
            <option value="exhibition">Exhibition</option>
            <option value="sports">Sports</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 flex items-center">
            <FaImage className="mr-2" />
            Event Image
          </label>
          <input
            type="file"
            name="image"
            accept=".jpg,.jpeg,.png,.webp"
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-primary-50 file:text-primary-700
              hover:file:bg-primary-100"
            onChange={handleChange}
          />
          <p className="mt-1 text-sm text-gray-500">Accepted formats: JPEG, PNG, WebP</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          <FaSave className="mr-2" />
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </form>
    </div>
  );
};

export default CreateEvent; 