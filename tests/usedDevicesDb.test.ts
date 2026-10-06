import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, addUsedDevice, updateUsedDevice, markUsedDeviceSold, softDeleteUsedDevice } from '../src/db/db';

describe('Used Devices Database Operations', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('adds a used device and optionally creates a Day Book cash out entry', async () => {
    const deviceId = await addUsedDevice(
      {
        brand: 'Apple',
        model: 'iPhone 13',
        imei: '351756051523999',
        purchasePrice: 28000,
        purchaseDate: '2026-10-07',
        sellerName: 'Rahul Kumar',
        sellerPhone: '9876543210',
        status: 'in_stock',
        createdAt: Date.now(),
      },
      true // create Day Book Cash Out
    );

    expect(deviceId).toBeDefined();
    const saved = await db.usedDevices.get(deviceId);
    expect(saved?.model).toBe('iPhone 13');
    expect(saved?.status).toBe('in_stock');

    const entries = await db.entries.toArray();
    expect(entries.length).toBe(1);
    expect(entries[0].type).toBe('out');
    expect(entries[0].amount).toBe(28000);
    expect(entries[0].note).toContain('iPhone 13');
  });

  it('marks used device as sold and optionally creates a Day Book cash in entry', async () => {
    const deviceId = await addUsedDevice({
      brand: 'Samsung',
      model: 'Galaxy S21',
      imei: '359876543210987',
      purchasePrice: 15000,
      purchaseDate: '2026-10-07',
      sellerName: 'Amit',
      sellerPhone: '9876543211',
      status: 'in_stock',
      createdAt: Date.now(),
    });

    await markUsedDeviceSold(
      deviceId,
      {
        soldPrice: 19500,
        soldDate: '2026-10-08',
        buyerName: 'Vikas',
        buyerPhone: '9988776655',
      },
      true // create Day Book Cash In
    );

    const updated = await db.usedDevices.get(deviceId);
    expect(updated?.status).toBe('sold');
    expect(updated?.soldPrice).toBe(19500);

    const entries = await db.entries.toArray();
    expect(entries.length).toBe(1);
    expect(entries[0].type).toBe('in');
    expect(entries[0].amount).toBe(19500);
  });

  it('soft deletes a used device with deletedAt timestamp', async () => {
    const deviceId = await addUsedDevice({
      brand: 'OnePlus',
      model: '11R',
      imei: '358765432109876',
      purchasePrice: 20000,
      purchaseDate: '2026-10-07',
      sellerName: 'Suresh',
      sellerPhone: '9876543212',
      status: 'in_stock',
      createdAt: Date.now(),
    });

    await softDeleteUsedDevice(deviceId);
    const item = await db.usedDevices.get(deviceId);
    expect(item?.deletedAt).toBeDefined();
    expect(item?.syncStatus).toBe('deleted');
  });

  it('supports non-phone gadgets (smartwatch/laptop) with serial number', async () => {
    const deviceId = await addUsedDevice(
      {
        deviceCategory: 'smartwatch',
        brand: 'Apple',
        model: 'Watch Series 8 45mm',
        serialNumber: 'FGH789XYZ1',
        purchasePrice: 16000,
        sellingPrice: 21000,
        purchaseDate: '2026-10-07',
        sellerName: 'Karan',
        sellerPhone: '9812345678',
        status: 'in_stock',
        createdAt: Date.now(),
      },
      true
    );

    const saved = await db.usedDevices.get(deviceId);
    expect(saved?.deviceCategory).toBe('smartwatch');
    expect(saved?.serialNumber).toBe('FGH789XYZ1');
    expect(saved?.imei).toBeUndefined();

    const entries = await db.entries.toArray();
    expect(entries.length).toBe(1);
    expect(entries[0].note).toContain('S/N: FGH789XYZ1');
  });
});

