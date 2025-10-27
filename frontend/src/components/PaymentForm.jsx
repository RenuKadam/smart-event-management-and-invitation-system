import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/stripe-js';
import { toast } from 'react-toastify';
import PaymentService from '../services/PaymentService';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4'
      }
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a'
    }
  }
};

const PaymentForm = ({ amount, onSuccess, bookingData }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment intent
      const { clientSecret } = await PaymentService.createPaymentIntent({
        ...bookingData,
        amount
      });

      // Confirm card payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          }
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        toast.error(stripeError.message);
      } else if (paymentIntent.status === 'succeeded') {
        // Confirm payment on backend
        await PaymentService.confirmPayment(paymentIntent.id);
        toast.success('Payment successful!');
        onSuccess(paymentIntent);
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Payment Details
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Amount to pay: ₹{amount}
          </p>
        </div>
        
        <div className="p-4 border rounded-md bg-gray-50 dark:bg-gray-700">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>

        {error && (
          <div className="mt-4 text-red-600 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className={`mt-6 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isProcessing
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200`}
        >
          {isProcessing ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Processing...
            </span>
          ) : (
            'Pay Now'
          )}
        </button>
      </div>
    </form>
  );
};

export default PaymentForm; 