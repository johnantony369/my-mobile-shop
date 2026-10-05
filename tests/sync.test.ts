import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/db/db';
import { reconcileRemoteEntries, reconcileRemoteJobs } from '../src/firebase/sync';
import { Entry, Job } from '../src/types';

describe('Firebase Sync Engine Reconciliation', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.jobs.clear();
  });

  it('inserts new remote entry into local Dexie if it does not exist locally', async () => {
    const remoteEntry: Entry = {
      cloudId: 'cloud-entry-1',
      type: 'in',
      amount: 999,
      item: 'Battery Replacement',
      date: '2026-09-29',
      createdAt: 1727600000000,
      updatedAt: '2026-09-29T10:00:00.000Z',
      syncStatus: 'synced',
    };

    const count = await reconcileRemoteEntries([remoteEntry]);
    expect(count).toBe(1);

    const local = await db.entries.where('cloudId').equals('cloud-entry-1').first();
    expect(local).toBeDefined();
    expect(local?.amount).toBe(999);
    expect(local?.syncStatus).toBe('synced');
  });

  it('updates local entry when remote entry has a newer updatedAt timestamp', async () => {
    // Add local entry with older timestamp
    const id = await db.entries.add({
      cloudId: 'cloud-entry-2',
      type: 'in',
      amount: 100,
      date: '2026-09-29',
      createdAt: 1727600000000,
      updatedAt: '2026-09-29T10:00:00.000Z',
      syncStatus: 'synced',
    });

    const newerRemoteEntry: Entry = {
      cloudId: 'cloud-entry-2',
      type: 'in',
      amount: 250,
      date: '2026-09-29',
      createdAt: 1727600000000,
      updatedAt: '2026-09-29T11:00:00.000Z', // 1 hour newer
      syncStatus: 'synced',
    };

    const count = await reconcileRemoteEntries([newerRemoteEntry]);
    expect(count).toBe(1);

    const updated = await db.entries.get(id);
    expect(updated?.amount).toBe(250);
    expect(updated?.updatedAt).toBe('2026-09-29T11:00:00.000Z');
  });

  it('does NOT overwrite local entry if local entry has a newer updatedAt timestamp', async () => {
    const id = await db.entries.add({
      cloudId: 'cloud-entry-3',
      type: 'in',
      amount: 300,
      date: '2026-09-29',
      createdAt: 1727600000000,
      updatedAt: '2026-09-29T12:00:00.000Z', // Local is newer
      syncStatus: 'pending',
    });

    const olderRemoteEntry: Entry = {
      cloudId: 'cloud-entry-3',
      type: 'in',
      amount: 150,
      date: '2026-09-29',
      createdAt: 1727600000000,
      updatedAt: '2026-09-29T10:00:00.000Z', // Remote is older
      syncStatus: 'synced',
    };

    const count = await reconcileRemoteEntries([olderRemoteEntry]);
    expect(count).toBe(0);

    const current = await db.entries.get(id);
    expect(current?.amount).toBe(300); // Unchanged
    expect(current?.syncStatus).toBe('pending');
  });

  it('inserts new remote job into local Dexie', async () => {
    const remoteJob: Job = {
      cloudId: 'cloud-job-1',
      customerName: 'Anil',
      phone: '9876543210',
      model: 'OnePlus 9',
      complaint: 'Mic not working',
      advance: 200,
      status: 'received',
      receivedAt: 1727600000000,
      updatedAt: '2026-09-29T10:00:00.000Z',
      syncStatus: 'synced',
    };

    const count = await reconcileRemoteJobs([remoteJob]);
    expect(count).toBe(1);

    const localJob = await db.jobs.where('cloudId').equals('cloud-job-1').first();
    expect(localJob).toBeDefined();
    expect(localJob?.customerName).toBe('Anil');
  });

  it('deletes local entry when remote entry has deletedAt tombstone', async () => {
    const id = await db.entries.add({
      cloudId: 'cloud-entry-to-delete',
      type: 'in',
      amount: 100,
      date: '2026-09-29',
      createdAt: 1727600000000,
      updatedAt: '2026-09-29T10:00:00.000Z',
      syncStatus: 'synced',
    });

    const tombstoneEntry: Entry = {
      cloudId: 'cloud-entry-to-delete',
      type: 'in',
      amount: 100,
      date: '2026-09-29',
      createdAt: 1727600000000,
      updatedAt: '2026-09-29T10:05:00.000Z',
      deletedAt: '2026-09-29T10:05:00.000Z',
      syncStatus: 'synced',
    };

    const count = await reconcileRemoteEntries([tombstoneEntry]);
    expect(count).toBe(1);

    const local = await db.entries.get(id);
    expect(local).toBeUndefined();
  });

  it('inserts new remote bill into local Dexie', async () => {
    const { reconcileRemoteBills } = await import('../src/firebase/sync');
    const remoteBill = {
      cloudId: 'cloud-bill-1',
      invoiceNo: 'INV-1001',
      date: '2026-09-29',
      items: [{ name: 'Screen Guard', qty: 1, price: 150 }],
      subtotal: 150,
      discount: 0,
      total: 150,
      createdAt: 1727600000000,
      updatedAt: '2026-09-29T10:00:00.000Z',
      syncStatus: 'synced' as const,
    };

    const count = await reconcileRemoteBills([remoteBill]);
    expect(count).toBe(1);

    const localBill = await db.bills.where('cloudId').equals('cloud-bill-1').first();
    expect(localBill).toBeDefined();
    expect(localBill?.invoiceNo).toBe('INV-1001');
    expect(localBill?.total).toBe(150);
  });

  it('softDeleteEntry marks entry as deleted so pushPendingChanges sends tombstone', async () => {
    const { softDeleteEntry } = await import('../src/db/db');
    const id = await db.entries.add({
      cloudId: 'cloud-entry-to-soft-delete',
      type: 'in',
      amount: 500,
      date: '2026-10-05',
      createdAt: 1727600000000,
      updatedAt: '2026-10-05T10:00:00.000Z',
      syncStatus: 'synced',
    });

    await softDeleteEntry(id);

    const entry = await db.entries.get(id);
    expect(entry).toBeDefined();
    expect(entry?.syncStatus).toBe('deleted');
    expect(entry?.deletedAt).toBeDefined();
  });
});
