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
    const elementId = "reader";
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    const startScanner = async () => {
      try {
        // Ensure element exists
        const element = document.getElementById(elementId);
        if (!element || !isMounted) return;

        html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 10, 
          qrbox: (viewWidth: number, viewHeight: number) => {
            const minEdge = Math.min(viewWidth, viewHeight);
            const size = Math.floor(minEdge * 0.7);
            return { width: size, height: size };
          },
          // Remove fixed aspectRatio to prevent stretching
        };

        await html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          async (decodedText) => {
            if (!isMounted) return;
            
            // Success callback
            try {
              if (html5QrCode && html5QrCode.isScanning) {
                await html5QrCode.stop();
                html5QrCode.clear();
              }
              onScanSuccess(decodedText);
            } catch (err) {
              console.error("Failed to stop scanner", err);
              onScanSuccess(decodedText);
            }
          },
          () => {} // Ignore scan errors
        );
      } catch (err) {
        if (isMounted) {
          console.error("Error starting scanner", err);
          setScanError("Kameraa ei voitu käynnistää. Varmista, että annoit luvan kameran käyttöön.");
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop()
            .then(() => html5QrCode?.clear())
            .catch(err => console.error("Error stopping scanner cleanup", err));
        } else {
          try {
            html5QrCode.clear();
          } catch (e) {
            // Ignore clear errors if already cleared
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-0 overflow-hidden">
      <div className="w-full h-full relative flex flex-col overflow-hidden">
        
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent text-white">
          <div className="flex items-center gap-2">
            <Camera size={20} className="text-cyan-400" />
            <span className="font-bold tracking-tight">Skannaa QR-koodi</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md border border-white/10 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Scanner Viewport */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {/* The reader element needs to be relatively sized for html5-qrcode to inject correctly */}
          <div id="reader" className="w-full h-full [&>video]:object-cover"></div>
          
          {/* Visual guide overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            {/* Corner markers */}
            <div className="relative w-64 h-64">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>
              
              {/* Scanning line animation */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-scan-line"></div>
            </div>
            
            {/* Darkened area outside the scanner box */}
            <div className="absolute inset-0 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"></div>
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