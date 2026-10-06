import {
  collection,
  doc,
  getDoc,
  writeBatch,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, getAppSettings, generateCloudId } from '../db/db';
import { dbFirestore, auth, isFirebaseConfigured } from './config';
import {
  Customer,
  Appointment,
  SalonService,
  StaffMember,
  Bill,
  Entry,
  AppSettings,
  Job,
  StockItem,
} from '../types';
import { upsertAccountSummary, calculateDataSize } from './admin';
import { isSuperAdmin } from '../utils/admin';
import { isProCurrentlyActive } from '../utils/proPlan';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

// ==========================================
// RECONCILIATION FOR SALON ENTITIES
// ==========================================

export async function reconcileRemoteCustomers(remoteList: Customer[]): Promise<number> {
  if (!db.customers) return 0;
  let count = 0;
  for (const remote of remoteList) {
    if (!remote.cloudId) continue;
    const local = await db.customers.where('cloudId').equals(remote.cloudId).first();
    if (!local) {
      if (remote.deletedAt) continue;
      const { id, ...toInsert } = remote;
      await db.customers.add({ ...toInsert, syncStatus: 'synced' } as Customer);
      count++;
    } else {
      if (remote.deletedAt) {
        await db.customers.delete(local.id!);
        count++;
      } else {
        const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          const { id, ...toUpdate } = remote;
          await db.customers.update(local.id!, { ...toUpdate, syncStatus: 'synced' });
          count++;
        }
      }
    }
  }
  return count;
}

export async function reconcileRemoteAppointments(remoteList: Appointment[]): Promise<number> {
  if (!db.appointments) return 0;
  let count = 0;
  for (const remote of remoteList) {
    if (!remote.cloudId) continue;
    const local = await db.appointments.where('cloudId').equals(remote.cloudId).first();
    if (!local) {
      if (remote.deletedAt) continue;
      const { id, ...toInsert } = remote;
      await db.appointments.add({ ...toInsert, syncStatus: 'synced' } as Appointment);
      count++;
    } else {
      if (remote.deletedAt) {
        await db.appointments.delete(local.id!);
        count++;
      } else {
        const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          const { id, ...toUpdate } = remote;
          await db.appointments.update(local.id!, { ...toUpdate, syncStatus: 'synced' });
          count++;
        }
      }
    }
  }
  return count;
}

export async function reconcileRemoteServices(remoteList: SalonService[]): Promise<number> {
  if (!db.services) return 0;
  let count = 0;
  for (const remote of remoteList) {
    if (!remote.cloudId) continue;
    const local = await db.services.where('cloudId').equals(remote.cloudId).first();
    if (!local) {
      if (remote.deletedAt) continue;
      const { id, ...toInsert } = remote;
      await db.services.add({ ...toInsert, syncStatus: 'synced' } as SalonService);
      count++;
    } else {
      if (remote.deletedAt) {
        await db.services.delete(local.id!);
        count++;
      } else {
        const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          const { id, ...toUpdate } = remote;
          await db.services.update(local.id!, { ...toUpdate, syncStatus: 'synced' });
          count++;
        }
      }
    }
  }
  return count;
}

export async function reconcileRemoteStaff(remoteList: StaffMember[]): Promise<number> {
  if (!db.staff) return 0;
  let count = 0;
  for (const remote of remoteList) {
    if (!remote.cloudId) continue;
    const local = await db.staff.where('cloudId').equals(remote.cloudId).first();
    if (!local) {
      if (remote.deletedAt) continue;
      const { id, ...toInsert } = remote;
      await db.staff.add({ ...toInsert, syncStatus: 'synced' } as StaffMember);
      count++;
    } else {
      if (remote.deletedAt) {
        await db.staff.delete(local.id!);
        count++;
      } else {
        const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          const { id, ...toUpdate } = remote;
          await db.staff.update(local.id!, { ...toUpdate, syncStatus: 'synced' });
          count++;
        }
      }
    }
  }
  return count;
}

export async function reconcileRemoteBills(remoteList: Bill[]): Promise<number> {
  if (!db.bills) return 0;
  let count = 0;
  for (const remote of remoteList) {
    if (!remote.cloudId) continue;
    const local = await db.bills.where('cloudId').equals(remote.cloudId).first();
    if (!local) {
      if (remote.deletedAt) continue;
      const { id, ...toInsert } = remote;
      await db.bills.add({ ...toInsert, syncStatus: 'synced' } as Bill);
      count++;
    } else {
      if (remote.deletedAt) {
        await db.bills.delete(local.id!);
        count++;
      } else {
        const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          const { id, ...toUpdate } = remote;
          await db.bills.update(local.id!, { ...toUpdate, syncStatus: 'synced' });
          count++;
        }
      }
    }
  }
  return count;
}

export async function reconcileRemoteEntries(remoteList: Entry[]): Promise<number> {
  if (!db.entries) return 0;
  let count = 0;
  for (const remote of remoteList) {
    if (!remote.cloudId) continue;
    const local = await db.entries.where('cloudId').equals(remote.cloudId).first();
    if (!local) {
      if (remote.deletedAt) continue;
      const { id, ...toInsert } = remote;
      await db.entries.add({ ...toInsert, syncStatus: 'synced' } as Entry);
      count++;
    } else {
      if (remote.deletedAt) {
        await db.entries.delete(local.id!);
        count++;
      } else {
        const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
        const localTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
        if (remoteTime > localTime) {
          const { id, ...toUpdate } = remote;
          await db.entries.update(local.id!, { ...toUpdate, syncStatus: 'synced' });
          count++;
        }
      }
    }
  }
  return count;
}

// Backward compatibility legacy reconcilers for test suites
export async function reconcileRemoteJobs(remoteJobs: Job[]): Promise<number> {
  if (!db.jobs) return 0;
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
  if (!db.stock) return 0;
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

// ==========================================
// PUSH PENDING CHANGES
// ==========================================

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

  const syncTable = async (table: any, collName: string) => {
    if (!table) return;
    const all = await table.toArray();
    const dirty = all.filter((i: any) => i.syncStatus !== 'synced');
    for (const item of dirty) {
      if (!item.cloudId) continue;
      const docRef = doc(dbFirestore!, 'users', uid, collName, item.cloudId);
      if (item.syncStatus === 'deleted') {
        const now = new Date().toISOString();
        const deletedAt = item.deletedAt || now;
        currentBatch.set(
          docRef,
          cleanForFirestore({
            cloudId: item.cloudId,
            deletedAt,
            updatedAt: now,
            syncStatus: 'synced',
          }),
          { merge: true }
        );
        if (item.id) await table.delete(item.id);
        batchOps++;
        pushedCount++;
        await commitBatchIfNeeded();
      } else {
        const { id, ...dataToSync } = item;
        currentBatch.set(docRef, cleanForFirestore({ ...dataToSync, syncStatus: 'synced' }), { merge: true });
        if (item.id) await table.update(item.id, { syncStatus: 'synced' });
        batchOps++;
        pushedCount++;
        await commitBatchIfNeeded();
      }
    }
  };

  await syncTable(db.customers, 'customers');
  await syncTable(db.appointments, 'appointments');
  await syncTable(db.services, 'services');
  await syncTable(db.staff, 'staff');
  await syncTable(db.bills, 'bills');
  await syncTable(db.entries, 'entries');
  if (db.jobs) await syncTable(db.jobs, 'jobs');
  if (db.stock) await syncTable(db.stock, 'stock');

  // Settings
  const localSettings = await getAppSettings();
  if (localSettings && localSettings.syncStatus !== 'synced') {
    if (!localSettings.ownerUid || localSettings.ownerUid === uid) {
      const docRef = doc(dbFirestore, 'users', uid, 'settings', 'appSettings');
      const { id, ...settingsData } = localSettings;
      currentBatch.set(
        docRef,
        cleanForFirestore({ ...settingsData, ownerUid: uid, syncStatus: 'synced' }),
        { merge: true }
      );
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

  // Update central account directory
  try {
    const totalEntries = db.entries ? (await db.entries.toArray()).filter((e) => !e.deletedAt) : [];
    const totalAppointments = db.appointments ? (await db.appointments.toArray()).filter((a) => !a.deletedAt) : [];
    const estimatedBytes = calculateDataSize(totalEntries, totalAppointments, localSettings);
    const currentUser = auth?.currentUser;

    await upsertAccountSummary(uid, {
      uid,
      email: currentUser?.email || null,
      phoneNumber: currentUser?.phoneNumber || null,
      shopName: localSettings?.shopName || 'MySalon',
      activated: isSuperAdmin(currentUser) || isProCurrentlyActive(localSettings),
      proPlan: localSettings?.proPlan ?? null,
      proExpiresAt: localSettings?.proExpiresAt ?? null,
      entryCount: totalEntries.length,
      jobCount: totalAppointments.length,
      estimatedBytes,
      createdAt: localSettings?.firstLaunchDate || new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to update account directory summary during push:', err);
  }

  return pushedCount;
}

// ==========================================
// PULL CLOUD CHANGES
// ==========================================

export async function pullCloudChanges(uid: string): Promise<{
  pulledEntries: number;
  pulledAppointments: number;
  pulledCustomers: number;
  pulledServices: number;
  pulledStaff: number;
  pulledBills: number;
  settingsRestored: boolean;
}> {
  if (!dbFirestore) {
    return {
      pulledEntries: 0,
      pulledAppointments: 0,
      pulledCustomers: 0,
      pulledServices: 0,
      pulledStaff: 0,
      pulledBills: 0,
      settingsRestored: false,
    };
  }

  let pulledEntries = 0;
  let pulledAppointments = 0;
  let pulledCustomers = 0;
  let pulledServices = 0;
  let pulledStaff = 0;
  let pulledBills = 0;

  try {
    const entriesSnap = await getDocs(collection(dbFirestore, 'users', uid, 'entries'));
    pulledEntries = await reconcileRemoteEntries(entriesSnap.docs.map((d) => d.data() as Entry));
  } catch (e) {
    console.warn('Error pulling entries:', e);
  }

  try {
    const apptsSnap = await getDocs(collection(dbFirestore, 'users', uid, 'appointments'));
    pulledAppointments = await reconcileRemoteAppointments(apptsSnap.docs.map((d) => d.data() as Appointment));
  } catch (e) {
    console.warn('Error pulling appointments:', e);
  }

  try {
    const custSnap = await getDocs(collection(dbFirestore, 'users', uid, 'customers'));
    pulledCustomers = await reconcileRemoteCustomers(custSnap.docs.map((d) => d.data() as Customer));
  } catch (e) {
    console.warn('Error pulling customers:', e);
  }

  try {
    const servSnap = await getDocs(collection(dbFirestore, 'users', uid, 'services'));
    pulledServices = await reconcileRemoteServices(servSnap.docs.map((d) => d.data() as SalonService));
  } catch (e) {
    console.warn('Error pulling services:', e);
  }

  try {
    const staffSnap = await getDocs(collection(dbFirestore, 'users', uid, 'staff'));
    pulledStaff = await reconcileRemoteStaff(staffSnap.docs.map((d) => d.data() as StaffMember));
  } catch (e) {
    console.warn('Error pulling staff:', e);
  }

  try {
    const billsSnap = await getDocs(collection(dbFirestore, 'users', uid, 'bills'));
    pulledBills = await reconcileRemoteBills(billsSnap.docs.map((d) => d.data() as Bill));
  } catch (e) {
    console.warn('Error pulling bills:', e);
  }

  // Pull settings
  let settingsRestored = false;
  try {
    const settingsSnap = await getDocs(collection(dbFirestore, 'users', uid, 'settings'));
    const settingsDoc = settingsSnap.docs.find((d) => d.id === 'appSettings');
    if (settingsDoc) {
      await reconcileRemoteSettings(settingsDoc.data() as AppSettings, uid);
      settingsRestored = true;
    }
  } catch (err) {
    console.warn('Failed to pull user settings doc:', err);
  }

  // Fallback restoration
  const currentLocal = await getAppSettings();
  if (!currentLocal) {
    try {
      const accountSnap = await getDoc(doc(dbFirestore, 'accounts', uid));
      const accountData = accountSnap.exists() ? accountSnap.data() : null;
      const currentUser = auth?.currentUser;
      const recoveredShopName =
        accountData?.shopName ||
        currentUser?.displayName ||
        (currentUser?.email ? currentUser.email.split('@')[0] : 'MySalon');

      const now = new Date().toISOString();
      const restoredSettings: AppSettings = {
        shopName: recoveredShopName,
        language: 'en',
        firstLaunchDate: accountData?.createdAt || now.split('T')[0],
        activated: isSuperAdmin(currentUser) || isProCurrentlyActive(accountData),
        proPlan: accountData?.proPlan ?? null,
        proExpiresAt: accountData?.proExpiresAt ?? null,
        lastBackupAt: now,
        ownerUid: uid,
        cloudId: generateCloudId(),
        updatedAt: now,
        syncStatus: 'synced',
      };
      await db.settings.add(restoredSettings);
      settingsRestored = true;
    } catch (fallbackErr) {
      console.warn('Fallback settings restoration failed:', fallbackErr);
    }
  } else if (!currentLocal.ownerUid) {
    await db.settings.update(currentLocal.id!, { ownerUid: uid });
    settingsRestored = true;
  }

  return {
    pulledEntries,
    pulledAppointments,
    pulledCustomers,
    pulledServices,
    pulledStaff,
    pulledBills,
    settingsRestored,
  };
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
    const pullResult = await pullCloudChanges(uid);
    const pulled =
      pullResult.pulledEntries +
      pullResult.pulledAppointments +
      pullResult.pulledCustomers +
      pullResult.pulledServices +
      pullResult.pulledStaff +
      pullResult.pulledBills;
    return { success: true, pushed, pulled };
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

  triggerSync();

  const handleOnline = () => triggerSync();
  const handleOffline = () => onStatusChange?.('offline');

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  const listenToCollection = (collName: string, reconciler: (items: any[]) => Promise<any>) => {
    try {
      const collRef = collection(dbFirestore!, 'users', uid, collName);
      const unsub = onSnapshot(
        collRef,
        (snapshot) => {
          if (snapshot.metadata.hasPendingWrites) return;
          const changed = snapshot.docChanges().map((c) => c.doc.data());
          if (changed.length > 0) {
            reconciler(changed).then(() => {
              onStatusChange?.('synced', new Date());
            });
          }
        },
        (err) => onStatusChange?.('error', undefined, err.message)
      );
      unsubscribers.push(unsub);
    } catch (e) {
      console.warn(`Failed to attach snapshot listener to ${collName}:`, e);
    }
  };

  listenToCollection('appointments', reconcileRemoteAppointments);
  listenToCollection('customers', reconcileRemoteCustomers);
  listenToCollection('services', reconcileRemoteServices);
  listenToCollection('staff', reconcileRemoteStaff);
  listenToCollection('bills', reconcileRemoteBills);
  listenToCollection('entries', reconcileRemoteEntries);

  return () => {
    isSubscribed = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
    unsubscribers.forEach((u) => u());
  };
}
