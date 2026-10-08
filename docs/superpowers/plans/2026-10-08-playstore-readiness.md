# Play Store Readiness & Android Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform "My Mobile Shop" (MMS) from a web PWA into a fully compliant, production-ready Android App Bundle (`.aab`) ready for submission to the Google Play Store.

**Architecture:** Implement required Google Play policies in the React/Vite frontend (standalone privacy policy and terms routes, mandatory account & cloud data deletion, payment policy compliance hiding external checkout links on Android), optimize mobile routing/UX (bypass landing page in app mode, suppress PWA install prompts, handle Android hardware back button), and wrap the application using Capacitor to produce an offline-first native Android project.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Dexie (IndexedDB), Firebase Auth & Firestore, Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`).

**Spec:** Google Play Developer Program Policies (Payments Policy, App Account Deletion Policy, User Data Policy) and Google Play Console Release Guidelines (Target API 34+, Android App Bundle `.aab`).

---

## Global Constraints
- **NEVER** push to Git (`git push`) or deploy to external hosts (`vercel`) unless explicitly requested.
- Keep all existing 56 test suites (267 tests) passing with 0 regressions.
- Preserve local-first architecture and Dexie offline capabilities.
- Do not break existing web experience on desktop or mobile browser.

---

## Review Focus
1. **Unauthenticated Access to Legal Pages:** `/privacy`, `/terms`, and `/delete-account` must be directly accessible without being blocked by auth guards or redirects so Google's automated scanners and reviewers can inspect them.
2. **Account Deletion Safety:** Deleting an account must erase both cloud data in Firestore and local IndexedDB, sign the user out, and handle re-authentication if credentials have expired.
3. **Play Store Payment Compliance:** When running in Android native / standalone mode, direct external checkout URLs (Razorpay links) must NOT be displayed to avoid immediate Google Play rejection under the In-App Billing policy.
4. **Android App First Launch:** When launched as an Android app, the app must not display the web promotional Landing Page or the "Install PWA" banner.
5. **Offline Cold Start:** The Capacitor-wrapped app must boot up and remain functional completely offline from local bundle assets.

---

## Task Structure

### Task 1: Standalone Public Legal Routes (/privacy and /terms)

**Files:**
- Create: `src/screens/legal/PrivacyScreen.tsx`
- Create: `src/screens/legal/TermsScreen.tsx`
- Modify: `src/AppRouter.tsx`
- Test: `tests/legalRoutes.test.tsx`

**Interfaces:**
- Produces: `<PrivacyScreen />` and `<TermsScreen />` components rendering public, unauthenticated policy pages.
- Consumes: Route registrations in `AppRouter`.

- [ ] **Step 1: Write the failing test for legal routes**

Create `tests/legalRoutes.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PrivacyScreen } from '../src/screens/legal/PrivacyScreen';
import { TermsScreen } from '../src/screens/legal/TermsScreen';

describe('Public Legal Screens', () => {
  it('renders PrivacyScreen with required sections and support contact', () => {
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <Routes>
          <Route path="/privacy" element={<PrivacyScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Privacy Policy/i)).toBeDefined();
    expect(screen.getByText(/support@mymobileshop.online/i)).toBeDefined();
    expect(screen.getByText(/IndexedDB/i)).toBeDefined();
  });

  it('renders TermsScreen with required terms', () => {
    render(
      <MemoryRouter initialEntries={['/terms']}>
        <Routes>
          <Route path="/terms" element={<TermsScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Terms of Service/i)).toBeDefined();
    expect(screen.getByText(/My Mobile Shop/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/legalRoutes.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement PrivacyScreen and TermsScreen**

Create `src/screens/legal/PrivacyScreen.tsx` and `src/screens/legal/TermsScreen.tsx` with clean, responsive, standalone layout (readable on mobile and desktop, includes logo, back button, last updated date, and contact email).

- [ ] **Step 4: Register routes in AppRouter.tsx**

Add `/privacy` and `/terms` to `<Routes>` in `src/AppRouter.tsx` outside auth guards.

- [ ] **Step 5: Run tests and verify they pass**

Run: `npm run test -- tests/legalRoutes.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/legal/ tests/legalRoutes.test.tsx src/AppRouter.tsx
git commit -m "feat(legal): add standalone public /privacy and /terms routes"
```

---

### Task 2: Account & Cloud Data Deletion (Google Policy Mandatory)

**Files:**
- Create: `src/firebase/accountDeletion.ts`
- Create: `src/screens/legal/DeleteAccountScreen.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/AppRouter.tsx`
- Test: `tests/accountDeletion.test.ts`

**Interfaces:**
- Produces: `deleteUserAccountAndData(userId: string): Promise<{ success: boolean; error?: string }>`
- Produces: `<DeleteAccountScreen />` accessible at `/delete-account`.
- Modifies: `SettingsScreen.tsx` to include an in-app "Delete Account & Shop Data" button with confirmation modal.

- [ ] **Step 1: Write the failing test for account deletion logic**

Create `tests/accountDeletion.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { deleteUserAccountAndData } from '../src/firebase/accountDeletion';

describe('Account Deletion Service', () => {
  it('clears cloud user profile and local storage on account deletion', async () => {
    const mockAuthUser = {
      uid: 'user_123',
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const mockDeleteDoc = vi.fn().mockResolvedValue(undefined);
    const mockClearLocal = vi.fn().mockResolvedValue(undefined);

    const result = await deleteUserAccountAndData({
      user: mockAuthUser as any,
      deleteDocFn: mockDeleteDoc,
      clearLocalDbFn: mockClearLocal,
    });

    expect(result.success).toBe(true);
    expect(mockDeleteDoc).toHaveBeenCalled();
    expect(mockAuthUser.delete).toHaveBeenCalled();
    expect(mockClearLocal).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/accountDeletion.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement accountDeletion.ts**

Implement `src/firebase/accountDeletion.ts` handling:
- Deletion of `users/{uid}` in Firestore.
- Calling `user.delete()` on Firebase Auth.
- Calling `clearLocalDatabase()` to wipe IndexedDB.
- Handling `auth/requires-recent-login` by returning appropriate prompt to re-login.

- [ ] **Step 4: Implement DeleteAccountScreen.tsx and register route**

Create `src/screens/legal/DeleteAccountScreen.tsx` explaining:
- What data is stored (profile, day book records, cloud backups).
- How users can delete data directly in the app.
- How users can submit an email request to `support@mymobileshop.online` to delete their account without the app.
- Register route `/delete-account` in `src/AppRouter.tsx`.

- [ ] **Step 5: Add Delete Account option in SettingsScreen.tsx**

Add a red "Delete Account & Data" action in the Danger Zone of `SettingsScreen.tsx` with a two-step confirmation modal.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -- tests/accountDeletion.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/firebase/accountDeletion.ts src/screens/legal/DeleteAccountScreen.tsx src/screens/SettingsScreen.tsx src/AppRouter.tsx tests/accountDeletion.test.ts
git commit -m "feat(compliance): implement in-app and web account deletion"
```

---

### Task 3: Google Play Payment Policy Compliance in Paywall

**Files:**
- Create: `src/utils/platform.ts`
- Modify: `src/components/PaywallModal.tsx`
- Test: `tests/paywallPlatform.test.ts`

**Interfaces:**
- Produces: `isAndroidNativeApp(): boolean`
- Consumes: `PaywallModal.tsx` checks `isAndroidNativeApp()`. If true, hides external Razorpay checkout buttons and displays "Redeem Code / Offline Activation" instructions.

- [ ] **Step 1: Write failing test for platform detection and paywall display**

Create `tests/paywallPlatform.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isAndroidNativeApp } from '../src/utils/platform';

describe('Platform Detection', () => {
  it('detects android app wrapper when Capacitor or TWA indicator is present', () => {
    expect(isAndroidNativeApp({ isCapacitor: true })).toBe(true);
    expect(isAndroidNativeApp({ referrer: 'android-app://online.mymobileshop.app' })).toBe(true);
    expect(isAndroidNativeApp({ isCapacitor: false, referrer: '' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/paywallPlatform.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement platform.ts**

Implement `src/utils/platform.ts` with robust checks for Capacitor (`(window as any).Capacitor?.isNativePlatform()`), TWA referrer (`document.referrer.startsWith('android-app://')`), and standalone mode on Android.

- [ ] **Step 4: Update PaywallModal.tsx**

In `PaywallModal.tsx`, check `isAndroidNativeApp()`.
- If true: Hide direct `rzp.io` payment links to strictly comply with Google Play Payments Policy. Emphasize "Activate with Code" (license key purchased via web or authorized merchant) and WhatsApp support.
- If false (web browser): Continue showing the existing Razorpay checkout buttons.

- [ ] **Step 5: Run tests and verify they pass**

Run: `npm run test -- tests/paywallPlatform.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/utils/platform.ts src/components/PaywallModal.tsx tests/paywallPlatform.test.ts
git commit -m "feat(compliance): make paywall compliant with Google Play billing policy"
```

---

### Task 4: Android App Launch Routing & PWA Banner Suppression

**Files:**
- Modify: `src/AppRouter.tsx`
- Modify: `src/utils/usePWAInstall.ts`
- Test: `tests/androidAppRouting.test.ts`

**Interfaces:**
- Consumes: `isAndroidNativeApp()` from `platform.ts`.
- Behavior:
  - If `isAndroidNativeApp()` is true and user opens `/`, immediately redirect to `/app` (or `/login`).
  - In `usePWAInstall.ts`, `showBanner` is always false when `isAndroidNativeApp()` is true.

- [ ] **Step 1: Write test for Android app routing and banner suppression**

Create `tests/androidAppRouting.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/androidAppRouting.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement routing and banner suppression**

- In `src/AppRouter.tsx`: update `LandingRouteWrapper` so if `isAndroidNativeApp()` is true, redirect immediately to `/app`.
- In `src/utils/usePWAInstall.ts`: ensure `isAndroidNativeApp()` marks `isInstalled = true`, preventing banner from showing.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/androidAppRouting.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/AppRouter.tsx src/utils/usePWAInstall.ts tests/androidAppRouting.test.ts
git commit -m "feat(ux): bypass landing page and suppress PWA banner in native app"
```

---

### Task 5: Capacitor Project Initialization & Android Hardware Back Button

**Files:**
- Create: `capacitor.config.ts`
- Create: `src/utils/hardwareBackButton.ts`
- Modify: `src/App.tsx`
- Dependencies: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/app`

- [ ] **Step 1: Install Capacitor dependencies**

Run: `npm install @capacitor/core @capacitor/app`
Run: `npm install -D @capacitor/cli @capacitor/android`

- [ ] **Step 2: Create capacitor.config.ts**

Configure:
```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.mymobileshop.app',
  appName: 'My Mobile Shop',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

- [ ] **Step 3: Implement hardware back button listener**

Create `src/utils/hardwareBackButton.ts` using `@capacitor/app` listener to gracefully handle back button presses on Android without crashing or closing the app unexpectedly.
Wire it up in `src/App.tsx`.

- [ ] **Step 4: Add Android platform to Capacitor**

Run: `npm run build`
Run: `npx cap add android`

- [ ] **Step 5: Verify build & Android assets sync**

Run: `npx cap sync android`
Verify that `android/app/src/main/assets/public` contains the built bundle.

- [ ] **Step 6: Commit**

```bash
git add capacitor.config.ts src/utils/hardwareBackButton.ts src/App.tsx package.json package-lock.json
git commit -m "feat(android): initialize capacitor android project and back button handler"
```

---

### Task 6: Release Build, Keystore Generation & Play Store Asset Guide

**Files:**
- Create: `docs/playstore-release-guide.md`

- [ ] **Step 1: Create detailed step-by-step release guide**

Document in `docs/playstore-release-guide.md`:
1. Keystore generation command:
   ```bash
   keytool -genkey -v -keystore mymobileshop-release-key.jks -alias mymobileshop -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Android Gradle release signing configuration (`android/app/build.gradle`).
3. Generating the `.aab` bundle:
   ```bash
   cd android && ./gradlew bundleRelease
   ```
4. Asset checklist (512x512 icon, 1024x500 feature graphic, screenshots).
5. Google Play Console listing data (Data safety form answers, category, privacy URL, 20 testers closed testing procedure).

- [ ] **Step 2: Run all tests to ensure 100% pass rate**

Run: `npm run test`
Expected: All test suites pass.

- [ ] **Step 3: Run TypeScript and Vite build verification**

Run: `npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add docs/playstore-release-guide.md
git commit -m "docs: add comprehensive Play Store release and signing guide"
```
