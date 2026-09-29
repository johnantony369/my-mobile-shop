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
  repairId?: number; // link to job if created from repair delivery
}

export type JobStatus = 'received' | 'waiting' | 'ready' | 'delivered' | 'returned';

export interface Job {
  id?: number;
  customerName: string;
  phone: string; // 10-digit Indian mobile
  model: string;
  complaint: string;
  imei?: string;
  estimate?: number;
  advance: number;
  finalAmount?: number | null;
  status: JobStatus;
  expectedDate?: string; // 'YYYY-MM-DD'
  receivedAt: number; // timestamp ms
  readyAt?: number | null; // timestamp ms
  deliveredAt?: number | null; // timestamp ms
  bookEntryId?: number | null; // link to entries table
}

export interface AppSettings {
  id?: number;
  shopName: string;
  language: Language;
  firstLaunchDate: string; // 'YYYY-MM-DD' or ISO
  activated: boolean;
  lastBackupAt: string | null;
  showRepairs: boolean; // toggle for repairs module
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
