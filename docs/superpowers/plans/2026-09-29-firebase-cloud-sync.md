# Firebase Auth & Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Firebase Authentication (Google Sign-In and Phone OTP) and Firestore two-way background cloud sync into My Mobile Shop while keeping the app 100% offline-first and fast with Dexie.js.

**Architecture:** Dexie.js remains the primary local datastore for zero-latency offline operations. A background sync service pushes pending local mutations (`syncStatus = 'pending'`) to `users/{uid}/...` in Firestore when online, listens for or pulls remote changes, and handles disaster recovery / full cloud restore on new devices or after browser data clears.

**Tech Stack:** React 18, TypeScript, Dexie.js 4, Firebase 10+ (Auth & Firestore), Vite, Tailwind CSS.

**Spec:** [docs/superpowers/specs/2026-09-29-firebase-cloud-sync-design.md](file:///f:/My%20Mobile%20Shop/docs/superpowers/specs/2026-09-29-firebase-cloud-sync-design.md)

---

## Global Constraints

- Never break offline capabilities: all read/write operations must function completely when offline or when Firebase credentials are not provided.
- Store isolation: all user data in Firestore must reside under `users/{uid}/...`.
- Typescript strictness: all code must compile cleanly without `any` regressions under `tsc`.
- Soft deletions: record deletions must use `deletedAt` timestamps so deletions propagate across devices before local cleanup.

## Review Focus

1. **Unconfigured Firebase keys**: Opening the app with empty or missing `.env` must not crash or display a blank screen; it must run normally in local-only mode.
2. **Offline writes**: Creating entries while offline must succeed in Dexie, mark records `pending`, and sync automatically once online.
3. **Fresh device login (Disaster Recovery)**: Signing in on a device with empty Dexie storage must pull all cloud records and populate Dexie immediately.
4. **Phone OTP failure**: Expired or invalid SMS OTP codes must show a user-friendly error message without hanging the verification state.
5. **Existing local data migration**: An existing user who signs in for the first time must not lose local records; un-synced local records must be assigned `cloudId`s and pushed to their new Firestore account.

---

### Task 1: Install Firebase SDK & Setup Environment Config

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Create: `src/firebase/config.ts`

**Interfaces:**
- Produces:
  - `isFirebaseConfigured(): boolean`
  - `auth: Auth | null`
  - `dbFirestore: Firestore | null`
  - `googleProvider: GoogleAuthProvider | null`

- [ ] **Step 1: Install `firebase` package**

Run: `npm install firebase`

- [ ] **Step 2: Create `.env.example`**

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

- [ ] **Step 3: Create `src/firebase/config.ts`**

Initialize Firebase with graceful error handling so the app functions even if keys are blank:

```typescript
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let dbFirestore: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    dbFirestore = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (err) {
    console.warn('Failed to initialize Firebase SDK:', err);
  }
}

export { app, auth, dbFirestore, googleProvider };
```

- [ ] **Step 4: Verify build compiles**

Run: `npm run build`
Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example src/firebase/config.ts
git commit -m "feat(firebase): install firebase and configure client sdk initialization"
```

---

### Task 2: Dexie Schema Version 3 & Sync Types

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/db/db.ts`

**Interfaces:**
- Consumes: Dexie types
- Produces:
  - `Entry` with `cloudId?: string; updatedAt?: string; syncStatus?: 'synced' | 'pending' | 'deleted'; deletedAt?: string | null`
  - `Job` with `cloudId?: string; updatedAt?: string; syncStatus?: 'synced' | 'pending' | 'deleted'; deletedAt?: string | null`
  - `AppSettings` with `cloudId?: string; updatedAt?: string; syncStatus?: 'synced' | 'pending'`
  - `generateCloudId(): string`

- [ ] **Step 1: Update `src/types/index.ts` with sync metadata**

Add sync properties to `Entry`, `Job`, and `AppSettings`:

```typescript
export type SyncStatus = 'synced' | 'pending' | 'deleted';

export interface SyncMetadata {
  cloudId?: string;
  updatedAt?: string;
  syncStatus?: SyncStatus;
  deletedAt?: string | null;
}
```
Extend `Entry`, `Job`, and `AppSettings` with `SyncMetadata`.

- [ ] **Step 2: Update `src/db/db.ts` for Version 3 migration**

1. Add UUID helper `generateCloudId()`.
2. Configure `version(3)` on Dexie with new indices:
```typescript
this.version(3).stores({
  entries: '++id, cloudId, type, amount, date, createdAt, updatedAt, syncStatus, paymentMethod, repairId',
  settings: '++id, cloudId, updatedAt, syncStatus',
  jobs: '++id, cloudId, status, phone, customerName, model, receivedAt, readyAt, deliveredAt, bookEntryId, updatedAt, syncStatus',
}).upgrade(async tx => {
  // Backfill cloudId and updatedAt for existing records
  await tx.table('entries').toCollection().modify(entry => {
    if (!entry.cloudId) entry.cloudId = crypto.randomUUID ? crypto.randomUUID() : `entry_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    if (!entry.updatedAt) entry.updatedAt = entry.createdAt || new Date().toISOString();
    if (!entry.syncStatus) entry.syncStatus = 'pending';
  });
  await tx.table('jobs').toCollection().modify(job => {
    if (!job.cloudId) job.cloudId = crypto.randomUUID ? crypto.randomUUID() : `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    if (!job.updatedAt) job.updatedAt = job.receivedAt || new Date().toISOString();
    if (!job.syncStatus) job.syncStatus = 'pending';
  });
});
```
3. Update helper functions (`addEntry`, `updateEntry`, `deleteEntry`, `updateAppSettings`) to automatically maintain `updatedAt = new Date().toISOString()` and `syncStatus = 'pending'`, and for deletion mark soft-delete with `syncStatus = 'deleted'`, `deletedAt = now` before removal or synchronization.

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/db/db.ts
git commit -m "feat(db): upgrade Dexie schema to v3 with sync metadata and legacy backfill"
```

---

### Task 3: Cloud Sync Engine (`src/firebase/sync.ts`)

**Files:**
- Create: `src/firebase/sync.ts`

**Interfaces:**
- Consumes: `db` from `src/db/db.ts`, `dbFirestore`, `auth` from `src/firebase/config.ts`
- Produces:
  - `syncNow(): Promise<{ success: boolean; pushed: number; pulled: number; error?: string }>`
  - `startAutoSync(uid: string): () => void` (returns unsubscribe function)
  - `restoreAllFromCloud(uid: string): Promise<boolean>`

- [ ] **Step 1: Write `src/firebase/sync.ts`**

Implement push, pull, and full-restore logic:
1. `pushPendingChanges(uid: string)`:
   - Query Dexie for `entries`, `jobs`, `settings` where `syncStatus !== 'synced'`.
   - Use Firestore `writeBatch()` to commit documents to `users/${uid}/entries/${cloudId}`, `users/${uid}/jobs/${cloudId}`, etc.
   - For items with `deletedAt`, delete remote document (or set deleted flag), then delete from local Dexie.
   - For upserted items, mark `syncStatus = 'synced'` in Dexie.
2. `pullCloudChanges(uid: string)`:
   - Query Firestore collections for records.
   - Compare `doc.updatedAt` vs local Dexie `entry.updatedAt`. If cloud is newer, update Dexie; if cloud doc doesn't exist locally, insert it into Dexie.
3. `startAutoSync(uid: string)`:
   - Sets up online/offline event listeners (`window.addEventListener('online', ...)`).
   - Listens to Firestore snapshots on `users/${uid}/entries` and `users/${uid}/jobs` for real-time cross-device updates.
   - Triggers `syncNow()` immediately.
   - Returns cleanup function to detach listeners.

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/firebase/sync.ts
git commit -m "feat(sync): implement two-way cloud sync engine between Dexie and Firestore"
```

---

### Task 4: Firebase Authentication Service & State Hook

**Files:**
- Create: `src/firebase/auth.ts`
- Create: `src/firebase/useAuth.ts`

**Interfaces:**
- Produces:
  - `signInWithGoogle(): Promise<User>`
  - `setupRecaptcha(elementId: string): RecaptchaVerifier`
  - `sendPhoneOtp(phoneNumber: string, verifier: RecaptchaVerifier): Promise<ConfirmationResult>`
  - `verifyPhoneOtp(confirmationResult: ConfirmationResult, code: string): Promise<User>`
  - `signOutUser(): Promise<void>`
  - `useAuth(): { user: User | null; loading: boolean; isConfigured: boolean }`

- [ ] **Step 1: Write `src/firebase/auth.ts`**

Implement Google popup auth, phone OTP verification with reCAPTCHA, sign-out, and auth state subscription:

```typescript
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { auth, googleProvider } from './config';

export async function loginWithGoogle(): Promise<User> {
  if (!auth || !googleProvider) throw new Error('Firebase Auth not configured');
  const res = await signInWithPopup(auth, googleProvider);
  return res.user;
}

export function createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (!auth) throw new Error('Firebase Auth not configured');
  return new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
}

export async function sendOtp(phone: string, verifier: RecaptchaVerifier): Promise<ConfirmationResult> {
  if (!auth) throw new Error('Firebase Auth not configured');
  return await signInWithPhoneNumber(auth, phone, verifier);
}

export async function confirmOtp(confirmation: ConfirmationResult, code: string): Promise<User> {
  const res = await confirmation.confirm(code);
  return res.user;
}

export async function logout(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}
```

- [ ] **Step 2: Write `src/firebase/useAuth.ts`**

React hook that subscribes to `onAuthStateChanged`, exposes current user, loading state, and auto-sync binding.

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/firebase/auth.ts src/firebase/useAuth.ts
git commit -m "feat(auth): add google sign-in, phone otp handler, and useAuth hook"
```

---

### Task 5: UI Integration (Settings, Header, and Onboarding)

**Files:**
- Create: `src/components/PhoneAuthModal.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/screens/OnboardingScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useAuth`, `syncNow`, `loginWithGoogle`, `logout`

- [ ] **Step 1: Create `src/components/PhoneAuthModal.tsx`**

A modal dialog that handles phone number input (+91 prefix pre-filled), requests OTP, renders invisible reCAPTCHA, and accepts the 6-digit verification code with proper error messaging.

- [ ] **Step 2: Update `src/screens/SettingsScreen.tsx`**

Add "Cloud Backup & Sync" section card:
- If not signed in:
  - Benefit description ("Back up your shop ledger to the cloud & access across devices").
  - "Continue with Google" button.
  - "Sign in with Phone" button.
- If signed in:
  - Account info (Google name/email or phone number).
  - Sync status indicator (🟢 Synced / 🟡 Syncing / ⚪ Offline).
  - "Sync Now" button.
  - "Sign Out" button with confirmation modal.
- If Firebase is not configured:
  - Helpful banner explaining `.env` configuration.

- [ ] **Step 3: Update `src/App.tsx`**

1. Include auto-sync lifecycle tied to active auth user.
2. Add persistent storage request (`requestPersistentStorage()`) on mount.
3. Add small sync status badge in top header.

- [ ] **Step 4: Update `src/screens/OnboardingScreen.tsx`**

Add an option on first launch for returning users: *"Already have a shop backup? Sign in with Google / Phone"*.

- [ ] **Step 5: Verify build compiles**

Run: `npm run build`
Expected: PASS with zero build errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/PhoneAuthModal.tsx src/screens/SettingsScreen.tsx src/screens/OnboardingScreen.tsx src/App.tsx
git commit -m "feat(ui): add cloud sync controls in Settings, PhoneAuthModal, and header status"
```

---

### Task 6: End-to-End Verification & Documentation

**Files:**
- Create: `docs/FIREBASE_SETUP.md`

- [ ] **Step 1: Create `docs/FIREBASE_SETUP.md`**

Step-by-step instructions for the shop owner:
1. Creating a free Firebase project at `console.firebase.google.com`.
2. Enabling Authentication (Google and Phone providers).
3. Enabling Cloud Firestore in production mode.
4. Setting up Firestore Security Rules.
5. Copying credentials into `.env`.

- [ ] **Step 2: Full build and runtime verification**

1. Run `npm run build` to verify clean build artifact in `dist/`.
2. Run preview or dev server to verify local startup with unconfigured state runs gracefully.

- [ ] **Step 3: Commit**

```bash
git add docs/FIREBASE_SETUP.md
git commit -m "docs: add comprehensive Firebase setup guide for shop owners"
```
