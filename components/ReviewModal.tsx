
import React, { useState, useEffect } from 'react';
import { QuoteItem } from '../types.ts';

interface ReviewModalProps {
    items: QuoteItem[];
    onConfirm: (items: QuoteItem[]) => void;
    onCancel: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ items, onConfirm, onCancel }) => {
    const [editableItems, setEditableItems] = useState<QuoteItem[]>([]);

    useEffect(() => {
        // Deep copy items to prevent mutation of original state
        setEditableItems(JSON.parse(JSON.stringify(items)));
    }, [items]);

    const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
        const newItems = [...editableItems];
        const item = { ...newItems[index] };
        
        if (field === 'qty' || field === 'weight' || field === 'unitPrice') {
            (item[field] as number) = Number(value) || 0;
        } else {
            (item[field] as string) = String(value);
        }
        
        newItems[index] = item;
        setEditableItems(newItems);
    };

    const handleRemoveItem = (index: number) => {
        setEditableItems(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[150] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-white w-full max-w-7xl rounded-[3rem] shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden">
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Review & Correct Parsed Data</h3>
                        <p className="text-[11px] text-indigo-600 font-black uppercase mt-1 tracking-[0.2em]">Verify accuracy before loading into quote</p>
                    </div>
                    <button onClick={onCancel} className="w-12 h-12 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all active:scale-90">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto bg-slate-50">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-slate-100 z-10">
                            <tr className="text-left text-slate-500">
                                <th className="p-4 w-16 font-bold uppercase tracking-wider text-xs">Line</th>
                                <th className="p-4 w-24 font-bold uppercase tracking-wider text-xs">Qty</th>
                                <th className="p-4 w-48 font-bold uppercase tracking-wider text-xs">Part No.</th>
                                <th className="p-4 font-bold uppercase tracking-wider text-xs">Description</th>
                                <th className="p-4 w-32 font-bold uppercase tracking-wider text-xs">Weight (LBS)</th>
                                <th className="p-4 w-32 font-bold uppercase tracking-wider text-xs">Unit Price</th>
                                <th className="p-4 w-20 font-bold uppercase tracking-wider text-xs text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {editableItems.map((item, index) => (
                                <tr key={index} className="hover:bg-slate-50/50">
                                    <td className="p-2 text-center text-slate-400 font-mono text-xs">{item.lineNo || index + 1}</td>
                                    <td className="p-2"><input type="number" value={item.qty} onChange={e => handleItemChange(index, 'qty', e.target.value)} className="w-full p-2 border border-slate-200 rounded-md focus:border-indigo-500 outline-none" /></td>
                                    <td className="p-2"><input type="text" value={item.partNo} onChange={e => handleItemChange(index, 'partNo', e.target.value)} className="w-full p-2 border border-slate-200 rounded-md focus:border-indigo-500 outline-none font-bold" /></td>
                                    <td className="p-2"><input type="text" value={item.desc} onChange={e => handleItemChange(index, 'desc', e.target.value)} className="w-full p-2 border border-slate-200 rounded-md focus:border-indigo-500 outline-none" /></td>
                                    <td className="p-2"><input type="number" step="0.01" value={item.weight} onChange={e => handleItemChange(index, 'weight', e.target.value)} className="w-full p-2 border border-slate-200 rounded-md focus:border-indigo-500 outline-none" /></td>
                                    <td className="p-2"><input type="number" step="0.01" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', e.target.value)} className="w-full p-2 border border-slate-200 rounded-md focus:border-indigo-500 outline-none" /></td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => handleRemoveItem(index)} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 border-t border-slate-200 bg-white flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-500">{editableItems.length} items parsed. Please verify all data.</p>
                    <div className="flex gap-4">
                        <button onClick={onCancel} className="px-8 py-4 bg-slate-200 text-slate-800 font-black text-sm uppercase rounded-2xl hover:bg-slate-300 transition-all active:scale-95">
                            Discard
                        </button>
                        <button onClick={() => onConfirm(editableItems)} className="px-10 py-4 bg-indigo-600 text-white font-black text-sm uppercase rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95">
                            Confirm & Load
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
