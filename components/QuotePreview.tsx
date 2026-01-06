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
  
  // Weights are stored in LBS. Convert for display/calculation if KG is selected.
  // 1 LB = 0.453592 KG
  const conversionFactor = config.weightUnit === 'KG' ? 0.453592 : 1;
  const unitLabel = config.weightUnit;

  // Calculate Total Weight in the SELECTED unit
  const totalWeight = items.reduce((sum, item) => sum + (item.weight * conversionFactor * item.qty), 0);
  
  // Logistics Cost = Total Weight (in selected unit) * Rate (per selected unit)
  const logisticsCost = totalWeight * (config.logisticsRate || 0);

  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * markupMultiplier * item.qty), 0);
  const total = subtotal + logisticsCost;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
        month: 'long', 
        day: 'numeric', 
        year: 'numeric'
    }).toUpperCase();
  };
  
  const today = formatDate(new Date());
  
  // Safe date parsing ensuring no issues with timezones on basic YYYY-MM-DD
  const getExpirationDate = () => {
      if (!config.expirationDate) return 'UNDEFINED';
      const [y, m, d] = config.expirationDate.split('-').map(Number);
      return formatDate(new Date(y, m - 1, d));
  };

  const expirationText = getExpirationDate();

  return (
    <div className="w-[800px] mx-auto bg-white p-12 shadow-2xl mb-12 relative print:shadow-none print:w-full print:max-w-none print:p-12 print:mb-0 print:mx-0">
      {/* Quote Header */}
      <div className="flex justify-between items-start mb-10 print:mb-8">
        <div>
          {/* Logo Component */}
          {customLogo ? (
            <img src={customLogo} alt="Company Logo" className="h-32 print:h-20 w-auto object-contain mb-2 block print:block" />
          ) : (
            <Logo className="h-32 print:h-20 w-auto object-contain mb-2 block print:block" />
          )}
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] pl-1 print:text-slate-600">
            {config.isInvoice ? 'Commercial Invoice & Logistics' : 'Engineering Component Logistics'}
          </p>
        </div>
        <div className="text-right pt-4">
          <p className="text-sm font-black text-slate-800">
             {config.isInvoice ? 'INVOICE #:' : 'REF:'} {config.quoteId}
          </p>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 print:text-slate-600">DATE: {today}</p>
          <p className={`text-[10px] font-bold uppercase mt-1 ${config.isInvoice ? 'text-slate-900' : 'text-red-500'}`}>
            {config.isInvoice ? 'DUE DATE:' : 'VALID UNTIL:'} {expirationText}
          </p>
        </div>
      </div>

      {/* Client & Intelligence Grid */}
      <div className="grid grid-cols-2 gap-12 mt-10 mb-8 print:mt-4 print:mb-6 print:gap-8">
        {/* Left Col: Client */}
        <div className="break-inside-avoid">
          <div className={`border-b-4 ${config.isInvoice ? 'border-red-600' : 'border-[#ffcd00]'} bg-slate-50 print:bg-slate-50 px-3 py-2 font-bold uppercase text-[10px] text-slate-700 mb-3 print:border-b-2`}>
            {config.isInvoice ? 'Bill To' : 'Client Recipient'}
          </div>
          <div className="text-xs space-y-1 pl-1">
            <p className="font-black text-slate-900 uppercase">{client.company || 'Valued Customer'}</p>
            <p className="text-slate-500 font-bold print:text-slate-700">{client.email}</p>
            <p className="text-slate-500 font-bold print:text-slate-700">{client.phone}</p>
          </div>
        </div>
        
        {/* Right Col: Engineering Insights (Formerly AI) */}
        {aiAnalysis && !config.isInvoice && (
           <div className="break-inside-avoid flex flex-col h-full shadow-lg rounded-lg overflow-hidden border border-slate-300 relative print:shadow-none print:border-slate-800">
            {/* Header */}
            <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b-2 border-[#ffcd00] print:bg-slate-800">
                 <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ffcd00] animate-pulse print:hidden"></span>
                    <span className="font-black uppercase text-[10px] text-white tracking-widest leading-none">
                        System Diagnostic & Recommendations
                    </span>
                 </div>
                 <svg className="w-4 h-4 text-[#ffcd00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </div>
            
            {/* Body */}
            <div className="flex-1 bg-yellow-50 p-4 relative print:bg-white">
                 {/* Decorative Watermark */}
                 <div className="absolute -bottom-4 -right-4 p-4 opacity-[0.05] pointer-events-none print:hidden">
                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
                 </div>

                 {/* Content */}
                 <p className="text-[10px] text-slate-800 font-medium leading-relaxed font-mono text-justify relative z-10">
                    "{aiAnalysis}"
                 </p>

                 {/* Call to Action Badge */}
                 <div className="mt-4 flex items-center justify-between border-t border-yellow-200 pt-3">
                     <div className="flex items-center gap-2">
                        <span className="bg-[#ffcd00] text-black text-[8px] font-black px-2 py-1 uppercase rounded print:border print:border-black">Action Required</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Review Missing Components</span>
                     </div>
                 </div>
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className={`border-b-4 ${config.isInvoice ? 'border-red-600' : 'border-[#ffcd00]'} bg-slate-50 print:bg-slate-50 px-3 py-2 font-bold uppercase text-[10px] text-slate-700 mb-3 print:border-b-2`}>
        {config.isInvoice ? 'Invoice Detail' : 'Component Assessment'}
      </div>
      
      <table className="w-full border-collapse mb-8 print:mb-6">
        <thead>
          <tr className="break-inside-avoid">
            <th className="text-center border-b-2 border-black py-3 px-1 text-[10px] font-black uppercase text-slate-600 w-10">Line</th>
            <th className="text-center border-b-2 border-black py-3 px-1 text-[10px] font-black uppercase text-slate-600 w-12">Qty</th>
            <th className="text-left border-b-2 border-black py-3 px-1 text-[10px] font-black uppercase text-slate-600 w-28">Reference</th>
            <th className="text-left border-b-2 border-black py-3 px-1 text-[10px] font-black uppercase text-slate-600">Part Description</th>
            <th className="text-center border-b-2 border-black py-3 px-1 text-[10px] font-black uppercase text-slate-600 w-20">Weight</th>
            <th className="text-right border-b-2 border-black py-3 px-1 text-[10px] font-black uppercase text-slate-600 w-24">Unit Val</th>
            <th className="text-right border-b-2 border-black py-3 px-1 text-[10px] font-black uppercase text-slate-600 w-24">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const unitPrice = item.unitPrice * markupMultiplier;
            const lineTotal = unitPrice * item.qty;
            const displayWeight = item.weight * conversionFactor;
            
            return (
              <tr key={idx} className="border-b border-slate-100 group break-inside-avoid print:border-slate-300">
                <td className="py-4 px-1 align-top text-center text-xs font-bold text-slate-400 print:text-slate-600">{idx + 1}</td>
                <td className="py-4 px-1 align-top text-center text-sm font-black text-slate-800">{item.qty}</td>
                <td className="py-4 px-1 align-top">
                    {/* Exact Part Photo Generation handled in Component */}
                    <div className="print:grayscale">
                        <PartImage partNo={item.partNo} description={item.desc} enableAI={aiEnabled} />
                    </div>
                </td>
                <td className="py-4 px-1 align-top">
                  <p className="font-black text-xs uppercase text-slate-900 mb-1">{item.partNo}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase leading-tight whitespace-pre-wrap break-words print:text-slate-800">{item.desc}</p>
                </td>
                <td className="py-4 px-1 align-top text-center">
                    <span className="font-bold text-[10px] text-slate-700">{displayWeight.toFixed(2)}</span>
                    <br/>
                    <span className="text-[8px] text-slate-300 font-black print:text-slate-500">{unitLabel}</span>
                </td>
                <td className="py-4 px-1 align-top text-right font-bold text-xs text-slate-600 print:text-slate-800">
                  ${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-1 align-top text-right font-black text-xs text-slate-900">
                  ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="ml-auto w-72 bg-slate-50 p-6 border border-slate-200 rounded-xl break-inside-avoid print:bg-slate-50 print:border-slate-300 print:w-64">
        <div className="flex justify-between text-[11px] py-1 border-b border-slate-200 mb-2 print:border-slate-300">
            <span className="text-slate-400 font-bold uppercase print:text-slate-600">Subtotal</span>
            <span className="font-black text-slate-800">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        
        {/* Total Weight Display */}
        <div className="flex justify-between text-[11px] py-1 border-b border-slate-200 mb-2 print:border-slate-300">
            <span className="text-slate-400 font-bold uppercase print:text-slate-600">Total Weight</span>
            <span className="font-black text-slate-800">{totalWeight.toFixed(2)} {unitLabel}</span>
        </div>

        {/* Logistics Calculated Display */}
        <div className="flex justify-between text-[11px] py-1 mb-2">
            <span className="text-slate-400 font-bold uppercase print:text-slate-600">Logistics (Rate ${config.logisticsRate?.toFixed(2)})</span>
            <span className="font-black text-slate-800">${logisticsCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        
        <div className={`${config.isInvoice ? 'bg-red-600 text-white' : 'bg-black text-[#ffcd00] print:bg-white'} p-4 rounded-lg flex justify-between items-center mt-4 print:border print:border-black`}>
            <span className={`uppercase text-xs font-black tracking-tight ${!config.isInvoice && 'print:text-black'}`}>{config.isInvoice ? 'Total Due' : 'Total Quote'}</span>
            <span className={`text-xl font-black ${!config.isInvoice && 'print:text-black'}`}>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Footer & Disclaimer */}
      <div className="mt-16 break-inside-avoid print:mt-12">
        <div className="mb-6 p-4 bg-slate-50 border border-slate-100 rounded text-justify print:bg-white print:border-slate-200">
             <p className="text-[8px] text-slate-500 font-medium uppercase leading-relaxed tracking-wide print:text-slate-600">
                Seller makes no warranty, express or implied, with respect to the goods or services, including any warranty of merchantability or fitness for a particular purpose. The goods being sold are sold on an as-is, as they stand, with all faults basis, and seller disclaims any implied warranties with respect to said goods. All other warranty disclaimers contained herein are additionally applicable.
             </p>
        </div>
        <div className="border-t border-slate-200 pt-6 text-[8px] text-slate-300 font-black text-center uppercase tracking-widest print:text-slate-400">
            © 2025 American Iron LLC. Derived from CAT Engineering Specs. Values valid until {expirationText}.
        </div>
      </div>
    </div>
  );
};