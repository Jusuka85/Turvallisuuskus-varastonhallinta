import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // ID of the HTML element
    const elementId = "reader";
    
    // Create instance
    const html5QrCode = new Html5Qrcode(elementId);
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        // Configuration for the scanner
        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        // Start scanning using the back camera (environment)
        await html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            // Success callback
            // Stop scanning immediately to prevent duplicate reads
            html5QrCode.stop().then(() => {
              html5QrCode.clear();
              onScanSuccess(decodedText);
            }).catch(err => {
              console.error("Failed to stop scanner", err);
              onScanSuccess(decodedText);
            });
          },
          (errorMessage) => {
            // Error callback (scanned frame but no QR code found)
            // We ignore this to keep logs clean
          }
        );
      } catch (err) {
        console.error("Error starting scanner", err);
        setScanError("Kameraa ei voitu käynnistää. Varmista, että annoit luvan kameran käyttöön.");
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(startScanner, 100);

    // Cleanup function
    return () => {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().then(() => {
            scannerRef.current?.clear();
          }).catch(err => console.error("Error stopping scanner cleanup", err));
        } else {
           scannerRef.current.clear();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-0">
      <div className="w-full h-full relative flex flex-col">
        
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent text-white">
          <div className="flex items-center gap-2">
            <Camera size={20} />
            <span className="font-bold">Skannaa QR</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/20 rounded-full hover:bg-white/30 backdrop-blur-sm"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Scanner Viewport */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          <div id="reader" className="w-full h-full object-cover"></div>
          
          {/* Visual guide overlay */}
          <div className="absolute inset-0 border-2 border-white/30 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-red-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
          </div>
        </div>

        {/* Error Message */}
        {scanError && (
          <div className="absolute bottom-20 left-4 right-4 bg-red-600 text-white p-4 rounded-lg text-center shadow-lg">
            {scanError}
          </div>
        )}

        {/* Footer Instructions */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent text-center text-white pb-10">
           <p className="text-sm opacity-90">Osoita kamera tuotteen QR-koodiin.</p>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;