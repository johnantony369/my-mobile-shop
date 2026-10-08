import { ClientTransaction, WholesaleClient } from '../types/wholesale';
import { Entry } from '../types';
import { db } from '../db/db';

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

/**
 * Bi-directionally synchronizes a Day Book entry with the wholesale client's credit ledger.
 */
export async function syncDayBookCreditEntry(
  clientCloudId: string | undefined,
  newEntry: Entry,
  _oldEntry?: Entry
): Promise<void> {
  const isNowCredit = newEntry.paymentMethod === 'credit';

  // Find any existing transaction linked to this day book entry
  let existingTx: ClientTransaction | undefined;
  if (newEntry.id) {
    existingTx = await db.clientTransactions.where('dayBookEntryId').equals(newEntry.id).first();
  }

  // Case 1: Entry was credit, but is now NOT credit (e.g. marked paid as cash/upi)
  if (!isNowCredit) {
    if (existingTx) {
      const client = await db.clients.where('cloudId').equals(existingTx.clientCloudId).first();
      if (client) {
        const updatedBalance = Math.max(0, client.currentCreditBalance - existingTx.amount);
        await db.clients.where('cloudId').equals(client.cloudId).modify((c: WholesaleClient) => {
          c.currentCreditBalance = updatedBalance;
          c.updatedAt = new Date().toISOString();
        });
      }
      if (existingTx.id) {
        await db.clientTransactions.delete(existingTx.id);
      } else {
        await db.clientTransactions.where('cloudId').equals(existingTx.cloudId).delete();
      }
    }
    return;
  }

  // Case 2: Entry is credit
  // Resolve client
  let targetClient: WholesaleClient | undefined;
  if (clientCloudId) {
    targetClient = await db.clients.where('cloudId').equals(clientCloudId).first();
  }
  if (!targetClient && newEntry.customerName) {
    targetClient = await db.clients
      .filter((c) => c.shopName.toLowerCase() === newEntry.customerName!.trim().toLowerCase())
      .first();
  }

  if (!targetClient) {
    // If no client found, nothing to link to
    return;
  }

  if (existingTx) {
    // Transaction already exists for this entry
    if (existingTx.clientCloudId !== targetClient.cloudId) {
      // Client changed: remove from old client and add to new client
      const oldClient = await db.clients.where('cloudId').equals(existingTx.clientCloudId).first();
      if (oldClient) {
        await db.clients.where('cloudId').equals(oldClient.cloudId).modify((c: WholesaleClient) => {
          c.currentCreditBalance = Math.max(0, oldClient.currentCreditBalance - existingTx.amount);
          c.updatedAt = new Date().toISOString();
        });
      }
      targetClient.currentCreditBalance += newEntry.amount;
      await db.clients.where('cloudId').equals(targetClient.cloudId).modify((c: WholesaleClient) => {
        c.currentCreditBalance = targetClient!.currentCreditBalance;
        c.updatedAt = new Date().toISOString();
      });
      await db.clientTransactions.where('cloudId').equals(existingTx.cloudId).modify((t: ClientTransaction) => {
        t.clientCloudId = targetClient!.cloudId;
        t.amount = newEntry.amount;
        t.note = newEntry.item || 'Credit Sale';
        t.date = newEntry.date;
        t.updatedAt = new Date().toISOString();
      });
    } else {
      // Same client, check amount change
      const delta = newEntry.amount - existingTx.amount;
      if (delta !== 0) {
        const updatedBalance = Math.max(0, targetClient.currentCreditBalance + delta);
        await db.clients.where('cloudId').equals(targetClient.cloudId).modify((c: WholesaleClient) => {
          c.currentCreditBalance = updatedBalance;
          c.updatedAt = new Date().toISOString();
        });
      }
      await db.clientTransactions.where('cloudId').equals(existingTx.cloudId).modify((t: ClientTransaction) => {
        t.amount = newEntry.amount;
        t.note = newEntry.item || 'Credit Sale';
        t.date = newEntry.date;
        t.updatedAt = new Date().toISOString();
      });
    }
  } else {
    // New credit transaction
    const newTx: ClientTransaction = {
      cloudId: `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clientCloudId: targetClient.cloudId,
      dayBookEntryId: newEntry.id,
      type: 'credit_sale',
      amount: newEntry.amount,
      note: newEntry.item || 'Credit Sale',
      date: newEntry.date,
      createdAt: Date.now(),
    };
    await db.clientTransactions.add(newTx);
    const updatedBalance = targetClient.currentCreditBalance + newEntry.amount;
    await db.clients.where('cloudId').equals(targetClient.cloudId).modify((c: WholesaleClient) => {
      c.currentCreditBalance = updatedBalance;
      c.updatedAt = new Date().toISOString();
    });
  }
}

/**
 * Removes any linked credit transaction when a Day Book entry is deleted.
 */
export async function removeDayBookCreditSync(entry: Entry): Promise<void> {
  if (!entry.id) return;
  const existingTx = await db.clientTransactions.where('dayBookEntryId').equals(entry.id).first();
  if (existingTx) {
    const client = await db.clients.where('cloudId').equals(existingTx.clientCloudId).first();
    if (client) {
      const updatedBalance = Math.max(0, client.currentCreditBalance - existingTx.amount);
      await db.clients.where('cloudId').equals(client.cloudId).modify((c: WholesaleClient) => {
        c.currentCreditBalance = updatedBalance;
        c.updatedAt = new Date().toISOString();
      });
    }
    if (existingTx.id) {
      await db.clientTransactions.delete(existingTx.id);
    } else {
      await db.clientTransactions.where('cloudId').equals(existingTx.cloudId).delete();
    }
  }
}
