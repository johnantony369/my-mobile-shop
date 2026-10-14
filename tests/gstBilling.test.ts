import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { computeBillTotals, buildBillText, formatInvoiceNo } from '../src/utils/billing';
import { generateBillPDF } from '../src/utils/pdf';
import { Bill, BillItem } from '../src/types';
import { db, createBill, createBillForEntry } from '../src/db/db';
import { AddEditSheet } from '../src/screens/AddEditSheet';

describe('GST and Non-GST Billing System', () => {
  beforeEach(async () => {
    await db.bills.clear();
    await db.entries.clear();
    await db.settings.clear();
  });

  describe('Invoice Numbering', () => {
    it('formats Non-GST invoice as INV-0001', () => {
      expect(formatInvoiceNo(1, false)).toBe('INV-0001');
      expect(formatInvoiceNo(42, false)).toBe('INV-0042');
    });

    it('formats GST invoice as GST-0001', () => {
      expect(formatInvoiceNo(1, true)).toBe('GST-0001');
      expect(formatInvoiceNo(99, true)).toBe('GST-0099');
    });
  });

  describe('Billing Calculations', () => {
    const items: BillItem[] = [
      { name: 'Display Replacement', qty: 1, price: 1000 },
      { name: 'Screen Guard', qty: 2, price: 100 },
    ];
    // Subtotal = 1000 + 200 = 1200

    it('computes correct Non-GST totals without discount', () => {
      const res = computeBillTotals(items, 0, false);
      expect(res.subtotal).toBe(1200);
      expect(res.discount).toBe(0);
      expect(res.total).toBe(1200);
      expect(res.taxableAmount).toBe(1200);
      expect(res.cgstAmount).toBe(0);
      expect(res.sgstAmount).toBe(0);
    });

    it('computes correct Non-GST totals with discount', () => {
      const res = computeBillTotals(items, 200, false);
      expect(res.subtotal).toBe(1200);
      expect(res.discount).toBe(200);
      expect(res.total).toBe(1000);
      expect(res.taxableAmount).toBe(1000);
    });

    it('computes GST Inclusive (18% MRP) correctly', () => {
      // Items total = 1180 (MRP including 18% GST)
      const testItems: BillItem[] = [{ name: 'Wireless Earbuds', qty: 1, price: 1180 }];
      const res = computeBillTotals(testItems, 0, true, 18, true);

      expect(res.total).toBe(1180);
      expect(res.taxableAmount).toBe(1000);
      expect(res.cgstAmount).toBe(90);
      expect(res.sgstAmount).toBe(90);
      expect(res.taxableAmount + res.cgstAmount + res.sgstAmount).toBe(1180);
    });

    it('computes GST Exclusive (18% added on top) correctly', () => {
      const testItems: BillItem[] = [{ name: 'Back Cover', qty: 1, price: 1000 }];
      const res = computeBillTotals(testItems, 0, true, 18, false);

      expect(res.taxableAmount).toBe(1000);
      expect(res.cgstAmount).toBe(90);
      expect(res.sgstAmount).toBe(90);
      expect(res.total).toBe(1180);
    });

    it('computes 5% GST rate correctly', () => {
      const testItems: BillItem[] = [{ name: 'Basic Cable', qty: 1, price: 1000 }];
      const res = computeBillTotals(testItems, 0, true, 5, false);

      expect(res.taxableAmount).toBe(1000);
      expect(res.cgstAmount).toBe(25);
      expect(res.sgstAmount).toBe(25);
      expect(res.total).toBe(1050);
    });

    it('computes 12% and 28% GST rates correctly', () => {
      const item12: BillItem[] = [{ name: 'Part A', qty: 1, price: 1120 }];
      const res12 = computeBillTotals(item12, 0, true, 12, true);
      expect(res12.taxableAmount).toBe(1000);
      expect(res12.cgstAmount).toBe(60);
      expect(res12.sgstAmount).toBe(60);
      expect(res12.total).toBe(1120);

      const item28: BillItem[] = [{ name: 'Part B', qty: 1, price: 1280 }];
      const res28 = computeBillTotals(item28, 0, true, 28, true);
      expect(res28.taxableAmount).toBe(1000);
      expect(res28.cgstAmount).toBe(140);
      expect(res28.sgstAmount).toBe(140);
      expect(res28.total).toBe(1280);
    });
  });

  describe('Bill Text Formatting (WhatsApp / Sharing)', () => {
    it('formats Non-GST bill without TAX INVOICE or GST lines', () => {
      const bill: Bill = {
        invoiceNo: 'INV-0001',
        date: '2026-10-10',
        customerName: 'Rahul Verma',
        items: [{ name: 'Cover', qty: 1, price: 500 }],
        subtotal: 500,
        discount: 0,
        total: 500,
        paymentMethod: 'cash',
        createdAt: Date.now(),
        isGst: false,
      };

      const text = buildBillText(bill, 'Apex Mobile Care', 'Main Road, Pune');
      expect(text).toContain('Apex Mobile Care');
      expect(text).toContain('Bill INV-0001');
      expect(text).toContain('Customer: Rahul Verma');
      expect(text).toContain('Total: ₹500');
      expect(text).not.toContain('TAX INVOICE');
      expect(text).not.toContain('GSTIN:');
      expect(text).not.toContain('CGST');
    });

    it('formats GST Tax Invoice with GSTIN, CGST, SGST, and Taxable Value', () => {
      const bill: Bill = {
        invoiceNo: 'GST-0001',
        date: '2026-10-10',
        customerName: 'Suresh Tech',
        customerPhone: '9876543210',
        items: [{ name: 'Display Combo', qty: 1, price: 2000 }],
        subtotal: 2000,
        discount: 0,
        total: 2000,
        taxableAmount: 1694.92,
        cgstAmount: 152.54,
        sgstAmount: 152.54,
        paymentMethod: 'upi',
        createdAt: Date.now(),
        isGst: true,
        gstRate: 18,
        shopGstin: '27AAPFU0939L1ZV',
        customerGstin: '27ABCDE1234F1Z5',
      };

      const text = buildBillText(bill, 'Apex Mobile Care', 'Main Road, Pune');
      expect(text).toContain('*TAX INVOICE*');
      expect(text).toContain('GSTIN: 27AAPFU0939L1ZV');
      expect(text).toContain('Customer GSTIN: 27ABCDE1234F1Z5');
      expect(text).toContain('Bill GST-0001');
      expect(text).toContain('Taxable Value: ₹1,694.92');
      expect(text).toContain('CGST (9%): ₹152.54');
      expect(text).toContain('SGST (9%): ₹152.54');
      expect(text).toContain('Total: ₹2,000');
    });
  });

  describe('Database Operations for GST Bills', () => {
    it('creates GST bill and persists shop GSTIN to settings', async () => {
      await db.settings.add({
        shopName: 'Test Mobile Store',
        language: 'en',
        firstLaunchDate: '2026-10-10',
        activated: true,
        showRepairs: true,
        lastBackupAt: null,
      });

      const bill = await createBill({
        items: [{ name: 'Phone Battery', qty: 1, price: 1180 }],
        discount: 0,
        paymentMethod: 'upi',
        date: '2026-10-10',
        isGst: true,
        gstRate: 18,
        shopGstin: '27AAPFU0939L1ZV',
        customerName: 'Anil Kumar',
        isTaxInclusive: true,
      });

      expect(bill.invoiceNo).toContain('GST-');
      expect(bill.isGst).toBe(true);
      expect(bill.shopGstin).toBe('27AAPFU0939L1ZV');
      expect(bill.taxableAmount).toBe(1000);
      expect(bill.cgstAmount).toBe(90);
      expect(bill.sgstAmount).toBe(90);
      expect(bill.total).toBe(1180);

      // Verify setting was updated
      const updatedSetting = await db.settings.toCollection().first();
      expect(updatedSetting?.shopGstin).toBe('27AAPFU0939L1ZV');

      // Verify linked Day Book entry was created
      const entry = await db.entries.get(bill.entryId as number);
      expect(entry).toBeDefined();
      expect(entry?.amount).toBe(1180);
      expect(entry?.note).toBe(bill.invoiceNo);
    });

    it('creates GST bill linked to an existing Day Book entry', async () => {
      const entryId = await db.entries.add({
        type: 'in',
        amount: 2360,
        item: 'Screen Repair Combo',
        paymentMethod: 'card',
        date: '2026-10-10',
        createdAt: Date.now(),
      });

      const entry = (await db.entries.get(entryId))!;

      const bill = await createBillForEntry(entry, {
        isGst: true,
        gstRate: 18,
        shopGstin: '27AAPFU0939L1ZV',
        isTaxInclusive: true,
        items: [{ name: 'Screen Repair Combo', qty: 1, price: 2360 }],
      });

      expect(bill.invoiceNo).toContain('GST-');
      expect(bill.entryId).toBe(entryId);
      expect(bill.taxableAmount).toBe(2000);
      expect(bill.cgstAmount).toBe(180);
      expect(bill.sgstAmount).toBe(180);
      expect(bill.total).toBe(2360);

      // Verify entry note was updated with invoiceNo
      const updatedEntry = await db.entries.get(entryId);
      expect(updatedEntry?.note).toContain(bill.invoiceNo);
    });
  });

  describe('New Entry Generate Bill Button Rendering', () => {
    it('renders "Generate Bill" button in AddEditSheet even when entryToEdit is null (New Entry)', () => {
      const html = renderToString(
        React.createElement(AddEditSheet, {
          isOpen: true,
          onClose: () => {},
          onSaved: () => {},
          entryToEdit: null, // New Entry!
          defaultDate: '2026-10-10',
          language: 'en',
        })
      );

      // Should render the Generate Bill action button in New Entry
      expect(html).toContain('Generate Bill');
      // Should also render the standard Save button
      expect(html).toContain('Save');
    });
  });

  describe('PDF Generation for GST Bill', () => {
    it('generates PDF doc without errors for GST bill with tax details', () => {
      const bill: Bill = {
        invoiceNo: 'GST-0001',
        date: '2026-10-10',
        customerName: 'Tech Services',
        customerGstin: '27ABCDE1234F1Z5',
        items: [{ name: 'Motherboard Repair', qty: 1, price: 1500 }],
        subtotal: 1500,
        discount: 0,
        total: 1500,
        taxableAmount: 1271.19,
        cgstAmount: 114.41,
        sgstAmount: 114.41,
        paymentMethod: 'cash',
        createdAt: Date.now(),
        isGst: true,
        gstRate: 18,
        shopGstin: '27AAPFU0939L1ZV',
      };

      const doc = generateBillPDF({
        bill,
        shopName: 'Apex Mobile Care',
        shopAddress: 'Camp, Pune',
        shopPhone: '9876543210',
      });

      expect(doc).toBeDefined();
      expect(typeof doc.output).toBe('function');
    });

    it('generates PDF doc for Non-GST bill without errors', () => {
      const bill: Bill = {
        invoiceNo: 'INV-0005',
        date: '2026-10-10',
        items: [{ name: 'Tempered Glass', qty: 1, price: 150 }],
        subtotal: 150,
        discount: 0,
        total: 150,
        paymentMethod: 'cash',
        createdAt: Date.now(),
        isGst: false,
      };

      const doc = generateBillPDF({
        bill,
        shopName: 'Apex Mobile Care',
      });

      expect(doc).toBeDefined();
      expect(typeof doc.output).toBe('function');
    });
  });

  describe('SettingsScreen GSTIN Option', () => {
    it('persists shopGstin to app settings when saved in SettingsScreen', async () => {
      const { updateAppSettings, getAppSettings } = await import('../src/db/db');
      await updateAppSettings({ shopGstin: '32AAAAA0000A1Z5' });
      const settings = await getAppSettings();
      expect(settings?.shopGstin).toBe('32AAAAA0000A1Z5');
    });

    it('SettingsScreen file includes Shop GSTIN input field', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(path.resolve(__dirname, '../src/screens/SettingsScreen.tsx'), 'utf-8');
      expect(content).toContain('Shop GSTIN');
      expect(content).toContain('shopGstin');
    });
  });
});
