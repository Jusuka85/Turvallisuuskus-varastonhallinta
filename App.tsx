import React, { useState, useEffect, useCallback } from 'react';
import { QrCode, ClipboardList, History, Search, RefreshCw, AlertCircle, Printer, ArrowDownLeft, ArrowUpRight, Plus, Wrench, Maximize, Minimize, CheckCircle, Library } from 'lucide-react';
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
  const [logFilter, setLogFilter] = useState<'day' | 'month' | 'year' | 'all'>('all');
  const [logSearchTerm, setLogSearchTerm] = useState<string>('');
  const [visibleLogsCount, setVisibleLogsCount] = useState<number>(5);
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

  const handleTransaction = (qty: number, user: string, actionType: 'USE' | 'RESTOCK' | 'RETURN' | 'CORRECTION' | 'REPORT_BROKEN') => {
    if (!selectedItem) return;
    
    // Capture current context
    const itemToLog = selectedItem;
    const userWithOrg = organization ? `[${organization}] ${user}` : user;

    // Update global user name if it was changed in the modal
    if (user && user !== userName) {
      setUserName(user);
      localStorage.setItem(STORAGE_USER_KEY, user);
    }

    // CLOSE MODAL IMMEDIATELY
    setSelectedItem(null);

    if (view === AppView.SIMPLE_SCANNER) {
      setShowSyncSuccess(true);
      // Wait a moment for success animation
      setTimeout(() => setShowSyncSuccess(false), 1500);
    } else {
      setStatusMsg({ type: 'success', text: 'Tallennetaan taustalla...' });
    }

    // BACKGROUND PROCESSING
    (async () => {
      setIsSubmitting(true);
      const success = await api.logUsage(itemToLog.id, qty, userWithOrg, actionType);
      
      if (success) {
        await loadData(); // Refresh data in background
        if (view !== AppView.SIMPLE_SCANNER) {
          setStatusMsg({ type: 'success', text: 'Kirjaus tallennettu!' });
          setTimeout(() => setStatusMsg(null), 3000);
        }
      } else {
        setStatusMsg({ type: 'error', text: 'Tallennus epäonnistui. Tarkista nettiyhteys.' });
      }
      setIsSubmitting(false);
    })();
  };

  const getActiveBorrows = () => {
    if (!userName || !organization) return [];
    const userWithOrg = `[${organization}] ${userName}`.trim();
    
    const borrowMap: Record<string, { item: InventoryItem | undefined, balance: number }> = {};
    
    logs.forEach(log => {
      if (log.user?.trim() !== userWithOrg) return;
      
      // Only use/return actions should affect the personal borrowing balance
      if (log.action !== 'USE' && log.action !== 'RETURN') return;

      if (!borrowMap[log.itemId]) {
        borrowMap[log.itemId] = { 
          item: items.find(i => i.id.toString() === log.itemId.toString()), 
          balance: 0 
        };
      }
      borrowMap[log.itemId].balance += log.amountChanged;
    });
    
    return Object.values(borrowMap)
      .filter(b => b.balance < 0 && b.item && (b.item.itemType?.toLowerCase() === 'borrowable' || b.item.itemType?.toLowerCase() === 'lainattava'))
      .map(b => ({
        ...b.item!,
        borrowedQuantity: Math.abs(b.balance)
      }));
  };

  const handleReturnAll = async () => {
    const activeLoans = getActiveBorrows();
    if (activeLoans.length === 0) return;
    
    if (!confirm(`Haluatko varmasti palauttaa kaikki ${activeLoans.length} lainaa?`)) return;
    
    setIsSubmitting(true);
    const userWithOrg = organization ? `[${organization}] ${userName}` : userName;
    
    try {
      // Log each item as fully returned sequentially
      // Google Apps Script can have issues with many concurrent writes from the same source
      for (const loan of activeLoans) {
        await api.logUsage(loan.id, loan.borrowedQuantity, userWithOrg || 'Tuntematon', 'RETURN');
      }
      
      await loadData();
      setStatusMsg({ type: 'success', text: 'Kaikki lainat palautettu onnistuneesti!' });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (error) {
      console.error(error);
      setStatusMsg({ type: 'error', text: 'Joidenkin lainojen palautus epäonnistui.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredLogs = () => {
    let filtered = logs;
    
    // Time filter
    if (logFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        if (logFilter === 'day') {
          return logDate.toDateString() === now.toDateString();
        }
        if (logFilter === 'month') {
          return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        }
        if (logFilter === 'year') {
          return logDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // Username filter
    if (logSearchTerm.trim()) {
      filtered = filtered.filter(log => 
        log.user?.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        log.itemName.toLowerCase().includes(logSearchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getLogSummaryStats = () => {
    const now = new Date();
    const today = now.toDateString();
    
    // Start of week (Monday)
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const stats = {
      today: 0,
      week: 0,
      month: 0,
      year: 0
    };
    
    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      
      if (logDate.toDateString() === today) stats.today++;
      if (logDate >= startOfWeek) stats.week++;
      if (logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear()) stats.month++;
      if (logDate.getFullYear() === now.getFullYear()) stats.year++;
    });
    
    return stats;
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
        {organization && !userName && (
          <UserNameSelector 
            organization={organization} 
            onSelect={handleUserNameSelect} 
            onBack={() => setOrganization(null)} 
          />
        )}

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
      {organization && !userName && (
        <UserNameSelector 
          organization={organization} 
          onSelect={handleUserNameSelect} 
          onBack={() => setOrganization(null)} 
        />
      )}

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
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">{item.name}</h3>
                          {item.itemType === 'borrowable' && <Library size={12} className="text-blue-500" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1 leading-none">
                          <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] rounded font-bold uppercase tracking-wider">
                            {item.category}
                          </span>
                          {item.itemType === 'borrowable' && (
                            <span className="text-[9px] text-blue-600 font-extrabold uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded">Lainattava</span>
                          )}
                        </div>
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

        {view === AppView.BORROWS && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Omat lainat</h2>
              <div className="flex gap-2">
                {getActiveBorrows().length > 0 && (
                  <button 
                    onClick={handleReturnAll}
                    disabled={isSubmitting}
                    className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-1 rounded-md border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    PALAUTA KAIKKI
                  </button>
                )}
                <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-md tracking-wider">AKTIIVISET</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {getActiveBorrows().length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
                  <Library className="mx-auto mb-3 opacity-20" size={48} />
                  <p className="text-sm">Sinulla ei ole tällä hetkellä aktiivisia lainoja.</p>
                </div>
              ) : (
                getActiveBorrows().map(borrow => (
                  <div 
                    key={borrow.id} 
                    onClick={() => setSelectedItem(borrow)}
                    className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-l-blue-500 border-y border-r border-gray-100 flex justify-between items-center active:bg-gray-50 cursor-pointer"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-800">{borrow.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Lainattu määrä: {borrow.borrowedQuantity} {borrow.unit}</p>
                    </div>
                    <button className="bg-blue-50 text-blue-600 font-bold px-4 py-2 rounded-lg text-sm">
                      Palauta
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <p className="text-[10px] text-gray-400 text-center mt-6 uppercase tracking-wider">
              Lainat näkyvät tässä, kunnes palautat ne ohjelmassa.
            </p>
          </div>
        )}

        {view === AppView.LOGS && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-800">Käyttöhistoria</h2>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              {[
                { label: 'Tänään', value: getLogSummaryStats().today, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Viikko', value: getLogSummaryStats().week, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                { label: 'Kuukausi', value: getLogSummaryStats().month, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Vuosi', value: getLogSummaryStats().year, color: 'text-indigo-600', bg: 'bg-indigo-50' }
              ].map((stat, idx) => (
                <div key={idx} className={`${stat.bg} p-2.5 rounded-lg border border-white/50 flex flex-col items-center justify-center shadow-sm`}>
                  <span className={`text-xl font-black ${stat.color}`}>{stat.value}</span>
                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-wider text-center">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'all', label: 'Kaikki' },
                { id: 'day', label: 'Tänään' },
                { id: 'month', label: 'Kuukausi' },
                { id: 'year', label: 'Vuosi' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setLogFilter(f.id as any);
                    setVisibleLogsCount(5); // Reset limit when filter changes
                  }}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                    logFilter === f.id 
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm' 
                      : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Log Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Hae käyttäjää tai tuotetta..." 
                value={logSearchTerm}
                onChange={(e) => {
                  setLogSearchTerm(e.target.value);
                  setVisibleLogsCount(5); // Reset limit when search changes
                }}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
              {getFilteredLogs().slice(0, visibleLogsCount).map((log) => (
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
              {getFilteredLogs().length === 0 && <div className="p-6 text-center text-gray-400">Ei historiaa.</div>}
            </div>

            {getFilteredLogs().length > visibleLogsCount && (
              <button 
                onClick={() => setVisibleLogsCount(prev => prev + 5)}
                className="w-full py-3 bg-white border border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm"
              >
                Lataa lisää ({getFilteredLogs().length - visibleLogsCount} jäljellä)
              </button>
            )}
          </div>
        )}

      </main>

      {/* Navigation Bar - Hidden in User Mode (unless modified for borrows) */}
      <nav className="fixed bottom-0 w-full max-w-lg bg-white border-t border-gray-200 flex justify-around p-2 pb-4 z-20">
        <button 
          onClick={() => setView(AppView.DASHBOARD)}
          className={`p-2 flex flex-col items-center gap-1 min-w-[64px] ${view === AppView.DASHBOARD ? 'text-cyan-600' : 'text-gray-400'}`}
        >
          <ClipboardList size={24} />
          <span className="text-[10px] font-medium">Varasto</span>
        </button>

        <button 
          onClick={() => setView(AppView.BORROWS)}
          className={`p-2 flex flex-col items-center gap-1 min-w-[64px] ${view === AppView.BORROWS ? 'text-cyan-600' : 'text-gray-400'}`}
        >
          <Library size={24} />
          <span className="text-[10px] font-medium">Lainat</span>
          {getActiveBorrows().length > 0 && (
            <span className="absolute top-2 translate-x-4 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
              {getActiveBorrows().length}
            </span>
          )}
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
          <span className="text-[10px] font-medium">Loki</span>
        </button>
      </nav>

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
          defaultMode={view === AppView.BORROWS ? 'RETURN' : undefined}
        />
      )}
    </div>
  );
};

export default App;