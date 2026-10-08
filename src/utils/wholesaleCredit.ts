import { ClientTransaction, WholesaleClient } from '../types/wholesale';

export function calculateClientCreditBalance(transactions: ClientTransaction[]): number {
  return transactions.reduce((sum, t) => {
    if (t.type === 'credit_sale') {
      return sum + t.amount;
    } else if (t.type === 'payment_received') {
      return sum - t.amount;
    }
    return sum;
  }, 0);
}

export function normalizeClientPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.slice(-10);
}

export function formatCurrencyINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatWhatsAppCreditStatement(
  client: WholesaleClient,
  shopName: string,
  upiId?: string
): string {
  const balanceStr = formatCurrencyINR(client.currentCreditBalance);
  const lines = [
    `*Credit Statement & Payment Summary*`,
    ``,
    `Client: *${client.shopName}*`,
    `From: *${shopName}*`,
    `Credit Balance: ${balanceStr}`,
  ];

  if (client.contactPerson) {
    lines.push(`Contact: ${client.contactPerson}`);
  }

  lines.push(``);
  if (client.currentCreditBalance > 0) {
    lines.push(`Please clear the pending credit balance at your earliest convenience.`);
    if (upiId) {
      lines.push(`UPI Payment ID: *${upiId}*`);
    }
  } else {
    lines.push(`All credit has been cleared. Thank you for your business!`);
  }

  lines.push(``);
  lines.push(`Thank you for partnering with us.`);
  return lines.join('\n');
}
