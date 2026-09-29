import { describe, it, expect } from 'vitest';
import { isSuperAdmin, SUPERADMIN_EMAIL } from '../src/utils/admin';

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
