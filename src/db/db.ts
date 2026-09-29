import Dexie, { Table } from 'dexie';
import { Entry, AppSettings, DaySummary, Job } from '../types';
import { getLocalDateString } from '../utils/date';

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
  }
}

export const db = new ShopDatabase();

export async function getAppSettings(): Promise<AppSettings | undefined> {
  const all = await db.settings.toArray();
  return all[0];
}

export async function initAppSettings(
  shopName: string,
  language: 'ml' | 'en',
  showRepairs: boolean = false
): Promise<AppSettings> {
  const existing = await getAppSettings();
  if (existing) {
    return existing;
  }
  const newSettings: AppSettings = {
    shopName,
    language,
    firstLaunchDate: getLocalDateString(),
    activated: false,
    lastBackupAt: null,
    showRepairs,
  };
  const id = await db.settings.add(newSettings);
  return { ...newSettings, id };
}

export async function updateAppSettings(partial: Partial<AppSettings>): Promise<void> {
  const existing = await getAppSettings();
  if (existing && existing.id) {
    await db.settings.update(existing.id, partial);
  } else {
    await db.settings.add({
      shopName: '',
      language: 'ml',
      firstLaunchDate: getLocalDateString(),
      activated: false,
      lastBackupAt: null,
      showRepairs: false,
      ...partial,
    });
  }
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
