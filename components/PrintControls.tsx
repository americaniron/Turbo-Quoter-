
import React from 'react';

interface PrintControlsProps {
  onPrint: () => void;
}

export const PrintControls: React.FC<PrintControlsProps> = ({ onPrint }) => {
  return (
    <div className="max-w-[1000px] mx-auto my-8 no-print flex justify-end gap-4 fade-in">
      <button
        onClick={onPrint}
        className="px-8 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95 flex items-center gap-3"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
        Print / Save as PDF
      </button>
    </div>
  );
};
