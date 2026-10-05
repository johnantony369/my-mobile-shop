import { describe, it, expect } from 'vitest';
import {
  addMonths,
  computeProExpiry,
  isProCurrentlyActive,
  isProExpired,
  proDaysRemaining,
} from '../src/utils/proPlan';

const NOW = new Date(2026, 9, 3, 12, 0, 0); // 3 Oct 2026 local

describe('addMonths', () => {
  it('adds calendar months', () => {
    const d = addMonths(new Date(2026, 9, 3), 1);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 3]);
  });

  it('clamps month-end days instead of overflowing', () => {
    const d = addMonths(new Date(2026, 0, 31), 1);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 1, 28]);
  });

  it('rolls the year for 12 months', () => {
    const d = addMonths(new Date(2026, 9, 3), 12);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2027, 9, 3]);
  });
});

describe('computeProExpiry', () => {
  it('lifetime never expires', () => {
    expect(computeProExpiry('lifetime', NOW)).toBeNull();
  });

  it('monthly expires one month from now', () => {
    const exp = new Date(computeProExpiry('monthly', NOW)!);
    expect([exp.getFullYear(), exp.getMonth(), exp.getDate()]).toEqual([2026, 10, 3]);
  });

  it('yearly expires one year from now', () => {
    const exp = new Date(computeProExpiry('yearly', NOW)!);
    expect([exp.getFullYear(), exp.getMonth(), exp.getDate()]).toEqual([2027, 9, 3]);
  });

  it('renewing an unexpired plan extends from the current expiry', () => {
    const current = new Date(2026, 9, 20, 12).toISOString();
    const exp = new Date(computeProExpiry('monthly', NOW, current)!);
    expect([exp.getMonth(), exp.getDate()]).toEqual([10, 20]);
  });

  it('renewing an expired plan restarts from now', () => {
    const current = new Date(2026, 8, 1).toISOString();
    const exp = new Date(computeProExpiry('monthly', NOW, current)!);
    expect([exp.getMonth(), exp.getDate()]).toEqual([10, 3]);
  });
});

describe('isProCurrentlyActive / isProExpired', () => {
  it('is inactive when not activated', () => {
    expect(isProCurrentlyActive({ activated: false }, NOW)).toBe(false);
    expect(isProCurrentlyActive(null, NOW)).toBe(false);
    expect(isProCurrentlyActive(undefined, NOW)).toBe(false);
  });

  it('treats activation without expiry as lifetime (legacy accounts)', () => {
    expect(isProCurrentlyActive({ activated: true }, NOW)).toBe(true);
    expect(isProCurrentlyActive({ activated: true, proExpiresAt: null }, NOW)).toBe(true);
    expect(isProExpired({ activated: true }, NOW)).toBe(false);
  });

  it('is active before expiry and inactive after', () => {
    const future = new Date(2026, 10, 3).toISOString();
    const past = new Date(2026, 8, 3).toISOString();
    expect(isProCurrentlyActive({ activated: true, proExpiresAt: future }, NOW)).toBe(true);
    expect(isProCurrentlyActive({ activated: true, proExpiresAt: past }, NOW)).toBe(false);
    expect(isProExpired({ activated: true, proExpiresAt: past }, NOW)).toBe(true);
  });
});

describe('proDaysRemaining', () => {
  it('returns null for lifetime and a count for time-limited plans', () => {
    expect(proDaysRemaining({ proExpiresAt: null }, NOW)).toBeNull();
    const in10 = new Date(NOW.getTime() + 10 * 86400000).toISOString();
    expect(proDaysRemaining({ proExpiresAt: in10 }, NOW)).toBe(10);
  });

  it('never goes negative', () => {
    const past = new Date(NOW.getTime() - 5 * 86400000).toISOString();
    expect(proDaysRemaining({ proExpiresAt: past }, NOW)).toBe(0);
  });
});
