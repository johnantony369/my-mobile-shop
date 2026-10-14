import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { db, adjustStockQuantity } from '../src/db/db';
import { t } from '../src/i18n';
import { AddEditSheet, SaleItem } from '../src/screens/AddEditSheet';

describe('Multi-Product Sale and Item Placeholder', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.stock.clear();
  });

  it('uses "Item / Service name" as default placeholder', () => {
    const placeholder = t('item_placeholder', 'en');
    expect(placeholder).toBe('Item / Service name');
  });

  it('correctly handles multi-item sale persistence and stock quantity adjustments', async () => {
    // Add two stock products
    const stockId1 = await db.stock.add({
      name: 'Tempered Glass 11D',
      category: 'product',
      sellingPrice: 150,
      costPrice: 50,
      quantity: 10,
      createdAt: Date.now(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    });

    const stockId2 = await db.stock.add({
      name: 'Silicone Back Cover',
      category: 'product',
      sellingPrice: 250,
      costPrice: 100,
      quantity: 5,
      createdAt: Date.now(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    });

    const saleItems: SaleItem[] = [
      {
        id: 'item-1',
        name: 'Tempered Glass 11D',
        price: 150,
        stockId: stockId1,
        category: 'product',
      },
      {
        id: 'item-2',
        name: 'Silicone Back Cover',
        price: 250,
        stockId: stockId2,
        category: 'product',
      },
      {
        id: 'item-3',
        name: 'Installation Service',
        price: 50,
        category: 'service',
      },
    ];

    // Compute total amount and joined item summary
    const totalAmount = saleItems.reduce((acc, i) => acc + i.price, 0);
    const joinedItems = saleItems.map((i) => i.name).join(', ');

    expect(totalAmount).toBe(450);
    expect(joinedItems).toBe('Tempered Glass 11D, Silicone Back Cover, Installation Service');

    // Simulate saving the multi-item entry
    const entryId = await db.entries.add({
      type: 'in',
      amount: totalAmount,
      item: joinedItems,
      customerName: 'Rohit',
      paymentMethod: 'cash',
      date: '2026-10-10',
      createdAt: Date.now(),
    });

    // Simulate stock deduction for items with stockId
    for (const si of saleItems) {
      if (si.stockId && si.category === 'product') {
        await adjustStockQuantity(si.stockId, -1);
      }
    }

    // Verify entry in database
    const savedEntry = await db.entries.get(entryId);
    expect(savedEntry).toBeDefined();
    expect(savedEntry?.amount).toBe(450);
    expect(savedEntry?.item).toBe('Tempered Glass 11D, Silicone Back Cover, Installation Service');

    // Verify stock deductions
    const updatedStock1 = await db.stock.get(stockId1);
    const updatedStock2 = await db.stock.get(stockId2);
    expect(updatedStock1?.quantity).toBe(9);
    expect(updatedStock2?.quantity).toBe(4);
  });

  it('renders AddEditSheet with "Item / Service name" placeholder and Add button', () => {
    const html = renderToString(
      React.createElement(AddEditSheet, {
        isOpen: true,
        onClose: () => {},
        onSaved: () => {},
        entryToEdit: null,
        defaultDate: '2026-10-10',
        language: 'en',
      })
    );

    // Placeholder
    expect(html).toContain('placeholder="Item / Service name"');
    // Price input
    expect(html).toContain('placeholder="Price"');
    // Clean Add button without duplicate pluses
    expect(html).toContain('<span>Add</span>');
    expect(html).not.toContain('+ +');
    expect(html).not.toContain('<span>+ Add');
  });

  it('filters stock items by entered product/service query', () => {
    const stockItems = [
      { id: 1, name: 'Screen Guard 11D', category: 'product', sellingPrice: 150 },
      { id: 2, name: 'Screen Guard UV Curved', category: 'product', sellingPrice: 350 },
      { id: 3, name: 'Screen Replacement Service', category: 'service', sellingPrice: 1800 },
      { id: 4, name: 'Back Cover Matte', category: 'product', sellingPrice: 200 },
    ];

    const searchStock = (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return stockItems.filter(
        (si) => si.name.toLowerCase().includes(q) || si.category.toLowerCase().includes(q)
      );
    };

    const screenMatches = searchStock('screen');
    expect(screenMatches).toHaveLength(3);
    expect(screenMatches.map((m) => m.name)).toEqual([
      'Screen Guard 11D',
      'Screen Guard UV Curved',
      'Screen Replacement Service',
    ]);

    const serviceMatches = searchStock('service');
    expect(serviceMatches).toHaveLength(1);
    expect(serviceMatches[0].name).toBe('Screen Replacement Service');
  });
});
