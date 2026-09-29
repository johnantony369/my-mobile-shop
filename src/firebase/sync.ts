import {
  collection,
  doc,
  writeBatch,
  getDocs,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, getAppSettings } from '../db/db';
import { dbFirestore, auth, isFirebaseConfigured } from './config';
import { Entry, Job, AppSettings } from '../types';
import { upsertAccountSummary, calculateDataSize } from './admin';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

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

export async function reconcileRemoteSettings(remoteSettings: AppSettings): Promise<boolean> {
  if (!remoteSettings) return false;
  const local = await getAppSettings();
  if (!local) {
    const { id, ...toAdd } = remoteSettings;
    await db.settings.add({ ...toAdd, syncStatus: 'synced' });
    return true;
  }
  const remoteTime = remoteSettings.updatedAt ? new Date(remoteSettings.updatedAt).getTime() : 0;
  const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
  if (remoteTime > localTime) {
    const { id, ...toUpdate } = remoteSettings;
    await db.settings.update(local.id!, { ...toUpdate, syncStatus: 'synced' });
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
      currentBatch.set(docRef, {
        cloudId: entry.cloudId,
        deletedAt,
        updatedAt: now,
        syncStatus: 'synced',
      }, { merge: true });
      if (entry.id) await db.entries.delete(entry.id);
      batchOps++;
      pushedCount++;
      await commitBatchIfNeeded();
    } else {
      const { id, ...dataToSync } = entry;
      currentBatch.set(docRef, { ...dataToSync, syncStatus: 'synced' }, { merge: true });
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
      currentBatch.set(docRef, {
        cloudId: job.cloudId,
        deletedAt,
        updatedAt: now,
        syncStatus: 'synced',
      }, { merge: true });
      if (job.id) await db.jobs.delete(job.id);
      batchOps++;
      pushedCount++;
      await commitBatchIfNeeded();
    } else {
      const { id, ...dataToSync } = job;
      currentBatch.set(docRef, { ...dataToSync, syncStatus: 'synced' }, { merge: true });
      if (job.id) await db.jobs.update(job.id, { syncStatus: 'synced' });
      batchOps++;
      pushedCount++;
      await commitBatchIfNeeded();
    }
  }

  // 3. Settings
  const localSettings = await getAppSettings();
  if (localSettings && localSettings.syncStatus !== 'synced') {
    const docRef = doc(dbFirestore, 'users', uid, 'settings', 'appSettings');
    const { id, ...settingsData } = localSettings;
    currentBatch.set(docRef, { ...settingsData, syncStatus: 'synced' }, { merge: true });
    if (localSettings.id) {
      await db.settings.update(localSettings.id, { syncStatus: 'synced' });
    }
    batchOps++;
    pushedCount++;
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
      activated: !!localSettings?.activated,
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

export async function pullCloudChanges(uid: string): Promise<{ pulledEntries: number; pulledJobs: number }> {
  if (!dbFirestore) return { pulledEntries: 0, pulledJobs: 0 };

  // Pull entries
  const entriesSnap = await getDocs(collection(dbFirestore, 'users', uid, 'entries'));
  const remoteEntries = entriesSnap.docs.map(d => d.data() as Entry);
  const pulledEntries = await reconcileRemoteEntries(remoteEntries);

  // Pull jobs
  const jobsSnap = await getDocs(collection(dbFirestore, 'users', uid, 'jobs'));
  const remoteJobs = jobsSnap.docs.map(d => d.data() as Job);
  const pulledJobs = await reconcileRemoteJobs(remoteJobs);

  // Pull settings
  const settingsSnap = await getDocs(collection(dbFirestore, 'users', uid, 'settings'));
  const settingsDoc = settingsSnap.docs.find(d => d.id === 'appSettings');
  if (settingsDoc) {
    await reconcileRemoteSettings(settingsDoc.data() as AppSettings);
  }

  return { pulledEntries, pulledJobs };
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
    const { pulledEntries, pulledJobs } = await pullCloudChanges(uid);
    return { success: true, pushed, pulled: pulledEntries + pulledJobs };
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
