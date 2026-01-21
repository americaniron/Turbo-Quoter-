
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ConfigPanel } from './components/ConfigPanel.tsx';
import { QuotePreview } from './components/QuotePreview.tsx';
import { EmailModule } from './components/EmailModule.tsx';
import { Login } from './components/Login.tsx';
import { PrintControls } from './components/PrintControls.tsx';
import { SettingsPanel } from './components/SettingsPanel.tsx';
import { ReviewModal } from './components/ReviewModal.tsx';
import { QuoteItem, ClientInfo, AppConfig, SavedClient, User, PhotoMode, AppSettings, Theme, AdminInfo, UserCredentials } from './types.ts';
import { analyzeQuoteData } from './services/geminiService.ts';

const generateDocumentId = (isInvoice: boolean) => {
  const prefix = isInvoice ? 'INV' : 'QT';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0');
  return `${prefix}-${dateStr}-${randomHex}`;
};

const DEFAULT_ADDRESS_BOOK: SavedClient[] = [
  { id: '1', company: 'Global Construction Co.', contactName: 'John Doe', email: 'j.doe@global-construction.com', phone: '123-456-7890', address: '123 Main St', city: 'Metropolis', state: 'NY', zip: '10001', country: 'United States', accountNumber: 'GCC-001' },
  { id: '2', company: 'Mega Miners Inc.', contactName: 'Jane Smith', email: 'j.smith@megaminers.com', phone: '987-654-3210', address: '456 Mining Rd', city: 'Bedrock', state: 'CA', zip: '90210', country: 'United States', accountNumber: 'MMI-002' }
];

const DEFAULT_SETTINGS: AppSettings = {
  adminInfo: {
    companyName: 'AMERICAN IRON LLC',
    address: '123 Machinery Lane',
    city: 'Tampa',
    state: 'FL',
    zip: '33602',
    country: 'United States',
    phone: '1-800-555-IRON',
    email: 'sales@americaniron.com',
    website: 'americaniron1.com',
    logoUrl: null,
  },
  theme: Theme.LIGHT,
  users: [
    { username: 'ironman1111', displayName: 'Iron Command', role: 'Chief Engineer' },
    { username: 'batbout', displayName: 'Logistics Hub', role: 'Logistics Specialist' }
  ]
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('ai_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedSettings = localStorage.getItem('american_iron_settings');
    return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
  });

  const getDefaultExpiration = () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  };

  const [items, setItems] = useState<QuoteItem[]>([]);
  
  const GLOBAL_BOOK_KEY = 'american_iron_global_address_book';
  
  const [addressBook, setAddressBook] = useState<SavedClient[]>(() => {
    const savedBook = localStorage.getItem(GLOBAL_BOOK_KEY);
    if (savedBook) {
      try {
        const parsed = JSON.parse(savedBook);
        return parsed.length > 0 ? parsed : DEFAULT_ADDRESS_BOOK;
      } catch (e) {
        return DEFAULT_ADDRESS_BOOK;
      }
    }
    return DEFAULT_ADDRESS_BOOK;
  });

  const [client, setClient] = useState<ClientInfo>({ 
    accountNumber: '',
    company: '', 
    contactName: '',
    email: '', 
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States'
  });

  const [config, setConfig] = useState<AppConfig>({ 
    markupPercentage: 25, 
    discountPercentage: 0,
    quoteId: generateDocumentId(false),
    poNumber: '',
    expirationDate: getDefaultExpiration(),
    logisticsRate: 2.50,
    isInvoice: false,
    weightUnit: 'LBS',
    includeAiAnalysis: false,
    photoMode: PhotoMode.EXTRACT, 
    imageSize: '1K',
    paymentTerms: 'Net 30',
    shippingCompany: '',
    shippingPhone: '',
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    shippingCountry: 'United States'
  });
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [parsedItemsForReview, setParsedItemsForReview] = useState<QuoteItem[] | null>(null);
  
  const resultRef = useRef<HTMLDivElement>(null);

  const getStorageKey = (base: string) => user ? `${base}_${user.username}` : base;

  useEffect(() => {
    localStorage.setItem('american_iron_settings', JSON.stringify(settings));
    
    // Handle theme changes
    const root = document.documentElement;
    if (settings.theme === Theme.DARK) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    const originalTitle = document.title;
    const handleBeforePrint = () => { 
      document.title = `${config.isInvoice ? 'INVOICE' : 'QUOTE'}-${config.quoteId}-${client.company || 'Client'}`;
    };
    const handleAfterPrint = () => {
      document.title = originalTitle;
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.title = originalTitle;
    };
  }, [config.isInvoice, config.quoteId, client.company]);

  useEffect(() => {
    if (!user) return;
    const draft = localStorage.getItem(getStorageKey('american_iron_draft'));
    setHasDraft(!!draft);
  }, [user]);

  useEffect(() => {
    localStorage.setItem(GLOBAL_BOOK_KEY, JSON.stringify(addressBook));
  }, [addressBook]);

  const handleLogin = (u: UserCredentials) => {
    sessionStorage.setItem('ai_current_user', JSON.stringify({
      username: u.username,
      displayName: u.displayName,
      role: u.role
    }));
    setUser({
      username: u.username,
      displayName: u.displayName,
      role: u.role
    });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ai_current_user');
    setUser(null);
  };

  const handleDataLoaded = (newItems: QuoteItem[]) => {
    setItems(newItems);
    setAiAnalysis(null);
    setConfig(prev => ({ ...prev, quoteId: generateDocumentId(prev.isInvoice) }));
    setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleParseComplete = (parsedItems: QuoteItem[]) => {
    setParsedItemsForReview(parsedItems);
  };

  const handleReviewConfirm = (finalItems: QuoteItem[]) => {
    handleDataLoaded(finalItems);
    setParsedItemsForReview(null);
  };
  
  const handleReviewCancel = () => {
    setParsedItemsForReview(null);
  };

  const handleAnalyze = async () => {
    if (items.length === 0) return;
    setIsAnalyzing(true);
    try {
        const result = await analyzeQuoteData(items);
        setAiAnalysis(result);
    } catch (err) {
        setAiAnalysis("Analysis failed. Hub offline or rate limited.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleSaveToBook = (newClient: ClientInfo) => {
    if (!newClient.company) {
      alert("Company name is required to save to the address book.");
      return;
    }
    const isDuplicate = addressBook.some(c => 
      c.company.trim().toLowerCase() === newClient.company.trim().toLowerCase()
    );

    if (isDuplicate) {
      alert(`"${newClient.company}" already exists in your Address Book.`);
      return;
    }

    const id = Date.now().toString();
    setAddressBook(prev => [...prev, { ...newClient, id }]);
    alert(`"${newClient.company}" has been added to the directory.`);
  };

  const handleDeleteFromBook = (id: string) => {
    setAddressBook(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveQuote = () => {
    if (items.length === 0) {
        alert("No items to export.");
        return;
    }

    try {
        const data = { version: '2.0', author: user?.username, timestamp: new Date().toISOString(), items, client, config, aiAnalysis, settings: { adminInfo: settings.adminInfo } };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `${config.isInvoice ? 'INVOICE' : 'QUOTE'}-${config.quoteId.replace(/[^a-z0-9]/gi, '_')}-${dateStr}.json`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);

        if (client.email) {
          if (confirm("Document exported successfully. Commence AI Dispatch Protocol to " + client.email + "?")) {
            setIsEmailOpen(true);
          }
        }
    } catch (err: any) {
        alert("Export Error: " + err.message);
    }
  };

  const handleLoadQuote = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.items) setItems(json.items);
        if (json.client) setClient(prev => ({ ...prev, ...json.client }));
        if (json.config) setConfig(prev => ({ ...prev, ...json.config }));
        if (json.settings && json.settings.adminInfo) {
          setSettings(prev => ({...prev, adminInfo: json.settings.adminInfo}));
        }
        setAiAnalysis(json.aiAnalysis || null);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } catch (err) {
        alert("Failed to load JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveDraft = (options: { items: boolean; client: boolean; config: boolean }) => {
    try {
      const key = getStorageKey('american_iron_draft');
      const existingDraftStr = localStorage.getItem(key);
      let draftData = existingDraftStr ? JSON.parse(existingDraftStr) : {};
      if (options.items) draftData.items = items;
      if (options.client) draftData.client = client;
      if (options.config) draftData.config = config;
      localStorage.setItem(key, JSON.stringify(draftData));
      setHasDraft(true);
      alert("Local draft updated.");
    } catch (e) {
      alert("Draft save failed.");
    }
  };

  const handleResumeDraft = () => {
    try {
      const key = getStorageKey('american_iron_draft');
      const draft = localStorage.getItem(key);
      if (draft) {
        const json = JSON.parse(draft);
        if (json.items) setItems(json.items);
        if (json.client) setClient(prev => ({ ...prev, ...json.client }));
        if (json.config) setConfig(prev => ({ ...prev, ...json.config }));
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (e) {}
  };

  const handleRefreshId = useCallback(() => {
    setConfig(prev => ({ ...prev, quoteId: generateDocumentId(prev.isInvoice) }));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!user) {
    return <Login onLogin={handleLogin} users={settings.users} />;
  }

  return (
    <div className="min-h-screen pb-20 print:min-h-0 print:pb-0 print:bg-white fade-in bg-slate-50 dark:bg-slate-900 transition-colors">
      <ConfigPanel 
        onOpenSettings={() => setIsSettingsOpen(true)}
        itemsCount={items.length}
        onParseComplete={handleParseComplete}
        onConfigChange={setConfig}
        onClientChange={setClient}
        onAnalyze={handleAnalyze}
        onSaveQuote={handleSaveQuote}
        onLoadQuote={handleLoadQuote}
        onSaveDraft={handleSaveDraft}
        onResumeDraft={handleResumeDraft}
        onEmailDispatch={() => setIsEmailOpen(true)}
        hasDraft={hasDraft}
        isAnalyzing={isAnalyzing}
        config={config}
        client={client}
        onRefreshId={handleRefreshId}
        addressBook={addressBook}
        onSaveToBook={handleSaveToBook}
        onDeleteFromBook={handleDeleteFromBook}
        currentUser={user}
        onLogout={handleLogout}
      />
      
      <div ref={resultRef}>
        {items.length > 0 && (
          <PrintControls onPrint={handlePrint} />
        )}
        <div className="quote-preview-container">
          <QuotePreview 
              items={items} 
              client={client} 
              config={config} 
              aiAnalysis={aiAnalysis}
              adminInfo={settings.adminInfo}
          />
        </div>
      </div>

      <EmailModule 
        isOpen={isEmailOpen} 
        onClose={() => setIsEmailOpen(false)} 
        client={client} 
        config={config} 
        items={items} 
      />
      
      {isSettingsOpen && (
        <SettingsPanel 
          settings={settings}
          onSettingsChange={setSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
      
      {parsedItemsForReview && (
        <ReviewModal
          items={parsedItemsForReview}
          onConfirm={handleReviewConfirm}
          onCancel={handleReviewCancel}
        />
      )}
    </div>
  );
};

export default App;