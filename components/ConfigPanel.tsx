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
  customLogo: string | null;
  onLogoUpload: (logo: string) => void;
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
  customLogo,
  onLogoUpload
}) => {
  const [activeTab, setActiveTab] = useState<ParseMode>(ParseMode.PASTE);
  const [textInput, setTextInput] = useState("");
  const [client, setClient] = useState<ClientInfo>({ company: '', email: '', phone: '' });
  const [status, setStatus] = useState("Ready");
  const [draftSavedMsg, setDraftSavedMsg] = useState(false);

  // Draft Menu State
  const [isDraftMenuOpen, setIsDraftMenuOpen] = useState(false);
  const [draftOptions, setDraftOptions] = useState<DraftSaveOptions>({
      items: true,
      client: true,
      config: true
  });
  const draftMenuRef = useRef<HTMLDivElement>(null);

  // Close draft menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (draftMenuRef.current && !draftMenuRef.current.contains(event.target as Node)) {
        setIsDraftMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onLogoUpload(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleLoadClick = () => {
      document.getElementById('loadQuoteInput')?.click();
  };

  const handleLoadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          onLoadQuote(e.target.files[0]);
          e.target.value = ''; // Reset so same file can be loaded again if needed
      }
  };
  
  const handleEmail = () => {
      const subject = `${config.isInvoice ? 'INVOICE' : 'QUOTE'} - ${config.quoteId}`;
      const body = `Please find the attached ${config.isInvoice ? 'invoice' : 'quote'} for your review.\n\nRef: ${config.quoteId}\nTotal Due: [See Attachment]\n\nThank you,\nAmerican Iron`;
      window.location.href = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const handleConfirmDraftSave = () => {
      onSaveDraft(draftOptions);
      setDraftSavedMsg(true);
      setIsDraftMenuOpen(false);
      setTimeout(() => setDraftSavedMsg(false), 2000);
  };

  const toggleDraftOption = (key: keyof DraftSaveOptions) => {
      setDraftOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-8 no-print">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-6">
          <div className="relative group">
            {customLogo ? (
                <img src={customLogo} alt="Company Logo" className="h-24 w-auto object-contain" />
            ) : (
                <Logo className="h-24 w-auto object-contain" />
            )}
            <label className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-[9px] font-bold px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-700 shadow-lg border border-white transition-all transform hover:scale-105">
                ADD LOGO
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </label>
          </div>
          <div className="h-12 w-px bg-slate-200 hidden md:block"></div>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 hidden md:block">Quoting Engine</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Logistics & Engineering Intelligence</p>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Build v9.7 [LBS/KG]</div>
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

      {/* Persistence & Mode Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
         {/* File Operations */}
         <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 flex items-center gap-2">
             <span className="text-[9px] font-black uppercase text-indigo-800 px-2 tracking-widest hidden lg:block">File</span>
             <button 
                onClick={onSaveQuote}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                title="Download JSON File"
             >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Save File
             </button>
             <button 
                onClick={handleLoadClick}
                className="bg-white hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-3 py-2 rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                title="Upload JSON File"
             >
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Load File
             </button>
             <input type="file" id="loadQuoteInput" className="hidden" accept=".json" onChange={handleLoadFileChange} />
         </div>

         {/* Draft Operations */}
         <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200 flex items-center gap-2 flex-1 relative" ref={draftMenuRef}>
             <span className="text-[9px] font-black uppercase text-slate-600 px-2 tracking-widest hidden lg:block">Draft</span>
             
             <button 
                onClick={() => setIsDraftMenuOpen(!isDraftMenuOpen)}
                className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg transition-all flex items-center gap-1 ${draftSavedMsg ? 'bg-green-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-800'}`}
             >
                {draftSavedMsg ? (
                    <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        Saved
                    </>
                ) : (
                    <>
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                         Save Draft...
                    </>
                )}
             </button>

             {/* Draft Options Dropdown */}
             {isDraftMenuOpen && (
                 <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 shadow-2xl rounded-xl p-4 w-64 z-50 animate-in fade-in slide-in-from-top-2">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Select Data to Save</p>
                     
                     <div className="space-y-2 mb-4">
                         <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                             <input 
                                type="checkbox" 
                                checked={draftOptions.items} 
                                onChange={() => toggleDraftOption('items')}
                                className="rounded text-indigo-600 focus:ring-indigo-500" 
                             />
                             <span className="text-xs font-bold text-slate-700">Line Items & AI Analysis</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                             <input 
                                type="checkbox" 
                                checked={draftOptions.client} 
                                onChange={() => toggleDraftOption('client')}
                                className="rounded text-indigo-600 focus:ring-indigo-500" 
                             />
                             <span className="text-xs font-bold text-slate-700">Client Details</span>
                         </label>
                         <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                             <input 
                                type="checkbox" 
                                checked={draftOptions.config} 
                                onChange={() => toggleDraftOption('config')}
                                className="rounded text-indigo-600 focus:ring-indigo-500" 
                             />
                             <span className="text-xs font-bold text-slate-700">Configuration & Logo</span>
                         </label>
                     </div>

                     <button 
                        onClick={handleConfirmDraftSave}
                        className="w-full bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase py-2 rounded-lg transition-colors"
                     >
                         Confirm Save
                     </button>
                 </div>
             )}

             {hasDraft && (
                 <button 
                    onClick={onResumeDraft}
                    className="bg-white hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase px-3 py-2 rounded-lg border border-slate-300 transition-colors flex items-center gap-1"
                 >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Resume Draft
                 </button>
             )}
         </div>

         {/* Invoice Toggle */}
         <div className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-center min-w-[150px]">
             <label className="flex items-center gap-3 cursor-pointer">
                <span className={`text-[10px] font-black uppercase ${!config.isInvoice ? 'text-indigo-900' : 'text-indigo-300'}`}>Quote</span>
                <div className="relative">
                    <input type="checkbox" checked={config.isInvoice} onChange={(e) => updateConfig('isInvoice', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                </div>
                <span className={`text-[10px] font-black uppercase ${config.isInvoice ? 'text-red-600' : 'text-indigo-300'}`}>Invoice</span>
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
            className="w-full h-40 p-5 bg-slate-900 border border-slate-700 rounded-2xl shadow-inner text-sm font-mono text-white placeholder:text-slate-500 focus:ring-2 focus:ring-yellow-400 outline-none resize-none"
            placeholder="Paste item rows here (Format: Part# Description $Price)..."
          />
        )}
        {(activeTab === ParseMode.PDF || activeTab === ParseMode.EXCEL) && (
          <label className="flex flex-col items-center justify-center w-full h-40 border-4 border-dashed border-slate-200 rounded-3xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">Pricing Update</label>
          <select 
            value={config.markupPercentage} 
            onChange={(e) => updateConfig('markupPercentage', parseInt(e.target.value))}
            className="w-full p-2 bg-slate-900 border border-slate-700 rounded-xl font-black text-xs text-white outline-none"
          >
            <option value="10">10% Increase</option>
            <option value="15">15% Increase</option>
            <option value="20">20% Increase</option>
            <option value="25">25% Increase</option>
            <option value="30">30% Increase</option>
          </select>
        </div>
        
        {/* Weight Unit Toggle */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
            <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">Weight Unit</label>
            <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button 
                    onClick={() => updateConfig('weightUnit', 'LBS')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase transition-colors ${config.weightUnit === 'LBS' ? 'bg-[#ffcd00] text-black' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    LBS
                </button>
                <div className="w-px bg-slate-200"></div>
                <button 
                    onClick={() => updateConfig('weightUnit', 'KG')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase transition-colors ${config.weightUnit === 'KG' ? 'bg-[#ffcd00] text-black' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    KG
                </button>
            </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">Logistics ($/{config.weightUnit})</label>
             <input 
                type="number" 
                step="0.01"
                min="0"
                placeholder="2.50"
                value={config.logisticsRate}
                onChange={(e) => {
                    const val = e.target.value;
                    updateConfig('logisticsRate', val === '' ? 0 : parseFloat(val));
                }}
                className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-black text-xs text-white outline-none focus:border-yellow-400"
             />
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">{config.isInvoice ? 'Invoice Number' : 'Reference ID'}</label>
          <input 
            type="text" 
            value={config.quoteId}
            onChange={(e) => updateConfig('quoteId', e.target.value)}
            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-black text-xs text-white uppercase outline-none focus:border-yellow-400"
          />
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <label className="block text-[9px] font-black uppercase text-black mb-2 tracking-widest">{config.isInvoice ? 'Due Date' : 'Valid Until'}</label>
          <input 
            type="date" 
            value={config.expirationDate}
            onChange={(e) => updateConfig('expirationDate', e.target.value)}
            className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl font-black text-xs text-white uppercase outline-none focus:border-yellow-400 [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Client Info */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-8">
        <div className="text-[9px] font-black uppercase text-black tracking-widest mb-4">Client Destination</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="Company Name" value={client.company} onChange={(e) => updateClient('company', e.target.value)} className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold placeholder:text-slate-500 outline-none focus:border-yellow-400" />
          <input type="text" placeholder="Email Address" value={client.email} onChange={(e) => updateClient('email', e.target.value)} className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold placeholder:text-slate-500 outline-none focus:border-yellow-400" />
          <input type="text" placeholder="Phone Number" value={client.phone} onChange={(e) => updateClient('phone', e.target.value)} className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold placeholder:text-slate-500 outline-none focus:border-yellow-400" />
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
        <button onClick={handleEmail} className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-4 rounded-xl font-black uppercase text-xs transition-colors flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            Email
        </button>
        <button onClick={() => window.print()} className="bg-black text-white px-8 py-4 rounded-xl font-black uppercase text-xs hover:bg-slate-800 transition-colors">
            Print / PDF
        </button>
      </div>
    </div>
  );
};