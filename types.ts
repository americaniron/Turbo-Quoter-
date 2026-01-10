
export interface User {
  username: string;
  role: string;
  displayName: string;
}

export interface QuoteItem {
  qty: number;
  partNo: string;
  desc: string;
  weight: number; // Stored as number for calculations
  unitPrice: number;
  originalImages?: string[]; // Base64 data of extracted images
  availability?: string; // Extracted availability text
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
  expirationDate: string; // YYYY-MM-DD format
  logisticsRate: number;
  isInvoice: boolean;
  weightUnit: 'LBS' | 'KG';
  includeAiAnalysis: boolean; // New toggle for AI Brainstorming visibility
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

export enum ParseMode {
  PASTE = 'paste',
  PDF = 'pdf',
  EXCEL = 'excel'
}

declare global {
  interface Window {
    pdfjsLib: any;
    XLSX: any;
  }
}
