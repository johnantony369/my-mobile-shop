import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/db/db';
import { validateCreditEntry } from '../src/screens/AddEditSheet';

describe('Credit Entry Validation and Persistence', () => {
  beforeEach(async () => {
    await db.entries.clear();
  });

  it('rejects credit entry if customerName is empty or missing', () => {
    const errorEmpty = validateCreditEntry('in', 'credit', '');
    expect(errorEmpty).toBe('Customer name is required for credit entries');

    const errorWhitespace = validateCreditEntry('in', 'credit', '   ');
    expect(errorWhitespace).toBe('Customer name is required for credit entries');

    const errorUndefined = validateCreditEntry('in', 'credit', undefined);
    expect(errorUndefined).toBe('Customer name is required for credit entries');
  });

  it('accepts credit entry when customerName is provided', () => {
    const valid = validateCreditEntry('in', 'credit', 'Rahul Kumar');
    expect(valid).toBeNull();
  });

  it('allows cash/upi/card entries without customerName', () => {
    expect(validateCreditEntry('in', 'cash', '')).toBeNull();
    expect(validateCreditEntry('in', 'upi', '')).toBeNull();
    expect(validateCreditEntry('in', 'card', '')).toBeNull();
  });

  it('saves entry with credit payment method and customer name', async () => {
    const id = await db.entries.add({
      type: 'in',
      amount: 1200,
      paymentMethod: 'credit',
      customerName: 'Anil Sharma',
      item: 'Display combo',
      date: '2026-10-05',
      createdAt: Date.now(),
    });

    const saved = await db.entries.get(id);
    expect(saved).toBeDefined();
    expect(saved?.paymentMethod).toBe('credit');
    expect(saved?.customerName).toBe('Anil Sharma');
    expect(saved?.amount).toBe(1200);
  });
});
