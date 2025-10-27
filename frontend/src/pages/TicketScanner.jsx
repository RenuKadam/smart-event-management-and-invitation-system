import React, { useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL;

const TicketScanner = () => {
  const [scanning, setScanning] = useState(true);
  const [ticketId, setTicketId] = useState(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    // Create QR Scanner
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 5,
    });

    const success = async (decodedText) => {
      try {
        // Extract ticketId from URL
        const url = new URL(decodedText);
        const pathParts = url.pathname.split('/');
        const ticketId = pathParts[pathParts.length - 1];
        
        setTicketId(ticketId);
        setScanning(false);
        scanner.clear();
      } catch (err) {
        toast.error('Invalid QR code');
      }
    };

    const error = (err) => {
      console.warn(err);
    };

    scanner.render(success, error);

    // Cleanup
    return () => {
      scanner.clear();
    };
  }, []);

  const verifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp || !ticketId) {
      toast.error('Please enter OTP');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/tickets/verify-otp`,
        { ticketId, otp },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success('Attendance verified successfully!');
        // Reset for next scan
        setTicketId(null);
        setOtp('');
        setScanning(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTicketId(null);
    setOtp('');
    setScanning(true);
    window.location.reload();
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-white">Scan Event Ticket</h2>
      
      {scanning && (
        <div id="reader" className="mb-4"></div>
      )}

      {ticketId && !scanning && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-white mb-4">Verify Attendance</h3>
          <form onSubmit={verifyOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                maxLength={6}
                required
              />
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Scan Another
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TicketScanner; 