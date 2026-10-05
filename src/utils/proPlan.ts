/**
 * Pro subscription plans (granted by superadmin or via activation code).
 *
 * - lifetime: never expires (proExpiresAt is null)
 * - monthly:  1 calendar month
 * - yearly:   12 calendar months
 *
 * Accounts activated before plans existed have `activated: true` and no
 * `proExpiresAt`, which is treated as lifetime.
 */
export type ProPlan = 'monthly' | 'yearly' | 'lifetime';

export const PRO_PLANS: ProPlan[] = ['monthly', 'yearly', 'lifetime'];

export const PRO_PLAN_LABELS: Record<ProPlan, string> = {
  monthly: 'Monthly',
  yearly: 'Yearly',
  lifetime: 'Lifetime',
};

/** Adds calendar months, clamping the day (e.g. Jan 31 + 1 month = Feb 28/29). */
export function addMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

/**
 * Computes the ISO expiry timestamp for a plan, or null for lifetime.
 * When renewing a still-running time-limited plan, pass its current expiry as
 * `currentExpiresAt` so the remaining time is extended rather than lost.
 */
export function computeProExpiry(
  plan: ProPlan,
  now: Date = new Date(),
  currentExpiresAt?: string | null
): string | null {
  if (plan === 'lifetime') return null;
  let base = now;
  if (currentExpiresAt) {
    const current = new Date(currentExpiresAt);
    if (!isNaN(current.getTime()) && current.getTime() > now.getTime()) {
      base = current;
    }
  }
  return addMonths(base, plan === 'monthly' ? 1 : 12).toISOString();
}

interface ProState {
  activated?: boolean | null;
  proExpiresAt?: string | null;
}

/** True when Pro is switched on and has not expired. */
export function isProCurrentlyActive(state: ProState | null | undefined, now: Date = new Date()): boolean {
  if (!state || !state.activated) return false;
  if (!state.proExpiresAt) return true; // lifetime / legacy activation
  const expiry = new Date(state.proExpiresAt).getTime();
  if (isNaN(expiry)) return true;
  return expiry > now.getTime();
}

/** True when a time-limited plan was granted but has run out. */
export function isProExpired(state: ProState | null | undefined, now: Date = new Date()): boolean {
  return !!state && !!state.activated && !!state.proExpiresAt && !isProCurrentlyActive(state, now);
}

/** Whole days left until expiry (0 if expired, null for lifetime). */
export function proDaysRemaining(state: ProState | null | undefined, now: Date = new Date()): number | null {
  if (!state || !state.proExpiresAt) return null;
  const diff = new Date(state.proExpiresAt).getTime() - now.getTime();
  if (isNaN(diff)) return null;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function formatProExpiry(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Never';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}
