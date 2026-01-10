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

  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + (item.unitPrice * markupMultiplier * item.qty), 0);
  const discountAmount = subtotalBeforeDiscount * (config.discountPercentage / 100);
  const total = subtotalBeforeDiscount - discountAmount + (subtotalBeforeDiscount * 0.0); 

  return (
    <div className="max-w-[1000px] mx-auto bg-white p-12 min-h-screen text-[#333] font-sans print:p-8 print:w-full print:max-w-none relative">
      {/* Header Section - Pure American Iron Branding */}
      <div className="flex justify-between items-end mb-12 border-b-4 border-black pb-6">
        <div>
           <div className="w-64 mb-4">
              {customLogo ? <img src={customLogo} alt="Logo" className="h-16 w-auto object-contain" /> : <Logo className="h-16 w-auto" />}
           </div>
           <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Logistics & Supply Hub</div>
        </div>
        <div className="text-right">
           <h1 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">{config.isInvoice ? 'INVOICE' : 'QUOTATION'}</h1>
           <div className="text-lg font-bold text-gray-600">#{config.quoteId}</div>
           <div className="text-sm font-bold text-gray-400 mt-1">DATE: {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* Client & Logistics Grid */}
      <div className="grid grid-cols-2 gap-16 mb-12">
        <div>
           <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-4 border-b border-gray-100 pb-2">Issued To</h3>
           <div className="text-sm text-gray-800 leading-relaxed">
              <div className="font-bold text-lg uppercase mb-1">{client.company}</div>
              {client.contactName && <div>ATTN: {client.contactName}</div>}
              <div>{client.address}</div>
              <div>{client.city}, {client.state} {client.zip}</div>
              <div className="font-bold mt-2">{client.country}</div>
              <div className="mt-2 text-gray-500">{client.email}</div>
           </div>
        </div>
        
        <div>
           <h3 className="text-xs font-black uppercase text-gray-400 tracking-[0.2em] mb-4 border-b border-gray-100 pb-2">Logistics & Terms</h3>
           <div className="grid grid-cols-[120px_1fr] gap-y-2 text-sm text-gray-600">
              <div className="font-bold text-gray-900">Valid Until</div>
              <div>{config.expirationDate}</div>
              
              <div className="font-bold text-gray-900">Reference</div>
              <div>{config.poNumber || "N/A"}</div>
              
              <div className="font-bold text-gray-900">Shipment</div>
              <div>Standard Freight</div>
              
              <div className="font-bold text-gray-900">Origin</div>
              <div>American Iron Distribution Center</div>
              
              {config.shippingCompany && (
                  <>
                    <div className="font-bold text-gray-900 mt-2">Destination</div>
                    <div className="mt-2 text-xs">
                        <span className="font-bold">{config.shippingCompany}</span><br/>
                        {config.shippingAddress}<br/>
                        {config.shippingCity}, {config.shippingState}
                    </div>
                  </>
              )}
           </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse table-fixed mb-12">
         <thead>
            <tr className="border-b-2 border-black text-xs font-black uppercase text-gray-900 text-left tracking-wider">
               <th className="pb-3 w-16 pl-2">Ln #</th>
               <th className="pb-3 w-20">Qty</th>
               <th className="pb-3 w-auto">Component Detail</th>
               <th className="pb-3 w-24">Weight</th>
               <th className="pb-3 w-32">Status</th>
               <th className="pb-3 w-32 text-right pr-2">Line Total</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => {
               const unitPrice = item.unitPrice * markupMultiplier;
               const totalPrice = unitPrice * item.qty;
               const displayLine = item.lineNo || (idx + 1).toString();
               
               return (
                  <tr key={idx} className="text-sm text-gray-800 align-top hover:bg-gray-50 transition-colors">
                     <td className="py-4 pl-2 font-mono text-gray-400">{displayLine}</td>
                     <td className="py-4 font-bold">{item.qty}</td>
                     <td className="py-4 pr-4">
                        <div className="flex gap-4">
                           <div className="w-10 h-10 flex-shrink-0 bg-white border border-gray-200 flex items-center justify-center overflow-hidden rounded-md">
                               <PartImage partNo={item.partNo} description={item.desc} enableAI={aiEnabled} originalImages={item.originalImages} />
                           </div>
                           <div>
                              <div className="font-black text-gray-900">{item.partNo}</div>
                              <div className="text-gray-600 text-xs mt-1 leading-snug whitespace-pre-wrap">{item.desc}</div>
                              {item.notes && <div className="mt-1 text-xs text-indigo-600 font-medium italic">Note: {item.notes}</div>}
                           </div>
                        </div>
                     </td>
                     <td className="py-4 text-gray-500 text-xs">{(item.weight * conversionFactor).toFixed(1)} {unitLabel}</td>
                     <td className="py-4">
                        {item.availability ? (
                           <span className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-sm">
                             {item.availability}
                           </span>
                        ) : (
                           <span className="text-gray-400 text-[10px] uppercase">Checking</span>
                        )}
                     </td>
                     <td className="py-4 text-right pr-2">
                        <div className="font-bold text-gray-900">${totalPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        <div className="text-[10px] text-gray-400 mt-1">${unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2})} ea</div>
                     </td>
                  </tr>
               );
            })}
         </tbody>
      </table>

      {/* Financial Summary */}
      <div className="flex justify-end mb-12">
        <div className="w-72 bg-gray-50 p-6 rounded-xl border border-gray-100">
           <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Subtotal</span>
              <span>${subtotalBeforeDiscount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
           </div>
           {discountAmount > 0 && (
             <div className="flex justify-between text-sm text-emerald-600 mb-2 font-bold">
                <span>Discount</span>
                <span>-${discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
             </div>
           )}
           <div className="flex justify-between text-sm text-gray-600 mb-4">
              <span>Tax / Fees</span>
              <span>$0.00</span>
           </div>
           <div className="border-t-2 border-gray-200 pt-4 flex justify-between text-xl font-black text-gray-900">
              <span>TOTAL</span>
              <span>${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
           </div>
           <div className="text-[10px] text-gray-400 text-right mt-2 uppercase font-bold tracking-widest">USD Currency</div>
        </div>
      </div>

      {aiAnalysis && (
        <div className="mb-12 p-6 bg-slate-50 border-l-4 border-indigo-500 rounded-r-xl">
           <div className="flex items-center gap-3 mb-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              <h4 className="text-xs font-black uppercase tracking-widest text-indigo-900">Engineering Analysis</h4>
           </div>
           <p className="text-sm text-slate-700 leading-relaxed">{aiAnalysis}</p>
        </div>
      )}

      {/* Terms Footer */}
      <div className="border-t border-gray-200 pt-8 text-[9px] text-gray-500 leading-normal text-justify">
         <p className="mb-3"><strong className="text-gray-900">IMPORTANT NOTICE – PARTS & EQUIPMENT TERMS:</strong> Unless expressly stated in writing, Seller provides no warranty, express or implied, including any warranty of merchantability, fitness for a particular purpose, or non-infringement. All goods (including used, surplus, rebuilt, remanufactured, or refurbished items) are sold AS-IS, WHERE-IS, with all faults. Buyer acknowledges that condition may vary and that any inspection reports, photos, and descriptions are approximate and for reference only.</p>
         
         <p className="mb-3">Buyer is responsible for confirming part numbers, measurements, serial-number ranges, interchangeability, calibration/programming requirements, and proper installation by qualified personnel. Seller is not responsible for improper installation, misuse, normal wear, contamination, overheating, lack of maintenance, or application outside intended design.</p>
         
         <p className="mb-4">
            <strong className="text-gray-900">Core/Exchange Items:</strong> Core charges apply where indicated and are refundable only upon receipt and acceptance of the returned core in accordance with Seller’s core requirements (completeness, rebuildability, and return timelines).<br/>
            <strong className="text-gray-900">Limitation of Liability:</strong> Seller’s maximum liability shall not exceed the amount paid for the specific item giving rise to the claim. Seller shall not be liable for labor, removal/installation, travel, towing, freight, demurrage, downtime, loss of use, lost profits, or any incidental/consequential damages.<br/>
            <strong className="text-gray-900">Title/Risk of Loss:</strong> Title and risk of loss pass to Buyer upon pickup or tender to carrier (FOB Seller location) unless otherwise stated in writing.<br/>
            <strong className="text-gray-900">Returns:</strong> No returns without prior written authorization; returns may be subject to restocking fees and must be in original condition/packaging.
         </p>

         <p className="text-center font-bold text-gray-900">American Iron LLC | Global Logistics & Heavy Machinery Supply | www.americaniron1.com</p>
      </div>

      <div className="print-footer print-only mt-auto pt-8 text-center text-[8px] text-gray-300 uppercase tracking-widest">
         American Iron LLC • Page <span className="page-number"></span>
      </div>
    </div>
  );
};