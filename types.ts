

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
  accountNumber: string;
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

export enum PhotoMode {
  EXTRACT = 'extract',
  AI = 'ai',
  NONE = 'none'
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
  photoMode: PhotoMode;
  imageSize: '1K' | '2K' | '4K';
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

// Define the AIStudio interface to match the environment's expected named type
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Fixed Window interface capitalization and added aistudio members
declare global {
  interface Window {
    pdfjsLib: any;
    pdfjsLibUrl?: string;
    XLSX: any;
    // Fix: Use the named AIStudio type and mark it as optional (?) to match the environment's global declaration
    aistudio?: AIStudio;
  }
}