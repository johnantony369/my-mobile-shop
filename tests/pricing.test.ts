import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PRICING_CONFIG,
  SUPPORTED_COUNTRIES,
  GCC_COUNTRIES,
  formatPrice,
  calculateSavings,
  detectVisitorCountry,
  saveVisitorCountry,
  validatePlanPrice,
  STORAGE_KEY_COUNTRY,
} from '../src/utils/pricing';

describe('Canonical USD Pricing', () => {
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

describe('GCC Regional Pricing Matrix', () => {
  it('UAE (AED) matches exact required prices', () => {
    const uae = PRICING_CONFIG.AE;
    expect(uae.currencyCode).toBe('AED');
    expect(uae.plans.monthly.price).toBe(69);
    expect(uae.plans.yearly.price).toBe(529);
    expect(uae.plans.two_year.price).toBe(1249);
    expect(uae.plans.three_year.price).toBe(1649);
    expect(uae.plans.lifetime.price).toBe(2499);
  });

  it('Saudi Arabia (SAR) matches exact required prices', () => {
    const sa = PRICING_CONFIG.SA;
    expect(sa.currencyCode).toBe('SAR');
    expect(sa.plans.monthly.price).toBe(69);
    expect(sa.plans.yearly.price).toBe(529);
    expect(sa.plans.two_year.price).toBe(1299);
    expect(sa.plans.three_year.price).toBe(1699);
    expect(sa.plans.lifetime.price).toBe(2599);
  });

  it('Qatar (QAR) matches exact required prices', () => {
    const qa = PRICING_CONFIG.QA;
    expect(qa.currencyCode).toBe('QAR');
    expect(qa.plans.monthly.price).toBe(69);
    expect(qa.plans.yearly.price).toBe(529);
    expect(qa.plans.two_year.price).toBe(1249);
    expect(qa.plans.three_year.price).toBe(1649);
    expect(qa.plans.lifetime.price).toBe(2499);
  });

  it('Oman (OMR) matches exact required prices', () => {
    const om = PRICING_CONFIG.OM;
    expect(om.currencyCode).toBe('OMR');
    expect(om.plans.monthly.price).toBe(7);
    expect(om.plans.yearly.price).toBe(53);
    expect(om.plans.two_year.price).toBe(129);
    expect(om.plans.three_year.price).toBe(169);
    expect(om.plans.lifetime.price).toBe(269);
  });

  it('Bahrain (BHD) matches exact required prices', () => {
    const bh = PRICING_CONFIG.BH;
    expect(bh.currencyCode).toBe('BHD');
    expect(bh.plans.monthly.price).toBe(7);
    expect(bh.plans.yearly.price).toBe(53);
    expect(bh.plans.two_year.price).toBe(129);
    expect(bh.plans.three_year.price).toBe(169);
    expect(bh.plans.lifetime.price).toBe(259);
  });

  it('Kuwait (KWD) matches exact required prices with decimals', () => {
    const kw = PRICING_CONFIG.KW;
    expect(kw.currencyCode).toBe('KWD');
    expect(kw.plans.monthly.price).toBe(5.9);
    expect(kw.plans.yearly.price).toBe(44);
    expect(kw.plans.two_year.price).toBe(209);
    expect(kw.plans.three_year.price).toBe(279);
    expect(kw.plans.lifetime.price).toBe(429);
  });

  it('Includes all 6 GCC countries', () => {
    expect(GCC_COUNTRIES).toEqual(['AE', 'SA', 'QA', 'OM', 'BH', 'KW']);
  });
});

describe('Preserved Indian Pricing', () => {
  it('preserves ₹249/mo and ₹2,499/yr', () => {
    const india = PRICING_CONFIG.IN;
    expect(india.currencyCode).toBe('INR');
    expect(india.currencySymbol).toBe('₹');
    expect(india.plans.monthly.price).toBe(249);
    expect(india.plans.yearly.price).toBe(2499);
  });
});

describe('formatPrice', () => {
  it('formats UAE AED prices with comma grouping', () => {
    expect(formatPrice(69, 'AE')).toBe('AED 69');
    expect(formatPrice(1249, 'AE')).toBe('AED 1,249');
    expect(formatPrice(2499, 'AE')).toBe('AED 2,499');
  });

  it('formats Kuwait KWD prices with decimal where needed', () => {
    expect(formatPrice(5.9, 'KW')).toBe('KWD 5.9');
    expect(formatPrice(44, 'KW')).toBe('KWD 44');
    expect(formatPrice(209, 'KW')).toBe('KWD 209');
  });

  it('formats Indian INR prices with ₹', () => {
    expect(formatPrice(249, 'IN')).toBe('₹249');
    expect(formatPrice(2499, 'IN')).toBe('₹2,499');
  });

  it('formats USD prices with $', () => {
    expect(formatPrice(19, 'US')).toBe('$19');
    expect(formatPrice(145, 'US')).toBe('$145');
  });
});

describe('calculateSavings (Mathematical Accuracy)', () => {
  it('calculates UAE Annual Pro savings accurately', () => {
    // UAE Monthly: 69, Annual: 529. Baseline: 12 * 69 = 828. Savings = 299.
    const savings = calculateSavings('yearly', 'AE');
    expect(savings).not.toBeNull();
    expect(savings!.savingsAmount).toBe(299);
    expect(savings!.savingsPercent).toBe(36); // 299 / 828 * 100 = 36.11%
    expect(savings!.effectiveMonthlyPrice).toBe(44); // 529 / 12 = 44.08
  });

  it('calculates UAE 3-Year Pro savings accurately', () => {
    // UAE Monthly: 69, 3-Year: 1649. Baseline: 36 * 69 = 2484. Savings = 835.
    const savings = calculateSavings('three_year', 'AE');
    expect(savings).not.toBeNull();
    expect(savings!.savingsAmount).toBe(835);
    expect(savings!.savingsPercent).toBe(34);
    expect(savings!.effectiveMonthlyPrice).toBe(46); // 1649 / 36 = 45.8
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
    expect(calculateSavings('monthly', 'AE')).toBeNull();
    expect(calculateSavings('lifetime', 'AE')).toBeNull();
  });
});

describe('Visitor Country Detection and Override', () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    const store: Record<string, string> = {};
    // Mock localStorage
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
    saveVisitorCountry('SA');
    expect(detectVisitorCountry()).toBe('SA');

    saveVisitorCountry('KW');
    expect(detectVisitorCountry()).toBe('KW');
  });

  it('defaults to India when no stored country and no specific timezone match', () => {
    expect(detectVisitorCountry()).toBe('IN');
  });
});

describe('validatePlanPrice (Server/Client Safety)', () => {
  it('validates authentic configured prices as true', () => {
    expect(validatePlanPrice('monthly', 'AE', 69)).toBe(true);
    expect(validatePlanPrice('yearly', 'AE', 529)).toBe(true);
    expect(validatePlanPrice('three_year', 'SA', 1699)).toBe(true);
    expect(validatePlanPrice('monthly', 'IN', 249)).toBe(true);
    expect(validatePlanPrice('yearly', 'IN', 2499)).toBe(true);
  });

  it('rejects tampered or forged prices as false', () => {
    expect(validatePlanPrice('monthly', 'AE', 1)).toBe(false);
    expect(validatePlanPrice('yearly', 'AE', 100)).toBe(false);
    expect(validatePlanPrice('lifetime', 'US', 99)).toBe(false);
  });
});
