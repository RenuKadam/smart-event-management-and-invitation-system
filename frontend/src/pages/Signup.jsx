import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    role: 'participant',
    aadhaarCard: {
      number: ''
    },
    address: {
      street: '',
      city: '',
      state: '',
      pincode: ''
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Basic validation
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.phoneNumber) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Aadhaar validation
      if (!/^\d{12}$/.test(formData.aadhaarCard.number)) {
        throw new Error('Please enter a valid 12-digit Aadhaar number');
      }

      // Pincode validation
      if (!/^\d{6}$/.test(formData.address.pincode)) {
        throw new Error('Please enter a valid 6-digit pincode');
      }

      const { confirmPassword, ...signupData } = formData;
      await signup(signupData);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-container">
        <div>
          <h2 className="auth-heading">
            Create your account
          </h2>
          <p className="auth-subheading">
            Or{' '}
            <Link to="/login" className="auth-link">
              sign in to your account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* Basic Information */}
            <div>
              <label htmlFor="name" className="auth-label">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="auth-input"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div className="mt-4">
              <label htmlFor="email" className="auth-label">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="auth-input"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="mt-4">
              <label htmlFor="phoneNumber" className="auth-label">Phone Number</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                required
                className="auth-input"
                placeholder="Phone Number"
                value={formData.phoneNumber}
                onChange={handleChange}
              />
            </div>

            {/* Aadhaar Card */}
            <div className="mt-4">
              <label htmlFor="aadhaarCard.number" className="auth-label">Aadhaar Card Number</label>
              <input
                id="aadhaarCard.number"
                name="aadhaarCard.number"
                type="text"
                required
                maxLength="12"
                className="auth-input"
                placeholder="Aadhaar Card Number (12 digits)"
                value={formData.aadhaarCard.number}
                onChange={handleChange}
              />
            </div>

            {/* Address Fields */}
            <div className="mt-4">
              <label htmlFor="address.street" className="auth-label">Street Address</label>
              <input
                id="address.street"
                name="address.street"
                type="text"
                required
                className="auth-input"
                placeholder="Street Address"
                value={formData.address.street}
                onChange={handleChange}
              />
            </div>
            <div className="mt-4">
              <label htmlFor="address.city" className="auth-label">City</label>
              <input
                id="address.city"
                name="address.city"
                type="text"
                required
                className="auth-input"
                placeholder="City"
                value={formData.address.city}
                onChange={handleChange}
              />
            </div>
            <div className="mt-4">
              <label htmlFor="address.state" className="auth-label">State</label>
              <input
                id="address.state"
                name="address.state"
                type="text"
                required
                className="auth-input"
                placeholder="State"
                value={formData.address.state}
                onChange={handleChange}
              />
            </div>
            <div className="mt-4">
              <label htmlFor="address.pincode" className="auth-label">PIN Code</label>
              <input
                id="address.pincode"
                name="address.pincode"
                type="text"
                required
                maxLength="6"
                className="auth-input"
                placeholder="PIN Code"
                value={formData.address.pincode}
                onChange={handleChange}
              />
            </div>

            {/* Password Fields */}
            <div className="mt-4">
              <label htmlFor="password" className="auth-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="auth-input"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div className="mt-4">
              <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="auth-input"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="auth-button"
              disabled={isLoading}
            >
              {isLoading ? 'Signing up...' : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup; 