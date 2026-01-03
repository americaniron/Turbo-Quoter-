import React, { useState, useRef, useEffect } from 'react';
import { ConfigPanel } from './components/ConfigPanel.tsx';
import { QuotePreview } from './components/QuotePreview.tsx';
import { QuoteItem, ClientInfo, AppConfig } from './types.ts';
import { analyzeQuoteData } from './services/geminiService.ts';

const App: React.FC = () => {
  // Helper to get date 10 days from now in YYYY-MM-DD
  const getDefaultExpiration = () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  };

  const [items, setItems] = useState<QuoteItem[]>([]);
  const [client, setClient] = useState<ClientInfo>({ company: '', email: '', phone: '' });
  const [config, setConfig] = useState<AppConfig>({ 
    markupPercentage: 25, 
    quoteId: 'AI-2025-CAT',
    expirationDate: getDefaultExpiration(),
    logisticsRate: 2.50,
    isInvoice: false,
    weightUnit: 'LBS'
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
    setAiAnalysis(null); // Reset analysis when new data loads
    
    // Smooth scroll to preview
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

  // --- Feature: Save Quote to File ---
  const handleSaveQuote = () => {
    const data = {
      version: '1.0',
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
    
    // Naming convention: QuoteID_YYYY-MM-DD.json
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `${config.isInvoice ? 'INVOICE' : 'QUOTE'}-${config.quoteId.replace(/[^a-z0-9]/gi, '_')}-${dateStr}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Feature: Load Quote from File ---
  const handleLoadQuote = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.items) setItems(json.items);
        if (json.client) setClient(json.client);
        if (json.config) setConfig(prev => ({ ...prev, ...json.config }));
        if (json.customLogo) setCustomLogo(json.customLogo);
        if (json.aiAnalysis) setAiAnalysis(json.aiAnalysis);
        
        // Scroll to preview after loading
        setTimeout(() => {
            resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch (err) {
        alert("Failed to load quote file. Invalid format.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  // --- Feature: Save as Draft (Local Storage) ---
  const handleSaveDraft = () => {
    try {
      const data = {
        version: 'draft',
        timestamp: new Date().toISOString(),
        items,
        client,
        config,
        customLogo,
        aiAnalysis
      };
      localStorage.setItem('american_iron_draft', JSON.stringify(data));
      setHasDraft(true);
    } catch (e) {
      console.error(e);
      alert("Could not save draft. Local storage might be full (image too large). Try 'Save File' instead.");
    }
  };

  // --- Feature: Resume Draft (Local Storage) ---
  const handleResumeDraft = () => {
    try {
      const draft = localStorage.getItem('american_iron_draft');
      if (draft) {
        const json = JSON.parse(draft);
        if (json.items) setItems(json.items);
        if (json.client) setClient(json.client);
        if (json.config) setConfig(prev => ({ ...prev, ...json.config }));
        if (json.customLogo) setCustomLogo(json.customLogo);
        if (json.aiAnalysis) setAiAnalysis(json.aiAnalysis);
        
        setTimeout(() => {
            resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (e) {
       console.error(e);
       alert("Draft file is corrupted.");
    }
  };

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
        customLogo={customLogo}
        onLogoUpload={setCustomLogo}
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