import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, adjustStockQuantity, softDeleteStockItem } from '../src/db/db';
import { StockItem } from '../src/types';
import { seedDefaultStockItems, clearAllStock } from '../src/utils/seedData';
import { exportBackup, importBackup } from '../src/utils/backup';

describe('Stock & Inventory Management System', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.jobs.clear();
    await db.settings.clear();
    await clearAllStock();
  });

  it('allows adding products with quantity and selling price', async () => {
    const productId = await db.stock.add({
      name: 'Tempered Glass 11D',
      category: 'product',
      sellingPrice: 150,
      costPrice: 35,
      quantity: 20,
      unit: 'pcs',
      lowStockThreshold: 5,
      createdAt: Date.now(),
    });

    const item = await db.stock.get(productId);
    expect(item).toBeDefined();
    expect(item?.name).toBe('Tempered Glass 11D');
    expect(item?.category).toBe('product');
    expect(item?.sellingPrice).toBe(150);
    expect(item?.costPrice).toBe(35);
    expect(item?.quantity).toBe(20);
    expect(item?.cloudId).toBeDefined();
    expect(item?.syncStatus).toBe('pending');
  });

  it('allows adding services with labour/service charges', async () => {
    const serviceId = await db.stock.add({
      name: 'Display Combo Replacement',
      category: 'service',
      sellingPrice: 1800,
      costPrice: 1100,
      unit: 'service',
      notes: 'Includes combo part & installation',
      createdAt: Date.now(),
    });

    const item = await db.stock.get(serviceId);
    expect(item).toBeDefined();
    expect(item?.name).toBe('Display Combo Replacement');
    expect(item?.category).toBe('service');
    expect(item?.sellingPrice).toBe(1800);
    expect(item?.quantity).toBeUndefined();
  });

  it('performs quick stock adjustments (increment and decrement)', async () => {
    const id = await db.stock.add({
      name: 'Type-C Fast Cable',
      category: 'product',
      sellingPrice: 250,
      quantity: 10,
      createdAt: Date.now(),
    });

    // Sell 1 item
    const afterDecrement = await adjustStockQuantity(id, -1);
    expect(afterDecrement).toBe(9);
    let current = await db.stock.get(id);
    expect(current?.quantity).toBe(9);

    // Restock 5 items
    const afterIncrement = await adjustStockQuantity(id, 5);
    expect(afterIncrement).toBe(14);
    current = await db.stock.get(id);
    expect(current?.quantity).toBe(14);

    // Quantity cannot be negative
    await adjustStockQuantity(id, -20);
    current = await db.stock.get(id);
    expect(current?.quantity).toBe(0);
  });

  it('soft deletes stock item without losing audit metadata', async () => {
    const id = await db.stock.add({
      name: 'Old Case',
      category: 'product',
      sellingPrice: 100,
      quantity: 1,
      createdAt: Date.now(),
    });

    await softDeleteStockItem(id);
    const deleted = await db.stock.get(id);
    expect(deleted?.syncStatus).toBe('deleted');
    expect(deleted?.deletedAt).toBeDefined();
  });

  it('seeds default mobile shop essentials (products and services)', async () => {
    const count = await seedDefaultStockItems();
    expect(count).toBeGreaterThanOrEqual(15);

    const all = await db.stock.toArray();
    expect(all.length).toBe(count);

    const products = all.filter(i => i.category === 'product');
    const services = all.filter(i => i.category === 'service');

    expect(products.length).toBeGreaterThan(0);
    expect(services.length).toBeGreaterThan(0);

    const temperedGlass = products.find(p => p.name.includes('Tempered Glass'));
    expect(temperedGlass).toBeDefined();
    expect(temperedGlass?.sellingPrice).toBeGreaterThan(0);

    const screenService = services.find(s => s.name.includes('Display Combo'));
    expect(screenService).toBeDefined();
  });

  it('simulates sales entry from stock and deducts inventory quantity', async () => {
    // 1. Add product to stock with initial quantity 15
    const stockId = await db.stock.add({
      name: 'Boat Bassheads Earphones',
      category: 'product',
      sellingPrice: 450,
      costPrice: 200,
      quantity: 15,
      createdAt: Date.now(),
    });

    const stockItem = await db.stock.get(stockId);
    expect(stockItem?.quantity).toBe(15);

    // 2. Customer buys this earphone in Day Book (sales entry)
    await db.entries.add({
      type: 'in',
      amount: stockItem!.sellingPrice,
      item: stockItem!.name,
      paymentMethod: 'upi',
      date: '2026-10-01',
      createdAt: Date.now(),
    });

    // 3. Deduct 1 unit from stock
    await adjustStockQuantity(stockId, -1);

    // 4. Verify inventory is decremented to 14
    const updatedStock = await db.stock.get(stockId);
    expect(updatedStock?.quantity).toBe(14);
  });

  it('simulates repair job creation from stock service with auto-estimated amount', async () => {
    // 1. Service in stock
    const serviceId = await db.stock.add({
      name: 'Battery Replacement Service',
      category: 'service',
      sellingPrice: 950,
      createdAt: Date.now(),
    });

    const serviceItem = await db.stock.get(serviceId);

    // 2. Create repair job using service name and price estimate
    const jobId = await db.jobs.add({
      customerName: 'Anil Kumar',
      phone: '9847112233',
      model: 'Redmi Note 9',
      complaint: serviceItem!.name,
      estimate: serviceItem!.sellingPrice,
      advance: 200,
      status: 'received',
      receivedAt: Date.now(),
    });

    const savedJob = await db.jobs.get(jobId);
    expect(savedJob?.complaint).toBe('Battery Replacement Service');
    expect(savedJob?.estimate).toBe(950);
  });

  it('exports and imports backup with stock products and services', async () => {
    await db.stock.add({
      name: 'iPhone 20W Adapter',
      category: 'product',
      sellingPrice: 599,
      quantity: 8,
      createdAt: Date.now(),
    });

    const stockItems = await db.stock.toArray();
    const backupJson = JSON.stringify({
      version: 3,
      exportedAt: new Date().toISOString(),
      settings: { shopName: 'Test Mobiles' },
      entries: [],
      jobs: [],
      stock: stockItems,
    });

    // Clear db
    await db.stock.clear();
    expect(await db.stock.count()).toBe(0);

    // Import from file
    const file = new File([backupJson], 'backup.json', { type: 'application/json' });
    const result = await importBackup(file);
    expect(result.count).toBe(1);

    const restored = await db.stock.toArray();
    expect(restored.length).toBe(1);
    expect(restored[0].name).toBe('iPhone 20W Adapter');
    expect(restored[0].quantity).toBe(8);
  });
});
