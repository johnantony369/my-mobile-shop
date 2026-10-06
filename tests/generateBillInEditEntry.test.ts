import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, createBillForEntry, getBillForEntry } from '../src/db/db';
import { Entry } from '../src/types';

describe('Generate Bill in Edit Entry', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.bills.clear();
  });

  it('detects no linked bill initially for a new entry', async () => {
    const entryId = await db.entries.add({
      type: 'in',
      amount: 500,
      item: 'Screen Protector',
      paymentMethod: 'cash',
      date: '2026-10-06',
      createdAt: Date.now(),
    });

    const bill = await getBillForEntry(entryId);
    expect(bill).toBeUndefined();
  });

  it('generates bill on demand for existing entry and returns it on next check', async () => {
    const entryId = await db.entries.add({
      type: 'in',
      amount: 1800,
      item: 'Battery Replacement',
      customerName: 'Deepak',
      paymentMethod: 'upi',
      date: '2026-10-06',
      createdAt: Date.now(),
    });

    const entry = await db.entries.get(entryId) as Entry;
    const generated = await createBillForEntry(entry);

    expect(generated.invoiceNo).toBeDefined();
    expect(generated.total).toBe(1800);
    expect(generated.entryId).toBe(entryId);

    const fetched = await getBillForEntry(entryId);
    expect(fetched).toBeDefined();
    expect(fetched?.invoiceNo).toBe(generated.invoiceNo);
  });
});
