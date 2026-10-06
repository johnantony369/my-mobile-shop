import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import * as fs from 'fs';
import * as path from 'path';
import { db, createBill } from '../src/db/db';
import {
  computeBillTotals,
  formatInvoiceNo,
  summarizeBillItems,
  buildBillText,
  buildWhatsAppUrl,
} from '../src/utils/billing';

describe('Easy Billing', () => {
  beforeEach(async () => {
    await db.entries.clear();
    await db.bills.clear();
    await db.stock.clear();
  });

  it('formats invoice numbers and computes totals with a capped discount', () => {
    expect(formatInvoiceNo(1)).toBe('INV-0001');
    expect(formatInvoiceNo(123)).toBe('INV-0123');
    const items = [
      { name: 'Glass', qty: 2, price: 150 },
      { name: 'Cover', qty: 1, price: 100 },
    ];
    expect(computeBillTotals(items, 50)).toEqual({ subtotal: 400, total: 350 });
    expect(computeBillTotals(items, 9999)).toEqual({ subtotal: 400, total: 0 });
    expect(summarizeBillItems(items)).toBe('Glass x2, Cover');
  });

  it('createBill saves bill, Day Book entry, sequential invoice and deducts stock', async () => {
    const stockId = await db.stock.add({
      name: 'Tempered Glass',
      category: 'product',
      sellingPrice: 150,
      quantity: 10,
      createdAt: Date.now(),
    });

    const b1 = await createBill({
      items: [
        { name: 'Tempered Glass', qty: 2, price: 150, stockId: stockId as number },
        { name: 'Service', qty: 1, price: 100 },
      ],
      discount: 50,
      paymentMethod: 'upi',
      date: '2026-10-03',
      customerName: 'Ravi',
    });
    const b2 = await createBill({
      items: [{ name: 'Cover', qty: 1, price: 99 }],
      discount: 0,
      paymentMethod: 'cash',
      date: '2026-10-03',
    });

    expect(b1.invoiceNo).toBe('INV-0001');
    expect(b2.invoiceNo).toBe('INV-0002');
    expect(b1.total).toBe(350);

    const entry = await db.entries.get(b1.entryId as number);
    expect(entry?.type).toBe('in');
    expect(entry?.amount).toBe(350);
    expect(entry?.paymentMethod).toBe('upi');

    const stock = await db.stock.get(stockId as number);
    expect(stock?.quantity).toBe(8);
    expect(await db.bills.count()).toBe(2);
  });

  it('builds a WhatsApp-ready bill text and url', async () => {
    const bill = await createBill({
      items: [{ name: 'Glass', qty: 2, price: 150 }],
      discount: 0,
      paymentMethod: 'cash',
      date: '2026-10-03',
    });
    const text = buildBillText(bill, 'City Mobiles');
    expect(text).toContain('City Mobiles');
    expect(text).toContain('INV-0001');
    expect(text).toContain('Glass x2');
    expect(buildWhatsAppUrl(text, '9876543210')).toContain('https://wa.me/919876543210?text=');
  });

  it('includes shop address in bill text when provided', async () => {
    const bill = await createBill({
      items: [{ name: 'Battery', qty: 1, price: 800 }],
      discount: 0,
      paymentMethod: 'cash',
      date: '2026-10-03',
    });
    const textWithAddress = buildBillText(bill, 'City Mobiles', 'MG Road, Kochi, Kerala 682016');
    expect(textWithAddress).toContain('*City Mobiles*\nMG Road, Kochi, Kerala 682016');

    const textWithoutAddress = buildBillText(bill, 'City Mobiles', '');
    expect(textWithoutAddress).not.toContain('MG Road');
    expect(textWithoutAddress.startsWith('*City Mobiles*\nBill INV-0001')).toBe(true);
  });

  it('updates and persists shopAddress in AppSettings', async () => {
    const { getAppSettings, updateAppSettings } = await import('../src/db/db');
    await updateAppSettings({ shopName: 'Modern Mobiles', shopAddress: '123 Market Road' });
    const settings = await getAppSettings();
    expect(settings?.shopName).toBe('Modern Mobiles');
    expect(settings?.shopAddress).toBe('123 Market Road');
  });

  it('BookScreen integrates BillSheet component', () => {
    const content = fs.readFileSync(path.resolve(__dirname, '../src/screens/BookScreen.tsx'), 'utf-8');
    expect(content).toContain('<BillSheet');
  });

  it('BillSheet and AddEditSheet integrate PDF Bill download', () => {
    const billSheetContent = fs.readFileSync(path.resolve(__dirname, '../src/screens/BillSheet.tsx'), 'utf-8');
    expect(billSheetContent).toContain('downloadBillPDF');
    expect(billSheetContent).toContain('PDF Bill');

    const addEditContent = fs.readFileSync(path.resolve(__dirname, '../src/screens/AddEditSheet.tsx'), 'utf-8');
    expect(addEditContent).toContain('downloadBillPDF');
    expect(addEditContent).toContain('PDF Bill');
  });
});
