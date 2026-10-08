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

  it('renders modal buttons with safe area padding', async () => {
    const React = await import('react');
    const { renderToString } = await import('react-dom/server');
    const { EMICalculatorModal } = await import('../src/components/tools/EMICalculatorModal');
    const { CEIRCheckModal } = await import('../src/components/tools/CEIRCheckModal');
    const { WhatsAppBroadcastModal } = await import('../src/components/tools/WhatsAppBroadcastModal');

    const emiHtml = renderToString(
      React.createElement(EMICalculatorModal, {
        isOpen: true,
        onClose: () => {},
        shopName: 'Test Shop',
      })
    );
    expect(emiHtml).toContain('Send on WhatsApp');
    expect(emiHtml).toContain('Copy Quote');
    expect(emiHtml).toContain('pb-[calc(env(safe-area-inset-bottom)+24px)]');

    const ceirHtml = renderToString(
      React.createElement(CEIRCheckModal, {
        isOpen: true,
        onClose: () => {},
        initialImei: '351756051523993',
      })
    );
    expect(ceirHtml).toContain('Open CEIR Portal');
    expect(ceirHtml).toContain('pb-[calc(env(safe-area-inset-bottom)+24px)]');

    const broadcastHtml = renderToString(
      React.createElement(WhatsAppBroadcastModal, {
        isOpen: true,
        onClose: () => {},
        devices: [],
        shopName: 'Test Shop',
      })
    );
    expect(broadcastHtml).toContain('Open in WhatsApp');
    expect(broadcastHtml).toContain('pb-[calc(env(safe-area-inset-bottom)+24px)]');
  });
});
