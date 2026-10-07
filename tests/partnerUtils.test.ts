import { describe, it, expect } from 'vitest';
import {
  calculatePartnerCommission,
  normalizePhoneNumber,
  parseLeadsCsv,
  formatCurrencyINR,
} from '../src/utils/partner';

describe('Partner Utility Functions', () => {
  it('calculates exact fixed commissions for plan tiers', () => {
    expect(calculatePartnerCommission('monthly')).toBe(75);
    expect(calculatePartnerCommission('yearly')).toBe(499);
    expect(calculatePartnerCommission(null)).toBe(0);
    expect(calculatePartnerCommission(undefined)).toBe(0);
  });

  it('normalizes Indian mobile numbers into 10 digits', () => {
    expect(normalizePhoneNumber('+91 98765-43210')).toBe('9876543210');
    expect(normalizePhoneNumber('09876543210')).toBe('9876543210');
    expect(normalizePhoneNumber('9876543210')).toBe('9876543210');
    expect(normalizePhoneNumber('12345')).toBeNull(); // Invalid
    expect(normalizePhoneNumber('')).toBeNull();
  });

  it('parses lead CSV content and normalizes valid phone numbers', () => {
    const csv = `Shop Name,Phone Number,City\nOm Telecom,+91 9876543210,Karol Bagh\nShree Mobile,09123456789,Mumbai\nInvalid Shop,123,Delhi`;
    const result = parseLeadsCsv(csv);
    expect(result.leads).toHaveLength(2);
    expect(result.leads[0]).toEqual({
      shopName: 'Om Telecom',
      phone: '9876543210',
      city: 'Karol Bagh',
    });
    expect(result.leads[1]).toEqual({
      shopName: 'Shree Mobile',
      phone: '9123456789',
      city: 'Mumbai',
    });
    expect(result.errors).toHaveLength(1);
  });

  it('formats currency with Indian numbering symbol', () => {
    expect(formatCurrencyINR(75)).toBe('₹75');
    expect(formatCurrencyINR(2499)).toBe('₹2,499');
    expect(formatCurrencyINR(0)).toBe('₹0');
  });
});
