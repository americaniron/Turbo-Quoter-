
import React, { useState, useEffect } from 'react';
import { AppConfig, ClientInfo, ParseMode, QuoteItem, SavedClient } from '../types.ts';
import { parseTextData, parsePdfFile, parseExcelFile } from '../services/parserService.ts';
import { Logo } from './Logo.tsx';

interface ConfigPanelProps {
  onDataLoaded: (items: QuoteItem[]) => void;
  onConfigChange: (config: AppConfig) => void;
  onClientChange: (info: ClientInfo) => void;
  onAiToggle: (enabled: boolean) => void;
  onAnalyze: () => void;
  onSaveQuote: () => void;
  onLoadQuote: (file: File) => void;
  onSaveDraft: (options: any) => void;
  onResumeDraft: () => void;
  hasDraft: boolean;
  aiEnabled: boolean;
  isAnalyzing: boolean;
  config: AppConfig;
  client: ClientInfo;
  customLogo: string | null;
  onLogoUpload: (logo: string) => void;
  onRefreshId?: () => void;
  addressBook: SavedClient[];
  onSaveToBook: (client: ClientInfo) => void;
  onDeleteFromBook: (id: string) => void;
}

const COUNTRIES = [
  "United States", "Canada", "Mexico", "United Kingdom", "Germany", "France", 
  "United Arab Emirates", "Saudi Arabia", "Qatar", "Australia", "Brazil", 
  "China", "India", "Japan", "South Korea", "Singapore", "Netherlands", 
  "Spain", "Italy", "Turkey", "Egypt", "South Africa", "Chile", "Peru"
];

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  onDataLoaded, onConfigChange, onClientChange, onAnalyze, onSaveQuote, 
  onLoadQuote, onSaveDraft, onResumeDraft, hasDraft, isAnalyzing, 
  config, client, customLogo, onLogoUpload, onRefreshId,
  addressBook, onSaveToBook, onDeleteFromBook
}) => {
  const [activeTab, setActiveTab] = useState<ParseMode>(ParseMode.PASTE);
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState("Ready");
  const [showShipping, setShowShipping] = useState(false);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [bookSearch, setBookSearch] = useState("");

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
      if (items.length === 0) throw new Error("No data found.");
      onDataLoaded(items);
      setStatus("Document Ready");
    } catch (err: any) {
      alert(err.message || "Error");
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
    newId = isInv ? newId.replace('-QT-', '-INV-') : newId.replace('-INV-', '-QT-');
    onConfigChange({ ...config, isInvoice: isInv, quoteId: newId });
  };

  const markupOptions = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 75, 100];
  const discountOptions = [0, 5, 10, 15, 20, 25, 30, 50];

  const filteredBook = addressBook.filter(c => 
    c.company.toLowerCase().includes(bookSearch.toLowerCase()) || 
    c.contactName.toLowerCase().includes(bookSearch.toLowerCase())
  );

  const isBillingUSA = client.country === "United States";
  const isShippingUSA = config.shippingCountry === "United States";

  return (
    <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-slate-200 mb-8 no-print relative">
      {/* Address Book Modal */}
      {showAddressBook && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-900">Address Book</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Manage global trade partners</p>
              </div>
              <button onClick={() => setShowAddressBook(false)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="relative mb-6">
                <input 
                  type="text" 
                  placeholder="SEARCH COMPANIES OR CONTACTS..." 
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-wider focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
                {filteredBook.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">No matching partners found</p>
                  </div>
                ) : (
                  filteredBook.map(saved => (
                    <div key={saved.id} className="group p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-lg transition-all flex justify-between items-center">
                      <div className="flex-grow">
                        <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight">{saved.company}</h4>
                        <div className="flex gap-4 mt-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase">{saved.contactName}</span>
                          <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">{saved.city}, {saved.country}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { onClientChange(saved); setShowAddressBook(false); }}
                          className="px-4 py-2 bg-indigo-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Select
                        </button>
                        <button 
                          onClick={() => onDeleteFromBook(saved.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8 border-b pb-4">
        <div className="flex items-center gap-6">
          <div className="relative group">
            {customLogo ? <img src={customLogo} alt="Logo" className="h-20 w-auto object-contain" /> : <Logo className="h-20 w-auto object-contain" />}
            <label className="absolute -bottom-2 -right-2 bg-slate-900 text-white text-[9px] font-bold px-3 py-1.5 rounded-full cursor-pointer shadow-lg">
                LOGO
                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const r = new FileReader();
                    r.onload = (ev) => onLogoUpload(ev.target?.result as string);
                    r.readAsDataURL(file);
                  }
                }} />
            </label>
          </div>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">Quoting Engine</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Logistics & Engineering Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => onSaveDraft({ items: true, client: true, config: true })} className="text-[10px] font-black uppercase text-slate-400">Save Draft</button>
          {hasDraft && <button onClick={onResumeDraft} className="text-[10px] font-black uppercase text-indigo-600 underline">Resume Draft</button>}
          {!config.isInvoice && (
            <button onClick={() => handleToggleInvoice(true)} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm">Convert to Invoice</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Billing Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Billing Information</h3>
            <button 
              onClick={() => setShowAddressBook(true)}
              className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              Address Book
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
             <input className="col-span-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="Company Name" value={client.company} onChange={(e) => updateClient('company', e.target.value)} />
             <input className="col-span-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="Contact Name" value={client.contactName} onChange={(e) => updateClient('contactName', e.target.value)} />
             <input className="col-span-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="Email" value={client.email} onChange={(e) => updateClient('email', e.target.value)} />
             <input className="col-span-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="Street Address" value={client.address} onChange={(e) => updateClient('address', e.target.value)} />
             <input className="col-span-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="City" value={client.city} onChange={(e) => updateClient('city', e.target.value)} />
             <input 
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" 
                placeholder={isBillingUSA ? "State" : "Prov / Reg"} 
                value={client.state} 
                onChange={(e) => updateClient('state', e.target.value)} 
             />
             <input 
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" 
                placeholder={isBillingUSA ? "Zip" : "Postal Code"} 
                value={client.zip} 
                onChange={(e) => updateClient('zip', e.target.value)} 
             />
             <select className="col-span-3 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none" value={client.country} onChange={(e) => updateClient('country', e.target.value)}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             <button 
               onClick={() => { if(client.company) onSaveToBook(client); else alert("Company name required to save."); }}
               className="col-span-1 bg-white border border-slate-200 text-slate-400 text-[8px] font-black uppercase rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-all"
               title="Save current to address book"
             >
               SAVE NEW
             </button>
          </div>
        </div>

        {/* Shipping Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Shipping Information</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showShipping} onChange={(e) => setShowShipping(e.target.checked)} className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-400" />
              <span className="text-[9px] font-black uppercase text-slate-400">Different address</span>
            </label>
          </div>
          {showShipping ? (
            <div className="grid grid-cols-4 gap-2">
              <input className="col-span-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="Shipping Company (Optional)" value={config.shippingCompany} onChange={(e) => updateConfig('shippingCompany', e.target.value)} />
              <input className="col-span-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="Street Address" value={config.shippingAddress} onChange={(e) => updateConfig('shippingAddress', e.target.value)} />
              <input className="col-span-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" placeholder="City" value={config.shippingCity} onChange={(e) => updateConfig('shippingCity', e.target.value)} />
              <input 
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" 
                placeholder={isShippingUSA ? "State" : "Prov / Reg"} 
                value={config.shippingState} 
                onChange={(e) => updateConfig('shippingState', e.target.value)} 
              />
              <input 
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs" 
                placeholder={isShippingUSA ? "Zip" : "Postal Code"} 
                value={config.shippingZip} 
                onChange={(e) => updateConfig('shippingZip', e.target.value)} 
              />
              <select className="col-span-4 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none" value={config.shippingCountry} onChange={(e) => updateConfig('shippingCountry', e.target.value)}>
                 {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          ) : (
            <div className="h-[154px] flex items-center justify-center border-2 border-dashed border-slate-100 rounded-xl text-slate-300 text-[10px] font-black uppercase">
              Same as Billing
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
         <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100 flex gap-2">
             <button onClick={onSaveQuote} className="bg-indigo-600 text-white text-[9px] font-black uppercase px-4 py-2 rounded-lg">Save</button>
             <button onClick={() => document.getElementById('loadQuoteInput')?.click()} className="bg-white text-indigo-700 text-[9px] font-black uppercase px-4 py-2 rounded-lg border">Load</button>
             <input type="file" id="loadQuoteInput" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onLoadQuote(e.target.files[0]); }} />
         </div>
         <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 flex items-center gap-3">
            <span className={`text-[10px] font-black uppercase ${!config.isInvoice ? 'text-black' : 'text-slate-400'}`}>Quote</span>
            <input type="checkbox" checked={config.isInvoice} onChange={(e) => handleToggleInvoice(e.target.checked)} className="w-10 h-5 bg-gray-200 rounded-full appearance-none checked:bg-red-500 cursor-pointer transition-all relative after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition-all" />
            <span className={`text-[10px] font-black uppercase ${config.isInvoice ? 'text-red-600' : 'text-slate-400'}`}>Invoice</span>
         </div>
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-2xl">
        {[ParseMode.PASTE, ParseMode.PDF, ParseMode.EXCEL].map(mode => (
          <button key={mode} onClick={() => setActiveTab(mode)} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl ${activeTab === mode ? 'bg-white shadow-sm' : 'text-slate-400'}`}>
            {mode}
          </button>
        ))}
      </div>

      <div className="mb-6">
        {activeTab === ParseMode.PASTE ? (
          <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)} className="w-full h-32 p-4 bg-slate-900 text-white text-xs font-mono rounded-xl outline-none" placeholder="Paste data here..." />
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-4 border-dashed border-slate-200 rounded-3xl cursor-pointer bg-slate-50">
            <p className="text-[10px] font-black uppercase text-slate-600">Upload {activeTab}</p>
            <input id={activeTab === ParseMode.PDF ? 'pdfFile' : 'excelFile'} type="file" className="hidden" />
          </label>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-slate-50 p-3 rounded-xl border">
          <label className="text-[9px] font-black uppercase mb-1 block">Markup (%)</label>
          <select value={config.markupPercentage} onChange={(e) => updateConfig('markupPercentage', parseInt(e.target.value))} className="w-full p-2 bg-slate-900 text-white text-[11px] rounded-lg">
            {markupOptions.map(opt => <option key={opt} value={opt}>{opt}%</option>)}
          </select>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border">
          <label className="text-[9px] font-black uppercase mb-1 block">Discount (%)</label>
          <select value={config.discountPercentage} onChange={(e) => updateConfig('discountPercentage', parseInt(e.target.value))} className="w-full p-2 bg-slate-900 text-white text-[11px] rounded-lg">
            {discountOptions.map(opt => <option key={opt} value={opt}>{opt}%</option>)}
          </select>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border">
          <label className="text-[9px] font-black uppercase mb-1 block">Weight</label>
          <div className="flex bg-white rounded-lg border overflow-hidden">
                <button onClick={() => updateConfig('weightUnit', 'LBS')} className={`flex-1 py-1.5 text-[9px] font-black ${config.weightUnit === 'LBS' ? 'bg-[#ffcd00]' : 'text-slate-400'}`}>LBS</button>
                <button onClick={() => updateConfig('weightUnit', 'KG')} className={`flex-1 py-1.5 text-[9px] font-black ${config.weightUnit === 'KG' ? 'bg-[#ffcd00]' : 'text-slate-400'}`}>KG</button>
          </div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border">
          <label className="text-[9px] font-black uppercase mb-1 block">Document #</label>
          <div className="relative">
            <input type="text" value={config.quoteId} onChange={(e) => updateConfig('quoteId', e.target.value)} className="w-full p-2 bg-slate-900 text-white text-[11px] font-mono rounded-lg outline-none pr-8" />
            {onRefreshId && <button onClick={onRefreshId} className="absolute right-1 top-1.5 p-1 text-slate-500 hover:text-yellow-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button>}
          </div>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border">
          <label className="text-[9px] font-black uppercase mb-1 block">P.O.#</label>
          <input type="text" value={config.poNumber} onChange={(e) => updateConfig('poNumber', e.target.value)} className="w-full p-2 bg-slate-900 text-white text-[11px] rounded-lg outline-none" />
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border">
          <label className="text-[9px] font-black uppercase mb-1 block">Date</label>
          <input type="date" value={config.expirationDate} onChange={(e) => updateConfig('expirationDate', e.target.value)} className="w-full p-2 bg-slate-900 text-white text-[11px] rounded-lg outline-none [color-scheme:dark]" />
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={handleProcess} className="flex-1 bg-[#ffcd00] text-black font-black text-xs py-4 rounded-xl uppercase transition-all shadow-lg active:scale-95">{status}</button>
        <button onClick={onAnalyze} disabled={isAnalyzing} className="flex-1 bg-slate-900 text-white font-black text-xs py-4 rounded-xl uppercase flex items-center justify-center gap-2 transition-all">{isAnalyzing ? '...' : 'AI Analysis'}</button>
        <button onClick={() => window.print()} className="bg-black text-white px-8 py-4 rounded-xl font-black uppercase text-[10px]">Print PDF</button>
      </div>
    </div>
  );
};
