import React, { useState, useRef } from 'react';
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
    expirationDate: getDefaultExpiration()
  });
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Reference for scrolling to results
  const resultRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="min-h-screen pb-20">
      <ConfigPanel 
        onDataLoaded={handleDataLoaded}
        onConfigChange={setConfig}
        onClientChange={setClient}
        onAiToggle={setAiEnabled}
        onAnalyze={handleAnalyze}
        aiEnabled={aiEnabled}
        isAnalyzing={isAnalyzing}
        config={config}
      />
      
      <div ref={resultRef}>
        <QuotePreview 
            items={items} 
            client={client} 
            config={config} 
            aiEnabled={aiEnabled}
            aiAnalysis={aiAnalysis}
        />
      </div>
    </div>
  );
};

export default App;