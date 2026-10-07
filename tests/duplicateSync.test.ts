import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/db/db';
import { reconcileRemoteEntries, pullCloudChanges } from '../src/firebase/sync';
import { Entry } from '../src/types';

describe('Duplicate Sync Reproduction and Prevention', () => {
  beforeEach(async () => {
    await db.entries.clear();
  });

  it('does NOT duplicate entries when reconcileRemoteEntries is called concurrently 4 times', async () => {
    const remoteEntries: Entry[] = [
      {
        cloudId: 'entry-dup-1',
        type: 'in',
        amount: 500,
        item: 'Screen Protector',
        date: '2026-10-07',
        createdAt: 1728300000000,
        updatedAt: '2026-10-07T10:00:00.000Z',
        syncStatus: 'synced',
      },
      {
        cloudId: 'entry-dup-2',
        type: 'out',
        amount: 200,
        item: 'Tea & Snacks',
        date: '2026-10-07',
        createdAt: 1728301000000,
        updatedAt: '2026-10-07T10:10:00.000Z',
        syncStatus: 'synced',
      },
    ];

    // Fire 4 parallel reconciliation calls (simulating login, route transition, livequery, and autoSync)
    await Promise.all([
      reconcileRemoteEntries(remoteEntries),
      reconcileRemoteEntries(remoteEntries),
      reconcileRemoteEntries(remoteEntries),
      reconcileRemoteEntries(remoteEntries),
    ]);

    const total = await db.entries.toArray();
    // Before fix, this would have 8 entries (4 copies each)!
    expect(total.length).toBe(2);

    const dup1Matches = await db.entries.where('cloudId').equals('entry-dup-1').toArray();
    expect(dup1Matches.length).toBe(1);

    const dup2Matches = await db.entries.where('cloudId').equals('entry-dup-2').toArray();
    expect(dup2Matches.length).toBe(1);
  });

  it('prunes existing duplicates cleanly using deduplicateLocalDatabase()', async () => {
    const { deduplicateLocalDatabase } = await import('../src/db/db');

    // Simulate pre-existing dirty duplicates
    await db.entries.bulkAdd([
      { cloudId: 'dup-x', type: 'in', amount: 100, date: '2026-10-07', createdAt: 1000, syncStatus: 'synced' },
      { cloudId: 'dup-x', type: 'in', amount: 100, date: '2026-10-07', createdAt: 2000, syncStatus: 'synced' },
      { cloudId: 'dup-x', type: 'in', amount: 100, date: '2026-10-07', createdAt: 3000, syncStatus: 'synced' },
      { cloudId: 'unique-y', type: 'out', amount: 50, date: '2026-10-07', createdAt: 4000, syncStatus: 'synced' },
    ] as any);

    const before = await db.entries.toArray();
    expect(before.length).toBe(4);

    const result = await deduplicateLocalDatabase();
    expect(result.entriesRemoved).toBe(2);

    const after = await db.entries.toArray();
    expect(after.length).toBe(2);
    expect(after.filter(e => e.cloudId === 'dup-x').length).toBe(1);
    expect(after.filter(e => e.cloudId === 'unique-y').length).toBe(1);
  });
});
