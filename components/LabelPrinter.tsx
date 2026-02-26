import React from 'react';
import QRCode from 'react-qr-code';
import { InventoryItem } from '../types';
import { ArrowLeft, Printer } from 'lucide-react';

interface LabelPrinterProps {
  items: InventoryItem[];
  onClose: () => void;
}

const LabelPrinter: React.FC<LabelPrinterProps> = ({ items, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header - Hidden when printing */}
      <div className="no-print sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft size={20} />
          Takaisin
        </button>
        <div className="flex gap-4 items-center">
          <span className="text-sm text-gray-500 hidden sm:inline">Vinkki: Säädä tulostusasetuksista "Sivunsovitus" tarvittaessa.</span>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm"
          >
            <Printer size={20} />
            Tulosta sivu
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <div className="p-8 max-w-5xl mx-auto">
        <div className="no-print mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800">Tulostettavat Tarrat</h2>
          <p className="text-gray-500">Tämä sivu on muotoiltu tulostusta varten. Alla näet esikatselun.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="border-2 border-gray-800 rounded-lg p-4 flex flex-col items-center justify-center text-center print-break-inside-avoid page-break-inside-avoid"
              style={{ minHeight: '250px' }}
            >
              <div className="mb-2 w-full">
                 <h3 className="text-lg font-bold text-black leading-tight mb-1">{item.name}</h3>
                 <span className="text-xs uppercase tracking-wider text-gray-600 border border-gray-400 px-2 py-0.5 rounded-full">
                   {item.category}
                 </span>
              </div>
              
              <div className="bg-white p-2">
                {/* 
                  QR Code Value Priority: 
                  1. item.qrCode (Explicit code set in sheet)
                  2. item.id (Fallback to DB ID if no explicit code)
                */}
                <QRCode 
                  value={item.qrCode || item.id} 
                  size={120} 
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>

              <div className="mt-2 text-xs font-mono text-gray-500">
                {item.qrCode || item.id}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LabelPrinter;