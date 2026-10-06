import { describe, it, expect } from 'vitest';
import {
  TRIAL_DURATION_DAYS,
  getTrialDaysRemaining,
  checkCode,
  generateValidCode,
} from '../src/utils/activation';

describe('Trial duration & calculation', () => {
  it('should define TRIAL_DURATION_DAYS as 14', () => {
    expect(TRIAL_DURATION_DAYS).toBe(14);
  });

  it('should return 14 days when firstLaunchDate is empty or undefined', () => {
    expect(getTrialDaysRemaining('')).toBe(14);
  });

  it('should return 14 days when launched today', () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(getTrialDaysRemaining(todayStr)).toBe(14);
  });

  it('should return 13 days when launched yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    expect(getTrialDaysRemaining(yesterdayStr)).toBe(13);
  });

  it('should return 0 days (expired) when launched 14 days ago', () => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const str = `${fourteenDaysAgo.getFullYear()}-${String(fourteenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(fourteenDaysAgo.getDate()).padStart(2, '0')}`;
    expect(getTrialDaysRemaining(str)).toBe(0);
  });

  it('should return 0 days (never negative) when launched 20 days ago', () => {
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    const str = `${twentyDaysAgo.getFullYear()}-${String(twentyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twentyDaysAgo.getDate()).padStart(2, '0')}`;
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
