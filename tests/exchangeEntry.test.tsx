import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { EntryList } from '../src/components/EntryList';
import { Entry } from '../src/types';
import { computeSummary } from '../src/db/db';

describe('DayBook Exchange Feature Invariants & UI', () => {
  it('EntryList renders subtle EXCH badge for exchange entries', () => {
    const entries: Entry[] = [
      {
        id: 1,
        type: 'in',
        amount: 14000,
        item: 'iPhone 11 64GB',
        customerName: 'Rahul Verma',
        paymentMethod: 'cash',
        date: '2026-10-10',
        createdAt: 1728560000000,
        isExchange: true,
        exchangeItemPrice: 18000,
        exchangeTradeInModel: 'Redmi Note 9 Pro',
        exchangeTradeInValue: 4000,
        note: 'Exchange: Redmi Note 9 Pro ₹4,000 trade-in off ₹18,000',
      },
      {
        id: 2,
        type: 'in',
        amount: 500,
        item: 'Tempered Glass',
        paymentMethod: 'upi',
        date: '2026-10-10',
        createdAt: 1728560100000,
      },
    ];

    const html = renderToString(
      <EntryList
        entries={entries}
        isToday={true}
        language="en"
        onEdit={() => {}}
        onDelete={() => {}}
        onAddClick={() => {}}
      />
    );

    expect(html).toContain('EXCH');
    expect(html).toContain('₹14,000');
    expect(html).toContain('₹500');
    expect(html).toContain('iPhone 11 64GB');
  });

  it('AddEditSheet contains exchange toggle, fields, and calculation logic', () => {
    const file = path.resolve(__dirname, '../src/screens/AddEditSheet.tsx');
    const content = fs.readFileSync(file, 'utf-8');

    expect(content).toContain('isExchange');
    expect(content).toContain('exchangeItemPrice');
    expect(content).toContain('exchangeTradeInModel');
    expect(content).toContain('exchangeTradeInValue');
    expect(content).toContain('Selling Item Price');
    expect(content).toContain('Old Phone Value');
    expect(content).toContain('Old Phone / Device Received');
  });

  it('correctly calculates summary for day containing exchange entries', () => {
    const entries: Entry[] = [
      {
        id: 1,
        type: 'in',
        amount: 14000,
        paymentMethod: 'cash',
        date: '2026-10-10',
        createdAt: 100,
        isExchange: true,
        exchangeItemPrice: 18000,
        exchangeTradeInModel: 'Redmi Note 9 Pro',
        exchangeTradeInValue: 4000,
      },
      {
        id: 2,
        type: 'in',
        amount: 2000,
        paymentMethod: 'upi',
        date: '2026-10-10',
        createdAt: 200,
      },
      {
        id: 3,
        type: 'out',
        amount: 1000,
        date: '2026-10-10',
        createdAt: 300,
      },
    ];

    const summary = computeSummary(entries);
    expect(summary.inTotal).toBe(16000);
    expect(summary.cashTotal).toBe(14000);
    expect(summary.upiTotal).toBe(2000);
    expect(summary.outTotal).toBe(1000);
    expect(summary.net).toBe(15000);
  });
});
