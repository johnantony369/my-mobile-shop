import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { EntryList } from '../src/components/EntryList';
import { Entry } from '../src/types';
import { db } from '../src/db/db';

describe('EntryList Credit Badge and Settlement', () => {
  beforeEach(async () => {
    await db.entries.clear();
  });

  it('renders credit badge and customer name for credit entry', () => {
    const entries: Entry[] = [
      {
        id: 1,
        type: 'in',
        amount: 800,
        paymentMethod: 'credit',
        customerName: 'Priya Verma',
        item: 'Earphones',
        date: '2026-10-05',
        createdAt: Date.now(),
      },
    ];

    const html = renderToString(
      React.createElement(EntryList, {
        entries,
        isToday: true,
        language: 'en',
        onEdit: () => {},
        onDelete: () => {},
        onAddClick: () => {},
      })
    );

    expect(html).toContain('CREDIT');
    expect(html).toContain('Priya Verma');
    expect(html).toContain('Mark Paid');
  });

  it('updates entry from credit to cash or upi when settled', async () => {
    const id = await db.entries.add({
      type: 'in',
      amount: 1500,
      paymentMethod: 'credit',
      customerName: 'Karan',
      date: '2026-10-05',
      createdAt: Date.now(),
    });

    const now = new Date().toISOString();
    await db.entries.update(id, {
      paymentMethod: 'cash',
      updatedAt: now,
      syncStatus: 'pending',
    });

    const updated = await db.entries.get(id);
    expect(updated?.paymentMethod).toBe('cash');
    expect(updated?.updatedAt).toBe(now);
  });
});
