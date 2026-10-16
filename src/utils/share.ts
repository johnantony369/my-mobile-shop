import { formatINR } from '../i18n';
import { Share } from '@capacitor/share';
import { isNativeApp } from './platform';

export interface ShareDataInput {
  shopName: string;
  dateStr: string;
  inTotal: number;
  inCount: number;
  outTotal: number;
  net: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  creditTotal?: number;
}

export function buildShareSummaryText(data: ShareDataInput): string {
  const shop = data.shopName.trim() || 'My Mobile Shop';
  const creditPart = data.creditTotal && data.creditTotal > 0 ? ` | Credit ${formatINR(data.creditTotal)}` : '';
  return (
    `Summary — ${shop}\n` +
    `${data.dateStr}\n` +
    `Sales: ${formatINR(data.inTotal)} (${data.inCount} items)\n` +
    `Expenses: ${formatINR(data.outTotal)}\n` +
    `Net: ${formatINR(data.net)}\n` +
    `Cash ${formatINR(data.cashTotal)} | UPI ${formatINR(data.upiTotal)} | Card ${formatINR(data.cardTotal)}${creditPart}`
  );
}

export async function shareSummary(text: string, title = 'Summary'): Promise<boolean> {
  // 1. Native Capacitor Share (iOS Activity Sheet / Android Share Sheet)
  if (isNativeApp()) {
    try {
      await Share.share({
        title,
        text,
        dialogTitle: title,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes('cancel') ||
        msg.toLowerCase().includes('abort') ||
        msg.toLowerCase().includes('dismiss')
      ) {
        return false;
      }
      // If native sharing fails unexpectedly, fall through to web share / URL
    }
  }

  // 2. Web Share API
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
      });
      return true;
    } catch (err: unknown) {
      // User cancelled share dialog
      if (err instanceof Error && err.name === 'AbortError') {
        return false;
      }
    }
  }

  // 3. Fallback: Open WhatsApp web / mobile
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  return true;
}

export async function shareText(text: string, title = 'Share'): Promise<boolean> {
  return shareSummary(text, title);
}

