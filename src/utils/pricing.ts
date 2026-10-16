export type PlanId = 'monthly' | 'yearly' | 'two_year' | 'three_year' | 'lifetime';

export type GCCCountryCode = 'AE' | 'SA' | 'QA' | 'OM' | 'BH' | 'KW';
export type CountryCode = GCCCountryCode | 'IN' | 'US';

export interface PlanConfig {
  id: PlanId;
  name: string;
  durationMonths: number | null; // null for lifetime
  isOneTime?: boolean;
  recommended?: boolean;
  bestValue?: boolean;
  price: number;
}

export interface CountryPricingConfig {
  countryCode: CountryCode;
  countryName: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  symbolPosition: 'prefix' | 'suffix';
  decimalPlaces: number;
  plans: Record<PlanId, PlanConfig>;
}

/**
 * Centralized, typed pricing matrix.
 * - Canonical USD reference prices
 * - GCC Regional fixed prices
 * - Preserved Indian prices (₹249/mo, ₹2,499/yr)
 */
export const PRICING_CONFIG: Record<CountryCode, CountryPricingConfig> = {
  // United Arab Emirates
  AE: {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    flag: '🇦🇪',
    currencyCode: 'AED',
    currencySymbol: 'AED',
    symbolPosition: 'prefix',
    decimalPlaces: 0,
    plans: {
      monthly: { id: 'monthly', name: 'Monthly Pro', durationMonths: 1, price: 69 },
      yearly: { id: 'yearly', name: 'Annual Pro', durationMonths: 12, recommended: true, price: 529 },
      two_year: { id: 'two_year', name: '2-Year Pro', durationMonths: 24, price: 1249 },
      three_year: { id: 'three_year', name: '3-Year Pro', durationMonths: 36, bestValue: true, price: 1649 },
      lifetime: { id: 'lifetime', name: 'Lifetime Pro', durationMonths: null, isOneTime: true, price: 2499 },
    },
  },
  // Saudi Arabia
  SA: {
    countryCode: 'SA',
    countryName: 'Saudi Arabia',
    flag: '🇸🇦',
    currencyCode: 'SAR',
    currencySymbol: 'SAR',
    symbolPosition: 'prefix',
    decimalPlaces: 0,
    plans: {
      monthly: { id: 'monthly', name: 'Monthly Pro', durationMonths: 1, price: 69 },
      yearly: { id: 'yearly', name: 'Annual Pro', durationMonths: 12, recommended: true, price: 529 },
      two_year: { id: 'two_year', name: '2-Year Pro', durationMonths: 24, price: 1299 },
      three_year: { id: 'three_year', name: '3-Year Pro', durationMonths: 36, bestValue: true, price: 1699 },
      lifetime: { id: 'lifetime', name: 'Lifetime Pro', durationMonths: null, isOneTime: true, price: 2599 },
    },
  },
  // Qatar
  QA: {
    countryCode: 'QA',
    countryName: 'Qatar',
    flag: '🇶🇦',
    currencyCode: 'QAR',
    currencySymbol: 'QAR',
    symbolPosition: 'prefix',
    decimalPlaces: 0,
    plans: {
      monthly: { id: 'monthly', name: 'Monthly Pro', durationMonths: 1, price: 69 },
      yearly: { id: 'yearly', name: 'Annual Pro', durationMonths: 12, recommended: true, price: 529 },
      two_year: { id: 'two_year', name: '2-Year Pro', durationMonths: 24, price: 1249 },
      three_year: { id: 'three_year', name: '3-Year Pro', durationMonths: 36, bestValue: true, price: 1649 },
      lifetime: { id: 'lifetime', name: 'Lifetime Pro', durationMonths: null, isOneTime: true, price: 2499 },
    },
  },
  // Oman
  OM: {
    countryCode: 'OM',
    countryName: 'Oman',
    flag: '🇴🇲',
    currencyCode: 'OMR',
    currencySymbol: 'OMR',
    symbolPosition: 'prefix',
    decimalPlaces: 0,
    plans: {
      monthly: { id: 'monthly', name: 'Monthly Pro', durationMonths: 1, price: 7 },
      yearly: { id: 'yearly', name: 'Annual Pro', durationMonths: 12, recommended: true, price: 53 },
      two_year: { id: 'two_year', name: '2-Year Pro', durationMonths: 24, price: 129 },
      three_year: { id: 'three_year', name: '3-Year Pro', durationMonths: 36, bestValue: true, price: 169 },
      lifetime: { id: 'lifetime', name: 'Lifetime Pro', durationMonths: null, isOneTime: true, price: 269 },
    },
  },
  // Bahrain
  BH: {
    countryCode: 'BH',
    countryName: 'Bahrain',
    flag: '🇧🇭',
    currencyCode: 'BHD',
    currencySymbol: 'BHD',
    symbolPosition: 'prefix',
    decimalPlaces: 0,
    plans: {
      monthly: { id: 'monthly', name: 'Monthly Pro', durationMonths: 1, price: 7 },
      yearly: { id: 'yearly', name: 'Annual Pro', durationMonths: 12, recommended: true, price: 53 },
      two_year: { id: 'two_year', name: '2-Year Pro', durationMonths: 24, price: 129 },
      three_year: { id: 'three_year', name: '3-Year Pro', durationMonths: 36, bestValue: true, price: 169 },
      lifetime: { id: 'lifetime', name: 'Lifetime Pro', durationMonths: null, isOneTime: true, price: 259 },
    },
  },
  // Kuwait
  KW: {
    countryCode: 'KW',
    countryName: 'Kuwait',
    flag: '🇰🇼',
    currencyCode: 'KWD',
    currencySymbol: 'KWD',
    symbolPosition: 'prefix',
    decimalPlaces: 1,
    plans: {
      monthly: { id: 'monthly', name: 'Monthly Pro', durationMonths: 1, price: 5.9 },
      yearly: { id: 'yearly', name: 'Annual Pro', durationMonths: 12, recommended: true, price: 44 },
      two_year: { id: 'two_year', name: '2-Year Pro', durationMonths: 24, price: 209 },
      three_year: { id: 'three_year', name: '3-Year Pro', durationMonths: 36, bestValue: true, price: 279 },
      lifetime: { id: 'lifetime', name: 'Lifetime Pro', durationMonths: null, isOneTime: true, price: 429 },
    },
  },
  // India (Preserved)
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    flag: '🇮🇳',
    currencyCode: 'INR',
    currencySymbol: '₹',
    symbolPosition: 'prefix',
    decimalPlaces: 0,
    plans: {
      monthly: { id: 'monthly', name: 'Monthly Pro', durationMonths: 1, price: 249 },
      yearly: { id: 'yearly', name: 'Annual Pro', durationMonths: 12, recommended: true, price: 2499 },
      two_year: { id: 'two_year', name: '2-Year Pro', durationMonths: 24, price: 4999 },
      three_year: { id: 'three_year', name: '3-Year Pro', durationMonths: 36, bestValue: true, price: 6999 },
      lifetime: { id: 'lifetime', name: 'Lifetime Pro', durationMonths: null, isOneTime: true, price: 9999 },
    },
  },
  // Canonical USD Reference / International
  US: {
    countryCode: 'US',
    countryName: 'International (USD)',
    flag: '🌐',
    currencyCode: 'USD',
    currencySymbol: '$',
    symbolPosition: 'prefix',
    decimalPlaces: 0,
    plans: {
      monthly: { id: 'monthly', name: 'Monthly Pro', durationMonths: 1, price: 19 },
      yearly: { id: 'yearly', name: 'Annual Pro', durationMonths: 12, recommended: true, price: 145 },
      two_year: { id: 'two_year', name: '2-Year Pro', durationMonths: 24, price: 345 },
      three_year: { id: 'three_year', name: '3-Year Pro', durationMonths: 36, bestValue: true, price: 449 },
      lifetime: { id: 'lifetime', name: 'Lifetime Pro', durationMonths: null, isOneTime: true, price: 699 },
    },
  },
};

export const SUPPORTED_COUNTRIES: CountryCode[] = ['IN', 'AE', 'SA', 'QA', 'OM', 'BH', 'KW', 'US'];
export const GCC_COUNTRIES: GCCCountryCode[] = ['AE', 'SA', 'QA', 'OM', 'BH', 'KW'];

export const STORAGE_KEY_COUNTRY = 'mms_pricing_country';

/**
 * Formats a number according to the country's currency conventions.
 * E.g., "AED 1,249", "₹249", "KWD 5.9", "$19".
 */
export function formatPrice(amount: number, countryCode: CountryCode): string {
  const config = PRICING_CONFIG[countryCode] || PRICING_CONFIG.US;
  
  // Format number with commas
  const formattedNumber = amount.toLocaleString('en-US', {
    minimumFractionDigits: config.decimalPlaces > 0 && amount % 1 !== 0 ? config.decimalPlaces : 0,
    maximumFractionDigits: config.decimalPlaces,
  });

  if (config.symbolPosition === 'prefix') {
    // Put space between currency symbol and amount if symbol is alphabetic (like AED, SAR, KWD), but no space for $ or ₹
    const space = /^[A-Z]{3}$/.test(config.currencySymbol) ? ' ' : '';
    return `${config.currencySymbol}${space}${formattedNumber}`;
  }
  return `${formattedNumber} ${config.currencySymbol}`;
}

export interface SavingsInfo {
  savingsAmount: number;
  savingsPercent: number;
  effectiveMonthlyPrice: number;
  formattedSavings: string;
  formattedEffectiveMonthly: string;
}

/**
 * Calculates mathematically accurate savings compared to the standard monthly price.
 * Returns null if duration is 1 month, lifetime, or if no positive savings exist.
 */
export function calculateSavings(
  planId: PlanId,
  countryCode: CountryCode
): SavingsInfo | null {
  const country = PRICING_CONFIG[countryCode] || PRICING_CONFIG.US;
  const plan = country.plans[planId];
  const monthlyPlan = country.plans.monthly;

  if (!plan.durationMonths || plan.durationMonths <= 1) {
    return null;
  }

  const baselineCost = monthlyPlan.price * plan.durationMonths;
  const savingsAmount = baselineCost - plan.price;

  if (savingsAmount <= 0) {
    return null;
  }

  const savingsPercent = Math.round((savingsAmount / baselineCost) * 100);
  const effectiveMonthlyPrice = Number((plan.price / plan.durationMonths).toFixed(country.decimalPlaces > 0 ? 1 : 0));

  return {
    savingsAmount,
    savingsPercent,
    effectiveMonthlyPrice,
    formattedSavings: formatPrice(savingsAmount, countryCode),
    formattedEffectiveMonthly: formatPrice(effectiveMonthlyPrice, countryCode),
  };
}

/**
 * Timezone-to-country mapping heuristic for initial detection.
 */
const TIMEZONE_COUNTRY_MAP: Record<string, CountryCode> = {
  'Asia/Dubai': 'AE',
  'Asia/Muscat': 'OM',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Bahrain': 'BH',
  'Asia/Kuwait': 'KW',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
};

/**
 * Detect visitor country heuristic without forcing.
 * Priority:
 * 1. Saved preference in localStorage
 * 2. TimeZone matching
 * 3. Default to 'IN' (or 'US' if outside)
 */
export function detectVisitorCountry(): CountryCode {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(STORAGE_KEY_COUNTRY) as CountryCode | null;
    if (saved && PRICING_CONFIG[saved]) {
      return saved;
    }
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_COUNTRY_MAP[tz]) {
      return TIMEZONE_COUNTRY_MAP[tz];
    }
  } catch {
    // ignore
  }

  return 'IN';
}

/**
 * Saves manual country selection preference.
 */
export function saveVisitorCountry(code: CountryCode): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_KEY_COUNTRY, code);
  }
}

/**
 * Server-side / trusted validation:
 * Verifies that the given plan and amount match the trusted configuration for the given country.
 */
export function validatePlanPrice(
  planId: PlanId,
  countryCode: CountryCode,
  submittedPrice: number
): boolean {
  const country = PRICING_CONFIG[countryCode];
  if (!country) return false;
  const plan = country.plans[planId];
  if (!plan) return false;

  // Floating-point tolerance check
  return Math.abs(plan.price - submittedPrice) < 0.001;
}
