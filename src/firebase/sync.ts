import {
  collection,
  doc,
  getDoc,
  writeBatch,
  getDocs,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, getAppSettings, generateCloudId } from '../db/db';
import { dbFirestore, auth, isFirebaseConfigured } from './config';
import { Entry, Job, AppSettings, StockItem, Bill } from '../types';
import { upsertAccountSummary, calculateDataSize } from './admin';
import { isSuperAdmin } from '../utils/admin';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

/**
 * Strips out any keys with `undefined` values to prevent Firestore from rejecting batch writes.
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

export async function reconcileRemoteEntries(remoteEntries: Entry[]): Promise<number> {
  let updatedCount = 0;
  for (const remote of remoteEntries) {
    if (!remote.cloudId) continue;
    const local = await db.entries.where('cloudId').equals(remote.cloudId).first();

    if (!local) {
      if (remote.deletedAt) continue; // Don't resurrect deleted records
      const { id, ...toInsert } = remote;
      await db.entries.add({ ...toInsert, syncStatus: 'synced' } as Entry);
      updatedCount++;
    } else {
      if (remote.deletedAt) {
        await db.entries.delete(local.id!);
        updatedCount++;
      } else {
        const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          const { id, ...toUpdate } = remote;
          await db.entries.update(local.id!, { ...toUpdate, syncStatus: 'synced' });
          updatedCount++;
        }
      }
    }
  }
  return updatedCount;
}

export async function reconcileRemoteJobs(remoteJobs: Job[]): Promise<number> {
  let updatedCount = 0;
  for (const remote of remoteJobs) {
    if (!remote.cloudId) continue;
    const local = await db.jobs.where('cloudId').equals(remote.cloudId).first();

    if (!local) {
      if (remote.deletedAt) continue;
      const { id, ...toInsert } = remote;
      await db.jobs.add({ ...toInsert, syncStatus: 'synced' } as Job);
      updatedCount++;
    } else {
      if (remote.deletedAt) {
        await db.jobs.delete(local.id!);
        updatedCount++;
      } else {
        const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          const { id, ...toUpdate } = remote;
          await db.jobs.update(local.id!, { ...toUpdate, syncStatus: 'synced' });
          updatedCount++;
        }
      }
    }
  }
  return updatedCount;
}

export async function reconcileRemoteStock(remoteStock: StockItem[]): Promise<number> {
  let updatedCount = 0;
  for (const remote of remoteStock) {
    if (!remote.cloudId) continue;
    const local = await db.stock.where('cloudId').equals(remote.cloudId).first();

    if (!local) {
      if (remote.deletedAt) continue;
      const { id, ...toInsert } = remote;
      await db.stock.add({ ...toInsert, syncStatus: 'synced' } as StockItem);
      updatedCount++;
    } else {
      if (remote.deletedAt) {
        await db.stock.delete(local.id!);
        updatedCount++;
      } else {
        const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          const { id, ...toUpdate } = remote;
          await db.stock.update(local.id!, { ...toUpdate, syncStatus: 'synced' });
          updatedCount++;
        }
      }
    }
  }
  return updatedCount;
}

export async function reconcileRemoteBills(remoteBills: Bill[]): Promise<number> {
  if (!db.bills) return 0;
  let updatedCount = 0;
  for (const remote of remoteBills) {
    if (!remote.cloudId) continue;
    const local = await db.bills.where('cloudId').equals(remote.cloudId).first();

    if (!local) {
      if (remote.deletedAt) continue;
      const { id, ...toInsert } = remote;
      await db.bills.add({ ...toInsert, syncStatus: 'synced' } as Bill);
      updatedCount++;
    } else {
      if (remote.deletedAt) {
        await db.bills.delete(local.id!);
        updatedCount++;
      } else {
        const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          const { id, ...toUpdate } = remote;
          await db.bills.update(local.id!, { ...toUpdate, syncStatus: 'synced' });
          updatedCount++;
        }
      }
    }
  }
  return updatedCount;
}

export async function reconcileRemoteSettings(remoteSettings: AppSettings, uid?: string): Promise<boolean> {
  if (!remoteSettings) return false;
  const local = await getAppSettings();
  const ownerUid = uid || remoteSettings.ownerUid;
  if (!local) {
    const { id, ...toAdd } = remoteSettings;
    await db.settings.add({ ...toAdd, ...(ownerUid ? { ownerUid } : {}), syncStatus: 'synced' });
    return true;
  }
  const remoteTime = remoteSettings.updatedAt ? new Date(remoteSettings.updatedAt).getTime() : 0;
  const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
  if (remoteTime > localTime || (ownerUid && local.ownerUid !== ownerUid)) {
    const { id, ...toUpdate } = remoteSettings;
    await db.settings.update(local.id!, { ...toUpdate, ...(ownerUid ? { ownerUid } : {}), syncStatus: 'synced' });
    return true;
  }
  return false;
}

export async function pushPendingChanges(uid: string): Promise<number> {
  if (!dbFirestore) return 0;
  let pushedCount = 0;
  let currentBatch = writeBatch(dbFirestore);
  let batchOps = 0;

  const commitBatchIfNeeded = async () => {
    if (batchOps >= 400 && dbFirestore) {
      await currentBatch.commit();
      currentBatch = writeBatch(dbFirestore);
      batchOps = 0;
    }
  };

  // 1. Pending / Deleted entries
  const allEntries = await db.entries.toArray();
  const dirtyEntries = allEntries.filter(e => e.syncStatus !== 'synced');

  for (const entry of dirtyEntries) {
    if (!entry.cloudId) continue;
    const docRef = doc(dbFirestore, 'users', uid, 'entries', entry.cloudId);

    if (entry.syncStatus === 'deleted') {
      const now = new Date().toISOString();
      const deletedAt = entry.deletedAt || now;
      // Soft-delete tombstone in Firestore so other devices receive the deletion
      currentBatch.set(docRef, cleanForFirestore({
        cloudId: entry.cloudId,
        deletedAt,
        updatedAt: now,
        syncStatus: 'synced',
      }), { merge: true });
      if (entry.id) await db.entries.delete(entry.id);
      batchOps++;
      pushedCount++;
      await commitBatchIfNeeded();
    } else {
      const { id, ...dataToSync } = entry;
      currentBatch.set(docRef, cleanForFirestore({ ...dataToSync, syncStatus: 'synced' }), { merge: true });
      if (entry.id) await db.entries.update(entry.id, { syncStatus: 'synced' });
      batchOps++;
      pushedCount++;
      await commitBatchIfNeeded();
    }
  }

  // 2. Pending / Deleted jobs
  const allJobs = await db.jobs.toArray();
  const dirtyJobs = allJobs.filter(j => j.syncStatus !== 'synced');

  for (const job of dirtyJobs) {
    if (!job.cloudId) continue;
    const docRef = doc(dbFirestore, 'users', uid, 'jobs', job.cloudId);

    if (job.syncStatus === 'deleted') {
      const now = new Date().toISOString();
      const deletedAt = job.deletedAt || now;
      currentBatch.set(docRef, cleanForFirestore({
        cloudId: job.cloudId,
        deletedAt,
        updatedAt: now,
        syncStatus: 'synced',
      }), { merge: true });
      if (job.id) await db.jobs.delete(job.id);
      batchOps++;
      pushedCount++;
      await commitBatchIfNeeded();
    } else {
      const { id, ...dataToSync } = job;
      currentBatch.set(docRef, cleanForFirestore({ ...dataToSync, syncStatus: 'synced' }), { merge: true });
      if (job.id) await db.jobs.update(job.id, { syncStatus: 'synced' });
      batchOps++;
      pushedCount++;
      await commitBatchIfNeeded();
    }
  }

  // 3. Pending / Deleted stock
  const allStock = db.stock ? await db.stock.toArray() : [];
  const dirtyStock = allStock.filter(s => s.syncStatus !== 'synced');

  for (const item of dirtyStock) {
    if (!item.cloudId) continue;
    const docRef = doc(dbFirestore, 'users', uid, 'stock', item.cloudId);

    if (item.syncStatus === 'deleted') {
      const now = new Date().toISOString();
      const deletedAt = item.deletedAt || now;
      currentBatch.set(docRef, cleanForFirestore({
        cloudId: item.cloudId,
        deletedAt,
        updatedAt: now,
        syncStatus: 'synced',
      }), { merge: true });
      if (item.id) await db.stock.delete(item.id);
      batchOps++;
      pushedCount++;
      await commitBatchIfNeeded();
    } else {
      const { id, ...dataToSync } = item;
      currentBatch.set(docRef, cleanForFirestore({ ...dataToSync, syncStatus: 'synced' }), { merge: true });
      if (item.id) await db.stock.update(item.id, { syncStatus: 'synced' });
      batchOps++;
      pushedCount++;
      await commitBatchIfNeeded();
    }
  }

  // 4. Pending / Deleted bills
  const allBills = db.bills ? await db.bills.toArray() : [];
  const dirtyBills = allBills.filter(b => b.syncStatus !== 'synced');

  for (const bill of dirtyBills) {
    if (!bill.cloudId) continue;
    const docRef = doc(dbFirestore, 'users', uid, 'bills', bill.cloudId);

    if (bill.syncStatus === 'deleted') {
      const now = new Date().toISOString();
      const deletedAt = bill.deletedAt || now;
      currentBatch.set(docRef, cleanForFirestore({
        cloudId: bill.cloudId,
        deletedAt,
        updatedAt: now,
        syncStatus: 'synced',
      }), { merge: true });
      if (bill.id) await db.bills.delete(bill.id);
      batchOps++;
      pushedCount++;
      await commitBatchIfNeeded();
    } else {
      const { id, ...dataToSync } = bill;
      currentBatch.set(docRef, cleanForFirestore({ ...dataToSync, syncStatus: 'synced' }), { merge: true });
      if (bill.id) await db.bills.update(bill.id, { syncStatus: 'synced' });
      batchOps++;
      pushedCount++;
      await commitBatchIfNeeded();
    }
  }

  // 5. Settings
  const localSettings = await getAppSettings();
  if (localSettings && localSettings.syncStatus !== 'synced') {
    if (!localSettings.ownerUid || localSettings.ownerUid === uid) {
      const docRef = doc(dbFirestore, 'users', uid, 'settings', 'appSettings');
      const { id, ...settingsData } = localSettings;
      currentBatch.set(docRef, cleanForFirestore({ ...settingsData, ownerUid: uid, syncStatus: 'synced' }), { merge: true });
      if (localSettings.id) {
        await db.settings.update(localSettings.id, { ownerUid: uid, syncStatus: 'synced' });
      }
      batchOps++;
      pushedCount++;
    }
  }

  if (batchOps > 0) {
    await currentBatch.commit();
  }

  // 4. Update centralized account summary for admin monitoring
  try {
    const totalEntries = allEntries.filter(e => !e.deletedAt);
    const totalJobs = allJobs.filter(j => !j.deletedAt);
    const estimatedBytes = calculateDataSize(totalEntries, totalJobs, localSettings);
    const currentUser = auth?.currentUser;

    await upsertAccountSummary(uid, {
      uid,
      email: currentUser?.email || null,
      phoneNumber: currentUser?.phoneNumber || null,
      shopName: localSettings?.shopName || 'My Mobile Shop',
      activated: isSuperAdmin(currentUser) || !!localSettings?.activated,
      entryCount: totalEntries.length,
      jobCount: totalJobs.length,
      estimatedBytes,
      createdAt: localSettings?.firstLaunchDate || new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    });
  } catch (summaryErr) {
    console.warn('Failed to update account directory summary during push:', summaryErr);
  }

  return pushedCount;
}

export async function pullCloudChanges(uid: string): Promise<{ pulledEntries: number; pulledJobs: number; pulledStock?: number; pulledBills?: number; settingsRestored: boolean }> {
  if (!dbFirestore) return { pulledEntries: 0, pulledJobs: 0, pulledStock: 0, pulledBills: 0, settingsRestored: false };

  // 1. Pull entries
  const entriesSnap = await getDocs(collection(dbFirestore, 'users', uid, 'entries'));
  const remoteEntries = entriesSnap.docs.map(d => d.data() as Entry);
  const pulledEntries = await reconcileRemoteEntries(remoteEntries);

  // 2. Pull jobs
  const jobsSnap = await getDocs(collection(dbFirestore, 'users', uid, 'jobs'));
  const remoteJobs = jobsSnap.docs.map(d => d.data() as Job);
  const pulledJobs = await reconcileRemoteJobs(remoteJobs);

  // 3. Pull stock
  let pulledStock = 0;
  try {
    const stockSnap = await getDocs(collection(dbFirestore, 'users', uid, 'stock'));
    const remoteStock = stockSnap.docs.map(d => d.data() as StockItem);
    pulledStock = await reconcileRemoteStock(remoteStock);
  } catch (err) {
    console.warn('Failed to pull stock items:', err);
  }

  // 4. Pull bills
  let pulledBills = 0;
  try {
    const billsSnap = await getDocs(collection(dbFirestore, 'users', uid, 'bills'));
    const remoteBills = billsSnap.docs.map(d => d.data() as Bill);
    pulledBills = await reconcileRemoteBills(remoteBills);
  } catch (err) {
    console.warn('Failed to pull bills:', err);
  }

  // 5. Pull settings
  let settingsRestored = false;
  try {
    const settingsSnap = await getDocs(collection(dbFirestore, 'users', uid, 'settings'));
    const settingsDoc = settingsSnap.docs.find(d => d.id === 'appSettings');
    if (settingsDoc) {
      await reconcileRemoteSettings(settingsDoc.data() as AppSettings, uid);
      settingsRestored = true;
    }
  } catch (err) {
    console.warn('Failed to pull user settings doc:', err);
  }

  // 6. Fallback for existing users: check account directory or recovered entries/jobs
  const currentLocal = await getAppSettings();
  if (!currentLocal) {
    try {
      const accountSnap = await getDoc(doc(dbFirestore, 'accounts', uid));
      const accountData = accountSnap.exists() ? accountSnap.data() : null;

      const hasRemoteData = remoteEntries.length > 0 || remoteJobs.length > 0 || !!accountData;
      if (hasRemoteData) {
        const currentUser = auth?.currentUser;
        const recoveredShopName =
          accountData?.shopName ||
          currentUser?.displayName ||
          (currentUser?.email ? currentUser.email.split('@')[0] : 'My Mobile Shop');

        const now = new Date().toISOString();
        const restoredSettings: AppSettings = {
          shopName: recoveredShopName,
          language: 'en',
          firstLaunchDate: accountData?.createdAt || now.split('T')[0],
          activated: isSuperAdmin(currentUser) || !!accountData?.activated,
          lastBackupAt: now,
          showRepairs: true,
          ownerUid: uid,
          cloudId: generateCloudId(),
          updatedAt: now,
          syncStatus: 'synced',
        };

        await db.settings.add(restoredSettings);
        settingsRestored = true;
      }
    } catch (fallbackErr) {
      console.warn('Fallback settings restoration failed:', fallbackErr);
    }
  } else {
    if (!currentLocal.ownerUid) {
      await db.settings.update(currentLocal.id!, { ownerUid: uid });
    }
    settingsRestored = true;
  }

  return { pulledEntries, pulledJobs, pulledStock, pulledBills, settingsRestored };
}

export async function syncNow(userId?: string): Promise<{
  success: boolean;
  pushed: number;
  pulled: number;
  error?: string;
}> {
  if (!isFirebaseConfigured() || !dbFirestore) {
    return { success: false, pushed: 0, pulled: 0, error: 'Firebase not configured' };
  }

  const uid = userId || auth?.currentUser?.uid;
  if (!uid) {
    return { success: false, pushed: 0, pulled: 0, error: 'User not logged in' };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, pushed: 0, pulled: 0, error: 'Offline' };
  }

  try {
    const pushed = await pushPendingChanges(uid);
    const { pulledEntries, pulledJobs, pulledStock, pulledBills } = await pullCloudChanges(uid);
    return { success: true, pushed, pulled: pulledEntries + pulledJobs + (pulledStock || 0) + (pulledBills || 0) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Cloud sync error:', err);
    return { success: false, pushed: 0, pulled: 0, error: message };
  }
}

export function startAutoSync(
  uid: string,
  onStatusChange?: (state: SyncState, lastSync?: Date, errorMsg?: string) => void
): () => void {
  if (!isFirebaseConfigured() || !dbFirestore) {
    onStatusChange?.('offline');
    return () => {};
  }

  let isSubscribed = true;
  const unsubscribers: Unsubscribe[] = [];

  const triggerSync = async () => {
    if (!isSubscribed) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      onStatusChange?.('offline');
      return;
    }
    onStatusChange?.('syncing');
    const result = await syncNow(uid);
    if (!isSubscribed) return;
    if (result.success) {
      onStatusChange?.('synced', new Date());
    } else {
      onStatusChange?.('error', undefined, result.error);
    }
  };

  // Immediate sync
  triggerSync();

  // Network online listener
  const handleOnline = () => triggerSync();
  const handleOffline = () => onStatusChange?.('offline');

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  // Live snapshot listeners for real-time multi-device changes using delta docChanges()
  try {
    const entriesRef = collection(dbFirestore, 'users', uid, 'entries');
    const unsubEntries = onSnapshot(entriesRef, snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      const changed = snapshot.docChanges().map(change => change.doc.data() as Entry);
      if (changed.length > 0) {
        reconcileRemoteEntries(changed).then(() => {
          onStatusChange?.('synced', new Date());
        });
      }
    }, (err) => {
      onStatusChange?.('error', undefined, err.message);
    });
    unsubscribers.push(unsubEntries);

    const jobsRef = collection(dbFirestore, 'users', uid, 'jobs');
    const unsubJobs = onSnapshot(jobsRef, snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      const changed = snapshot.docChanges().map(change => change.doc.data() as Job);
      if (changed.length > 0) {
        reconcileRemoteJobs(changed).then(() => {
          onStatusChange?.('synced', new Date());
        });
      }
    }, (err) => {
      onStatusChange?.('error', undefined, err.message);
    });
    unsubscribers.push(unsubJobs);

    const stockRef = collection(dbFirestore, 'users', uid, 'stock');
    const unsubStock = onSnapshot(stockRef, snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      const changed = snapshot.docChanges().map(change => change.doc.data() as StockItem);
      if (changed.length > 0) {
        reconcileRemoteStock(changed).then(() => {
          onStatusChange?.('synced', new Date());
        });
      }
    }, (err) => {
      onStatusChange?.('error', undefined, err.message);
    });
    unsubscribers.push(unsubStock);

    const billsRef = collection(dbFirestore, 'users', uid, 'bills');
    const unsubBills = onSnapshot(billsRef, snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      const changed = snapshot.docChanges().map(change => change.doc.data() as Bill);
      if (changed.length > 0) {
        reconcileRemoteBills(changed).then(() => {
          onStatusChange?.('synced', new Date());
        });
      }
    }, (err) => {
      onStatusChange?.('error', undefined, err.message);
    });
    unsubscribers.push(unsubBills);
  } catch (e) {
    console.warn('Real-time listeners could not be attached:', e);
  }

  return () => {
    isSubscribed = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
    unsubscribers.forEach(unsub => unsub());
  };
}
