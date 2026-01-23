
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
    <span className="whitespace-nowrap uppercase tracking-wider font-semibold text-slate-500">{label}</span>
    <span className="flex-grow mx-2 border-b border-dotted border-slate-300" style={{ transform: 'translateY(-4px)' }}></span>
    <span className="whitespace-nowrap font-mono font-bold text-slate-900">{value}</span>
  </div>
);

const AddressBlock: React.FC<{ title: string; client: ClientInfo; config?: AppConfig; isShipping?: boolean }> = ({ title, client, config, isShipping = false }) => {
  let name = client.company;
  let contact = client.contactName;
  let address = client.address;
  let city = client.city;
  let state = client.state;
  let zip = client.zip;
  let country = client.country;
  let email = client.email;
  let phone = client.phone;

  if (isShipping && config && (config.shippingCompany || config.shippingAddress)) {
      name = config.shippingCompany || client.company;
      contact = client.contactName;
      address = config.shippingAddress || client.address;
      city = config.shippingCity || client.city;
      state = config.shippingState || client.state;
      zip = config.shippingZip || client.zip;
      country = config.shippingCountry || client.country;
      phone = config.shippingPhone || client.phone;
      email = client.email;
  }

  return (
    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 text-xs h-full">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">{title}</h3>
      <p className="font-bold text-slate-800 text-sm">{name}</p>
      <p className="text-slate-600 font-medium">{contact}</p>
      <address className="text-slate-600 mt-2 not-italic leading-relaxed">
          {address}<br />
          {city}, {state} {zip}<br />
          {country}
      </address>
      <div className="mt-4 border-t border-slate-200 pt-3 space-y-2">
          {email && (
            <p className="text-slate-600 flex items-center gap-2.5">
              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              <span className="font-mono">{email}</span>
            </p>
          )}
          {phone && (
            <p className="text-slate-600 flex items-center gap-2.5">
              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              <span className="font-mono">{phone}</span>
            </p>
          )}
      </div>
    </div>
  );
};


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
    <div className="max-w-[1000px] mx-auto bg-white p-12 min-h-screen text-[#333] font-sans print:w-full print:max-w-none print:p-0 print:min-h-0 print:block font-[Helvetica] relative flex flex-col">
      
      {/* Header Branding */}
      <header className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-6">
          {customLogo ? 
            <img src={customLogo} alt="Official Hub Logo" className="h-20 w-auto object-contain" /> :
            <div className="w-20 h-20 bg-black flex items-center justify-center p-2 rounded-xl">
               <Logo className="h-16" />
            </div>
          }
          <div>
            <h1 className="text-2xl font-black tracking-[0.2em] text-black uppercase">AMERICAN IRON LLC</h1>
            <p className="text-sm text-slate-500 font-bold tracking-widest">LOGISTICS & SUPPLY HUB</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-extrabold tracking-tighter">{config.isInvoice ? 'INVOICE' : 'QUOTATION'}</h2>
          <p className="text-sm font-bold text-gray-600 mt-1 font-mono">REF: {config.quoteId}</p>
        </div>
      </header>

      {/* Profile Grids */}
      <section className="grid grid-cols-2 gap-8 text-xs mb-8 items-stretch">
        <AddressBlock title="Bill To" client={client} />
        <AddressBlock title="Ship To" client={client} config={config} isShipping={true} />
      </section>

      <section className="border border-slate-200 p-4 rounded-md text-xs mb-8 shadow-sm bg-white break-inside-avoid">
         <h3 className="font-bold text-sm mb-2 border-b border-slate-100 pb-1 uppercase tracking-widest text-slate-500">Logistics & Terms</h3>
         <div className="grid grid-cols-[200px_1fr] gap-2">
            <span className="font-semibold text-gray-600">Issue Date:</span><span className="font-mono">{new Date().toLocaleDateString()}</span>
            <span className="font-semibold text-gray-600">Valid Until:</span><span className="font-mono">{config.expirationDate}</span>
            <span className="font-semibold text-gray-600">Payment Terms:</span><span className="font-bold uppercase">{config.paymentTerms || 'Net 30'}</span>
            <span className="font-semibold text-gray-600">PO Number:</span><span className="font-mono">{config.poNumber || 'N/A'}</span>
         </div>
      </section>

      {/* Transactional Line Items */}
      <h3 className="font-bold text-sm mb-2 mt-6 uppercase tracking-widest text-slate-800">Bill of Materials</h3>
      <table className="w-full border-collapse table-fixed text-[10px] mb-8">
         <colgroup>
            <col style={{ width: '40px' }} />
            <col style={{ width: '60px' }} />
            <col />
            <col style={{ width: '150px' }} />
            <col style={{ width: '100px' }} />
            <col style={{ width: '120px' }} />
         </colgroup>
         <thead className="bg-slate-50 border-y border-slate-200">
            <tr className="text-left text-slate-500">
               <th className="p-2 font-bold uppercase">Idx</th>
               <th className="p-2 font-bold uppercase text-right">Qty</th>
               <th className="p-2 font-bold uppercase">Description & Part No</th>
               <th className="p-2 font-bold uppercase">Engineering Notes</th>
               <th className="p-2 font-bold uppercase text-center">Status</th>
               <th className="p-2 font-bold uppercase text-right">Unit & Total (USD)</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => {
               const markedUpPrice = item.unitPrice * markupMultiplier;
               const lineTotal = markedUpPrice * item.qty;
               const displayLine = item.lineNo || (idx + 1).toString();

               return (
                  <tr key={idx} className="align-top hover:bg-slate-50/50 transition-colors">
                     <td className="p-2 text-slate-400 font-mono">{displayLine})</td>
                     <td className="p-2 font-bold text-right font-mono">{item.qty}</td>
                     <td className="p-2">
                        <div className="flex gap-3">
                           {config.photoMode !== 'none' && (
                              <div className="w-12 h-12 flex-shrink-0 bg-white border border-slate-200 flex items-center justify-center overflow-hidden rounded shadow-sm">
                                  <PartImage partNo={item.partNo} description={item.desc} photoMode={config.photoMode} imageSize={config.imageSize} originalImages={item.originalImages} />
                              </div>
                           )}
                           <div className="min-w-0">
                              <div className="font-black text-slate-900 text-[11px] tracking-tight font-mono">{item.partNo}</div>
                              <div className="text-slate-600 leading-tight uppercase line-clamp-2">{item.desc}</div>
                              <div className="text-slate-400 text-[9px] mt-1 font-bold">MASS: {item.weight.toFixed(2)} lbs</div>
                           </div>
                        </div>
                     </td>
                     <td className="p-2 text-slate-600 italic leading-snug break-words">{item.notes}</td>
                     <td className="p-2 text-center">
                        <span className="inline-block px-1.5 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded uppercase text-[8px] tracking-widest border border-emerald-100 whitespace-nowrap">{item.availability || 'In Stock'}</span>
                     </td>
                     <td className="p-2 text-right">
                        <div className="font-black text-slate-900 text-[11px] font-mono">${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="text-slate-400 text-[8px] font-bold mt-0.5 font-mono">${markedUpPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ea</div>
                     </td>
                  </tr>
               );
            })}
         </tbody>
      </table>

      {/* Financial Breakdown - Wrapped in a hard block to prevent breaking */}
      <div className="flex justify-end mt-4 break-inside-avoid">
        <div className="w-full max-w-sm bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-black text-[11px] mb-4 border-b-2 border-slate-200 pb-2 uppercase tracking-[0.2em] text-slate-500">Financial Summary</h3>
            <div className="space-y-3">
                <SummaryLine label={`Total Mass (${unitLabel.toUpperCase()})`} value={`${displayTotalWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${unitLabel}`} />
                <SummaryLine label="Manifest Subtotal" value={`$${subtotalBeforeDiscount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                {discountAmount > 0 && (
                  <SummaryLine label={`Trade Discount (${config.discountPercentage}%)`} value={`-$${discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                )}
                {logisticsCost > 0 && (
                    <SummaryLine label="Estimated Freight" value={`$${logisticsCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                )}
                <SummaryLine label="Tax Total" value="$0.00 (Exempt)" />
                <div className="mt-6 pt-6 border-t-4 border-slate-900">
                    <SummaryLine label="Grand Total (USD)" value={`$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} isTotal={true} />
                </div>
            </div>
        </div>
      </div>
      
       {aiAnalysis && (
        <div className="mt-10 p-6 bg-slate-900 text-white border-l-8 border-indigo-500 rounded-r-2xl shadow-xl break-inside-avoid">
           <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-3 flex items-center gap-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Engineering Diagnostic Report
           </h4>
           <p className="text-[11px] text-slate-200 leading-relaxed italic font-medium">{aiAnalysis}</p>
        </div>
      )}

      {/* Visible Hub Disclaimer & Legal Footnote */}
      <div className="print-footer mt-auto pt-10 border-t border-slate-200 block bg-white pb-6 break-inside-avoid">
         <div className="text-center">
             <h4 className="font-black uppercase text-[9px] mb-2 text-slate-900 tracking-[0.3em]">TERMS, WARRANTY & RETURNS POLICY</h4>
             <p className="italic mb-4 text-slate-400 whitespace-pre-wrap text-[7.5px] text-justify leading-relaxed px-4">
                Terms, Warranty & Returns Policy: All manufacturer names, symbols, and part numbers are used for identification and reference purposes only; it is not implied that any item is the product of these manufacturers unless specifically labeled as "Genuine." Genuine items are subject to the original manufacturer’s warranty. Aftermarket items are sold "as-is" unless a separate written warranty is provided. American Iron LLC disclaims all implied warranties of merchantability and shall not be liable for labor, travel, or consequential damages. Returns must be pre-authorized within [30] days and are subject to a 20% restocking fee. No returns on special orders or electrical components.
             </p>
             <div className="text-[7px] font-black text-slate-300 tracking-[0.6em] uppercase flex items-center justify-center gap-4">
                 <span>SECURE HUB</span>
                 <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                 <span>GLOBAL SUPPLY</span>
                 <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                 <span>IRON VERIFIED</span>
             </div>
         </div>
      </div>
    </div>
  );
};
