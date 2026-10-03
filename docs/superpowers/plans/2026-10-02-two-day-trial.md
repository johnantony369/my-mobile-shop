# 2-Day Trial Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the free trial period from 14 days to 2 days across the application, adding strict unit test coverage, a centralized trial constant, and polished day count formatting.

**Architecture:** Centralize the trial duration configuration into an exported constant `TRIAL_DURATION_DAYS = 2` in `src/utils/activation.ts`. Update the day calculation logic in `getTrialDaysRemaining()`. Support singular/plural phrasing ("1 day remaining" vs "2 days remaining") in `i18n.ts` and `SettingsScreen.tsx`. Ensure comprehensive test coverage via Vitest.

**Tech Stack:** React, TypeScript, Vitest, Dexie.js (IndexedDB).

**Spec:** Inline requirement from user request: "change the trial to only 2 days" while maintaining read-only lockout behavior when expired.

## Global Constraints

- Preserve all existing activation code verification and Superadmin toggle behaviors.
- Ensure trial count never drops below 0.
- Existing records must remain fully readable and exportable when trial expires.
- Zero external CSS or third-party animation libraries; strictly maintain existing styling standards.

## Review Focus

1. **Brand new user / First launch date missing**: `getTrialDaysRemaining('')` must return exactly `2`.
2. **First day of use (launch date is today)**: Difference is 0 days, returns `2` days remaining.
3. **Second day of use (launch date was yesterday)**: Difference is 1 day, returns `1` day remaining.
4. **Third day of use (launch date 2 days ago)**: Difference is 2 days, returns `0` days remaining and activates `isReadOnly = true`.
5. **Singular grammar formatting**: Display "1 day remaining" instead of "1 days remaining".

---

### Task 1: Create Vitest Unit Tests for Trial Calculation and Activation

**Files:**
- Create: `tests/activation.test.ts`
- Modify: `src/utils/activation.ts`

**Interfaces:**
- Consumes: `getTrialDaysRemaining(firstLaunchDateStr: string): number`
- Consumes: `TRIAL_DURATION_DAYS: number`
- Consumes: `checkCode(code: string): boolean`
- Consumes: `generateValidCode(): string`

- [ ] **Step 1: Write the failing tests in `tests/activation.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  TRIAL_DURATION_DAYS,
  getTrialDaysRemaining,
  checkCode,
  generateValidCode,
} from '../src/utils/activation';

describe('Trial duration & calculation', () => {
  it('should define TRIAL_DURATION_DAYS as 2', () => {
    expect(TRIAL_DURATION_DAYS).toBe(2);
  });

  it('should return 2 days when firstLaunchDate is empty or undefined', () => {
    expect(getTrialDaysRemaining('')).toBe(2);
  });

  it('should return 2 days when launched today', () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(getTrialDaysRemaining(todayStr)).toBe(2);
  });

  it('should return 1 day when launched yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    expect(getTrialDaysRemaining(yesterdayStr)).toBe(1);
  });

  it('should return 0 days (expired) when launched 2 days ago', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;
    expect(getTrialDaysRemaining(twoDaysAgoStr)).toBe(0);
  });

  it('should return 0 days (never negative) when launched 10 days ago', () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const str = `${tenDaysAgo.getFullYear()}-${String(tenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(tenDaysAgo.getDate()).padStart(2, '0')}`;
    expect(getTrialDaysRemaining(str)).toBe(0);
  });
});

describe('Activation code verification', () => {
  it('should generate valid activation codes that pass checkCode', () => {
    const code = generateValidCode();
    expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(checkCode(code)).toBe(true);
  });

  it('should reject invalid activation codes', () => {
    expect(checkCode('')).toBe(false);
    expect(checkCode('INVALID-CODE-HERE')).toBe(false);
    expect(checkCode('1234-5678-9012-3456')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/activation.test.ts`
Expected: FAIL because `TRIAL_DURATION_DAYS` is not exported yet and `getTrialDaysRemaining` returns 14.

- [ ] **Step 3: Commit the test file**

```bash
git add tests/activation.test.ts
git commit -m "test: add unit tests for 2-day trial and activation utils"
```

---

### Task 2: Implement 2-Day Trial Constant and Update Calculation

**Files:**
- Modify: `src/utils/activation.ts:50-67`

**Interfaces:**
- Produces: `export const TRIAL_DURATION_DAYS = 2;`
- Produces: `export function getTrialDaysRemaining(firstLaunchDateStr: string): number`

- [ ] **Step 1: Update `src/utils/activation.ts` to export `TRIAL_DURATION_DAYS = 2` and use it**

Replace lines 50-67 in `src/utils/activation.ts` with:
```typescript
export const TRIAL_DURATION_DAYS = 2;

/**
 * Calculates remaining trial days given the first launch date string ('YYYY-MM-DD').
 * Trial lasts TRIAL_DURATION_DAYS (2 days) from first launch.
 */
export function getTrialDaysRemaining(firstLaunchDateStr: string): number {
  if (!firstLaunchDateStr) return TRIAL_DURATION_DAYS;
  const firstLaunch = new Date(firstLaunchDateStr);
  const now = new Date();
  
  // Normalize both to midnight local time for exact calendar day counting
  const d1 = new Date(firstLaunch.getFullYear(), firstLaunch.getMonth(), firstLaunch.getDate()).getTime();
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  const remaining = TRIAL_DURATION_DAYS - diffDays;
  return Math.max(0, remaining);
}
```

- [ ] **Step 2: Run Vitest on `tests/activation.test.ts` to verify tests pass**

Run: `npx vitest run tests/activation.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 3: Commit changes**

```bash
git add src/utils/activation.ts
git commit -m "feat: set trial duration to 2 days"
```

---

### Task 3: Improve Singular/Plural Trial Copy in i18n & Settings UI

**Files:**
- Modify: `src/i18n.ts`
- Modify: `src/screens/SettingsScreen.tsx:540-553`

**Interfaces:**
- Consumes: `t('trial_day_remaining', language)`
- Consumes: `t('trial_days_remaining', language, { days: trialDays })`

- [ ] **Step 1: Add singular trial translation key to `src/i18n.ts`**

Add `trial_day_remaining`:
```typescript
  trial_day_remaining: {
    en: 'Free Trial: 1 day remaining',
  },
  trial_days_remaining: {
    en: 'Free Trial: {days} days remaining',
  },
```

- [ ] **Step 2: Update `SettingsScreen.tsx` to handle singular / plural**

Update line 549-551 in `src/screens/SettingsScreen.tsx`:
```tsx
                <span className="text-xs font-semibold">
                  {isExpired
                    ? t('trial_expired', language)
                    : trialDays === 1
                    ? t('trial_day_remaining', language)
                    : t('trial_days_remaining', language, { days: trialDays })}
                </span>
```

- [ ] **Step 3: Verify the entire test suite and build**

Run: `npm test`
Run: `npm run build`
Expected: All 17 test suites pass, build succeeds with 0 errors.

- [ ] **Step 4: Commit changes**

```bash
git add src/i18n.ts src/screens/SettingsScreen.tsx
git commit -m "fix(ui): show singular day remaining when 1 day left of trial"
```
