import { describe, it, expect, vi } from 'vitest';
import { generateBillPDF } from '../src/utils/pdf';
import { Bill } from '../src/types';

describe('PDF Bill Generator', () => {
  const sampleBill: Bill = {
    id: 1,
    invoiceNo: 'INV-0042',
    date: '2026-10-06',
    items: [
      { name: 'Display Replacement (OLED)', qty: 1, price: 2500 },
      { name: 'Screen Protector', qty: 2, price: 150 },
    ],
    subtotal: 2800,
    discount: 300,
    total: 2500,
    paymentMethod: 'upi',
    customerName: 'Anand Kumar',
    customerPhone: '9876543210',
    createdAt: Date.now(),
  };

  it('generates an A5 jsPDF document successfully', () => {
    const doc = generateBillPDF({
      bill: sampleBill,
      shopName: 'Kerala Mobile Hub',
      shopAddress: 'Opposite Town Hall, Ernakulam, Kerala 682011',
    });

    expect(doc).toBeDefined();
    // Verify A5 page dimensions in mm (148 x 210)
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    expect(Math.round(pageWidth)).toBe(148);
    expect(Math.round(pageHeight)).toBe(210);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('handles bill without shop address or customer info cleanly', () => {
    const simpleBill: Bill = {
      id: 2,
      invoiceNo: 'INV-0043',
      date: '2026-10-06',
      items: [{ name: 'Cable', qty: 1, price: 199 }],
      subtotal: 199,
      discount: 0,
      total: 199,
      paymentMethod: 'cash',
      createdAt: Date.now(),
    };

    const doc = generateBillPDF({
      bill: simpleBill,
      shopName: 'Quick Shop',
    });

    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('handles multi-line address and generates binary output cleanly', async () => {
    const { generateBillPDF, getBillPDFBlob, downloadBillPDF } = await import('../src/utils/pdf');
    const bill: Bill = {
      invoiceNo: 'INV-0099',
      date: '2026-10-06',
      items: [{ name: 'Tempered Glass', qty: 3, price: 100 }],
      subtotal: 300,
      discount: 0,
      total: 300,
      paymentMethod: 'cash',
      createdAt: Date.now(),
    };

    const doc = generateBillPDF({
      bill,
      shopName: 'Mega Mobile City',
      shopAddress: 'Building 4, Ground Floor, Near Railway Station,\nCalicut Road, Malappuram, Kerala - 676505',
    });

    const buffer = doc.output('arraybuffer');
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(1000);

    const blob = getBillPDFBlob({
      bill,
      shopName: 'Mega Mobile City',
      shopAddress: 'Building 4, Ground Floor',
    });
    expect(blob).toBeDefined();

    // Verify downloadBillPDF runs without throwing
    const tempFile = `${bill.invoiceNo || 'Bill'}.pdf`;
    expect(() => {
      downloadBillPDF({
        bill,
        shopName: 'Mega Mobile City',
      });
    }).not.toThrow();
    const fs = await import('fs');
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  });
});
