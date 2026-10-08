import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { searchMasterSparesInMemory } from '../src/data/masterSparesSeed';
import {
  calculateClientCreditBalance,
  formatWhatsAppCreditStatement,
  syncDayBookCreditEntry,
  formatCurrencyINR,
} from '../src/utils/wholesaleCredit';
import { ClientTransaction, WholesaleClient } from '../src/types/wholesale';
import { db } from '../src/db/db';
import { Entry } from '../src/types';

describe('Wholesale End-to-End Lifecycle Verification', () => {
  it('verifies master spares search, custom compatibility, client credit ledger and statement formatting', async () => {
    // 1. Master spares catalog search
    const spares = searchMasterSparesInMemory('y20');
    expect(spares.length).toBeGreaterThan(0);
    expect(spares[0].brand).toBe('Vivo');
    expect(spares[0].model).toContain('Y20');

    // 2. Client credit tracking
    const client: WholesaleClient = {
      cloudId: 'client-99',
      shopName: 'Metro Mobile Care',
      phone: '9898989898',
      currentCreditBalance: 0,
      createdAt: Date.now(),
    };
    await db.clients.add(client);

    const tx1: ClientTransaction = {
      cloudId: 'tx-1',
      clientCloudId: client.cloudId,
      type: 'credit_sale',
      amount: 1800,
      note: 'Vivo Y20 Display Combo',
      date: '2026-10-09',
      createdAt: Date.now(),
    };

    const tx2: ClientTransaction = {
      cloudId: 'tx-2',
      clientCloudId: client.cloudId,
      type: 'payment_received',
      amount: 800,
      paymentMethod: 'upi',
      date: '2026-10-09',
      createdAt: Date.now(),
    };

    const balance = calculateClientCreditBalance([tx1, tx2]);
    expect(balance).toBe(1000);

    // 3. Statement formatting without colloquial terms
    client.currentCreditBalance = balance;
    const stmt = formatWhatsAppCreditStatement(client, 'City Spares Hub', 'cityspares@okaxis');
    expect(stmt).toContain('Credit Balance: ₹1,000');
    expect(stmt).toContain('Metro Mobile Care');
    expect(stmt).toContain('cityspares@okaxis');
    expect(stmt.toLowerCase()).not.toContain('udhar');
    expect(stmt.toLowerCase()).not.toContain('khata');

    // 4. Day Book entry sync with client
    const dayBookEntry: Entry = {
      id: 999,
      type: 'in',
      amount: 1200,
      item: 'Vivo Y20 Battery OEM',
      customerName: 'Metro Mobile Care',
      paymentMethod: 'credit',
      date: '2026-10-09',
      createdAt: Date.now(),
    };

    await syncDayBookCreditEntry(client.cloudId, dayBookEntry);
    const updatedClient = await db.clients.where('cloudId').equals(client.cloudId).first();
    expect(updatedClient?.currentCreditBalance).toBe(1200);

    const syncedTx = await db.clientTransactions.where('dayBookEntryId').equals(999).first();
    expect(syncedTx).toBeDefined();
    expect(syncedTx?.amount).toBe(1200);
    expect(syncedTx?.type).toBe('credit_sale');
  });
});
