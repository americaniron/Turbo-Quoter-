export interface QuoteItem {
  qty: number;
  partNo: string;
  desc: string;
  weight: number; // Stored as number for calculations
  unitPrice: number;
}

export interface ClientInfo {
  company: string;
  email: string;
  phone: string;
}

export interface AppConfig {
  markupPercentage: number;
  quoteId: string;
  expirationDate: string; // YYYY-MM-DD format
  logisticsRate: number;
  isInvoice: boolean;
  weightUnit: 'LBS' | 'KG';
}

export enum ParseMode {
  PASTE = 'paste',
  PDF = 'pdf',
  EXCEL = 'excel'
}

// Extend window for library access if needed
declare global {
  interface Window {
    pdfjsLib: any;
    XLSX: any;
  }
}