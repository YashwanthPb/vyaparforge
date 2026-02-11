export type InvoiceTheme = "classic" | "modern" | "minimal";
export type DCTheme = "classic" | "modern";

export interface CompanyInfo {
  name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  gstin: string;
  pan: string;
  phone: string;
  email: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  ifscCode: string;
}

export interface BuyerInfo {
  name: string;
  division: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  gstin: string;
}

export interface InvoiceItem {
  sno: number;
  partNumber: string;
  description: string;
  hsnSac: string;
  workOrder: string | null;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  poReference: string;
  deliveryNote: string;
  placeOfSupply: string;
  seller: CompanyInfo;
  buyer: BuyerInfo;
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
  amountInWords: string;
  remarks: string | null;
}

export interface DCItem {
  sno: number;
  partNumber: string;
  description: string;
  workOrder: string | null;
  qty: number;
  unit: string;
}

export interface DCData {
  dcNumber: string;
  date: string;
  poReference: string;
  vehicleNumber: string;
  transportDetails: string;
  seller: CompanyInfo;
  buyer: BuyerInfo;
  items: DCItem[];
  remarks: string | null;
}

export const DEFAULT_SELLER: CompanyInfo = {
  name: "Shri Shakthi Industries",
  tagline: "Aerospace Fabrication Supplier",
  address: "Plot No. 45, KIADB Industrial Area",
  city: "Bengaluru",
  state: "Karnataka",
  stateCode: "29",
  pincode: "560058",
  gstin: "29AAFFS1234A1ZX",
  pan: "AAFFS1234A",
  phone: "+91 80 2345 6789",
  email: "info@shrishakthi.com",
  bankName: "State Bank of India",
  bankBranch: "Industrial Finance Branch, Bengaluru",
  accountNumber: "39876543210",
  ifscCode: "SBIN0001234",
};

export const DEFAULT_BUYER: BuyerInfo = {
  name: "Hindustan Aeronautics Limited",
  division: "",
  address: "HAL Airport Road",
  city: "Bengaluru",
  state: "Karnataka",
  stateCode: "29",
  gstin: "29AAACH1234A1ZX",
};

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatINRPlain(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}
