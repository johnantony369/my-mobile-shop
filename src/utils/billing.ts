import { Bill, BillItem } from '../types';
import { formatINR } from '../i18n';

export function formatInvoiceNo(n: number, isGst = false): string {
  const prefix = isGst ? 'GST' : 'INV';
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

export interface BillCalculationResult {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  total: number;
}

export function computeBillTotals(
  items: BillItem[],
  discount: number,
  isGst = false,
  gstRate = 18,
  isTaxInclusive = true
): BillCalculationResult {
  const subtotal = items.reduce((sum, it) => sum + (it.qty || 0) * (it.price || 0), 0);
  const safeDiscount = Math.min(Math.max(0, discount || 0), subtotal);
  const netAmount = subtotal - safeDiscount;

  if (!isGst || gstRate <= 0) {
    return {
      subtotal,
      discount: safeDiscount,
      taxableAmount: netAmount,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      total: netAmount,
    };
  }

  if (isTaxInclusive) {
    // Price includes GST: Total equals net amount, taxable value is extracted backwards
    const taxableAmount = Math.round((netAmount / (1 + gstRate / 100)) * 100) / 100;
    const taxAmount = Math.round((netAmount - taxableAmount) * 100) / 100;
    const halfTax = Math.round((taxAmount / 2) * 100) / 100;
    return {
      subtotal,
      discount: safeDiscount,
      taxableAmount,
      cgstAmount: halfTax,
      sgstAmount: Math.round((taxAmount - halfTax) * 100) / 100,
      igstAmount: 0,
      total: netAmount,
    };
  } else {
    // Tax added on top of price
    const taxableAmount = netAmount;
    const taxAmount = Math.round((taxableAmount * (gstRate / 100)) * 100) / 100;
    const halfTax = Math.round((taxAmount / 2) * 100) / 100;
    const total = Math.round((taxableAmount + taxAmount) * 100) / 100;
    return {
      subtotal,
      discount: safeDiscount,
      taxableAmount,
      cgstAmount: halfTax,
      sgstAmount: Math.round((taxAmount - halfTax) * 100) / 100,
      igstAmount: 0,
      total,
    };
  }
}

export function summarizeBillItems(items: BillItem[]): string {
  return items.map((it) => (it.qty > 1 ? `${it.name} x${it.qty}` : it.name)).join(', ');
}

export function buildBillText(bill: Bill, shopName: string, shopAddress?: string): string {
  const shop = shopName.trim() || 'My Mobile Shop';
  const address = (shopAddress || '').trim();
  const lines = bill.items.map(
    (it) => `${it.name} x${it.qty} = ${formatINR(it.qty * it.price)}`
  );

  const header: string[] = [];
  if (bill.isGst) {
    header.push(`*TAX INVOICE*`);
    header.push(`*${shop}*`);
    if (bill.shopGstin) {
      header.push(`GSTIN: ${bill.shopGstin}`);
    }
  } else {
    header.push(`*${shop}*`);
  }

  if (address) {
    header.push(address);
  }
  header.push(`Bill ${bill.invoiceNo} | ${bill.date}`);
  if (bill.customerName) {
    header.push(`Customer: ${bill.customerName}`);
  }
  if (bill.isGst && bill.customerGstin) {
    header.push(`Customer GSTIN: ${bill.customerGstin}`);
  }

  const totals: string[] = [];
  if (bill.discount > 0) {
    totals.push(`Subtotal: ${formatINR(bill.subtotal)}`);
    totals.push(`Discount: -${formatINR(bill.discount)}`);
  }

  if (bill.isGst) {
    const rate = bill.gstRate ?? 18;
    const halfRate = rate / 2;
    totals.push(`Taxable Value: ${formatINR(bill.taxableAmount ?? bill.total)}`);
    totals.push(`CGST (${halfRate}%): ${formatINR(bill.cgstAmount ?? 0)}`);
    totals.push(`SGST (${halfRate}%): ${formatINR(bill.sgstAmount ?? 0)}`);
  }

  totals.push(`*Total: ${formatINR(bill.total)}*`);
  totals.push(`Paid via ${bill.paymentMethod.toUpperCase()}`);

  const sections = [
    header.join('\n'),
    lines.join('\n'),
    totals.join('\n'),
    'Thank you! Visit again.',
  ].filter(Boolean);

  return sections.join('\n\n');
}

export function buildWhatsAppUrl(text: string, phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const num = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
