
import React from 'react';
import { QuoteItem, ClientInfo, AppConfig } from '../types.ts';
import { PartImage } from './PartImage.tsx';
import { Logo } from './Logo.tsx';

interface QuotePreviewProps {
  items: QuoteItem[];
  client: ClientInfo;
  config: AppConfig;
  aiEnabled: boolean;
  aiAnalysis: string | null;
  customLogo: string | null;
}

export const QuotePreview: React.FC<QuotePreviewProps> = ({ items, client, config, aiEnabled, aiAnalysis, customLogo }) => {
  if (items.length === 0) return null;

  const markupMultiplier = 1 + (config.markupPercentage / 100);
  const conversionFactor = config.weightUnit === 'KG' ? 0.453592 : 1;
  const unitLabel = config.weightUnit === 'KG' ? 'kg' : 'lbs';

  const totalWeight = items.reduce((sum, item) => sum + (item.weight * conversionFactor * item.qty), 0);
  const logisticsCost = totalWeight * (config.logisticsRate || 0);
  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + (item.unitPrice * markupMultiplier * item.qty), 0);
  const discountAmount = subtotalBeforeDiscount * (config.discountPercentage / 100);
  const netSubtotal = subtotalBeforeDiscount - discountAmount;
  const total = netSubtotal + logisticsCost;

  const accentColor = config.isInvoice ? '#ef4444' : '#ffcd00';

  const formatAddress = (comp: string, addr: string, city: string, state: string, zip: string, country: string, phone?: string) => {
    return (
      <div className="text-[11px] leading-relaxed">
        <p className="font-black text-gray-900 uppercase">{comp || 'Valued Customer'}</p>
        <p className="font-bold">{addr || '---'}</p>
        <p>{city}{city && state ? ', ' : ''}{state} {zip}</p>
        <p className="font-black uppercase tracking-widest text-[9px] mt-1 text-gray-400">{country}</p>
        {phone && <p className="text-[9px] font-bold text-gray-500 mt-1 uppercase">PH: {phone}</p>}
      </div>
    );
  };

  return (
    <div className="max-w-[1000px] mx-auto bg-white p-12 min-h-screen text-[#333] font-sans print:p-4 print:w-full print:max-w-none flex flex-col">
      <div className="flex justify-between items-start mb-10 border-b-4 border-slate-900 pb-8">
         <div className="w-1/2">
            <div className="mb-6">
                {customLogo ? <img src={customLogo} alt="Logo" className="h-24 object-contain" /> : <Logo className="h-28 w-auto" />}
            </div>
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 border-b">Bill To</h3>
                    {formatAddress(client.company, client.address, client.city, client.state, client.zip, client.country, client.phone)}
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 border-b">Ship To</h3>
                    {config.shippingAddress ? 
                      formatAddress(
                        config.shippingCompany || client.company, 
                        config.shippingAddress, 
                        config.shippingCity || '', 
                        config.shippingState || '', 
                        config.shippingZip || '', 
                        config.shippingCountry || '',
                        config.shippingPhone
                      ) 
                      : <p className="text-gray-400 text-[10px] italic">Same as Billing Address</p>
                    }
                </div>
            </div>
         </div>
         <div className="text-right w-1/3">
             <div className="inline-block px-4 py-1 rounded-sm text-[11px] font-black uppercase mb-4" style={{ backgroundColor: accentColor, color: config.isInvoice ? 'white' : 'black' }}>{config.isInvoice ? 'Tax Invoice' : 'Quotation'}</div>
             <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-4 font-mono">{config.quoteId}</h1>
             <div className="text-[11px] text-gray-500 space-y-1">
                 <div className="flex justify-end gap-6"><span className="font-black uppercase text-[9px] tracking-widest">Date</span><span className="text-gray-900 font-bold">{new Date().toLocaleDateString()}</span></div>
                 {config.poNumber && <div className="flex justify-end gap-6"><span className="font-black uppercase text-[9px] tracking-widest text-gray-900">P.O. REF</span><span className="font-black text-gray-900">{config.poNumber}</span></div>}
             </div>
         </div>
      </div>

      <div className="flex-grow">
        <div className="flex justify-between items-end mb-4">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 border-l-4 border-[#ffcd00] pl-3">Order Specification</h2>
            {totalWeight > 0 && <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1">Est. Weight: {totalWeight.toFixed(1)} {unitLabel}</span>}
        </div>
        
        <table className="w-full text-left border-collapse table-fixed border-t-2 border-slate-900">
            <thead>
                <tr className="border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-widest h-12">
                    <th className="py-2 w-10 text-center">#</th>
                    <th className="py-2 w-16 text-center">Qty</th>
                    <th className="py-2 w-auto pl-4">Part No / Description</th>
                    <th className="py-2 w-32 text-right">Ext. Price</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, idx) => {
                    const unitPrice = item.unitPrice * markupMultiplier;
                    const lineTotal = unitPrice * item.qty;
                    return (
                        <tr key={idx} className="border-b border-gray-100 text-[12px] break-inside-avoid">
                            <td className="py-6 text-gray-400 font-bold text-center align-top pt-6">{idx + 1}</td>
                            <td className="py-6 text-gray-900 font-black align-top text-center text-sm">{item.qty}</td>
                            <td className="py-6 pl-4 align-top">
                                <div className="flex items-start gap-4">
                                    <div className="w-20 h-20 flex-shrink-0 bg-white border border-gray-100 flex items-center justify-center overflow-hidden rounded shadow-sm">
                                         <PartImage 
                                           partNo={item.partNo} 
                                           description={item.desc} 
                                           enableAI={aiEnabled} 
                                           originalImages={item.originalImages} 
                                         />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-black text-gray-900 leading-snug text-[13px] uppercase">{item.partNo}</div>
                                        <div className="text-[11px] text-gray-600 font-bold uppercase mt-1 leading-tight">{item.desc}</div>
                                        <div className="flex items-center gap-3 mt-2">
                                          {item.availability && <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded">{item.availability}</span>}
                                          <span className="text-[9px] text-gray-400 font-black tracking-widest uppercase">{(item.weight * conversionFactor).toFixed(2)} {unitLabel}</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-6 text-right align-top pt-6 pr-2">
                                <div className="font-black text-gray-900 text-[14px]">${lineTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                                <div className="text-[10px] text-gray-400 mt-1 font-bold">${unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2})} Ea</div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>

      <div className="flex justify-between items-start mt-8 pt-8 border-t-2 border-slate-900 mb-8">
         <div className="w-1/2">
            {config.specialInstructions && (
                <div className="mb-6">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 mb-2">Order Notes</h4>
                    <p className="text-[11px] text-gray-700 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">"{config.specialInstructions}"</p>
                </div>
            )}
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Ref: ENG-REF-{config.quoteId.split('-').pop()}</div>
         </div>
         <div className="w-80 space-y-3">
             <div className="flex justify-between items-center text-[11px] font-black text-gray-500 uppercase tracking-widest"><span>Subtotal</span><span className="text-gray-900">${subtotalBeforeDiscount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
             {config.discountPercentage > 0 && <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-widest"><span>Discount ({config.discountPercentage}%)</span><span className="text-red-600">-${discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>}
             <div className="flex justify-between items-center text-[11px] font-black text-gray-500 uppercase tracking-widest"><span>Shipping & Logistics</span><span className="text-gray-900">${logisticsCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
             <div className="flex justify-between items-center text-[11px] font-black text-indigo-600 uppercase border-t pt-2"><span>Total Cargo Weight</span><span>{totalWeight.toFixed(2)} {unitLabel}</span></div>
             <div className="flex justify-between items-center pt-4 border-t-4 border-slate-900"><span className="text-[16px] font-black text-gray-900 uppercase">{config.isInvoice ? 'Amount Due' : 'Total Estimate'}</span><span className="text-3xl font-black text-gray-900">${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
         </div>
      </div>

      <div className="mt-auto border-t border-gray-200 pt-8 pb-4 break-inside-avoid">
        <div className="mt-4 text-center text-[9px] font-black text-gray-300 uppercase tracking-[0.4em]">American Iron LLC • Logistics & Supply Hub</div>
      </div>
    </div>
  );
};
