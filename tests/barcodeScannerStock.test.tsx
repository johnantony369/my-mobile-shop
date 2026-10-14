import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StockScreen } from '../src/screens/StockScreen';
import { AddEditStockSheet } from '../src/screens/AddEditStockSheet';
import { db } from '../src/db/db';

describe('Barcode Scanner Integration in Stock', () => {
  beforeEach(async () => {
    await db.stock.clear();
    await db.usedDevices.clear();
  });

  it('renders Scan button at top of StockScreen replacing Add Item button', () => {
    const html = renderToString(
      React.createElement(StockScreen, {
        language: 'en',
        shopName: 'City Mobiles',
      })
    );

    // Should contain Scan action in header
    expect(html).toContain('Scan');
    // Top primary action should be scan button (with ScanBarcode icon or Scan label)
    expect(html).toContain('Scan Barcode');
    // Live badge should not be in header
    expect(html).not.toContain('Live');
  });

  it('renders AddEditStockSheet with pre-filled SKU when initialSku is provided', () => {
    const html = renderToString(
      React.createElement(AddEditStockSheet, {
        isOpen: true,
        onClose: () => {},
        onSaved: () => {},
        itemToEdit: null,
        language: 'en',
        initialSku: '8901234567890',
      })
    );

    expect(html).toContain('8901234567890');
    expect(html).toContain('Barcode / SKU');
  });

  it('renders Delete button inside AddEditStockSheet when editing existing item', () => {
    const html = renderToString(
      React.createElement(AddEditStockSheet, {
        isOpen: true,
        onClose: () => {},
        onSaved: () => {},
        onDelete: () => {},
        itemToEdit: {
          id: 1,
          name: 'USB-C Cable',
          category: 'product',
          sellingPrice: 150,
          createdAt: Date.now(),
        },
        language: 'en',
      })
    );

    expect(html).toMatch(/Delete.*Product/);
  });
});
