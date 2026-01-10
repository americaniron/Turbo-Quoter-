
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

export const QuotePreview: React.FC<QuotePreviewProps> = ({ items, client, config, aiEnabled, customLogo }) => {
  if (items.length === 0) return null;

  const markupMultiplier = 1 + (config.markupPercentage / 100);
  const conversionFactor = config.weightUnit === 'KG' ? 0.453592 : 1;
  const unitLabel = config.weightUnit === 'KG' ? 'kg' : 'lbs';

  const totalWeight = items.reduce((sum, item) => sum + (item.weight * conversionFactor * item.qty), 0);
  const logisticsCost = totalWeight * (config.logisticsRate || 0);
  
  // Calculate raw subtotal with markup
  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + (item.unitPrice * markupMultiplier * item.qty), 0);
  
  // Calculate discount on items only
  const discountAmount = subtotalBeforeDiscount * (config.discountPercentage / 100);
  const netSubtotal = subtotalBeforeDiscount - discountAmount;
  
  // Final total including net items and logistics
  const total = netSubtotal + logisticsCost;

  const accentColor = config.isInvoice ? '#ef4444' : '#ffcd00';

  return (
    <div className="max-w-[1000px] mx-auto bg-white p-12 min-h-screen text-[#333] font-sans print:p-4 print:w-full print:max-w-none flex flex-col">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-10 border-b-2 border-slate-900 pb-8">
         <div className="w-1/2">
            <div className="mb-6">
                {customLogo ? (
                    <img src={customLogo} alt="Logo" className="h-20 object-contain" />
                ) : (
                    <div className="flex items-center gap-2">
                        <Logo className="h-14 w-auto text-black" />
                        <span className="font-black text-2xl italic tracking-tighter">AMERICAN IRON LLC</span>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-8">
                <div>
                    <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 pb-1 border-b border-gray-100">Bill To</h3>
                    <div className="text-[11px] leading-relaxed">
                        <p className="font-black text-gray-900 uppercase">{client.company || 'Cash Customer'}</p>
                        {client.contactName && <p className="font-bold">{client.contactName}</p>}
                        {client.address && <p>{client.address}</p>}
                        {client.cityStateZip && <p>{client.cityStateZip}</p>}
                        <p>{client.email}</p>
                        <p>{client.phone}</p>
                    </div>
                </div>
                <div>
                    <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 pb-1 border-b border-gray-100">Ship To</h3>
                    <div className="text-[11px] leading-relaxed">
                        {config.shippingAddress ? (
                            <p className="whitespace-pre-wrap">{config.shippingAddress}</p>
                        ) : (
                            <p className="text-gray-400 italic">Same as Billing Address</p>
                        )}
                    </div>
                </div>
            </div>
         </div>
         <div className="text-right w-1/3">
             <div 
                className="inline-block px-4 py-1 rounded-sm text-[11px] font-black uppercase mb-4"
                style={{ backgroundColor: accentColor, color: config.isInvoice ? 'white' : 'black' }}
             >
                {config.isInvoice ? 'Tax Invoice' : 'Quotation'}
             </div>
             <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-4 font-mono">{config.quoteId}</h1>
             <div className="text-[11px] text-gray-500 space-y-2">
                 {config.poNumber && (
                    <div className="flex justify-end gap-6">
                        <span className="font-black uppercase text-[9px] tracking-widest pt-0.5 text-gray-900">P.O. Number</span>
                        <span className="font-black text-gray-900">{config.poNumber}</span>
                    </div>
                 )}
                 <div className="flex justify-end gap-6">
                     <span className="font-black uppercase text-[9px] tracking-widest pt-0.5">Date</span>
                     <span className="text-gray-900 font-bold">{new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</span>
                 </div>
                 <div className="flex justify-end gap-6">
                     <span className="font-black uppercase text-[9px] tracking-widest pt-0.5">{config.isInvoice ? 'Due Date' : 'Valid Until'}</span>
                     <span className="font-black text-red-600">{config.expirationDate}</span>
                 </div>
                 {config.isInvoice && config.paymentTerms && (
                    <div className="flex justify-end gap-6">
                        <span className="font-black uppercase text-[9px] tracking-widest pt-0.5">Terms</span>
                        <span className="text-gray-900 font-bold">{config.paymentTerms}</span>
                    </div>
                 )}
             </div>
         </div>
      </div>

      {/* Items Table */}
      <div className="flex-grow">
        <div className="flex justify-between items-end mb-4">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-900 border-l-4 border-yellow-400 pl-3">Order Specification</h2>
            {totalWeight > 0 && (
                <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded">Estimated Ship Wt: {totalWeight.toFixed(1)} {unitLabel}</span>
            )}
        </div>
        
        <table className="w-full text-left border-collapse table-fixed border-t-2 border-slate-900">
            <thead>
                <tr className="border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-widest h-12">
                    <th className="py-2 w-16 text-center">Qty</th>
                    <th className="py-2 w-auto pl-4">Part No / Description</th>
                    <th className="py-2 w-32">Availability</th>
                    <th className="py-2 w-32 text-right">Ext. Price</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, idx) => {
                    const unitPrice = item.unitPrice * markupMultiplier;
                    const lineTotal = unitPrice * item.qty;
                    return (
                        <tr key={idx} className="border-b border-gray-100 text-[12px] break-inside-avoid hover:bg-slate-50 transition-colors">
                            <td className="py-6 text-gray-900 font-black align-top text-center text-sm">{item.qty}</td>
                            <td className="py-6 pl-4 align-top">
                                <div className="flex items-start gap-4">
                                    <div className="w-16 h-16 flex-shrink-0 bg-white border border-gray-100 flex items-center justify-center overflow-hidden rounded shadow-sm">
                                         <PartImage 
                                            partNo={item.partNo} 
                                            description={item.desc} 
                                            enableAI={aiEnabled} 
                                            originalImages={item.originalImages}
                                         />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-black text-gray-900 leading-snug text-[13px] uppercase">
                                            {item.partNo}
                                        </div>
                                        <div className="text-[11px] text-gray-600 font-bold uppercase mt-1">
                                            {item.desc}
                                        </div>
                                        <div className="text-[9px] text-gray-400 mt-2 uppercase font-black tracking-widest">
                                            {(item.weight * conversionFactor).toFixed(2)} {unitLabel} / Unit
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-6 align-top pt-6">
                                <span className="text-[10px] font-black text-slate-600 uppercase bg-slate-100 px-2 py-1 rounded ring-1 ring-slate-200">
                                    {item.availability || 'Direct Order'}
                                </span>
                            </td>
                            <td className="py-6 text-right align-top pt-6 pr-2">
                                <div className="font-black text-gray-900 text-[14px]">
                                    ${lineTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-1 font-bold">
                                    ${unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} Ea
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-between items-start mt-8 pt-8 border-t-2 border-slate-900 mb-12">
         <div className="w-1/2">
            {config.specialInstructions && (
                <div className="mb-6">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Order Notes</h4>
                    <p className="text-[11px] text-gray-700 bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium leading-relaxed italic">
                        "{config.specialInstructions}"
                    </p>
                </div>
            )}
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                Ref: AI-ENGINEERING-REF-{config.quoteId.split('-').pop()}
            </div>
         </div>
         <div className="w-80 space-y-4">
             <div className="flex justify-between items-center text-[11px] font-black text-gray-500 uppercase tracking-widest">
                 <span>Items Subtotal</span>
                 <span className="text-gray-900">${subtotalBeforeDiscount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
             </div>
             
             {config.discountPercentage > 0 && (
                <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                        Discount Applied ({config.discountPercentage}%)
                        <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[8px]">PROMO</span>
                    </span>
                    <span className="text-red-600">-${discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
             )}

             <div className="flex justify-between items-center text-[11px] font-black text-gray-500 uppercase tracking-widest">
                 <span>Logistics & Handling</span>
                 <span className="text-gray-900">${logisticsCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
             </div>
             <div className="flex justify-between items-center pt-4 border-t-2 border-slate-900">
                 <span className="text-[14px] font-black text-gray-900 uppercase tracking-[0.1em]">
                    {config.isInvoice ? 'Amount Due' : 'Total Estimate'}
                 </span>
                 <span className="text-2xl font-black text-gray-900">
                    ${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                 </span>
             </div>
             {config.isInvoice && (
                <p className="text-[9px] text-right font-black uppercase text-gray-400 pt-2 italic">Currency: USD</p>
             )}
         </div>
      </div>

      {/* Terms & Conditions Section */}
      <div className="mt-auto border-t border-gray-200 pt-8 pb-4 break-inside-avoid">
        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 mb-4 text-center">NEW PARTS TERMS / WARRANTY DISCLAIMER / LIMITATION OF LIABILITY</h4>
        <div className="text-[8.5px] text-gray-500 leading-normal space-y-4 text-justify px-4">
            <p>
                All products sold by <span className="font-black text-gray-900">American Iron LLC</span> are brand new. Except as expressly stated in writing by Seller, Seller disclaims all warranties, express or implied, including any implied warranties of merchantability and fitness for a particular purpose. Any warranty coverage offered with the product (if any) is provided solely by the product’s manufacturer and is governed by the manufacturer’s warranty terms, procedures, and limitations; Seller does not control manufacturer warranty determinations.
            </p>
            <p>
                Buyer is solely responsible for confirming part number accuracy, compatibility, serial-number range/application, and proper installation. Seller shall not be liable for labor, removal/installation, travel, towing, freight, downtime, loss of profits, loss of use, or any indirect, incidental, special, or consequential damages. Seller’s maximum liability for any claim is limited to the invoice price paid for the specific item(s) giving rise to the claim, at Seller’s option. Title and risk of loss transfer upon pickup or tender to carrier unless otherwise agreed in writing.
            </p>
        </div>
        <div className="mt-8 text-center text-[9px] font-black text-gray-300 uppercase tracking-[0.4em]">
            American Iron LLC • Logistics & Engineering Intelligence
        </div>
      </div>
    </div>
  );
};
