export type EntryType = 'in' | 'out';
export type PaymentMethod = 'cash' | 'upi' | 'card';
export type Language = 'ml' | 'en';

export interface Entry {
  id?: number;
  type: EntryType;
  amount: number;
  item?: string;
  customerName?: string;
  note?: string;
  paymentMethod?: PaymentMethod;
  date: string; // 'YYYY-MM-DD'
  createdAt: number; // timestamp ms
}

export interface AppSettings {
  id?: number;
  shopName: string;
  language: Language;
  firstLaunchDate: string; // 'YYYY-MM-DD' or ISO
  activated: boolean;
  lastBackupAt: string | null;
}

export interface DaySummary {
  inTotal: number;
  outTotal: number;
  net: number;
  inCount: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
}
