import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PRICING_CONFIG,
  SUPPORTED_COUNTRIES,
  formatPrice,
  calculateSavings,
  detectVisitorCountry,
  saveVisitorCountry,
  validatePlanPrice,
  STORAGE_KEY_COUNTRY,
} from '../src/utils/pricing';

describe('Canonical USD Pricing (International Markets & GCC)', () => {
  const usd = PRICING_CONFIG.US.plans;

  it('Monthly Pro is $19 for 1 month', () => {
    expect(usd.monthly.price).toBe(19);
    expect(usd.monthly.durationMonths).toBe(1);
  });

  it('Annual Pro is $145 for 12 months (Recommended)', () => {
    expect(usd.yearly.price).toBe(145);
    expect(usd.yearly.durationMonths).toBe(12);
    expect(usd.yearly.recommended).toBe(true);
  });

  it('2-Year Pro is $345 for 24 months', () => {
    expect(usd.two_year.price).toBe(345);
    expect(usd.two_year.durationMonths).toBe(24);
  });

  it('3-Year Pro is $449 for 36 months (Best Value)', () => {
    expect(usd.three_year.price).toBe(449);
    expect(usd.three_year.durationMonths).toBe(36);
    expect(usd.three_year.bestValue).toBe(true);
  });

  it('Lifetime Pro is $699 one-time payment (null duration)', () => {
    expect(usd.lifetime.price).toBe(699);
    expect(usd.lifetime.durationMonths).toBeNull();
    expect(usd.lifetime.isOneTime).toBe(true);
  });
});

describe('Preserved Indian Pricing (INR)', () => {
  it('preserves ₹249/mo and ₹2,499/yr', () => {
    const india = PRICING_CONFIG.IN;
    expect(india.currencyCode).toBe('INR');
    expect(india.currencySymbol).toBe('₹');
    expect(india.plans.monthly.price).toBe(249);
    expect(india.plans.yearly.price).toBe(2499);
    expect(india.plans.two_year.price).toBe(4999);
    expect(india.plans.three_year.price).toBe(6999);
    expect(india.plans.lifetime.price).toBe(9999);
  });
});

describe('Supported Countries Configuration', () => {
  it('supports exactly two currencies: INR (India) and USD (International/GCC)', () => {
    expect(SUPPORTED_COUNTRIES).toEqual(['IN', 'US']);
    expect(Object.keys(PRICING_CONFIG)).toEqual(['IN', 'US']);
  });
});

describe('formatPrice', () => {
  it('formats Indian INR prices with ₹', () => {
    expect(formatPrice(249, 'IN')).toBe('₹249');
    expect(formatPrice(2499, 'IN')).toBe('₹2,499');
  });

  it('formats USD prices with $', () => {
    expect(formatPrice(19, 'US')).toBe('$19');
    expect(formatPrice(145, 'US')).toBe('$145');
    expect(formatPrice(345, 'US')).toBe('$345');
    expect(formatPrice(449, 'US')).toBe('$449');
    expect(formatPrice(699, 'US')).toBe('$699');
  });
});

describe('calculateSavings (Mathematical Accuracy)', () => {
  it('calculates USD Annual Pro savings accurately ($83, ~36%)', () => {
    // USD Monthly: 19, Annual: 145. Baseline: 12 * 19 = 228. Savings = 83.
    const savings = calculateSavings('yearly', 'US');
    expect(savings).not.toBeNull();
    expect(savings!.savingsAmount).toBe(83);
    expect(savings!.savingsPercent).toBe(36); // 83 / 228 * 100 = 36.4%
    expect(savings!.effectiveMonthlyPrice).toBe(12); // 145 / 12 = 12.08
  });

  it('calculates USD 3-Year Pro savings accurately ($235, ~34%)', () => {
    // USD Monthly: 19, 3-Year: 449. Baseline: 36 * 19 = 684. Savings = 235.
    const savings = calculateSavings('three_year', 'US');
    expect(savings).not.toBeNull();
    expect(savings!.savingsAmount).toBe(235);
    expect(savings!.savingsPercent).toBe(34);
  });

  it('calculates India Annual Pro savings accurately (₹489, ~16%)', () => {
    // India Monthly: 249, Annual: 2499. Baseline: 12 * 249 = 2988. Savings = 489.
    const savings = calculateSavings('yearly', 'IN');
    expect(savings).not.toBeNull();
    expect(savings!.savingsAmount).toBe(489);
    expect(savings!.savingsPercent).toBe(16);
    expect(savings!.effectiveMonthlyPrice).toBe(208);
  });

  it('returns null for Monthly Pro and Lifetime Pro', () => {
    expect(calculateSavings('monthly', 'US')).toBeNull();
    expect(calculateSavings('lifetime', 'US')).toBeNull();
  });
});

describe('Visitor Country Detection and Override', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    const store: Record<string, string> = {};
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => {},
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  it('respects manual country selection stored in localStorage', () => {
    saveVisitorCountry('IN');
    expect(detectVisitorCountry()).toBe('IN');

    saveVisitorCountry('US');
    expect(detectVisitorCountry()).toBe('US');
  });

  it('defaults to US for non-India visitors without stored preference', () => {
    const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function() {
      return { ...originalResolvedOptions.call(this), timeZone: 'America/New_York' };
    };
    try {
      expect(detectVisitorCountry()).toBe('US');
    } finally {
      Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
    }
  });

  it('detects IN for Indian visitors without stored preference', () => {
    const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function() {
      return { ...originalResolvedOptions.call(this), timeZone: 'Asia/Kolkata' };
    };
    try {
      expect(detectVisitorCountry()).toBe('IN');
    } finally {
      Intl.DateTimeFormat.prototype.resolvedOptions = originalResolvedOptions;
    }
  });
});

describe('validatePlanPrice (Server/Client Safety)', () => {
  it('validates authentic configured prices as true', () => {
    expect(validatePlanPrice('monthly', 'IN', 249)).toBe(true);
    expect(validatePlanPrice('yearly', 'IN', 2499)).toBe(true);
    expect(validatePlanPrice('monthly', 'US', 19)).toBe(true);
    expect(validatePlanPrice('yearly', 'US', 145)).toBe(true);
  });

  it('rejects tampered or forged prices as false', () => {
    expect(validatePlanPrice('monthly', 'IN', 1)).toBe(false);
    expect(validatePlanPrice('yearly', 'US', 100)).toBe(false);
    expect(validatePlanPrice('lifetime', 'US', 99)).toBe(false);
  });
});
