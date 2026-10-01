import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, generateCloudId, softDeleteEntry, softDeleteJob, softDeleteStockItem, adjustStockQuantity } from '../src/db/db';
import { Entry, Job, StockItem } from '../src/types';

describe('Dexie v4 Schema, Stock, and Sync Metadata', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.jobs.clear();
    await db.settings.clear();
    if (db.stock) await db.stock.clear();
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

  it('populates cloudId, updatedAt, and syncStatus on new stock items via hook', async () => {
    const stockData: Omit<StockItem, 'id'> = {
      name: 'Screen Guard 11D',
      category: 'product',
      sellingPrice: 150,
      costPrice: 40,
      quantity: 20,
      createdAt: Date.now(),
    };

    const id = await db.stock.add(stockData as StockItem);
    const saved = await db.stock.get(id);

    expect(saved).toBeDefined();
    expect(saved?.cloudId).toBeDefined();
    expect(saved?.syncStatus).toBe('pending');
    expect(saved?.updatedAt).toBeDefined();
  });

  it('adjustStockQuantity modifies quantity properly', async () => {
    const id = await db.stock.add({
      name: 'Type-C Cable',
      category: 'product',
      sellingPrice: 200,
      quantity: 10,
      createdAt: Date.now(),
    });

    const newQty = await adjustStockQuantity(id, -1);
    expect(newQty).toBe(9);

    const saved = await db.stock.get(id);
    expect(saved?.quantity).toBe(9);
  });

  it('softDeleteStockItem marks stock item with deleted syncStatus and deletedAt timestamp', async () => {
    const id = await db.stock.add({
      name: 'Old Battery',
      category: 'product',
      sellingPrice: 800,
      quantity: 2,
      createdAt: Date.now(),
    });

    await softDeleteStockItem(id);
    const item = await db.stock.get(id);
    expect(item?.syncStatus).toBe('deleted');
    expect(item?.deletedAt).toBeDefined();
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
