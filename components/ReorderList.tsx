import React from 'react';
import { QuoteItem } from '../types.ts';
import { Logo } from './Logo.tsx';

interface ReorderListProps {
  items: QuoteItem[];
  onRemove: (index: number) => void;
  onClear: () => void;
}

export const ReorderList: React.FC<ReorderListProps> = ({ items, onRemove, onClear }) => {
  if (items.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto bg-slate-800 text-white p-6 rounded-2xl shadow-xl border border-slate-700 mb-8 break-inside-avoid">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#ffcd00] rounded flex items-center justify-center text-black font-black">
                ★
            </div>
            <h3 className="text-lg font-black uppercase tracking-wide">Saved For Reorder</h3>
        </div>
        <button 
            onClick={onClear}
            className="text-[10px] text-slate-400 hover:text-white uppercase font-bold transition-colors"
        >
            Clear List
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-700 text-[10px] uppercase text-slate-400">
              <th className="py-2 px-2">Qty</th>
              <th className="py-2 px-2">Part No</th>
              <th className="py-2 px-2">Description</th>
              <th className="py-2 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/50 transition-colors">
                <td className="py-2 px-2 text-sm font-bold text-[#ffcd00]">{item.qty}</td>
                <td className="py-2 px-2 text-xs font-bold">{item.partNo}</td>
                <td className="py-2 px-2 text-xs text-slate-300 truncate max-w-[200px]">{item.desc}</td>
                <td className="py-2 px-2 text-right">
                  <button 
                    onClick={() => onRemove(idx)}
                    className="text-red-400 hover:text-red-300 text-xs font-bold uppercase"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
        <button 
            onClick={() => window.print()}
            className="bg-[#ffcd00] hover:bg-[#e5b800] text-black text-xs font-black px-4 py-2 rounded uppercase"
        >
            Print Reorder List
        </button>
      </div>
    </div>
  );
};