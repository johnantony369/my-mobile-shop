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
    expect(html).toContain('whitespace-nowrap');
    expect(html).toContain('shrink-0');
    // Slide left action button revealed in SwipeableRow
    expect(html).toContain('aria-label="Paid"');
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

  it('renders Unpaid slide action for paid entries', () => {
    const entries: Entry[] = [
      {
        id: 2,
        type: 'in',
        amount: 500,
        paymentMethod: 'cash',
        customerName: 'Amit',
        item: 'Charger',
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

    expect(html).toContain('aria-label="Unpaid"');
    expect(html).toContain('Unpaid');
  });

  it('updates entry from paid to credit when marked unpaid', async () => {
    const id = await db.entries.add({
      type: 'in',
      amount: 1500,
      paymentMethod: 'cash',
      customerName: 'Karan',
      date: '2026-10-05',
      createdAt: Date.now(),
    });

    const now = new Date().toISOString();
    await db.entries.update(id, {
      paymentMethod: 'credit',
      updatedAt: now,
      syncStatus: 'pending',
    });

    const updated = await db.entries.get(id);
    expect(updated?.paymentMethod).toBe('credit');
    expect(typeof updated?.updatedAt).toBe('string');
    expect(new Date(updated?.updatedAt || '').getTime()).not.toBeNaN();
  });
});
