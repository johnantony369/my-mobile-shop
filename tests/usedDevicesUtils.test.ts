import { describe, it, expect } from 'vitest';
import {
  isValidIMEI,
  calculateEMI,
  formatWhatsAppDeclaration,
  formatWhatsAppStockCatalog,
  formatWhatsAppEMIQuote,
} from '../src/utils/usedDevices';
import { UsedDevice } from '../src/types';

describe('Used Devices Utilities', () => {
  it('validates 15-digit IMEI using Luhn checksum', () => {
    // Valid standard test IMEI (passes Luhn)
    expect(isValidIMEI('351756051523993')).toBe(true);
    expect(isValidIMEI('490154203237518')).toBe(true);
    // Invalid length
    expect(isValidIMEI('35175605152399')).toBe(false);
    // Non digits
    expect(isValidIMEI('35175605152399A')).toBe(false);
    // Wrong check digit
    expect(isValidIMEI('351756051523990')).toBe(false);
  });

  it('calculates monthly EMI and loan breakdown correctly', () => {
    // 50,000 price, 10,000 down payment -> 40,000 loan, 12 months, 12% interest
    const res = calculateEMI(50000, 10000, 12, 12);
    expect(res.loanAmount).toBe(40000);
    expect(res.monthlyEMI).toBeGreaterThan(3500);
    expect(res.monthlyEMI).toBeLessThan(3600);
    expect(res.totalPayable).toBe(res.monthlyEMI * 12 + 10000);
  });

  it('formats legally protective seller transfer declaration for WhatsApp', () => {
    const text = formatWhatsAppDeclaration(
      {
        brand: 'Apple',
        model: 'iPhone 13',
        imei: '351756051523999',
        purchasePrice: 30000,
        purchaseDate: '2026-10-07',
        sellerName: 'Rahul Sharma',
        sellerGovtIdType: 'Aadhaar',
        sellerGovtIdNumber: 'XXXX-1234',
      },
      'Apex Mobiles'
    );
    expect(text).toContain('Rahul Sharma');
    expect(text).toContain('351756051523999');
    expect(text).toContain('Apex Mobiles');
    expect(text).toContain('not stolen');
  });

  it('formats clean WhatsApp stock catalog', () => {
    const devices: UsedDevice[] = [
      {
        brand: 'Apple',
        model: 'iPhone 13',
        imei: '351756051523999',
        storage: '128GB',
        color: 'Midnight',
        sellingPrice: 34999,
        purchasePrice: 28000,
        purchaseDate: '2026-10-07',
        sellerName: 'S',
        sellerPhone: '1',
        status: 'in_stock',
        createdAt: Date.now(),
      },
    ];

    const catalog = formatWhatsAppStockCatalog(devices, 'Apex Mobiles', '9876543210');
    expect(catalog).toContain('Apex Mobiles');
    expect(catalog).toContain('iPhone 13');
    expect(catalog).toContain('128GB');
    expect(catalog).toContain('₹34,999');
  });

  it('formats WhatsApp EMI quotation correctly', () => {
    const quote = formatWhatsAppEMIQuote(
      {
        price: 30000,
        downPayment: 5000,
        tenureMonths: 6,
        monthlyEMI: 4350,
      },
      'Apex Mobiles'
    );
    expect(quote).toContain('Apex Mobiles');
    expect(quote).toContain('₹4,350');
    expect(quote).toContain('6 months');
  });
});
