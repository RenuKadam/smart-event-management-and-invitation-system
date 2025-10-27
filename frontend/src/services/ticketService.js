import axios from 'axios';
import { API_URL } from '../config/constants';

const ticketService = {
  // Generate QR code after payment
  generateQRCode: async (bookingId) => {
    try {
      const response = await axios.get(`${API_URL}/tickets/generate/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Scan QR code (for organizers)
  scanQRCode: async (ticketData) => {
    try {
      const response = await axios.post(
        `${API_URL}/tickets/scan`,
        { ticketData },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get ticket status
  getTicketStatus: async (ticketId) => {
    try {
      const response = await axios.get(`${API_URL}/tickets/status/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default ticketService; 