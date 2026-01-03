import React, { useState } from 'react';
import { AppConfig, ClientInfo, ParseMode, QuoteItem } from '../types.ts';
import { parseTextData, parsePdfFile, parseExcelFile } from '../services/parserService.ts';
import { Logo } from './Logo.tsx';

interface ConfigPanelProps {
  onDataLoaded: (items: QuoteItem[]) => void;
  onConfigChange: (config: AppConfig) => void;
  onClientChange: (info: ClientInfo) => void;
  onAiToggle: (enabled: boolean) => void;
  onAnalyze: () => void;
  aiEnabled: boolean;
  isAnalyzing: boolean;
  config: AppConfig;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  onDataLoaded,
  onConfigChange,
  onClientChange,
  onAiToggle,
  onAnalyze,
  aiEnabled,
  isAnalyzing,
  config
}) => {
  const [activeTab, setActiveTab] = useState<ParseMode>(ParseMode.PASTE);
  const [textInput, setTextInput] = useState("");
  const [client, setClient] = useState<ClientInfo>({ company: '', email: '', phone: '' });
  const [status, setStatus] = useState("Ready");

  const handleProcess = async () => {
    setStatus("Processing...");
    try {
      let items: QuoteItem[] = [];
      if (activeTab === ParseMode.PASTE) {
        items = parseTextData(textInput);
      } else if (activeTab === ParseMode.PDF) {
        const fileInput = document.getElementById('pdfFile') as HTMLInputElement;
        if (fileInput?.files?.[0]) items = await parsePdfFile(fileInput.files[0]);
      } else if (activeTab === ParseMode.EXCEL) {
        const fileInput = document.getElementById('excelFile') as HTMLInputElement;
        if (fileInput?.files?.[0]) items = await parseExcelFile(fileInput.files[0]);
      }

      if (items.length === 0) throw new Error("No valid data found. Check input.");
      onDataLoaded(items);
      setStatus("Quote Generated");
    } catch (err: any) {
      alert(err.message || "Error processing data");
      setStatus("Error");
    } finally {
        setTimeout(() => setStatus("Ready"), 2000);
    }
  };

  const updateConfig = (key: keyof AppConfig, val: any) => {
    const newConfig = { ...config, [key]: val };
    onConfigChange(newConfig);
  };

  const updateClient = (key: keyof ClientInfo, val: string) => {
    const newClient = { ...client, [key]: val };
    setClient(newClient);
    onClientChange(newClient);
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-8 no-print">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-6">
          {/* Replaced image with Logo component */}
          <Logo className="h-24 w-auto" />
          <div className="h-12 w-px bg-slate-200 hidden md:block"></div>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 hidden md:block">Quoting Engine</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logistics & Engineering Intelligence</p>
          </div>
        </div>
        <div className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em]">Build v9.2 [React]</div>
      </div>

      {/* AI Controls */}
      <div className="mb-6 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg flex justify-between items-center">
         <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Gemini Integration</label>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs text-white font-bold">API Active (Env)</span>
            </div>
         </div>
         <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={aiEnabled} onChange={(e) => onAiToggle(e.target.checked)} className="w-4 h-4 accent-yellow-400 rounded" />
                <span className="text-[10px] text-slate-300 font-bold uppercase">Gen Photos</span>
            </label>
         </div>
      </div>

      {/* Input Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-2xl">
        {[ParseMode.PASTE, ParseMode.PDF, ParseMode.EXCEL].map(mode => (
          <button
            key={mode}
            onClick={() => setActiveTab(mode)}
            className={`flex-1 py-3 text-[11px] font-black uppercase rounded-xl transition-all ${
              activeTab === mode ? 'bg-white text-black shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {mode === ParseMode.PASTE ? 'Manual Data' : mode === ParseMode.PDF ? 'PDF Upload' : 'Excel Import'}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="mb-6">
        {activeTab === ParseMode.PASTE && (
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="w-full h-40 p-5 border border-slate-200 rounded-2xl shadow-inner text-sm font-mono focus:ring-2 focus:ring-yellow-400 outline-none resize-none"
            placeholder="Paste item rows here (Format: Part# Description $Price)..."
          />
        )}
        {(activeTab === ParseMode.PDF || activeTab === ParseMode.EXCEL) && (
          <label className="flex flex-col items-center justify-center w-full h-40 border-4 border-dashed border-slate-200 rounded-3xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                {activeTab === ParseMode.PDF ? 'Drag & Drop PDF' : 'Attach Excel/CSV'}
            </p>
            <input 
                id={activeTab === ParseMode.PDF ? 'pdfFile' : 'excelFile'} 
                type="file" 
                className="hidden" 
                accept={activeTab === ParseMode.PDF ? ".pdf" : ".xlsx,.xls,.csv"} 
            />
          </label>
        )}
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Markup Strategy</label>
          <select 
            value={config.markupPercentage} 
            onChange={(e) => updateConfig('markupPercentage', parseInt(e.target.value))}
            className="w-full p-2 bg-white border border-slate-200 rounded-xl font-black text-xs outline-none"
          >
            <option value="15">15% Margin</option>
            <option value="20">20% Margin</option>
            <option value="25">25% Margin</option>
            <option value="30">30% Margin</option>
          </select>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Logistics Rate</label>
             <div className="w-full p-2.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl font-black text-xs">
                $2.50 / LB (Fixed)
             </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Reference ID</label>
          <input 
            type="text" 
            value={config.quoteId}
            onChange={(e) => updateConfig('quoteId', e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-xl font-black text-xs uppercase outline-none focus:border-yellow-400"
          />
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <label className="block text-[9px] font-black uppercase text-slate-400 mb-2 tracking-widest">Valid Until</label>
          <input 
            type="date" 
            value={config.expirationDate}
            onChange={(e) => updateConfig('expirationDate', e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-xl font-black text-xs uppercase outline-none focus:border-yellow-400"
          />
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-8">
        <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4">Client Destination</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="Company Name" value={client.company} onChange={(e) => updateClient('company', e.target.value)} className="p-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-yellow-400" />
          <input type="text" placeholder="Email Address" value={client.email} onChange={(e) => updateClient('email', e.target.value)} className="p-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-yellow-400" />
          <input type="text" placeholder="Phone Number" value={client.phone} onChange={(e) => updateClient('phone', e.target.value)} className="p-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-yellow-400" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button 
            onClick={handleProcess} 
            className="flex-1 bg-[#ffcd00] hover:bg-[#e5b800] text-black font-black text-sm py-4 rounded-xl uppercase tracking-wide transition-transform active:scale-[0.98] shadow-lg shadow-yellow-400/20"
        >
            {status}
        </button>
        <button 
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex-1 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black text-sm py-4 rounded-xl uppercase tracking-wide transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
        >
            {isAnalyzing ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
                <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                    <span>AI Brainstorm</span>
                </>
            )}
        </button>
        <button onClick={() => window.print()} className="bg-black text-white px-8 py-4 rounded-xl font-black uppercase text-xs hover:bg-slate-800 transition-colors">
            Print / PDF
        </button>
      </div>
    </div>
  );
};