import React from 'react';
import { QuoteItem, ClientInfo, AppConfig } from '../types.ts';
import { PartImage } from './PartImage.tsx';
import { Logo } from './Logo.tsx';

interface QuotePreviewProps {
  items: QuoteItem[];
  client: ClientInfo;
  config: AppConfig;
  aiAnalysis: string | null;
  customLogo: string | null;
}

const SummaryLine: React.FC<{ label: string; value: string; isTotal?: boolean }> = ({ label, value, isTotal = false }) => (
  <div className={`flex justify-between items-end ${isTotal ? 'font-bold text-base' : 'text-xs'}`}>
    <span className="whitespace-nowrap">{label}</span>
    <span className="flex-grow mx-2 border-b border-dotted border-gray-400" style={{ transform: 'translateY(-4px)' }}></span>
    <span className="whitespace-nowrap">{value}</span>
  </div>
);

export const QuotePreview: React.FC<QuotePreviewProps> = ({ items, client, config, aiAnalysis, customLogo }) => {
  if (items.length === 0) return null;

  const markupMultiplier = 1 + (config.markupPercentage / 100);
  const conversionFactor = config.weightUnit === 'KG' ? 0.453592 : 1;
  const unitLabel = config.weightUnit === 'KG' ? 'kg' : 'lbs';

  const totalWeightLbs = items.reduce((sum, item) => sum + (item.weight * item.qty), 0);
  const displayTotalWeight = totalWeightLbs * conversionFactor;
  const logisticsCost = displayTotalWeight > 0 ? (displayTotalWeight * config.logisticsRate) : 0;

  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + (item.unitPrice * markupMultiplier * item.qty), 0);
  const discountAmount = subtotalBeforeDiscount * (config.discountPercentage / 100);
  const subtotalAfterDiscount = subtotalBeforeDiscount - discountAmount;
  
  const total = subtotalAfterDiscount + logisticsCost;

  return (
    <div className="max-w-[1000px] mx-auto bg-white p-12 min-h-screen text-[#333] font-sans print:p-8 print:w-full print:max-w-none font-[Helvetica]">
      
      {/* Header - Requirement 4 & 5 */}
      <header className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          {customLogo ? 
            <img src={customLogo} alt="Logo" className="h-12 w-auto object-contain" /> :
            <div className="w-16 h-16 bg-black flex items-center justify-center p-1 rounded-md">
               <Logo className="h-12" />
            </div>
          }
          <h1 className="text-2xl font-extrabold tracking-wider text-black">AMERICAN IRON LLC QUOTING HUB</h1>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-extrabold">{config.isInvoice ? 'INVOICE' : 'QUOTATION'}</h2>
          <p className="text-sm font-bold text-gray-600 mt-1">#{config.quoteId}</p>
        </div>
      </header>

      {/* Info Grids */}
      <section className="grid grid-cols-2 gap-8 text-xs mb-8">
        <div className="border p-4 rounded-md">
          <h3 className="font-bold text-sm mb-2 border-b pb-1">Order Information</h3>
          <div className="grid grid-cols-[120px_1fr] gap-1">
            <span className="font-semibold text-gray-600">Account Number:</span><span>{client.accountNumber ? `${client.accountNumber} - ${client.company}` : client.company}</span>
            <span className="font-semibold text-gray-600">Request By Date:</span><span>{new Date().toLocaleDateString()}</span>
            <span className="font-semibold text-gray-600">Ordered By:</span>
            <div className="flex flex-col">
              <span>{client.contactName}</span>
              <span>{client.email}</span>
              <span>{client.phone}</span>
            </div>
          </div>
        </div>
        <div className="border p-4 rounded-md">
          <h3 className="font-bold text-sm mb-2 border-b pb-1">Payment Information</h3>
          <div className="grid grid-cols-[120px_1fr] gap-1">
            <span className="font-semibold text-gray-600">Billing Method:</span><span>{config.paymentTerms || 'Net 30'}</span>
            <span className="font-semibold text-gray-600">Billing Address:</span>
            <div className="flex flex-col">
              <span>{client.address}</span>
              <span>{client.city}, {client.state} {client.zip}</span>
              <span>{client.country}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border p-4 rounded-md text-xs mb-8">
         <h3 className="font-bold text-sm mb-2 border-b pb-1">Pickup & Delivery Information</h3>
         <div className="grid grid-cols-[200px_1fr] gap-2">
            <span className="font-semibold text-gray-600">Est. Pickup Date For All Items:</span><span>{config.expirationDate}</span>
            <span className="font-semibold text-gray-600">Pickup Location:</span><span>American Iron Distribution Center</span>
            <span className="font-semibold text-gray-600">Destination Address:</span>
            <span>{showShippingAddress(config, client)}</span>
         </div>
      </section>

      {/* Items Table */}
      <h3 className="font-bold text-sm mb-2 mt-10">Items In Your Order</h3>
      <table className="w-full border-collapse table-auto text-xs">
         <thead className="bg-gray-100">
            <tr className="text-left">
               <th className="p-2 w-12 font-bold">#</th>
               <th className="p-2 w-16 font-bold">Quantity</th>
               <th className="p-2 w-auto font-bold">Product Description</th>
               <th className="p-2 w-48 font-bold">Notes</th>
               <th className="p-2 w-48 font-bold">Availability</th>
               <th className="p-2 w-32 font-bold text-right">Total Price (USD)</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-gray-200">
            {items.map((item, idx) => {
               const markedUpPrice = item.unitPrice * markupMultiplier;
               const lineTotal = markedUpPrice * item.qty;
               const displayLine = item.lineNo || (idx + 1).toString();

               return (
                  <tr key={idx} className="align-top hover:bg-gray-50">
                     <td className="p-2">{displayLine})</td>
                     <td className="p-2">{item.qty}</td>
                     <td className="p-2 flex gap-3">
                        {config.photoMode !== 'none' && (
                           <div className="w-16 h-16 flex-shrink-0 bg-white border border-gray-200 flex items-center justify-center overflow-hidden rounded-md">
                               <PartImage partNo={item.partNo} description={item.desc} photoMode={config.photoMode} originalImages={item.originalImages} />
                           </div>
                        )}
                        <div>
                           <div className="font-bold text-gray-800">{item.partNo}</div>
                           <div className="text-gray-600 mt-1 whitespace-pre-wrap">{item.desc}</div>
                           <div className="text-gray-500 text-[10px] mt-1">{item.weight.toFixed(2)} lbs</div>
                        </div>
                     </td>
                     <td className="p-2 text-indigo-700 italic">{item.notes}</td>
                     <td className="p-2 font-semibold text-emerald-700">{item.availability}</td>
                     <td className="p-2 text-right">
                        <div className="font-bold">${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        <div className="text-gray-500">${markedUpPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} ea.</div>
                     </td>
                  </tr>
               );
            })}
         </tbody>
      </table>

      {/* Financial Summary */}
      <div className="flex justify-end mt-8">
        <div className="w-full max-w-sm space-y-2">
            <h3 className="font-bold text-sm mb-2 border-b pb-1">SUMMARY OF CHARGES</h3>
            <SummaryLine label={`Est. Total Weight (${unitLabel.toUpperCase()})`} value={`${displayTotalWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unitLabel}`} />
            <SummaryLine label="ORDER SUBTOTAL" value={`$${subtotalBeforeDiscount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
            {discountAmount > 0 && (
              <SummaryLine label={`TRADE DISCOUNT (${config.discountPercentage}%)`} value={`-$${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
            )}
            {logisticsCost > 0 && (
                <SummaryLine label="Shipping/Miscellaneous" value={`$${logisticsCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
            )}
            <SummaryLine label="Total Tax" value="$0.00" />
            <SummaryLine label="ORDER TOTAL" value={`$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} isTotal={true} />
        </div>
      </div>
      
       {aiAnalysis && (
        <div className="mt-8 p-4 bg-slate-50 border-l-4 border-indigo-500 rounded-r-lg">
           <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-1">Engineering Analysis</h4>
           <p className="text-xs text-slate-700 leading-relaxed">{aiAnalysis}</p>
        </div>
      )}

      {/* Repeating Print Footer - Requirement 2 & 3 */}
      <div className="print-footer print-only mt-auto pt-8">
         <h4 className="font-bold uppercase text-[9px] mb-1">TERMS & CONDITIONS</h4>
         <p className="italic mb-2 text-gray-600 whitespace-pre-wrap text-[7px] text-justify leading-tight">
            NEW PARTS TERMS / WARRANTY DISCLAIMER / LIMITATION OF LIABILITY: All products sold by American Iron LLC are brand new. Except as expressly stated in writing by Seller, Seller disclaims all warranties, express or implied, including any implied warranties of merchantability and fitness for a particular purpose. Any warranty coverage offered with the product (if any) is provided solely by the product’s manufacturer and is governed by the manufacturer’s warranty terms, procedures, and limitations; Seller does not control
         </p>
         <div className="page-number-container">
            {/* Generated by CSS counter */}
         </div>
      </div>
    </div>
  );
};

const showShippingAddress = (config: AppConfig, client: ClientInfo) => {
    if (config.shippingCompany || config.shippingAddress) {
        return `${config.shippingCompany || ''}\n${config.shippingAddress || ''}\n${config.shippingCity || ''}, ${config.shippingState || ''} ${config.shippingZip || ''}\n${config.shippingCountry || ''}`;
    }
    return `${client.address}\n${client.city}, ${client.state} ${client.zip}\n${client.country}`;
}