import { describe, it, expect } from 'vitest';
import { isFirebaseConfigured, auth, dbFirestore, storage, googleProvider } from '../src/firebase/config';

describe('Firebase Config', () => {
  it('returns boolean status indicating whether Firebase is configured', () => {
    expect(typeof isFirebaseConfigured()).toBe('boolean');
  });

  it('exports auth, dbFirestore, storage, and googleProvider handles safely', () => {
    expect(auth).toBeDefined();
    expect(dbFirestore).toBeDefined();
    expect(storage).toBeDefined();
    expect(googleProvider).toBeDefined();
  });
});
