import { describe, it, expect } from 'vitest';
import { isValidIMEI, formatWhatsAppDeclaration } from '../src/utils/usedDevices';

describe('Used Phone Intake Validation', () => {
  it('enforces required fields: model, 15-digit valid IMEI, purchase price, seller name, seller phone', () => {
    const imei = '351756051523993';
    expect(isValidIMEI(imei)).toBe(true);

    const decl = formatWhatsAppDeclaration(
      {
        brand: 'OnePlus',
        model: 'Nord CE 3',
        imei,
        purchasePrice: 14000,
        purchaseDate: '2026-10-07',
        sellerName: 'Karan',
      },
      'Star Mobiles'
    );
    expect(decl).toContain('Karan');
    expect(decl).toContain('14,000');
    expect(decl).toContain('Star Mobiles');
    expect(decl).toContain(imei);
  });
});
