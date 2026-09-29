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
});
