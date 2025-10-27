import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import ticketService from '../services/ticketService';

const QRCodeScanner = () => {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Create QR Scanner
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: {
        width: 250,
        height: 250,
      },
      fps: 5,
    });

    const success = async (decodedText) => {
      scanner.clear();
      try {
        const result = await ticketService.scanQRCode(decodedText);
        setScanResult(result.data);
        setError(null);
      } catch (err) {
        setError(err.message);
        setScanResult(null);
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

  const handleReset = () => {
    window.location.reload(); // Reload to reset scanner
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">Scan Event Ticket</h2>
      
      {!scanResult && !error && (
        <div id="reader" className="mb-4"></div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={handleReset}
            className="ml-4 bg-red-500 text-white px-2 py-1 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {scanResult && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <h3 className="font-bold">Ticket Valid!</h3>
          <p>Ticket ID: {scanResult.ticketId}</p>
          <p>Scanned at: {new Date(scanResult.scannedAt).toLocaleString()}</p>
          <p>Number of tickets: {scanResult.tickets}</p>
          <button
            onClick={handleReset}
            className="mt-4 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Scan Another Ticket
          </button>
        </div>
      )}
    </div>
  );
};

export default QRCodeScanner; 