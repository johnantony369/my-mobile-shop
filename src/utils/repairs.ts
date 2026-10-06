import { Job } from '../types';
import { cleanIndianPhone } from '../db/db';
import { formatINR } from '../i18n';

export function buildTrackingUrl(cloudId: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base.replace(/\/$/, '')}/track/${cloudId}`;
}

export function buildIntakeSlipMessage(job: Job, shopName: string, photoCount?: number): string;
export function buildIntakeSlipMessage(job: Job, shopName: string, trackingUrl?: string, photoCount?: number): string;
export function buildIntakeSlipMessage(
  job: Job,
  shopName: string,
  trackingUrlOrPhotoCount?: string | number,
  photoCountParam?: number
): string {
  let trackingUrl: string | undefined;
  let photoCount: number | undefined;

  if (typeof trackingUrlOrPhotoCount === 'number') {
    photoCount = trackingUrlOrPhotoCount;
  } else if (typeof trackingUrlOrPhotoCount === 'string') {
    trackingUrl = trackingUrlOrPhotoCount;
    photoCount = photoCountParam;
  }

  const shop = shopName.trim() || 'My Mobile Shop';
  const est = job.estimate !== undefined && job.estimate > 0 ? formatINR(job.estimate) : 'To be estimated';
  const adv = job.advance ? formatINR(job.advance) : formatINR(0);
  const balance = job.estimate !== undefined && job.estimate > 0
    ? formatINR(Math.max(0, job.estimate - (job.advance || 0)))
    : 'TBD';

  let msg = `*${shop}* — Repair Job Card\n`;
  if (job.id) msg += `Job ID: #${job.id}\n`;
  msg += `Customer: ${job.customerName}\n`;
  msg += `Device: ${job.model}\n`;
  msg += `Issue: ${job.complaint}\n`;
  msg += `Estimate: ${est} | Advance: ${adv}\n`;
  msg += `Balance Due: ${balance}\n`;
  if (job.expectedDate) msg += `Est. Date: ${job.expectedDate}\n`;
  if (photoCount && photoCount > 0) {
    msg += `Photos: ${photoCount} intake condition photo(s) recorded\n`;
  }
  msg += `Status: Received for Repair\n\n`;

  if (trackingUrl) {
    msg += `🔍 Track live repair progress:\n${trackingUrl}\n\n`;
  }

  msg += `We will notify you once ready. Thank you for choosing ${shop}!`;
  return msg;
}

export function buildReadyNotificationMessage(job: Job, shopName: string, trackingUrl?: string): string {
  const shop = shopName.trim() || 'My Mobile Shop';
  const balance = (job.estimate || 0) - (job.advance || 0);

  let msg = `*${shop}* — Device Ready!\n`;
  msg += `Hello ${job.customerName}, your ${job.model} is repaired and ready for pickup.\n`;
  if (balance > 0) {
    msg += `Balance Due: ${formatINR(balance)}\n`;
  }

  if (trackingUrl) {
    msg += `🔍 Track status:\n${trackingUrl}\n`;
  }

  msg += `Please collect it from: ${shop}\nThank you!`;
  return msg;
}

export function buildDeliveredSlipMessage(job: Job, shopName: string, trackingUrl?: string): string {
  const shop = shopName.trim() || 'My Mobile Shop';
  const paid = job.finalAmount !== null && job.finalAmount !== undefined
    ? formatINR(job.finalAmount)
    : (job.estimate ? formatINR(job.estimate) : 'Paid');

  let msg = `*${shop}* — Delivery Receipt\n`;
  msg += `Customer: ${job.customerName}\n`;
  msg += `Device: ${job.model}\n`;
  msg += `Issue: ${job.complaint}\n`;
  msg += `Total Amount Paid: ${paid}\n`;
  msg += `Status: Delivered\n\n`;

  if (trackingUrl) {
    msg += `🔍 View repair summary:\n${trackingUrl}\n\n`;
  }

  msg += `Thank you for visiting ${shop}!`;
  return msg;
}

export function buildJobNotificationMessage(job: Job, shopName: string, trackingUrl?: string): string {
  if (job.status === 'ready') {
    return buildReadyNotificationMessage(job, shopName, trackingUrl);
  }
  if (job.status === 'delivered') {
    return buildDeliveredSlipMessage(job, shopName, trackingUrl);
  }
  return buildIntakeSlipMessage(job, shopName, trackingUrl);
}

export function openWhatsAppNotification(job: Job, shopName: string, customMessage?: string): void {
  const phone = cleanIndianPhone(job.phone);
  const message = customMessage || buildJobNotificationMessage(job, shopName);
  const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function copyNotificationMessage(job: Job, shopName: string, customMessage?: string): Promise<void> {
  const message = customMessage || buildJobNotificationMessage(job, shopName);
  return navigator.clipboard.writeText(message);
}
