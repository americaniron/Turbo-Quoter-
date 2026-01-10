
import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, ClientInfo, ParseMode, QuoteItem } from '../types.ts';
import { parseTextData, parsePdfFile, parseExcelFile } from '../services/parserService.ts';
import { Logo } from './Logo.tsx';

interface DraftSaveOptions {
  items: boolean;
  client: boolean;
  config: boolean;
}

interface ConfigPanelProps {
  onDataLoaded: (items: QuoteItem[]) => void;
  onConfigChange: (config: AppConfig) => void;
  onClientChange: (info: ClientInfo) => void;
  onAiToggle: (enabled: boolean) => void;
  onAnalyze: () => void;
  onSaveQuote: () => void;
  onLoadQuote: (file: File) => void;
  onSaveDraft: (options: DraftSaveOptions) => void;
  onResumeDraft: () => void;
  hasDraft: boolean;
  aiEnabled: boolean;
  isAnalyzing: boolean;
  config: AppConfig;
  client: ClientInfo;
  customLogo: string | null;
  onLogoUpload: (logo: string) => void;
  onRefreshId?: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  onDataLoaded,
  onConfigChange,
  onClientChange,
  onAiToggle,
  onAnalyze,
  onSaveQuote,
  onLoadQuote,
  onSaveDraft,
  onResumeDraft,
  hasDraft,
  aiEnabled,
  isAnalyzing,
  config,
  client,
  customLogo,
  onLogoUpload,
  onRefreshId
}) => {
  const [activeTab, setActiveTab] = useState<ParseMode>(ParseMode.PASTE);
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState("Ready");
  const [showShipping, setShowShipping] = useState(false);

  const handleProcess = async () => {
    setStatus("Processing...");
    try {
      let items: QuoteItem[] = [];
      if (activeTab === ParseMode.PASTE) items = parseTextData(textInput);
      else if (activeTab === ParseMode.PDF) {
        const fileInput = document.getElementById('pdfFile') as HTMLInputElement;
        if (fileInput?.files?.[0]) items = await parsePdfFile(fileInput.files[0]);
      } else if (activeTab === ParseMode.EXCEL) {
        const fileInput = document.getElementById('excelFile') as HTMLInputElement;
        if (fileInput?.files?.[0]) items = await parseExcelFile(fileInput.files[0]);
      }
      if (items.length === 0) throw new Error("No valid data found.");
      onDataLoaded(items);
      setStatus("Document Ready");
    } catch (err: any) {
      alert(err.message || "Error processing data");
      setStatus("Error");
    } finally {
        setTimeout(() => setStatus("Ready"), 2000);
    }
  };

  const updateConfig = (key: keyof AppConfig, val: any) => {
    onConfigChange({ ...config, [key]: val });
  };

  const updateClient = (key: keyof ClientInfo, val: string) => {
    onClientChange({ ...client, [key]: val });
  };

  const handleToggleInvoice = (isInv: boolean) => {
    let newId = config.quoteId;
    if (isInv && newId.includes('-QT-')) {
        newId = newId.replace('-QT-', '-INV-');
    } else if (!isInv && newId.includes('-INV-')) {
        newId = newId.replace('-INV-', '-QT-');
    }
    onConfigChange({ ...config, isInvoice: isInv, quoteId: newId });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => { if (ev.target?.result) onLogoUpload(ev.target.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const markupOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 100];

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-8 no-print">
      <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-6">
          <div className="relative group">
            {customLogo ? <img src={customLogo} alt="Logo" className="h-24 w-auto object-contain" /> : <Logo className="h-24 w-auto object-contain" />}
            <label className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-[9px] font-bold px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-700 shadow-lg border border-white transition-all transform hover:scale-105">
                LOGO
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </label>
          </div>
          <div className="h-12 w-px bg-slate-200 hidden md:block"></div>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Quoting Engine</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Logistics & Engineering Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => onSaveDraft({ items: true, client: true, config: true })} className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">Save Draft</button>
          {hasDraft && <button onClick={onResumeDraft} className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors underline">Resume Draft</button>}
          <div className="h-6 w-px bg-slate-200"></div>
          {!config.isInvoice && (
            <button 
              onClick={() => handleToggleInvoice(true)}
              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all shadow-sm"
            >
              Convert to Invoice
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Customer Billing Information</h3>
          <div className="grid grid-cols-2 gap-3">
             <div className="col-span-2">
                <input type="text" placeholder="Company Name" value={client.company} onChange={(e) => updateClient('company', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-yellow-400" />
             </div>
             <input type="text" placeholder="Contact Person" value={client.contactName} onChange={(e) => updateClient('contactName', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-yellow-400" />
             <input type="email" placeholder="Email Address" value={client.email} onChange={(e) => updateClient('email', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-yellow-400" />
             <input type="text" placeholder="Phone Number" value={client.phone} onChange={(e) => updateClient('phone', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-yellow-400" />
             <input type="text" placeholder="Street Address" value={client.address} onChange={(e) => updateClient('address', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-yellow-400" />
             <div className="col-span-2">
                <input type="text" placeholder="City, State, ZIP" value={client.cityStateZip} onChange={(e) => updateClient('cityStateZip', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-yellow-400" />
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Shipping Details</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showShipping} onChange={(e) => setShowShipping(e.target.checked)} className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-400" />
              <span className="text-[9px] font-black uppercase text-slate-400">Different from billing</span>
            </label>
          </div>
          {showShipping ? (
            <textarea 
              placeholder="Enter Shipping Address..." 
              value={config.shippingAddress} 
              onChange={(e) => updateConfig('shippingAddress', e.target.value)}
              className="w-full h-[154px] p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
            />
          ) : (
            <div className="h-[154px] flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl text-slate-300 text-[10px] font-black uppercase">
              Shipping same as billing
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
         <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 flex items-center gap-2">
             <button onClick={onSaveQuote} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase px-3 py-2 rounded-lg transition-colors flex items-center gap-1">Save File</button>
             <button onClick={() => document.getElementById('loadQuoteInput')?.click()} className="bg-white hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-3 py-2 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1">Load File</button>
             <input type="file" id="loadQuoteInput" className="hidden" accept=".json" onChange={(e) => { if (e.target.files?.[0]) onLoadQuote(e.target.files[0]); e.target.value = ''; }} />
         </div>
         <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200 flex items-center justify-center min-w-[150px]">
             <label className="flex items-center gap-3 cursor-pointer">
                <span className={`text-[10px] font-black uppercase ${!config.isInvoice ? 'text-indigo-900' : 'text-indigo-300'}`}>Quote</span>
                <div className="relative">
                    <input type="checkbox" checked={config.isInvoice} onChange={(e) => handleToggleInvoice(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-red-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </div>
                <span className={`text-[10px] font-black uppercase ${config.isInvoice ? 'text-red-600' : 'text-indigo-300'}`}>Invoice</span>
            </label>
         </div>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-2xl">
        {[ParseMode.PASTE, ParseMode.PDF, ParseMode.EXCEL].map(mode => (
          <button key={mode} onClick={() => setActiveTab(mode)} className={`flex-1 py-3 text-[11px] font-black uppercase rounded-xl transition-all ${activeTab === mode ? 'bg-white text-black shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
            {mode === ParseMode.PASTE ? 'Manual Data' : mode === ParseMode.PDF ? 'PDF Upload' : 'Excel Import'}
          </button>
        ))}
      </div>

      <div className="mb-6">
        {activeTab === ParseMode.PASTE ? (
          <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} className="w-full h-40 p-5 bg-slate-900 border border-slate-700 rounded-2xl shadow-inner text-sm font-mono text-white placeholder:text-slate-500 outline-none resize-none" placeholder="Paste item rows here..." />
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-40 border-4 border-dashed border-slate-200 rounded-3xl cursor-pointer bg-slate-50 hover:bg-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Attach {activeTab === ParseMode.PDF ? 'PDF' : 'Excel'}</p>
            <input id={activeTab === ParseMode.PDF ? 'pdfFile' : 'excelFile'} type="file" className="hidden" accept={activeTab === ParseMode.PDF ? ".pdf" : ".xlsx,.xls,.csv"} />
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">Markup (%)</label>
          <div className="relative">
            <select value={config.markupPercentage} onChange={(e) => updateConfig('markupPercentage', parseInt(e.target.value))} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-yellow-400">
              {markupOptions.map(opt => <option key={opt} value={opt} className="bg-slate-900 text-white">{opt}%</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">Weight Unit</label>
          <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => updateConfig('weightUnit', 'LBS')} className={`flex-1 py-2 text-[10px] font-black uppercase ${config.weightUnit === 'LBS' ? 'bg-[#ffcd00] text-black' : 'text-slate-400'}`}>LBS</button>
                <button onClick={() => updateConfig('weightUnit', 'KG')} className={`flex-1 py-2 text-[10px] font-black uppercase ${config.weightUnit === 'KG' ? 'bg-[#ffcd00] text-black' : 'text-slate-400'}`}>KG</button>
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group">
          <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">Document #</label>
          <div className="relative">
            <input type="text" value={config.quoteId} onChange={(e) => updateConfig('quoteId', e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-white uppercase outline-none pr-10 focus:ring-2 focus:ring-yellow-400" />
            {onRefreshId && <button onClick={onRefreshId} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-yellow-400 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button>}
          </div>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">P.O. Number</label>
          <input type="text" value={config.poNumber} onChange={(e) => updateConfig('poNumber', e.target.value)} placeholder="Optional" className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">{config.isInvoice ? 'Due Date' : 'Valid Until'}</label>
          <input type="date" value={config.expirationDate} onChange={(e) => updateConfig('expirationDate', e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none [color-scheme:dark] focus:ring-2 focus:ring-yellow-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">Payment Terms</label>
              <input type="text" value={config.paymentTerms || ''} placeholder="e.g. Net 30, Due on Receipt" onChange={(e) => updateConfig('paymentTerms', e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">Special Instructions</label>
              <input type="text" value={config.specialInstructions || ''} placeholder="e.g. Wire Transfer Info" onChange={(e) => updateConfig('specialInstructions', e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:ring-2 focus:ring-yellow-400" />
          </div>
      </div>

      <div className="flex gap-4">
        <button onClick={handleProcess} className="flex-1 bg-[#ffcd00] hover:bg-[#e5b800] text-black font-black text-sm py-4 rounded-xl uppercase tracking-wide transition-all shadow-lg active:scale-95">{status}</button>
        <button onClick={onAnalyze} disabled={isAnalyzing} className="flex-1 bg-slate-900 hover:bg-black text-white font-black text-sm py-4 rounded-xl uppercase flex items-center justify-center gap-2 transition-all">{isAnalyzing ? '...' : 'AI Brainstorm'}</button>
        <button onClick={() => window.print()} className="bg-black text-white px-8 py-4 rounded-xl font-black uppercase text-xs hover:bg-slate-800 transition-colors shadow-lg">Print / PDF</button>
      </div>
    </div>
  );
};
