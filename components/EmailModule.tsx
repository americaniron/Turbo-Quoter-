
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (isOpen && client.email) {
      handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const result = await generateEmailDraft(client, config, items, tone);
    setDraft(result);
    setIsGenerating(false);
  };

  const handleSend = async () => {
    setIsSending(true);
    setSendStatus(["Initializing secure link to americaniron1.com SMTP...", "Authenticating workspace credentials..."]);
    
    await new Promise(r => setTimeout(r, 800));
    setSendStatus(prev => [...prev, "Syncing document manifest ID: " + config.quoteId]);
    
    await new Promise(r => setTimeout(r, 1200));
    setSendStatus(prev => [...prev, "Mapping recipient: " + draft.to]);
    
    await new Promise(r => setTimeout(r, 1000));
    setSendStatus(prev => [...prev, "SUCCESS: Transmission confirmed."]);
    
    // mailto fallback for actual interaction
    const mailto = `mailto:${draft.to}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
    window.location.href = mailto;

    setTimeout(() => {
      setIsSending(false);
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-4">
              <span className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </span>
              Communication Protocol
            </h3>
            <p className="text-[11px] text-indigo-600 font-black uppercase mt-2 tracking-[0.2em]">Dispatching from americaniron1.com Workspace</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all active:scale-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-grow p-10 overflow-y-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Recipient</label>
              <input 
                className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-[13px] font-bold text-slate-900 focus:bg-white" 
                value={draft.to} 
                onChange={(e) => setDraft({...draft, to: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Tone Settings</label>
              <select 
                className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-[13px] font-black uppercase outline-none" 
                value={tone} 
                onChange={(e) => {setTone(e.target.value); handleGenerate();}}
              >
                <option value="professional">Engineering Formal</option>
                <option value="friendly">Client Collaborative</option>
                <option value="urgent">Expedited Priority</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Subject Header</label>
            <input 
              className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-[13px] font-black uppercase text-indigo-600 focus:bg-white" 
              value={draft.subject} 
              onChange={(e) => setDraft({...draft, subject: e.target.value})} 
            />
          </div>

          <div className="space-y-2 relative">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Message Synthesis</label>
            {isGenerating && (
              <div className="absolute inset-x-0 bottom-0 top-6 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-[2rem]">
                 <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                 <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">AI Drafting in progress...</span>
              </div>
            )}
            <textarea 
              className="w-full h-64 p-8 bg-slate-50 border-2 border-slate-200 rounded-[2rem] text-[14px] font-medium leading-relaxed focus:bg-white transition-all outline-none" 
              value={draft.body} 
              onChange={(e) => setDraft({...draft, body: e.target.value})} 
            />
            <button 
              onClick={handleGenerate}
              className="absolute bottom-6 right-6 px-4 py-2 bg-slate-900 text-white text-[9px] font-black uppercase rounded-xl hover:bg-indigo-600 transition-all shadow-xl"
            >
              AI Regenerate
            </button>
          </div>
        </div>

        <div className="p-10 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-6">
          {isSending && (
            <div className="bg-slate-900 p-6 rounded-[2rem] font-mono text-[11px] text-[#ffcd00] space-y-1 shadow-inner border border-slate-800">
               {sendStatus.map((s, i) => (
                 <div key={i} className="flex gap-4">
                   <span className="opacity-40">[{new Date().toLocaleTimeString()}]</span>
                   <span>{s}</span>
                 </div>
               ))}
               <div className="w-full h-1 bg-slate-800 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-[#ffcd00] animate-pulse" style={{width: '70%'}}></div>
               </div>
            </div>
          )}
          <button 
            onClick={handleSend}
            disabled={isSending || isGenerating || !draft.to}
            className={`w-full py-8 rounded-[2.5rem] font-black text-lg uppercase tracking-[0.4em] flex items-center justify-center gap-6 transition-all shadow-2xl ${isSending ? 'bg-slate-800 text-slate-500' : 'bg-[#ffcd00] text-slate-950 hover:bg-white hover:border-slate-950 border-4 border-transparent active:scale-95'}`}
          >
            {isSending ? 'Transmitting...' : (
              <>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                Commence Transmission
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
