import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { dbFirestore } from './config';

export interface ShopAccountSummary {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  shopName: string;
  activated: boolean;
  entryCount: number;
  jobCount: number;
  estimatedBytes: number;
  createdAt: string;
  lastActiveAt: string;
  updatedAt: string;
}

/**
 * Formats a byte number into human-readable B, KB, MB string.
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `${bytes} B`;
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(1)} ${sizes[i]}`;
}

/**
 * Calculates estimated JSON data size of entries, jobs, and settings in bytes.
 */
export function calculateDataSize(entries: unknown[], jobs: unknown[], settings: unknown): number {
  try {
    const payload = JSON.stringify({ entries, jobs, settings });
    return new TextEncoder().encode(payload).length;
  } catch {
    return 0;
  }
}

export function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Upserts a shop's account summary into the centralized `accounts` collection in Firestore.
 */
export async function upsertAccountSummary(
  uid: string,
  summary: Partial<ShopAccountSummary>
): Promise<void> {
  if (!dbFirestore || !uid) return;
  try {
    const accountRef = doc(dbFirestore, 'accounts', uid);
    const now = new Date().toISOString();

    const existingSnap = await getDoc(accountRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as Partial<ShopAccountSummary>;
      await setDoc(accountRef, cleanForFirestore({
        ...existingData,
        ...summary,
        uid,
        updatedAt: now,
        lastActiveAt: summary.lastActiveAt || now,
      }), { merge: true });
    } else {
      await setDoc(accountRef, cleanForFirestore({
        uid,
        email: summary.email || null,
        phoneNumber: summary.phoneNumber || null,
        shopName: summary.shopName || 'Unnamed Shop',
        activated: !!summary.activated,
        entryCount: summary.entryCount || 0,
        jobCount: summary.jobCount || 0,
        estimatedBytes: summary.estimatedBytes || 0,
        createdAt: summary.createdAt || now,
        lastActiveAt: summary.lastActiveAt || now,
        updatedAt: now,
      }), { merge: true });
    }
  } catch (err) {
    console.warn('Failed to upsert account summary to Firestore:', err);
  }
}

/**
 * Fetches all registered shop accounts from the `accounts` collection (Superadmin only).
 */
export async function fetchAllAccounts(): Promise<ShopAccountSummary[]> {
  if (!dbFirestore) return [];
  try {
    const snap = await getDocs(collection(dbFirestore, 'accounts'));
    const accounts: ShopAccountSummary[] = [];
    snap.forEach(docSnap => {
      accounts.push(docSnap.data() as ShopAccountSummary);
    });
    // Sort by last active descending
    accounts.sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());
    return accounts;
  } catch (err) {
    console.error('Failed to fetch accounts list:', err);
    throw err;
  }
}

/**
 * Toggles lifetime Pro status for a shop account.
 * Updates both the central `accounts/{uid}` record and the user's `users/{uid}/settings/appSettings` doc.
 */
export async function toggleAccountPro(uid: string, activated: boolean): Promise<void> {
  if (!dbFirestore || !uid) return;
  const now = new Date().toISOString();

  // 1. Update accounts directory
  const accountRef = doc(dbFirestore, 'accounts', uid);
  await updateDoc(accountRef, {
    activated,
    updatedAt: now,
  });

  // 2. Update user's settings doc so client pulls it on next sync
  try {
    const userSettingsRef = doc(dbFirestore, 'users', uid, 'settings', 'appSettings');
    await setDoc(userSettingsRef, {
      activated,
      updatedAt: now,
      syncStatus: 'synced',
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to update remote user appSettings:', err);
  }
}
