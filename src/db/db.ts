import Dexie, { Table } from 'dexie';
import { Entry, AppSettings, DaySummary } from '../types';
import { getLocalDateString } from '../utils/date';

export class ShopDatabase extends Dexie {
  entries!: Table<Entry, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super('MyMobileShopDB');
    this.version(1).stores({
      entries: '++id, type, amount, date, createdAt, paymentMethod',
      settings: '++id',
    });
  }
}

export const db = new ShopDatabase();

export async function getAppSettings(): Promise<AppSettings | undefined> {
  const all = await db.settings.toArray();
  return all[0];
}

export async function initAppSettings(shopName: string, language: 'ml' | 'en'): Promise<AppSettings> {
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
      else cashTotal += amt; // default to cash if unspecified
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
