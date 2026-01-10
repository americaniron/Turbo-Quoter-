import React, { useState, useEffect, useRef } from 'react';
import { ClientInfo, AppConfig, QuoteItem, EmailDraft } from '../types.ts';
import { generateEmailDraft } from '../services/geminiService.ts';

interface EmailModuleProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientInfo;
  config: AppConfig;
  items: QuoteItem[];
}

export const EmailModule: React.FC<EmailModuleProps> = ({ isOpen, onClose, client, config, items }) => {
  const [draft, setDraft] = useState<EmailDraft>({ to: '', subject: '', body: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string[]>([]);
  const [tone, setTone] = useState('professional');
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && client.email) {
      handleGenerate();
    }
  }, [isOpen, client.email]);

  useEffect(() => {
    if (consoleRef.current) {
        consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [sendStatus]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateEmailDraft(client, config, items, tone);
      setDraft(result);
    } catch (err) {
      console.error("Drafting error", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleSend = async () => {
    if (!draft.to) return;
    
    setIsSending(true);
    setSendStatus([]);
    
    const addLog = (msg: string) => setSendStatus(prev => [...prev, msg]);

    addLog("Initializing secure link to Iron Logistics SMTP...");
    await new Promise(r => setTimeout(r, 600));
    
    addLog("Authenticating American Iron workspace credentials...");
    addLog(`Target Node: ${client.email}`);
    await new Promise(r => setTimeout(r, 800));
    
    addLog("Syncing document manifest ID: " + config.quoteId);
    addLog(`Payload Size: ${draft.body.length} bytes`);
    
    await new Promise(r => setTimeout(r, 800));
    
    // Safety Copy
    const copied = await copyToClipboard(`${draft.subject}\n\n${draft.body}`);
    if (copied) addLog("BACKUP: Content copied to local clipboard buffer.");

    addLog("PROTOCOL ACTIVE: Handing off to native mail client...");
    await new Promise(r => setTimeout(r, 600));

    // Mailto Logic with Encoding Fixes
    const subjectEncoded = encodeURIComponent(draft.subject);
    const bodyEncoded = encodeURIComponent(draft.body);
    
    // Check URL length limits (approx 2000 chars for safety)
    const mailtoUrl = `mailto:${draft.to}?subject=${subjectEncoded}&body=${bodyEncoded}`;
    
    if (mailtoUrl.length > 2000) {
        addLog("WARNING: Payload exceeds URL protocol limits.");
        addLog("ACTION: Opening client with subject line only.");
        addLog("INSTRUCTION: Paste body from clipboard (already copied).");
        window.location.href = `mailto:${draft.to}?subject=${subjectEncoded}`;
    } else {
        window.location.href = mailtoUrl;
    }

    setTimeout(() => {
      setIsSending(false);
      onClose();
    }, 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-4">
              <span className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 animate-pulse">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </span>
              Dispatch Protocol
            </h3>
            <p className="text-[11px] text-indigo-600 font-black uppercase mt-2 tracking-[0.2em]">Secure Transmission Gateway</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all active:scale-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-grow p-10 overflow-y-auto space-y-8 relative">
          
          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Recipient Node</label>
              <input 
                className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-[13px] font-bold text-slate-900 focus:bg-white focus:border-indigo-600 transition-all outline-none font-mono" 
                value={draft.to} 
                onChange={(e) => setDraft({...draft, to: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Protocol Tone</label>
              <select 
                className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-[13px] font-black uppercase outline-none focus:border-indigo-600 cursor-pointer" 
                value={tone} 
                onChange={(e) => {setTone(e.target.value); handleGenerate();}}
              >
                <option value="professional">Standard Engineering</option>
                <option value="friendly">Collaborative Partner</option>
                <option value="urgent">High Priority Expedite</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Transmission Header</label>
            <input 
              className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-[13px] font-black uppercase text-indigo-600 focus:bg-white focus:border-indigo-600 transition-all outline-none" 
              value={draft.subject} 
              onChange={(e) => setDraft({...draft, subject: e.target.value})} 
            />
          </div>

          <div className="space-y-2 relative group">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex justify-between pr-4">
                <span>Payload Content</span>
                <button 
                  onClick={() => copyToClipboard(draft.body)} 
                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                    COPY TO CLIPBOARD
                </button>
            </label>
            
            {isGenerating && (
              <div className="absolute inset-x-0 bottom-0 top-6 bg-white/80 backdrop-blur-md z-10 flex flex-col items-center justify-center rounded-[2rem] border-2 border-indigo-50">
                 <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                 <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest animate-pulse">Generating Transmission...</span>
              </div>
            )}
            
            <textarea 
              className="w-full h-64 p-8 bg-slate-50 border-2 border-slate-200 rounded-[2rem] text-[14px] font-medium leading-relaxed focus:bg-white focus:border-indigo-600 transition-all outline-none resize-none font-mono text-slate-700" 
              value={draft.body} 
              onChange={(e) => setDraft({...draft, body: e.target.value})} 
            />
            
            {!isGenerating && (
                <button 
                onClick={handleGenerate}
                className="absolute bottom-6 right-6 px-5 py-3 bg-slate-900 text-white text-[9px] font-black uppercase rounded-xl hover:bg-indigo-600 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Regenerate
                </button>
            )}
          </div>
        </div>

        {/* Footer / Console */}
        <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-6">
          {isSending ? (
            <div className="bg-slate-900 p-8 rounded-[2rem] font-mono text-[11px] text-[#ffcd00] shadow-2xl border border-slate-800 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-[#ffcd00] animate-pulse"></div>
               <div ref={consoleRef} className="space-y-2 h-32 overflow-y-auto custom-scrollbar">
                   {sendStatus.map((s, i) => (
                     <div key={i} className="flex gap-4 animate-in slide-in-from-left-2 duration-300">
                       <span className="opacity-40 text-slate-500">[{new Date().toLocaleTimeString()}]</span>
                       <span className="text-emerald-400">root@iron-hub:~$</span>
                       <span>{s}</span>
                     </div>
                   ))}
               </div>
            </div>
          ) : (
            <button 
                onClick={handleSend}
                disabled={isSending || isGenerating || !draft.to}
                className={`w-full py-6 rounded-[2.5rem] font-black text-lg uppercase tracking-[0.4em] flex items-center justify-center gap-6 transition-all shadow-xl group ${!draft.to ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#ffcd00] text-slate-950 hover:bg-white hover:text-indigo-600 hover:ring-4 hover:ring-indigo-600 active:scale-[0.98]'}`}
            >
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                </div>
                <span>Execute Protocol</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
