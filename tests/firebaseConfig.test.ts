import { describe, it, expect } from 'vitest';
import { isFirebaseConfigured, auth, dbFirestore, googleProvider } from '../src/firebase/config';

describe('Firebase Config', () => {
  it('detects unconfigured state when environment keys are missing', () => {
    // In default test environment without env vars, it should return false
    expect(isFirebaseConfigured()).toBe(false);
  });

  it('exports auth, dbFirestore, and googleProvider handles safely', () => {
    expect(auth).toBeDefined(); // null or Auth instance
    expect(dbFirestore).toBeDefined(); // null or Firestore instance
    expect(googleProvider).toBeDefined(); // null or GoogleAuthProvider instance
  });
});
