import Dexie, { Table } from 'dexie';
import {
  Customer,
  Appointment,
  SalonService,
  StaffMember,
  Bill,
  BillItem,
  Entry,
  AppSettings,
  DaySummary,
  Language,
  PaymentMethod,
} from '../types';
import { getLocalDateString } from '../utils/date';

export function generateCloudId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

export class SalonDatabase extends Dexie {
  customers!: Table<Customer, number>;
  appointments!: Table<Appointment, number>;
  services!: Table<SalonService, number>;
  staff!: Table<StaffMember, number>;
  bills!: Table<Bill, number>;
  entries!: Table<Entry, number>;
  settings!: Table<AppSettings, number>;
  // Legacy aliases to prevent breaking older sync or tests
  jobs!: Table<any, number>;
  stock!: Table<any, number>;
  purchases!: Table<any, number>;

  constructor() {
    super('MySalonDB');

    // Versions 1 to 6 kept compatible for schema migration
    this.version(1).stores({
      entries: '++id, type, amount, date, createdAt, paymentMethod',
      settings: '++id',
    });
    this.version(2).stores({
      entries: '++id, type, amount, date, createdAt, paymentMethod, repairId',
      settings: '++id',
      jobs: '++id, status, phone, customerName, model, receivedAt, readyAt, deliveredAt, bookEntryId',
    });
    this.version(3).stores({
      entries: '++id, cloudId, type, amount, date, createdAt, updatedAt, syncStatus, paymentMethod, repairId',
      settings: '++id, cloudId, updatedAt, syncStatus',
      jobs: '++id, cloudId, status, phone, customerName, model, receivedAt, readyAt, deliveredAt, bookEntryId, updatedAt, syncStatus',
    });
    this.version(4).stores({
      entries: '++id, cloudId, type, amount, date, createdAt, updatedAt, syncStatus, paymentMethod, repairId',
      settings: '++id, cloudId, updatedAt, syncStatus',
      jobs: '++id, cloudId, status, phone, customerName, model, receivedAt, readyAt, deliveredAt, bookEntryId, updatedAt, syncStatus',
      stock: '++id, cloudId, name, category, sellingPrice, quantity, sku, createdAt, updatedAt, syncStatus',
    });
    this.version(5).stores({
      entries: '++id, cloudId, type, amount, date, createdAt, updatedAt, syncStatus, paymentMethod, repairId',
      settings: '++id, cloudId, updatedAt, syncStatus',
      jobs: '++id, cloudId, status, phone, customerName, model, receivedAt, readyAt, deliveredAt, bookEntryId, updatedAt, syncStatus',
      stock: '++id, cloudId, name, category, sellingPrice, quantity, sku, createdAt, updatedAt, syncStatus',
      bills: '++id, cloudId, invoiceNo, date, createdAt, updatedAt, syncStatus',
    });
    this.version(6).stores({
      entries: '++id, cloudId, type, amount, date, createdAt, updatedAt, syncStatus, paymentMethod, repairId',
      settings: '++id, cloudId, updatedAt, syncStatus',
      jobs: '++id, cloudId, status, phone, customerName, model, receivedAt, readyAt, deliveredAt, bookEntryId, updatedAt, syncStatus',
      stock: '++id, cloudId, name, category, sellingPrice, quantity, sku, createdAt, updatedAt, syncStatus',
      bills: '++id, cloudId, invoiceNo, date, createdAt, updatedAt, syncStatus',
      purchases: '++id, cloudId, name, isPurchased, createdAt, updatedAt, syncStatus',
    });

    // Version 7: Add dedicated MySalon tables: customers, appointments, services, staff
    this.version(7).stores({
      customers: '++id, cloudId, name, phone, lastVisit, totalSpent, createdAt, updatedAt, syncStatus',
      appointments: '++id, cloudId, customerId, customerPhone, customerName, date, time, staffId, status, createdAt, updatedAt, syncStatus',
      services: '++id, cloudId, name, category, price, active, createdAt, updatedAt, syncStatus',
      staff: '++id, cloudId, name, phone, role, active, createdAt, updatedAt, syncStatus',
      bills: '++id, cloudId, invoiceNo, date, customerId, customerPhone, appointmentId, createdAt, updatedAt, syncStatus',
      entries: '++id, cloudId, type, amount, date, createdAt, updatedAt, syncStatus, paymentMethod, appointmentId, billId',
      settings: '++id, cloudId, updatedAt, syncStatus',
      jobs: '++id, cloudId, status, phone, customerName, model, receivedAt, readyAt, deliveredAt, bookEntryId, updatedAt, syncStatus',
      stock: '++id, cloudId, name, category, sellingPrice, quantity, sku, createdAt, updatedAt, syncStatus',
      purchases: '++id, cloudId, name, isPurchased, createdAt, updatedAt, syncStatus',
    });

    // Attach hooks for automatic cloud sync metadata
    const attachHooks = (table: Table<any, number>) => {
      if (!table) return;
      table.hook('creating', (_primKey, obj) => {
        if (!obj.cloudId) obj.cloudId = generateCloudId();
        if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
        if (!obj.syncStatus) obj.syncStatus = 'pending';
        if (!obj.createdAt) {
          obj.createdAt = Date.now();
        } else if (typeof obj.createdAt === 'string') {
          const parsed = new Date(obj.createdAt).getTime();
          obj.createdAt = isNaN(parsed) ? Date.now() : parsed;
        }
      });
      table.hook('updating', (modifications: any) => {
        if (!modifications.updatedAt) {
          return {
            ...modifications,
            updatedAt: new Date().toISOString(),
            syncStatus: modifications.syncStatus || 'pending',
          };
        }
        return undefined;
      });
    };

    attachHooks(this.customers);
    attachHooks(this.appointments);
    attachHooks(this.services);
    attachHooks(this.staff);
    attachHooks(this.bills);
    attachHooks(this.entries);
    attachHooks(this.settings);
    attachHooks(this.jobs);
    attachHooks(this.stock);
    attachHooks(this.purchases);
  }
}

export const db = new SalonDatabase();

// Backward compatibility alias
export const ShopDatabase = SalonDatabase;

export async function getAppSettings(): Promise<AppSettings | undefined> {
  try {
    await db.open();
    const all = await db.settings.toArray();
    return all[0];
  } catch (e) {
    console.warn('Could not read app settings:', e);
    return undefined;
  }
}

export async function clearLocalDatabase(): Promise<void> {
  try {
    const tables = [
      db.customers,
      db.appointments,
      db.services,
      db.staff,
      db.bills,
      db.entries,
      db.settings,
      db.jobs,
      db.stock,
      db.purchases,
    ].filter(Boolean);

    await Promise.allSettled(tables.map((t) => t.clear()));
  } catch (err) {
    console.warn('Error clearing local database:', err);
  }
}

export async function initAppSettings(
  shopName: string,
  language: Language = 'en',
  _showRepairs: boolean = false,
  _showStock: boolean = true,
  ownerUid?: string,
  ownerName?: string,
  ownerPhone?: string,
  address?: string,
  businessHours?: string
): Promise<AppSettings> {
  const existing = await getAppSettings();
  if (existing) {
    const updates: Partial<AppSettings> = {};
    if (ownerUid && !existing.ownerUid) updates.ownerUid = ownerUid;
    if (ownerName && !existing.ownerName) updates.ownerName = ownerName;
    if (ownerPhone && !existing.ownerPhone) updates.ownerPhone = ownerPhone;
    if (Object.keys(updates).length > 0) {
      await updateAppSettings(updates);
      return { ...existing, ...updates };
    }
    return existing;
  }
  const now = new Date().toISOString();
  const newSettings: AppSettings = {
    shopName,
    ownerName,
    ownerPhone,
    address,
    businessHours,
    language,
    firstLaunchDate: getLocalDateString(),
    activated: false,
    lastBackupAt: null,
    ownerUid,
    cloudId: generateCloudId(),
    updatedAt: now,
    syncStatus: 'pending',
  };
  const id = await db.settings.add(newSettings);
  return { ...newSettings, id };
}

export async function updateAppSettings(partial: Partial<AppSettings>): Promise<void> {
  const now = new Date().toISOString();
  const existing = await getAppSettings();
  if (existing && existing.id) {
    await db.settings.update(existing.id, {
      ...partial,
      updatedAt: now,
      syncStatus: 'pending',
    });
  } else {
    await db.settings.add({
      shopName: 'Glow Studio',
      language: 'en',
      firstLaunchDate: getLocalDateString(),
      activated: false,
      lastBackupAt: null,
      cloudId: generateCloudId(),
      updatedAt: now,
      syncStatus: 'pending',
      ...partial,
    });
  }
}

// ==========================================
// SOFT DELETION HELPERS
// ==========================================

export async function softDeleteCustomer(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.customers.update(id, {
    syncStatus: 'deleted',
    deletedAt: now,
    updatedAt: now,
  });
}

export async function softDeleteAppointment(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.appointments.update(id, {
    syncStatus: 'deleted',
    deletedAt: now,
    updatedAt: now,
  });
}

export async function softDeleteService(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.services.update(id, {
    syncStatus: 'deleted',
    deletedAt: now,
    updatedAt: now,
  });
}

export async function softDeleteStaff(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.staff.update(id, {
    syncStatus: 'deleted',
    deletedAt: now,
    updatedAt: now,
  });
}

export async function softDeleteBill(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.bills.update(id, {
    syncStatus: 'deleted',
    deletedAt: now,
    updatedAt: now,
  });
}

export async function softDeleteEntry(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.entries.update(id, {
    syncStatus: 'deleted',
    deletedAt: now,
    updatedAt: now,
  });
}

// Backward compatibility legacy soft delete functions for test suites
export async function softDeleteJob(id: number): Promise<void> {
  const now = new Date().toISOString();
  if (db.jobs) {
    await db.jobs.update(id, {
      syncStatus: 'deleted',
      deletedAt: now,
      updatedAt: now,
    });
  }
}

export async function softDeleteStockItem(id: number): Promise<void> {
  const now = new Date().toISOString();
  if (db.stock) {
    await db.stock.update(id, {
      syncStatus: 'deleted',
      deletedAt: now,
      updatedAt: now,
    });
  }
}

export async function adjustStockQuantity(id: number, delta: number): Promise<number | undefined> {
  if (!db.stock) return undefined;
  const item = await db.stock.get(id);
  if (!item) return undefined;
  const current = typeof item.quantity === 'number' ? item.quantity : 0;
  const newQty = Math.max(0, current + delta);
  await db.stock.update(id, {
    quantity: newQty,
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  });
  return newQty;
}

// ==========================================
// BILLING FUNCTIONS
// ==========================================

export function formatInvoiceNo(num: number): string {
  return `SALON-${String(num).padStart(4, '0')}`;
}

export async function getNextInvoiceNo(): Promise<string> {
  const count = await db.bills.count();
  return formatInvoiceNo(count + 1);
}

export interface CreateSalonBillInput {
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  appointmentId?: number;
  items: BillItem[];
  discount?: number;
  paidAmount?: number;
  paymentMethod: PaymentMethod;
  date: string; // 'YYYY-MM-DD'
}

export async function createSalonBill(input: CreateSalonBillInput): Promise<Bill> {
  const subtotal = input.items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
  const discount = Math.max(0, input.discount || 0);
  const total = Math.max(0, subtotal - discount);
  const paidAmount = typeof input.paidAmount === 'number' ? input.paidAmount : total;
  const balanceAmount = Math.max(0, total - paidAmount);

  const tables: any[] = [db.bills, db.entries, db.customers, db.appointments];
  if (db.stock) tables.push(db.stock);

  return db.transaction('rw', tables, async () => {
    const invoiceCount = await db.bills.count();
    const invoiceNo = `INV-${String(invoiceCount + 1).padStart(4, '0')}`;
    const now = Date.now();

    // 1. Add bill
    const billRecord: Bill = {
      invoiceNo,
      date: input.date,
      customerId: input.customerId,
      customerName: input.customerName?.trim() || undefined,
      customerPhone: input.customerPhone?.trim() || undefined,
      appointmentId: input.appointmentId,
      items: input.items,
      subtotal,
      discount,
      total,
      paidAmount,
      balanceAmount,
      paymentMethod: input.paymentMethod,
      createdAt: now,
    };
    const billId = (await db.bills.add(billRecord)) as number;

    // 2. Add revenue entry if payment was made
    if (paidAmount > 0) {
      const summaryItems = input.items.map((i) => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join(', ');
      const entryId = (await db.entries.add({
        type: 'in',
        amount: paidAmount,
        item: summaryItems,
        customerName: input.customerName?.trim() || undefined,
        note: invoiceNo,
        paymentMethod: input.paymentMethod,
        date: input.date,
        createdAt: now,
        billId,
        appointmentId: input.appointmentId,
      })) as number;

      await db.bills.update(billId, { entryId });
      billRecord.entryId = entryId;
    }

    // 3. Update customer stats if customer is known
    if (input.customerId) {
      const customer = await db.customers.get(input.customerId);
      if (customer) {
        await db.customers.update(input.customerId, {
          lastVisit: input.date,
          totalSpent: (customer.totalSpent || 0) + paidAmount,
          visitCount: (customer.visitCount || 0) + 1,
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending',
        });
      }
    } else if (input.customerPhone) {
      // Find customer by phone
      const cleanPhone = cleanIndianPhone(input.customerPhone);
      const existing = await db.customers.filter((c) => cleanIndianPhone(c.phone) === cleanPhone).first();
      if (existing && existing.id) {
        await db.customers.update(existing.id, {
          lastVisit: input.date,
          totalSpent: (existing.totalSpent || 0) + paidAmount,
          visitCount: (existing.visitCount || 0) + 1,
          updatedAt: new Date().toISOString(),
          syncStatus: 'pending',
        });
        await db.bills.update(billId, { customerId: existing.id });
      }
    }

    // 4. Update appointment status if linked
    if (input.appointmentId) {
      await db.appointments.update(input.appointmentId, {
        status: 'completed',
        billId,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      });
    }

    // 5. Legacy stock deduction support if items have stockId
    if (db.stock) {
      for (const item of input.items) {
        if (item.stockId) {
          const sItem = await db.stock.get(item.stockId);
          if (sItem && typeof sItem.quantity === 'number') {
            await db.stock.update(item.stockId, {
              quantity: Math.max(0, sItem.quantity - (item.qty || 1)),
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending',
            });
          }
        }
      }
    }

    return { ...billRecord, id: billId };
  });
}

// Backward compatibility function for existing createBill calls in tests
export async function createBill(input: {
  customerName?: string;
  customerPhone?: string;
  items: any[];
  discount: number;
  paymentMethod: PaymentMethod;
  date: string;
}): Promise<Bill> {
  return createSalonBill({
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    items: input.items,
    discount: input.discount,
    paymentMethod: input.paymentMethod,
    date: input.date,
  });
}

// ==========================================
// SUMMARY CALCULATIONS
// ==========================================

export function computeSummary(entries: Entry[]): DaySummary {
  let inTotal = 0;
  let outTotal = 0;
  let inCount = 0;
  let cashTotal = 0;
  let upiTotal = 0;
  let cardTotal = 0;

  for (const entry of entries) {
    const amt = Number(entry.amount) || 0;
    if (entry.type === 'in') {
      inTotal += amt;
      inCount += 1;
      if (entry.paymentMethod === 'cash') cashTotal += amt;
      else if (entry.paymentMethod === 'upi') upiTotal += amt;
      else if (entry.paymentMethod === 'card') cardTotal += amt;
      else cashTotal += amt;
    } else {
      outTotal += amt;
    }
  }

  return {
    inTotal,
    outTotal,
    net: inTotal - outTotal,
    inCount,
    cashTotal,
    upiTotal,
    cardTotal,
  };
}

export async function addPurchaseItem(name: string, quantity: number = 1, note?: string): Promise<number | undefined> {
  const trimmed = name.trim();
  if (!trimmed || !db.purchases) return undefined;
  return db.purchases.add({
    name: trimmed,
    quantity: Math.max(1, Math.floor(quantity) || 1),
    note: note?.trim() || undefined,
    isPurchased: false,
    createdAt: Date.now(),
  });
}

export async function togglePurchaseItem(id: number, isPurchased: boolean): Promise<void> {
  if (db.purchases) await db.purchases.update(id, { isPurchased });
}

export async function deletePurchaseItem(id: number): Promise<void> {
  if (db.purchases) await db.purchases.delete(id);
}

export async function clearPurchasedItems(): Promise<number> {
  if (!db.purchases) return 0;
  const ids = await db.purchases.filter((p) => p.isPurchased).primaryKeys();
  await db.purchases.bulkDelete(ids);
  return ids.length;
}

// ==========================================
// INDIAN PHONE UTILITIES
// ==========================================

export function cleanIndianPhone(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

export function isValidIndianPhone(phone: string): boolean {
  const cleaned = cleanIndianPhone(phone);
  return /^[6-9]\d{9}$/.test(cleaned) || /^\d{10}$/.test(cleaned);
}

export function calculateDaysInShop(receivedAt: number): number {
  const diffMs = Math.max(0, Date.now() - receivedAt);
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, days + 1);
}
