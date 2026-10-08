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

export interface PublicRepairTrack {
  cloudId: string;
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  shopLogo?: string;
  customerName?: string;
  model: string;
  complaint: string;
  status: JobStatus;
  receivedAt: number;
  readyAt?: number | null;
  deliveredAt?: number | null;
  expectedDate?: string;
  estimate?: number;
  advance?: number;
  balanceDue?: number;
  finalAmount?: number | null;
  photos?: Array<{
    photoId: string;
    dataUrl?: string;
    downloadUrl?: string;
    label?: string;
    tag?: 'intake' | 'ready';
    createdAt: number;
  }>;
  updatedAt: string;
}

export interface AppSettings extends SyncMetadata {
  id?: number;
  shopName: string;
  shopAddress?: string;
  shopPhone?: string; // 10-digit WhatsApp/call contact number
  shopLogo?: string; // compressed dataUrl avatar
  language: Language;
  firstLaunchDate: string; // 'YYYY-MM-DD' or ISO
  activated: boolean;
  proPlan?: 'monthly' | 'yearly' | 'lifetime' | null; // plan granted when activated
  proExpiresAt?: string | null; // ISO expiry for monthly/yearly; null/absent = lifetime
  lastBackupAt: string | null;
  showRepairs: boolean; // toggle for repairs module
  showStock?: boolean; // toggle for stock/inventory module
  notificationsEnabled?: boolean; // toggle for daily closing summary notification
  summaryNotificationTime?: string; // custom notification time in 'HH:mm' format (e.g. '20:30')
  wholesaleMode?: boolean; // toggle for wholesale & spares mode
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

export interface JobPhoto extends SyncMetadata {
  id?: number;
  photoId: string;
  jobCloudId: string;
  dataUrl?: string;
  downloadUrl?: string;
  label?: string;
  tag?: 'intake' | 'ready';
  createdAt: number;
  uploadedAt?: number;
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
}

export type UsedDeviceStatus = 'in_stock' | 'sold';

export type DeviceCategory = 'phone' | 'laptop' | 'tablet' | 'smartwatch' | 'earbuds' | 'other';

export interface UsedDevice extends SyncMetadata {
  id?: number;
  deviceCategory?: DeviceCategory;
  brand: string;
  model: string;
  imei?: string; // 15 digits validated for phones
  serialNumber?: string; // For non-phone gadgets (laptops, watches, earbuds, etc.)
  color?: string;
  storage?: string;
  accessories?: string[]; // e.g. ['Box', 'Charger', 'Bill']
  purchasePrice: number;
  sellingPrice?: number;
  purchaseDate: string; // 'YYYY-MM-DD'
  notes?: string;

  // Seller KYC
  sellerName: string;
  sellerPhone: string;
  sellerGovtIdType?: string; // Aadhaar, Driving License, Voter ID, PAN, Other
  sellerGovtIdNumber?: string;
  sellerIdPhotoUrl?: string; // compressed base64 / dataUrl (< 120KB)

  // Status & Resale details
  status: UsedDeviceStatus;
  soldPrice?: number;
  soldDate?: string;
  buyerName?: string;
  buyerPhone?: string;

  createdAt: number; // timestamp ms
}

