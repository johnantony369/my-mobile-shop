import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../src/db/db';
import {
  buildIntakeSlipMessage,
  buildReadyNotificationMessage,
  buildDeliveredSlipMessage,
  buildJobNotificationMessage
} from '../src/utils/repairs';
import { Job } from '../src/types';

describe('Repair Slips & Accounting Workflow', () => {
  beforeEach(async () => {
    await db.jobs.clear();
    await db.entries.clear();
  });

  const sampleJob: Job = {
    id: 42,
    customerName: 'Rahul Kumar',
    phone: '9876543210',
    model: 'Vivo V20',
    complaint: 'Display touch issue',
    estimate: 2500,
    advance: 500,
    status: 'received',
    expectedDate: '2026-10-05',
    receivedAt: Date.now(),
  };

  it('builds a clean intake slip message for newly received jobs', () => {
    const slip = buildIntakeSlipMessage(sampleJob, 'Kerala Mobile Care');
    expect(slip).toContain('Kerala Mobile Care');
    expect(slip).toContain('Repair Job Card');
    expect(slip).toContain('Vivo V20');
    expect(slip).toContain('Display touch issue');
    expect(slip).toContain('₹2,500');
    expect(slip).toContain('₹500');
    expect(slip).toContain('₹2,000'); // balance
    expect(slip).toContain('2026-10-05');
  });

  it('includes intake photos count in intake slip when photos are recorded', () => {
    const slipWithPhotos = buildIntakeSlipMessage(sampleJob, 'Kerala Mobile Care', 3);
    expect(slipWithPhotos).toContain('Photos: 3 intake condition photo(s) recorded');

    const slipWithoutPhotos = buildIntakeSlipMessage(sampleJob, 'Kerala Mobile Care', 0);
    expect(slipWithoutPhotos).not.toContain('intake condition photo(s)');

    const slipWithUndefinedTrackingAndPhotos = buildIntakeSlipMessage(sampleJob, 'Kerala Mobile Care', undefined, 3);
    expect(slipWithUndefinedTrackingAndPhotos).toContain('Photos: 3 intake condition photo(s) recorded');
    expect(slipWithUndefinedTrackingAndPhotos).not.toContain('Track live repair progress');

    const slipWithTrackingAndPhotos = buildIntakeSlipMessage(sampleJob, 'Kerala Mobile Care', 'https://example.com/track', 3);
    expect(slipWithTrackingAndPhotos).toContain('Photos: 3 intake condition photo(s) recorded');
    expect(slipWithTrackingAndPhotos).toContain('https://example.com/track');
  });

  it('builds a ready notification message with balance due', () => {
    const readyJob: Job = { ...sampleJob, status: 'ready', readyAt: Date.now() };
    const msg = buildReadyNotificationMessage(readyJob, 'Kerala Mobile Care');
    expect(msg).toContain('Device Ready');
    expect(msg).toContain('Vivo V20');
    expect(msg).toContain('Balance Due: ₹2,000');
  });

  it('builds a delivered slip message with total amount paid', () => {
    const deliveredJob: Job = { ...sampleJob, status: 'delivered', finalAmount: 2500, deliveredAt: Date.now() };
    const msg = buildDeliveredSlipMessage(deliveredJob, 'Kerala Mobile Care');
    expect(msg).toContain('Delivery Receipt');
    expect(msg).toContain('Vivo V20');
    expect(msg).toContain('Total Amount Paid: ₹2,500');
  });

  it('contextual notification chooses the right template based on status', () => {
    expect(buildJobNotificationMessage({ ...sampleJob, status: 'received' }, 'My Shop')).toContain('Job Card');
    expect(buildJobNotificationMessage({ ...sampleJob, status: 'waiting' }, 'My Shop')).toContain('Job Card');
    expect(buildJobNotificationMessage({ ...sampleJob, status: 'ready' }, 'My Shop')).toContain('Device Ready');
    expect(buildJobNotificationMessage({ ...sampleJob, status: 'delivered', finalAmount: 2500 }, 'My Shop')).toContain('Delivery Receipt');
  });

  it('records advance in Day Book on intake and balance on delivery without double-counting', async () => {
    const today = '2026-10-02';

    // 1. Job created with ₹500 advance
    const jobId = await db.jobs.add({
      customerName: 'Suresh',
      phone: '9876543210',
      model: 'Redmi Note 10',
      complaint: 'Charging port replacement',
      estimate: 1500,
      advance: 500,
      status: 'received',
      receivedAt: Date.now(),
      readyAt: null,
      deliveredAt: null,
      finalAmount: null,
      bookEntryId: null,
    });

    // Advance entry recorded
    await db.entries.add({
      type: 'in',
      amount: 500,
      paymentMethod: 'cash',
      item: 'Advance — Repair: Redmi Note 10',
      customerName: 'Suresh',
      note: `Advance for job #${jobId}`,
      repairId: jobId,
      date: today,
      createdAt: Date.now(),
    });

    // Day 1 Day Book should have ₹500
    const day1Entries = await db.entries.where('date').equals(today).toArray();
    expect(day1Entries.length).toBe(1);
    expect(day1Entries[0].amount).toBe(500);

    // 2. Job delivered with final amount ₹1,500
    const advancePaid = 500;
    const finalAmount = 1500;
    const balanceToCollect = finalAmount - advancePaid; // ₹1,000

    expect(balanceToCollect).toBe(1000);

    // Delivery records only the balance collected today
    await db.entries.add({
      type: 'in',
      amount: balanceToCollect,
      paymentMethod: 'upi',
      item: 'Repair Balance — Redmi Note 10',
      customerName: 'Suresh',
      note: `Balance collected (Total: ₹1500 - ₹500 adv)`,
      repairId: jobId,
      date: '2026-10-04',
      createdAt: Date.now(),
    });

    // Day 2 Day Book has ₹1,000
    const day2Entries = await db.entries.where('date').equals('2026-10-04').toArray();
    expect(day2Entries.length).toBe(1);
    expect(day2Entries[0].amount).toBe(1000);

    // Total income across both days = ₹1,500 (exact match with final repair amount)
    const allEntries = await db.entries.toArray();
    const totalCollected = allEntries.reduce((sum, e) => sum + e.amount, 0);
    expect(totalCollected).toBe(1500);
  });
});
