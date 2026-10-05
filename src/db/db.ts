import Dexie, { Table } from 'dexie';
import { Entry, AppSettings, DaySummary, Job, Language, StockItem, Bill, BillItem, PaymentMethod, PurchaseItem } from '../types';
import { getLocalDateString } from '../utils/date';
import { computeBillTotals, formatInvoiceNo, summarizeBillItems } from '../utils/billing';

export function generateCloudId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

export class ShopDatabase extends Dexie {
  entries!: Table<Entry, number>;
  settings!: Table<AppSettings, number>;
  jobs!: Table<Job, number>;
  stock!: Table<StockItem, number>;
  bills!: Table<Bill, number>;
  purchases!: Table<PurchaseItem, number>;

  constructor() {
    super('MyMobileShopDB');
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
    }).upgrade(async tx => {
      await tx.table('entries').toCollection().modify((entry: Entry) => {
        if (!entry.cloudId) entry.cloudId = generateCloudId();
        if (!entry.updatedAt) entry.updatedAt = entry.createdAt ? new Date(entry.createdAt).toISOString() : new Date().toISOString();
        if (!entry.syncStatus) entry.syncStatus = 'pending';
      });
      await tx.table('jobs').toCollection().modify((job: Job) => {
        if (!job.cloudId) job.cloudId = generateCloudId();
        if (!job.updatedAt) job.updatedAt = job.receivedAt ? new Date(job.receivedAt).toISOString() : new Date().toISOString();
        if (!job.syncStatus) job.syncStatus = 'pending';
      });
      await tx.table('settings').toCollection().modify((settings: AppSettings) => {
        if (!settings.cloudId) settings.cloudId = generateCloudId();
        if (!settings.updatedAt) settings.updatedAt = new Date().toISOString();
        if (!settings.syncStatus) settings.syncStatus = 'pending';
      });
    });

    this.version(4).stores({
      entries: '++id, cloudId, type, amount, date, createdAt, updatedAt, syncStatus, paymentMethod, repairId',
      settings: '++id, cloudId, updatedAt, syncStatus',
      jobs: '++id, cloudId, status, phone, customerName, model, receivedAt, readyAt, deliveredAt, bookEntryId, updatedAt, syncStatus',
      stock: '++id, cloudId, name, category, sellingPrice, quantity, sku, createdAt, updatedAt, syncStatus',
    }).upgrade(async tx => {
      // Initialize stock table if needed
      await tx.table('stock').toCollection().modify((item: StockItem) => {
        if (!item.cloudId) item.cloudId = generateCloudId();
        if (!item.updatedAt) item.updatedAt = item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString();
        if (!item.syncStatus) item.syncStatus = 'pending';
      });
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

    this.purchases.hook('creating', (_primKey, obj) => {
      if (!obj.cloudId) obj.cloudId = generateCloudId();
      if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
      if (!obj.syncStatus) obj.syncStatus = 'pending';
    });
    this.purchases.hook('updating', (modifications: Partial<PurchaseItem>) => {
      if (!modifications.updatedAt) {
        return { ...modifications, updatedAt: new Date().toISOString(), syncStatus: modifications.syncStatus || 'pending' };
      }
      return undefined;
    });

    // Hooks to ensure new records receive sync fields automatically
    this.entries.hook('creating', (_primKey, obj) => {
      if (!obj.cloudId) obj.cloudId = generateCloudId();
      if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
      if (!obj.syncStatus) obj.syncStatus = 'pending';
      if (!obj.createdAt) {
        obj.createdAt = Date.now();
      } else if (typeof (obj.createdAt as any) === 'string') {
        const parsed = new Date(obj.createdAt).getTime();
        obj.createdAt = isNaN(parsed) ? Date.now() : parsed;
      }
    });
    this.entries.hook('updating', (modifications: Partial<Entry>) => {
      if (!modifications.updatedAt) {
        return { ...modifications, updatedAt: new Date().toISOString(), syncStatus: modifications.syncStatus || 'pending' };
      }
      return undefined;
    });

    this.jobs.hook('creating', (_primKey, obj) => {
      if (!obj.cloudId) obj.cloudId = generateCloudId();
      if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
      if (!obj.syncStatus) obj.syncStatus = 'pending';
    });
    this.jobs.hook('updating', (modifications: Partial<Job>) => {
      if (!modifications.updatedAt) {
        return { ...modifications, updatedAt: new Date().toISOString(), syncStatus: modifications.syncStatus || 'pending' };
      }
      return undefined;
    });

    this.settings.hook('creating', (_primKey, obj) => {
      if (!obj.cloudId) obj.cloudId = generateCloudId();
      if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
      if (!obj.syncStatus) obj.syncStatus = 'pending';
    });
    this.settings.hook('updating', (modifications: Partial<AppSettings>) => {
      if (!modifications.updatedAt) {
        return { ...modifications, updatedAt: new Date().toISOString(), syncStatus: modifications.syncStatus || 'pending' };
      }
      return undefined;
    });

    this.stock.hook('creating', (_primKey, obj) => {
      if (!obj.cloudId) obj.cloudId = generateCloudId();
      if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
      if (!obj.syncStatus) obj.syncStatus = 'pending';
    });
    this.stock.hook('updating', (modifications: Partial<StockItem>) => {
      if (!modifications.updatedAt) {
        return { ...modifications, updatedAt: new Date().toISOString(), syncStatus: modifications.syncStatus || 'pending' };
      }
      return undefined;
    });

    this.bills.hook('creating', (_primKey, obj) => {
      if (!obj.cloudId) obj.cloudId = generateCloudId();
      if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
      if (!obj.syncStatus) obj.syncStatus = 'pending';
    });
  }
}

export const db = new ShopDatabase();

export async function getAppSettings(): Promise<AppSettings | undefined> {
  const all = await db.settings.toArray();
  return all[0];
}

export async function clearLocalDatabase(): Promise<void> {
  try {
    await db.transaction('rw', [db.entries, db.settings, db.jobs, db.stock, db.bills, db.purchases], async () => {
      await db.entries.clear();
      await db.settings.clear();
      await db.jobs.clear();
      if (db.stock) await db.stock.clear();
      if (db.bills) await db.bills.clear();
      if (db.purchases) await db.purchases.clear();
    });
  } catch (err) {
    console.warn('Error clearing local database in transaction, falling back to individual clears:', err);
    await Promise.allSettled([
      db.entries.clear(),
      db.settings.clear(),
      db.jobs.clear(),
      db.stock ? db.stock.clear() : Promise.resolve(),
      db.bills ? db.bills.clear() : Promise.resolve(),
      db.purchases ? db.purchases.clear() : Promise.resolve(),
    ]);
  }
}

export async function initAppSettings(
  shopName: string,
  language: Language = 'en',
  showRepairs: boolean = false,
  showStock: boolean = true,
  ownerUid?: string
): Promise<AppSettings> {
  const existing = await getAppSettings();
  if (existing) {
    if (ownerUid && !existing.ownerUid) {
      await updateAppSettings({ ownerUid });
      return { ...existing, ownerUid };
    }
    return existing;
  }
  const now = new Date().toISOString();
  const newSettings: AppSettings = {
    shopName,
    language,
    firstLaunchDate: getLocalDateString(),
    activated: false,
    lastBackupAt: null,
    showRepairs,
    showStock,
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
      shopName: '',
      language: 'en',
      firstLaunchDate: getLocalDateString(),
      activated: false,
      lastBackupAt: null,
      showRepairs: false,
      showStock: true,
      cloudId: generateCloudId(),
      updatedAt: now,
      syncStatus: 'pending',
      ...partial,
    });
  }
}

export async function softDeleteEntry(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.entries.update(id, {
    syncStatus: 'deleted',
    deletedAt: now,
    updatedAt: now,
  });
}

export async function softDeleteJob(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.jobs.update(id, {
    syncStatus: 'deleted',
    deletedAt: now,
    updatedAt: now,
  });
}

export async function softDeleteStockItem(id: number): Promise<void> {
  const now = new Date().toISOString();
  await db.stock.update(id, {
    syncStatus: 'deleted',
    deletedAt: now,
    updatedAt: now,
  });
}

export async function adjustStockQuantity(id: number, delta: number): Promise<number | undefined> {
  const item = await db.stock.get(id);
  if (!item || item.category !== 'product') return undefined;
  const current = typeof item.quantity === 'number' ? item.quantity : 0;
  const newQty = Math.max(0, current + delta);
  await db.stock.update(id, {
    quantity: newQty,
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  });
  return newQty;
}

export async function getNextInvoiceNo(): Promise<string> {
  const count = await db.bills.count();
  return formatInvoiceNo(count + 1);
}

export interface CreateBillInput {
  customerName?: string;
  customerPhone?: string;
  items: BillItem[];
  discount: number;
  paymentMethod: PaymentMethod;
  date: string;
}

/**
 * Saves a bill, creates the linked Day Book "In" entry, and deducts stock
 * for product items, all in one transaction.
 */
export async function createBill(input: CreateBillInput): Promise<Bill> {
  const { subtotal, total } = computeBillTotals(input.items, input.discount);
  return db.transaction('rw', db.bills, db.entries, db.stock, async () => {
    const invoiceNo = await getNextInvoiceNo();
    const now = Date.now();
    const entryId = await db.entries.add({
      type: 'in',
      amount: total,
      item: summarizeBillItems(input.items),
      customerName: input.customerName?.trim() || undefined,
      note: invoiceNo,
      paymentMethod: input.paymentMethod,
      date: input.date,
      createdAt: now,
    });
    const bill: Bill = {
      invoiceNo,
      date: input.date,
      customerName: input.customerName?.trim() || undefined,
      customerPhone: input.customerPhone?.trim() || undefined,
      items: input.items,
      subtotal,
      discount: Math.max(0, input.discount || 0),
      total,
      paymentMethod: input.paymentMethod,
      entryId: entryId as number,
      createdAt: now,
    };
    const id = await db.bills.add(bill);
    for (const it of input.items) {
      if (it.stockId) await adjustStockQuantity(it.stockId, -it.qty);
    }
    return { ...bill, id: id as number };
  });
}

export function computeSummary(entries: Entry[]): DaySummary {
  let inTotal = 0;
  let outTotal = 0;
  let inCount = 0;
  let cashTotal = 0;
  let upiTotal = 0;
  let cardTotal = 0;
  let creditTotal = 0;

  for (const entry of entries) {
    const amt = Number(entry.amount) || 0;
    if (entry.type === 'in') {
      inTotal += amt;
      inCount += 1;
      if (entry.paymentMethod === 'cash') cashTotal += amt;
      else if (entry.paymentMethod === 'upi') upiTotal += amt;
      else if (entry.paymentMethod === 'card') cardTotal += amt;
      else if (entry.paymentMethod === 'credit') creditTotal += amt;
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
    creditTotal,
  };
}

/**
 * Strips '+91', leading 0, spaces, hyphens, parentheses to leave bare digits
 */
export function cleanIndianPhone(raw: string): string {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  // If starts with 91 and has 12 digits, strip 91
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  // If starts with 0 and has 11 digits, strip 0
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
  return Math.max(1, days + 1); // Day 1 on same day
}

export async function addPurchaseItem(name: string, quantity: number = 1, note?: string): Promise<number | undefined> {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  return db.purchases.add({
    name: trimmed,
    quantity: Math.max(1, Math.floor(quantity) || 1),
    note: note?.trim() || undefined,
    isPurchased: false,
    createdAt: Date.now(),
  });
}

export async function togglePurchaseItem(id: number, isPurchased: boolean): Promise<void> {
  await db.purchases.update(id, { isPurchased });
}

export async function deletePurchaseItem(id: number): Promise<void> {
  await db.purchases.delete(id);
}

export async function clearPurchasedItems(): Promise<number> {
  const ids = await db.purchases.filter((p) => p.isPurchased).primaryKeys();
  await db.purchases.bulkDelete(ids);
  return ids.length;
}
