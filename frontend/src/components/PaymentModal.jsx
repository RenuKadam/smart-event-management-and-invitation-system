import React, { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { initializePayment } from '../services/PaymentService';
import { toast } from 'react-hot-toast';

const PaymentModal = ({ isOpen, onClose, booking, event }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      
      const bookingData = {
        bookingId: booking._id,
        eventName: event.title,
        amount: event.price * booking.quantity,
        currency: 'INR',
        userName: booking.user.name,
        userEmail: booking.user.email,
        userPhone: booking.user.phone || ''
      };

      await initializePayment(bookingData);
      toast.success('Payment successful!');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Payment Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Event:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {event.title}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Tickets:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {booking.quantity}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Price per ticket:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              ₹{event.price}
            </span>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Total Amount:
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                ₹{event.price * booking.quantity}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handlePayment}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal; 