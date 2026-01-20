import React, { useState, useRef } from 'react';
import { AppConfig, ClientInfo, ParseMode, QuoteItem, SavedClient, User, PhotoMode } from '../types.ts';
import { parseTextData, parsePdfFile, parseExcelFile } from '../services/parserService.ts';
import { Logo } from './Logo.tsx';

interface ConfigPanelProps {
  itemsCount: number;
  onDataLoaded: (items: QuoteItem[]) => void;
  onConfigChange: (config: AppConfig) => void;
  onClientChange: (info: ClientInfo) => void;
  onAnalyze: () => void;
  onSaveQuote: () => void;
  onLoadQuote: (file: File) => void;
  onSaveDraft: (options: any) => void;
  onResumeDraft: () => void;
  onEmailDispatch: () => void;
  hasDraft: boolean;
  isAnalyzing: boolean;
  config: AppConfig;
  client: ClientInfo;
  customLogo: string | null;
  onLogoUpload: (logo: string) => void;
  onRefreshId?: () => void;
  addressBook: SavedClient[];
  onSaveToBook: (client: ClientInfo) => void;
  onDeleteFromBook: (id: string) => void;
  currentUser: User;
  onLogout: () => void;
}

const COUNTRIES = [
  "United States", "Canada", "Mexico", "United Kingdom", "Germany", "France", 
  "United Arab Emirates", "Saudi Arabia", "Qatar", "Australia", "Brazil", 
  "China", "India", "Japan", "South Korea", "Singapore", "Netherlands", 
  "Spain", "Italy", "Turkey", "Egypt", "South Africa", "Chile", "Peru"
];

const FieldGroup: React.FC<{ label: string; children: React.ReactNode; className?: string; isDark?: boolean }> = ({ label, children, className, isDark }) => (
  <div className={`relative flex flex-col group ${className}`}>
    <label className={`absolute -top-2 left-3 px-1.5 text-[10px] font-black uppercase tracking-widest z-10 transition-colors ${isDark ? 'bg-slate-900 text-indigo-400' : 'bg-white text-slate-500 group-focus-within:text-indigo-600'}`}>
      {label}
    </label>
    {children}
  </div>
);

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  itemsCount, onDataLoaded, onConfigChange, onClientChange, onAnalyze, onSaveQuote, 
  onLoadQuote, onSaveDraft, onResumeDraft, onEmailDispatch, hasDraft, isAnalyzing, 
  config, client, customLogo, onLogoUpload, onRefreshId,
  addressBook, onSaveToBook, onDeleteFromBook, currentUser, onLogout
}) => {
  const [activeTab, setActiveTab] = useState<ParseMode>(ParseMode.PDF);
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState("Ready");
  const [showShipping, setShowShipping] = useState(false);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async () => {
    setStatus("Processing...");
    try {
      let items: QuoteItem[] = [];
      if (activeTab === ParseMode.PASTE) {
        if (!textInput.trim()) throw new Error("Please paste text first.");
        items = parseTextData(textInput);
      } else if (activeTab === ParseMode.PDF) {
        const file = pdfInputRef.current?.files?.[0];
        if (file) {
          items = await parsePdfFile(file);
        } else {
          throw new Error("Please select a PDF file first.");
        }
      } else if (activeTab === ParseMode.EXCEL) {
        const file = excelInputRef.current?.files?.[0];
        if (file) {
          items = await parseExcelFile(file);
        } else {
          throw new Error("Please select an Excel file first.");
        }
      }
      
      if (items.length === 0) {
        throw new Error("No items detected in source. Please check the document format.");
      }
      onDataLoaded(items);
      setStatus("Success");
    } catch (err: any) {
      console.error(err);
      setStatus(err.message ? `Error: ${err.message.substring(0, 20)}...` : "Parsing Error");
      alert(err.message || "Parsing Error");
    } finally {
      setTimeout(() => setStatus("Ready"), 3000);
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        onLogoUpload(base64);
      };
      reader.readAsDataURL(file);
    }
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
    <div className="max-w-6xl mx-auto bg-white p-10 rounded-[3rem] shadow-[0_35px_100px_-15px_rgba(0,0,0,0.1)] border border-slate-200/60 mb-12 no-print relative overflow-hidden fade-in">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#ffcd00] to-indigo-600"></div>

      <div className="absolute top-0 right-20 bg-slate-900 text-[9px] font-black text-white px-6 py-2 rounded-b-2xl flex items-center gap-4 shadow-xl z-10 border-x border-b border-white/10">
         <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            SESSION ACTIVE: <span className="text-[#ffcd00]">{currentUser.username.toUpperCase()}</span>
         </span>
         <span className="text-slate-500">|</span>
         <span className="text-slate-400">{currentUser.role.toUpperCase()}</span>
         <button onClick={onLogout} className="ml-4 hover:text-red-500 transition-colors uppercase">Logout</button>
      </div>

      {showAddressBook && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl border border-white/10 flex flex-col max-h-[85vh] overflow-hidden shadow-indigo-500/10">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <div>
                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Partner Directory</h3>
                <p className="text-[11px] text-indigo-600 font-black uppercase mt-1 tracking-[0.2em]">Select from verified global trade entities</p>
              </div>
              <button onClick={() => setShowAddressBook(false)} className="w-12 h-12 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all active:scale-90">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-10 flex-grow flex flex-col overflow-hidden">
              <div className="relative mb-10">
                <input 
                  type="text" 
                  placeholder="SEARCH BY COMPANY, CONTACT OR LOCATION..." 
                  className="w-full pl-16 pr-8 py-5 bg-slate-100 border-2 border-transparent rounded-[2rem] text-[13px] font-bold uppercase tracking-widest focus:bg-white focus:border-indigo-600 focus:shadow-xl transition-all outline-none"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                />
                <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-4 pb-8 scroll-smooth">
                {filteredBook.length === 0 ? (
                  <div className="col-span-2 text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    </div>
                    <p className="text-[12px] font-black uppercase text-slate-400 tracking-[0.3em]">No Directory Records Match</p>
                  </div>
                ) : (
                  filteredBook.map(saved => (
                    <div key={saved.id} className="group p-6 bg-white border-2 border-slate-100 rounded-[2rem] hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all cursor-pointer flex justify-between items-center" onClick={() => { onClientChange(saved); setShowAddressBook(false); }}>
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`w-3 h-3 rounded-full shadow-sm ${saved.country === 'United States' ? 'bg-indigo-600' : 'bg-emerald-500'}`}></span>
                            <h4 className="text-[15px] font-black text-slate-900 uppercase truncate tracking-tight">{saved.company}</h4>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-slate-500 uppercase truncate">{saved.contactName}</p>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest truncate">{saved.city}, {saved.country}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteFromBook(saved.id); }}
                          className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Purge Entry"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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

      <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-12 border-b border-slate-100 pb-12">
        <div className="flex items-center gap-10">
          <div className="relative group">
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-inner group-hover:border-indigo-400 transition-all duration-300">
                {customLogo ? <img src={customLogo} alt="Logo" className="h-24 w-auto object-contain" /> : <Logo className="h-24 w-auto object-contain" />}
            </div>
            <button 
                onClick={() => logoInputRef.current?.click()}
                className="absolute -bottom-4 -right-4 bg-slate-900 text-white text-[9px] font-black uppercase px-5 py-2.5 rounded-2xl cursor-pointer shadow-2xl hover:bg-indigo-600 transition-all border-4 border-white active:scale-95"
            >
                UPLOAD LOGO
            </button>
            <input 
                type="file" 
                ref={logoInputRef}
                className="hidden" 
                accept="image/*" 
                onChange={handleLogoUpload} 
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-tight">Iron Logistics <span className="text-indigo-600 font-normal tracking-normal text-lg bg-indigo-50 px-3 py-1 rounded-full">{currentUser.displayName}</span></h2>
            <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400">Logistics & Supply Hub</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-[2rem] border border-slate-200">
          <button onClick={() => onSaveDraft({ items: true, client: true, config: true })} className="px-6 py-4 bg-white text-[11px] font-black uppercase text-slate-700 rounded-2xl shadow-md hover:bg-slate-900 hover:text-white transition-all active:scale-95">Save Session</button>
          {hasDraft && <button onClick={onResumeDraft} className="px-6 py-4 text-[11px] font-black uppercase text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all">Resume Work</button>}
          {!config.isInvoice && (
            <button onClick={() => handleToggleInvoice(true)} className="px-8 py-4 bg-red-600 text-white text-[11px] font-black uppercase rounded-2xl shadow-xl hover:bg-red-700 transition-all active:scale-95 shadow-red-200">Issue Invoice</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        <div className="bg-slate-50/40 p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm transition-all hover:shadow-xl hover:border-indigo-100 group">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-indigo-600 flex items-center gap-4">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></span>
              Account Billing
            </h3>
            <button 
              onClick={() => setShowAddressBook(true)}
              className="group flex items-center gap-3 text-[11px] font-black uppercase text-slate-600 bg-white px-6 py-3 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-md active:scale-95"
            >
              <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
              Directory
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-6">
             <FieldGroup label="Account Number" className="col-span-4">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-bold uppercase shadow-sm" placeholder="e.g. 025069" value={client.accountNumber} onChange={(e) => updateClient('accountNumber', e.target.value)} />
             </FieldGroup>
             <FieldGroup label="Company Entity" className="col-span-4">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-bold uppercase shadow-sm" placeholder="FULL COMPANY NAME..." value={client.company} onChange={(e) => updateClient('company', e.target.value)} />
             </FieldGroup>
             <FieldGroup label="Ordered By / Contact" className="col-span-2">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-bold uppercase shadow-sm" placeholder="AUTHORIZED AGENT..." value={client.contactName} onChange={(e) => updateClient('contactName', e.target.value)} />
             </FieldGroup>
             <FieldGroup label="Phone Network" className="col-span-2">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-mono font-bold shadow-sm" placeholder="+1 (000) 000-0000" value={client.phone} onChange={(e) => updateClient('phone', e.target.value)} />
             </FieldGroup>
             <FieldGroup label="Official Email" className="col-span-4">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-mono font-bold shadow-sm" placeholder="OFFICE@DOMAIN.COM" value={client.email} onChange={(e) => updateClient('email', e.target.value)} />
             </FieldGroup>
             <FieldGroup label="HQ Street Address" className="col-span-4">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-bold uppercase shadow-sm" placeholder="STREET, SUITE, BUILDING..." value={client.address} onChange={(e) => updateClient('address', e.target.value)} />
             </FieldGroup>
             <FieldGroup label="HQ City" className="col-span-2">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-bold uppercase shadow-sm" placeholder="METROPOLIS..." value={client.city} onChange={(e) => updateClient('city', e.target.value)} />
             </FieldGroup>
             <FieldGroup label={isBillingUSA ? "State" : "Prov"} className="col-span-1">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-bold uppercase shadow-sm" placeholder="XX" value={client.state} onChange={(e) => updateClient('state', e.target.value)} />
             </FieldGroup>
             <FieldGroup label={isBillingUSA ? "Zip" : "Post"} className="col-span-1">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-mono font-bold uppercase shadow-sm" placeholder="00000" value={client.zip} onChange={(e) => updateClient('zip', e.target.value)} />
             </FieldGroup>
             <FieldGroup label="Global Region" className="col-span-3">
                <select className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-black uppercase outline-none appearance-none cursor-pointer shadow-sm hover:border-indigo-300 transition-colors" value={client.country} onChange={(e) => updateClient('country', e.target.value)}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </FieldGroup>
             <button 
               onClick={() => { if(client.company) onSaveToBook(client); else alert("Company name required to save."); }}
               className="col-span-1 bg-slate-950 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-indigo-600 transition-all shadow-xl active:scale-95 border-2 border-slate-900"
               title="Archive Partner Record"
             >
               SAVE DB
             </button>
          </div>
        </div>

        <div className="bg-slate-50/40 p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm transition-all hover:shadow-xl hover:border-emerald-100 group relative">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-emerald-600 flex items-center gap-4">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></span>
              Supply Destination
            </h3>
            <label className="flex items-center gap-4 cursor-pointer group/label">
              <input type="checkbox" checked={showShipping} onChange={(e) => setShowShipping(e.target.checked)} className="w-6 h-6 rounded-xl border-2 border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer transition-all" />
              <span className="text-[11px] font-black uppercase text-slate-400 group-hover/label:text-emerald-600 transition-colors">Route Elsewhere</span>
            </label>
          </div>
          
          {showShipping ? (
            <div className="grid grid-cols-4 gap-6 animate-in slide-in-from-top-6 duration-500">
              <FieldGroup label="Drop Site Name" className="col-span-4">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-bold uppercase shadow-sm" placeholder="PROJECT CODE / SITE ALPHA..." value={config.shippingCompany} onChange={(e) => updateConfig('shippingCompany', e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Field Contact Phone" className="col-span-4">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-mono font-bold shadow-sm" placeholder="+1 (000) 000-0000" value={config.shippingPhone} onChange={(e) => updateConfig('shippingPhone', e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Drop Street Address" className="col-span-4">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-bold uppercase shadow-sm" placeholder="SITE COORDINATES / STREET..." value={config.shippingAddress} onChange={(e) => updateConfig('shippingAddress', e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Site City" className="col-span-2">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-bold uppercase shadow-sm" placeholder="DESTINATION CITY..." value={config.shippingCity} onChange={(e) => updateConfig('shippingCity', e.target.value)} />
              </FieldGroup>
              <FieldGroup label={isShippingUSA ? "State" : "Prov"} className="col-span-1">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-bold uppercase shadow-sm" placeholder="XX" value={config.shippingState} onChange={(e) => updateConfig('shippingState', e.target.value)} />
              </FieldGroup>
              <FieldGroup label={isShippingUSA ? "Zip" : "Post"} className="col-span-1">
                <input className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-mono font-bold uppercase shadow-sm" placeholder="00000" value={config.shippingZip} onChange={(e) => updateConfig('shippingZip', e.target.value)} />
              </FieldGroup>
              <FieldGroup label="Drop Country" className="col-span-4">
                <select className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-black uppercase outline-none appearance-none cursor-pointer shadow-sm hover:border-emerald-300 transition-colors" value={config.shippingCountry} onChange={(e) => updateConfig('shippingCountry', e.target.value)}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </FieldGroup>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white shadow-inner transition-all group-hover:bg-slate-50">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300 shadow-sm border border-slate-100">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
              </div>
              <p className="text-[13px] font-black uppercase text-slate-300 tracking-[0.4em]">Mirroring Billing Profile</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-3 bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">Enable 'Route Elsewhere' for site logistics</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-6 mb-12 items-center justify-between p-4 bg-slate-900 rounded-[2.5rem] shadow-2xl">
         <div className="flex gap-4">
             <button 
               onClick={onSaveQuote} 
               disabled={itemsCount === 0}
               className={`text-[11px] font-black uppercase px-10 py-5 rounded-[1.5rem] transition-all active:scale-95 shadow-xl flex items-center gap-3 ${itemsCount > 0 ? 'bg-[#ffcd00] text-slate-900 hover:bg-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
               Export Data (JSON)
             </button>
             <button onClick={() => document.getElementById('loadQuoteInput')?.click()} className="bg-slate-800 text-white text-[11px] font-black uppercase px-10 py-5 rounded-[1.5rem] hover:bg-slate-700 transition-all border border-slate-700 flex items-center gap-3">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
               Import JSON
             </button>
             <input type="file" id="loadQuoteInput" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onLoadQuote(e.target.files[0]); }} />
         </div>

         <div className="flex bg-slate-800 p-2 rounded-[1.5rem] border border-slate-700 shadow-inner overflow-hidden">
            <button 
                onClick={() => handleToggleInvoice(false)} 
                className={`px-10 py-4 text-[11px] font-black uppercase rounded-[1rem] transition-all ${!config.isInvoice ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-500 hover:text-white'}`}
            >
                Quotation Mode
            </button>
            <button 
                onClick={() => handleToggleInvoice(true)} 
                className={`px-10 py-4 text-[11px] font-black uppercase rounded-[1rem] transition-all ${config.isInvoice ? 'bg-red-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-white'}`}
            >
                Invoicing Mode
            </button>
         </div>
      </div>

      <div className="mb-12">
        <div className="flex gap-4 mb-6">
            {[ParseMode.PDF, ParseMode.EXCEL, ParseMode.PASTE].map(mode => (
            <button 
                key={mode} 
                onClick={() => setActiveTab(mode)} 
                className={`flex-1 py-5 text-[12px] font-black uppercase rounded-[1.5rem] border-2 transition-all ${activeTab === mode ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xl shadow-indigo-200' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
            >
                {mode} SOURCE
            </button>
            ))}
        </div>

        <div className="group relative">
            {activeTab === ParseMode.PASTE ? (
            <textarea 
                value={textInput} 
                onChange={(e) => setTextInput(e.target.value)} 
                className="w-full h-56 p-10 bg-slate-950 text-[#ffcd00] text-[15px] font-mono rounded-[3rem] border-4 border-slate-900 outline-none shadow-2xl focus:border-indigo-600 transition-all leading-relaxed placeholder:text-slate-700" 
                placeholder=">>> ATTACH RAW TEXT BLOCK HERE... [PART_NO] [DESCRIPTION] [QTY] [UNIT_PRICE]" 
            />
            ) : (
            <label className="flex flex-col items-center justify-center w-full h-56 border-4 border-dashed border-slate-200 rounded-[3rem] cursor-pointer bg-slate-50/50 hover:bg-white hover:border-indigo-500 transition-all group/upload">
                <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-xl mb-6 text-slate-400 group-hover/upload:text-indigo-600 transition-colors border border-slate-100">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                </div>
                <p className="text-[14px] font-black uppercase text-slate-500 tracking-[0.3em] group-hover/upload:text-indigo-600 transition-colors">
                  {activeTab === ParseMode.PDF ? 'Select PDF Quote' : 'Select Excel Manifest'}
                </p>
                <input ref={pdfInputRef} type="file" className="hidden" accept=".pdf" />
                <input ref={excelInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" />
            </label>
            )}
            <div className="absolute top-6 right-10 text-[10px] font-black text-indigo-400 opacity-20 group-hover:opacity-60 transition-opacity tracking-[0.5em]">SYSTEM_I/O_01</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-16">
        <FieldGroup label="Pricing Markup" isDark>
            <select value={config.markupPercentage} onChange={(e) => updateConfig('markupPercentage', parseInt(e.target.value))} className="w-full p-5 bg-slate-900 text-[#ffcd00] text-[14px] font-black rounded-[1.5rem] border-2 border-slate-800 focus:border-indigo-600 outline-none appearance-none cursor-pointer">
                {markupOptions.map(opt => <option key={opt} value={opt}>{opt}% MARGIN</option>)}
            </select>
        </FieldGroup>
        <FieldGroup label="Trade Discount" isDark>
            <select value={config.discountPercentage} onChange={(e) => updateConfig('discountPercentage', parseInt(e.target.value))} className="w-full p-5 bg-slate-900 text-emerald-400 text-[14px] font-black rounded-[1.5rem] border-2 border-slate-800 focus:border-indigo-600 outline-none appearance-none cursor-pointer">
                {discountOptions.map(opt => <option key={opt} value={opt}>{opt}% OFF</option>)}
            </select>
        </FieldGroup>
        <FieldGroup label="Payment Terms" isDark>
            <select value={config.paymentTerms} onChange={(e) => updateConfig('paymentTerms', e.target.value)} className="w-full p-5 bg-slate-900 text-white text-[14px] font-black rounded-[1.5rem] border-2 border-slate-800 focus:border-indigo-600 outline-none appearance-none cursor-pointer">
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
            </select>
        </FieldGroup>
        <FieldGroup label="Metrics" isDark>
            <div className="flex bg-slate-900 p-2 rounded-[1.5rem] border-2 border-slate-800 h-full">
                <button onClick={() => updateConfig('weightUnit', 'LBS')} className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${config.weightUnit === 'LBS' ? 'bg-[#ffcd00] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>LBS</button>
                <button onClick={() => updateConfig('weightUnit', 'KG')} className={`flex-1 py-3 text-[11px] font-black rounded-xl transition-all ${config.weightUnit === 'KG' ? 'bg-[#ffcd00] text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>KG</button>
            </div>
        </FieldGroup>
        <FieldGroup label="Record ID" isDark>
            <div className="relative">
                <input type="text" value={config.quoteId} onChange={(e) => updateConfig('quoteId', e.target.value)} className="w-full p-5 bg-slate-900 text-white text-[12px] font-mono font-bold rounded-[1.5rem] border-2 border-slate-800 focus:border-indigo-600 outline-none pr-10" />
                {onRefreshId && <button onClick={onRefreshId} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#ffcd00] transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button>}
            </div>
        </FieldGroup>
        <FieldGroup label="P.O. REF" isDark>
            <input type="text" value={config.poNumber} onChange={(e) => updateConfig('poNumber', e.target.value)} className="w-full p-5 bg-slate-900 text-white text-[12px] font-mono font-bold rounded-[1.5rem] border-2 border-slate-800 focus:border-indigo-600 outline-none" placeholder="---" />
        </FieldGroup>
        <FieldGroup label="Logistics Rate" isDark>
            <div className="relative">
              <input 
                type="number" 
                step="0.01"
                value={config.logisticsRate} 
                onChange={(e) => updateConfig('logisticsRate', parseFloat(e.target.value) || 0)} 
                className="w-full p-5 bg-slate-900 text-[#ffcd00] text-[14px] font-black rounded-[1.5rem] border-2 border-slate-800 focus:border-indigo-600 outline-none pr-10" 
                placeholder="0.00"
              />
            </div>
        </FieldGroup>
        <FieldGroup label="Photo Mode" isDark>
            <div className="flex bg-slate-900 p-2 rounded-[1.5rem] border-2 border-slate-800 h-full text-[10px] font-black">
                <button onClick={() => updateConfig('photoMode', PhotoMode.EXTRACT)} className={`flex-1 py-3 rounded-xl transition-all ${config.photoMode === PhotoMode.EXTRACT ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>EXTRACT</button>
                <button onClick={() => updateConfig('photoMode', PhotoMode.AI)} className={`flex-1 py-3 rounded-xl transition-all ${config.photoMode === PhotoMode.AI ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>AI</button>
                <button onClick={() => updateConfig('photoMode', PhotoMode.NONE)} className={`flex-1 py-3 rounded-xl transition-all ${config.photoMode === PhotoMode.NONE ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>NONE</button>
            </div>
        </FieldGroup>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 items-center bg-slate-50/50 p-8 rounded-[3rem] border-2 border-slate-100">
        <button onClick={onAnalyze} disabled={isAnalyzing} className="md:col-span-2 bg-slate-950 text-white font-black text-sm py-8 rounded-[2.5rem] uppercase tracking-[0.3em] flex items-center justify-center gap-5 transition-all hover:bg-indigo-600 hover:-translate-y-1 active:scale-95 shadow-2xl">
            {isAnalyzing ? <div className="w-6 h-6 border-4 border-slate-400 border-t-white rounded-full animate-spin"></div> : <svg className="w-7 h-7 text-[#ffcd00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>}
            Technical Analysis Engine
        </button>
        <button 
          onClick={onEmailDispatch}
          disabled={itemsCount === 0 || !client.email}
          className={`bg-indigo-600 text-white font-black text-sm py-8 rounded-[2.5rem] uppercase tracking-[0.3em] flex items-center justify-center gap-5 transition-all hover:bg-white hover:text-indigo-600 border-4 border-transparent hover:border-indigo-600 hover:-translate-y-1 active:scale-95 shadow-2xl ${itemsCount === 0 || !client.email ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          Dispatch Protocol
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-stretch">
        <button onClick={handleProcess} className="flex-[3] bg-[#ffcd00] text-slate-950 font-black text-lg py-8 rounded-[2.5rem] uppercase tracking-[0.3em] transition-all shadow-[0_20px_50px_rgba(255,205,0,0.4)] hover:shadow-[0_25px_60px_rgba(255,205,0,0.6)] hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-5">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            {status}
        </button>
        <button 
          onClick={() => {
            if (itemsCount > 0) window.print();
            else alert("Load or process a quote first before printing.");
          }} 
          className={`flex-1 rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.2em] border-4 transition-all shadow-xl flex items-center justify-center gap-4 ${itemsCount > 0 ? 'bg-white text-slate-900 border-slate-950 hover:bg-slate-50 hover:-translate-y-1 active:scale-95' : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'}`}
        >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
            Print / Save PDF
        </button>
      </div>
    </div>
  );
};