# Superadmin & Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `johnantony271@gmail.com` superadmin, restrict developer/testing tools in settings exclusively to superadmin, and build an interactive admin dashboard to monitor accounts, data usage, and execute account actions (e.g. toggle Pro).

**Architecture:** A pure utility `isSuperAdmin` checks user identity against `johnantony271@gmail.com`. A centralized Firestore collection `accounts/{uid}` is automatically populated and updated during cloud sync with shop metadata and byte-size calculations. A dedicated `AdminDashboardModal` in Settings provides real-time account listing, usage statistics, search, and admin controls.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, Firebase Auth & Firestore, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-superadmin-dashboard-design.md`

## Global Constraints

- Superadmin email is strictly `johnantony271@gmail.com` (case-insensitive).
- Developer tools (Section 5 in Settings) MUST NOT be visible or accessible to any non-superadmin user.
- Offline-first operations must not break if Firebase is offline or unconfigured.
- All 14 existing vitest tests must remain green; new tests must verify admin authorization and account tracking.

## Review Focus

1. Unauthenticated or non-admin user must never see the admin dashboard or developer testing tools.
2. Case differences in email (e.g. `JohnAntony271@gmail.com`) must still be recognized as superadmin.
3. Users logging in with phone numbers or non-superadmin emails must not have superadmin privileges.
4. Account summary upserts in `accounts/{uid}` must not fail or block syncing if network is spotty.
5. Pro activation toggle from Admin Dashboard must update both `accounts/{uid}` and `users/{uid}/settings/appSettings`.

---

### Task 1: Superadmin Authorization Utility & Tests

**Files:**
- Create: `src/utils/admin.ts`
- Create: `tests/admin.test.ts`

- [ ] **Step 1: Write failing tests for superadmin check**
  Create `tests/admin.test.ts` testing:
  - Returns `true` for `'johnantony271@gmail.com'`
  - Returns `true` for case-variations like `'JohnAntony271@GMAIL.COM'` with trailing spaces
  - Returns `false` for other emails e.g. `'other@gmail.com'`
  - Returns `false` for `null`, `undefined`, or phone-only users without email.

- [ ] **Step 2: Run tests to ensure failure**
  Run `npx vitest run tests/admin.test.ts` to confirm test fails due to missing module.

- [ ] **Step 3: Implement `isSuperAdmin` in `src/utils/admin.ts`**
  Implement:
  ```typescript
  export const SUPERADMIN_EMAIL = 'johnantony271@gmail.com';

  export function isSuperAdmin(user?: { email?: string | null } | null): boolean {
    if (!user || !user.email) return false;
    return user.email.trim().toLowerCase() === SUPERADMIN_EMAIL;
  }
  ```

- [ ] **Step 4: Run tests to verify pass**
  Run `npx vitest run tests/admin.test.ts` and verify all tests pass.

- [ ] **Step 5: Commit changes**
  `git add src/utils/admin.ts tests/admin.test.ts && git commit -m "feat: add superadmin authorization helper and unit tests"`

---

### Task 2: Account Directory & Data Usage Sync in Firestore

**Files:**
- Create: `src/firebase/admin.ts`
- Modify: `src/firebase/sync.ts`
- Create: `tests/adminSync.test.ts`

- [ ] **Step 1: Write test for account usage calculation in `tests/adminSync.test.ts`**
  Verify helper function that calculates estimated JSON byte size from entries, jobs, and settings, and formats byte size into human-readable strings (`KB`, `MB`).

- [ ] **Step 2: Run test to confirm it fails**
  Run `npx vitest run tests/adminSync.test.ts`.

- [ ] **Step 3: Implement `src/firebase/admin.ts`**
  Define `ShopAccountSummary` interface and admin helpers:
  - `formatBytes(bytes: number): string`
  - `calculateDataSize(entries: unknown[], jobs: unknown[], settings: unknown): number`
  - `upsertAccountSummary(uid: string, data: Partial<ShopAccountSummary>): Promise<void>`
  - `fetchAllAccounts(): Promise<ShopAccountSummary[]>`
  - `toggleAccountPro(uid: string, activated: boolean): Promise<void>`

- [ ] **Step 4: Update `pushPendingChanges` in `src/firebase/sync.ts`**
  Call `upsertAccountSummary` during cloud sync to record the latest shop name, entry count, job count, estimated bytes, and activation status.

- [ ] **Step 5: Run tests to verify pass**
  Run `npx vitest run tests/adminSync.test.ts` and `npm test` to verify zero regression.

- [ ] **Step 6: Commit changes**
  `git add src/firebase/admin.ts src/firebase/sync.ts tests/adminSync.test.ts && git commit -m "feat: implement accounts directory and usage calculation in Firestore"`

---

### Task 3: Interactive Admin Dashboard Modal (`AdminDashboardModal.tsx`)

**Files:**
- Create: `src/components/AdminDashboardModal.tsx`

- [ ] **Step 1: Build `AdminDashboardModal` component**
  Features:
  - Overall metrics bar: Total shops, Active this week, Total cloud entries, Total repairs, Total estimated storage size, Pro vs Free counts.
  - Search input: Real-time search filter by shop name, email, or phone.
  - Status filter buttons: All / Pro / Free Trial.
  - Account cards:
    - Shop name & owner email / phone
    - Pro badge with toggle action button ("Activate Pro" / "Revoke Pro")
    - Cloud data usage chip (entries count, jobs count, formatted bytes e.g. `45 KB`)
    - Last active timestamp relative/formatted
    - Direct contact buttons: WhatsApp, Phone call, Email
  - Manual Refresh button with loading spinner.

- [ ] **Step 2: Verify component compiles with TypeScript**
  Run `npm run build` to ensure no lint/type errors.

- [ ] **Step 3: Commit changes**
  `git add src/components/AdminDashboardModal.tsx && git commit -m "feat: create AdminDashboardModal component"`

---

### Task 4: SettingsScreen Integration & Restricted Demo Tools

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Restrict Section 5 (Developer / Testing tools)**
  Import `isSuperAdmin` from `../utils/admin`.
  Wrap Section 5 (Developer / Testing tools with Seed Dev Data, Seed 10 Jobs, Clear all Data) in:
  `{isSuperAdmin(user) && ( ... )}`
  Ensure non-superadmin users never see this section.

- [ ] **Step 2: Add Superadmin Portal Card for `johnantony271@gmail.com`**
  When `isSuperAdmin(user)` is true:
  Render a premium "Superadmin Control Center" card right below Shop Profile:
  - Crown icon with amber/gold styling
  - Title: "Superadmin Portal"
  - Subtitle: "Logged in as johnantony271@gmail.com"
  - Action button: "Open Admin Dashboard" (opens `AdminDashboardModal`)
  - Badges indicating Superadmin privileges active.

- [ ] **Step 3: Integrate `AdminDashboardModal`**
  Manage `isAdminDashboardOpen` state and render `AdminDashboardModal` when opened.

- [ ] **Step 4: Commit changes**
  `git add src/screens/SettingsScreen.tsx && git commit -m "feat: restrict dev tools to superadmin and integrate AdminDashboard in Settings"`

---

### Task 5: End-to-End Verification & Push

**Files:**
- Review all touched files

- [ ] **Step 1: Run full test suite**
  Run `npm test` and verify all tests pass.

- [ ] **Step 2: Run production build**
  Run `npm run build` to verify zero TypeScript errors and successful PWA bundling.

- [ ] **Step 3: Merge and push to `main`**
  Push all commits to `origin/main`.
