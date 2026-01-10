
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ConfigPanel } from './components/ConfigPanel.tsx';
import { QuotePreview } from './components/QuotePreview.tsx';
import { EmailModule } from './components/EmailModule.tsx';
import { Login } from './components/Login.tsx';
import { QuoteItem, ClientInfo, AppConfig, SavedClient, User } from './types.ts';
import { analyzeQuoteData } from './services/geminiService.ts';

const generateDocumentId = (isInvoice: boolean) => {
  const prefix = isInvoice ? 'INV' : 'QT';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0');
  return `${prefix}-${dateStr}-${randomHex}`;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('ai_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const getDefaultExpiration = () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  };

  const [items, setItems] = useState<QuoteItem[]>([]);
  const [addressBook, setAddressBook] = useState<SavedClient[]>([]);
  const [client, setClient] = useState<ClientInfo>({ 
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
    shippingCompany: '',
    shippingPhone: '',
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    shippingCountry: 'United States'
  });
  
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  
  const resultRef = useRef<HTMLDivElement>(null);

  const getStorageKey = (base: string) => user ? `${base}_${user.username}` : base;

  useEffect(() => {
    if (!user) return;

    const draft = localStorage.getItem(getStorageKey('american_iron_draft'));
    setHasDraft(!!draft);

    const savedBook = localStorage.getItem(getStorageKey('american_iron_address_book'));
    if (savedBook) {
      try {
        setAddressBook(JSON.parse(savedBook));
      } catch (e) {
        setAddressBook([]);
      }
    } else {
        setAddressBook([]);
    }
    
    setItems([]);
    setAiAnalysis(null);
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(getStorageKey('american_iron_address_book'), JSON.stringify(addressBook));
    }
  }, [addressBook, user]);

  const handleLogin = (u: User) => {
    sessionStorage.setItem('ai_current_user', JSON.stringify(u));
    setUser(u);
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
    const isDuplicate = addressBook.some(c => 
      c.company.trim().toLowerCase() === newClient.company.trim().toLowerCase()
    );

    if (isDuplicate) {
      alert(`"${newClient.company}" already exists in your Address Book.`);
      return;
    }

    const id = Date.now().toString();
    setAddressBook(prev => [...prev, { ...newClient, id }]);
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
        const data = { version: '1.7', author: user?.username, timestamp: new Date().toISOString(), items, client, config, customLogo, aiAnalysis };
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
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);

        // Prompt for email after save
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
        setCustomLogo(json.customLogo || null);
        setAiAnalysis(json.aiAnalysis || null);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } catch (err) {
        alert("Failed to load JSON file. File may be corrupted or incompatible.");
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

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen pb-20 print:min-h-0 print:pb-0 print:bg-white fade-in">
      <ConfigPanel 
        itemsCount={items.length}
        onDataLoaded={handleDataLoaded}
        onConfigChange={setConfig}
        onClientChange={setClient}
        onAiToggle={setAiEnabled}
        onAnalyze={handleAnalyze}
        onSaveQuote={handleSaveQuote}
        onLoadQuote={handleLoadQuote}
        onSaveDraft={handleSaveDraft}
        onResumeDraft={handleResumeDraft}
        onEmailDispatch={() => setIsEmailOpen(true)}
        hasDraft={hasDraft}
        aiEnabled={aiEnabled}
        isAnalyzing={isAnalyzing}
        config={config}
        client={client}
        customLogo={customLogo}
        onLogoUpload={setCustomLogo}
        onRefreshId={handleRefreshId}
        addressBook={addressBook}
        onSaveToBook={handleSaveToBook}
        onDeleteFromBook={handleDeleteFromBook}
        currentUser={user}
        onLogout={handleLogout}
      />
      
      <div ref={resultRef} className="quote-preview-container">
        <QuotePreview 
            items={items} 
            client={client} 
            config={config} 
            aiEnabled={aiEnabled}
            aiAnalysis={aiAnalysis}
            customLogo={customLogo}
        />
      </div>

      <EmailModule 
        isOpen={isEmailOpen} 
        onClose={() => setIsEmailOpen(false)} 
        client={client} 
        config={config} 
        items={items} 
      />
    </div>
  );
};

export default App;
