import { formatINR } from '../i18n';

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
}

export function buildShareSummaryText(data: ShareDataInput): string {
  const shop = data.shopName.trim() || 'My Mobile Shop';
  return (
    `Summary — ${shop}\n` +
    `${data.dateStr}\n` +
    `Sales: ${formatINR(data.inTotal)} (${data.inCount} items)\n` +
    `Expenses: ${formatINR(data.outTotal)}\n` +
    `Net: ${formatINR(data.net)}\n` +
    `Cash ${formatINR(data.cashTotal)} | UPI ${formatINR(data.upiTotal)} | Card ${formatINR(data.cardTotal)}`
  );
}

export async function shareSummary(text: string, title = 'Summary'): Promise<boolean> {
  if (navigator.share) {
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
      // If native share fails unexpectedly, fall back to WhatsApp URL
    }
  }

  // Fallback: Open WhatsApp web / mobile
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  return true;
}
