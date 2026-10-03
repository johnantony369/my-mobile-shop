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

export function buildBillText(bill: Bill, shopName: string): string {
  const shop = shopName.trim() || 'My Mobile Shop';
  const lines = bill.items.map(
    (it) => `${it.name} x${it.qty} = ${formatINR(it.qty * it.price)}`
  );
  const parts = [
    `*${shop}*`,
    `Bill ${bill.invoiceNo} | ${bill.date}`,
    bill.customerName ? `Customer: ${bill.customerName}` : '',
    '',
    ...lines,
    '',
    bill.discount > 0 ? `Subtotal: ${formatINR(bill.subtotal)}` : '',
    bill.discount > 0 ? `Discount: -${formatINR(bill.discount)}` : '',
    `*Total: ${formatINR(bill.total)}*`,
    `Paid via ${bill.paymentMethod.toUpperCase()}`,
    '',
    'Thank you! Visit again.',
  ];
  return parts.filter((p, i) => p !== '' || (parts[i - 1] ?? '') !== '').join('\n');
}

export function buildWhatsAppUrl(text: string, phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const num = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
