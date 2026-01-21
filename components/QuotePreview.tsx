

import React from 'react';
import { QuoteItem, ClientInfo, AppConfig, AdminInfo } from '../types.ts';
import { PartImage } from './PartImage.tsx';
import { Logo } from './Logo.tsx';

interface QuotePreviewProps {
  items: QuoteItem[];
  client: ClientInfo;
  config: AppConfig;
  aiAnalysis: string | null;
  adminInfo: AdminInfo;
}

const SummaryLine: React.FC<{ label: string; value: string; isTotal?: boolean }> = ({ label, value, isTotal = false }) => (
  <div className={`flex justify-between items-end ${isTotal ? 'font-bold text-base' : 'text-xs'}`}>
    <span className="whitespace-nowrap">{label}</span>
    <span className="flex-grow mx-2 border-b border-dotted border-gray-400" style={{ transform: 'translateY(-4px)' }}></span>
    <span className="whitespace-nowrap">{value}</span>
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
      contact = client.contactName; // Assuming contact person is the same
      address = config.shippingAddress || client.address;
      city = config.shippingCity || client.city;
      state = config.shippingState || client.state;
      zip = config.shippingZip || client.zip;
      country = config.shippingCountry || client.country;
      phone = config.shippingPhone || client.phone;
      email = client.email;
  }

  return (
    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-200 text-xs">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">{title}</h3>
      <p className="font-bold text-slate-800 text-sm">{name}</p>
      <p className="text-slate-600 font-medium">{contact}</p>
      <address className="text-slate-600 mt-2 not-italic">
          {address}<br />
          {city}, {state} {zip}<br />
          {country}
      </address>
      <div className="mt-4 border-t border-slate-200 pt-3 space-y-2">
          {email && (
            <p className="text-slate-600 flex items-center gap-2.5">
              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              <span>{email}</span>
            </p>
          )}
          {phone && (
            <p className="text-slate-600 flex items-center gap-2.5">
              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              <span>{phone}</span>
            </p>
          )}
      </div>
    </div>
  );
};


export const QuotePreview: React.FC<QuotePreviewProps> = ({ items, client, config, aiAnalysis, adminInfo }) => {
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
      <header className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-6">
          {adminInfo.logoUrl ? 
            <img src={adminInfo.logoUrl} alt="Company Logo" className="h-20 w-auto object-contain" /> :
            <div className="w-20 h-20 bg-black flex items-center justify-center p-2 rounded-xl">
               <Logo className="h-16" />
            </div>
          }
          <div>
            <h1 className="text-4xl font-black tracking-[0.2em] text-black uppercase">{adminInfo.companyName}</h1>
            <p className="text-xs text-slate-500 font-mono mt-2">
                {adminInfo.address}, {adminInfo.city}, {adminInfo.state} {adminInfo.zip} | {adminInfo.phone} | {adminInfo.email}
            </p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-extrabold tracking-tighter">{config.isInvoice ? 'INVOICE' : 'QUOTATION'}</h2>
          <p className="text-sm font-bold text-gray-600 mt-1">REF: {config.quoteId}</p>
        </div>
      </header>

      {/* Profile Grids */}
      <section className="grid grid-cols-2 gap-8 text-xs mb-8">
        <AddressBlock title="Bill To" client={client} />
        <AddressBlock title="Ship To" client={client} config={config} isShipping={true} />
      </section>

      <section className="border border-slate-200 p-4 rounded-md text-xs mb-8 shadow-sm">
         <h3 className="font-bold text-sm mb-2 border-b border-slate-100 pb-1 uppercase tracking-widest text-slate-500">Logistics & Terms</h3>
         <div className="grid grid-cols-[200px_1fr] gap-2">
            <span className="font-semibold text-gray-600">Issue Date:</span><span>{new Date().toLocaleDateString()}</span>
            <span className="font-semibold text-gray-600">Valid Until:</span><span>{config.expirationDate}</span>
            <span className="font-semibold text-gray-600">Payment Terms:</span><span>{config.paymentTerms || 'Net 30'}</span>
            <span className="font-semibold text-gray-600">PO Number:</span><span>{config.poNumber || 'N/A'}</span>
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
                               <PartImage partNo={item.partNo} description={item.desc} photoMode={config.photoMode} imageSize={config.imageSize} originalImages={item.originalImages} />
                           </div>
                        )}
                        <div className="flex flex-col justify-center">
                           <div className="font-black text-slate-900 text-sm tracking-tight">{item.partNo}</div>
                           <div className="text-slate-600 mt-1 leading-relaxed">{item.desc}</div>
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
         <div className="max-w-3xl mx-auto text-center">
             <h4 className="font-black uppercase text-[10px] mb-4 text-slate-900 tracking-[0.4em]">TERMS, WARRANTY & RETURNS POLICY</h4>
             <p className="italic mb-6 text-slate-500 whitespace-pre-wrap text-[9px] text-justify leading-relaxed px-4">
                Terms, Warranty & Returns Policy Identification & Classification: Quotes and invoices from American Iron LLC may include both genuine OEM and aftermarket replacement parts, heavy equipment, or power systems. All manufacturer names, symbols, and part numbers are used for identification and reference purposes only; it is not implied that any item is the product of these manufacturers unless specifically labeled as "Genuine." Warranty & Liability: Genuine items are subject to the original manufacturer’s warranty. Aftermarket items are sold "as-is" unless a separate written warranty is provided. American Iron LLC disclaims all implied warranties of merchantability and shall not be liable for labor, travel, equipment downtime, or consequential damages arising from the use or failure of any supplied item. Parts Return Policy: Returns apply strictly to parts only and must be pre-authorized within [30] days of invoice. Restocking: All returned parts are subject to a 20% restocking fee and must be in original, uninstalled condition. Exclusions: Special orders, electrical components, and used equipment or power systems are sold Final Sale. Services: No returns or credits are issued for service labor, freight, or diagnostic fees.
             </p>
             <div className="text-[8px] font-black text-slate-300 tracking-[0.8em] uppercase flex items-center justify-center gap-6">
                 <span>SECURE HUB</span>
                 <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                 <span>GLOBAL SUPPLY</span>
                 <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                 <span>IRON VERIFIED</span>
             </div>
             <div className="mt-6 pt-6 border-t border-slate-100">
                 <p className="text-[9px] font-bold text-slate-500 font-mono">
                     {adminInfo.companyName} | {adminInfo.address}, {adminInfo.city}, {adminInfo.state} {adminInfo.zip} | {adminInfo.phone}
                 </p>
             </div>
             <div className="page-number-container hidden print:block">
                {/* Managed by global CSS counter */}
             </div>
         </div>
      </div>
    </div>
  );
};