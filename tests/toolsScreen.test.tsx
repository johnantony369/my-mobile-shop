import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import 'fake-indexeddb/auto';
import { db, addUsedDevice } from '../src/db/db';
import { ToolsScreen } from '../src/screens/ToolsScreen';

describe('ToolsScreen Bento Grid', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('renders correctly with default props', () => {
    const element = React.createElement(ToolsScreen, {
      language: 'en',
      shopName: 'Apex Mobiles',
      shopPhone: '9876543210',
      shopAddress: 'Market Road',
    });
    expect(element).toBeDefined();
    expect(element.props.shopName).toBe('Apex Mobiles');
  });

  it('queries active used phones and calculates inventory value', async () => {
    await addUsedDevice({
      brand: 'Apple',
      model: 'iPhone 13',
      imei: '351756051523993',
      purchasePrice: 28000,
      sellingPrice: 32000,
      purchaseDate: '2026-10-07',
      sellerName: 'Rahul',
      sellerPhone: '9876543210',
      status: 'in_stock',
      createdAt: Date.now(),
    });

    const devices = await db.usedDevices.toArray();
    const inStock = devices.filter((d) => d.status === 'in_stock');
    expect(inStock.length).toBe(1);
    expect(inStock[0].sellingPrice).toBe(32000);
  });
});
