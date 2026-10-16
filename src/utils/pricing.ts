export type PlanId = 'monthly' | 'yearly' | 'two_year' | 'three_year' | 'lifetime';

export type CountryCode = 'IN' | 'US';

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
  currencyCode: string;
  currencySymbol: string;
  symbolPosition: 'prefix' | 'suffix';
  decimalPlaces: number;
  plans: Record<PlanId, PlanConfig>;
}

/**
 * Centralized, typed pricing matrix.
 * Supported currencies:
 * - India: INR (₹249/month, ₹2,499/year)
 * - International: USD ($19/month, $145/year)
 */
export const PRICING_CONFIG: Record<CountryCode, CountryPricingConfig> = {
  // India (Preserved)
  IN: {
    countryCode: 'IN',
    countryName: 'India',
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
  // Canonical USD Reference / International (Used for all international markets including GCC)
  US: {
    countryCode: 'US',
    countryName: 'International (USD)',
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

export const SUPPORTED_COUNTRIES: CountryCode[] = ['IN', 'US'];

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
 * Indian timezones map to 'IN'; all international markets map to 'US'.
 */
const TIMEZONE_COUNTRY_MAP: Record<string, CountryCode> = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
};

/**
 * Detect visitor country heuristic without forcing.
 * Priority:
 * 1. Saved preference in localStorage
 * 2. TimeZone matching (India -> IN, All other markets -> US)
 * 3. Default to 'US'
 */
function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Detect visitor country heuristic without forcing.
 * Priority:
 * 1. Saved preference in localStorage
 * 2. TimeZone matching
 * 3. Default to 'US' (or 'IN' if Indian timezone detected)
 */
export function detectVisitorCountry(): CountryCode {
  const storage = getStorage();
  if (storage) {
    const saved = storage.getItem(STORAGE_KEY_COUNTRY);
    if (saved === 'IN') return 'IN';
    if (saved === 'US') return 'US';
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_COUNTRY_MAP[tz]) {
      return TIMEZONE_COUNTRY_MAP[tz];
    }
  } catch {
    // ignore
  }

  return 'US';
}

/**
 * Saves manual country selection preference.
 */
export function saveVisitorCountry(code: CountryCode): void {
  const storage = getStorage();
  if (storage) {
    storage.setItem(STORAGE_KEY_COUNTRY, code);
  }
}

let cachedAutoCountry: CountryCode | null = null;

export interface ResolveGeoOptions {
  bypassCache?: boolean;
  timeoutMs?: number;
}

/**
 * Reset cached country (primarily for unit tests).
 */
export function _resetCachedAutoCountry(): void {
  cachedAutoCountry = null;
}

/**
 * Resolves visitor country automatically.
 * Priority:
 * 1. Explicit user selection saved in localStorage.
 * 2. In-memory cached result from previous resolution.
 * 3. Vercel edge geolocation (/api/geo).
 * 4. Client timezone heuristic (detectVisitorCountry).
 * 5. Default to 'IN'.
 */
export async function resolveVisitorCountry(options: ResolveGeoOptions = {}): Promise<CountryCode> {
  const storage = getStorage();
  if (storage) {
    const saved = storage.getItem(STORAGE_KEY_COUNTRY);
    if (saved === 'IN') return 'IN';
    if (saved === 'US') return 'US';
  }

  if (!options.bypassCache && cachedAutoCountry && PRICING_CONFIG[cachedAutoCountry]) {
    return cachedAutoCountry;
  }

  const timeoutMs = options.timeoutMs ?? 1500;

  try {
    if (typeof fetch !== 'undefined') {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      try {
        if (controller) {
          timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        }

        const res = await fetch('/api/geo', {
          signal: controller ? controller.signal : undefined,
        });

        if (res.ok) {
          const data = await res.json();
          const code = (data?.country || '').toUpperCase();
          if (code === 'IN') {
            cachedAutoCountry = 'IN';
            return 'IN';
          }
          // All other international markets (including GCC) route to US (USD)
          cachedAutoCountry = 'US';
          return 'US';
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }
  } catch {
    // Timeout, offline, or local dev: fall back smoothly
  }

  const fallback = detectVisitorCountry();
  cachedAutoCountry = fallback;
  return fallback;
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
