import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, generateCloudId, softDeleteEntry, softDeleteJob } from '../src/db/db';
import { Entry, Job } from '../src/types';

describe('Dexie v3 Schema and Sync Metadata', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.jobs.clear();
    await db.settings.clear();
  });

  it('generateCloudId returns a non-empty string', () => {
    const id1 = generateCloudId();
    const id2 = generateCloudId();
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(5);
    expect(id1).not.toBe(id2);
  });

  it('populates cloudId, updatedAt, and syncStatus on new entries via hook', async () => {
    const entryData: Omit<Entry, 'id'> = {
      type: 'in',
      amount: 500,
      item: 'Screen Guard',
      date: '2026-09-29',
      createdAt: Date.now(),
    };

    const id = await db.entries.add(entryData as Entry);
    const saved = await db.entries.get(id);

    expect(saved).toBeDefined();
    expect(saved?.cloudId).toBeDefined();
    expect(saved?.syncStatus).toBe('pending');
    expect(saved?.updatedAt).toBeDefined();
  });

  it('softDeleteEntry marks entry with deleted syncStatus and deletedAt timestamp', async () => {
    const id = await db.entries.add({
      type: 'out',
      amount: 150,
      date: '2026-09-29',
      createdAt: Date.now(),
    });

    await softDeleteEntry(id);
    const entry = await db.entries.get(id);
    expect(entry?.syncStatus).toBe('deleted');
    expect(entry?.deletedAt).toBeDefined();
  });

  it('softDeleteJob marks job with deleted syncStatus and deletedAt timestamp', async () => {
    const jobId = await db.jobs.add({
      customerName: 'Rahul',
      phone: '9876543210',
      model: 'Redmi Note 10',
      complaint: 'Display broken',
      advance: 500,
      status: 'received',
      receivedAt: Date.now(),
    });

    await softDeleteJob(jobId);
    const job = await db.jobs.get(jobId);
    expect(job?.syncStatus).toBe('deleted');
    expect(job?.deletedAt).toBeDefined();
  });
});
