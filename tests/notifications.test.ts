import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildDailySummaryMessage,
  calculateDelayToTime,
  getNotificationPermission,
} from '../src/utils/notifications';

describe('Daily Summary Notification Engine', () => {
  describe('buildDailySummaryMessage', () => {
    it('formats summary with sales and delivered repairs', () => {
      const msg = buildDailySummaryMessage({
        inTotal: 4500,
        net: 3200,
        inCount: 8,
        deliveredCount: 3,
        shopName: 'Care Mobiles',
      });
      expect(msg.title).toBe('Today at Care Mobiles: ₹4,500 🎉');
      expect(msg.body).toBe('Net: ₹3,200 • 8 sales • 3 repairs delivered. Tap to review day book.');
    });

    it('formats summary with sales and 0 delivered repairs', () => {
      const msg = buildDailySummaryMessage({
        inTotal: 1200,
        net: 1200,
        inCount: 2,
        deliveredCount: 0,
        shopName: 'Care Mobiles',
      });
      expect(msg.title).toBe('Today at Care Mobiles: ₹1,200 🎉');
      expect(msg.body).toBe('Net: ₹1,200 • 2 sales. Tap to review day book.');
    });

    it('formats friendly fallback on quiet day with 0 transactions', () => {
      const msg = buildDailySummaryMessage({
        inTotal: 0,
        net: 0,
        inCount: 0,
        deliveredCount: 0,
        shopName: 'Care Mobiles',
      });
      expect(msg.title).toBe('Care Mobiles Closing Wrap-up 🌙');
      expect(msg.body).toBe("Ready to close today's accounts? Tap to check your day book.");
    });
  });

  describe('calculateDelayToTime', () => {
    it('calculates milliseconds until target time later today', () => {
      const mockNow = new Date(2026, 9, 6, 18, 0, 0); // 18:00
      const delay = calculateDelayToTime('20:30', mockNow);
      expect(delay).toBe(2.5 * 60 * 60 * 1000); // 2.5 hours in ms
    });

    it('returns 0 or negative if target time has already passed today', () => {
      const mockNow = new Date(2026, 9, 6, 21, 0, 0); // 21:00
      const delay = calculateDelayToTime('20:30', mockNow);
      expect(delay).toBeLessThan(0);
    });
  });

  describe('getNotificationPermission', () => {
    it('returns unsupported when Notification is not in window', () => {
      // Test when window is undefined or Notification is undefined
      const originalWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;
      expect(getNotificationPermission()).toBe('unsupported');
      globalThis.window = originalWindow;
    });

    it('returns granted when window.Notification.permission is granted', () => {
      const originalWindow = globalThis.window;
      // @ts-ignore
      globalThis.window = {
        Notification: {
          permission: 'granted',
        },
      } as unknown as Window & typeof globalThis;
      expect(getNotificationPermission()).toBe('granted');
      globalThis.window = originalWindow;
    });
  });
});
