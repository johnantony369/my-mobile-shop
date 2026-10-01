# Resolve Search Console "Deceptive Pages" Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate Google's "Deceptive pages" (social engineering/phishing) flag on `mymobileshop.online` by removing the root login gate, embedding accessible Privacy Policy & Terms of Service, and configuring standard crawler directives and trust metadata.

**Architecture:** 
1. Convert the app back to a transparent, local-first workflow where crawlers and first-time users land on legitimate application UI (`OnboardingScreen` / `BookScreen`) instead of a stark credential-harvesting gate.
2. Build a dedicated, lightweight `LegalModal` component (Privacy Policy & Terms of Service) and link it across `LoginScreen`, `LoginModal`, `SettingsScreen`, and `OnboardingScreen`.
3. Add `public/robots.txt` and rich trust metadata (meta description, OpenGraph, canonical URL) to `index.html` to establish business legitimacy.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Vitest, Vite

**Spec:** Remediation tasks 1, 2, and 5 identified in the security audit report.

## Global Constraints

- Preserve offline-first Dexie IndexedDB capability and Firebase authentication integration.
- Ensure all existing unit tests in `tests/` continue to pass without regression.
- Do not introduce external dependencies or CDNs.

## Review Focus

1. **Unauthenticated root visit:** Visiting `/` without Firebase auth session must render legitimate shop software (Onboarding or Ledger), never an isolated credential collection box.
2. **Access to Privacy Policy & Terms:** Both legal documents must be accessible before signing in (from the login modal/screen) and after signing in (from Settings).
3. **Crawler accessibility:** `robots.txt` must respond with HTTP 200 and standard allow directives for all web crawlers.
4. **Metadata accuracy:** Canonical URL and meta tags must point to `https://www.mymobileshop.online/`.
5. **No build errors:** `npm run build` (`tsc && vite build`) and `npm test` (`vitest run`) must pass with zero errors.

---

### Task 1: Create `robots.txt` and Add Trust Metadata in `index.html`

**Files:**
- Create: `public/robots.txt`
- Modify: `index.html:1-28`
- Test: `tests/metadata.test.ts`

**Interfaces:**
- Produces: `public/robots.txt` allowing indexing across all user-agents, canonical tags, and OpenGraph descriptors.

- [x] **Step 1: Write test verifying `robots.txt` content and `index.html` meta tags**

Create `tests/metadata.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Site Metadata & Robots Configuration', () => {
  it('should have a public/robots.txt allowing crawler access', () => {
    const robotsPath = path.resolve(__dirname, '../public/robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);
    const content = fs.readFileSync(robotsPath, 'utf-8');
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
  });

  it('should have description, canonical, and opengraph meta tags in index.html', () => {
    const indexPath = path.resolve(__dirname, '../index.html');
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('<link rel="canonical" href="https://www.mymobileshop.online/"');
    expect(content).toContain('<meta name="description"');
    expect(content).toContain('og:title');
    expect(content).toContain('og:description');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/metadata.test.ts`
Expected: FAIL (file not found / missing tags)

- [x] **Step 3: Create `public/robots.txt` and update `index.html`**

Create `public/robots.txt`:
```txt
User-agent: *
Allow: /

Sitemap: https://www.mymobileshop.online/
```

Update `index.html` `<head>` block with:
```html
    <meta name="description" content="My Mobile Shop - Lightweight, offline-ready digital day book and customer repair tracking application for mobile retail and service shops." />
    <link rel="canonical" href="https://www.mymobileshop.online/" />
    <meta property="og:title" content="My Mobile Shop - Digital Day Book & Repair Tracker" />
    <meta property="og:description" content="Manage daily shop cash flow, track customer phone repairs, and securely sync records." />
    <meta property="og:url" content="https://www.mymobileshop.online/" />
    <meta property="og:type" content="website" />
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/metadata.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add public/robots.txt index.html tests/metadata.test.ts
git commit -m "fix(seo): add robots.txt and official trust metadata to index.html"
```

---

### Task 2: Build Accessible `LegalModal` Component (Privacy Policy & Terms of Service)

**Files:**
- Create: `src/components/LegalModal.tsx`
- Test: `tests/legalModal.test.ts`

**Interfaces:**
- Produces: `LegalModal({ isOpen: boolean, onClose: () => void, initialTab?: 'privacy' | 'terms' })`

- [x] **Step 1: Write test for LegalModal component**

Create `tests/legalModal.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('LegalModal Component', () => {
  it('should define Privacy Policy and Terms of Service with data protection and contact disclosures', () => {
    const modalPath = path.resolve(__dirname, '../src/components/LegalModal.tsx');
    expect(fs.existsSync(modalPath)).toBe(true);
    const content = fs.readFileSync(modalPath, 'utf-8');
    expect(content).toContain('Privacy Policy');
    expect(content).toContain('Terms of Service');
    expect(content).toContain('IndexedDB');
    expect(content).toContain('Firebase');
    expect(content).toContain('support@mymobileshop.online');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/legalModal.test.ts`
Expected: FAIL (file not found)

- [x] **Step 3: Implement `src/components/LegalModal.tsx`**

Build clean, accessible modal featuring:
- Tabs for "Privacy Policy" and "Terms of Service"
- Full transparent explanation:
  - Local-first storage in user's browser via IndexedDB
  - Optional Google Firebase Cloud Firestore synchronization when signed in
  - No selling or sharing of merchant data with third parties
  - Account deletion and local data wipe controls
  - Business purpose: Digital day book and repair job tracker for mobile shops
  - Contact email: `support@mymobileshop.online`
- Modal dismiss button (`X`) and backdrop dismiss.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/legalModal.test.ts`
Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/components/LegalModal.tsx tests/legalModal.test.ts
git commit -m "feat(legal): add comprehensive Privacy Policy and Terms of Service modal"
```

---

### Task 3: Remove Root Login Gate & Restore Transparent App Workflow

**Files:**
- Modify: `src/App.tsx:96-104`
- Modify: `src/screens/LoginScreen.tsx`
- Modify: `src/components/LoginModal.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Test: `tests/rootWorkflow.test.ts`

**Interfaces:**
- Consumes: `LegalModal` from `src/components/LegalModal.tsx`
- Produces: Non-blocking app root that presents `OnboardingScreen` for first-time visitors, `BookScreen` for existing users, and accessible legal links on all login surfaces.

- [x] **Step 1: Write test verifying App does not block unauthenticated users from seeing the app**

Create `tests/rootWorkflow.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Root Workflow & Authentication Gate', () => {
  it('should not contain the blocking if (isConfigured && !user) return <LoginScreen /> gate in App.tsx', () => {
    const appPath = path.resolve(__dirname, '../src/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');
    expect(content).not.toContain('return (\n      <LoginScreen');
    expect(content).not.toContain('if (isConfigured && !user)');
  });

  it('should include links to Privacy Policy and Terms in LoginScreen and LoginModal', () => {
    const loginScreenPath = path.resolve(__dirname, '../src/screens/LoginScreen.tsx');
    const loginModalPath = path.resolve(__dirname, '../src/components/LoginModal.tsx');
    const screenContent = fs.readFileSync(loginScreenPath, 'utf-8');
    const modalContent = fs.readFileSync(loginModalPath, 'utf-8');

    expect(screenContent).toContain('Privacy Policy');
    expect(screenContent).toContain('Terms of Service');
    expect(modalContent).toContain('Privacy Policy');
    expect(modalContent).toContain('Terms of Service');
  });

  it('should include Legal/Privacy section in SettingsScreen', () => {
    const settingsPath = path.resolve(__dirname, '../src/screens/SettingsScreen.tsx');
    const content = fs.readFileSync(settingsPath, 'utf-8');
    expect(content).toContain('LegalModal');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/rootWorkflow.test.ts`
Expected: FAIL

- [x] **Step 3: Modify `App.tsx`, `LoginScreen.tsx`, `LoginModal.tsx`, and `SettingsScreen.tsx`**

1. In `src/App.tsx`:
   - Remove lines 96–104 (`if (isConfigured && !user) return <LoginScreen ... />`).
   - If not logged in, users smoothly land on `OnboardingScreen` (first launch) or `BookScreen`.
   - Provide a subtle top banner or Settings notice to "Sign In to Sync" without locking the application.
2. In `src/screens/LoginScreen.tsx` and `src/components/LoginModal.tsx`:
   - Add a footer with clickable "Privacy Policy" and "Terms of Service" buttons that open `LegalModal`.
3. In `src/screens/SettingsScreen.tsx`:
   - Add a row under "About" for "Privacy Policy & Terms of Service" that opens `LegalModal`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/rootWorkflow.test.ts`
Expected: PASS

- [x] **Step 5: Run full test suite and build verification**

Run: `npm test && npm run build`
Expected: All tests pass, build finishes with 0 errors.

- [x] **Step 6: Commit**

```bash
git add src/App.tsx src/screens/LoginScreen.tsx src/components/LoginModal.tsx src/screens/SettingsScreen.tsx tests/rootWorkflow.test.ts
git commit -m "fix(security): remove root login gate and embed transparent legal links across auth & settings"
```

---

### Task 4: Full Verification and Search Console Review Readiness

**Files:**
- Modify: `docs/superpowers/plans/2026-10-01-resolve-deceptive-pages-flag.md` (check off items)

- [x] **Step 1: Verify production build output**
Run `npm run build` and inspect `dist/index.html` and `dist/robots.txt` to confirm all meta tags, robots.txt, and bundle outputs are present.

- [x] **Step 2: Run all tests in the repository**
Run `npm test` across all 9 test suites to verify 100% pass rate.

- [ ] **Step 3: Prepare the exact Search Console appeal statement**
Formulate the exact text the user will submit in Google Search Console Security Issues review dialog.
