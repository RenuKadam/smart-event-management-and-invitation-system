import React from 'react';
import PropTypes from 'prop-types';

const QRCodeDisplay = ({ qrCodeData, ticketId }) => {
  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-2">Your Event Ticket</h3>
      <div className="mb-4">
        <img
          src={qrCodeData}
          alt="Event QR Code"
          className="w-64 h-64"
        />
      </div>
      <p className="text-sm text-gray-600">Ticket ID: {ticketId}</p>
      <p className="text-xs text-gray-500 mt-2">
        Present this QR code at the event entrance
      </p>
      <button
        onClick={() => window.print()}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Print Ticket
      </button>
    </div>
  );
};

QRCodeDisplay.propTypes = {
  qrCodeData: PropTypes.string.isRequired,
  ticketId: PropTypes.string.isRequired
};

export default QRCodeDisplay; 