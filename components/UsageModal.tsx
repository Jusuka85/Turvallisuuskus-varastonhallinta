import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { Check, X, AlertTriangle, ArrowDownToLine, ArrowUpFromLine, PlusCircle, Wrench, AlertOctagon } from 'lucide-react';

interface UsageModalProps {
  item: InventoryItem;
  onConfirm: (quantity: number, user: string, actionType: 'USE' | 'RESTOCK' | 'RETURN' | 'CORRECTION' | 'REPORT_BROKEN') => void;
  onCancel: () => void;
  isSubmitting: boolean;
  initialUser?: string;
  isUserMode?: boolean;
  defaultMode?: ActionMode;
}

type ActionMode = 'USE' | 'RETURN' | 'RESTOCK' | 'CORRECTION' | 'REPORT_BROKEN';

const STORAGE_USER_KEY = 'rescue_inventory_last_user';

const UsageModal: React.FC<UsageModalProps> = ({ item, onConfirm, onCancel, isSubmitting, initialUser, isUserMode, defaultMode }) => {
  const [amount, setAmount] = useState<string>('1');
  
  // Initialize user from prop or LocalStorage
  const [user, setUser] = useState<string>(() => {
    return initialUser || localStorage.getItem(STORAGE_USER_KEY) || '';
  });
  
  const [mode, setMode] = useState<ActionMode>(() => {
    return defaultMode || 'USE';
  });
  const [reportNote, setReportNote] = useState<string>('');

  const handleModeChange = (newMode: ActionMode) => {
    setMode(newMode);
    // If switching to correction, set amount to current quantity for easier editing
    // If switching to others, reset to 1
    if (newMode === 'CORRECTION') {
      setAmount(item.quantity.toString());
    } else if (newMode === 'REPORT_BROKEN') {
      setAmount('1');
    } else {
      setAmount('1');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputVal = parseInt(amount, 10);
    if (isNaN(inputVal)) return;
    
    // For standard modes, amount must be positive.
    // For Correction, it can be 0 (if stock is empty).
    if (mode !== 'CORRECTION' && mode !== 'REPORT_BROKEN' && inputVal <= 0) return;
    if (mode === 'CORRECTION' && inputVal < 0) return; // Stock can't be negative
    if (mode === 'REPORT_BROKEN' && inputVal <= 0) return;

    if (!user.trim()) return;

    // Save username to LocalStorage for next time
    localStorage.setItem(STORAGE_USER_KEY, user);

    let finalAmount = 0;

    if (mode === 'USE') {
      finalAmount = -inputVal;
    } else if (mode === 'RETURN' || mode === 'RESTOCK') {
      finalAmount = inputVal;
    } else if (mode === 'REPORT_BROKEN') {
      // Reporting broken doesn't necessarily change stock in this simple logic, 
      // but we could make it -inputVal if we assume they are removed.
      // Let's assume reporting broken REMOVES them from usable stock.
      finalAmount = -inputVal;
    } else if (mode === 'CORRECTION') {
      // Calculate difference: Target - Current
      // Example: Current 12, True Stock (Input) 10. Difference = -2.
      finalAmount = inputVal - item.quantity;
      if (finalAmount === 0) {
        // No change needed
        onCancel();
        return;
      }
    }

    const userWithNote = mode === 'REPORT_BROKEN' && reportNote.trim() 
      ? `${user} (Syy: ${reportNote})` 
      : user;

    onConfirm(finalAmount, userWithNote, mode);
  };

  const currentStock = item.quantity;
  const requested = parseInt(amount) || 0;
  
  const isStockLow = mode === 'USE' && (currentStock - requested < 0);
  
  // Calculate correction difference for display
  const correctionDiff = mode === 'CORRECTION' ? requested - currentStock : 0;

  const getThemeColor = () => {
    switch (mode) {
      case 'USE': return 'bg-red-600';
      case 'RETURN': return 'bg-blue-600';
      case 'RESTOCK': return 'bg-green-600';
      case 'CORRECTION': return 'bg-amber-500';
      case 'REPORT_BROKEN': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getButtonColor = () => {
    switch (mode) {
      case 'USE': return 'bg-red-600 hover:bg-red-700 disabled:bg-red-300';
      case 'RETURN': return 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300';
      case 'RESTOCK': return 'bg-green-600 hover:bg-green-700 disabled:bg-green-300';
      case 'CORRECTION': return 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-black';
      case 'REPORT_BROKEN': return 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300';
    }
  };

  const getTitle = () => {
    const isBorrowable = item.itemType === 'borrowable';
    switch (mode) {
      case 'USE': return isBorrowable ? 'Lainaa Tuote' : 'Kirjaa Otto';
      case 'RETURN': return 'Kirjaa Palautus';
      case 'RESTOCK': return 'Kirjaa Täydennys';
      case 'CORRECTION': return 'Korjaa Saldo';
      case 'REPORT_BROKEN': return 'Raportoi Rikki';
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`p-4 text-white flex justify-between items-center transition-colors duration-300 ${getThemeColor()}`}>
          <h3 className={`text-lg font-bold ${mode === 'CORRECTION' ? 'text-black' : 'text-white'}`}>{getTitle()}</h3>
          <button type="button" onClick={onCancel} className="text-white hover:bg-white/20 rounded-full p-1">
            <X size={20} color={mode === 'CORRECTION' ? 'black' : 'white'} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          {/* Item Info */}
          <div className="mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xl font-bold text-gray-800">{item.name}</h4>
                <p className="text-sm text-gray-500 uppercase tracking-wide">{item.category}</p>
              </div>
              {item.itemType === 'borrowable' && (
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tight">
                  Lainattava
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">Nykyinen varasto:</span>
              <span className={`text-lg font-mono font-bold ${item.quantity < 5 ? 'text-red-500' : 'text-gray-800'}`}>
                {item.quantity} {item.unit}
              </span>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className={`grid ${isUserMode ? 'grid-cols-3' : 'grid-cols-5'} bg-gray-100 p-1 rounded-lg gap-1`}>
            <button
              type="button"
              onClick={() => handleModeChange('USE')}
              className={`py-2 text-[10px] font-medium rounded-md transition-all flex flex-col items-center gap-1
                ${mode === 'USE' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
            >
              <ArrowUpFromLine size={16} />
              {item.itemType === 'borrowable' ? 'Lainaa' : 'Ota'}
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('RETURN')}
              className={`py-2 text-[10px] font-medium rounded-md transition-all flex flex-col items-center gap-1
                ${mode === 'RETURN' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
            >
               <ArrowDownToLine size={16} />
              Palauta
            </button>
            
            <button
              type="button"
              onClick={() => handleModeChange('REPORT_BROKEN')}
              className={`py-2 text-[10px] font-medium rounded-md transition-all flex flex-col items-center gap-1
                ${mode === 'REPORT_BROKEN' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
            >
               <AlertOctagon size={16} />
              Rikki
            </button>

            {!isUserMode && (
              <>
                <button
                  type="button"
                  onClick={() => handleModeChange('RESTOCK')}
                  className={`py-2 text-[10px] font-medium rounded-md transition-all flex flex-col items-center gap-1
                    ${mode === 'RESTOCK' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                >
                   <PlusCircle size={16} />
                  Lisää
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('CORRECTION')}
                  className={`py-2 text-[10px] font-medium rounded-md transition-all flex flex-col items-center gap-1
                    ${mode === 'CORRECTION' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'}`}
                >
                   <Wrench size={16} />
                  Korjaa
                </button>
              </>
            )}
          </div>

          {/* Inputs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mode === 'CORRECTION' ? 'Todellinen määrä hyllyssä' : 
               mode === 'REPORT_BROKEN' ? 'Rikkoutuneiden määrä' : `Määrä (${item.unit})`}
            </label>
            <input
              type="number"
              min={mode === 'CORRECTION' ? "0" : "1"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-center text-3xl font-bold p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none border-gray-300"
              required
            />
            
            {mode === 'REPORT_BROKEN' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Vian kuvaus (vapaaehtoinen)</label>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="Mikä on rikki?"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  rows={2}
                />
              </div>
            )}
            
            {/* Warning / Info Messages */}
            {isStockLow && (
              <div className="mt-2 text-red-500 text-sm flex items-center gap-1 animate-pulse">
                <AlertTriangle size={16} />
                <span>Varoitus: Varasto menee miinukselle!</span>
              </div>
            )}
            
            {mode === 'CORRECTION' && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-100 rounded text-sm text-amber-900">
                <span className="font-semibold">Muutos: </span>
                <span className="font-mono">{correctionDiff > 0 ? '+' : ''}{correctionDiff} {item.unit}</span>
                <p className="text-xs text-amber-700 mt-1">Ohjelma laskee automaattisesti erotuksen.</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Käyttäjä</label>
            <div className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-medium">
              {user}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Peruuta
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !user.trim()}
            className={`flex-1 py-3 px-4 text-white font-medium rounded-lg flex justify-center items-center gap-2 transition-colors ${getButtonColor()}`}
          >
            {isSubmitting ? 'Tallennetaan...' : (
              <>
                <Check size={20} />
                {mode === 'CORRECTION' ? 'Korjaa' : 
                 mode === 'REPORT_BROKEN' ? 'Raportoi' : 'Tallenna'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UsageModal;