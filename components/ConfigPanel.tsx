

import React, { useState, useRef } from 'react';
import { AppConfig, ClientInfo, ParseMode, QuoteItem, SavedClient, User, PhotoMode } from '../types.ts';
import { parseTextData, parsePdfFile, parseExcelFile } from '../services/parserService.ts';
import { analyzePartPhoto } from '../services/geminiService.ts';
import { Logo } from './Logo.tsx';

interface ConfigPanelProps {
  itemsCount: number;
  onParseComplete: (items: QuoteItem[]) => void;
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
  onRefreshId?: () => void;
  addressBook: SavedClient[];
  onSaveToBook: (client: ClientInfo) => void;
  onDeleteFromBook: (id: string) => void;
  currentUser: User;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const COUNTRIES = [
  "United States", "Canada", "Mexico", "United Kingdom", "Germany", "France", 
  "United Arab Emirates", "Saudi Arabia", "Qatar", "Australia", "Brazil", 
  "China", "India", "Japan", "South Korea", "Singapore", "Netherlands", 
  "Spain", "Italy", "Turkey", "Egypt", "South Africa", "Chile", "Peru"
];

const FieldGroup: React.FC<{ label: string; children: React.ReactNode; className?: string; isDark?: boolean }> = ({ label, children, className, isDark }) => (
  <div className={`relative flex flex-col group ${className}`}>
    <label className={`absolute -top-2 left-3 px-1.5 text-[10px] font-black uppercase tracking-widest z-10 transition-colors ${isDark ? 'bg-slate-900 text-indigo-400' : 'bg-white text-slate-500 group-focus-within:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:group-focus-within:text-indigo-400'}`}>
      {label}
    </label>
    {children}
  </div>
);

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  itemsCount, onParseComplete, onConfigChange, onClientChange, onAnalyze, onSaveQuote, 
  onLoadQuote, onSaveDraft, onResumeDraft, onEmailDispatch, hasDraft, isAnalyzing, 
  config, client, onRefreshId,
  addressBook, onSaveToBook, onDeleteFromBook, currentUser, onLogout, onOpenSettings
}) => {
  const [activeTab, setActiveTab] = useState<ParseMode>(ParseMode.PDF);
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState("Ready");
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  const [visionResult, setVisionResult] = useState<string | null>(null);
  const [isVisionLoading, setIsVisionLoading] = useState(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const visionInputRef = useRef<HTMLInputElement>(null);

  const handleProcess = async () => {
    setStatus("Processing...");
    try {
      let items: QuoteItem[] = [];
      if (activeTab === ParseMode.PASTE) {
        if (!textInput.trim()) throw new Error("Please paste text first.");
        items = parseTextData(textInput);
      } else if (activeTab === ParseMode.PDF) {
        if (pdfFile) {
          items = await parsePdfFile(pdfFile);
        } else {
          throw new Error("Please select a PDF file first.");
        }
      } else if (activeTab === ParseMode.EXCEL) {
        if (excelFile) {
          items = await parseExcelFile(excelFile);
        } else {
          throw new Error("Please select an Excel file first.");
        }
      }
      
      if (items.length === 0) {
        throw new Error("No items detected in source. Please check the document format.");
      }
      onParseComplete(items);
      setStatus("Success");
      setPdfFile(null);
      setExcelFile(null);
      setTextInput("");
    } catch (err: any) {
      console.error(err);
      setStatus("Error");
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

  const handleVisionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsVisionLoading(true);
      setVisionResult(null);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        const result = await analyzePartPhoto(base64, file.type);
        setVisionResult(result);
        setIsVisionLoading(false);
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

  const isUS = client.country === 'United States';

  return (
    <div className="max-w-6xl mx-auto bg-white p-10 rounded-[3rem] shadow-[0_35px_100px_-15px_rgba(0,0,0,0.1)] border border-slate-200/60 mb-12 no-print relative overflow-hidden fade-in dark:bg-slate-800 dark:border-slate-700/60 dark:shadow-indigo-900/10">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#ffcd00] to-indigo-600"></div>

      <div className="absolute top-0 right-20 bg-slate-900 text-[9px] font-black text-white px-6 py-2 rounded-b-2xl flex items-center gap-4 shadow-xl z-10 border-x border-b border-white/10 dark:bg-slate-950 dark:border-slate-800">
         <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            SESSION ACTIVE: <span className="text-[#ffcd00]">{currentUser.username.toUpperCase()}</span>
         </span>
         <span className="text-slate-500">|</span>
         <span className="text-slate-400">{currentUser.role.toUpperCase()}</span>
         <button onClick={onLogout} className="ml-4 hover:text-red-500 transition-colors uppercase">Logout</button>
         <button onClick={onOpenSettings} className="ml-2 w-7 h-7 flex items-center justify-center bg-slate-700/50 rounded-lg hover:bg-slate-600 transition-colors">
            <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
         </button>
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
            
            <div className="p-8 bg-slate-50 border-b border-slate-100">
               <input 
                 type="text" 
                 placeholder="Search by company or contact name..." 
                 className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 transition-all font-bold text-slate-700"
                 value={bookSearch}
                 onChange={(e) => setBookSearch(e.target.value)}
               />
            </div>

            <div className="flex-grow overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {filteredBook.map(c => (
                  <div key={c.id} className="p-6 flex justify-between items-center group hover:bg-indigo-50 transition-colors">
                    <div>
                      <p className="font-bold text-indigo-700 text-lg">{c.company}</p>
                      <p className="text-slate-500 text-sm font-medium mt-1">{c.contactName} • <span className="font-mono text-xs">{c.email}</span></p>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { onClientChange(c); setShowAddressBook(false); }}
                        className="px-6 py-3 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all active:scale-95"
                      >
                        Select
                      </button>
                      <button
                        onClick={() => { if(confirm(`Delete ${c.company}?`)) onDeleteFromBook(c.id); }}
                        className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-all active:scale-95"
                      >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Parsing Column */}
        <div className="lg:col-span-1 space-y-8">
            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Data Intake Hub</h3>
            <div className="flex bg-slate-100 rounded-2xl p-1.5 border-2 border-slate-200 dark:bg-slate-700/50 dark:border-slate-700">
                {(Object.keys(ParseMode) as Array<keyof typeof ParseMode>).map(key => (
                  <button key={key} onClick={() => setActiveTab(ParseMode[key])} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === ParseMode[key] ? 'bg-white text-indigo-600 shadow-md dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-500 hover:bg-white/50 dark:text-slate-400 dark:hover:bg-slate-700'}`}>{ParseMode[key]}</button>
                ))}
            </div>

            <div className="p-1">
              {activeTab === ParseMode.PASTE && (
                <textarea 
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  placeholder="Paste raw text from any source document..."
                  className="w-full h-48 p-4 bg-white border-2 border-slate-200 rounded-xl resize-none font-mono text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:placeholder-slate-400"
                />
              )}
              {activeTab === ParseMode.PDF && (
                pdfFile ? (
                  <div className="w-full h-48 border-4 border-solid border-indigo-300 bg-indigo-50 rounded-3xl flex flex-col items-center justify-center p-4 text-center transition-all dark:bg-indigo-900/50 dark:border-indigo-700">
                    <p className="font-bold text-sm text-indigo-800 break-all dark:text-indigo-300">{pdfFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                    <button onClick={() => { setPdfFile(null); if (pdfInputRef.current) pdfInputRef.current.value = ''; }} className="mt-3 px-4 py-1 bg-red-500 text-white font-black text-[10px] rounded-lg hover:bg-red-600 transition-all uppercase tracking-widest">Clear</button>
                  </div>
                ) : (
                  <div onClick={() => pdfInputRef.current?.click()} className="w-full h-48 border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group dark:border-slate-600 dark:hover:bg-slate-700/50 dark:hover:border-indigo-600">
                    <input type="file" ref={pdfInputRef} onChange={(e) => setPdfFile(e.target.files?.[0] || null)} accept=".pdf" className="hidden" />
                    <span className="text-sm font-bold text-slate-400 group-hover:text-indigo-600 transition-colors dark:text-slate-500 dark:group-hover:text-indigo-400">Select PDF Document</span>
                  </div>
                )
              )}
              {activeTab === ParseMode.EXCEL && (
                 excelFile ? (
                  <div className="w-full h-48 border-4 border-solid border-emerald-300 bg-emerald-50 rounded-3xl flex flex-col items-center justify-center p-4 text-center transition-all dark:bg-emerald-900/50 dark:border-emerald-700">
                    <p className="font-bold text-sm text-emerald-800 break-all dark:text-emerald-300">{excelFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">{(excelFile.size / 1024).toFixed(1)} KB</p>
                    <button onClick={() => { setExcelFile(null); if (excelInputRef.current) excelInputRef.current.value = ''; }} className="mt-3 px-4 py-1 bg-red-500 text-white font-black text-[10px] rounded-lg hover:bg-red-600 transition-all uppercase tracking-widest">Clear</button>
                  </div>
                ) : (
                  <div onClick={() => excelInputRef.current?.click()} className="w-full h-48 border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group dark:border-slate-600 dark:hover:bg-slate-700/50 dark:hover:border-emerald-600">
                      <input type="file" ref={excelInputRef} onChange={(e) => setExcelFile(e.target.files?.[0] || null)} accept=".xlsx, .xls, .csv" className="hidden" />
                      <span className="text-sm font-bold text-slate-400 group-hover:text-emerald-600 transition-colors dark:text-slate-500 dark:group-hover:text-emerald-400">Select Excel/CSV Document</span>
                  </div>
                )
              )}
            </div>

            <button onClick={handleProcess} className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${status === 'Ready' ? 'bg-slate-900 text-white hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500' : 'bg-slate-300 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400'}`}>
                {status === 'Ready' ? 'Parse & Verify Items' : status}
            </button>
            
            <div className="border-t-2 border-slate-200 pt-8 mt-8 dark:border-slate-700">
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Vision Lab</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium dark:text-slate-400">Upload a part photo for AI identification and analysis.</p>
              <div className="mt-4">
                <input type="file" ref={visionInputRef} onChange={handleVisionUpload} accept="image/*" id="vision-upload" className="hidden"/>
                <label htmlFor="vision-upload" className="w-full text-center block py-4 bg-indigo-50 border-2 border-indigo-200 text-indigo-700 rounded-xl font-bold text-sm cursor-pointer hover:bg-indigo-100 transition-all dark:bg-indigo-900/50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900">
                  {isVisionLoading ? 'Analyzing Image...' : 'Upload for Analysis'}
                </label>
                {visionResult && (
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 whitespace-pre-wrap dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300">
                    {visionResult}
                  </div>
                )}
              </div>
            </div>

        </div>

        {/* Client Column */}
        <div className="lg:col-span-1 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Client Profile</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAddressBook(true)} className="px-4 py-2 bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase rounded-lg hover:bg-indigo-100 transition-all dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900">Directory</button>
                <button onClick={() => onSaveToBook(client)} className="px-4 py-2 bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase rounded-lg hover:bg-emerald-100 transition-all dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900">Save</button>
              </div>
           </div>
           <FieldGroup label="Company Name">
             <input type="text" className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={client.company} onChange={e => updateClient('company', e.target.value)} />
           </FieldGroup>
           <FieldGroup label="Contact Person">
             <input type="text" className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={client.contactName} onChange={e => updateClient('contactName', e.target.value)} />
           </FieldGroup>
           <div className="grid grid-cols-2 gap-4">
               <FieldGroup label="Email">
                   <input type="email" className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={client.email} onChange={e => updateClient('email', e.target.value)} />
               </FieldGroup>
               <FieldGroup label="Phone">
                   <input type="tel" className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={client.phone} onChange={e => updateClient('phone', e.target.value)} />
               </FieldGroup>
           </div>
           <FieldGroup label="Account # (Optional)">
             <input type="text" className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={client.accountNumber} onChange={e => updateClient('accountNumber', e.target.value)} />
           </FieldGroup>
           <FieldGroup label="Address">
             <input type="text" className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={client.address} onChange={e => updateClient('address', e.target.value)} />
           </FieldGroup>
           <div className="grid grid-cols-3 gap-4">
              <FieldGroup label="City" className="col-span-1">
                 <input type="text" className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={client.city} onChange={e => updateClient('city', e.target.value)} />
              </FieldGroup>
              {isUS ? (
                <>
                  <FieldGroup label="State" className="col-span-1">
                    <input type="text" className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={client.state} onChange={e => updateClient('state', e.target.value)} />
                  </FieldGroup>
                  <FieldGroup label="Zip" className="col-span-1">
                    <input type="text" className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={client.zip} onChange={e => updateClient('zip', e.target.value)} />
                  </FieldGroup>
                </>
              ) : (
                <>
                  <FieldGroup label="Province/Region" className="col-span-1">
                    <input type="text" className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={client.state} onChange={e => updateClient('state', e.target.value)} />
                  </FieldGroup>
                  <FieldGroup label="Postal Code" className="col-span-1">
                    <input type="text" className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={client.zip} onChange={e => updateClient('zip', e.target.value)} />
                  </FieldGroup>
                </>
              )}
           </div>
           <FieldGroup label="Country">
             <select value={client.country} onChange={e => updateClient('country', e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl appearance-none dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
           </FieldGroup>
        </div>

        {/* Config Column */}
        <div className="lg:col-span-1 space-y-6">
            <div className="p-6 bg-slate-900 rounded-3xl border-4 border-slate-800 text-white space-y-8 dark:border-slate-950">
              <h3 className="text-xl font-black uppercase tracking-tight text-white/90">Document & Logistics</h3>
              
              <div className="flex items-center gap-4 bg-slate-800/50 p-2 rounded-2xl border-2 border-slate-700/80">
                <button onClick={() => handleToggleInvoice(false)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${!config.isInvoice ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'text-slate-400 hover:bg-slate-700/50'}`}>
                  Quote
                </button>
                <button onClick={() => handleToggleInvoice(true)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${config.isInvoice ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'text-slate-400 hover:bg-slate-700/50'}`}>
                  Invoice
                </button>
              </div>

              <div className="relative group">
                <FieldGroup label="Document Ref ID" isDark>
                    <input type="text" value={config.quoteId} onChange={e => updateConfig('quoteId', e.target.value)} className="w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white font-mono text-sm" />
                </FieldGroup>
                <button onClick={onRefreshId} className="absolute right-2 top-2 h-10 w-10 bg-slate-700 rounded-lg flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </button>
              </div>
              
              <FieldGroup label="PO Number" isDark>
                  <input type="text" value={config.poNumber} onChange={e => updateConfig('poNumber', e.target.value)} className="w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white font-mono text-sm" />
              </FieldGroup>

              <FieldGroup label="Logistics Rate ($/unit)" isDark>
                <input type="number" step="0.01" value={config.logisticsRate} onChange={e => updateConfig('logisticsRate', Number(e.target.value))} className="w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white font-mono text-sm" />
              </FieldGroup>

              <div className="grid grid-cols-2 gap-4">
                  <FieldGroup label="Markup (%)" isDark>
                      <select value={config.markupPercentage} onChange={e => updateConfig('markupPercentage', Number(e.target.value))} className="w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white font-mono text-sm appearance-none">
                          {markupOptions.map(o => <option key={o} value={o}>{o}%</option>)}
                      </select>
                  </FieldGroup>
                  <FieldGroup label="Trade Discount (%)" isDark>
                      <select value={config.discountPercentage} onChange={e => updateConfig('discountPercentage', Number(e.target.value))} className="w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white font-mono text-sm appearance-none">
                          {discountOptions.map(o => <option key={o} value={o}>{o}%</option>)}
                      </select>
                  </FieldGroup>
              </div>
              
               <div className="grid grid-cols-2 gap-4">
                  <FieldGroup label="Weight Unit" isDark>
                      <select value={config.weightUnit} onChange={e => updateConfig('weightUnit', e.target.value)} className="w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white font-mono text-sm appearance-none">
                          <option value="LBS">LBS</option>
                          <option value="KG">KG</option>
                      </select>
                  </FieldGroup>
                  <FieldGroup label="Expiration" isDark>
                      <input type="date" value={config.expirationDate} onChange={e => updateConfig('expirationDate', e.target.value)} className="w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white font-mono text-sm" />
                  </FieldGroup>
              </div>

              <div className="border-t-2 border-slate-700/50 pt-6 space-y-4">
                 <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">Part Imagery Protocol</h4>
                 <div className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-2xl border-2 border-slate-700/80">
                     <button onClick={() => updateConfig('photoMode', PhotoMode.EXTRACT)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${config.photoMode === PhotoMode.EXTRACT ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700/50'}`}>Extract</button>
                     <button onClick={() => updateConfig('photoMode', PhotoMode.AI)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${config.photoMode === PhotoMode.AI ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700/50'}`}>AI</button>
                     <button onClick={() => updateConfig('photoMode', PhotoMode.NONE)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all ${config.photoMode === PhotoMode.NONE ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700/50'}`}>None</button>
                 </div>
                 {config.photoMode === PhotoMode.AI && (
                    <FieldGroup label="AI Image Size" isDark>
                       <select value={config.imageSize} onChange={e => updateConfig('imageSize', e.target.value)} className="w-full p-4 bg-slate-800 border-2 border-slate-700 rounded-xl text-white font-mono text-sm appearance-none">
                         <option value="1K">1K (Fastest)</option>
                         <option value="2K">2K (High-Res)</option>
                         <option value="4K">4K (Max Detail)</option>
                       </select>
                    </FieldGroup>
                 )}
              </div>
              
              <div className="border-t-2 border-slate-700/50 pt-6 space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">Engineering Hub</h4>
                  <button 
                      onClick={onAnalyze} 
                      disabled={isAnalyzing || itemsCount === 0} 
                      className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all bg-indigo-500 text-white hover:bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed shadow-lg"
                  >
                      <svg className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      {isAnalyzing ? 'Running Diagnostics...' : 'Engage AI Engineer'}
                  </button>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-4">
                <button onClick={onSaveQuote} disabled={itemsCount === 0} className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500">Export</button>
                <button onClick={onEmailDispatch} disabled={itemsCount === 0 || !client.email} className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500">Dispatch</button>
            </div>
        </div>
      </div>
    </div>
  );
};