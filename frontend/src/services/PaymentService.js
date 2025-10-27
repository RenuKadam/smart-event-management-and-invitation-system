import axios from 'axios';
import { toast } from 'react-toastify';

// Safely get environment variables with fallbacks
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized error (e.g., redirect to login)
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Keep track of whether an error message is currently being shown
let isShowingError = false;
let razorpayScriptLoaded = false;
let razorpayInitAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Helper function to show error toast
const showErrorToast = (message) => {
  if (!isShowingError) {
    isShowingError = true;
    toast.error(message, {
      onClose: () => {
        isShowingError = false;
      },
      autoClose: 5000
    });
  }
};

console.log('Payment Service Initialized with:', {
  API_URL,
  RAZORPAY_KEY_ID: RAZORPAY_KEY_ID ? '***' : 'missing'
});

// Load Razorpay script with SameSite attribute
const loadRazorpayScript = async () => {
  if (razorpayScriptLoaded) {
    return true;
  }

  if (razorpayInitAttempts >= MAX_INIT_ATTEMPTS) {
    showErrorToast('Unable to initialize payment service after multiple attempts');
    return false;
  }

  razorpayInitAttempts++;

  return new Promise((resolve) => {
    // Remove any existing Razorpay scripts
    const existingScript = document.querySelector('script[src*="razorpay"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log('Razorpay script loaded successfully');
      razorpayScriptLoaded = true;
      resolve(true);
    };

    script.onerror = (error) => {
      console.error('Failed to load Razorpay script:', {
        attempt: razorpayInitAttempts,
        error: error.message
      });
      razorpayScriptLoaded = false;
      resolve(false);
    };

    document.body.appendChild(script);
  });
};

// Initialize payment with improved error handling
export const initializePayment = async (bookingData) => {
  try {
    if (!RAZORPAY_KEY_ID) {
      showErrorToast('Payment service configuration is missing');
      throw new Error('Missing Razorpay Key ID');
    }

    const token = localStorage.getItem('token');
    if (!token) {
      showErrorToast('Please log in to continue');
      throw new Error('Authentication required');
    }

    // Set auth token for all requests
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Load Razorpay script with retry logic
    let scriptLoaded = false;
    for (let i = 0; i < MAX_INIT_ATTEMPTS && !scriptLoaded; i++) {
      scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        console.log(`Retrying script load, attempt ${i + 1} of ${MAX_INIT_ATTEMPTS}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
      }
    }

    if (!scriptLoaded) {
      showErrorToast('Payment service is currently unavailable');
      throw new Error('Failed to load payment service');
    }

    // Create order with improved error handling
    console.log('Creating payment order for booking:', bookingData.bookingId);
    const orderResponse = await axiosInstance.post('/payments/create-order', {
      bookingId: bookingData.bookingId
    });

    if (!orderResponse.data.success) {
      showErrorToast(orderResponse.data.message || 'Unable to create payment order');
      throw new Error(orderResponse.data.message || 'Failed to create order');
    }

    const { order } = orderResponse.data;
    console.log('Payment order created successfully:', order.id);

    return new Promise((resolve, reject) => {
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Occasion Hub',
        description: `Booking for ${bookingData.eventName}`,
        order_id: order.id,
        prefill: {
          name: bookingData.userName,
          email: bookingData.userEmail,
          contact: bookingData.userPhone
        },
        theme: {
          color: '#4F46E5'
        },
        modal: {
          ondismiss: () => {
            showErrorToast('Payment cancelled');
            reject(new Error('Payment cancelled by user'));
          },
          escape: false,
          backdropClose: false,
          confirm_close: true
        },
        handler: async (response) => {
          try {
            console.log('Processing payment verification...');
            const verificationResponse = await axiosInstance.post('/payments/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: bookingData.bookingId
            });

            if (verificationResponse.data.success) {
              toast.success('Payment successful!');
              resolve(verificationResponse.data);
            } else {
              showErrorToast(verificationResponse.data.message || 'Payment verification failed');
              reject(new Error('Payment verification failed'));
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            showErrorToast(error.response?.data?.message || 'Payment verification failed');
            reject(error);
          }
        }
      };

      try {
        console.log('Opening Razorpay payment modal...');
        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.on('payment.failed', (response) => {
          const errorMessage = response.error.description || 'Payment failed';
          console.error('Payment failed:', response.error);
          showErrorToast(errorMessage);
          reject(new Error(errorMessage));
        });
        razorpayInstance.open();
      } catch (error) {
        console.error('Payment modal error:', error);
        showErrorToast('Failed to initialize payment modal');
        reject(error);
      }
    });
  } catch (error) {
    console.error('Payment initialization error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.status === 503) {
      showErrorToast('Payment service is temporarily unavailable. Please try again later.');
    } else if (error.response?.status === 404) {
      showErrorToast('Booking not found');
    } else if (!error.message.includes('cancelled')) {
      showErrorToast(error.response?.data?.message || 'Unable to process payment');
    }
    throw error;
  }
};

// Get payment history
export const getPaymentHistory = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token is missing');
    }

    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const response = await axiosInstance.get('/payments/history');
    return response.data;
  } catch (error) {
    console.error('Payment history error:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch payment history');
  }
};

// Export the axios instance for reuse
export { axiosInstance };

class PaymentService {
  static async createPaymentIntent(bookingData) {
    try {
      const response = await axios.post(`${API_URL}/payments/create-payment-intent`, bookingData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  static async confirmPayment(paymentIntentId) {
    try {
      const response = await axios.post(`${API_URL}/payments/confirm-payment`, {
        paymentIntentId
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  static async getPaymentHistory() {
    try {
      const response = await axios.get(`${API_URL}/payments/history`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default PaymentService; 