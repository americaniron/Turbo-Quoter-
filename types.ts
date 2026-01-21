

export interface User {
  username: string;
  role: string;
  displayName: string;
}

export interface UserCredentials {
  username: string;
  password?: string;
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

export interface AdminInfo {
  companyName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string | null;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export interface AppSettings {
  adminInfo: AdminInfo;
  theme: Theme;
  users: UserCredentials[];
}


// Define global types and augment the Window interface to fix type collision errors.
// Moving the AIStudio interface into declare global ensures it merges correctly with
// existing global definitions and satisfies the requirements of the execution environment.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    pdfjsLib: any;
    pdfjsLibUrl?: string;
    XLSX: any;
    // Fix: Reference the global AIStudio type and mark as optional to avoid subsequent property declaration conflicts.
    aistudio?: AIStudio;
  }
}