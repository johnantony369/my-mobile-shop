import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, createBillForEntry, getBillForEntry } from '../src/db/db';
import { Entry } from '../src/types';

describe('createBillForEntry & getBillForEntry', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.bills.clear();
  });

  it('creates a bill for an existing entry without creating a duplicate entry', async () => {
    const entryId = await db.entries.add({
      type: 'in',
      amount: 1500,
      item: 'Touch Screen Replacement',
      customerName: 'Rahul Verma',
      paymentMethod: 'cash',
      date: '2026-10-06',
      createdAt: Date.now(),
    });

    const entry = await db.entries.get(entryId) as Entry;
    expect(entry).toBeDefined();

    const bill = await createBillForEntry(entry);
    expect(bill).toBeDefined();
    expect(bill.invoiceNo).toMatch(/^INV-\d{4}$/);
    expect(bill.total).toBe(1500);
    expect(bill.customerName).toBe('Rahul Verma');
    expect(bill.items).toHaveLength(1);
    expect(bill.items[0].name).toBe('Touch Screen Replacement');
    expect(bill.entryId).toBe(entryId);

    // Verify no duplicate entry was created in db.entries
    const allEntries = await db.entries.toArray();
    expect(allEntries).toHaveLength(1);

    // Verify entry.note was updated with invoiceNo
    const updatedEntry = await db.entries.get(entryId);
    expect(updatedEntry?.note).toBe(bill.invoiceNo);
  });

  it('preserves existing entry note if present', async () => {
    const entryId = await db.entries.add({
      type: 'in',
      amount: 350,
      item: 'Back Cover',
      note: 'Blue color',
      paymentMethod: 'upi',
      date: '2026-10-06',
      createdAt: Date.now(),
    });

    const entry = await db.entries.get(entryId) as Entry;
    const bill = await createBillForEntry(entry);

    const updatedEntry = await db.entries.get(entryId);
    expect(updatedEntry?.note).toBe('Blue color · ' + bill.invoiceNo);
  });

  it('finds linked bill for an entry via getBillForEntry', async () => {
    const entryId = await db.entries.add({
      type: 'in',
      amount: 999,
      item: 'Charger',
      customerName: 'Aman',
      paymentMethod: 'cash',
      date: '2026-10-06',
      createdAt: Date.now(),
    });

    const entry = await db.entries.get(entryId) as Entry;
    const bill = await createBillForEntry(entry);

    const fetched = await getBillForEntry(entryId);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(bill.id);
    expect(fetched?.invoiceNo).toBe(bill.invoiceNo);
  });
});
