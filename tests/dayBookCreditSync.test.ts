import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { syncDayBookCreditEntry, removeDayBookCreditSync } from '../src/utils/wholesaleCredit';
import { db } from '../src/db/db';
import { WholesaleClient } from '../src/types/wholesale';
import { Entry } from '../src/types';

describe('Day Book Credit Synchronization', () => {
  let testClient: WholesaleClient;

  beforeEach(async () => {
    await db.clientTransactions.clear();
    await db.clients.clear();

    testClient = {
      cloudId: 'client-test-1',
      shopName: 'Metro Mobile Clinic',
      phone: '9876543210',
      currentCreditBalance: 1000,
      createdAt: Date.now(),
    };
    await db.clients.add(testClient);
  });

  it('increments client credit balance when a new credit sale entry is saved', async () => {
    const entry: Entry = {
      id: 101,
      type: 'in',
      amount: 1400,
      item: 'iPhone 13 Display OLED',
      customerName: 'Metro Mobile Clinic',
      paymentMethod: 'credit',
      date: '2026-10-09',
      createdAt: Date.now(),
    };

    await syncDayBookCreditEntry(testClient.cloudId, entry);

    const clientInDb = await db.clients.where('cloudId').equals(testClient.cloudId).first();
    expect(clientInDb?.currentCreditBalance).toBe(2400);

    const txs = await db.clientTransactions.where('clientCloudId').equals(testClient.cloudId).toArray();
    expect(txs.length).toBe(1);
    expect(txs[0].amount).toBe(1400);
    expect(txs[0].type).toBe('credit_sale');
    expect(txs[0].dayBookEntryId).toBe(101);
  });

  it('updates balance delta when an existing credit entry amount is modified', async () => {
    const originalEntry: Entry = {
      id: 102,
      type: 'in',
      amount: 1400,
      item: 'Samsung M31 Combo',
      customerName: 'Metro Mobile Clinic',
      paymentMethod: 'credit',
      date: '2026-10-09',
      createdAt: Date.now(),
    };
    await syncDayBookCreditEntry(testClient.cloudId, originalEntry);

    const updatedEntry: Entry = {
      ...originalEntry,
      amount: 1900, // +500 difference
    };
    await syncDayBookCreditEntry(testClient.cloudId, updatedEntry, originalEntry);

    const clientInDb = await db.clients.where('cloudId').equals(testClient.cloudId).first();
    expect(clientInDb?.currentCreditBalance).toBe(2900); // 1000 initial + 1900 credit = 2900

    const txs = await db.clientTransactions.where('dayBookEntryId').equals(102).toArray();
    expect(txs.length).toBe(1);
    expect(txs[0].amount).toBe(1900);
  });

  it('decrements client credit balance when credit entry is converted to cash or settled', async () => {
    const creditEntry: Entry = {
      id: 103,
      type: 'in',
      amount: 800,
      item: 'Redmi 9 Charging PCB',
      customerName: 'Metro Mobile Clinic',
      paymentMethod: 'credit',
      date: '2026-10-09',
      createdAt: Date.now(),
    };
    await syncDayBookCreditEntry(testClient.cloudId, creditEntry);

    // Initial balance was 1000 + 800 = 1800
    let clientInDb = await db.clients.where('cloudId').equals(testClient.cloudId).first();
    expect(clientInDb?.currentCreditBalance).toBe(1800);

    // Entry is marked paid (paymentMethod changed to cash)
    const paidEntry: Entry = {
      ...creditEntry,
      paymentMethod: 'cash',
    };
    await syncDayBookCreditEntry(testClient.cloudId, paidEntry, creditEntry);

    clientInDb = await db.clients.where('cloudId').equals(testClient.cloudId).first();
    expect(clientInDb?.currentCreditBalance).toBe(1000);

    const txs = await db.clientTransactions.where('dayBookEntryId').equals(103).toArray();
    expect(txs.length).toBe(0);
  });

  it('removes credit transaction and adjusts balance on entry deletion', async () => {
    const creditEntry: Entry = {
      id: 104,
      type: 'in',
      amount: 600,
      item: 'Vivo Y12 Battery',
      customerName: 'Metro Mobile Clinic',
      paymentMethod: 'credit',
      date: '2026-10-09',
      createdAt: Date.now(),
    };
    await syncDayBookCreditEntry(testClient.cloudId, creditEntry);

    await removeDayBookCreditSync(creditEntry);

    const clientInDb = await db.clients.where('cloudId').equals(testClient.cloudId).first();
    expect(clientInDb?.currentCreditBalance).toBe(1000);

    const txs = await db.clientTransactions.where('dayBookEntryId').equals(104).toArray();
    expect(txs.length).toBe(0);
  });
});
