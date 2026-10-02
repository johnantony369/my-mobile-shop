import { describe, it, expect } from 'vitest';
import {
  TRIAL_DURATION_DAYS,
  getTrialDaysRemaining,
  checkCode,
  generateValidCode,
} from '../src/utils/activation';

describe('Trial duration & calculation', () => {
  it('should define TRIAL_DURATION_DAYS as 2', () => {
    expect(TRIAL_DURATION_DAYS).toBe(2);
  });

  it('should return 2 days when firstLaunchDate is empty or undefined', () => {
    expect(getTrialDaysRemaining('')).toBe(2);
  });

  it('should return 2 days when launched today', () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(getTrialDaysRemaining(todayStr)).toBe(2);
  });

  it('should return 1 day when launched yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    expect(getTrialDaysRemaining(yesterdayStr)).toBe(1);
  });

  it('should return 0 days (expired) when launched 2 days ago', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;
    expect(getTrialDaysRemaining(twoDaysAgoStr)).toBe(0);
  });

  it('should return 0 days (never negative) when launched 10 days ago', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const str = `${tenDaysAgo.getFullYear()}-${String(tenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(tenDaysAgo.getDate()).padStart(2, '0')}`;
    expect(getTrialDaysRemaining(str)).toBe(0);
  });
});

describe('Activation code verification', () => {
  it('should generate valid activation codes that pass checkCode', () => {
    const code = generateValidCode();
    expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(checkCode(code)).toBe(true);
  });

  it('should reject invalid activation codes', () => {
    expect(checkCode('')).toBe(false);
    expect(checkCode('INVALID-CODE-HERE')).toBe(false);
    expect(checkCode('1234-5678-9012-3456')).toBe(false);
  });
});
