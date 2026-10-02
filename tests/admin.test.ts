import { describe, it, expect } from 'vitest';
import { isSuperAdmin, SUPERADMIN_EMAIL, hasFullAccess } from '../src/utils/admin';

describe('Superadmin Authorization (isSuperAdmin)', () => {
  it('has the correct SUPERADMIN_EMAIL constant', () => {
    expect(SUPERADMIN_EMAIL).toBe('johnantony271@gmail.com');
  });

  it('recognizes exact superadmin email', () => {
    expect(isSuperAdmin({ email: 'johnantony271@gmail.com' })).toBe(true);
  });

  it('handles case-insensitivity and whitespace in email', () => {
    expect(isSuperAdmin({ email: '  JohnAntony271@gmail.com  ' })).toBe(true);
    expect(isSuperAdmin({ email: 'JOHNANTONY271@GMAIL.COM' })).toBe(true);
  });

  it('rejects other email addresses', () => {
    expect(isSuperAdmin({ email: 'johnantony@gmail.com' })).toBe(false);
    expect(isSuperAdmin({ email: 'shopowner@mymobileshop.app' })).toBe(false);
    expect(isSuperAdmin({ email: 'admin@google.com' })).toBe(false);
  });

  it('rejects null, undefined, or missing email objects', () => {
    expect(isSuperAdmin(null)).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
    expect(isSuperAdmin({})).toBe(false);
    expect(isSuperAdmin({ email: null })).toBe(false);
    expect(isSuperAdmin({ email: '' })).toBe(false);
  });
});

describe('Full Access Resolution (hasFullAccess)', () => {
  it('returns true when activated is true, regardless of user', () => {
    expect(hasFullAccess(true, null)).toBe(true);
    expect(hasFullAccess(true, { email: 'user@example.com' })).toBe(true);
  });

  it('returns true for superadmin even if activated is false', () => {
    expect(hasFullAccess(false, { email: 'johnantony271@gmail.com' })).toBe(true);
    expect(hasFullAccess(false, { email: '  JOHNANTONY271@GMAIL.COM ' })).toBe(true);
  });

  it('returns false when activated is false and user is not superadmin', () => {
    expect(hasFullAccess(false, null)).toBe(false);
    expect(hasFullAccess(false, { email: 'user@example.com' })).toBe(false);
  });
});

