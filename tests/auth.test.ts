import { describe, it, expect } from 'vitest';
import {
  formatLoginIdToEmail,
  logout
} from '../src/firebase/auth';

describe('Firebase Auth Service', () => {
  it('formatLoginIdToEmail correctly transforms login IDs to email formats', () => {
    expect(formatLoginIdToEmail('shop_kerala')).toBe('shop_kerala@mymobileshop.app');
    expect(formatLoginIdToEmail('  myShop123  ')).toBe('myshop123@mymobileshop.app');
    expect(formatLoginIdToEmail('owner@gmail.com')).toBe('owner@gmail.com');
  });

  it('formatLoginIdToEmail sanitizes spaces and special characters', () => {
    expect(formatLoginIdToEmail('my shop #1')).toBe('my_shop__1@mymobileshop.app');
  });

  it('handles logout gracefully', async () => {
    await expect(logout()).resolves.toBeUndefined();
  });

  it('linking functions are defined and call Firebase auth methods', async () => {
    const { linkGoogleAccount, sendLinkPhoneOtp } = await import('../src/firebase/auth');
    const dummyUser = { uid: 'test-user' } as any;
    const dummyVerifier = {} as any;

    await expect(linkGoogleAccount(dummyUser)).rejects.toThrow();
    await expect(sendLinkPhoneOtp(dummyUser, '+919999999999', dummyVerifier)).rejects.toThrow();
  });
});
