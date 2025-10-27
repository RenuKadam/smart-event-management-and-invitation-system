import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL;

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Initial auth check
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          setUser(response.data.data.user);
        } catch (error) {
          console.error('Auth check error:', error);
          if (error.response?.status === 401) {
            handleLogout();
          }
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/users/login`, {
        email,
        password
      });
      
      const newToken = response.data.token;
      if (!newToken) {
        throw new Error('No token received from server');
      }

      localStorage.setItem('token', newToken);
      setToken(newToken);
      
      // Fetch user data immediately after login
      const userResponse = await axios.get(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${newToken}`
        }
      });
      setUser(userResponse.data.data.user);
      
      toast.success('Logged in successfully');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Failed to login');
      throw error;
    }
  };

  const signup = async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/users/signup`, userData);
      
      const newToken = response.data.token;
      if (!newToken) {
        throw new Error('No token received from server');
      }

      localStorage.setItem('token', newToken);
      setToken(newToken);
      
      // Fetch user data immediately after signup
      const userResponse = await axios.get(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${newToken}`
        }
      });
      setUser(userResponse.data.data.user);
      
      toast.success('Account created successfully');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error.response?.data?.message || 'Failed to create account');
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout: handleLogout
  };

  // Don't render children until initial auth check is complete
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider; 