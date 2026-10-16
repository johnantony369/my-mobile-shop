# MMS GCC Pricing & Pro Plans Implementation Plan

## Overview
Update the My Mobile Shop (MMS) pricing system to support five Pro plans (Monthly, Annual, 2-Year, 3-Year, Lifetime) and localized pricing for six GCC countries (UAE, Saudi Arabia, Qatar, Oman, Bahrain, Kuwait), while strictly preserving Indian pricing (₹249/mo, ₹2,499/yr), canonical USD pricing, and existing checkout/entitlement workflows.

## Proposed Changes

### 1. Centralized Pricing Configuration & Validation (`src/utils/pricing.ts`)
- Define typed schemas for `PlanId` (`'monthly' | 'yearly' | 'two_year' | 'three_year' | 'lifetime'`).
- Define `CountryCode` (`'AE' | 'SA' | 'QA' | 'OM' | 'BH' | 'KW' | 'IN' | 'US'`).
- Centralize immutable fixed prices:
  - Canonical USD: $19, $145, $345, $449, $699.
  - GCC Markets:
    - UAE (AED): 69, 529, 1,249, 1,649, 2,499.
    - Saudi Arabia (SAR): 69, 529, 1,299, 1,699, 2,599.
    - Qatar (QAR): 69, 529, 1,249, 1,649, 2,499.
    - Oman (OMR): 7, 53, 129, 169, 269.
    - Bahrain (BHD): 7, 53, 129, 169, 259.
    - Kuwait (KWD): 5.9, 44, 209, 279, 429.
  - India (INR): ₹249, ₹2,499, ₹4,999, ₹6,999, ₹9,999.
- Implement formatting with localized currency symbols and numbers (`formatPrice`).
- Implement mathematically accurate savings calculations (`calculateSavings`).
- Implement visitor country detection (timezone + locale heuristics) with manual override and `localStorage` persistence.
- Implement trusted server/utility price validation (`validatePlanPrice`) to reject client price tampering.

### 2. Pro Plan Entitlements & Durations (`src/utils/proPlan.ts` & `src/types/index.ts`)
- Expand `ProPlan` type to include `'two_year'` and `'three_year'`.
- Update `computeProExpiry` to handle 24 months (`two_year`) and 36 months (`three_year`).
- Ensure `lifetime` remains null expiry (never expires).
- Update `PRO_PLANS` and `PRO_PLAN_LABELS`.
- Update `ProPlanDialog.tsx` to support all five plans in superadmin management.

### 3. Landing Page Pricing Section (`src/screens/LandingPage.tsx`)
- Add Country Selector with flags, country names, and currency codes.
- Render all five Pro plans in a responsive grid.
- Highlight badges:
  - **Recommended** on Annual Pro.
  - **Best Value** on 3-Year Pro.
  - **One-time payment** on Lifetime Pro.
- Display verified savings claims, billing durations, and renewal terms.
- Preserve existing navigation, auth, and styling tokens.

### 4. In-App Paywall Modal (`src/components/PaywallModal.tsx`)
- Support country selection and localized 5-plan selection.
- Preserve working Razorpay checkout for INR Monthly (₹249) and Yearly (₹2,499).
- For GCC currencies and multi-year/lifetime plans where fixed payment links are not configured, display transparent instructions with support activation link (WhatsApp/Email) without fake simulations.

### 5. Verification & Tests
- Add comprehensive test suite in `tests/pricing.test.ts`.
- Update `tests/proPlan.test.ts` and `tests/landingPage.test.ts`.
- Run full test suite (`npm run test`) and type check (`npm run build`).
