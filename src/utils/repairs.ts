import { Job } from '../types';
import { cleanIndianPhone } from '../db/db';
import { formatINR } from '../i18n';

export function buildReadyNotificationMessage(job: Job, shopName: string): string {
  const shop = shopName.trim() || 'My Mobile Shop';
  const balance = (job.estimate || 0) - (job.advance || 0);
  
  if (job.estimate && balance > 0) {
    return `Your ${job.model} is ready.\nBalance due: ${formatINR(balance)}.\nPlease collect it from — ${shop}`;
  }
  return `Your ${job.model} is ready. Please collect it from — ${shop}`;
}

export function openWhatsAppNotification(job: Job, shopName: string): void {
  const phone = cleanIndianPhone(job.phone);
  const message = buildReadyNotificationMessage(job, shopName);
  const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function copyNotificationMessage(job: Job, shopName: string): Promise<void> {
  const message = buildReadyNotificationMessage(job, shopName);
  return navigator.clipboard.writeText(message);
}
