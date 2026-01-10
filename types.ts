
export interface User {
  username: string;
  role: string;
  displayName: string;
}

export interface QuoteItem {
  qty: number;
  partNo: string;
  desc: string;
  weight: number; 
  unitPrice: number;
  originalImages?: string[]; 
  availability?: string;
  notes?: string;
  lineNo?: string;
}

export interface ClientInfo {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface SavedClient extends ClientInfo {
  id: string;
}

export interface AppConfig {
  markupPercentage: number;
  discountPercentage: number;
  quoteId: string;
  poNumber: string;
  expirationDate: string; 
  logisticsRate: number;
  isInvoice: boolean;
  weightUnit: 'LBS' | 'KG';
  includeAiAnalysis: boolean; 
  paymentTerms?: string;
  specialInstructions?: string;
  shippingCompany?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

export enum ParseMode {
  PASTE = 'paste',
  PDF = 'pdf',
  EXCEL = 'excel'
}

declare global {
  interface Window {
    pdfjsLib: any;
    pdfjsLibUrl?: string;
    XLSX: any;
  }
}
