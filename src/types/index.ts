export type EntryType = 'in' | 'out';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'credit';
export type Language = 'en';

export type SyncStatus = 'synced' | 'pending' | 'deleted';

export interface SyncMetadata {
  cloudId?: string;
  updatedAt?: string; // ISO 8601
  syncStatus?: SyncStatus;
  deletedAt?: string | null; // ISO 8601
}

export interface Entry extends SyncMetadata {
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

export interface Job extends SyncMetadata {
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

export interface AppSettings extends SyncMetadata {
  id?: number;
  shopName: string;
  language: Language;
  firstLaunchDate: string; // 'YYYY-MM-DD' or ISO
  activated: boolean;
  proPlan?: 'monthly' | 'yearly' | 'lifetime' | null; // plan granted when activated
  proExpiresAt?: string | null; // ISO expiry for monthly/yearly; null/absent = lifetime
  lastBackupAt: string | null;
  showRepairs: boolean; // toggle for repairs module
  showStock?: boolean; // toggle for stock/inventory module
  ownerUid?: string; // Firebase user UID owning these settings
}

export interface DaySummary {
  inTotal: number;
  outTotal: number;
  net: number;
  inCount: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  creditTotal: number;
}

export type StockCategory = 'product' | 'service';

export interface StockItem extends SyncMetadata {
  id?: number;
  name: string;
  category: StockCategory;
  sellingPrice: number;
  costPrice?: number;
  quantity?: number; // Stock count for products; undefined/null for services
  unit?: string; // e.g. 'pcs', 'unit', 'job', etc.
  sku?: string; // Barcode or item code
  lowStockThreshold?: number; // Alert threshold when quantity is low (default 5)
  notes?: string;
  createdAt: number;
}

export interface PurchaseItem extends SyncMetadata {
  id?: number;
  name: string;
  quantity: number;
  note?: string;
  isPurchased: boolean;
  createdAt: number;
}

export interface BillItem {
  name: string;
  qty: number;
  price: number;
  stockId?: number;
}

export interface Bill extends SyncMetadata {
  id?: number;
  invoiceNo: string; // e.g. INV-0001
  date: string; // 'YYYY-MM-DD'
  customerName?: string;
  customerPhone?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  entryId?: number; // linked Day Book entry
  createdAt: number;
}
