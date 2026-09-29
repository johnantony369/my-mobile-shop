import Dexie, { Table } from 'dexie';
import { Entry, AppSettings, DaySummary, Job, Language } from '../types';
import { getLocalDateString } from '../utils/date';

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

    // Hooks to ensure new records receive sync fields automatically
    this.entries.hook('creating', (_primKey, obj) => {
      if (!obj.cloudId) obj.cloudId = generateCloudId();
      if (!obj.updatedAt) obj.updatedAt = new Date().toISOString();
      if (!obj.syncStatus) obj.syncStatus = 'pending';
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
  }
}

export const db = new ShopDatabase();

export async function getAppSettings(): Promise<AppSettings | undefined> {
  const all = await db.settings.toArray();
  return all[0];
}

export async function initAppSettings(
  shopName: string,
  language: Language = 'en',
  showRepairs: boolean = false
): Promise<AppSettings> {
  const existing = await getAppSettings();
  if (existing) {
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
