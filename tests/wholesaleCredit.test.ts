import { describe, it, expect } from 'vitest';
import {
  calculateClientCreditBalance,
  formatWhatsAppCreditStatement,
  normalizeClientPhone,
} from '../src/utils/wholesaleCredit';
import { ClientTransaction, WholesaleClient } from '../src/types/wholesale';

describe('Wholesale Credit Calculations & Statements', () => {
  it('correctly calculates net credit balance across multiple entries', () => {
    const transactions: ClientTransaction[] = [
      { cloudId: '1', clientCloudId: 'c1', type: 'credit_sale', amount: 2000, date: '2026-10-01', createdAt: 1 },
      { cloudId: '2', clientCloudId: 'c1', type: 'credit_sale', amount: 1500, date: '2026-10-02', createdAt: 2 },
      { cloudId: '3', clientCloudId: 'c1', type: 'payment_received', amount: 1000, date: '2026-10-03', createdAt: 3 },
    ];
    expect(calculateClientCreditBalance(transactions)).toBe(2500);
  });

  it('generates professional WhatsApp statement using exclusively Credit terminology', () => {
    const client: WholesaleClient = {
      cloudId: 'c1',
      shopName: 'Star Repairs',
      phone: '9876543210',
      currentCreditBalance: 2500,
      createdAt: 1,
    };
    const stmt = formatWhatsAppCreditStatement(client, 'Om Spares', 'omspares@upi');
    expect(stmt).toContain('Credit Balance: ₹2,500');
    expect(stmt).toContain('Star Repairs');
    expect(stmt).toContain('omspares@upi');
    expect(stmt.toLowerCase()).not.toContain('udhar');
    expect(stmt.toLowerCase()).not.toContain('khata');
  });

  it('normalizes 10-digit Indian phone numbers', () => {
    expect(normalizeClientPhone('+91 98765 43210')).toBe('9876543210');
    expect(normalizeClientPhone('09876543210')).toBe('9876543210');
  });
});
