
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ConfigPanel } from './components/ConfigPanel.tsx';
import { QuotePreview } from './components/QuotePreview.tsx';
import { QuoteItem, ClientInfo, AppConfig } from './types.ts';
import { analyzeQuoteData } from './services/geminiService.ts';

// Helper to generate a unique professional ID
const generateDocumentId = (isInvoice: boolean) => {
  const prefix = isInvoice ? 'INV' : 'QT';
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = Math.floor(Math.random() * 0x10000).toString(16).toUpperCase().padStart(4, '0');
  return `AI-${prefix}-${dateStr}-${randomHex}`;
};

const App: React.FC = () => {
  // Helper to get date 10 days from now in YYYY-MM-DD
  const getDefaultExpiration = () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  };

  const [items, setItems] = useState<QuoteItem[]>([]);
  const [client, setClient] = useState<ClientInfo>({ 
    company: '', 
    contactName: '',
    email: '', 
    phone: '',
    address: '',
    cityStateZip: ''
  });
  const [config, setConfig] = useState<AppConfig>({ 
    markupPercentage: 25, 
    quoteId: generateDocumentId(false),
    poNumber: '',
    expirationDate: getDefaultExpiration(),
    logisticsRate: 2.50,
    isInvoice: false,
    weightUnit: 'LBS',
    shippingAddress: ''
  });
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  
  // Reference for scrolling to results
  const resultRef = useRef<HTMLDivElement>(null);

  // Check for existing draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('american_iron_draft');
    if (draft) setHasDraft(true);
  }, []);

  const handleDataLoaded = (newItems: QuoteItem[]) => {
    setItems(newItems);
    setAiAnalysis(null);
    
    setConfig(prev => ({
        ...prev,
        quoteId: generateDocumentId(prev.isInvoice)
    }));

    setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleAnalyze = async () => {
    if (items.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeQuoteData(items);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const handleSaveQuote = () => {
    const data = {
      version: '1.1',
      timestamp: new Date().toISOString(),
      items,
      client,
      config,
      customLogo,
      aiAnalysis
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `${config.isInvoice ? 'INVOICE' : 'QUOTE'}-${config.quoteId.replace(/[^a-z0-9]/gi, '_')}-${dateStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadQuote = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        if (json.items) {
            const migratedItems = json.items.map((item: any) => ({
                ...item,
                originalImages: item.originalImages || (item.originalImage ? [item.originalImage] : [])
            }));
            setItems(migratedItems);
        }

        if (json.client) setClient(prev => ({ ...prev, ...json.client }));
        if (json.config) setConfig(prev => ({ ...prev, ...json.config }));
        
        setCustomLogo(json.customLogo || null);
        setAiAnalysis(json.aiAnalysis || null);
        
        setTimeout(() => {
            resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch (err) {
        alert("Failed to load quote file. Invalid format.");
      }
    };
    reader.readAsText(file);
  };

  const handleSaveDraft = (options: { items: boolean; client: boolean; config: boolean }) => {
    try {
      const existingDraftStr = localStorage.getItem('american_iron_draft');
      let draftData = existingDraftStr ? JSON.parse(existingDraftStr) : {};
      if (options.items) draftData.items = items;
      if (options.client) draftData.client = client;
      if (options.config) draftData.config = config;
      localStorage.setItem('american_iron_draft', JSON.stringify(draftData));
      setHasDraft(true);
    } catch (e) {
      alert("Could not save draft.");
    }
  };

  const handleResumeDraft = () => {
    try {
      const draft = localStorage.getItem('american_iron_draft');
      if (draft) {
        const json = JSON.parse(draft);
        if (json.items) setItems(json.items);
        if (json.client) setClient(json.client);
        if (json.config) setConfig(prev => ({ ...prev, ...json.config }));
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (e) {}
  };

  const handleRefreshId = useCallback(() => {
    setConfig(prev => ({
        ...prev,
        quoteId: generateDocumentId(prev.isInvoice)
    }));
  }, []);

  return (
    <div className="min-h-screen pb-20 print:min-h-0 print:pb-0 print:bg-white">
      <ConfigPanel 
        onDataLoaded={handleDataLoaded}
        onConfigChange={setConfig}
        onClientChange={setClient}
        onAiToggle={setAiEnabled}
        onAnalyze={handleAnalyze}
        onSaveQuote={handleSaveQuote}
        onLoadQuote={handleLoadQuote}
        onSaveDraft={handleSaveDraft}
        onResumeDraft={handleResumeDraft}
        hasDraft={hasDraft}
        aiEnabled={aiEnabled}
        isAnalyzing={isAnalyzing}
        config={config}
        client={client}
        customLogo={customLogo}
        onLogoUpload={setCustomLogo}
        onRefreshId={handleRefreshId}
      />
      
      <div ref={resultRef}>
        <QuotePreview 
            items={items} 
            client={client} 
            config={config} 
            aiEnabled={aiEnabled}
            aiAnalysis={aiAnalysis}
            customLogo={customLogo}
        />
      </div>
    </div>
  );
};

export default App;
