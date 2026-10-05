import { describe, it, expect } from 'vitest';
import { computeSummary } from '../src/db/db';
import { Entry } from '../src/types';
import { buildShareSummaryText } from '../src/utils/share';

describe('Credit Entries Calculations', () => {
  it('computes summary with credit entries correctly', () => {
    const entries: Entry[] = [
      {
        id: 1,
        type: 'in',
        amount: 500,
        paymentMethod: 'cash',
        date: '2026-10-05',
        createdAt: Date.now(),
      },
      {
        id: 2,
        type: 'in',
        amount: 1000,
        paymentMethod: 'upi',
        date: '2026-10-05',
        createdAt: Date.now(),
      },
      {
        id: 3,
        type: 'in',
        amount: 1500,
        paymentMethod: 'credit',
        customerName: 'Rahul Kumar',
        date: '2026-10-05',
        createdAt: Date.now(),
      },
      {
        id: 4,
        type: 'out',
        amount: 200,
        date: '2026-10-05',
        createdAt: Date.now(),
      },
    ];

    const summary = computeSummary(entries);

    expect(summary.inTotal).toBe(3000);
    expect(summary.outTotal).toBe(200);
    expect(summary.net).toBe(2800);
    expect(summary.cashTotal).toBe(500);
    expect(summary.upiTotal).toBe(1000);
    expect(summary.cardTotal).toBe(0);
    expect(summary.creditTotal).toBe(1500);
  });

  it('includes credit in share text when creditTotal > 0', () => {
    const text = buildShareSummaryText({
      shopName: 'Test Shop',
      dateStr: '5 Oct 2026',
      inTotal: 3000,
      inCount: 3,
      outTotal: 200,
      net: 2800,
      cashTotal: 500,
      upiTotal: 1000,
      cardTotal: 0,
      creditTotal: 1500,
    });

    expect(text).toContain('Credit ₹1,500');
  });

  it('omits credit from share text when creditTotal is 0', () => {
    const text = buildShareSummaryText({
      shopName: 'Test Shop',
      dateStr: '5 Oct 2026',
      inTotal: 1500,
      inCount: 2,
      outTotal: 200,
      net: 1300,
      cashTotal: 500,
      upiTotal: 1000,
      cardTotal: 0,
      creditTotal: 0,
    });

    expect(text).not.toContain('Credit');
  });
});
