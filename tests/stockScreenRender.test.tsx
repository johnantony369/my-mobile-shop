import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StockScreen } from '../src/screens/StockScreen';
import { db } from '../src/db/db';

describe('StockScreen Rendering', () => {
  beforeEach(async () => {
    await db.stock.clear();
    await db.usedDevices.clear();
  });

  it('renders StockScreen with empty state or items', async () => {
    const html = renderToString(
      React.createElement(StockScreen, {
        language: 'en',
        shopName: 'City Mobiles',
      })
    );

    expect(html).toContain('Stock');
    expect(html).toContain('Products');
    expect(html).toContain('Services');
    expect(html).toContain('Low Stock');
  });

  it('renders StockScreen safely with products in DB', async () => {
    await db.stock.add({
      name: 'iPhone 13 Tempered Glass',
      category: 'product',
      sellingPrice: 199,
      costPrice: 50,
      quantity: 15,
      createdAt: Date.now(),
    });

    const html = renderToString(
      React.createElement(StockScreen, {
        language: 'en',
        shopName: 'City Mobiles',
      })
    );

    expect(html).toContain('Stock');
    expect(html).toContain('Products');
    expect(html).toContain('Services');
  });
});
