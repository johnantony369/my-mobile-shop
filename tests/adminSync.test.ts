import { describe, it, expect } from 'vitest';
import { formatBytes, calculateDataSize } from '../src/firebase/admin';

describe('Admin Data Usage Helpers', () => {
  describe('formatBytes', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('formats bytes correctly', () => {
      expect(formatBytes(512)).toBe('512 B');
    });

    it('formats kilobytes correctly', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(2560)).toBe('2.5 KB');
    });

    it('formats megabytes correctly', () => {
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(5242880)).toBe('5.0 MB');
    });
  });

  describe('calculateDataSize', () => {
    it('calculates size for empty arrays and null settings', () => {
      const size = calculateDataSize([], [], null);
      expect(size).toBeGreaterThanOrEqual(0);
    });

    it('accurately measures non-empty payload sizes', () => {
      const entries = [{ id: 1, type: 'in', amount: 500, date: '2026-09-30' }];
      const jobs = [{ id: 1, customerName: 'Arun', phone: '9876543210', status: 'ready' }];
      const settings = { shopName: 'City Mobiles', activated: true };

      const size = calculateDataSize(entries, jobs, settings);
      expect(size).toBeGreaterThan(100);
    });
  });
});
