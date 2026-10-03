import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, clearLocalDatabase, initAppSettings, getAppSettings } from '../src/db/db';
import { googleProvider } from '../src/firebase/config';

describe('Multi-Account Isolation and Local DB Wiping', () => {
  beforeEach(async () => {
    await clearLocalDatabase();
  });

  it('clearLocalDatabase clears entries, jobs, stock, bills, and settings', async () => {
    // Populate dummy data across all tables
    await db.entries.add({
      type: 'in',
      amount: 500,
      item: 'Screen Guard',
      date: '2026-10-03',
      createdAt: Date.now(),
      syncStatus: 'synced',
    });

    await db.jobs.add({
      customerName: 'Customer A',
      phone: '9876543210',
      model: 'Galaxy S21',
      complaint: 'Display crack',
      advance: 500,
      status: 'received',
      receivedAt: Date.now(),
      syncStatus: 'synced',
    });

    await db.stock.add({
      name: 'iPhone 13 Case',
      category: 'product',
      sellingPrice: 299,
      quantity: 10,
      createdAt: Date.now(),
      syncStatus: 'synced',
    });

    await db.bills.add({
      invoiceNo: 'INV-001',
      date: '2026-10-03',
      items: [{ name: 'iPhone 13 Case', qty: 1, price: 299 }],
      subtotal: 299,
      discount: 0,
      total: 299,
      createdAt: Date.now(),
      syncStatus: 'synced',
    });

    await db.settings.add({
      shopName: 'Shop A',
      language: 'en',
      firstLaunchDate: '2026-10-03',
      activated: true,
      lastBackupAt: null,
      showRepairs: true,
      showStock: true,
      ownerUid: 'uid-user-a',
      cloudId: 'settings-cloud-1',
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    });

    // Verify all tables have items
    expect(await db.entries.count()).toBe(1);
    expect(await db.jobs.count()).toBe(1);
    expect(await db.stock.count()).toBe(1);
    expect(await db.bills.count()).toBe(1);
    expect(await db.settings.count()).toBe(1);

    // Call clearLocalDatabase
    await clearLocalDatabase();

    // Verify all tables are completely empty
    expect(await db.entries.count()).toBe(0);
    expect(await db.jobs.count()).toBe(0);
    expect(await db.stock.count()).toBe(0);
    expect(await db.bills.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);
  });

  it('initAppSettings correctly assigns ownerUid to settings', async () => {
    const settings = await initAppSettings('Ali Mobile Shop', 'en', true, true, 'uid-user-b');
    expect(settings.shopName).toBe('Ali Mobile Shop');
    expect(settings.ownerUid).toBe('uid-user-b');

    const loaded = await getAppSettings();
    expect(loaded?.ownerUid).toBe('uid-user-b');
  });

  it('prevents account B from inheriting account A data upon sign out and sign in', async () => {
    // 1. Account A creates data
    await initAppSettings("Alice's Phone Repair", 'en', true, true, 'user-alice');
    await db.entries.add({
      type: 'in',
      amount: 1200,
      item: 'Battery Replacement',
      date: '2026-10-03',
      createdAt: Date.now(),
    });

    expect(await db.entries.count()).toBe(1);
    const aliceSettings = await getAppSettings();
    expect(aliceSettings?.shopName).toBe("Alice's Phone Repair");
    expect(aliceSettings?.ownerUid).toBe('user-alice');

    // 2. Account A logs out -> clearLocalDatabase called
    await clearLocalDatabase();
    expect(await db.entries.count()).toBe(0);
    expect(await db.settings.count()).toBe(0);

    // 3. Account B logs in as new user -> clean slate
    const bobSettings = await initAppSettings("Bob's Mobile Tech", 'en', false, true, 'user-bob');
    expect(bobSettings.shopName).toBe("Bob's Mobile Tech");
    expect(bobSettings.ownerUid).toBe('user-bob');

    // Bob has 0 of Alice's entries
    expect(await db.entries.count()).toBe(0);
  });

  it('googleProvider has prompt=select_account parameter configured', () => {
    if (googleProvider) {
      // GoogleAuthProvider stores custom parameters
      const params = (googleProvider as any).getCustomParameters?.() || {};
      expect(params.prompt).toBe('select_account');
    }
  });
});
