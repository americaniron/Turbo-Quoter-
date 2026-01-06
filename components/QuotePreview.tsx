
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
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * markupMultiplier * item.qty), 0);
  const total = subtotal + logisticsCost;

  return (
    <div className="max-w-[1000px] mx-auto bg-white p-12 min-h-screen text-[#333] font-sans print:p-8 print:w-full print:max-w-none">
      {/* Document Header (Client Info / Logo) - Clean Invoice Style */}
      <div className="flex justify-between items-start mb-12 border-b border-gray-200 pb-8">
         <div className="w-1/2">
            {customLogo ? (
                <img src={customLogo} alt="Logo" className="h-16 object-contain mb-4" />
            ) : (
                <Logo className="h-16 w-auto mb-4 text-black" />
            )}
            <div className="text-sm text-gray-600">
                <p className="font-bold uppercase tracking-wide text-xs text-gray-400 mb-1">Bill To:</p>
                <p className="font-bold text-gray-800">{client.company || 'Client Company'}</p>
                <p>{client.email}</p>
                <p>{client.phone}</p>
            </div>
         </div>
         <div className="text-right w-1/2">
             <h1 className="text-3xl font-bold text-gray-800 tracking-tight mb-2">
                {config.isInvoice ? 'INVOICE' : 'QUOTE'}
             </h1>
             <div className="text-sm text-gray-600 space-y-1">
                 <div className="flex justify-end gap-4">
                     <span className="font-bold text-gray-400 text-xs uppercase pt-1">Reference:</span>
                     <span className="font-bold">{config.quoteId}</span>
                 </div>
                 <div className="flex justify-end gap-4">
                     <span className="font-bold text-gray-400 text-xs uppercase pt-1">Date:</span>
                     <span>{new Date().toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}</span>
                 </div>
                 <div className="flex justify-end gap-4">
                     <span className="font-bold text-gray-400 text-xs uppercase pt-1">{config.isInvoice ? 'Due:' : 'Expires:'}</span>
                     <span>{config.expirationDate}</span>
                 </div>
             </div>
         </div>
      </div>

      {/* Main List Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Items In Your Order</h2>
        <div className="w-full border-t border-gray-300"></div>
        
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b border-gray-300 text-[13px] font-bold text-gray-600 h-10">
                    <th className="py-2 w-10 text-center"></th> {/* Line # */}
                    <th className="py-2 w-16 text-center">Quantity</th>
                    <th className="py-2 pl-4">Product Description</th>
                    <th className="py-2 w-24">Notes</th>
                    <th className="py-2 w-32">Availability</th>
                    <th className="py-2 w-32 text-right">Total Price (USD)</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, idx) => {
                    const unitPrice = item.unitPrice * markupMultiplier;
                    const lineTotal = unitPrice * item.qty;
                    const displayWeight = (item.weight * conversionFactor).toFixed(1);

                    return (
                        <tr key={idx} className="border-b border-gray-200 text-[13px] group break-inside-avoid">
                            <td className="py-6 text-gray-500 font-medium align-top text-center">{idx + 1})</td>
                            <td className="py-6 text-gray-900 font-medium align-top text-center">{item.qty}</td>
                            <td className="py-6 pl-4 align-top">
                                <div className="flex items-start gap-4">
                                    <div className="w-20 h-20 flex-shrink-0 bg-white border border-gray-100 flex items-center justify-center p-1">
                                         <PartImage 
                                            partNo={item.partNo} 
                                            description={item.desc} 
                                            enableAI={aiEnabled} 
                                            originalImage={item.originalImage}
                                         />
                                    </div>
                                    <div className="pt-1">
                                        <div className="font-bold text-gray-800 leading-tight">
                                            {item.partNo}: {item.desc}
                                        </div>
                                        <div className="text-gray-500 mt-1">
                                            {displayWeight} {unitLabel}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-6 text-gray-500 align-top pt-7">
                                {/* Notes empty */}
                            </td>
                            <td className="py-6 text-gray-800 align-top pt-7">
                                <span className="text-green-600 font-bold">{item.qty}</span> in stock
                            </td>
                            <td className="py-6 text-right align-top pt-7">
                                <div className="font-bold text-gray-900 text-sm">
                                    ${lineTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    ${unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ea.
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </div>

      {/* Footer Totals */}
      <div className="flex justify-end mt-4 break-inside-avoid">
         <div className="w-[350px]">
             <div className="flex justify-between items-center py-1">
                 <span className="text-[13px] font-bold text-gray-700 uppercase tracking-tight">Order Subtotal:</span>
                 <span className="text-[13px] text-gray-600 font-medium">${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (USD)</span>
             </div>
             <div className="flex justify-between items-center py-1">
                 <span className="text-[13px] font-bold text-gray-700 uppercase tracking-tight">Shipping/Miscellaneous:</span>
                 <span className="text-[13px] text-gray-600 font-medium">${logisticsCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (USD)</span>
             </div>
             <div className="flex justify-between items-center py-1">
                 <span className="text-[13px] font-bold text-gray-700 uppercase tracking-tight">Total Tax:</span>
                 <span className="text-[13px] text-gray-600 font-medium">$0.00 (USD)</span>
             </div>
             <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-300">
                 <span className="text-[14px] font-black text-gray-800 uppercase tracking-tight">Order Total:</span>
                 <span className="text-[14px] font-black text-gray-800">${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} (USD)</span>
             </div>
         </div>
      </div>
      
      {/* Print-only Legal Footer to replicate full document feel */}
       <div className="mt-16 pt-8 border-t border-gray-100 text-[10px] text-gray-400 text-center print:block hidden">
          Derived from CAT Engineering Specs. Subject to Availability.
       </div>
    </div>
  );
};
