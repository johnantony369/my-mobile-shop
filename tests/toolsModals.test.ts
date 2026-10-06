import { describe, it, expect } from 'vitest';
import { calculateEMI, isValidIMEI, formatWhatsAppStockCatalog } from '../src/utils/usedDevices';
import { UsedDevice } from '../src/types';

describe('Tools Interactive Modals Logic', () => {
  it('calculates EMI schedule across multiple tenures', () => {
    [3, 6, 9, 12, 18].forEach(tenure => {
      const res = calculateEMI(30000, 5000, tenure, 14);
      expect(res.monthlyEMI).toBeGreaterThan(0);
      expect(res.totalPayable).toBeGreaterThanOrEqual(30000);
      expect(res.loanAmount).toBe(25000);
    });
  });

  it('validates CEIR IMEI input accurately', () => {
    expect(isValidIMEI('351756051523993')).toBe(true);
    expect(isValidIMEI('490154203237518')).toBe(true);
    expect(isValidIMEI('1234')).toBe(false);
    expect(isValidIMEI('abcd12345678901')).toBe(false);
  });

  it('generates stock catalog for broadcast modal', () => {
    const devices: UsedDevice[] = [
      {
        brand: 'Apple',
        model: 'iPhone 14',
        imei: '351756051523993',
        storage: '256GB',
        color: 'Blue',
        purchasePrice: 40000,
        sellingPrice: 48000,
        purchaseDate: '2026-10-07',
        sellerName: 'John',
        sellerPhone: '9876543210',
        status: 'in_stock',
        createdAt: Date.now(),
      },
    ];

    const catalog = formatWhatsAppStockCatalog(devices, 'Apex Mobiles', '9876543210', 'Main Street');
    expect(catalog).toContain('iPhone 14');
    expect(catalog).toContain('256GB');
    expect(catalog).toContain('₹48,000');
    expect(catalog).toContain('Main Street');
  });
});
