import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as fs from 'fs';
import * as path from 'path';
import { AddEditStockSheet } from '../src/screens/AddEditStockSheet';
import { db } from '../src/db/db';
import { StockItem } from '../src/types';

describe('Stock Quantity Editing & 3-Digit Stepper UI', () => {
  beforeEach(async () => {
    await db.stock.clear();
    await db.usedDevices.clear();
  });

  it('verifies main StockScreen stepper UI uses min-w-[42px] with tabular-nums for 3-digit counts', () => {
    const stockScreenPath = path.resolve(__dirname, '../src/screens/StockScreen.tsx');
    const content = fs.readFileSync(stockScreenPath, 'utf-8');

    // Stepper must use min-w-[42px] with tabular-nums so 3-digit counts do not destroy the UI
    expect(content).toContain('min-w-[42px]');
    expect(content).toContain('tabular-nums');
    expect(content).toContain('shrink-0');
    // Ensure the old w-7 hardcoded width is replaced
    expect(content).not.toContain('text-black w-7 text-center select-none');
  });

  it('renders AddEditStockSheet without leaving a persistent "0" in the quantity value for 0 stock items', () => {
    const zeroStockItem: StockItem = {
      id: 1,
      name: 'Out of Stock Screen Protector',
      category: 'product',
      sellingPrice: 199,
      costPrice: 50,
      quantity: 0,
      unit: 'pcs',
      createdAt: Date.now(),
    };

    const html = renderToString(
      React.createElement(AddEditStockSheet, {
        isOpen: true,
        onClose: () => {},
        onSaved: () => {},
        itemToEdit: zeroStockItem,
        language: 'en',
      })
    );

    // Quantity input should have placeholder="0" and empty value rather than hardcoded value="0"
    expect(html).toContain('placeholder="0"');
    // Ensure the input does NOT render with value="0" inside the input element
    expect(html).not.toMatch(/<input[^>]*value="0"[^>]*placeholder="0"/);
  });

  it('renders AddEditStockSheet with correct quantity for items with positive stock', () => {
    const inStockItem: StockItem = {
      id: 2,
      name: 'iPhone 13 Tempered Glass',
      category: 'product',
      sellingPrice: 299,
      costPrice: 80,
      quantity: 150,
      unit: 'pcs',
      createdAt: Date.now(),
    };

    const html = renderToString(
      React.createElement(AddEditStockSheet, {
        isOpen: true,
        onClose: () => {},
        onSaved: () => {},
        itemToEdit: inStockItem,
        language: 'en',
      })
    );

    expect(html).toContain('value="150"');
  });
});
