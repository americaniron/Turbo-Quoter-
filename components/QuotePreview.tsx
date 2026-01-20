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
    <div className="max-w-[1000px] mx-auto bg-white p-12 min-h-screen text-[#333] font-sans print:p-8 print:w-full print:max-w-none font-[Helvetica] relative flex flex-col">
      
      {/* Header Branding */}
      <header className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          {customLogo ? 
            <img src={customLogo} alt="Official Hub Logo" className="h-12 w-auto object-contain" /> :
            <div className="w-16 h-16 bg-black flex items-center justify-center p-1 rounded-md">
               <Logo className="h-12" />
            </div>
          }
          <h1 className="text-2xl font-extrabold tracking-wider text-black">AMERICAN IRON LLC BILLING HUB</h1>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-extrabold tracking-tighter">{config.isInvoice ? 'INVOICE' : 'QUOTATION'}</h2>
          <p className="text-sm font-bold text-gray-600 mt-1">REF: {config.quoteId}</p>
        </div>
      </header>

      {/* Profile Grids */}
      <section className="grid grid-cols-2 gap-8 text-xs mb-8">
        <div className="border border-slate-200 p-4 rounded-md shadow-sm">
          <h3 className="font-bold text-sm mb-2 border-b border-slate-100 pb-1 uppercase tracking-widest text-slate-500">Origin Account</h3>
          <div className="grid grid-cols-[120px_1fr] gap-1">
            <span className="font-semibold text-gray-600">Account #:</span><span>{client.accountNumber ? `${client.accountNumber} - ${client.company}` : client.company}</span>
            <span className="font-semibold text-gray-600">Issue Date:</span><span>{new Date().toLocaleDateString()}</span>
            <span className="font-semibold text-gray-600">Official Agent:</span>
            <div className="flex flex-col">
              <span>{client.contactName}</span>
              <span>{client.email}</span>
              <span>{client.phone}</span>
            </div>
          </div>
        </div>
        <div className="border border-slate-200 p-4 rounded-md shadow-sm">
          <h3 className="font-bold text-sm mb-2 border-b border-slate-100 pb-1 uppercase tracking-widest text-slate-500">Billing Profile</h3>
          <div className="grid grid-cols-[120px_1fr] gap-1">
            <span className="font-semibold text-gray-600">Settlement Method:</span><span>{config.paymentTerms || 'Net 30'}</span>
            <span className="font-semibold text-gray-600">Registered Address:</span>
            <div className="flex flex-col">
              <span>{client.address}</span>
              <span>{client.city}, {client.state} {client.zip}</span>
              <span>{client.country}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border border-slate-200 p-4 rounded-md text-xs mb-8 shadow-sm">
         <h3 className="font-bold text-sm mb-2 border-b border-slate-100 pb-1 uppercase tracking-widest text-slate-500">Logistics Parameters</h3>
         <div className="grid grid-cols-[200px_1fr] gap-2">
            <span className="font-semibold text-gray-600">Est. Arrival/Pickup Target:</span><span>{config.expirationDate}</span>
            <span className="font-semibold text-gray-600">Release Node:</span><span>American Iron Distribution Center</span>
            <span className="font-semibold text-gray-600">Destination Final Site:</span>
            <span className="whitespace-pre-line">{showShippingAddress(config, client)}</span>
         </div>
      </section>

      {/* Transactional Line Items */}
      <h3 className="font-bold text-sm mb-2 mt-6 uppercase tracking-widest text-slate-800">Bill of Materials</h3>
      <table className="w-full border-collapse table-auto text-xs mb-8">
         <thead className="bg-slate-50 border-y border-slate-200">
            <tr className="text-left text-slate-500">
               <th className="p-3 w-12 font-bold uppercase">Idx</th>
               <th className="p-3 w-16 font-bold uppercase">Qty</th>
               <th className="p-3 w-auto font-bold uppercase">Nomenclature & Image</th>
               <th className="p-3 w-48 font-bold uppercase">Engineering Notes</th>
               <th className="p-3 w-48 font-bold uppercase">Manifest Status</th>
               <th className="p-3 w-32 font-bold text-right uppercase">Unit & Total (USD)</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => {
               const markedUpPrice = item.unitPrice * markupMultiplier;
               const lineTotal = markedUpPrice * item.qty;
               const displayLine = item.lineNo || (idx + 1).toString();

               return (
                  <tr key={idx} className="align-top hover:bg-slate-50/50 transition-colors">
                     <td className="p-3 text-slate-400 font-mono">{displayLine})</td>
                     <td className="p-3 font-bold">{item.qty}</td>
                     <td className="p-3 flex gap-4">
                        {config.photoMode !== 'none' && (
                           <div className="w-20 h-20 flex-shrink-0 bg-white border border-slate-200 flex items-center justify-center overflow-hidden rounded-lg shadow-sm">
                               <PartImage partNo={item.partNo} description={item.desc} photoMode={config.photoMode} originalImages={item.originalImages} />
                           </div>
                        )}
                        <div className="flex flex-col justify-center">
                           <div className="font-black text-slate-900 text-sm tracking-tight">{item.partNo}</div>
                           <div className="text-slate-600 mt-1 leading-relaxed max-w-[300px]">{item.desc}</div>
                           <div className="text-slate-400 text-[10px] mt-1 font-bold">CALCULATED MASS: {item.weight.toFixed(2)} lbs</div>
                        </div>
                     </td>
                     <td className="p-3 text-indigo-700 italic font-medium leading-relaxed">{item.notes}</td>
                     <td className="p-3">
                        <span className="inline-block px-2 py-1 bg-emerald-50 text-emerald-700 font-black rounded uppercase text-[10px] tracking-widest">{item.availability || 'Verified in Inventory'}</span>
                     </td>
                     <td className="p-3 text-right">
                        <div className="font-black text-slate-900 text-sm">${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="text-slate-400 text-[10px] font-bold mt-0.5">${markedUpPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} unit</div>
                     </td>
                  </tr>
               );
            })}
         </tbody>
      </table>

      {/* Financial Breakdown */}
      <div className="flex justify-end mt-4">
        <div className="w-full max-w-sm space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-xs mb-3 border-b border-slate-200 pb-2 uppercase tracking-[0.2em] text-slate-500">Charge Aggregation</h3>
            <SummaryLine label={`AGGREGATE MASS (${unitLabel.toUpperCase()})`} value={`${displayTotalWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unitLabel}`} />
            <SummaryLine label="MANIFEST SUBTOTAL" value={`$${subtotalBeforeDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            {discountAmount > 0 && (
              <SummaryLine label={`TRADE CREDIT (${config.discountPercentage}%)`} value={`-$${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            )}
            {logisticsCost > 0 && (
                <SummaryLine label="FREIGHT & LOGISTICS" value={`$${logisticsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            )}
            <SummaryLine label="APPLICABLE TAX" value="$0.00 (Exempt)" />
            <div className="mt-4 pt-4 border-t-2 border-slate-900">
                <SummaryLine label="FINAL SETTLEMENT TOTAL" value={`$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} isTotal={true} />
            </div>
        </div>
      </div>
      
       {aiAnalysis && (
        <div className="mt-12 p-6 bg-slate-900 text-white border-l-8 border-indigo-500 rounded-r-3xl shadow-xl animate-in slide-in-from-left-4 duration-500">
           <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400 mb-3 flex items-center gap-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Engineering Diagnostic Report
           </h4>
           <p className="text-sm text-slate-200 leading-relaxed italic font-medium">{aiAnalysis}</p>
        </div>
      )}

      {/* Visible Hub Disclaimer & Legal Footnote */}
      <div className="print-footer mt-auto pt-16 border-t border-slate-200 mt-20 block bg-white pb-8">
         <div className="max-w-2xl mx-auto text-center">
             <h4 className="font-black uppercase text-[10px] mb-4 text-slate-900 tracking-[0.4em]">TERMS OF DISPATCH & WARRANTY LIMITATIONS</h4>
             <p className="italic mb-6 text-slate-500 whitespace-pre-wrap text-[9px] text-justify leading-relaxed px-4">
                NEW PARTS TERMS / WARRANTY DISCLAIMER / LIMITATION OF LIABILITY: All components distributed by American Iron LLC are verified factory-new. Except where explicitly guaranteed in separate engineering documents, Seller disclaims all warranties, express or implied, including merchantability and fitness for mission-critical operations. Warranty coverage (if applicable) remains the sole jurisdiction of the OEM manufacturer. Seller assumes no liability for consequential downtime, secondary failure, or incidental damage arising from part deployment. Final validation of part compatibility rests with the customer's engineering team.
             </p>
             <div className="text-[8px] font-black text-slate-300 tracking-[0.8em] uppercase flex items-center justify-center gap-6">
                 <span>SECURE HUB</span>
                 <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                 <span>GLOBAL SUPPLY</span>
                 <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                 <span>IRON VERIFIED</span>
             </div>
             <div className="page-number-container hidden print:block">
                {/* Managed by global CSS counter */}
             </div>
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