import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveReferralCode,
  getStoredReferralCode,
  clearStoredReferralCode,
} from '../src/utils/useReferralCapture';

// Mock localStorage for Vitest Node environment
const store = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, String(value)),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  get length() {
    return store.size;
  },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
};

globalThis.localStorage = localStorageMock;

describe('Referral Code Storage & Attribution', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('stores and retrieves normalized uppercase referral code', () => {
    saveReferralCode('metro99');
    expect(getStoredReferralCode()).toBe('METRO99');
  });

  it('clears stored referral code', () => {
    saveReferralCode('DELHI01');
    expect(getStoredReferralCode()).toBe('DELHI01');
    clearStoredReferralCode();
    expect(getStoredReferralCode()).toBeNull();
  });

  it('expires code after 30 days', () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    localStorageMock.setItem('mms_partner_code', 'OLDCODE');
    localStorageMock.setItem('mms_partner_code_time', String(thirtyOneDaysAgo));

    expect(getStoredReferralCode()).toBeNull();
  });

  it('ignores invalid or too short codes', () => {
    saveReferralCode('ab'); // too short
    expect(getStoredReferralCode()).toBeNull();
  });
});
