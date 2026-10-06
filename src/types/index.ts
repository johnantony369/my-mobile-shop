export type EntryType = 'in' | 'out';
export type PaymentMethod = 'cash' | 'upi' | 'card';
export type Language = 'en';

export type SyncStatus = 'synced' | 'pending' | 'deleted';

export interface SyncMetadata {
  cloudId?: string;
  updatedAt?: string; // ISO 8601
  syncStatus?: SyncStatus;
  deletedAt?: string | null; // ISO 8601
}

// ==========================================
// SALON DATA MODELS
// ==========================================

export interface Customer extends SyncMetadata {
  id?: number;
  name: string;
  phone: string; // 10-digit Indian mobile
  notes?: string;
  lastVisit?: string; // 'YYYY-MM-DD'
  totalSpent?: number;
  visitCount?: number;
  createdAt: number;
}

export type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'checked-in'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export interface Appointment extends SyncMetadata {
  id?: number;
  customerId?: number;
  customerName: string;
  customerPhone: string;
  serviceId?: number;
  serviceName: string;
  staffId?: number;
  staffName?: string;
  date: string; // 'YYYY-MM-DD'
  time: string; // e.g. '10:00 AM' or '14:30'
  durationMinutes: number; // e.g. 30, 45, 60
  price: number;
  notes?: string;
  status: AppointmentStatus;
  billId?: number;
  createdAt: number;
}

export interface SalonService extends SyncMetadata {
  id?: number;
  name: string;
  category: string; // e.g. 'Hair', 'Skin', 'Makeup', 'Nails', 'Grooming'
  price: number;
  durationMinutes: number; // e.g. 30
  active: boolean;
  notes?: string;
  createdAt: number;
}

export interface StaffMember extends SyncMetadata {
  id?: number;
  name: string;
  phone?: string;
  role: string; // e.g. 'Stylist', 'Beautician', 'Senior Stylist', 'Manager'
  active: boolean;
  workingSchedule?: string; // e.g. '10:00 AM - 7:00 PM'
  createdAt: number;
}

export interface BillItem {
  serviceId?: number;
  name: string;
  qty: number;
  price: number;
  staffName?: string;
  stockId?: number; // legacy compatibility
}

export interface Bill extends SyncMetadata {
  id?: number;
  invoiceNo: string; // e.g. SALON-0001
  date: string; // 'YYYY-MM-DD'
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  appointmentId?: number;
  items: BillItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: PaymentMethod;
  entryId?: number; // linked Day Book entry
  createdAt: number;
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
  appointmentId?: number;
  billId?: number;
  repairId?: number;
}

export interface AppSettings extends SyncMetadata {
  id?: number;
  shopName: string; // Salon Name
  ownerName?: string;
  ownerPhone?: string;
  address?: string;
  businessHours?: string;
  language: Language;
  firstLaunchDate: string; // 'YYYY-MM-DD' or ISO
  activated: boolean;
  proPlan?: 'monthly' | 'yearly' | 'lifetime' | null;
  proExpiresAt?: string | null;
  lastBackupAt: string | null;
  showRepairs?: boolean;
  showStock?: boolean;
  ownerUid?: string;
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

// Legacy definitions for existing test suite compatibility
export type JobStatus = 'received' | 'waiting' | 'ready' | 'delivered' | 'returned';

export interface Job extends SyncMetadata {
  id?: number;
  customerName: string;
  phone: string;
  model: string;
  complaint: string;
  imei?: string;
  estimate?: number;
  advance: number;
  finalAmount?: number | null;
  status: JobStatus;
  expectedDate?: string;
  receivedAt: number;
  readyAt?: number | null;
  deliveredAt?: number | null;
  bookEntryId?: number | null;
}

export type StockCategory = 'product' | 'service';

export interface StockItem extends SyncMetadata {
  id?: number;
  name: string;
  category: StockCategory;
  sellingPrice: number;
  costPrice?: number;
  quantity?: number;
  unit?: string;
  sku?: string;
  lowStockThreshold?: number;
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
