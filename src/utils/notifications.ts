import { db, computeSummary } from '../db/db';
import { formatINR } from '../i18n';
import { getLocalDateString } from './date';

export const LAST_NOTIFICATION_DATE_KEY = 'last_summary_notif_date';

export interface SummaryMessagePayload {
  inTotal: number;
  net: number;
  inCount: number;
  deliveredCount: number;
  shopName: string;
}

export function buildDailySummaryMessage(payload: SummaryMessagePayload): { title: string; body: string } {
  const { inTotal, net, inCount, deliveredCount, shopName } = payload;
  const name = shopName || 'My Mobile Shop';

  if (inCount === 0 && inTotal === 0 && deliveredCount === 0) {
    return {
      title: `${name} Closing Wrap-up 🌙`,
      body: "Ready to close today's accounts? Tap to check your day book.",
    };
  }

  const title = `Today at ${name}: ${formatINR(inTotal)} 🎉`;
  const repairPart = deliveredCount > 0 ? ` • ${deliveredCount} repair${deliveredCount > 1 ? 's' : ''} delivered` : '';
  const body = `Net: ${formatINR(net)} • ${inCount} sale${inCount !== 1 ? 's' : ''}${repairPart}. Tap to review day book.`;

  return { title, body };
}

export function calculateDelayToTime(timeStr: string, now: Date = new Date()): number {
  const [hoursStr, minutesStr] = (timeStr || '20:30').split(':');
  const targetHours = parseInt(hoursStr, 10) || 20;
  const targetMinutes = parseInt(minutesStr, 10) || 30;

  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHours, targetMinutes, 0, 0);
  return targetDate.getTime() - now.getTime();
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window) || !window.Notification) {
    return 'denied';
  }
  try {
    return await window.Notification.requestPermission();
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return 'denied';
  }
}

export async function triggerDailySummaryNotification(options?: {
  isTest?: boolean;
  shopName?: string;
}): Promise<boolean> {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window && Boolean(window.Notification);
  if (!isSupported) return false;

  if (window.Notification.permission !== 'granted') {
    return false;
  }

  const today = getLocalDateString();
  const lastSentDate = localStorage.getItem(LAST_NOTIFICATION_DATE_KEY);

  if (!options?.isTest && lastSentDate === today) {
    return false;
  }

  try {
    // 1. Fetch entries for today
    const entries = await db.entries.where('date').equals(today).toArray();
    const activeEntries = entries.filter((e) => !e.deletedAt && e.syncStatus !== 'deleted');
    const summary = computeSummary(activeEntries);

    // 2. Fetch delivered repairs for today
    let deliveredCount = 0;
    try {
      const jobs = await db.jobs.toArray();
      deliveredCount = jobs.filter(
        (job) => !job.deletedAt && job.status === 'delivered' && (
          (job.deliveredAt && getLocalDateString(new Date(job.deliveredAt)) === today) ||
          (!job.deliveredAt && job.updatedAt && getLocalDateString(new Date(job.updatedAt)) === today)
        )
      ).length;
    } catch {
      // db.jobs might be empty or unavailable
    }

    const { title, body } = buildDailySummaryMessage({
      inTotal: summary.inTotal,
      net: summary.net,
      inCount: summary.inCount,
      deliveredCount,
      shopName: options?.shopName || 'My Mobile Shop',
    });

    const notifOptions: NotificationOptions = {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'daily-summary',
      data: { url: '/' },
    };

    // Prefer service worker registration if available
    let shownViaSW = false;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, notifOptions);
          shownViaSW = true;
        }
      } catch (swErr) {
        console.warn('SW showNotification failed, falling back to Notification constructor:', swErr);
      }
    }

    if (!shownViaSW && window.Notification) {
      new window.Notification(title, notifOptions);
    }

    if (!options?.isTest) {
      localStorage.setItem(LAST_NOTIFICATION_DATE_KEY, today);
    }

    return true;
  } catch (err) {
    console.error('Error triggering daily summary notification:', err);
    return false;
  }
}

export function scheduleDailyNotification(timeStr: string, shopName: string): () => void {
  const delay = calculateDelayToTime(timeStr);
  const today = getLocalDateString();
  const lastSentDate = localStorage.getItem(LAST_NOTIFICATION_DATE_KEY);

  let timerId: NodeJS.Timeout | null = null;

  if (delay > 0) {
    timerId = setTimeout(async () => {
      await triggerDailySummaryNotification({ shopName });
    }, delay);
  } else if (delay <= 0 && lastSentDate !== today) {
    // If opened after target time today and hasn't fired yet, fire shortly after mount
    timerId = setTimeout(async () => {
      await triggerDailySummaryNotification({ shopName });
    }, 3000);
  }

  return () => {
    if (timerId) clearTimeout(timerId);
  };
}
