# Benefit-Focused Landing Page & Routing Restructuring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `mymobileshop.online` into a full-fledged SaaS platform with a benefit-focused marketing landing page at `/`, dedicated `/login` preceding onboarding, `/onboarding` for new shops, and `/app` for the day book & repair tracker, powered by `react-router-dom` and Vercel SPA rewrites.

**Architecture:**
- Add `react-router-dom` and create `vercel.json` for SPA URL rewrites.
- Implement `LandingPage.tsx` focusing strictly on daily shop owner benefits (cash clarity, repair deadlines, WhatsApp receipts, offline reliability, device safety, month-end ease).
- Restructure top-level app into an explicit route hierarchy:
  - `/` &rarr; `LandingPage`
  - `/login` &rarr; `LoginScreen` (routes to `/onboarding` if new, or `/app` if onboarded)
  - `/onboarding` &rarr; `OnboardingScreen` (guarded: requires auth; on completion &rarr; `/app`)
  - `/app/*` &rarr; `App` (guarded: requires auth + completed onboarding)
  - `*` &rarr; redirect to `/`

**Tech Stack:** React 18, React Router DOM (v6+), TypeScript, Tailwind CSS, Lucide React, Dexie, Firebase Auth, Vitest, Vite

**Spec:** `docs/superpowers/specs/2026-10-01-landing-page-and-routing-design.md`

## Global Constraints

- Do NOT advertise any "Free Trial" (pricing is straightforward ₹99/mo or ₹999/yr).
- Maintain 100% offline-first Dexie capability in the daybook and repairs sections.
- Ensure all existing and new tests pass without regressions.
- Preserve existing Firebase Auth logic (Shop ID/password, Google OAuth, Phone OTP).

## Review Focus

1. **Unauthenticated root visit:** Visiting `/` must display the marketing landing page with benefit cards, pricing, and "Sign In" / "Get Started" buttons.
2. **Onboarding order:** `/login` must strictly come *before* `/onboarding`. A user cannot reach `/onboarding` without first authenticating.
3. **Existing user shortcut:** If an authenticated user who has already set up their shop visits `/login`, they are automatically routed to `/app`.
4. **Vercel SPA support:** `vercel.json` must be present with rewrite rules so direct URLs (`/login`, `/onboarding`, `/app`) don't 404.
5. **No build errors:** `npm run build` and `npm test` must pass cleanly.

---

### Task 1: Install `react-router-dom` and Configure `vercel.json`

**Files:**
- Modify: `package.json`
- Create: `vercel.json`
- Test: `tests/routingConfig.test.ts`

**Interfaces:**
- Produces: `vercel.json` with SPA rewrite rule; `react-router-dom` dependency in `package.json`.

- [x] **Step 1: Write test for `vercel.json` and router dependency**

Create `tests/routingConfig.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Vercel SPA & Routing Configuration', () => {
  it('should have vercel.json with catch-all rewrite to index.html', () => {
    const vercelPath = path.resolve(__dirname, '../vercel.json');
    expect(fs.existsSync(vercelPath)).toBe(true);
    const config = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
    expect(config.rewrites).toBeDefined();
    expect(config.rewrites[0].source).toBe('/(.*)');
    expect(config.rewrites[0].destination).toBe('/index.html');
  });

  it('should have react-router-dom installed in package.json', () => {
    const pkgPath = path.resolve(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    expect(pkg.dependencies['react-router-dom']).toBeDefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/routingConfig.test.ts`
Expected: FAIL

- [x] **Step 3: Create `vercel.json` and install `react-router-dom`**

Create `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Run command: `npm install react-router-dom`

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/routingConfig.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add vercel.json package.json package-lock.json tests/routingConfig.test.ts
git commit -m "feat(routing): install react-router-dom and configure vercel spa rewrites"
```

---

### Task 2: Build the Benefit-Focused `LandingPage` Component

**Files:**
- Create: `src/screens/LandingPage.tsx`
- Test: `tests/landingPage.test.ts`

**Interfaces:**
- Produces: `<LandingPage />` component with benefit grid, pricing, hero, and legal modal links.

- [x] **Step 1: Write test for LandingPage component**

Create `tests/landingPage.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('LandingPage Component', () => {
  it('should contain benefit-focused copy and no free trial claims', () => {
    const filePath = path.resolve(__dirname, '../src/screens/LandingPage.tsx');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Benefit checks
    expect(content).toContain('Run Your Mobile Shop Without the Daily Notebook Chaos');
    expect(content).toContain('WhatsApp');
    expect(content).toContain('₹99');
    expect(content).toContain('₹999');

    // No free trial check
    expect(content.toLowerCase()).not.toContain('free trial');
    expect(content.toLowerCase()).not.toContain('14-day');

    // Navigation and trust checks
    expect(content).toContain('/login');
    expect(content).toContain('LegalModal');
    expect(content).toContain('support@mymobileshop.online');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/landingPage.test.ts`
Expected: FAIL

- [x] **Step 3: Implement `src/screens/LandingPage.tsx`**

Build responsive marketing landing page including:
- Sticky header with logo, navigation links, and "Sign In" / "Get Started" buttons.
- Hero with headline, punchy benefits, interactive buttons (`/login?mode=register`, `/login`), and app mockup illustration.
- "6 Daily Headaches Solved" grid (Cash clarity, repair job cards, WhatsApp customer updates, works without internet, device-switch safety, month-end reports).
- "A Day at Your Shop" walkthrough (Morning, Rush hours, Repair handoff, Night closing).
- Transparent pricing (Monthly ₹99, Yearly ₹999; no free trial claims).
- Footer with support contact and triggers for `LegalModal` (Privacy Policy & Terms).

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/landingPage.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/screens/LandingPage.tsx tests/landingPage.test.ts
git commit -m "feat(landing): implement benefit-focused marketing landing page"
```

---

### Task 3: Restructure App Flow and Integrate Route Guards

**Files:**
- Create: `src/AppRouter.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/screens/LoginScreen.tsx`
- Modify: `src/screens/OnboardingScreen.tsx`
- Test: `tests/appRouting.test.ts`

**Interfaces:**
- Consumes: `<LandingPage />`, `<LoginScreen />`, `<OnboardingScreen />`, `<App />` (Day Book).
- Produces: Centralized routing at `/`, `/login`, `/onboarding`, and `/app`.

- [x] **Step 1: Write test for AppRouter route hierarchy and guards**

Create `tests/appRouting.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('App Router Structure', () => {
  it('should define routes for /, /login, /onboarding, and /app in AppRouter.tsx', () => {
    const routerPath = path.resolve(__dirname, '../src/AppRouter.tsx');
    expect(fs.existsSync(routerPath)).toBe(true);
    const content = fs.readFileSync(routerPath, 'utf-8');

    expect(content).toContain('path="/"');
    expect(content).toContain('path="/login"');
    expect(content).toContain('path="/onboarding"');
    expect(content).toContain('path="/app"');
  });

  it('should wrap application in BrowserRouter in main.tsx or AppRouter.tsx', () => {
    const mainPath = path.resolve(__dirname, '../src/main.tsx');
    const routerPath = path.resolve(__dirname, '../src/AppRouter.tsx');
    const content = fs.readFileSync(mainPath, 'utf-8') + fs.readFileSync(routerPath, 'utf-8');
    expect(content).toContain('BrowserRouter');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/appRouting.test.ts`
Expected: FAIL

- [x] **Step 3: Implement `src/AppRouter.tsx` and update `main.tsx`, `LoginScreen.tsx`, and `OnboardingScreen.tsx`**

1. Create `src/AppRouter.tsx`:
   - Configures `<BrowserRouter>` and `<Routes>`.
   - `/`: Renders `LandingPage`. If authenticated, "Open Shop" goes to `/app`.
   - `/login`: Renders `LoginScreen`. When user signs in:
     - Check if shop settings exist:
       - No settings &rarr; `navigate('/onboarding', { replace: true })`.
       - Settings exist &rarr; `navigate('/app', { replace: true })`.
   - `/onboarding`: Renders `OnboardingScreen`. Guard: If unauthenticated, redirect to `/login`. Upon finishing setup &rarr; `navigate('/app', { replace: true })`.
   - `/app/*`: Renders `App` (Day Book & Repairs). Guard: If unauthenticated, redirect to `/login`. If settings not initialized, redirect to `/onboarding`.
   - `*`: Catch-all redirects to `/`.
2. Update `src/main.tsx`:
   - Mount `<AppRouter />` instead of `<App />`.
3. Update `src/screens/LoginScreen.tsx`:
   - Accept navigation hooks / support query parameter `mode=register` from URL.
   - On success, redirect to `/onboarding` or `/app`.
4. Update `src/screens/OnboardingScreen.tsx`:
   - On completion, redirect to `/app`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/appRouting.test.ts`
Expected: PASS

- [x] **Step 5: Run full test suite and build verification**

Run: `npm test && npm run build`
Expected: All 37+ tests pass, build completes with 0 errors.

- [x] **Step 6: Commit**

```bash
git add src/AppRouter.tsx src/main.tsx src/App.tsx src/screens/LoginScreen.tsx src/screens/OnboardingScreen.tsx tests/appRouting.test.ts
git commit -m "feat(routing): connect react-router-dom with login-before-onboarding workflow"
```

---

### Task 4: Full Verification and Deployment Readiness

**Files:**
- Modify: `docs/superpowers/plans/2026-10-01-landing-page-and-routing.md` (check off items)

- [ ] **Step 1: Verify production build output and dist artifacts**
Run `npm run build` and verify `dist/` contains all assets.

- [ ] **Step 2: Run all unit tests**
Run `npm test` to confirm 100% passing across all test suites.
