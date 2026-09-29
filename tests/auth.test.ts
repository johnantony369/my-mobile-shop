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
});
