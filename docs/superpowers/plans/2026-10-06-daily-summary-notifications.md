# Daily Summary Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide mobile shop owners with a short, friendly, and motivating daily closing summary notification via native PWA / Device Web Notifications celebrating today's revenue, net balance, and delivered repairs, with a customizable notification time in Settings and a test trigger.

**Architecture:** Client-side notification engine in `src/utils/notifications.ts` that calculates metrics from Dexie IndexedDB (`db.entries` and `db.repairs`), formats an English-only punchy milestone message, and dispatches via Service Worker / Notification API. SettingsScreen provides a time picker and toggle, while App.tsx schedules and checks catch-up dispatch.

**Tech Stack:** React, TypeScript, Dexie IndexedDB, Web Notifications API / Service Worker, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-06-daily-summary-notifications-design.md`

## Global Constraints
- Language: English copy only (no Malayalam in notification copy).
- Notification Tag: `daily-summary` (replaces previous notification rather than stacking).
- Single Dispatch: Fires at most once per calendar day (recorded in `localStorage.getItem('last_summary_notif_date')`), except when triggered via "Send Test Notification".
- Default Closing Time: `"20:30"` (8:30 PM).

## Review Focus
1. Environments where `window.Notification` is undefined (e.g. non-PWA iOS Safari) must not throw errors.
2. Quiet days with zero entries must show a friendly closing reminder without NaN or negative amounts.
3. Rapid clicking on "Send Test Notification" must reuse the notification tag `daily-summary` and avoid crash or unhandled promise rejection.
4. Changing notification time in Settings must clear any existing pending timeout and set the new schedule cleanly.
5. Inactive tabs or apps opened past the scheduled time on the same date must trigger the missed summary once.

---

### Task 1: Type Definitions & Core Notification Utility Engine

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/utils/notifications.ts`
- Create: `tests/notifications.test.ts`

**Interfaces:**
- Consumes: `db.entries`, `db.repairs`, `formatINR` from `src/i18n.ts`, `getLocalDateString` from `src/utils/date.ts`
- Produces:
  - `AppSettings.notificationsEnabled?: boolean`
  - `AppSettings.summaryNotificationTime?: string`
  - `buildDailySummaryMessage(summary: { inTotal: number; net: number; inCount: number; deliveredCount: number; shopName: string }): { title: string; body: string }`
  - `calculateDelayToTime(timeStr: string, now?: Date): number`
  - `getNotificationPermission(): NotificationPermission | 'unsupported'`
  - `requestNotificationPermission(): Promise<NotificationPermission>`
  - `triggerDailySummaryNotification(options?: { isTest?: boolean; shopName?: string }): Promise<boolean>`
  - `scheduleDailyNotification(timeStr: string, shopName: string): () => void`

- [ ] **Step 1: Write the failing tests in `tests/notifications.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildDailySummaryMessage,
  calculateDelayToTime,
  getNotificationPermission,
} from '../src/utils/notifications';

describe('Daily Summary Notification Engine', () => {
  describe('buildDailySummaryMessage', () => {
    it('formats summary with sales and delivered repairs', () => {
      const msg = buildDailySummaryMessage({
        inTotal: 4500,
        net: 3200,
        inCount: 8,
        deliveredCount: 3,
        shopName: 'Care Mobiles',
      });
      expect(msg.title).toBe('Today at Care Mobiles: ₹4,500 🎉');
      expect(msg.body).toBe('Net: ₹3,200 • 8 sales • 3 repairs delivered. Tap to review day book.');
    });

    it('formats summary with sales and 0 delivered repairs', () => {
      const msg = buildDailySummaryMessage({
        inTotal: 1200,
        net: 1200,
        inCount: 2,
        deliveredCount: 0,
        shopName: 'Care Mobiles',
      });
      expect(msg.title).toBe('Today at Care Mobiles: ₹1,200 🎉');
      expect(msg.body).toBe('Net: ₹1,200 • 2 sales. Tap to review day book.');
    });

    it('formats friendly fallback on quiet day with 0 transactions', () => {
      const msg = buildDailySummaryMessage({
        inTotal: 0,
        net: 0,
        inCount: 0,
        deliveredCount: 0,
        shopName: 'Care Mobiles',
      });
      expect(msg.title).toBe('Care Mobiles Closing Wrap-up 🌙');
      expect(msg.body).toBe("Ready to close today's accounts? Tap to check your day book.");
    });
  });

  describe('calculateDelayToTime', () => {
    it('calculates milliseconds until target time later today', () => {
      const mockNow = new Date(2026, 9, 6, 18, 0, 0); // 18:00
      const delay = calculateDelayToTime('20:30', mockNow);
      expect(delay).toBe(2.5 * 60 * 60 * 1000); // 2.5 hours in ms
    });

    it('returns 0 or negative if target time has already passed today', () => {
      const mockNow = new Date(2026, 9, 6, 21, 0, 0); // 21:00
      const delay = calculateDelayToTime('20:30', mockNow);
      expect(delay).toBeLessThan(0);
    });
  });

  describe('getNotificationPermission', () => {
    it('returns unsupported when Notification is not in window', () => {
      const originalNotification = window.Notification;
      // @ts-ignore
      delete window.Notification;
      expect(getNotificationPermission()).toBe('unsupported');
      window.Notification = originalNotification;
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/notifications.test.ts`
Expected: FAIL ("Cannot find module '../src/utils/notifications'")

- [ ] **Step 3: Update `src/types/index.ts` and implement `src/utils/notifications.ts`**

In `src/types/index.ts`:
Add to `AppSettings`:
```ts
  notificationsEnabled?: boolean;
  summaryNotificationTime?: string; // HH:mm format, default '20:30'
```

In `src/utils/notifications.ts`:
```ts
import { db, computeSummary } from '../db/db';
import { formatINR } from '../i18n';
import { getLocalDateString } from './date';

export const LAST_NOTIFICATION_DATE_KEY = 'last_summary_notif_date';

export interface SummaryMessagePayload {
  inTotal: number;
  net: number;
  inCount: number;
  deliveredCount: number;
  shopName: string;
}

export function buildDailySummaryMessage(payload: SummaryMessagePayload): { title: string; body: string } {
  const { inTotal, net, inCount, deliveredCount, shopName } = payload;
  const name = shopName || 'My Mobile Shop';

  if (inCount === 0 && inTotal === 0 && deliveredCount === 0) {
    return {
      title: `${name} Closing Wrap-up 🌙`,
      body: "Ready to close today's accounts? Tap to check your day book.",
    };
  }

  const title = `Today at ${name}: ₹${formatINR(inTotal)} 🎉`;
  const repairPart = deliveredCount > 0 ? ` • ${deliveredCount} repair${deliveredCount > 1 ? 's' : ''} delivered` : '';
  const body = `Net: ₹${formatINR(net)} • ${inCount} sale${inCount !== 1 ? 's' : ''}${repairPart}. Tap to review day book.`;

  return { title, body };
}

export function calculateDelayToTime(timeStr: string, now: Date = new Date()): number {
  const [hoursStr, minutesStr] = (timeStr || '20:30').split(':');
  const targetHours = parseInt(hoursStr, 10) || 20;
  const targetMinutes = parseInt(minutesStr, 10) || 30;

  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetHours, targetMinutes, 0, 0);
  return targetDate.getTime() - now.getTime();
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return 'denied';
  }
}

export async function triggerDailySummaryNotification(options?: {
  isTest?: boolean;
  shopName?: string;
}): Promise<boolean> {
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;
  if (!isSupported) return false;

  if (Notification.permission !== 'granted') {
    return false;
  }

  const today = getLocalDateString();
  const lastSentDate = localStorage.getItem(LAST_NOTIFICATION_DATE_KEY);

  if (!options?.isTest && lastSentDate === today) {
    return false;
  }

  try {
    // 1. Fetch entries for today
    const entries = await db.entries.where('date').equals(today).toArray();
    const activeEntries = entries.filter((e) => !e.deletedAt && e.syncStatus !== 'deleted');
    const summary = computeSummary(activeEntries);

    // 2. Fetch delivered repairs for today
    let deliveredCount = 0;
    try {
      const repairs = await db.repairs.toArray();
      deliveredCount = repairs.filter(
        (r) => !r.deletedAt && r.status === 'delivered' && (r.deliveryDate === today || (!r.deliveryDate && r.updatedAt && new Date(r.updatedAt).toISOString().split('T')[0] === today))
      ).length;
    } catch (e) {
      // db.repairs might be empty or optional
    }

    const { title, body } = buildDailySummaryMessage({
      inTotal: summary.inTotal,
      net: summary.net,
      inCount: summary.inCount,
      deliveredCount,
      shopName: options?.shopName || 'My Mobile Shop',
    });

    const notifOptions: NotificationOptions = {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'daily-summary',
      data: { url: '/' },
    };

    // Prefer service worker registration if available
    let shownViaSW = false;
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
          await reg.showNotification(title, notifOptions);
          shownViaSW = true;
        }
      } catch (swErr) {
        console.warn('SW showNotification failed, falling back to Notification constructor:', swErr);
      }
    }

    if (!shownViaSW) {
      new Notification(title, notifOptions);
    }

    if (!options?.isTest) {
      localStorage.setItem(LAST_NOTIFICATION_DATE_KEY, today);
    }

    return true;
  } catch (err) {
    console.error('Error triggering daily summary notification:', err);
    return false;
  }
}

export function scheduleDailyNotification(timeStr: string, shopName: string): () => void {
  const delay = calculateDelayToTime(timeStr);
  const today = getLocalDateString();
  const lastSentDate = localStorage.getItem(LAST_NOTIFICATION_DATE_KEY);

  let timerId: NodeJS.Timeout | null = null;

  if (delay > 0) {
    timerId = setTimeout(async () => {
      await triggerDailySummaryNotification({ shopName });
    }, delay);
  } else if (delay <= 0 && lastSentDate !== today) {
    // If opened after target time today and hasn't fired yet, fire shortly after mount
    timerId = setTimeout(async () => {
      await triggerDailySummaryNotification({ shopName });
    }, 3000);
  }

  return () => {
    if (timerId) clearTimeout(timerId);
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/notifications.test.ts`
Expected: PASS (all tests pass)

- [ ] **Step 5: Commit changes**

Run: `git add src/types/index.ts src/utils/notifications.ts tests/notifications.test.ts ; git commit -m "feat(notifications): add core daily summary notification utility engine"`

---

### Task 2: Settings UI - Custom Time Picker, Toggle & Test Trigger

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/i18n.ts` (if notification labels needed, in English)
- Modify: `tests/notifications.test.ts` (add settings UI contract test)

**Interfaces:**
- Consumes: `getNotificationPermission`, `requestNotificationPermission`, `triggerDailySummaryNotification`, `AppSettings`
- Produces: Daily Summary Notification card in Settings with time picker, enable toggle, and test notification button.

- [ ] **Step 1: Write UI contract test in `tests/notifications.test.ts`**

```ts
import fs from 'fs';
import path from 'path';

describe('SettingsScreen Notification UI Contract', () => {
  it('contains notification toggle, custom time picker, and test button', () => {
    const settingsPath = path.resolve(__dirname, '../src/screens/SettingsScreen.tsx');
    const content = fs.readFileSync(settingsPath, 'utf-8');

    expect(content).toContain('Daily Summary Notification');
    expect(content).toContain('summaryNotificationTime');
    expect(content).toContain('Send Test Notification');
    expect(content).toContain('triggerDailySummaryNotification');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/notifications.test.ts`
Expected: FAIL (SettingsScreen does not contain notification section yet)

- [ ] **Step 3: Add `DailySummaryNotificationSection` in `src/screens/SettingsScreen.tsx`**

Add component:
```tsx
const DailyNotificationSection: React.FC<{
  settings: AppSettings;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
}> = ({ settings, onUpdateSettings }) => {
  const [permission, setPermission] = useState(getNotificationPermission());
  const [testSent, setTestSent] = useState(false);
  const isSupported = permission !== 'unsupported';
  const isEnabled = Boolean(settings.notificationsEnabled && permission === 'granted');
  const currentTime = settings.summaryNotificationTime || '20:30';

  const handleToggle = async () => {
    if (!isSupported) return;
    if (permission !== 'granted') {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === 'granted') {
        onUpdateSettings((prev) => ({ ...prev, notificationsEnabled: true }));
      }
    } else {
      onUpdateSettings((prev) => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }));
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    onUpdateSettings((prev) => ({ ...prev, summaryNotificationTime: newTime }));
  };

  const handleSendTest = async () => {
    if (permission !== 'granted') {
      const res = await requestNotificationPermission();
      setPermission(res);
      if (res !== 'granted') return;
    }
    const success = await triggerDailySummaryNotification({ isTest: true, shopName: settings.shopName });
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  return (
    <div className="bg-white rounded-[14px] p-4 shadow-sm border border-black/[0.04] mb-3">
      <div className="flex items-center space-x-2 text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-3">
        <Bell className="w-4 h-4 text-iosBlue" />
        <span>Daily Summary Notification</span>
      </div>
      ...
    </div>
  );
};
```
Integrate inside SettingsScreen under AppUpdatesSection.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/notifications.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

Run: `git add src/screens/SettingsScreen.tsx tests/notifications.test.ts ; git commit -m "feat(settings): add daily summary notification controls and test trigger"`

---

### Task 3: App Lifecycle Integration - Startup Scheduling & Catch-up Trigger

**Files:**
- Modify: `src/App.tsx`
- Modify: `tests/notifications.test.ts` (lifecycle contract tests)

**Interfaces:**
- Consumes: `scheduleDailyNotification` from `src/utils/notifications.ts`
- Produces: active scheduling on app mount and time change

- [ ] **Step 1: Write App lifecycle test in `tests/notifications.test.ts`**

```ts
it('App.tsx schedules daily summary notifications on mount', () => {
  const appPath = path.resolve(__dirname, '../src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  expect(appContent).toContain('scheduleDailyNotification');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/notifications.test.ts`
Expected: FAIL (`App.tsx` does not include `scheduleDailyNotification` yet)

- [ ] **Step 3: Wire `scheduleDailyNotification` into `src/App.tsx`**

In `src/App.tsx`:
Add an effect:
```tsx
useEffect(() => {
  if (settings.notificationsEnabled) {
    const cancel = scheduleDailyNotification(
      settings.summaryNotificationTime || '20:30',
      settings.shopName
    );
    return () => cancel();
  }
}, [settings.notificationsEnabled, settings.summaryNotificationTime, settings.shopName]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/notifications.test.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

Run: `git add src/App.tsx tests/notifications.test.ts ; git commit -m "feat(app): schedule daily summary notifications on app lifecycle"`

---

### Task 4: Full Test Suite & Production Build Verification

**Files:**
- All files touched in Tasks 1-3

- [ ] **Step 1: Run full Vitest test suite**

Run: `npm test`
Expected: PASS (all 115+ tests pass with zero regressions)

- [ ] **Step 2: Run production TypeScript and Vite build**

Run: `npm run build`
Expected: Exit code 0, dist generated cleanly.

- [ ] **Step 3: Commit and push changes**

Run: `git push origin main`
Deploy to Vercel: `npx vercel --prod --yes`
