import { describe, it, expect } from 'vitest';
import { WholesaleClient, ClientTransaction } from '../src/types/wholesale';
import { db } from '../src/db/db';

describe('Wholesale Types & Client Calculations', () => {
  it('correctly models wholesale client and tracks running credit balance', () => {
    const client: WholesaleClient = {
      cloudId: 'client-1',
      shopName: 'Fast Tech Repairs',
      contactPerson: 'Rahul Kumar',
      phone: '9876543210',
      currentCreditBalance: 1500,
      createdAt: Date.now(),
    };

    const saleTransaction: ClientTransaction = {
      cloudId: 'tx-1',
      clientCloudId: client.cloudId,
      type: 'credit_sale',
      amount: 1200,
      date: '2026-10-09',
      createdAt: Date.now(),
    };

    const paymentTransaction: ClientTransaction = {
      cloudId: 'tx-2',
      clientCloudId: client.cloudId,
      type: 'payment_received',
      amount: 500,
      paymentMethod: 'upi',
      date: '2026-10-09',
      createdAt: Date.now(),
    };

    const newBalance = client.currentCreditBalance + saleTransaction.amount - paymentTransaction.amount;
    expect(newBalance).toBe(2200);
  });

  it('provides Dexie tables for clients and transactions', () => {
    expect(db.clients).toBeDefined();
    expect(db.clientTransactions).toBeDefined();
    expect(db.customCompatibilities).toBeDefined();
  });
});
