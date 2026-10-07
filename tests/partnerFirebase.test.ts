import { describe, it, expect } from 'vitest';
import { calculateLeadEarning, shouldPreventSelfReferral } from '../src/firebase/partner';

describe('Partner Firebase Business Logic', () => {
  it('correctly associates commission amount with plan', () => {
    expect(calculateLeadEarning('monthly')).toBe(75);
    expect(calculateLeadEarning('yearly')).toBe(499);
    expect(calculateLeadEarning(null)).toBe(0);
  });

  it('prevents self referral by matching phone numbers or UIDs', () => {
    expect(shouldPreventSelfReferral('uid-123', '9876543210', 'uid-123', '9999999999')).toBe(true);
    expect(shouldPreventSelfReferral('uid-123', '9876543210', 'uid-456', '+91 98765-43210')).toBe(true);
    expect(shouldPreventSelfReferral('uid-123', '9876543210', 'uid-456', '8888888888')).toBe(false);
  });
});
