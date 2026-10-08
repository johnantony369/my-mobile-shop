import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import 'fake-indexeddb/auto';
import { WebBookView } from '../src/screens/web/views/WebBookView';
import { WebStockView } from '../src/screens/web/views/WebStockView';
import { WebRepairsView } from '../src/screens/web/views/WebRepairsView';
import { Entry, Job, StockItem, UsedDevice } from '../src/types';

describe('Web Desktop Views Suite', () => {
  const sampleEntries: Entry[] = [
    {
      id: 1,
      cloudId: 'e-1',
      type: 'in',
      amount: 1500,
      item: 'Display Folder Replacement',
      customerName: 'Rahul',
      paymentMethod: 'cash',
      date: '2026-10-08',
      createdAt: 1728360000000,
    },
    {
      id: 2,
      cloudId: 'e-2',
      type: 'out',
      amount: 400,
      item: 'Spare Parts Purchase',
      paymentMethod: 'upi',
      date: '2026-10-08',
      createdAt: 1728361000000,
    },
    {
      id: 3,
      cloudId: 'e-3',
      type: 'in',
      amount: 800,
      item: 'Battery & Back Glass',
      customerName: 'Anil Kumar',
      paymentMethod: 'credit',
      date: '2026-10-08',
      createdAt: 1728362000000,
    },
  ];

  it('renders WebBookView with KPI summary cards and table rows', () => {
    const html = renderToString(
      <WebBookView
        entries={sampleEntries}
        selectedDate="2026-10-08"
        language="en"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSettleCredit={vi.fn()}
        onOpenAdd={vi.fn()}
      />
    );

    expect(html).toContain('Total Sales (In)');
    expect(html).toContain('₹2,300');
    expect(html).toContain('Total Expenses (Out)');
    expect(html).toContain('₹400');
    expect(html).toContain('Net Cash Flow');
    expect(html).toContain('₹1,900');
    expect(html).toContain('Credit (Udhar)');
    expect(html).toContain('₹800');
    expect(html).toContain('Display Folder Replacement');
    expect(html).toContain('Spare Parts Purchase');
    expect(html).toContain('Mark Paid');
  });

  it('renders WebStockView with inventory metrics and products', () => {
    const sampleStock: StockItem[] = [
      {
        id: 1,
        cloudId: 's-1',
        name: 'Type-C Fast Cable',
        category: 'product',
        sellingPrice: 199,
        quantity: 2,
        lowStockThreshold: 5,
        sku: 'CBL-001',
      },
    ];
    const sampleUsed: UsedDevice[] = [
      {
        id: 1,
        cloudId: 'u-1',
        brand: 'Apple',
        model: 'iPhone 13',
        purchasePrice: 28000,
        expectedSellingPrice: 34000,
        status: 'in_stock',
        purchaseDate: '2026-10-01',
      },
    ];

    const html = renderToString(
      <WebStockView
        stock={sampleStock}
        usedDevices={sampleUsed}
        language="en"
        onAdjustQty={vi.fn()}
        onOpenAddStock={vi.fn()}
        onOpenAddUsed={vi.fn()}
        onSellUsed={vi.fn()}
      />
    );

    expect(html).toContain('Total Inventory Value');
    expect(html).toContain('Type-C Fast Cable');
    expect(html).toContain('CBL-001');
    expect(html).toContain('Pre-Owned Phones');
  });

  it('renders WebRepairsView with status counters and tickets', () => {
    const sampleJobs: Job[] = [
      {
        id: 1,
        cloudId: 'j-1',
        customerName: 'Sanjay',
        phone: '9876543210',
        model: 'Samsung S22',
        complaint: 'Screen flickering',
        estimate: 4500,
        advance: 1000,
        status: 'ready',
        receivedAt: 1728360000000,
      },
    ];

    const html = renderToString(
      <WebRepairsView
        jobs={sampleJobs}
        language="en"
        onOpenAddJob={vi.fn()}
        onSelectJob={vi.fn()}
      />
    );

    expect(html).toContain('Ready for Delivery');
    expect(html).toContain('Sanjay');
    expect(html).toContain('9876543210');
    expect(html).toContain('Samsung S22');
    expect(html).toContain('Screen flickering');
    expect(html).toContain('Manage');
  });
});
