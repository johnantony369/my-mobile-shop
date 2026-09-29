import { describe, it, expect } from 'vitest';
import { loginWithGoogle, sendOtp, logout } from '../src/firebase/auth';

describe('Firebase Auth Service', () => {
  it('throws friendly error when attempting login without Firebase configuration', async () => {
    // In unconfigured test env, auth is null
    await expect(loginWithGoogle()).rejects.toThrow('Firebase Auth not configured');
  });

  it('throws friendly error when attempting phone otp without Firebase configuration', async () => {
    await expect(sendOtp('+919876543210', {} as any)).rejects.toThrow('Firebase Auth not configured');
  });

  it('handles logout gracefully even if unconfigured', async () => {
    await expect(logout()).resolves.toBeUndefined();
  });
});
