import { Bill, BillItem } from '../types';
import { formatINR } from '../i18n';

export function formatInvoiceNo(n: number): string {
  return `INV-${String(n).padStart(4, '0')}`;
}

export function computeBillTotals(items: BillItem[], discount: number): { subtotal: number; total: number } {
  const subtotal = items.reduce((sum, it) => sum + (it.qty || 0) * (it.price || 0), 0);
  const safeDiscount = Math.min(Math.max(0, discount || 0), subtotal);
  return { subtotal, total: subtotal - safeDiscount };
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

  const header: string[] = [`*${shop}*`];
  if (address) {
    header.push(address);
  }
  header.push(`Bill ${bill.invoiceNo} | ${bill.date}`);
  if (bill.customerName) {
    header.push(`Customer: ${bill.customerName}`);
  }

  const totals: string[] = [];
  if (bill.discount > 0) {
    totals.push(`Subtotal: ${formatINR(bill.subtotal)}`);
    totals.push(`Discount: -${formatINR(bill.discount)}`);
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
