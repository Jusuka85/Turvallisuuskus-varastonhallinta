import React, { useState, useEffect, useCallback } from 'react';
import { QrCode, ClipboardList, History, Search, RefreshCw, AlertCircle, Printer, ArrowDownLeft, ArrowUpRight, Plus, Wrench, Maximize, Minimize, CheckCircle } from 'lucide-react';
import { InventoryItem, UsageLog, AppView, Organization } from './types';
import { api } from './services/api';
import QRScanner from './components/QRScanner';
import UsageModal from './components/UsageModal';
import LabelPrinter from './components/LabelPrinter';
import OrganizationSelector from './components/OrganizationSelector';
import UserNameSelector from './components/UserNameSelector';

const STORAGE_ORG_KEY = 'rescue_inventory_org';
const STORAGE_USER_KEY = 'rescue_inventory_last_user';
const STORAGE_USER_MODE_KEY = 'rescue_inventory_user_mode';

const App: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(() => {
    return localStorage.getItem(STORAGE_ORG_KEY) as Organization | null;
  });
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_USER_KEY);
  });
  const [isUserMode, setIsUserMode] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_USER_MODE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [view, setView] = useState<AppView>(AppView.DASHBOARD);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  const [logoClicks, setLogoClicks] = useState(0);
  const [logoTimeout, setLogoTimeout] = useState<NodeJS.Timeout | null>(null);

  // State for Kiosk Mode Success Overlay
  const [showSyncSuccess, setShowSyncSuccess] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      // Load inventory first to ensure main view works
      const itemsData = await api.getInventory();
      setItems(itemsData);
      
      // Load logs separately so one failure doesn't block the other
      try {
        const logsData = await api.getLogs();
        setLogs(logsData);
      } catch (e) {
        console.warn("Could not load logs", e);
      }
      
    } catch (e) {
      console.error(e);
      setStatusMsg({ 
        type: 'error', 
        text: 'Yhteysvirhe. Tarkista että Google Script on julkaistu "Anyone" -oikeuksilla.' 
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle QR Scan Result
  const handleScanSuccess = (decodedText: string) => {
    // Attempt to find item by QR code
    // Matches either the explicit qrCode field OR the row ID
    const found = items.find(i => i.qrCode === decodedText || i.id === decodedText);
    
    if (found) {
      setSelectedItem(found);
      // If NOT in simple/kiosk mode, switch back to dashboard to show modal over it
      // If in SIMPLE_SCANNER mode, we stay in that view, but the conditional rendering
      // will hide the scanner and show the modal.
      if (view !== AppView.SIMPLE_SCANNER) {
        setView(AppView.DASHBOARD);
      }
    } else {
      alert(`Tuotetta koodilla "${decodedText}" ei löytynyt.`);
      if (view !== AppView.SIMPLE_SCANNER) {
        setView(AppView.DASHBOARD);
      }
    }
  };

  const handleOrganizationSelect = (org: Organization) => {
    setOrganization(org);
    localStorage.setItem(STORAGE_ORG_KEY, org);
  };

  const handleUserNameSelect = (name: string) => {
    setUserName(name);
    localStorage.setItem(STORAGE_USER_KEY, name);
  };

  const toggleUserMode = () => {
    const newMode = !isUserMode;
    setIsUserMode(newMode);
    localStorage.setItem(STORAGE_USER_MODE_KEY, String(newMode));
    if (newMode) setView(AppView.DASHBOARD);
  };

  const handleLogoClick = () => {
    if (logoTimeout) clearTimeout(logoTimeout);
    
    const newCount = logoClicks + 1;
    if (newCount >= 10) {
      toggleUserMode();
      setLogoClicks(0);
      setLogoTimeout(null);
    } else {
      setLogoClicks(newCount);
      const timeout = setTimeout(() => {
        setLogoClicks(0);
        setLogoTimeout(null);
      }, 3000);
      setLogoTimeout(timeout);
    }
  };

  const handleTransaction = async (qty: number, user: string, actionType: 'USE' | 'RESTOCK' | 'RETURN' | 'CORRECTION') => {
    if (!selectedItem) return;
    setIsSubmitting(true);
    
    const userWithOrg = organization ? `[${organization}] ${user}` : user;
    const success = await api.logUsage(selectedItem.id, qty, userWithOrg, actionType);
    
    if (success) {
      await loadData(); // Refresh data immediately
      
      if (view === AppView.SIMPLE_SCANNER) {
        // KIOSK MODE FLOW
        setSelectedItem(null); // Close modal
        setShowSyncSuccess(true); // Show big success screen
        
        // Hide success screen after delay and let Scanner remount
        setTimeout(() => {
          setShowSyncSuccess(false);
        }, 2000);
      } else {
        // STANDARD FLOW
        setStatusMsg({ type: 'success', text: 'Kirjaus tallennettu onnistuneesti!' });
        setSelectedItem(null);
        setTimeout(() => setStatusMsg(null), 5000);
      }
    } else {
      setStatusMsg({ type: 'error', text: 'Tallennus epäonnistui. Tarkista yhteys.' });
    }
    
    setIsSubmitting(false);
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderLogIcon = (action: string) => {
    switch(action) {
      case 'USE': return <ArrowUpRight size={16} className="text-red-500" />;
      case 'RETURN': return <ArrowDownLeft size={16} className="text-blue-500" />;
      case 'RESTOCK': return <Plus size={16} className="text-green-500" />;
      case 'CORRECTION': return <Wrench size={16} className="text-amber-500" />;
      case 'REPORT_BROKEN': return <AlertCircle size={16} className="text-purple-500" />;
      default: return <div />;
    }
  };

  const getActionLabel = (action: string) => {
    switch(action) {
      case 'USE': return 'Käyttö';
      case 'RETURN': return 'Palautus';
      case 'RESTOCK': return 'Täydennys';
      case 'CORRECTION': return 'Korjaus';
      case 'REPORT_BROKEN': return 'Rikki';
      default: return action;
    }
  }

  // --- KIOSK MODE VIEW ---
  if (view === AppView.SIMPLE_SCANNER) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* Setup Gates */}
        {!organization && <OrganizationSelector onSelect={handleOrganizationSelect} />}
        {organization && !userName && <UserNameSelector organization={organization} onSelect={handleUserNameSelect} />}

        {/* Success Overlay */}
        {showSyncSuccess && (
          <div className="absolute inset-0 z-[60] bg-green-600 flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
            <CheckCircle size={80} className="mb-4 animate-bounce" />
            <h2 className="text-3xl font-bold text-center">Synkronointi onnistunut</h2>
            <p className="mt-2 opacity-90">Valmis seuraavaan...</p>
          </div>
        )}

        {/* Modal handles its own overlay. If item is selected, we hide scanner to save resources/conflicts */}
        {!selectedItem && !showSyncSuccess && (
          <QRScanner 
            onScanSuccess={handleScanSuccess} 
            onClose={() => setView(AppView.DASHBOARD)} 
          />
        )}

        {/* Custom Header for Kiosk Mode (Overlaying Scanner if needed, or if Scanner has its own header) */}
        {!selectedItem && !showSyncSuccess && (
           <div className="absolute top-4 right-4 z-[60]">
             <button 
               onClick={() => setView(AppView.DASHBOARD)}
               className="bg-black/50 text-white p-3 rounded-full backdrop-blur-md border border-white/20 hover:bg-black/70"
               title="Poistu Kioski-tilasta"
             >
               <Minimize size={24} />
             </button>
           </div>
        )}

        {selectedItem && (
          <div className="relative z-[55]">
            <UsageModal 
              item={selectedItem}
              onConfirm={handleTransaction}
              onCancel={() => setSelectedItem(null)}
              isSubmitting={isSubmitting}
              initialUser={userName || undefined}
              isUserMode={isUserMode}
            />
          </div>
        )}
      </div>
    );
  }

  // --- STANDARD DASHBOARD VIEW ---
  return (
    <div className="min-h-screen pb-20 max-w-lg mx-auto bg-gray-50 shadow-2xl overflow-hidden relative border-x border-gray-200">
      {/* Setup Gates */}
      {!organization && <OrganizationSelector onSelect={handleOrganizationSelect} />}
      {organization && !userName && <UserNameSelector organization={organization} onSelect={handleUserNameSelect} />}

      {/* Header */}
      <header className="bg-white text-gray-800 p-6 shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="flex justify-between items-start mb-4">
           <div>
             {/* Logo image */}
             <img 
               src="/logo.png" 
               alt="Turvallisuuskeskus" 
               className="h-12 object-contain mb-3 cursor-default select-none active:opacity-50" 
               onClick={handleLogoClick}
             />
             <h1 className="text-2xl font-bold tracking-tight text-gray-900">Harjoitusalue</h1>
             <div 
               className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 cursor-pointer hover:opacity-70 transition-opacity"
               onClick={() => {
                 setOrganization(null);
                 setUserName(null);
               }}
               title="Vaihda tietoja"
             >
               <div className="flex items-center gap-1.5">
                 <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                 <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">{organization || 'Valitse organisaatio'}</p>
               </div>
               {userName && (
                 <div className="flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                   <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">{userName}</p>
                 </div>
               )}
             </div>
           </div>
           <div className="flex gap-2">
            {!isUserMode && (
              <>
                <button 
                    onClick={() => setView(AppView.SIMPLE_SCANNER)} 
                    className="p-2 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-full transition-colors"
                    title="Kioski-tila (Vain skannaus)"
                  >
                   <Maximize size={20} />
                 </button>
                 <button 
                    onClick={() => setView(AppView.PRINT_LABELS)} 
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Tulosta QR-tarrat"
                  >
                   <Printer size={20} />
                 </button>
              </>
            )}
             <button onClick={loadData} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
               <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
             </button>
           </div>
        </div>

        {/* Stats Summary - Hidden in User Mode */}
        {!isUserMode && (
          <div className="flex gap-4">
            <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-3 flex-1">
               <span className="block text-2xl font-bold text-gray-900">{items.length}</span>
               <span className="text-xs text-cyan-800 font-medium">Nimikettä</span>
            </div>
             <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-3 flex-1">
               <span className="block text-2xl font-bold text-gray-900">{logs.length}</span>
               <span className="text-xs text-cyan-800 font-medium">Tapahtumaa</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="p-4">
        
        {/* Status Message Toast */}
        {statusMsg && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-3 text-sm font-medium animate-bounce-in
            ${statusMsg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <AlertCircle size={20} className="flex-shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {view === AppView.DASHBOARD && (
          <div className="space-y-4">
            
            {/* Quick Action: Scan */}
            <button
              onClick={() => setView(AppView.SCANNER)}
              className="w-full bg-gray-900 text-white p-6 rounded-xl shadow-lg flex items-center justify-center gap-4 hover:bg-gray-800 transition-transform active:scale-95"
            >
              <QrCode size={32} />
              <div className="text-left">
                <span className="block text-lg font-bold">Skannaa tuote</span>
                <span className="text-gray-400 text-sm">Käytä kameraa kirjaukseen</span>
              </div>
            </button>

            {/* Inventory List Header & Search */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-bold text-gray-800">Varastotilanne</h2>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Etsi tuotetta..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {loading && items.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">Ladataan...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    {statusMsg?.type === 'error' ? 'Ei yhteyttä tietokantaan.' : 'Ei tuotteita tai haku ei tuottanut tuloksia.'}
                  </div>
                ) : (
                  filteredItems.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedItem(item)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center active:bg-gray-50 cursor-pointer"
                    >
                      <div>
                        <h3 className="font-semibold text-gray-800">{item.name}</h3>
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md mt-1">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-mono font-bold ${item.quantity < 5 ? 'text-red-500' : 'text-gray-800'}`}>
                          {item.quantity}
                        </div>
                        <span className="text-xs text-gray-400">{item.unit}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {view === AppView.LOGS && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Käyttöhistoria</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
              {logs.map((log) => (
                <div key={log.id} className="p-4 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {renderLogIcon(log.action)}
                      <span className="font-medium text-gray-800">{log.itemName}</span>
                    </div>
                    <div className="text-sm text-gray-500 flex flex-col sm:flex-row sm:gap-2">
                       <span className="text-xs font-semibold bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 w-fit">{getActionLabel(log.action)}</span>
                       <span className="flex items-center gap-1">{log.user}</span>
                       <span className="hidden sm:inline text-gray-300">•</span>
                       <span className="text-xs text-gray-400 mt-0.5 sm:mt-0">{new Date(log.timestamp).toLocaleString('fi-FI')}</span>
                    </div>
                  </div>
                  <div className={`font-mono font-bold ${log.amountChanged < 0 ? 'text-red-500' : 'text-green-600'} ${log.action === 'CORRECTION' ? 'text-amber-600' : ''}`}>
                    {log.amountChanged > 0 ? '+' : ''}{log.amountChanged}
                  </div>
                </div>
              ))}
              {logs.length === 0 && <div className="p-6 text-center text-gray-400">Ei historiaa.</div>}
            </div>
          </div>
        )}

      </main>

      {/* Navigation Bar - Hidden in User Mode */}
      {!isUserMode && (
        <nav className="fixed bottom-0 w-full max-w-lg bg-white border-t border-gray-200 flex justify-around p-2 pb-4 z-20">
          <button 
            onClick={() => setView(AppView.DASHBOARD)}
            className={`p-2 flex flex-col items-center gap-1 min-w-[64px] ${view === AppView.DASHBOARD ? 'text-cyan-600' : 'text-gray-400'}`}
          >
            <ClipboardList size={24} />
            <span className="text-[10px] font-medium">Varasto</span>
          </button>
          
          <div className="relative -top-6">
            <button 
              onClick={() => setView(AppView.SCANNER)}
              className="bg-gray-900 text-white p-4 rounded-full shadow-lg hover:bg-gray-800 hover:scale-105 transition-all"
            >
              <QrCode size={28} />
            </button>
          </div>

          <button 
            onClick={() => setView(AppView.LOGS)}
            className={`p-2 flex flex-col items-center gap-1 min-w-[64px] ${view === AppView.LOGS ? 'text-cyan-600' : 'text-gray-400'}`}
          >
            <History size={24} />
            <span className="text-[10px] font-medium">Logi</span>
          </button>
        </nav>
      )}

      {/* Floating Scan Button for User Mode */}
      {isUserMode && view === AppView.DASHBOARD && (
        <button 
          onClick={() => setView(AppView.SCANNER)}
          className="fixed bottom-8 right-8 bg-gray-900 text-white p-5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all z-30 border-4 border-white"
        >
          <QrCode size={32} />
        </button>
      )}

      {/* Overlays */}
      {view === AppView.SCANNER && (
        <QRScanner 
          onScanSuccess={handleScanSuccess} 
          onClose={() => setView(AppView.DASHBOARD)} 
        />
      )}

      {view === AppView.PRINT_LABELS && (
        <LabelPrinter 
          items={items} 
          onClose={() => setView(AppView.DASHBOARD)} 
        />
      )}

      {selectedItem && (
        <UsageModal 
          item={selectedItem}
          onConfirm={handleTransaction}
          onCancel={() => setSelectedItem(null)}
          isSubmitting={isSubmitting}
          initialUser={userName || undefined}
          isUserMode={isUserMode}
        />
      )}
    </div>
  );
};

export default App;
